// node --test tests/*.test.js — 中3 関数 y＝ax²：答えを式から計算して確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "関数 y＝ax²";
const SK = ["qfMeaning", "qfGraph", "qfRange", "qfRate", "qfUse"];
const all = Object.values(Q).filter((q) => q.unit === U);
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const frac = (s) => { const [p, q] = String(s).split("/").map(Number); return q ? p / q : p; };

// y ＝ ax² の値・変域・変化の割合
const f = (a) => (x) => a * x * x;
const rate = (a, p, q) => (f(a)(q) - f(a)(p)) / (q - p);
function range(a, p, q) {
  const v = [f(a)(p), f(a)(q)].concat(p <= 0 && 0 <= q ? [0] : []);
  return [Math.min(...v), Math.max(...v)];
}
// 2点を通る直線の傾き・切片、原点と2点の三角形
const lineThrough = ([x1, y1], [x2, y2]) => { const m = (y2 - y1) / (x2 - x1); return [m, y1 - m * x1]; };
const triO = ([x1, y1], [x2, y2]) => Math.abs(x1 * y2 - x2 * y1) / 2;
// x² ＝ m x ＋ n の解（a 倍の放物線）
const meet = (a, m, n) => { const d = m * m + 4 * a * n; return [(m - Math.sqrt(d)) / (2 * a), (m + Math.sqrt(d)) / (2 * a)].sort((p, q) => p - q); };

test("図の放物線：点は放物線の上にあり、答えは図と食いちがわない", () => {
  const figs = all.flatMap((q) => (q.figure && q.figure.parabolas ? [q] : []));
  assert.ok(figs.length >= 6, "図の数 " + figs.length);
  figs.forEach((q) => {
    const F = q.figure;
    F.points.forEach((p) => {
      assert.ok(F.parabolas.some((pb) => Math.abs(pb.a * p.x * p.x - p.y) < 1e-9), q.id + " 点が放物線の上にない");
      assert.ok(p.x >= F.x[0] && p.x <= F.x[1] && p.y >= F.y[0] && p.y <= F.y[1], q.id + " 点が図の外");
    });
    (F.lines || []).forEach((l) => F.points.forEach((p) => near(l.a * p.x + l.b, p.y, q.id + " 交点が直線の上にない")));
  });
  near(frac(Q["qfGraph-basic-2"].answer), Q["qfGraph-basic-2"].figure.parabolas[0].a);
  near(Q["qfGraph-basic-6"].answer, Q["qfGraph-basic-6"].figure.parabolas[0].a);
  near(Q["qfGraph-standard-3"].answer, f(Q["qfGraph-standard-3"].figure.parabolas[0].a)(6));
  const [A, Bp] = Q["qfUse-basic-2"].figure.points.map((p) => [p.x, p.y]);
  near(Q["qfUse-basic-2"].answer, lineThrough(A, Bp)[0]);
  // 放物線は描ける（SVG に曲線が出る）
  const svg = SC.figures.render(Q["qfUse-application-1"].figure);
  assert.ok(/<polyline[^>]*fig-curve/.test(svg) && /<line class="fig-line"/.test(svg), "放物線と直線が描かれる");
});

test("変域を選ぶ問題：正解だけが計算した変域と一致する", () => {
  const R = { "qfRange-basic-1": [1, -2, 3], "qfRange-basic-5": [-1, -3, 1], "qfRange-standard-1": [1 / 2, -4, 2], "qfRange-standard-4": [-2, 1, 3], "qfRange-retention-1": [1, -5, 1], "qfRange-standard-7": [1 / 3, -6, 3], "qfRange-retention-5": [-3, -1, 4] };
  Object.entries(R).forEach(([id, [a, p, q]]) => {
    const [lo, hi] = range(a, p, q);
    const read = (s) => s.replace(/−/g, "-").split("≦").map((t) => Number(t.replace(/[ y]/g, "")));
    Q[id].choices.forEach((c) => { const [l, , h] = read(c.label); assert.equal(l === lo && h === hi, c.key === Q[id].answer, id + " " + c.label); });
  });
  assert.equal(label(Q["qfRange-basic-7"]), "0");
});

