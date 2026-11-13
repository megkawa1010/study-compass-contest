// node --test tests/*.test.js — 中3 多項式：展開・因数分解を式の値で確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass, L = SC.logic;
const SK = ["pxExpand", "pxFormula", "pxCommon", "pxFactor", "pxUse"];
const all = Object.values(Q).filter((q) => q.unit === "多項式");
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-6, (m || "") + " " + a + " と " + b);
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;

// 「(2x + 3)²」「6a² − 15a」「x^2+5x+6」などを JavaScript の式にする（bank.js とは別の読み方）
function toJS(src) {
  return src.replace(/\s/g, "").replace(/−/g, "-").replace(/÷([0-9a-zA-Z]+)/g, "/($1)").replace(/\^/g, "")
    .replace(/²/g, "^2").replace(/³/g, "^3").replace(/([a-zA-Z)])(\d)/g, "$1^$2").replace(/\^/g, "**")
    .replace(/([0-9a-zA-Z)])(?=[a-zA-Z(])/g, "$1*")
    .replace(/(^|[(+\-*/])-([0-9.]*\*?[a-zA-Z]\*\*\d)/g, "$1-($2)")
    .replace(/(^|[(+])-([a-zA-Z(][^+\-]*?\*\*\d)/g, "$1-($2)");
}
const VARS = ["a", "b", "m", "n", "p", "q", "r", "x", "y", "c", "M"];
const run = (src, env) => Function(...VARS, "return " + toJS(src))(...VARS.map((v) => env[v]));
const SAMPLES = [{ a: 2, b: 3, m: 5, n: 7, p: 2, q: 11, r: 4, x: 3, y: 4, c: 6, M: 5 }, { a: -3, b: 5, m: 2, n: -4, p: 3, q: 1, r: -2, x: -2, y: 7, c: -1, M: -3 }, { a: 1.5, b: -2, m: -1, n: 3, p: -4, q: 2, r: 5, x: 0.5, y: -3, c: 2, M: 7 }];
const same = (s, t) => SAMPLES.every((e) => Math.abs(run(s, e) - run(t, e)) < 1e-6);

test("計算の問題：もとの式と答えの式が、どの値でも等しい。答えの形が読める", () => {
  const list = all.filter((q) => q.type === "poly");
  assert.ok(list.length >= 20, "確かめた数 " + list.length);
  list.forEach((q) => {
    assert.ok(same(q.text.replace(" を計算しましょう。", ""), q.answer), q.id);
    assert.ok(L.check(q, q.answer) && L.check(q, L.polyText(q.answer)), q.id + " 答えの形");
  });
});

test("因数分解の問題：正解だけが、もとの式と同じ式になる", () => {
  let n = 0;
  all.filter((q) => q.choices && / を因数分解すると？$/.test(q.text)).forEach((q) => {
    const src = q.text.replace(" を因数分解すると？", "");
    q.choices.forEach((c) => assert.equal(same(src, c.label), c.key === q.answer, q.id + " " + c.label));
    n++;
  });
  assert.ok(n >= 22, "確かめた数 " + n);
  // 共通因数をすべてくくる問題は、どれも同じ式で、正解だけかっこの中に共通因数が残らない
  const q = Q["pxCommon-standard-5"];
  q.choices.forEach((c) => assert.ok(same("8x² + 12x", c.label), c.label));
  assert.equal(label(q), "4x(2x + 3)");
  assert.ok(same("x² + 2ax + a²", label(Q["pxFormula-basic-7"])));
  Q["pxFormula-basic-7"].choices.filter((c) => c.key !== Q["pxFormula-basic-7"].answer).forEach((c) => assert.ok(!same("(x + a)²", c.label), c.label));
  assert.ok(same("(2n − 1)(2n + 1)", label(Q["pxUse-basic-7"])));
});

test("応用の小問：式の小問と選ぶ小問が、場面の式と一致する", () => {
  const P = {
    "pxExpand-application-1#s1": "(x + 3)(2x + 1)", "pxExpand-application-1#s3": "2((x + 3) + (2x + 1))",
    "pxExpand-application-2#s1": "(2x + 3)(x − 4)", "pxExpand-application-2#s3": "(2x + 3)(x − 4) − 2x²",
    "pxExpand-application-3#s1": "5x + 2x", "pxExpand-application-3#s3": "(x + 2)(x + 5)",
    "pxFormula-application-1#s1": "(x + 3)(x − 3)", "pxFormula-application-2#s3": "(x + 5)²",
    "pxFormula-application-3#s1": "(a + 2)²", "pxFormula-application-3#s3": "(a + 2)² − a²",
    "pxCommon-application-2#s1": "(3x² + 6x) / (3x)",
    "pxFactor-application-4#s2": "(x² + 10x + 25) / (x + 5)", "pxFactor-application-5#s2": "(x² + 7x + 12) / (x + 3)",
    "pxUse-application-2#s1": "a + 2", "pxUse-application-2#s2": "(a + 2)² − a²"
  };
  Object.entries(P).forEach(([k, src]) => { const [id, s] = k.split("#"); assert.ok(same(src, step(id, s).answer), k); });
  const C3 = {
    "pxCommon-application-1#s1": "x² + 7x", "pxCommon-application-3#s1": "n² + n", "pxFactor-application-1#s3": "x² + 8x + 15",
    "pxFactor-application-2#s1": "x² − 9", "pxFactor-application-3#s1": "M² − 4", "pxFactor-application-3#s2": "(x + 1)² − 4", "pxUse-application-3#s2": "x² + 2xy + y²",
    "pxFactor-application-4#s1": "x² + 10x + 25", "pxFactor-application-5#s1": "x² + 7x + 12"
  };
  Object.entries(C3).forEach(([k, src]) => {
    const [id, s] = k.split("#"), st = step(id, s);
    st.choices.forEach((c) => assert.equal(same(src, c.label), c.key === st.answer, k + " " + c.label));
  });
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "poly").forEach((s) => assert.ok(q.id + "#" + s.id in P, q.id + "#" + s.id + " を確かめていない")));
});

