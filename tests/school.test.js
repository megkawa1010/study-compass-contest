// node --test tests/*.test.js — 学校のようす（どこまで習ったか・先取り・次のテスト）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner", "testprep", "store"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, P = SC.planner, C = SC.compass, R = SC.rootcause, ST = SC.store;
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;

// 学校：式の計算・連立方程式は習った／一次関数は「変化の割合まで」
function school(currentSkill = "rate") {
  const s = { current_unit: "一次関数", units: {
    "式の計算": { status: "learned" }, "連立方程式": { status: "learned" },
    "一次関数": { status: "learning", current_skill: currentSkill } } };
  Object.keys(s.units).forEach((u) => { s.units[u].skills = E.expandUnit(u, s.units[u].status, s.units[u].current_skill); });
  return s;
}
const ans = (id, status, at, extra = {}) => E.makeAnswerRecord(Q[id], { status, ...extra }, { userId: "u", now: at });

test("「変化の割合まで」を、スキルごとの 習った／学習中／まだ に広げる", () => {
  assert.deepEqual(E.expandUnit("一次関数", "learning", "rate"), {
    change: "learned", substitution: "learned", rate: "current", slopeIntercept: "not_learned", form: "not_learned", simGraph: "not_learned" });
  const s = school();
  assert.equal(E.schoolSkillStatus("change", s), "learned");
  assert.equal(E.schoolSkillStatus("rate", s), "current");
  assert.equal(E.schoolSkillStatus("form", s), "not_learned");
  assert.equal(E.schoolSkillStatus("simElim", s), "learned");
  assert.equal(E.schoolSkillStatus("transpose", s), null, "中1・土台は学校のようすで管理しない（習った扱い）");
  assert.equal(E.nextPreviewSkill(s), "slopeIntercept", "先取りは次の1スキルだけ");
  // どこまでか分からない「学習中」は、未学習にしない
  assert.equal(E.expandUnit("一次関数", "learning", null).form, "current");
  assert.equal(E.nextPreviewSkill(school("simGraph")), null, "単元の最後まで進んでいれば先取りなし");
});

test("未学習 ≠ 苦手：先取りでまちがえても、苦手にも確かさの低下にもならない", () => {
  const s = school();
  const h = [ans("slopeIntercept-basic-1", "incorrect", T0, { preview: true }), ans("slopeIntercept-basic-2", "incorrect", T0 + 1000, { preview: true }),
    ans("rate-basic-1", "incorrect", T0 + 2000)];
  const st = E.computeSkillStates(h, { now: T0 + DAY, school: s });
  assert.equal(st.slopeIntercept.learning_status, "not_learned");
  assert.equal(st.slopeIntercept.attempt_count, 0, "先取りのまちがいは数えない");
  assert.equal(st.slopeIntercept.preview_misses, 2);
  assert.equal(st.slopeIntercept.school_status, "not_learned");
  assert.equal(st.rate.learning_status, "needs_review", "学校で学習中のスキルのまちがいは、ふつうに数える");
  // 先取りでできた問題は、ふつうの記録として数える
  const h2 = [ans("slopeIntercept-basic-1", "correct", T0, { preview: true })];
  assert.equal(E.computeSkillStates(h2, { now: T0 + DAY, school: s }).slopeIntercept.correct_count, 1);
  // 学校でまだ習っていないスキルは、記録がなくても「未学習」（「まだ（記録なし）」ではない）
  assert.equal(E.computeSkillStates([], { now: T0, school: s }).form.learning_status, "not_learned");
});

test("あとで学校で習っても、習う前（先取り）のまちがいは数えない", () => {
  const h = [ans("slopeIntercept-basic-1", "incorrect", T0, { preview: true })];
  const later = school("form"); // 学校が進んで、傾き・切片は習った
  const st = E.computeSkillStates(h, { now: T0 + 7 * DAY, school: later });
  assert.equal(st.slopeIntercept.learning_status, "not_checked");
});