test("選ぶ問題：グラフ上の点・対称・開き方・方程式", () => {
  // 点 (3, 18) を通る → a ＝ 2。同じグラフの点だけが正解
  const onP = (a, s) => { const [x, y] = s.replace(/[()]/g, "").replace(/−/g, "-").split(",").map(Number); return Math.abs(a * x * x - y) < 1e-9; };
  Q["qfGraph-basic-7"].choices.forEach((c) => assert.equal(onP(18 / 9, c.label), c.key === Q["qfGraph-basic-7"].answer, c.label));
  Q["qfGraph-standard-4"].choices.forEach((c) => assert.equal(onP(1, c.label), c.key === Q["qfGraph-standard-4"].answer, c.label));
  // 式「y ＝ (1/4)x²」の a
  const aOf = (s) => { const t = s.replace(/^y ＝ /, "").replace(/x²$/, "").replace(/−/g, "-").replace(/[()]/g, ""); return t === "" ? 1 : t === "-" ? -1 : t.startsWith("-") ? -frac(t.slice(1)) : frac(t); };
  const pick = (id, cmp) => { const as = Q[id].choices.map((c) => Math.abs(aOf(c.label))); const want = cmp(...as); Q[id].choices.forEach((c, i) => assert.equal(as[i] === want, c.key === Q[id].answer, id + " " + c.label)); };
  pick("qfGraph-standard-2", Math.min);
  pick("qfGraph-retention-4", Math.max);
  [["qfGraph-basic-5", 2], ["qfGraph-retention-3", 5]].forEach(([id, a]) => Q[id].choices.forEach((c) => assert.equal(aOf(c.label) === -a, c.key === Q[id].answer, id + " " + c.label)));
  // x² ＝ 4 倍・9 倍
  assert.equal(label(Q["qfMeaning-basic-5"]), 2 ** 2 + "倍");
  assert.equal(label(Q["qfMeaning-standard-3"]), 3 ** 2 + "倍");
  // 表の値から式を選ぶ：正解だけが3組とも成り立つ
  const pts = [[1, 4], [2, 16], [3, 36]];
  const st = step("qfMeaning-application-2", "s1");
  const val = (s, x) => Function("x", "return " + s.replace("y ＝ ", "").replace(/(\d)x/g, "$1*x").replace("x²", "x*x").replace("x²", "x*x"))(x);
  st.choices.forEach((c) => assert.equal(pts.every(([x, y]) => Math.abs(val(c.label, x) - y) < 1e-9), c.key === st.answer, c.label));
  // 交点の方程式：x ＝ −1、2 の両方を解にもつのは正解だけ
  const eqv = (s, x) => { const [l, r] = s.split("＝").map((t) => Function("x", "return " + t.replace(/\s/g, "").replace(/−/g, "-").replace(/x²/g, "x*x").replace(/(\d)\(/g, "$1*(").replace(/(\d)x/g, "$1*x"))); return Math.abs(l(x) - r(x)) < 1e-9; };
  Q["qfUse-basic-4"].choices.forEach((c) => assert.equal([-1, 2].every((x) => eqv(c.label, x)), c.key === Q["qfUse-basic-4"].answer, c.label));
  const s2 = step("qfUse-application-2", "s1");
  s2.choices.forEach((c) => assert.equal(eqv(c.label, 4) && eqv(c.label, -2), c.key === s2.answer, c.label));
  // 変化の割合 2a ＋ 2：a ＝ 1、3 の小問と一致
  const s3 = step("qfRate-application-1", "s3");
  s3.choices.forEach((c) => assert.equal([1, 3, 0.5].every((a) => Math.abs(Function("a", "return " + c.label.replace(/(\d)a/g, "$1*a"))(a) - rate(1, a, a + 2)) < 1e-9), c.key === s3.answer, c.label));
});

const EXPECT = {
  "qfMeaning-basic-1": 12 / 4, "qfMeaning-basic-2": f(3)(-4), "qfMeaning-basic-4": f(-2)(3), "qfMeaning-basic-6": f(18 / 9)(4), "qfMeaning-basic-7": 8 / 16,
  "qfMeaning-standard-1": Math.sqrt(50 / 2), "qfMeaning-standard-2": f(-20 / 4)(-1), "qfMeaning-standard-4": 3 ** 2, "qfMeaning-standard-5": 3 / 9,
  "qfMeaning-retention-1": 75 / 25, "qfMeaning-retention-2": f(6)(-5), "qfMeaning-retention-4": f(-12 / 4)(5), "qfMeaning-retention-5": Math.sqrt(196 / 4),
  "qfMeaning-application-1#s1": f(5)(3), "qfMeaning-application-1#s2": Math.sqrt(80 / 5), "qfMeaning-application-1#s3": f(5)(4) - f(5)(2),
  "qfMeaning-application-2#s2": f(4)(5), "qfMeaning-application-2#s3": Math.sqrt(64 / 4),
  "qfMeaning-application-3#s1": 8 / 1600, "qfMeaning-application-3#s2": f(8 / 1600)(60), "qfMeaning-application-3#s3": f(8 / 1600)(80) / f(8 / 1600)(40),
  "qfGraph-standard-5": f(12 / 4)(1), "qfGraph-retention-2": -32 / 16, "qfGraph-retention-5": f(45 / 9)(2),
  "qfGraph-application-1#s1": f(1)(-2), "qfGraph-application-1#s2": Math.sqrt(9), "qfGraph-application-1#s3": 2,
  "qfGraph-application-3#s1": f(2)(1), "qfGraph-application-3#s2": f(2)(2), "qfGraph-application-3#s3": f(2)(2) / f(2)(1),
  "qfRange-basic-2": range(2, 1, 3)[1], "qfRange-basic-3": range(2, 1, 3)[0], "qfRange-basic-4": range(3, -1, 2)[0], "qfRange-basic-6": range(1, -4, -1)[1],
  "qfRange-standard-2": 12 / range(1, -1, 2)[1], "qfRange-standard-3": -18 / range(1, -3, 2)[1], "qfRange-standard-5": Math.sqrt(9),
  "qfRange-standard-6": 8 / 4, "qfRange-application-4#s1": range(2, -1, 3)[0], "qfRange-application-4#s2": range(2, -1, 3)[1], "qfRange-application-4#s3": range(2, -1, 1)[1],
  "qfRange-application-5#s1": range(1, 1, 3)[1], "qfRange-application-5#s2": 2 * 1 + 3, "qfRange-application-5#s3": 2 * 3 + 3, "qfRange-application-6#s1": f(-1)(2), "qfRange-application-6#s2": -Math.sqrt(16),
  "qfUse-application-4#s1": meet(1 / 2, 1, 4)[0], "qfUse-application-4#s2": f(1 / 2)(meet(1 / 2, 1, 4)[1]), "qfUse-application-4#s3": triO([-2, 2], [4, 8]),
  "qfUse-application-5#s1": 8 / 4, "qfUse-application-5#s2": -2, "qfUse-application-5#s3": triO([-2, 8], [2, 8]),
  "qfRange-retention-2": range(5, -6, -2)[0], "qfRange-retention-3": range(6, -5, 4)[0], "qfRange-retention-4": 36 / range(1, -2, 3)[1],
  "qfRange-application-1#s1": range(1, -3, 2)[0], "qfRange-application-1#s2": range(1, -3, 2)[1], "qfRange-application-2#s2": 4, "qfRange-application-2#s3": -8 / 16,
  "qfRange-application-3#s1": range(1, 2, 5)[0], "qfRange-application-3#s2": range(1, 2, 5)[1], "qfRange-application-3#s3": range(1, 2, 5)[1] - range(1, 2, 5)[0],
  "qfRate-basic-1": rate(1, 1, 3), "qfRate-basic-2": rate(2, 2, 4), "qfRate-basic-3": rate(1, -3, -1), "qfRate-basic-5": f(3)(2) - f(3)(1), "qfRate-basic-6": rate(-1, 1, 4),
  "qfRate-standard-1": 10 / (1 + 4), "qfRate-standard-2": rate(1 / 2, 2, 6), "qfRate-standard-3": rate(-2, -4, -1), "qfRate-standard-4": rate(1, 2, 5), "qfRate-standard-5": rate(2, 2, 5),
  "qfRate-retention-1": rate(1, 5, 8), "qfRate-retention-2": rate(3, -5, -2), "qfRate-retention-3": rate(-1, 5, 9), "qfRate-retention-4": -20 / (3 + 7), "qfRate-retention-5": rate(3, 4, 9),
  "qfRate-application-1#s1": rate(1, 1, 3), "qfRate-application-1#s2": rate(1, 3, 5), "qfRate-application-2#s1": rate(5, 1, 3), "qfRate-application-2#s2": rate(5, 3, 5),
  "qfRate-application-3#s1": -16 / (2 + 6), "qfRate-application-3#s2": f(-2)(2), "qfRate-application-3#s3": f(-2)(6),
  "qfUse-basic-1": meet(1, 0, 4)[1], "qfUse-basic-3": lineThrough([-1, 1], [2, 4])[1], "qfUse-basic-5": f(2)(3), "qfUse-basic-6": meet(1, 1, 6)[0], "qfUse-basic-7": f(1)(meet(1, 1, 6)[1]),
  "qfUse-standard-1": lineThrough([-2, 4], [3, 9])[0], "qfUse-standard-2": lineThrough([-2, 4], [3, 9])[1], "qfUse-standard-3": triO([-2, 4], [3, 9]), "qfUse-standard-4": meet(1 / 2, 1, 4)[1], "qfUse-standard-5": (2 * 3 + 3) / 9,
  "qfUse-retention-1": meet(1, 0, 25)[0], "qfUse-retention-2": f(3)(-2), "qfUse-retention-3": meet(1, 3, 10)[1], "qfUse-retention-4": lineThrough([-1, 1], [7, 49])[1], "qfUse-retention-5": triO([-2, 4], [5, 25]),
  "qfUse-application-1#s1": meet(1, 1, 2)[0], "qfUse-application-1#s2": f(1)(meet(1, 1, 2)[1]), "qfUse-application-1#s3": triO([-1, 1], [2, 4]),
  "qfUse-application-2#s2": meet(1, 2, 8)[1], "qfUse-application-2#s3": f(1)(meet(1, 2, 8)[1]),
  "qfUse-application-3#s1": lineThrough([-3, 9], [1, 1])[0], "qfUse-application-3#s2": lineThrough([-3, 9], [1, 1])[1], "qfUse-application-3#s3": triO([-3, 9], [1, 1])
};

test("数の問題と応用の数の小問は、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#"), q = st ? step(id, st) : Q[id];
    near(q.type === "fraction" ? frac(q.answer) : q.answer, want, key);
  });
  ["qfGraph-basic-2", "qfGraph-basic-6", "qfGraph-standard-3", "qfUse-basic-2"].forEach((k) => (EXPECT[k] = true));
  all.filter((q) => q.type === "number" || q.type === "fraction").forEach((q) => assert.ok(q.id in EXPECT, q.id + " を確かめていない"));
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number" || s.type === "fraction").forEach((s) => assert.ok(q.id + "#" + s.id in EXPECT, q.id + "#" + s.id + " を確かめていない")));
});

test("中3 関数 y＝ax²：二次方程式の次・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学3年"].slice(0, 4), ["多項式", "平方根", "二次方程式", U]);
  assert.deepEqual(E.UNITS[U], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck(U).questions.length, 5);
});
