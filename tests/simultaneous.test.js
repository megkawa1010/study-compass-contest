// node --test tests/*.test.js — 学習マップの拡張（中2 連立方程式・2直線の交点）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, R = SC.rootcause, Q = SC.QUESTIONS, B = SC.bank, P = SC.planner, C = SC.compass, L = SC.logic, TP = SC.testprep;
const T0 = Date.parse("2026-10-01T07:00:00Z");
const DAY = 864e5;
const SIM = ["simMeaning", "simCoef", "simElim", "simSubst", "simParen", "simFraction", "simWord"];

// 子どもの「本当の理解」を決めて、道すじを最後までたどる（tests/map.test.js と同じ）
function run(question, knows, opts = {}) {
  const trail = R.start({ question, skill: opts.skill, now: T0 });
  let budget = opts.budget ?? 6;
  const asked = [], used = [question.id];
  for (let g = 0; g < 20; g++) {
    const p = R.next(trail, { states: opts.states || {}, now: T0, budgetLeft: budget,
      pickQuestion: (s) => { const q = B.pick(s, "basic", { exclude: used, rng: B.seeded(1) }) || B.pick(s, "retention", { exclude: used, rng: B.seeded(1) }); return q ? q.id : null; } });
    if (!p) break;
    used.push(p.question_id); budget--; asked.push(p);
    R.answer(trail, p, !!knows[p.skill]);
  }
  return { trail, asked, c: trail.conclusion };
}
function history() {
  const h = [];
  let n = 0;
  return {
    h,
    add(id, st, at = T0) {
      const q = Q[id];
      if (q.type === "steps") {
        q.steps.forEach((s, i) => h.push(E.makeAnswerRecord({ id: id + "#" + s.id, skill: s.skill, level: q.level, unit: q.unit },
          { status: Array.isArray(st) ? st[i] : st }, { userId: "u", now: at + (++n) * 1000 })));
      } else h.push(E.makeAnswerRecord(q, { status: st }, { userId: "u", now: at + (++n) * 1000 }));
    }
  };
}

test("連立方程式のスキル：単元・学年・前提が地図の中にあり、一次方程式・一次関数とつながる", () => {
  SIM.forEach((k) => {
    assert.equal(E.SKILLS[k].unit, "連立方程式", k);
    assert.equal(E.SKILLS[k].grade, "中2", k);
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.SKILLS[p], k + " の前提 " + p));
  });
  assert.deepEqual(E.UNITS["連立方程式"], SIM);
  // 一次方程式への入口
  assert.ok(E.SKILLS.simElim.prerequisites.includes("transpose"));
  assert.ok(E.SKILLS.simElim.prerequisites.includes("simCoef"));
  assert.ok(E.SKILLS.simSubst.prerequisites.includes("eqParen"));
  assert.ok(E.SKILLS.simCoef.prerequisites.includes("eqProperty"));
  // 一次関数とのかけ橋：グラフ側（グラフ・式・座標）と連立方程式側（加減法）の両方に前提を持つ
  assert.deepEqual(E.SKILLS.simGraph.prerequisites, ["simElim", "form", "coord"]);
  assert.equal(E.SKILLS.simGraph.unit, "一次関数");
  assert.ok(E.UNITS["一次関数"].includes("simGraph"));
});

test("問題数：連立方程式は25問すべて再利用＋追加。スキルごとの内訳", () => {
  const reused = Object.values(Q).filter((q) => q.source && q.source.startsWith("study-compass-app:simultaneous-eq-"));
  assert.equal(reused.length, 25);
  reused.forEach((q) => assert.ok(SIM.includes(q.skill), q.id));
  const c = B.count();
  SIM.concat("simGraph").forEach((k) => assert.ok(Object.values(c[k]).reduce((a, b) => a + b, 0) >= 4, k + JSON.stringify(c[k])));
  assert.ok(c.simElim.basic >= 3 && c.simElim.standard >= 3 && c.simElim.application >= 2 && c.simElim.retention >= 3);
});

test("原因さがし①：加減法 × → 係数をそろえる ○ → 移項 × → 正負の数 ○・文字式 ○ → 戻る場所「移項」（一次方程式にした後で解けない）", () => {
  const { trail, asked, c } = run(Q["simElim-standard-4"], { simCoef: true, transpose: false, signed: true, algebra: true });
  assert.deepEqual(asked.map((p) => p.skill), ["simCoef", "transpose", "signed", "algebra"]);
  assert.equal(c.return_to, "transpose");
  assert.equal(c.kind, "gap_found");
  assert.match(R.pathText(trail), /加減法 × → 係数をそろえる ○ → 移項 × → 正負の数 ○ → 文字式への代入 ○/);
});

test("原因さがし②：加減法 × → 係数をそろえる × → 等式の性質 × → 正負の数 ○ → 戻る場所「等式の性質」（係数をそろえられない）", () => {
  const { asked, c } = run(Q["simElim-standard-4"], { simCoef: false, eqProperty: false, signed: true, distrib: true, transpose: true });
  assert.deepEqual(asked.slice(0, 3).map((p) => p.skill), ["simCoef", "eqProperty", "signed"]);
  assert.equal(c.return_to, "eqProperty");
});

