// node --test tests/*.test.js — 学習マップの拡張（中1 一次方程式）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, R = SC.rootcause, Q = SC.QUESTIONS, B = SC.bank, P = SC.planner;
const T0 = Date.parse("2026-10-01T07:00:00Z");
const EQ = ["eqMeaning", "eqProperty", "transpose", "eqParen", "eqFraction", "eqWord"];

// 子どもの「本当の理解」を決めて、道すじを最後までたどる
function run(question, knows, opts = {}) {
  const trail = R.start({ question, now: T0 });
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

test("一次方程式のスキル：すべて地図にあり、前提は地図の中にある（循環なし）", () => {
  EQ.concat("distrib").forEach((k) => {
    assert.ok(E.SKILLS[k], k);
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.SKILLS[p], k + " の前提 " + p));
  });
  // ROOT_ORDER は前提が先に来る順になっている
  E.ROOT_ORDER.forEach((k, i) => E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < i, k + " より前に " + p)));
  assert.deepEqual([...E.ROOT_ORDER].sort(), [...E.SKILL_ORDER].sort());
});

test("一次関数から一次方程式へつながる（式への代入・グラフ式 → 移項）", () => {
  assert.ok(E.SKILLS.substitution.prerequisites.includes("transpose"));
  assert.ok(E.SKILLS.form.prerequisites.includes("transpose"));
  ["S2", "form-standard-1", "substitution-standard-1"].forEach((id) => assert.ok(Q[id].prerequisite_skills.includes("transpose"), id));
  assert.ok(!Q.B5.prerequisite_skills.includes("transpose"), "傾きと切片から式を書くだけの問題には付けない");
  // 2x + y = 5 を y = ax + b の形にする問題は「等式の変形」（その前提に移項）
  assert.ok(Q["slopeIntercept-standard-2"].prerequisite_skills.includes("eqTransform"));
  assert.ok(E.SKILLS.eqTransform.prerequisites.includes("transpose"));
});

test("study-compass-app の一次方程式20問をすべて再利用し、スキルとレベルを付けた", () => {
  const src = Object.values(Q).filter((q) => q.source && q.source.startsWith("study-compass-app:linear-eq-"));
  assert.equal(src.length, 20);
  assert.equal(new Set(src.map((q) => q.source)).size, 20);
  src.forEach((q) => { assert.ok(EQ.includes(q.skill), q.id); assert.ok(B.LEVELS.includes(q.level)); });
  EQ.forEach((k) => assert.ok(Object.values(B.index[k]).flat().length >= 4, k + " は4問以上"));
});

test("原因さがしの例：グラフから式 × → 変化の割合 ○ → 座標 ○ → 移項 × → 正負の数 ○・文字式 ○・同類項 ○ → 戻る場所「移項」", () => {
  const { trail, asked, c } = run(Q["form-standard-5"], { rate: true, coord: true, transpose: false, signed: true, algebra: true, likeTerms: true }, { budget: 8 });
  assert.deepEqual(asked.map((p) => p.skill), ["rate", "coord", "transpose", "signed", "algebra", "likeTerms"]);
  assert.equal(c.return_to, "transpose");
  assert.equal(c.kind, "gap_found");
  assert.deepEqual(c.solid_skills.sort(), ["algebra", "likeTerms", "signed"]);
  assert.match(c.message, /「移項」の理解が、まだ少し不安定な可能性があります/);
  assert.match(R.pathText(trail), /グラフ・式 × → 変化の割合 ○ → 座標 ○ → 移項 × → 正負の数 ○ → 文字式への代入 ○ → 同類項をまとめる ○/);
});

test("さらに深く：移項 × → 正負の数 × なら、土台の「正負の数」まで戻る", () => {
  const { c } = run(Q["form-standard-5"], { rate: true, coord: true, transpose: false, signed: false });
  assert.equal(c.return_to, "signed");
});

test("y から x を求める問題でまちがえたら、移項までさかのぼる", () => {
  const { asked, c } = run(Q["substitution-standard-1"], { algebra: true, transpose: false, signed: true, likeTerms: true });
  assert.ok(asked.some((p) => p.skill === "transpose"));
  assert.equal(c.return_to, "transpose");
});

test("未学習・未確認の扱い：一次方程式に記録がなければ「まだ」で、苦手（要確認）にしない。中1なので「未学習」にもしない", () => {
  const h = [E.makeAnswerRecord(Q.B4, { status: "incorrect" }, { userId: "u", now: T0 })];
  const s = E.computeSkillStates(h, { schoolProgress: "notyet" });
  EQ.forEach((k) => assert.equal(s[k].learning_status, "not_checked", k));
  assert.equal(s.rate.learning_status, "not_learned", "学校でまだ習っていないのは、いまの単元（一次関数）だけ");
});

test("今日の学習：根元が一次方程式なら「一次関数の前に、方程式を少し確認しよう」", () => {
  const h = [];
  let n = 0;
  const add = (id, st) => h.push(E.makeAnswerRecord(Q[id], { status: st }, { userId: "u", now: T0 + (++n) * 1000 }));
  ["B1", "B2", "B3", "B4", "C4"].forEach((id) => add(id, "correct"));
  add("form-standard-5", "incorrect"); add("transpose-basic-2", "incorrect"); add("transpose-basic-3", "incorrect");
  const now = T0 + 3600e3;
  const expl = [{ date: new Date(T0).toISOString(), symptom: { skill: "form", label: "グラフ・式" }, conclusion: { kind: "gap_found", return_to: "transpose" } }];
  const p = P.build({ states: E.computeSkillStates(h, { now }), history: h, explorations: expl, school: { current_unit: "一次関数", school_status: "learning" }, minutes: 30, now, rng: B.seeded(1) });
  const pr = p.sessions.find((s) => s.type === "practice");
  assert.equal(pr.skill, "transpose");
  assert.match(p.why, /一次関数の前に、方程式を少し確認しよう/);
});
