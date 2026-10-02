// node --test tests/*.test.js — Phase 6 テスト対策モード
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const TP = SC.testprep, P = SC.planner, E = SC.engine, Q = SC.QUESTIONS, B = SC.bank;
const HOUR = 3600e3, DAY = 24 * HOUR;
const T0 = new Date(2026, 9, 1, 16, 0).getTime(); // 2026-10-01 16:00（ローカル）
const c = "correct", x = "incorrect";
const RANGE = ["change", "substitution", "rate", "slopeIntercept", "form"];

function learner() {
  const history = [];
  let n = 0;
  return {
    history,
    add(at, ids, results, context = "compass_check") {
      ids.forEach((id, i) => history.push(E.makeAnswerRecord(Q[id], { status: results[i] }, { userId: "u", sessionId: "s", context, now: at + (++n) })));
    },
    states(now) { return E.computeSkillStates(history, { now }); }
  };
}
// 変化量・変化の割合が不安定、式への代入・傾き切片はできている、グラフ式は未確認
function base(L) {
  L.add(T0, ["B3", "B4", "C4", "C5", "S1"], [c, x, x, c, x]);
}
const testOn = (days) => ({ test_date: TP.dateKey(T0 + days * DAY), range_skills: RANGE });

test("テストまでの日数（当日0・前日1）", () => {
  assert.equal(TP.daysLeft(TP.dateKey(T0 + 10 * DAY), T0), 10);
  assert.equal(TP.daysLeft(TP.dateKey(T0 + DAY), T0 + 5 * HOUR), 1);
  assert.equal(TP.daysLeft(TP.dateKey(T0), T0), 0);
  assert.equal(TP.daysLeft(TP.dateKey(T0 - DAY), T0), -1);
});

test("仕上がり：skill_state から ◎ ○ △ ？ を読む", () => {
  const L = learner(); base(L);
  const r = Object.fromEntries(TP.readiness(L.states(T0 + HOUR), RANGE, T0 + HOUR).map((x) => [x.skill, x.mark]));
  assert.equal(r.change, "△");
  assert.equal(r.rate, "△");
  assert.equal(r.substitution, "○");
  assert.equal(r.slopeIntercept, "○");
  assert.equal(r.form, "？");
});

test("計画：1日目は範囲チェック、前日は総仕上げ、不安定なスキルほど多くの日・前提に近いスキルが先", () => {
  const L = learner(); base(L);
  const now = T0 + HOUR;
  const s = TP.schedule(testOn(10), L.states(now), now);
  assert.equal(s.days_left, 10);
  assert.equal(s.days.length, 10);
  assert.equal(s.days[0].kind, "range_check", "グラフ・式をまだ確かめていない");
  assert.equal(s.days[9].kind, "final_review");
  const count = (k) => s.days.filter((d) => d.kind === "focus" && d.skills.includes(k)).length;
  assert.ok(count("change") > count("substitution"), "△ の変化量は ○ の式への代入より多く");
  assert.ok(count("rate") >= count("slopeIntercept"));
  const firstDay = (k) => s.days.findIndex((d) => d.kind === "focus" && d.skills.includes(k));
  assert.ok(firstDay("change") <= firstDay("rate"), "前提の変化量が先");
  s.days.filter((d) => d.kind === "focus").forEach((d) => assert.ok(d.skills.length >= 1 && d.skills.length <= 2));
});

test("あと1日（今日がテスト前日）なら、今日は総仕上げ", () => {
  const L = learner(); base(L);
  const s = TP.schedule(testOn(1), L.states(T0 + HOUR), T0 + HOUR);
  assert.equal(s.days.length, 1);
  assert.equal(s.days[0].kind, "final_review");
  const s2 = TP.schedule(testOn(2), L.states(T0 + HOUR), T0 + HOUR);
  assert.deepEqual(s2.days.map((d) => d.kind), ["range_check", "final_review"], "2日なら、範囲チェック → 総仕上げ");
});

test("範囲チェックを今日やったら、1日目は通常の学習になる", () => {
  const L = learner(); base(L);
  const s = TP.schedule(testOn(5), L.states(T0 + HOUR), T0 + HOUR, { rangeCheckedToday: true });
  assert.equal(s.days[0].kind, "focus");
});

test("テスト範囲チェック：範囲の各スキルを1問ずつ、基礎ができていれば標準で", () => {
  const L = learner(); base(L);
  const now = T0 + HOUR;
  const r = TP.rangeCheck({ states: L.states(now), history: L.history, now, rng: B.seeded(1) }, RANGE);
  assert.equal(r.chosen.length, 5);
  assert.deepEqual(new Set(r.chosen.map((c) => c.skill)).size, 5);
  assert.equal(r.chosen.find((c) => c.skill === "substitution").planned_level, "standard");
  assert.equal(r.chosen.find((c) => c.skill === "change").planned_level, "basic");
  r.questions.forEach((id) => assert.ok(!["B3", "B4", "C4", "C5", "S1"].includes(id), "最近解いた問題は出さない: " + id));
});

// 今日の学習（テストが近い日）の配分は tests/testmode.test.js で確かめる

test("テストが終わったら計画を作らない", () => {
  const L = learner(); base(L);
  const s = TP.schedule(testOn(-1), L.states(T0), T0);
  assert.equal(s.days.length, 0);
});
