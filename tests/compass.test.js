// node --test tests/*.test.js — Phase 2 定期コンパスチェック
const test = require("node:test");
const assert = require("node:assert/strict");
require("../js/questions.js");
require("../js/logic.js");
require("../js/engine.js");
require("../js/bank.js");
require("../js/compass.js");
const { SC } = globalThis;
const E = SC.engine, C = SC.compass, B = SC.bank, Q = SC.QUESTIONS;
const HOUR = 3600e3, DAY = 24 * HOUR;
const T0 = Date.parse("2026-10-01T07:00:00Z");

// 小さな「利用者」：回答とセッションを積み上げる
function learner() {
  const history = [], sessions = [];
  let n = 0;
  return {
    history, sessions,
    session(at, ids, results, context = "compass_check") {
      const sid = "s" + sessions.length;
      ids.forEach((id, i) => {
        const q = typeof id === "string" ? Q[id] : id;
        history.push(E.makeAnswerRecord(q, { status: results[i] }, { userId: "u", sessionId: sid, context, now: at + (++n) }));
      });
      if (context !== "lesson") sessions.push({ id: sid, finished_at: new Date(at + 60e3).toISOString(), question_ids: ids.map((x) => (typeof x === "string" ? x : x.id)) });
      return sid;
    },
    states(now) { return E.computeSkillStates(history, { now }); },
    check(now, seed = 1) { return C.buildCheck({ states: this.states(now), history, sessions, now, rng: B.seeded(seed) }); }
  };
}
const c = "correct", x = "incorrect", u = "unknown";

// 1回目のコンパスチェック（デモシナリオ）
function firstCheck(L) {
  L.session(T0, ["B1", "B2", "B3", "B4", "B5", "C4", "C5"], [c, c, c, x, u, x, c]);
}

test("記録がなければ、定期チェックは出さない", () => {
  const L = learner();
  const r = L.check(T0);
  assert.equal(r.chosen.length, 0);
  assert.equal(C.notice({ states: L.states(T0), history: [], sessions: [], now: T0 }).show, false);
});

test("条件A：同じ日は出さず、3日たったら出す", () => {
  const L = learner();
  firstCheck(L);
  assert.equal(L.check(T0 + 2 * HOUR).chosen.length, 0, "当日は出さない");
  assert.equal(L.check(T0 + 2 * DAY).chosen.length, 0, "2日後も出さない");
  const r = L.check(T0 + 3 * DAY + HOUR);
  assert.ok(r.chosen.length >= C.CONFIG.MIN_QUESTIONS && r.chosen.length <= C.CONFIG.MAX_QUESTIONS, "3〜5問: " + r.chosen.length);
});

test("条件B：前回のチェック後に5問練習したら、同じ日でも候補になる", () => {
  const L = learner();
  firstCheck(L);
  const lessonQ = (i) => ({ id: "L-rate-" + i, skill: "rate", level: "basic", unit: "一次関数" });
  L.session(T0 + HOUR, [0, 1, 2, 3].map(lessonQ), [c, c, c, c], "lesson");
  assert.ok(!L.check(T0 + 2 * HOUR).candidates.some((k) => k.skill === "rate"), "4問ではまだ");
  L.session(T0 + 90 * 60e3, [lessonQ(4)], [c], "lesson");
  const r = L.check(T0 + 2 * HOUR);
  const rate = r.candidates.find((k) => k.skill === "rate");
  assert.ok(rate && rate.due.byAttempts, "5問で候補");
  assert.ok(r.chosen.some((k) => k.skill === "rate"));
});

test("優先度：確かさの低いスキルが先。1スキル2問まで。出題レベルは状態に合わせる", () => {
  const L = learner();
  firstCheck(L);
  const r = L.check(T0 + 3 * DAY + HOUR);
  assert.equal(r.candidates[0].priority, 1);
  const perSkill = {};
  r.chosen.forEach((k) => (perSkill[k.skill] = (perSkill[k.skill] || 0) + 1));
  Object.values(perSkill).forEach((n) => assert.ok(n <= 2));
  const rate = r.chosen.filter((k) => k.skill === "rate");
  assert.ok(rate.length >= 1, "変化の割合（確かさ0.3）は必ず入る");
  assert.equal(rate[0].planned_level, "basic", "基礎が不安定なら基礎");
  const subst = r.candidates.find((k) => k.skill === "substitution");
  assert.equal(subst.level, "standard", "基礎ができていれば標準");
  assert.ok(subst.reasons.some((x) => x.p === 3), "一度できて定着が未確認");
  const coord = r.candidates.find((k) => k.skill === "coord");
  assert.equal(coord.level, "retention", "既習スキルは基礎の次に定着の問題");
});

