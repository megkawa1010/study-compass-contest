// node --test tests/*.test.js — 中3 二次方程式：解を方程式に代入して確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const SK = ["qeMeaning", "qeSqrt", "qeFactor", "qeFormula", "qeWord"];
const all = Object.values(Q).filter((q) => q.unit === "二次方程式");
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-6, (m || "") + " " + a + " と " + b);
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;

// 「(x − 4)² ＝ 12」「(−3 ± √5)/2」を JavaScript の式にする（bank.js とは別の読み方）。文字 n・M も x として読む
function toJS(src) {
  return src.replace(/\s|cm²|cm|m²|m(?![a-z])/g, "").replace(/[nM]/g, "x").replace(/−/g, "-").replace(/×/g, "*")
    .replace(/√\(([^()]+)\)/g, "S($1)").replace(/√(\d+(?:\.\d+)?)/g, "S($1)")
    .replace(/(\d|\)|x)(?=S|\(|x)/g, "$1*").replace(/²/g, "**2");
}
const fx = (src) => Function("S", "x", "return " + toJS(src)).bind(null, Math.sqrt);
// 方程式「左辺 ＝ 右辺」→ 左辺 − 右辺
const eqf = (eq) => { const [l, r] = eq.split("＝"); const L = fx(l), R = fx(r); return (x) => L(x) - R(x); };
// 二次方程式の実数解（小さい順・重解は1つ）
function roots(eq) {
  const f = eqf(eq), c = f(0), a = (f(1) + f(-1)) / 2 - c, b = (f(1) - f(-1)) / 2;
  assert.ok(Math.abs(a) > 1e-9, eq + " は二次方程式");
  [2, -3, 0.5].forEach((x) => assert.ok(Math.abs(f(x) - (a * x * x + b * x + c)) < 1e-9, eq + " は二次式"));
  const d = b * b - 4 * a * c;
  if (d < -1e-9) return [];
  if (Math.abs(d) < 1e-9) return [-b / (2 * a)];
  return [(-b - Math.sqrt(d)) / (2 * a), (-b + Math.sqrt(d)) / (2 * a)].sort((p, q) => p - q);
}
// 選択肢「x ＝ 2、3」「x ＝ (−3 ± √5)/2」「(−1 + √11) m」→ 値の一覧（小さい順）
function values(s) {
  const body = s.replace(/^[xnM]\s*＝\s*/, "");
  const parts = body.split("、").flatMap((p) => (p.includes("±") ? [p.replace("±", "+"), p.replace("±", "-")] : [p]));
  try { return [...new Set(parts.map((p) => Math.round(fx(p)() * 1e9) / 1e9))].sort((a, b) => a - b); } catch (e) { return [NaN]; }
}
const sameSet = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
const isRoot = (eq, x) => Math.abs(eqf(eq)(x)) < 1e-9;

test("2つの欄に答える問題：答えがちょうど方程式の解（小さい順）", () => {
  const list = all.filter((q) => q.type === "pair");
  assert.ok(list.length >= 24, "確かめた数 " + list.length);
  list.forEach((q) => {
    const eq = q.text.replace(" を解きましょう。解を小さい順に答えます。", "");
    assert.ok(sameSet(roots(eq), [q.answer.lo, q.answer.hi]), q.id + " " + roots(eq));
  });
});

