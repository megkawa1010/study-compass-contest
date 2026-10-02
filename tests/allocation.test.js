// node --test tests/*.test.js — 今日の学習の時間配分（戻る勉強・学校の範囲・定着の確認・先取り）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, P = SC.planner;
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;

// 学校：一次関数「変化の割合まで」
function school(currentSkill = "rate") {
  const s = { current_unit: "一次関数", units: { "式の計算": { status: "learned" }, "連立方程式": { status: "learned" }, "一次関数": { status: "learning", current_skill: currentSkill } } };
  Object.keys(s.units).forEach((u) => { s.units[u].skills = E.expandUnit(u, s.units[u].status, s.units[u].current_skill); });
  return s;
}
function learner() {
  const h = [];
  let n = 0;
  const add = (id, st, at = T0, ctx = "compass_check") => {
    const q = Q[id];
    if (q.type === "steps") q.steps.forEach((s) => h.push(E.makeAnswerRecord({ id: id + "#" + s.id, skill: s.skill, level: q.level, unit: q.unit }, { status: st }, { userId: "u", context: ctx, now: at + (++n) * 1000 })));
    else h.push(E.makeAnswerRecord(q, { status: st }, { userId: "u", context: ctx, now: at + (++n) * 1000 }));
  };
  return { h, add };
}
function plan(L, opts = {}) {
  const s = opts.school || school();
  const now = opts.now || T0 + 3600e3;
  const sc = { grade: "中2", subject: "数学", current_unit: s.current_unit, school_status: "learning", detail: s };
  return P.build({ states: E.computeSkillStates(L.h, { now, school: s }), history: L.h, explorations: opts.explorations || [], school: sc,
    minutes: opts.minutes || 30, goal: opts.goal || "daily_learning", now, rng: B.seeded(1) });
}
const sum = (p, types) => p.sessions.filter((x) => types.includes(x.type)).reduce((m, x) => m + x.minutes, 0);
const desc = (p) => p.sessions.map((x) => x.minutes + "分 " + x.type + ":" + x.skill).join(" / ");
// 学校で習った「変化量・式への代入」はできている。学校で学習中の「変化の割合」は基礎だけ
function base(L) {
  ["change-basic-1", "change-basic-2", "change-standard-1", "substitution-basic-1", "substitution-basic-2", "substitution-standard-1", "rate-basic-1", "rate-basic-2",
    "signed-basic-2", "algebra-basic-1", "likeTerms-basic-1", "eqProperty-basic-1"].forEach((id) => L.add(id, "correct"));
}
// つまずき：移項（グラフ・式の問題からさかのぼって）
const EXPL_T = { date: new Date(T0).toISOString(), symptom: { skill: "rate", label: "変化の割合" }, path: [{ depth: 0 }, { depth: 1 }, { depth: 2 }], conclusion: { kind: "gap_found", return_to: "transpose" } };

test("例1：学校＝変化の割合まで・つまずき＝移項・30分 → ウォームアップ5・移項10・変化の割合10・確認5", () => {
  const L = learner(); base(L);
  ["transpose-basic-1", "transpose-basic-2", "transpose-basic-3"].forEach((id) => L.add(id, "incorrect"));
  const p = plan(L, { explorations: [EXPL_T] });
  assert.equal(p.total_minutes, 30, desc(p));
  const t = p.sessions.find((x) => x.type === "practice");
  assert.equal(t.skill, "transpose", desc(p));
  const cur = p.sessions.find((x) => x.type === "current_unit");
  assert.equal(cur.skill, "rate", "学校で学習中の「変化の割合」に戻る：" + desc(p));
  assert.ok(sum(p, ["current_unit"]) >= 10, "学校の範囲を残す：" + desc(p));
  assert.ok(sum(p, ["practice", "review"]) <= 15, desc(p));
  assert.ok(!p.sessions.some((x) => x.type === "preview"), "つまずきがあるので先取りなし");
  assert.ok(p.sessions.some((x) => x.type === "check"));
  assert.match(p.why, /一次関数の前に、方程式を少し確認してから、学校で習っている「変化の割合」に戻ろう/);
});

test("例2：つまずきなし・30分 → 変化の割合を中心に、定着の確認と先取り（傾き・切片）", () => {
  const L = learner(); base(L);
  // 3日以上前にできた「変化量」は、定着の確認の時期
  const p = plan(L, { now: T0 + 4 * DAY });
  assert.ok(!p.sessions.some((x) => x.type === "practice"), desc(p));
  assert.ok(sum(p, ["current_unit"]) >= 15, desc(p));
  const pv = p.sessions.find((x) => x.type === "preview");
  assert.ok(pv && pv.skill === "slopeIntercept" && pv.minutes >= 5 && pv.minutes <= 10, desc(p));
  assert.ok(p.sessions.some((x) => x.level === "retention" && x.minutes === 5), "定着の確認は短く：" + desc(p));
  assert.match(p.why, /少し先の「傾き・切片」ものぞいてみよう/);
  assert.match(p.why, /できなくても大丈夫/);
});

