// node --test tests/*.test.js — 中3 円：答えを円周角の関係から計算して確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "円";
const SK = ["ciCentral", "ciSameArc", "ciSemicircle", "ciConverse", "ciSimilar"];
const all = Object.values(Q).filter((q) => q.unit === U);
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;

const ins = (central) => central / 2;          // 中心角 → 円周角
const cen = (inscribed) => inscribed * 2;      // 円周角 → 中心角
const base = (apex) => (180 - apex) / 2;       // 二等辺三角形の底角
const rest = (...a) => 180 - a.reduce((s, v) => s + v, 0);
const right = (a) => 90 - a;                   // 直径に対する円周角 90° の残り
const arcAngle = (ratio, k) => 180 * k / ratio.reduce((s, v) => s + v, 0); // 弧の比から円周角
const chord = (pa, pc, pb) => pa * pc / pb;    // PA × PC ＝ PB × PD
// 積と和から2つの長さ（大きいほう, 小さいほう）
const split = (prod, sum) => { const d = Math.sqrt(sum * sum - 4 * prod); return [(sum + d) / 2, (sum - d) / 2]; };

test("選ぶ問題：円周上にある・ない、直径、相似の対応", () => {
  const onCircle = (x, y) => x === y;
  [["ciConverse-basic-2", 50, 50], ["ciConverse-basic-3", 50, 55], ["ciConverse-standard-4", 40, 45], ["ciConverse-retention-2", 71, 71], ["ciConverse-retention-5", 37, 39]].forEach(([id, x, y]) =>
    assert.equal(/円周上にある$/.test(label(Q[id])), onCircle(x, y), id));
  ["ciConverse-basic-6", "ciConverse-standard-5"].forEach((id) => assert.equal(label(Q[id]), "AB"));
  ["ciSimilar-basic-2", "ciSimilar-retention-3"].forEach((id) => assert.equal(label(Q[id]), "△PDC"));
  assert.equal(label(Q["ciSimilar-standard-4"]), "△PCB");
  assert.equal(label(step("ciCentral-application-2", "s3")), "正三角形");
  assert.equal(label(step("ciSemicircle-application-5", "s3")), "長方形");
  // 対頂角と円周角で、弦の積がそろう（PA × PC ＝ PB × PD）
  [[4, 6, 3, 8], [6, 10, 4, 15], [5, 12, 4, 15], [6, 7.5, 5, 9]].forEach(([a, c, b, d]) => near(a * c, b * d));
});