test("解を選ぶ問題：正解だけが、方程式の解をもれなく・余計なくふくむ", () => {
  const check = (eq, q, k) => q.choices.forEach((c) => assert.equal(sameSet(values(c.label), roots(eq)), c.key === q.answer, k + " " + c.label));
  let n = 0;
  all.filter((q) => q.choices && / を解くと？$/.test(q.text)).forEach((q) => { check(q.text.replace(" を解くと？", ""), q, q.id); n++; });
  assert.ok(n >= 22, "確かめた数 " + n);
  check("x² − 5x + 6 ＝ 0", Q["qeMeaning-basic-2"], "qeMeaning-basic-2");
  const S = {
    "qeSqrt-application-1#s2": "x² ＝ 18", "qeSqrt-application-2#s1": "M² ＝ 25", "qeFactor-application-3#s3": "x² − 2x − 24 ＝ 0",
    "qeFormula-application-1#s2": "x² − 4x + 2 ＝ 0", "qeFormula-application-2#s2": "x(x + 2) ＝ 10", "qeFormula-application-3#s2": "x² + 2x − 1 ＝ 0",
    "qeWord-application-2#s2": "x² ＝ 3x + 10", "qeWord-application-3#s2": "(n − 1)(n + 1) ＝ 8n − 1"
  };
  Object.entries(S).forEach(([k, eq]) => { const [id, s] = k.split("#"); check(eq, step(id, s), k); });
  // 正の解だけを選ぶ小問
  const P = { "qeSqrt-application-1#s3": "x² ＝ 18", "qeSqrt-application-3#s2": "x² − 3 ＝ 45", "qeFormula-application-2#s3": "x(x + 2) ＝ 10" };
  Object.entries(P).forEach(([k, eq]) => { const [id, s] = k.split("#"); assert.ok(sameSet(values(label(step(id, s))), roots(eq).filter((x) => x > 0)), k); });
  const r = roots("x² + 2x − 1 ＝ 0")[1];
  assert.ok(r > 0 && r < 1 && label(step("qeFormula-application-3", "s3")) === "0 と 1 の間");
});

test("方程式を選ぶ問題：正解だけが、その値を解にもつ／同じ解をもつ", () => {
  const byRoot = { "qeMeaning-basic-3": [3], "qeMeaning-basic-4": [-2], "qeMeaning-retention-1": [6], "qeMeaning-standard-4": [1, 4] };
  Object.entries(byRoot).forEach(([id, rs]) => Q[id].choices.forEach((c) => assert.equal(rs.every((x) => isRoot(c.label, x)), c.key === Q[id].answer, id + " " + c.label)));
  // 場面の答えを代入して、正解の式だけが成り立つ
  const scene = {
    "qeMeaning-application-1#s2": [-2], "qeMeaning-application-2#s1": [7], "qeFactor-application-2#s1": [8], "qeSqrt-application-1#s1": [3 * Math.SQRT2],
    "qeSqrt-application-3#s1": [4 * Math.sqrt(3)], "qeFormula-application-2#s1": [Math.sqrt(11) - 1], "qeWord-application-2#s1": [5], "qeWord-application-3#s1": [8], "qeWord-basic-4": [5]
  };
  Object.entries(scene).forEach(([k, xs]) => {
    const [id, s] = k.split("#"), q = s ? step(id, s) : Q[id];
    q.choices.forEach((c) => assert.equal(xs.every((x) => isRoot(c.label, x)), c.key === q.answer, k + " " + c.label));
  });
  // 整理した形：正解だけが、もとの方程式と同じ解
  const same = {
    "qeMeaning-basic-5": "(x + 1)(x − 4) ＝ 2x", "qeMeaning-standard-3": "2x(x − 3) ＝ x² − 5", "qeMeaning-retention-3": "(x + 7)(x − 6) ＝ 10x",
    "qeWord-application-1#s2": "(8 + 2x)(12 + 2x) − 8 × 12 ＝ 44", "qeFactor-application-2#s2": "n(n + 1) ＝ 72"
  };
  Object.entries(same).forEach(([k, eq]) => {
    const [id, s] = k.split("#"), q = s ? step(id, s) : Q[id];
    q.choices.forEach((c) => assert.equal(sameSet(roots(c.label), roots(eq)), c.key === q.answer, k + " " + c.label));
  });
  // 式そのものが等しい
  const ident = { "qeFactor-application-1#s2": "x² − 3x − 10", "qeWord-application-1#s1": "(8 + 2x)(12 + 2x)" };
  Object.entries(ident).forEach(([k, src]) => {
    const [id, s] = k.split("#"), q = step(id, s);
    q.choices.forEach((c) => assert.equal([2, -1, 0.5].every((x) => Math.abs(fx(c.label)(x) - fx(src)(x)) < 1e-9), c.key === q.answer, k + " " + c.label));
  });
  assert.equal(label(Q["qeMeaning-basic-1"]), "x² − 3x ＝ 0");
});

