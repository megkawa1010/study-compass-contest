// node --test tests/*.test.js — 図形の原因さがし：角度（value）と根拠（reason）の結果で入口を変える
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "compass", "rootcause"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, L = SC.logic, R = SC.rootcause, C = SC.compass, G = SC.geometry;
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;
const GEO = ["lineAngles", "angleEq", "angleNames", "parallelAngles", "triangleSum", "exteriorAngle", "angleCombo", "polygonInterior", "polygonExterior", "angleBasics"];

// 子どもの答え（小問ごと）から L.checkSteps の結果を作る
function answerSteps(q, values) {
  const v = {};
  q.steps.forEach((st) => { v[st.id] = values[st.id] !== undefined ? values[st.id] : String(st.answer); });
  return L.checkSteps(q, v);
}
const skillsOf = (r) => r.asked.map((p) => p.skill);

test("A 角度○・根拠× → 理由だけ記録。図形側の深い原因さがしはしない（追加の問題 0）", () => {
  const q = Q["parallelAngles-basic-1"];
  const res = answerSteps(q, { s2: "alternate" });               // 同位角なのに錯角を選んだ
  const r = R.simulate(q, res, {}, { now: T0 });
  assert.equal(r.entry.entry, "reason_only");
  assert.equal(r.asked.length, 0, "角の基本や同位角・錯角の位置まで追加問題を出さない");
  assert.equal(r.trail.conclusion.kind, "reason_only");
  assert.equal(r.trail.conclusion.return_to, null);
  assert.equal(r.trail.conclusion.reason_practice, "parallelAngles");
  assert.equal(r.entry.confusions[0].confusion, "alternate_for_corresponding");
  assert.match(r.trail.conclusion.message, /選んだ根拠「平行線の錯角は等しい」→ 正しくは「平行線の同位角は等しい」/);
  // 記録：value は正解、reason は不正解。parallelAngles.reason.confusions に保存される
  const recs = q.steps.map((st, i) => E.makeAnswerRecord({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, unit: q.unit, aspect: st.aspect },
    { status: res[i].correct ? "correct" : "incorrect", chosen: res[i].chosen, confusion: res[i].correct ? null : G.confusionOf(st, res[i].chosen) },
    { userId: "u", context: "compass_check", now: T0 + i * 1000 }));
  const s = E.computeSkillStates(recs, { now: T0 + 3600e3 }).parallelAngles;
  assert.equal(s.value.correct, 1);
  assert.equal(s.reason.correct, 0);
  assert.deepEqual(s.reason.confusions, { alternate_for_corresponding: 1 });
  // 今日の学習の候補に「根拠確認」を出せる
  const rp = R.reasonPractice([{ ...r.trail, date: new Date(T0).toISOString() }], {}, T0 + DAY);
  assert.deepEqual(rp.map((x) => x.skill), ["parallelAngles"]);
  assert.deepEqual(rp[0].confusions, ["alternate_for_corresponding"]);
});

test("B 角度×・根拠○ → 計算側だけ。角度を式で表す → 同類項 → 移項 → 正負の数", () => {
  const q = Q["angleEq-basic-3"];                                 // 2x = 84（式を選ぶ小問なし・根拠あり）
  const res = answerSteps(q, { s1: "40" });
  const r = R.simulate(q, res, { likeTerms: true, transpose: false, signed: true, algebra: true }, { now: T0 });
  assert.equal(r.entry.entry, "calc");
  assert.deepEqual(r.entry.calc_prereqs, ["likeTerms", "transpose"]);
  assert.deepEqual(skillsOf(r), ["likeTerms", "transpose", "signed", "algebra"]);
  assert.ok(!skillsOf(r).some((k) => GEO.includes(k)), "図形の性質側は確かめない");
  assert.equal(r.trail.conclusion.return_to, "transpose");
  assert.ok(r.trail.geometry.skipped.some((x) => x.side === "concept"));
  // 多角形の内角（n を求める）→ かっこのある方程式 → 分配法則
  const p = Q["polygonInterior-standard-1"];
  const fake = { ...p, type: "steps", steps: [{ id: "s1", skill: "polygonInterior", aspect: "value", type: "number", answer: 9 }, { id: "s2", skill: "polygonInterior", aspect: "reason", type: "choice", answer: "polygonSum" }] };
  const r2 = R.simulate(fake, [{ id: "s1", skill: "polygonInterior", correct: false, aspect: "value" }, { id: "s2", skill: "polygonInterior", correct: true, aspect: "reason" }],
    { eqParen: false, distrib: false, signed: true, transpose: true }, { now: T0 });
  assert.equal(r2.entry.entry, "calc");
  assert.deepEqual(skillsOf(r2).slice(0, 2), ["eqParen", "distrib"]);
  assert.equal(r2.trail.conclusion.return_to, "distrib");
  // 多角形の外角（n を求める）→ 等式の性質
  const e = Q["polygonExterior-standard-1"];
  assert.deepEqual(R.geometryEntry(e, [{ id: null, skill: e.skill, correct: false, aspect: "value" }, { id: "r", skill: e.skill, correct: true, aspect: "reason" }]).calc_prereqs, ["eqProperty"]);
  // 計算の前提がない問題（たし算・ひき算だけ）は、問題を出さずに「計算の見直し」
  const t = Q["triangleSum-basic-1"];
  const r3 = R.simulate(t, answerSteps(t, { s1: "75" }), {}, { now: T0 });
  assert.equal(r3.entry.entry, "calc");
  assert.equal(r3.asked.length, 0);
  assert.equal(r3.trail.conclusion.kind, "value_slip");
});