test("原因さがし③：係数がそろった加減法の問題は「係数をそろえる」を確かめない（符号・移項だけ）", () => {
  const { asked } = run(Q["simElim-basic-1"], { signed: false, transpose: true });
  assert.ok(!asked.some((p) => p.skill === "simCoef"));
  assert.equal(asked[0].skill, "signed");
});

test("途中の工程：どの小問で止まったかで、原因の候補が変わる（符号ミス／一次方程式にした後）", () => {
  const q = Q["simElim-standard-5"];
  const right = { s1: "a", s2: "1", s3: "2" };
  const sign = L.analyzeSteps(q, L.checkSteps(q, { ...right, s1: "b" })); // 3y − (−y) を 2y にした
  assert.equal(sign.suspected_skill, "simElim");
  const after = L.analyzeSteps(q, L.checkSteps(q, { ...right, s3: "5" }));
  assert.equal(after.suspected_skill, "transpose");
  const coef = Q["simElim-application-3"];
  assert.equal(L.analyzeSteps(coef, L.checkSteps(coef, { s1: "b", s2: "a", s3: "3" })).suspected_skill, "simCoef");
  // 小問ごとの記録：加減法はできていて、移項でまちがえた
  const H = history();
  H.add("simElim-standard-5", ["correct", "correct", "incorrect"]);
  const s = E.computeSkillStates(H.h, { now: T0 + DAY });
  assert.equal(s.simElim.correct_count, 1);
  assert.equal(s.transpose.correct_count, 0);
});

test("2直線の交点 × → グラフ側（グラフ・式・座標）にも戻れる：連立方程式が解けていても、式が読めないなら「グラフ・式」", () => {
  // 記録上、加減法はできている
  const H = history();
  ["simElim-basic-1", "simElim-basic-2", "simElim-standard-1"].forEach((id) => H.add(id, "correct"));
  const states = E.computeSkillStates(H.h, { now: T0 });
  const q = { id: "tmp-simGraph", skill: "simGraph", level: "standard", prerequisite_skills: [] }; // 問題が前提を持たない → 地図の前提
  const { asked, c, trail } = run(q, { form: false, coord: true, slopeIntercept: true, rate: true, substitution: true, transpose: true }, { states });
  assert.equal(asked[0].skill, "form");
  assert.ok(trail.path.some((p) => p.skill === "simElim" && p.via === "history"), "加減法は記録から○");
  assert.equal(c.return_to, "form");
  // グラフ → 式 → 連立方程式 → 交点 の応用は、式の読みとり（s1）で止まればグラフ側
  const app = Q["simGraph-application-1"];
  assert.equal(L.analyzeSteps(app, L.checkSteps(app, { s1: "b", s2: "1.5", s3: { x: "1.5", y: "0.5" } })).suspected_skill, "form");
  assert.equal(L.analyzeSteps(app, L.checkSteps(app, { s1: "a", s2: "3", s3: { x: "3", y: "2" } })).suspected_skill, "simElim");
  assert.ok(L.check(app, { s1: "a", s2: "3/2", s3: { x: "3/2", y: "1/2" } }), "分数でも答えられる");
});

test("未学習の扱い：学校でまだ習っていない連立方程式は「未学習」。まちがえても苦手（要確認）にしない。ほかの単元には影響しない", () => {
  const H = history();
  H.add("simElim-basic-1", "incorrect"); H.add("simElim-basic-2", "incorrect");
  H.add("B4", "incorrect"); H.add("C4", "incorrect");
  const s = E.computeSkillStates(H.h, { now: T0, schoolProgressByUnit: { "連立方程式": "notyet", "一次関数": "learning" }, currentUnit: "連立方程式" });
  assert.equal(s.simElim.learning_status, "not_learned");
  assert.equal(s.simWord.learning_status, "not_learned");
  assert.notEqual(s.rate.learning_status, "not_learned", "一次関数は学習中");
  // 進み具合を答えていない単元は、記録がなければ「まだ」（苦手でも未学習でもない）
  const s2 = E.computeSkillStates([], { now: T0, schoolProgressByUnit: { "一次関数": "learning" } });
  SIM.forEach((k) => assert.equal(s2[k].learning_status, "not_checked", k));
  // 未学習のスキルは定期チェックの対象にしない
  const chk = C.buildCheck({ states: s, history: H.h, sessions: [], now: T0 + 4 * DAY, rng: B.seeded(1) });
  assert.ok(!chk.chosen.some((x) => SIM.includes(x.skill)));
});

