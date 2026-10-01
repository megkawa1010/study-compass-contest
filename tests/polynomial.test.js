// node --test tests/*.test.js — 学習マップの拡張（中2 式の計算）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, R = SC.rootcause, Q = SC.QUESTIONS, B = SC.bank, P = SC.planner, C = SC.compass, L = SC.logic;
const T0 = Date.parse("2026-10-01T07:00:00Z");
const POLY = ["polyAddSub", "polyMixed", "monoMulDiv", "eqTransform"];

function run(question, knows, opts = {}) {
  const trail = R.start({ question, skill: opts.skill, now: T0 });
  let budget = opts.budget ?? 8;
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

test("式の計算のスキル：単元と前提。直線ではなく、一次方程式・連立方程式・一次関数の別々の所につながる", () => {
  assert.deepEqual(E.UNITS["式の計算"], POLY);
  POLY.forEach((k) => assert.equal(E.SKILLS[k].unit, "式の計算"));
  // 同類項は中1の土台（一次方程式の前提なので、中2の単元には入れない）。分配法則は既存を再利用
  assert.equal(E.SKILLS.likeTerms.unit, "既習");
  assert.equal(E.SKILLS.distrib.unit, "既習");
  assert.ok(!E.SKILL_ORDER.some((k) => /^(exprValue|polyDistrib)/.test(k)), "式の値・文字2つの分配法則を別スキルにしない");
  // つながり
  assert.ok(E.SKILLS.transpose.prerequisites.includes("likeTerms"), "移項 → 同類項");
  assert.equal(E.SKILLS.simElim.prerequisites[0], "polyAddSub", "加減法の主前提は 多項式の加法・減法");
  assert.deepEqual(E.SKILLS.polyAddSub.prerequisites, ["likeTerms", "signed"]);
  assert.equal(E.SKILLS.simCoef.prerequisites[0], "distrib", "係数をそろえる → 分配法則");
  assert.ok(E.SKILLS.simParen.prerequisites.includes("polyMixed"));
  assert.ok(E.SKILLS.eqTransform.prerequisites.includes("transpose"));
  assert.ok(Q["slopeIntercept-standard-2"].prerequisite_skills.includes("eqTransform"), "一次関数：2x + y = 5 → y = …");
  // 単項式の乗除は、いまの地図では何の前提にもならない
  assert.ok(!E.SKILL_ORDER.some((k) => E.SKILLS[k].prerequisites.includes("monoMulDiv")));
  // 前提が先に来る順
  E.ROOT_ORDER.forEach((k, i) => E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < i, k + " より前に " + p)));
});

test("旧アプリの式の計算18問をすべて再利用", () => {
  const src = Object.values(Q).filter((q) => q.source && q.source.startsWith("study-compass-app:polynomial-calc-"));
  assert.equal(new Set(src.map((q) => q.source)).size, 18);
  src.forEach((q) => assert.ok(POLY.concat("likeTerms").includes(q.skill), q.id));
  // 足したのは 等式の変形・同類項の定着・文字2つの分配法則・整理してから代入
  assert.ok(Object.values(B.index.eqTransform).flat().length >= 5);
  assert.ok(B.index.likeTerms.retention.length >= 2);
  assert.ok(B.index.distrib.basic.some((id) => Q[id].type === "poly"));
  assert.ok(B.index.polyMixed.application.every((id) => Q[id].steps.some((s) => s.skill === "algebra")), "整理してから代入は「文字式への代入」を再利用");
});

test("文字式の答え：項の順番・かけ算の順・2乗の書き方がちがっても同じ式とみなす", () => {
  const ok = (a, v) => L.check({ type: "poly", answer: a }, v);
  assert.ok(ok("7x+2y", "2y + 7x"));
  assert.ok(ok("-10xy", "−10yx"));
  assert.ok(ok("6x^2", "6x²"));
  assert.ok(ok("12x^3y", "12yx^3"));
  assert.ok(ok("-2y+6", "x = −2y + 6"));
  assert.ok(!ok("3a+2b", "3a+2"));
  assert.ok(!ok("5a", "5"));
  assert.ok(!ok("2x", "2x+"), "符号だけ残っている式は読まない");
  assert.equal(L.polyText("-3x+y-2"), "−3x + y − 2");
});