test("今日の学習：学校枠は 習った＋学習中 のスキル。次の1スキルだけ「先取り」、その先は出さない", () => {
  const s = school();
  const h = [];
  let n = 0;
  // 学校で習ったところ（変化量・式への代入・変化の割合）は、基礎〜応用まで できている＝学校に追いついている
  ["change", "substitution", "rate"].forEach((k) => ["basic", "standard", "application"].forEach((lv) => B.index[k][lv].slice(0, 2).forEach((id) => {
    const q = Q[id];
    if (q.type === "steps") q.steps.forEach((st) => h.push(E.makeAnswerRecord({ id: id + "#" + st.id, skill: st.skill, level: q.level, unit: q.unit }, { status: "correct" }, { userId: "u", now: T0 + (++n) * 1000 })));
    else h.push(ans(id, "correct", T0 + (++n) * 1000));
  })));
  const now = T0 + 3600e3;
  const sc = { grade: "中2", subject: "数学", current_unit: "一次関数", school_status: "learning", detail: s };
  const p = P.build({ states: E.computeSkillStates(h, { now, school: s }), history: h, explorations: [], school: sc, minutes: 45, now, rng: B.seeded(1) });
  p.sessions.forEach((x) => assert.ok(!["form", "simGraph"].includes(x.skill), "学校でまだ習っていない " + x.skill));
  assert.deepEqual(p.debug.school.excluded_not_learned.sort(), ["form", "simGraph"]);
  assert.equal(p.debug.school.preview, "slopeIntercept");
  const pv = p.sessions.find((x) => x.type === "preview");
  assert.ok(pv, p.sessions.map((x) => x.type + ":" + x.skill).join(" "));
  assert.equal(pv.skill, "slopeIntercept");
  assert.equal(pv.type_label, "先取り");
  assert.equal(pv.level, "basic");
  assert.match(p.why, /できなくても大丈夫/);
  assert.ok(p.debug.excluded.some((x) => x.skill === "form" && /学校でまだ習っていない/.test(x.why)));
});

test("定期チェック・原因さがし：学校でまだ習っていないスキルは対象にしない", () => {
  const s = school("change");
  // 以前の記録で「グラフ・式」を解いていても、学校のようすで「まだ」なら定期チェックに出さない
  const h = [ans("form-basic-1", "incorrect", T0), ans("form-basic-2", "incorrect", T0 + 1000), ans("rate-basic-1", "incorrect", T0 + 2000)];
  const now = T0 + 4 * DAY;
  const chk = C.buildCheck({ states: E.computeSkillStates(h, { now, school: s }), history: h, sessions: [], now, rng: B.seeded(1), school: s });
  assert.ok(!chk.chosen.some((c) => c.skill === "form"));
  assert.ok(chk.notDue.some((c) => c.skill === "form" && c.why_not === "学校でまだ習っていない"));
  // 2直線の交点（前提：加減法・グラフ・式・座標）で原因さがし：グラフ・式は学校でまだなので確かめない
  const q = { id: "tmp", skill: "simGraph", level: "basic", prerequisite_skills: [] };
  const trail = R.start({ question: q, now: T0 });
  const asked = [];
  for (let g = 0; g < 10; g++) {
    const p = R.next(trail, { states: {}, now: T0, budgetLeft: 4, school: s, pickQuestion: (k) => (B.pick(k, "basic", { rng: B.seeded(1) }) || {}).id || null });
    if (!p) break;
    asked.push(p.skill);
    R.answer(trail, p, true);
  }
  assert.ok(!asked.includes("form"), asked.join(","));
  assert.ok(trail.log.some((l) => /学校でまだ習っていないので、確かめない/.test(l)));
  // 単元のはじめてのチェックも、まだ習っていないスキルの問題は出さない
  const sim = { current_unit: "連立方程式", units: { "式の計算": { status: "learned" }, "連立方程式": { status: "learning", current_skill: "simCoef" }, "一次関数": { status: "not_learned" } } };
  const u = C.unitCheck("連立方程式", sim);
  u.questions.forEach((id) => assert.notEqual(E.schoolSkillStatus(Q[id].skill, sim), "not_learned", id));
});

test("保存：以前のデータから作る・更新で前後の単元をそろえる・先取りの回答に印を付ける", () => {
  const d = ST.reset();
  d.profile.current_unit = "連立方程式";
  d.profile.school_progress = { "連立方程式": "learning" };
  delete d.profile.school;
  const s0 = ST.school();
  assert.equal(s0.current_unit, "連立方程式");
  assert.equal(s0.units["式の計算"].status, "learned", "前の単元は習った");
  assert.equal(s0.units["一次関数"].status, "not_learned", "後の単元はまだ");
  assert.equal(s0.updated_at, null);
  const s1 = ST.setSchool("一次関数", "rate", { nextTest: { date: "2026-10-20", units: ["連立方程式", "一次関数"] } });
  assert.equal(s1.units["連立方程式"].status, "learned");
  assert.equal(s1.units["一次関数"].skills.slopeIntercept, "not_learned");
  assert.ok(s1.updated_at);
  assert.equal(ST.currentUnit(), "一次関数");
  assert.equal(ST.get().profile.school_progress["一次関数"], "learning", "以前の形にも書きもどす");
  const rec = ST.addAnswer(Q["slopeIntercept-basic-1"], { status: "incorrect" }, { context: "lesson" });
  assert.equal(rec.preview, true);
  assert.equal(ST.addAnswer(Q["rate-basic-1"], { status: "incorrect" }, { context: "lesson" }).preview, false);
  assert.equal(ST.get().skill_state.slopeIntercept.learning_status, "not_learned");
  assert.equal(ST.schoolProgressInfo().detail.next_test.date, "2026-10-20");
  ST.reset();
});
