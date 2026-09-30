// node --test tests/*.test.js — Phase 4 つまずき原因探索エンジン
const test = require("node:test");
const assert = require("node:assert/strict");
require("../js/questions.js");
require("../js/logic.js");
require("../js/engine.js");
require("../js/bank.js");
require("../js/compass.js");
require("../js/rootcause.js");
const { SC } = globalThis;
const R = SC.rootcause, E = SC.engine, Q = SC.QUESTIONS;
const T0 = Date.parse("2026-10-01T07:00:00Z");

// 子どもの「本当の理解」を決めておき、道すじを最後までたどる小さなシミュレーター
// knows: { スキル: true/false }。確かめる問題には、そのスキルを知っていれば正解する
function run(question, knows, opts = {}) {
  const trail = R.start({ question, skill: opts.skill, seeds: opts.seeds, now: T0 });
  let budget = opts.budget ?? 5;
  const asked = [];
  const used = [question.id];
  for (let guard = 0; guard < 20; guard++) {
    const p = R.next(trail, {
      states: opts.states || {}, now: T0, budgetLeft: budget,
      pickQuestion: (skill) => {
        const q = SC.bank.pick(skill, "basic", { exclude: used, rng: SC.bank.seeded(1) }) || SC.bank.pick(skill, "retention", { exclude: used, rng: SC.bank.seeded(1) });
        return q ? q.id : null;
      }
    });
    if (!p) break;
    used.push(p.question_id);
    if (!p.seed) budget--;
    asked.push(p);
    R.answer(trail, p, !!knows[p.skill]);
  }
  return { trail, asked, c: trail.conclusion };
}

test("仕様の例：グラフから式× → 変化の割合× → 変化量× → 原因候補「変化量」（正負の数はできている）", () => {
  const q = Q["form-basic-2"]; // 表から式（前提：変化の割合、傾き・切片）
  const { trail, asked, c } = run(q, { rate: false, change: false, signed: true, slopeIntercept: true });
  assert.deepEqual(asked.map((p) => p.skill), ["rate", "change", "signed"], "変化の割合 → 変化量 → 正負の数 とさかのぼる");
  assert.equal(c.kind, "gap_found");
  assert.equal(c.return_to, "change");
  assert.deepEqual(c.solid_skills, ["signed"]);
  assert.match(c.message, /「変化量」の理解が、まだ少し不安定な可能性があります/);
  assert.match(c.message, /「正負の数」はできているので/);
  assert.match(R.pathText(trail), /グラフ・式 × → 変化の割合 × → 変化量 × → 正負の数 ○/);
});

test("前提がすべてできていれば、スキルそのもの（つなげるところ）を練習する", () => {
  const q = Q.B4; // 変化の割合（前提：変化量）
  const { c, asked } = run(q, { change: true });
  assert.deepEqual(asked.map((p) => p.skill), ["change"]);
  assert.equal(c.kind, "in_skill");
  assert.equal(c.return_to, "rate");
  assert.match(c.message, /「変化量」はできています/);
});

test("一番の土台までまちがえたら、土台から", () => {
  const { c } = run(Q.B4, { change: false, signed: false });
  assert.equal(c.kind, "root");
  assert.equal(c.return_to, "signed");
});

test("記録で「できている」前提は、問題を出さずに飛ばす", () => {
  const states = E.computeSkillStates([
    E.makeAnswerRecord(Q.B3, { status: "correct" }, { userId: "u", now: T0 - 1000 }),
    E.makeAnswerRecord(Q.B1, { status: "correct" }, { userId: "u", now: T0 - 1000 }),
    E.makeAnswerRecord(Q.B4, { status: "correct" }, { userId: "u", now: T0 - 1000 })
  ], { now: T0 });
  // B5（グラフ・式）：C5（傾き・切片）は先に決まっている原因確認。他の前提は記録からできている
  const { trail, asked, c } = run(Q.B5, { slopeIntercept: true }, { seeds: ["C5"], states });
  assert.deepEqual(asked.map((p) => p.question_id), ["C5"], "記録でできている 変化の割合・式への代入・座標 には問題を出さない");
  assert.ok(trail.path.some((p) => p.via === "history" && p.skill === "rate"));
  assert.equal(c.kind, "in_skill");
  assert.match(c.message, /「傾き・切片」/);
});