const EXPECT = {
  "ciCentral-basic-1": ins(100), "ciCentral-basic-3": cen(35), "ciCentral-basic-4": ins(130), "ciCentral-basic-5": ins(240), "ciCentral-basic-6": cen(28),
  "ciCentral-standard-1": ins(rest(25, 25)), "ciCentral-standard-2": base(cen(52)), "ciCentral-standard-3": ins(360 - 110), "ciCentral-standard-4": cen(40), "ciCentral-standard-5": ins(90),
  "ciCentral-application-1#s1": ins(140), "ciCentral-application-1#s2": base(140),
  "ciCentral-application-2#s1": 360 / 3, "ciCentral-application-2#s2": ins(360 / 3),
  "ciCentral-application-3#s1": 32, "ciCentral-application-3#s2": rest(32, 32), "ciCentral-application-3#s3": ins(rest(32, 32)),
  "ciCentral-application-4#s1": 360 / 9, "ciCentral-application-4#s2": ins(2 * 360 / 9), "ciCentral-application-4#s3": ins(5 * 360 / 9),
  "ciCentral-application-5#s1": 15, "ciCentral-application-5#s2": 15 + 25, "ciCentral-application-5#s3": cen(15 + 25),
  "ciCentral-retention-1": ins(156), "ciCentral-retention-2": cen(47), "ciCentral-retention-3": ins(210), "ciCentral-retention-4": ins(rest(19, 19)), "ciCentral-retention-5": cen(75),
  "ciSameArc-basic-1": 38, "ciSameArc-basic-3": 60 / 20, "ciSameArc-basic-4": 33, "ciSameArc-basic-6": 4 * 45 / 15, "ciSameArc-basic-7": 40,
  "ciSameArc-standard-1": rest(35, 45), "ciSameArc-standard-2": 28 + 42, "ciSameArc-standard-3": ins(360 / 12), "ciSameArc-standard-4": 24 * 3 / 2, "ciSameArc-standard-5": arcAngle([3, 4, 5], 5),
  "ciSameArc-application-1#s1": 32, "ciSameArc-application-1#s2": 48, "ciSameArc-application-1#s3": rest(32, 48),
  "ciSameArc-application-2#s1": 360 / 8, "ciSameArc-application-2#s2": ins(360 / 8), "ciSameArc-application-2#s3": ins(3 * 360 / 8),
  "ciSameArc-application-3#s1": 24 * 9 / 6, "ciSameArc-application-3#s2": cen(24 * 9 / 6), "ciSameArc-application-3#s3": 9 * 360 / cen(24 * 9 / 6),
  "ciSameArc-application-4#s1": arcAngle([2, 3, 4], 2), "ciSameArc-application-4#s2": arcAngle([2, 3, 4], 3), "ciSameArc-application-4#s3": arcAngle([2, 3, 4], 4),
  "ciSameArc-application-5#s1": 26, "ciSameArc-application-5#s2": 26 * 2,
  "ciSameArc-retention-1": 53, "ciSameArc-retention-2": 72 / 18, "ciSameArc-retention-3": 5 * 42 / 14, "ciSameArc-retention-4": 31 + 46, "ciSameArc-retention-5": arcAngle([5, 6, 7], 7),
  "ciSemicircle-basic-1": 90, "ciSemicircle-basic-2": right(34), "ciSemicircle-basic-4": right(62), "ciSemicircle-basic-6": 90 / 2, "ciSemicircle-basic-7": 90 / 3,
  "ciSemicircle-standard-1": right(58), "ciSemicircle-standard-2": right(25), "ciSemicircle-standard-4": 14 / 2, "ciSemicircle-standard-5": right(36), "ciSemicircle-standard-6": right(ins(70)),
  "ciSemicircle-application-1#s1": 90, "ciSemicircle-application-1#s2": right(28), "ciSemicircle-application-1#s3": cen(28),
  "ciSemicircle-application-2#s1": 90, "ciSemicircle-application-2#s3": 12 / 2,
  "ciSemicircle-application-3#s1": 18 / 2, "ciSemicircle-application-3#s2": 24, "ciSemicircle-application-3#s3": 24 + 24,
  "ciSemicircle-application-4#s1": right(38), "ciSemicircle-application-4#s2": right(27), "ciSemicircle-application-4#s3": right(38),
  "ciSemicircle-application-5#s1": 90, "ciSemicircle-application-5#s2": right(35),
  "ciSemicircle-retention-1": right(47), "ciSemicircle-retention-2": 90 / 5, "ciSemicircle-retention-3": 26 / 2, "ciSemicircle-retention-4": right(33), "ciSemicircle-retention-5": right(ins(76)),
  "ciConverse-basic-5": 64, "ciConverse-basic-7": 16 / 2,
  "ciConverse-standard-1": 30, "ciConverse-standard-2": 50, "ciConverse-standard-3": 63, "ciConverse-standard-6": 20 / 2,
  "ciConverse-application-1#s2": 44, "ciConverse-application-1#s3": rest(36, 44),
  "ciConverse-application-2#s2": 28, "ciConverse-application-2#s3": right(28),
  "ciConverse-application-3#s2": 54, "ciConverse-application-4#s2": 24 / 2, "ciConverse-application-4#s3": 22,
  "ciConverse-application-5#s2": 23, "ciConverse-application-5#s3": 61,
  "ciConverse-retention-3": 82, "ciConverse-retention-6": 34 / 2, "ciConverse-retention-4": 58,
  "ciSimilar-basic-1": chord(4, 6, 3), "ciSimilar-basic-4": chord(2, 9, 3), "ciSimilar-basic-5": chord(5, 4, 10), "ciSimilar-basic-7": chord(6, 4, 3),
  "ciSimilar-standard-1": split(6 * 4, 11)[0], "ciSimilar-standard-2": 12 * 6 / 9, "ciSimilar-standard-3": chord(4, 9, 3), "ciSimilar-standard-5": chord(5, 12, 6), "ciSimilar-standard-6": chord(7, 5, 7),
  "ciSimilar-application-1#s2": chord(6, 10, 4), "ciSimilar-application-1#s3": 4 + chord(6, 10, 4),
  "ciSimilar-application-2#s1": 12 / 8 * 2, "ciSimilar-application-2#s2": 6 * 12 / 8, "ciSimilar-application-2#s3": 7.5 * 8 / 12,
  "ciSimilar-application-3#s1": 3 + 9, "ciSimilar-application-3#s3": chord(3, 12, 4),
  "ciSimilar-application-4#s1": 30, "ciSimilar-application-4#s2": rest(30, 70), "ciSimilar-application-4#s3": chord(4, 15, 5),
  "ciSimilar-application-5#s1": 2 * 12, "ciSimilar-application-5#s2": split(24, 10)[1], "ciSimilar-application-5#s3": split(24, 10)[0],
  "ciSimilar-retention-1": chord(8, 3, 12), "ciSimilar-retention-2": chord(14, 3, 7), "ciSimilar-retention-4": chord(2, 15, 5), "ciSimilar-retention-5": split(2 * 14, 11)[0]
};

test("数の問題と応用の数の小問は、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#"), q = st ? step(id, st) : Q[id];
    assert.ok(q, key + " がない");
    near(q.answer, want, key);
  });
  all.filter((q) => q.type === "number" || q.type === "fraction").forEach((q) => assert.ok(q.id in EXPECT, q.id + " を確かめていない"));
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number" || s.type === "fraction").forEach((s) => assert.ok(q.id + "#" + s.id in EXPECT, q.id + "#" + s.id + " を確かめていない")));
});

test("中3 円：相似の次・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学3年"].slice(0, 6), ["多項式", "平方根", "二次方程式", "関数 y＝ax²", "相似", U]);
  assert.deepEqual(E.UNITS[U], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck(U).questions.length, 5);
});