test("原因さがし：加減法 → 多項式の加法・減法 → 同類項 → 正負の数", () => {
  const { trail, c } = run(Q["simElim-basic-2"], { polyAddSub: false, likeTerms: false, signed: true, transpose: true });
  assert.equal(c.return_to, "likeTerms");
  assert.match(R.pathText(trail), /加減法 × → 多項式の加法・減法 × → 同類項をまとめる × → 正負の数 ○/);
});

test("原因さがし：かっこを含む連立方程式 → かっこを含む式の計算 → 分配法則／多項式の加減", () => {
  const { asked, c } = run(Q["simParen-basic-1"], { polyMixed: false, distrib: true, polyAddSub: false, likeTerms: true, signed: true, simElim: true });
  assert.deepEqual(asked.slice(0, 3).map((p) => p.skill), ["polyMixed", "distrib", "polyAddSub"]);
  assert.equal(c.return_to, "polyAddSub");
});

test("原因さがし：両辺に x がある一次方程式 → 移項 ○ でも 同類項 × なら「同類項をまとめる」へ", () => {
  const { asked, c } = run(Q["transpose-standard-3"], { signed: true, likeTerms: false, eqProperty: true });
  assert.ok(asked.some((p) => p.skill === "likeTerms"));
  assert.equal(c.return_to, "likeTerms");
});

test("原因さがし：一次関数の「y = の形にする」→ 等式の変形 → 等式の性質 ○ → 移項 ×", () => {
  const { trail, c } = run(Q["slopeIntercept-standard-2"], { proportion: true, eqTransform: false, eqProperty: true, transpose: false, signed: true, algebra: true, likeTerms: true });
  assert.equal(c.return_to, "transpose");
  assert.match(R.pathText(trail), /傾き・切片 × → 比例 ○ → 等式の変形 × → 等式の性質 ○ → 移項 ×/);
});

test("はじめてのチェック・未学習・今日の学習のひとこと", () => {
  const u = C.unitCheck("式の計算");
  assert.equal(u.questions.length, 5);
  u.questions.forEach((id) => assert.equal(E.SKILLS[Q[id].skill].unit, "式の計算", id));
  // 学校でまだ習っていない式の計算は「未学習」。中1の土台（同類項・分配法則）は影響を受けない
  const h = [E.makeAnswerRecord(Q["polyAddSub-basic-1"], { status: "incorrect" }, { userId: "u", now: T0 }),
    E.makeAnswerRecord(Q["likeTerms-basic-1"], { status: "incorrect" }, { userId: "u", now: T0 + 1000 })];
  const s = E.computeSkillStates(h, { now: T0, schoolProgressByUnit: { "式の計算": "notyet" } });
  assert.equal(s.polyAddSub.learning_status, "not_learned");
  assert.equal(s.likeTerms.learning_status, "needs_review");
  // 連立方程式を学習中で、戻る場所が式の計算
  assert.equal(P.backToLine("polyAddSub", "連立方程式"), "連立方程式の前に、式の計算を少し確認しよう。");
  assert.equal(P.backToLine("distrib", "式の計算"), null, "式の計算の中では、分配法則は単元の土台");
  assert.equal(P.backToLine("transpose", "式の計算"), "式の計算の前に、一次方程式を少し確認しよう。");
});