test("同じスキルを別の問題で確かめてできたら、うっかりの可能性として深追いしない", () => {
  const { c, asked } = run(Q.B2, { proportion: true }, { seeds: ["C3"] });
  assert.equal(asked.length, 1);
  assert.equal(c.kind, "not_reproduced");
  assert.equal(c.return_to, null);
});

test("問題数の上限で止まったら「まだ確かめきれていない」として、次のチェックに回す", () => {
  const { c } = run(Q["form-basic-2"], { rate: false, change: false }, { budget: 2 });
  assert.equal(c.kind, "undetermined");
  assert.deepEqual(c.pending_skills, ["signed"]);
  assert.match(c.message, /次のコンパスチェックで確認します/);
});

test("応用問題は、止まった小問のスキルからさかのぼる", () => {
  const q = Q["rate-application-2"];
  const res = SC.logic.checkSteps(q, { s1: "6", s2: "y=6x", s3: "12" });
  const a = SC.logic.analyzeSteps(q, res);
  const { trail } = run(q, { rate: true, slopeIntercept: true }, { skill: a.suspected_skill });
  assert.equal(trail.symptom.skill, "form");
  assert.equal(trail.path[1].skill, "slopeIntercept", "グラフ・式の前提から確かめる");
});

test("どの結論も断定しない（「原因です」「苦手です」と言わない）", () => {
  const cases = [
    run(Q["form-basic-2"], { rate: false, change: false, signed: true }),
    run(Q.B4, { change: true }), run(Q.B4, { change: false, signed: false }),
    run(Q.B2, { proportion: true }, { seeds: ["C3"] }), run(Q["form-basic-2"], {}, { budget: 1 })
  ];
  cases.forEach(({ c }) => {
    assert.doesNotMatch(c.message, /原因です|苦手です|できません/);
    assert.ok(c.kind === "not_reproduced" || c.kind === "in_skill" || /可能性|途中|確認します/.test(c.message), c.message);
  });
});

test("同じ道すじで同じスキル・同じ問題を2回確かめない。深さの上限を守る", () => {
  const { trail, asked } = run(Q["form-standard-2"], {}, { budget: 10 });
  const skills = asked.map((p) => p.skill);
  assert.equal(new Set(skills).size, skills.length);
  assert.equal(new Set(asked.map((p) => p.question_id)).size, asked.length);
  assert.ok(Math.max(...trail.path.map((p) => p.depth)) <= R.CONFIG.MAX_DEPTH);
});

test("同じチェックの中ですでにわかっている結果は、問題を出さずに使う（同じことを2回きかない）", () => {
  // B4（変化の割合）× と C4（変化量）× がすでにわかっている状態で、グラフ・式（B5）の原因をさがす
  const known = { rate: false, change: false };
  const trail = R.start({ question: Q.B5, seeds: ["C5"], now: T0 });
  const seeds = R.takeSeeds(trail);
  R.answer(trail, seeds[0], true); // C5（傾き・切片）○
  const asked = [];
  const ctx = { states: {}, now: T0, budgetLeft: 3, known, pickQuestion: (s) => (asked.push(s), SC.bank.pick(s, "basic", { rng: SC.bank.seeded(1) }).id) };
  const p = R.next(trail, ctx);
  assert.equal(p.skill, "signed", "変化の割合・変化量は今回の答えを使い、その前の正負の数だけを問題で確かめる");
  assert.deepEqual(asked, ["signed"]);
  assert.ok(trail.path.some((x) => x.skill === "rate" && x.via === "session" && !x.correct));
  R.answer(trail, p, true);
  assert.equal(R.next(trail, ctx), null);
  assert.equal(trail.conclusion.return_to, "change");
  assert.equal(trail.conclusion.kind, "gap_found");
});

test("いくつかの道すじから、いちばん根元の戻る場所を選ぶ", () => {
  const a = run(Q.B4, { change: false, signed: true }).trail;   // 戻る場所：変化量
  const b = run(Q.B5, { slopeIntercept: true, rate: true, substitution: true, coord: true }).trail; // グラフ・式
  assert.equal(R.deepestReturn([b, a]).conclusion.return_to, "change");
});