test("20分・30分・45分で配分が変わる。45分は4つの枠（戻る・学校・定着・確認/先取り）を使える", () => {
  const L = learner(); base(L);
  ["transpose-basic-1", "transpose-basic-2"].forEach((id) => L.add(id, "incorrect"));
  const now = T0 + 4 * DAY;
  const p20 = plan(L, { minutes: 20, now, explorations: [EXPL_T] }), p30 = plan(L, { minutes: 30, now, explorations: [EXPL_T] }), p45 = plan(L, { minutes: 45, now, explorations: [EXPL_T] });
  assert.equal(p20.total_minutes, 20); assert.equal(p30.total_minutes, 30); assert.equal(p45.total_minutes, 45);
  assert.notDeepEqual(p20.sessions.map((x) => x.minutes), p30.sessions.map((x) => x.minutes));
  [p20, p30, p45].forEach((p) => assert.ok(sum(p, ["current_unit"]) >= 10, "学校の範囲が0分にならない：" + desc(p)));
  assert.ok(!p20.sessions.some((x) => x.type === "preview"), "20分は先取りなし");
  assert.ok(sum(p20, ["practice"]) >= 5 && sum(p20, ["practice"]) <= 10, desc(p20));
  assert.ok(p45.sessions.length >= 4, desc(p45));
  assert.ok(p45.sessions.some((x) => x.level === "retention"), "45分なら定着の確認も入る：" + desc(p45));
});

test("つまずきが深いと戻る勉強が増える。それでも学校の範囲は残る", () => {
  const mild = learner(); base(mild);
  mild.add("transpose-basic-1", "correct"); mild.add("transpose-basic-2", "incorrect");
  const deep = learner(); base(deep);
  ["transpose-basic-1", "transpose-basic-2", "transpose-basic-3", "transpose-basic-4", "transpose-standard-1"].forEach((id) => deep.add(id, "incorrect"));
  const pm = plan(mild, { explorations: [{ ...EXPL_T, path: [{ depth: 0 }, { depth: 1 }] }] });
  const pd = plan(deep, { explorations: [EXPL_T] });
  const back = (p) => sum(p, ["practice"]) + p.sessions.filter((x) => x.role === "warmup").reduce((m, x) => m + x.minutes, 0);
  assert.ok(pd.debug.alloc.severity_score > pm.debug.alloc.severity_score);
  assert.ok(back(pd) > back(pm), "深い " + desc(pd) + " ／ 浅い " + desc(pm));
  assert.ok(sum(pd, ["current_unit"]) >= 10, desc(pd));
  // 苦手を戻る日でも、学校の範囲は0分にしない
  const pc = plan(deep, { explorations: [EXPL_T], goal: "catch_up" });
  assert.ok(sum(pc, ["current_unit"]) >= 10, desc(pc));
});

test("未学習スキルは先取り以外では出ない。同じスキルを長く続けない（1スキル15分まで）", () => {
  [20, 30, 45, 60].forEach((m) => {
    const L = learner(); base(L);
    const p = plan(L, { minutes: m, now: T0 + 4 * DAY });
    p.sessions.forEach((x) => {
      if (E.schoolSkillStatus(x.skill, school()) === "not_learned") assert.equal(x.type, "preview", m + "分：" + desc(p));
      assert.ok(x.minutes <= (m >= 60 ? 20 : 15), "1つのパートが長すぎる：" + desc(p));
    });
  });
});

test("?debug=plan 用：候補・重み・最終配分・除外の理由を持つ", () => {
  const L = learner(); base(L);
  ["transpose-basic-1", "transpose-basic-2"].forEach((id) => L.add(id, "incorrect"));
  const p = plan(L, { explorations: [EXPL_T], minutes: 20 });
  const a = p.debug.alloc;
  assert.equal(a.available_minutes, 20);
  assert.ok(["mild", "moderate", "severe"].includes(a.severity));
  assert.ok(a.factors && "confidence" in a.factors && "recent_errors" in a.factors && "depth" in a.factors);
  assert.deepEqual(a.candidates.root.slice(0, 1), ["transpose"]);
  assert.ok(a.candidates.school.length && a.candidates.preview === "slopeIntercept");
  assert.ok(a.blocks.every((b) => typeof b.weight === "number" && b.minutes % 5 === 0));
  assert.ok(a.excluded.some((x) => x.kind === "preview"), "先取りを入れなかった理由");
  assert.equal(a.final.reduce((m, x) => m + x.minutes, 0), 20);
});