test("コンパスチェック：連立方程式のはじめてのチェックは診断用5問。記録ができたら定期チェックの対象になる", () => {
  const u = C.unitCheck("連立方程式");
  assert.equal(u.questions.length, 5);
  u.questions.forEach((id) => assert.equal(E.SKILLS[Q[id].skill].unit, "連立方程式", id));
  assert.ok(u.questions.some((id) => Q[id].type === "steps"), "途中の工程が見える問題を含む");
  const H = history();
  u.questions.forEach((id) => H.add(id, id === "simElim-standard-4" ? "incorrect" : "correct"));
  const now = T0 + 4 * DAY;
  const states = E.computeSkillStates(H.h, { now });
  const chk = C.buildCheck({ states, history: H.h, sessions: [], now, rng: B.seeded(1) });
  assert.ok(chk.chosen.some((x) => x.skill === "simElim"), JSON.stringify(chk.chosen.map((x) => x.skill)));
  // はじめて確かめたスキルは「上がった」「越えた」と言わない
  const before = C.snapshotSkills(E.computeSkillStates([], { now }), ["simMeaning"]);
  const res = C.compare(before, C.snapshotSkills(states, ["simMeaning"]), ["simMeaning"]);
  assert.equal(res.items[0].change, "first");
  assert.equal(res.crossed.length, 0);
});

test("今日の学習：学校が連立方程式・原因が移項 → 移項を補強してから加減法へ。「連立方程式の前に、一次方程式を少し確認しよう」", () => {
  const H = history();
  H.add("simMeaning-basic-2", "correct");
  H.add("simElim-standard-4", "incorrect");
  H.add("simCoef-basic-2", "correct");
  H.add("transpose-basic-2", "incorrect");
  H.add("signed-basic-2", "correct"); H.add("algebra-basic-1", "correct");
  H.add("simElim-standard-5", ["correct", "correct", "incorrect"]);
  H.add("simSubst-basic-1", "correct"); H.add("simWord-basic-1", "correct");
  const now = T0 + 3600e3;
  const school = { current_unit: "連立方程式", school_status: "learning" };
  const expl = [{ date: new Date(T0).toISOString(), symptom: { skill: "simElim", label: "加減法" }, conclusion: { kind: "gap_found", return_to: "transpose" } }];
  const states = E.computeSkillStates(H.h, { now, schoolProgressByUnit: { "連立方程式": "learning" }, currentUnit: "連立方程式" });
  const p = P.build({ states, history: H.h, explorations: expl, school, minutes: 30, now, rng: B.seeded(1) });
  const kinds = p.sessions.map((s) => s.type + ":" + s.skill);
  assert.ok(kinds.includes("practice:transpose"), kinds.join(" "));
  assert.ok(kinds.includes("current_unit:simElim"), kinds.join(" "));
  assert.ok(kinds.indexOf("practice:transpose") < kinds.indexOf("current_unit:simElim"));
  assert.match(p.why, /連立方程式の前に、一次方程式を少し確認しよう/);
  assert.equal(P.backToLine("transpose", "一次関数"), "一次関数の前に、方程式を少し確認しよう。");
  assert.equal(P.backToLine("simElim", "一次関数"), "一次関数の前に、連立方程式を少し確認しよう。");
  assert.equal(P.backToLine("simElim", "連立方程式"), null);
  assert.equal(P.backToLine("signed", "連立方程式"), null, "前の学年の土台では言わない");
});

test("テスト対策：範囲に一次関数と連立方程式を選べる。仕上がりの低いスキルから確かめる", () => {
  assert.deepEqual(TP.RANGE_UNITS, ["連立方程式", "一次関数"]);
  const range = TP.unitSkills("連立方程式").concat(TP.unitSkills("一次関数"));
  const H = history();
  H.add("simElim-basic-1", "incorrect"); H.add("simElim-basic-2", "incorrect");
  ["B1", "B2", "B3", "B4", "B5"].forEach((id) => H.add(id, "correct"));
  const states = E.computeSkillStates(H.h, { now: T0 });
  const ready = TP.readiness(states, range, T0);
  assert.equal(ready.find((r) => r.skill === "simElim").mark, "△");
  // 範囲チェックは上限6問。△（加減法）や ？（まだ確かめていない）を、○ より先に入れる
  const rc = TP.rangeCheck({ states, history: H.h, now: T0 + DAY, rng: B.seeded(1) }, range);
  assert.ok(rc.chosen.length <= TP.CONFIG.RANGE_CHECK_MAX);
  assert.ok(rc.chosen.some((x) => x.skill === "simElim"));
  // 計画：仕上がりの低い加減法に日が割り当てられる
  const sch = TP.schedule({ test_date: TP.dateKey(T0 + 7 * DAY), range_skills: range }, states, T0, { rangeCheckedToday: true });
  assert.ok(sch.days.some((d) => d.kind === "focus" && d.skills.includes("simElim")));
  // テストモードの今日の学習は範囲の中だけ
  const focus = sch.days[0].skills;
  const p = P.build({ states, history: H.h, explorations: [], school: { current_unit: "連立方程式", school_status: "learning" }, minutes: 30, now: T0 + DAY, rng: B.seeded(1),
    test: { range, focus, kind: "focus", days_left: 7 } });
  p.sessions.forEach((s) => assert.ok(range.includes(s.skill), s.skill));
});
