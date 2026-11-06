// node --test tests/*.test.js — 中1 文字と式：答えを式の計算で確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass, L = SC.logic;
const SK = ["litExpr", "litValue", "litCalc", "litWord", "litRel"];
const all = Object.values(Q).filter((q) => q.unit === "文字と式");

// 「−2ab」「(a + b)/3」「x²y/2」のような式を JavaScript の式にする（bank.js とは別の読み方）
function toJS(src) {
  return src.replace(/\s/g, "").replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/")
    .replace(/²/g, "**2").replace(/³/g, "**3").replace(/⁴/g, "**4")
    .replace(/([0-9a-z)])(?=[a-z(])/g, "$1*").replace(/([a-z])(?=\d)/g, "$1*")
    .replace(/(^|[(+])-([a-z]\*\*\d)/g, "$1-($2)");
}
const VARS = ["a", "b", "m", "n", "p", "q", "x", "y"];
const run = (src, env) => Function(...VARS, "return " + toJS(src))(...VARS.map((v) => env[v]));
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const SAMPLES = [{ a: 2, b: 3, m: 5, n: 7, p: 2, q: 11, x: 3, y: 4 }, { a: -3, b: 5, m: 2, n: -4, p: 3, q: 1, x: -2, y: 7 }];

test("表し方の問題：正解の式だけが、もとの式と同じ値になる", () => {
  const list = all.filter((q) => q.skill === "litExpr" && / を、× や ÷ の記号を使わずに表すと？$/.test(q.text));
  assert.ok(list.length >= 14, "確かめた数 " + list.length);
  list.forEach((q) => {
    const src = q.text.replace(/ を、× や ÷ の記号を使わずに表すと？$/, "");
    q.choices.forEach((c) => {
      if (/[a-z]\d/.test(c.label)) return assert.notEqual(c.key, q.answer, q.id + " 数は文字の前に書く"); // a3 は値が同じでも書き方の誤り
      const same = SAMPLES.every((e) => Math.abs(run(src, e) - run(c.label, e)) < 1e-9);
      assert.equal(same, c.key === q.answer, q.id + " " + c.label);
    });
  });
});

test("「○ のとき、… の値はいくつ？」は、式を計算した値と一致する", () => {
  const list = all.filter((q) => q.skill === "litValue" && q.type === "number");
  assert.ok(list.length >= 15);
  list.forEach((q) => {
    const [, cond, expr] = q.text.match(/^(.+) のとき、(.+) の値はいくつ？$/);
    const env = {};
    cond.split("、").forEach((c) => { const [k, v] = c.split(" = "); env[k] = Number(v.replace("−", "-")); });
    near(run(expr, env), q.answer, q.id);
  });
});

test("一次式の計算：もとの式と答えの式が、どの値でも等しい。答えの形が読める", () => {
  const list = all.filter((q) => q.type === "poly");
  assert.ok(list.length >= 15);
  list.forEach((q) => {
    const src = q.text.replace(" を計算しましょう。", "");
    SAMPLES.forEach((e) => near(run(src, e), run(q.answer, e), q.id));
    assert.ok(L.check(q, q.answer), q.id);
    assert.ok(L.check(q, L.polyText(q.answer)), q.id + " 表示の形でも正解になる");
  });
});

const EXPECT = {
  "litExpr-application-1#s2": 3 * 100 + 2 * 150, "litExpr-application-2#s3": 3 * 5, "litExpr-application-3#s2": (2 * 2 * 3) / 2, "litExpr-application-3#s3": (4 * 4 * 1) / 2,
  "litValue-application-1#s1": 4 * 6, "litValue-application-1#s2": 6 * 6, "litValue-application-1#s3": 40 / 4,
  "litValue-application-2#s1": 20 - 6 * 2, "litValue-application-2#s2": 20 - 6 * 3, "litValue-application-2#s3": 20 - 6 * 5,
  "litValue-application-3#s1": (-2) ** 2, "litValue-application-3#s2": (-2) ** 3, "litValue-application-3#s3": (-2) ** 2 + (-2) ** 3,
  "litCalc-application-1#s3": (2 * 2 + 1) - (3 * 2 - 4), "litCalc-application-2#s2": 2 * (2 + 2 + 3), "litCalc-application-2#s3": (30 - 6) / 4, "litCalc-application-3#s2": 4 * 100 + 3 * 120,
  "litWord-application-1#s2": 0.9 * 200, "litWord-application-1#s3": 0.9 * 200 * 5, "litWord-application-2#s3": 12 / 4 + 12 / 6, "litWord-application-3#s3": 73 - 37,
  "litRel-application-1#s3": 4 * 150 + 120, "litRel-application-2#s2": 3 * 10 + 5, "litRel-application-3#s2": 30 / 2 - 6, "litRel-application-3#s3": 6 * (30 / 2 - 6)
};

test("応用の数の小問は、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    near(Q[id].steps.find((s) => s.id === st).answer, want, key);
  });
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number").forEach((s) => assert.ok(q.id + "#" + s.id in EXPECT, q.id + "#" + s.id + " を確かめていない")));
});

test("応用の式の小問：場面の式と答えの式が等しい", () => {
  const st = (id, s) => Q[id].steps.find((x) => x.id === s).answer;
  [1, -2, 5].forEach((x) => {
    near(run(st("litCalc-application-1", "s1"), { x }), (2 * x + 1) + (3 * x - 4));
    near(run(st("litCalc-application-1", "s2"), { x }), (2 * x + 1) - (3 * x - 4));
    near(run(st("litCalc-application-2", "s1"), { x }), 2 * (x + x + 3));
    near(run(st("litCalc-application-3", "s1"), { x }), 4 * x + 3 * (x + 20));
    near(run(st("litCalc-application-3", "s3"), { x }), x + x + 20);
  });
});

test("文字と式の単元：正負の数の次・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学1年"].slice(0, 3), ["正負の数", "文字と式", "一次方程式"]);
  assert.deepEqual(E.UNITS["文字と式"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck("文字と式").questions.length, 5);
});