// 文章題：方程式を解いて、場面に合う解を選ぶ
const pos = (eq) => roots(eq).filter((x) => x > 0);
const EXPECT = {
  "qeMeaning-basic-6": (8 - 4) / 2, "qeMeaning-standard-1": (9 + 12) / 3, "qeMeaning-standard-2": -(25 - 10), "qeMeaning-standard-5": 2 * 5,
  "qeMeaning-retention-2": (15 - 9) / 3, "qeMeaning-retention-4": -3 * 7, "qeMeaning-retention-5": (81 + 18) / 9,
  "qeMeaning-application-1#s1": (4 + 6) / 2, "qeMeaning-application-1#s3": roots("x² + 5x + 6 ＝ 0").find((x) => x !== -2),
  "qeMeaning-application-2#s2": 7 * 8, "qeMeaning-application-2#s3": roots("n(n + 1) ＝ 56")[0], "qeMeaning-application-3#s2": 0, "qeMeaning-application-3#s3": roots("x² ＝ 4x")[1],
  "qeSqrt-application-2#s2": roots("(x + 2)² ＝ 25")[1], "qeSqrt-application-2#s3": roots("(x + 2)² ＝ 25")[0], "qeSqrt-application-3#s3": Math.floor(4 * Math.sqrt(3)),
  "qeFactor-application-1#s1": -(25 - 10) / 5, "qeFactor-application-1#s3": roots("x² − 3x − 10 ＝ 0")[0], "qeFactor-application-2#s3": pos("n(n + 1) ＝ 72")[0],
  "qeFactor-application-3#s1": 4, "qeFactor-application-3#s2": -6,
  "qeFormula-basic-4": 25 - 4 * 2, "qeFormula-retention-3": 9 + 28, "qeFormula-standard-4": 36 / 4,
  "qeFormula-application-1#s1": 16 - 8, "qeFormula-application-1#s3": 2 + 1.414, "qeFormula-application-3#s1": 4 + 4,
  "qeWord-basic-1": pos("x² ＝ 5x")[0], "qeWord-basic-2": pos("n(n + 1) ＝ 30")[0], "qeWord-basic-3": pos("(x + 3)² ＝ 81")[0], "qeWord-basic-5": pos("x(x + 4) ＝ 45")[0],
  "qeWord-basic-7": pos("(x + 3)² ＝ 49")[0], "qeWord-standard-1": pos("x(x + 2) ＝ 48")[0], "qeWord-standard-2": roots("(10 − x)(15 − x) ＝ 104").filter((x) => x > 0 && x < 10)[0],
  "qeWord-standard-3": roots("2(x − 4)² ＝ 32").filter((x) => x > 4)[0], "qeWord-standard-4": pos("n(n − 3)/2 ＝ 20")[0], "qeWord-standard-5": pos("20x − 5x² ＝ 15")[0],
  "qeWord-retention-1": pos("n(n + 1) ＝ 132")[0], "qeWord-retention-2": pos("x² ＝ 7x")[0], "qeWord-retention-3": pos("x(x + 6) ＝ 40")[0],
  "qeWord-retention-4": roots("(20 − x)(30 − x) ＝ 504").filter((x) => x > 0 && x < 20)[0], "qeWord-retention-5": pos("30x − 5x² ＝ 40")[0],
  "qeWord-application-1#s3": pos("(8 + 2x)(12 + 2x) − 96 ＝ 44")[0], "qeWord-application-2#s3": pos("x² ＝ 3x + 10")[0], "qeWord-application-3#s3": pos("(n − 1)(n + 1) ＝ 8n − 1")[0] + 1
};

test("数の問題と応用の数の小問は、方程式を解いた値と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    near(st ? step(id, st).answer : Q[id].answer, want, key);
  });
  // 解が1つになる c：重解になっている
  assert.equal(roots("x² + 6x + 9 ＝ 0").length, 1);
  all.filter((q) => q.type === "number").forEach((q) => assert.ok(q.id in EXPECT, q.id + " を確かめていない"));
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number").forEach((s) => assert.ok(q.id + "#" + s.id in EXPECT, q.id + "#" + s.id + " を確かめていない")));
});

test("中3 二次方程式：平方根の次・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学3年"].slice(0, 3), ["多項式", "平方根", "二次方程式"]);
  assert.deepEqual(E.UNITS["二次方程式"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck("二次方程式").questions.length, 5);
});