test("追加4問の上限：加減法 → 係数 ○ → 多項式の加減 ○ → 移項 × → 正負の数 ○ で上限。文字式・同類項は次回のチェックで最優先", () => {
  const budget = R.CONFIG.BUDGET_INITIAL;
  assert.equal(budget, 4);
  const { trail, asked, c } = run(Q["simElim-standard-4"], { simCoef: true, polyAddSub: true, transpose: false, signed: true }, { budget });
  assert.deepEqual(asked.map((p) => p.skill), ["simCoef", "polyAddSub", "transpose", "signed"]);
  assert.equal(c.return_to, "transpose");
  assert.equal(c.kind, "undetermined");
  assert.deepEqual(c.pending_skills.sort(), ["algebra", "likeTerms"]);
  // 次の定期チェック：記録の発生条件に関係なく、持ち越したスキルを P0（前回の原因さがしの続き）で出す
  const expl = [{ ...JSON.parse(JSON.stringify(trail)), date: new Date(T0).toISOString() }];
  const chk = C.buildCheck({ states: E.computeSkillStates([], { now: T0 + 864e5 }), history: [], sessions: [], explorations: expl, now: T0 + 864e5, rng: B.seeded(1) });
  const p0 = chk.candidates.filter((x) => x.priority === 0).map((x) => x.skill).sort();
  assert.deepEqual(p0, ["algebra", "likeTerms"]);
  assert.ok(chk.chosen.some((x) => x.skill === "likeTerms"));
});

test("多項式の加法・減法：基礎と定着は5問以上・形がばらばら（数字だけ変えた問題に偏らない）", () => {
  assert.ok(B.index.polyAddSub.basic.length >= 5);
  assert.ok(B.index.polyAddSub.retention.length >= 5);
  const types = new Set(B.index.polyAddSub.basic.concat(B.index.polyAddSub.retention).map((id) => Q[id].type));
  assert.ok(types.has("choice") && types.has("poly"));
});

test("等式の変形：基礎5問以上・標準5問以上。整理する力と等式の性質を使う力を小問で分ける", () => {
  assert.ok(B.index.eqTransform.basic.length >= 5, "基礎 " + B.index.eqTransform.basic.length);
  assert.ok(B.index.eqTransform.standard.length >= 5, "標準 " + B.index.eqTransform.standard.length);
  assert.deepEqual(E.SKILLS.eqTransform.prerequisites[0], "eqProperty", "等式の変形 → 等式の性質 が最初");
  // かっこ → y の項を残す → 両辺をわる：どの小問で止まったかで、計算（分配法則）／変形の理解／等式の性質 を分ける
  const q = Q["eqTransform-standard-4"];
  const right = { s1: "2y-2x", s2: "a", s3: "y=x+3" };
  assert.ok(L.check(q, right));
  assert.equal(L.analyzeSteps(q, L.checkSteps(q, { ...right, s1: "2y-x" })).suspected_skill, "distrib");
  assert.equal(L.analyzeSteps(q, L.checkSteps(q, { ...right, s2: "b" })).suspected_skill, "eqTransform");
  assert.equal(L.analyzeSteps(q, L.checkSteps(q, { ...right, s3: "y=2x+6" })).suspected_skill, "eqProperty");
  // x について解く：y/2 + 2 でも 1/2y + 2 でも正解
  assert.ok(L.check(Q["eqTransform-standard-5"], "y/2 + 2"));
  assert.ok(L.check(Q["eqTransform-standard-5"], "x = 1/2y + 2"));
});

test("原因さがし：等式の変形 × → 等式の性質 × → 正負の数 ○（両辺をわる問題）", () => {
  const { trail, c } = run(Q["eqTransform-basic-5"], { eqProperty: false, distrib: true, signed: true });
  assert.equal(c.return_to, "eqProperty");
  assert.match(R.pathText(trail), /等式の変形 × → 等式の性質 × → 正負の数 ○/);
});

test("一次関数（傾き・切片・グラフ・式・2直線の交点）から等式の変形へ戻れる", () => {
  ["slopeIntercept-standard-2", "slopeIntercept-standard-6", "form-standard-6", "simGraph-standard-3"].forEach((id) =>
    assert.ok(Q[id].prerequisite_skills.includes("eqTransform"), id));
  const { c } = run(Q["form-standard-6"], { eqTransform: false, slopeIntercept: true, eqProperty: true, transpose: true, likeTerms: true });
  assert.equal(c.return_to, "eqTransform");
  const g = Q["simGraph-standard-3"];
  assert.equal(L.analyzeSteps(g, L.checkSteps(g, { s1: "b", s2: { x: "2", y: "3" } })).suspected_skill, "eqTransform");
});