const EXPECT = {
  "pxUse-basic-1": 99 * 99, "pxUse-basic-2": 103 * 97, "pxUse-basic-3": 51 * 51, "pxUse-basic-4": 52 * 52 - 48 * 48, "pxUse-basic-5": 98 * 98 + 4 * 98 + 4, "pxUse-basic-6": 201 * 199,
  "pxUse-standard-1": 23 * 23 - 17 * 17, "pxUse-standard-2": 7.5 * 7.5 - 5 * 7.5, "pxUse-retention-1": 101 * 101, "pxUse-retention-2": 61 * 59, "pxUse-retention-3": 73 * 73 - 27 * 27, "pxUse-retention-4": (46 + 54) ** 2,
  "pxExpand-application-1#s2": 5 * 7, "pxExpand-application-2#s2": 5 * -3, "pxExpand-application-3#s2": 2 * 5,
  "pxFormula-application-1#s2": 9, "pxFormula-application-1#s3": 13 * 7, "pxFormula-application-2#s1": 10, "pxFormula-application-2#s2": 25, "pxFormula-application-3#s2": 25,
  "pxCommon-application-1#s2": 3 * 3 + 7 * 3, "pxCommon-application-1#s3": 93 * 93 + 7 * 93, "pxCommon-application-2#s2": 6, "pxCommon-application-2#s3": 3 * 16 + 6 * 4, "pxCommon-application-3#s2": 81 + 9,
  "pxFactor-application-1#s1": 3, "pxFactor-application-1#s2": 5, "pxFactor-application-2#s2": 13 * 13 - 9, "pxFactor-application-2#s3": 103 * 103 - 9, "pxFactor-application-3#s3": 36 - 4, "pxFactor-application-4#s3": 3 + 5, "pxFactor-application-5#s3": (36 + 42 + 12) / (6 + 3),
  "pxUse-application-1#s1": 10 * 10 - 9 * 11, "pxUse-application-1#s2": 9 * 11, "pxUse-application-2#s3": 12 * 12 - 10 * 10, "pxUse-application-3#s1": 5, "pxUse-application-3#s3": 3.5 ** 2 + 2 * 3.5 * 1.5 + 1.5 ** 2
};

test("数の問題と応用の数の小問は、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    near(st ? step(id, st).answer : Q[id].answer, want, key);
  });
  // a + b、ab から a² + b²：実際の a、b で確かめる
  [["pxUse-standard-4", 2, 5], ["pxUse-retention-5", 2, 7]].forEach(([id, a, b]) => near(Q[id].answer, a * a + b * b, id));
  near(Q["pxUse-standard-5"].answer, 4 * 4 + 1 * 1); // x = 4、y = 1
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number").forEach((s) => assert.ok(q.id + "#" + s.id in EXPECT, q.id + "#" + s.id + " を確かめていない")));
});

test("中3 多項式：中学3年を選べる・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学3年"].slice(0, 1), ["多項式"]);
  assert.deepEqual(E.UNITS["多項式"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck("多項式").questions.length, 5);
  const before = E.grade();
  assert.equal(E.setGrade("中学3年"), "中学3年");
  assert.ok(E.SELECTABLE_UNITS.includes("多項式"));
  E.setGrade(before);
});