test("最近出した問題（直近3回・7日以内）は出さない。定着の確認は一度も解いていない問題で", () => {
  const L = learner();
  firstCheck(L);
  const now = T0 + 3 * DAY + HOUR;
  const r = L.check(now);
  const answered = new Set(L.history.map((a) => a.question_id));
  r.chosen.forEach((k) => assert.ok(!answered.has(k.question_id), k.question_id + " は解いたことがある"));
  assert.ok(r.excluded.some((e) => e.id === "B4"));
  assert.equal(new Set(r.questions).size, r.questions.length, "同じ回に同じ問題を出さない");

  // 2回目の定期チェックを解いたあと、さらに3日後：直近の問題はまた避ける
  L.session(now, r.questions, r.questions.map(() => c));
  const r2 = L.check(now + 3 * DAY + HOUR, 5);
  r2.chosen.forEach((k) => assert.ok(!r.questions.includes(k.question_id), k.question_id + " を続けて出した"));
});

test("定期チェックの結果で skill_state が更新され、変化とコメントが出る", () => {
  const L = learner();
  firstCheck(L);
  const now = T0 + 3 * DAY + HOUR;
  const r = L.check(now);
  const skills = [...new Set(r.chosen.map((k) => k.skill))];
  const before = C.snapshotSkills(L.states(now), skills);
  // 定期チェックで全問正解（小問つきは小問ごとに記録）
  r.questions.forEach((id) => {
    const q = Q[id];
    if (q.type === "steps") q.steps.forEach((st) => L.history.push(E.makeAnswerRecord({ id: id + "#" + st.id, skill: st.skill, level: q.level, unit: q.unit }, { status: c }, { userId: "u", sessionId: "p1", now: now + 1000 })));
    else L.history.push(E.makeAnswerRecord(q, { status: c }, { userId: "u", sessionId: "p1", now: now + 1000 }));
  });
  const after = C.snapshotSkills(L.states(now + 2000), skills);
  const res = C.compare(before, after, skills);
  const rate = res.items.find((i) => i.skill === "rate");
  assert.equal(rate.change, "up");
  assert.ok(rate.after.confidence > rate.before.confidence);
  assert.ok(rate.after.confidence - rate.before.confidence <= 0.3, "1回のチェックで大きく上げすぎない: " + rate.diff);
  assert.match(res.comment, /変化の割合は前回より安定してきました/);
});

test("今日の学習は skill_state から作り直され、できたところの練習は減る", () => {
  const L = learner();
  firstCheck(L);
  let p = C.planFromStates(L.states(T0 + HOUR));
  assert.equal(p.planKey, "change", "はじめは増加量から");
  // 増加量と変化の割合ができるようになった
  L.session(T0 + 3 * DAY, ["change-basic-1", "rate-basic-1", "rate-basic-2", "C4"], [c, c, c, c]);
  p = C.planFromStates(L.states(T0 + 3 * DAY + HOUR));
  assert.notEqual(p.planKey, "change");
  assert.notEqual(p.planKey, "rate");
  assert.equal(p.focus, "form", "次はグラフ・式へ");
});

test("マスター：4レベルすべて pass ＋ 確かさ0.85以上。あとで下がることもある", () => {
  const L = learner();
  L.session(T0, ["B4", "S1", "rate-application-2"], [c, c, c]);
  // 応用は小問ごとの記録。rate-application-2 は小問ごとに別スキルなので、変化の割合の応用を直接記録する
  L.history.push(E.makeAnswerRecord({ id: "rate-application-1#s2", skill: "rate", level: "application", unit: "一次関数" }, { status: c }, { userId: "u", now: T0 + 5000 }));
  L.session(T0 + 4 * DAY, ["rate-retention-1", "rate-standard-1"], [c, c]);
  L.session(T0 + 9 * DAY, ["rate-retention-2"], [c]);
  let s = L.states(T0 + 9 * DAY + HOUR).rate;
  assert.equal(s.learning_status, "mastered", JSON.stringify(s));
  assert.ok(s.confidence >= 0.85);
  L.session(T0 + 20 * DAY, ["rate-standard-2", "rate-basic-2"], [x, x]);
  s = L.states(T0 + 20 * DAY + HOUR).rate;
  assert.notEqual(s.learning_status, "mastered", "定着は永久に固定しない");
});

test("「今日はあとで」を選んだ日はお知らせを出さない（次の日は出す）", () => {
  const L = learner();
  firstCheck(L);
  const now = T0 + 3 * DAY + HOUR;
  const input = { states: L.states(now), history: L.history, sessions: L.sessions, now };
  assert.equal(C.notice(input).show, true);
  assert.equal(C.notice({ ...input, snoozeDate: C.dateKey(now) }).show, false);
  assert.equal(C.notice({ ...input, now: now + DAY, snoozeDate: C.dateKey(now) }).show, true);
});

test("同じ種なら同じ選び方（debug で再現できる）", () => {
  const L = learner();
  firstCheck(L);
  const now = T0 + 3 * DAY + HOUR;
  assert.deepEqual(L.check(now, 9).questions, L.check(now, 9).questions);
});
