// node --test tests/*.test.js — Phase 5 今日の学習の自動生成
const test = require("node:test");
const assert = require("node:assert/strict");
require("../js/questions.js");
require("../js/logic.js");
require("../js/engine.js");
require("../js/bank.js");
require("../js/compass.js");
require("../js/rootcause.js");
require("../js/planner.js");
const { SC } = globalThis;
const P = SC.planner, E = SC.engine, Q = SC.QUESTIONS, B = SC.bank;
const HOUR = 3600e3, DAY = 24 * HOUR;
const T0 = Date.parse("2026-10-01T07:00:00Z");
const c = "correct", x = "incorrect";
const SCHOOL = { grade: "中2", subject: "数学", current_unit: "一次関数", school_status: "learning" };

function learner() {
  const history = [];
  let n = 0;
  return {
    history,
    add(at, ids, results, context = "compass_check") {
      ids.forEach((id, i) => {
        const q = typeof id === "string" ? Q[id] : id;
        history.push(E.makeAnswerRecord(q, { status: results[i] }, { userId: "u", sessionId: "s", context, now: at + (++n) }));
      });
    },
    plan(now, opts = {}) {
      return P.build({ states: E.computeSkillStates(history, { now, schoolProgress: (opts.school || SCHOOL).school_status }), history, explorations: opts.explorations || [],
        school: opts.school || SCHOOL, minutes: opts.minutes || 30, goal: opts.goal || "daily_learning", now, rng: B.seeded(opts.seed || 1) });
    }
  };
}
// デモシナリオ：変化の割合・グラフ式でつまずき、原因は変化量
function demo(L) {
  L.add(T0, ["B1", "B2", "B3", "B4", "B5", "C4", "C5"], [c, c, c, x, x, x, c]);
}
const EXPL_CHANGE = { date: new Date(T0).toISOString(), symptom: { label: "変化の割合" }, conclusion: { kind: "gap_found", return_to: "change" } };
const types = (p) => p.sessions.map((s) => s.type + ":" + s.skill + ":" + s.level);

test("根本的なつまずきを優先：原因さがしの戻る場所（変化量）から始め、学校の単元にも戻る", () => {
  const L = learner(); demo(L);
  const p = L.plan(T0 + HOUR, { explorations: [EXPL_CHANGE] });
  const practice = p.sessions.find((s) => s.type === "practice");
  assert.equal(practice.skill, "change", types(p).join(" / "));
  assert.equal(p.focus_skill, "change");
  const cur = p.sessions.find((s) => s.type === "current_unit");
  assert.ok(cur, "学校の単元の枠がある");
  assert.notEqual(cur.skill, "change", "補強したスキルとは別の、学校の単元のスキルに戻る");
  assert.equal(cur.skill, "rate", "変化量を前提にしている、まだ不安定な「変化の割合」に戻る");
  assert.equal(cur.level, "basic");
  assert.match(p.why, /変化量/);
  assert.match(p.reason, /変化量/);
});

test("今日使える時間で中身が変わる（20分と45分）", () => {
  const L = learner(); demo(L);
  const p20 = L.plan(T0 + HOUR, { minutes: 20, explorations: [EXPL_CHANGE] });
  const p45 = L.plan(T0 + HOUR, { minutes: 45, explorations: [EXPL_CHANGE] });
  assert.equal(p20.total_minutes, 20);
  assert.equal(p45.total_minutes, 45);
  assert.ok(p45.sessions.length > p20.sessions.length || p45.sessions.reduce((s, x) => s + x.questions.length, 0) > p20.sessions.reduce((s, x) => s + x.questions.length, 0));
  assert.ok(!p20.sessions.some((s) => s.type === "current_unit") || p20.sessions.length <= 3);
  assert.ok(p45.sessions.some((s) => s.type === "current_unit"), "45分なら学校の単元も入る");
});

test("学習目標で中身が変わる（苦手を戻る／もう少し先へ／復習）", () => {
  const L = learner(); demo(L);
  const now = T0 + 4 * DAY;
  const daily = L.plan(now, { minutes: 45, explorations: [EXPL_CHANGE] });
  const catchUp = L.plan(now, { minutes: 45, goal: "catch_up", explorations: [EXPL_CHANGE] });
  const challenge = L.plan(now, { minutes: 45, goal: "challenge", explorations: [EXPL_CHANGE] });
  const review = L.plan(now, { minutes: 45, goal: "review", explorations: [EXPL_CHANGE] });
  const mins = (p, type) => p.sessions.filter((s) => s.type === type).reduce((a, s) => a + s.minutes, 0);
  assert.ok(mins(catchUp, "practice") > mins(daily, "practice"), "苦手を戻る日は補強の時間が長い");
  assert.ok(mins(challenge, "challenge") > mins(daily, "challenge"), "もう少し先への日は発展の時間が長い");
  assert.ok(mins(review, "review") + mins(review, "check") > mins(daily, "review") + mins(daily, "check"), "復習の日は復習の時間が長い");
  [catchUp, challenge, review].forEach((p) => assert.match(p.why, /^今日は「.+」の?日。/));
});