test("C 角度×・根拠× → 図形の性質側から。平行線と角 × → 同位角・錯角の位置 × → 対頂角・一直線 ○ → 戻る場所は「同位角・錯角」", () => {
  const q = Q["parallelAngles-basic-1"];
  const r = R.simulate(q, answerSteps(q, { s1: "108", s2: "straight" }), { angleNames: false, lineAngles: true, angleBasics: true }, { now: T0 });
  assert.equal(r.entry.entry, "concept");
  assert.deepEqual(r.entry.concept_prereqs, ["angleNames", "lineAngles"]);
  assert.deepEqual(skillsOf(r), ["angleNames", "lineAngles"]);
  assert.equal(r.trail.conclusion.return_to, "angleNames");
  assert.match(R.pathText(r.trail), /平行線と角 × → 同位角・錯角 × → 対頂角・一直線の角 ○/);
  // 図形側で戻る場所が見つかったので、計算側はいまは確かめない
  assert.ok(r.trail.geometry.skipped.some((x) => x.side === "calc"));
  // 図形側ができていれば、必要なときだけ計算側へ（根拠を聞かない「n を求める」問題）
  const p = Q["polygonInterior-standard-1"];
  const r2 = R.simulate(p, false, { triangleSum: true, eqParen: false, distrib: true, transpose: true, signed: true }, { now: T0 });
  assert.equal(r2.entry.entry, "concept");
  assert.deepEqual(skillsOf(r2).slice(0, 2), ["triangleSum", "eqParen"]);
  assert.equal(r2.trail.conclusion.return_to, "eqParen");
});

test("D 式を立てる○・x の計算× → 一次方程式（計算側）へ", () => {
  const q = Q["angleEq-standard-1"];
  assert.deepEqual(q.steps.map((s) => s.id + ":" + (s.side || s.aspect)), ["s0:concept", "s1:calc", "s2:reason"]);
  const res = answerSteps(q, { s1: "40", s2: "vertical" });     // 根拠もまちがえているが、最初に止まったのは x の計算
  const r = R.simulate(q, res, { likeTerms: false, signed: true, transpose: true, algebra: true }, { now: T0 });
  assert.equal(r.entry.first_miss_step, "s1");
  assert.equal(r.entry.entry, "calc");
  assert.equal(skillsOf(r)[0], "likeTerms");
  assert.ok(!skillsOf(r).some((k) => GEO.includes(k)));
  assert.equal(r.trail.conclusion.return_to, "likeTerms");
});

test("E 式を立てる× → 角度を式で表す から図形の性質側へ（計算側はすぐには確かめない）", () => {
  const q = Q["angleEq-standard-1"];
  const res = answerSteps(q, { s0: "c", s1: "60" });             // 2x + 10 = x + 20 を選んだ
  const r = R.simulate(q, res, { lineAngles: false, angleBasics: true }, { now: T0 });
  assert.equal(r.entry.first_miss_step, "s0");
  assert.equal(r.entry.entry, "concept");
  assert.equal(r.trail.symptom.skill, "angleEq");
  assert.deepEqual(skillsOf(r), ["lineAngles", "angleBasics"]);
  assert.equal(r.trail.conclusion.return_to, "lineAngles");
  assert.ok(!skillsOf(r).some((k) => ["likeTerms", "transpose"].includes(k)));
  assert.ok(r.trail.geometry.skipped.some((x) => x.side === "calc" && /式を立てる/.test(x.why)));
});

test("F 学校で未学習の図形問題× → 苦手にしない・原因さがしなし・確かさも reason も下げない", () => {
  const school = { current_unit: "図形の角", units: { "図形の角": { status: "learning", current_skill: "lineAngles" } } };
  school.units["図形の角"].skills = E.expandUnit("図形の角", "learning", "lineAngles");
  const q = Q["parallelAngles-basic-1"];
  const res = answerSteps(q, { s1: "108", s2: "straight" });
  const g = R.geometryEntry(q, res, { school });
  assert.equal(g.entry, "not_learned");
  assert.equal(R.simulate(q, res, {}, { now: T0, school }).trail, null);
  // 先取りでまちがえた記録（store が preview を付ける）は、value も reason も理解度に入れない
  const recs = q.steps.map((st, i) => E.makeAnswerRecord({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, unit: q.unit, aspect: st.aspect },
    { status: "incorrect", preview: true, chosen: res[i].chosen, confusion: res[i].correct ? null : G.confusionOf(st, res[i].chosen) },
    { userId: "u", context: "compass_check", now: T0 + i * 1000 }));
  const s = E.computeSkillStates(recs, { now: T0 + 3600e3, school }).parallelAngles;
  assert.equal(s.learning_status, "not_learned");
  assert.equal(s.value.attempts, 0);
  assert.equal(s.reason.attempts, 0);
  assert.deepEqual(s.reason.confusions, {});
  // 原因さがしの途中でも、学校で未学習の前提は確かめない
  const r = R.simulate(Q["angleEq-standard-1"], answerSteps(Q["angleEq-standard-1"], { s0: "c", s1: "60" }), { lineAngles: false }, { now: T0, school });
  assert.ok(!r.trail || !skillsOf(r).includes("angleNames"));
});

test("G 追加4問の上限：確かめきれなかった前提は次回のコンパスチェックへ", () => {
  const q = Q["angleCombo-basic-1"];                              // 角度×・根拠× → 図形側（平行線と角・三角形の外角）からさかのぼる
  const r = R.simulate(q, answerSteps(q, { s1: "60", s2: "vertical" }),
    { parallelAngles: false, angleNames: false, lineAngles: false, angleBasics: false, exteriorAngle: false, triangleSum: false }, { now: T0, budget: R.CONFIG.BUDGET_INITIAL });
  assert.ok(r.asked.length <= 4, "追加は4問まで：" + skillsOf(r));
  assert.equal(r.trail.conclusion.kind, "undetermined");
  assert.ok(r.trail.conclusion.pending_skills.length > 0);
  // 定期チェックの上限（2問）でも同じ
  const r2 = R.simulate(Q["parallelAngles-basic-1"], answerSteps(Q["parallelAngles-basic-1"], { s1: "108", s2: "straight" }),
    { angleNames: false, lineAngles: false, angleBasics: false }, { now: T0, budget: R.CONFIG.BUDGET_PERIODIC });
  assert.equal(r2.asked.length, 2);
  assert.ok(r2.trail.conclusion.pending_skills.length > 0);
  // 次の日のコンパスチェックで、最優先（P0）に回る
  const ex = { ...r2.trail, date: new Date(T0).toISOString() };
  const pend = C.pendingFromExplorations([ex], [], T0 + DAY);
  assert.deepEqual(pend.map((p) => p.skill), r2.trail.conclusion.pending_skills);
  assert.deepEqual(C.pendingFromExplorations([ex], [], T0 + 3600e3), [], "当日は出さない");
});

test("すべての図形問題で、入口と前提の側が決まる（図形側に計算スキルがまざらない）", () => {
  Object.values(Q).filter((q) => q.origin === "bank" && R.isGeometry(q.skill)).forEach((q) => {
    (q.concept_prerequisites || []).forEach((p) => assert.ok(R.isGeometry(p) || p === "angleBasics", q.id + " concept " + p));
    (q.calculation_prerequisites || []).forEach((p) => assert.ok(!R.isGeometry(p) && p !== "angleBasics", q.id + " calc " + p));
    const g = R.geometryEntry(q, q.type === "steps" ? q.steps.map((s) => ({ id: s.id, skill: s.skill, correct: false, aspect: s.aspect })) : false);
    assert.ok(["concept", "calc"].includes(g.entry), q.id);
  });
});