test("学校の進み具合を使う：まだ習っていない単元は、はじめの基礎だけ先取り", () => {
  const L = learner();
  L.add(T0, ["C1", "C2", "C3", "B1"], [c, c, c, c]); // 既習の内容だけ記録がある
  const p = L.plan(T0 + HOUR, { school: { ...SCHOOL, school_status: "notyet" } });
  const cur = p.sessions.filter((s) => s.type === "current_unit");
  assert.ok(cur.length);
  cur.forEach((s) => assert.equal(s.level, "basic"));
  assert.match(p.why, /先取り/);
});

test("定着の確認を入れる：一度できてから3日以上たったスキル", () => {
  const L = learner(); demo(L);
  const p = L.plan(T0 + 4 * DAY, { minutes: 30, explorations: [EXPL_CHANGE] });
  const rv = p.sessions.find((s) => s.type === "review");
  assert.ok(rv, types(p).join(" / "));
  assert.equal(rv.level, "retention");
  assert.match(p.why, /忘れていないか/);
});

test("得意な場合は標準・応用へ進める", () => {
  const L = learner();
  L.add(T0, ["B1", "B2", "B3", "B4", "B5", "C4", "C5", "S1", "S2"], [c, c, c, c, c, c, c, c, c]);
  const p = L.plan(T0 + HOUR, { minutes: 45 });
  assert.ok(!p.sessions.some((s) => s.type === "practice"), "つまずきがなければ補強はない");
  const up = p.sessions.filter((s) => s.level === "standard" || s.level === "application");
  assert.ok(up.length, types(p).join(" / "));
  assert.ok(p.sessions.some((s) => s.type === "challenge" || s.level === "application"), types(p).join(" / "));
});

test("学習履歴で翌日の内容が変わる：練習で基礎ができたら、次は標準（または次のスキル）", () => {
  const L = learner(); demo(L);
  const day1 = L.plan(T0 + HOUR, { explorations: [EXPL_CHANGE] });
  const p1 = day1.sessions.find((s) => s.type === "practice");
  assert.deepEqual([p1.skill, p1.level], ["change", "basic"]);
  // 1日目の練習で、変化量の基礎を3問とも正解
  L.add(T0 + 2 * HOUR, p1.questions.map((id) => ({ ...Q[id], id })), p1.questions.map(() => c), "lesson");
  const day2 = L.plan(T0 + DAY + HOUR, { explorations: [EXPL_CHANGE] });
  const p2 = day2.sessions.find((s) => s.type === "practice");
  assert.ok(p2.skill !== "change" || p2.level !== "basic", "同じ内容をくり返さない: " + types(day2).join(" / "));
  assert.match(day2.why, /形を変えた問題|変化量|変化の割合/);
  // 1日目に練習した問題を、翌日すぐには出さない
  const q1 = new Set(p1.questions);
  day2.sessions.filter((s) => s.skill === "change").flatMap((s) => s.questions).forEach((id) => assert.ok(!q1.has(id), id + " を翌日にくり返した"));
});

test("問題は練習向けを優先し、最近の診断・チェックで出した問題は避ける（足りなければ理由つきで再利用）", () => {
  const L = learner(); demo(L);
  const p = L.plan(T0 + HOUR, { minutes: 60, explorations: [EXPL_CHANGE] });
  const diagnosed = new Set(["B1", "B2", "B3", "B4", "B5", "C4", "C5"]);
  p.sessions.forEach((s) => s.picks.forEach((pk) => {
    if (pk.stage === 0) {
      assert.ok(!diagnosed.has(pk.question_id), pk.question_id);
      assert.notEqual(Q[pk.question_id].usage, "diagnosis");
    } else {
      assert.ok(pk.why.length > 0, "再利用・緩和の理由がある");
    }
  }));
  const all = p.sessions.flatMap((s) => s.questions);
  assert.equal(new Set(all).size, all.length, "同じプランの中で同じ問題を出さない");
});

test("「なぜ今日はこれ？」は必ずあり、断定しない", () => {
  const L = learner(); demo(L);
  for (const goal of Object.keys(P.GOALS)) {
    for (const minutes of P.CONFIG.MINUTES) {
      const p = L.plan(T0 + 4 * DAY, { goal, minutes, explorations: [EXPL_CHANGE] });
      assert.ok(p.why && p.why.length > 10, goal + minutes);
      assert.doesNotMatch(p.why, /苦手です|原因です|できません/);
      assert.ok(p.cross && p.reason);
      assert.ok(p.sessions.length >= 2, goal + " " + minutes + ": " + types(p).join(" / "));
      assert.equal(p.total_minutes, minutes, goal + " " + minutes);
    }
  }
});

test("すべてできるようになっても、空のプランにせず「おさらい」を出す", () => {
  const L = learner();
  const ids = E.UNITS["一次関数"].flatMap((s) => [...B.index[s].basic, ...B.index[s].standard, ...B.index[s].application]);
  L.add(T0, ids, ids.map(() => c));
  L.add(T0 + 4 * DAY, ids, ids.map(() => c));
  const p = L.plan(T0 + 30 * DAY);
  assert.ok(p.sessions.length >= 1, "空にしない");
  assert.equal(p.total_minutes, 30);
});

test("記録がまったくなくても止まらない（学校の単元の基礎から）", () => {
  const L = learner();
  const p = L.plan(T0);
  assert.ok(p.sessions.length >= 1);
  assert.equal(p.sessions[0].level, "basic");
});
