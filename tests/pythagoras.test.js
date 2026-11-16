// node --test tests/*.test.js — 中3 三平方の定理：答えを2乗の和から計算して確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "三平方の定理";
const SK = ["ptBasic", "ptConverse", "ptSpecial", "ptPlane", "ptSolid"];
const all = Object.values(Q).filter((q) => q.unit === U);
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;

const hyp = (...s) => Math.sqrt(s.reduce((t, v) => t + v * v, 0)); // 斜辺・対角線
const leg = (c, a) => Math.sqrt(c * c - a * a);                    // 残りの辺
const sq = (x) => x * x;                                           // √a の a
const per = (k) => (x) => x / Math.sqrt(k);                        // a√k の a
const r2 = per(2), r3 = per(3), r5 = per(5);
const dist = ([x1, y1], [x2, y2]) => hyp(x2 - x1, y2 - y1);
const isRight = (s) => { const [a, b, c] = s.map((v) => v * v).sort((x, y) => x - y); return Math.abs(a + b - c) < 1e-9; };
const nums = (s) => s.split("、").map((t) => Number(t.replace(/[^0-9.]/g, "")));

test("直角三角形かどうかを選ぶ問題：正解だけが三平方の定理の逆に合う", () => {
  // 3辺の組から1つ選ぶ問題
  ["ptConverse-basic-3", "ptConverse-retention-2"].forEach((id) =>
    Q[id].choices.forEach((c) => assert.equal(isRight(nums(c.label)), c.key === Q[id].answer, id + " " + c.label)));
  Q["ptConverse-standard-3"].choices.forEach((c) => assert.equal(!isRight(nums(c.label)), c.key === Q["ptConverse-standard-3"].answer, c.label));
  // 3辺を示して「直角三角形か」を問う問題
  const S = { "ptConverse-basic-1": [3, 4, 5], "ptConverse-basic-4": [8, 15, 17], "ptConverse-basic-6": [7, 8, 9], "ptConverse-basic-7": [1, Math.sqrt(3), 2], "ptConverse-standard-4": [Math.sqrt(2), Math.sqrt(3), Math.sqrt(5)],
    "ptConverse-retention-1": [20, 21, 29], "ptConverse-retention-4": [Math.sqrt(6), Math.sqrt(7), Math.sqrt(13)] };
  Object.entries(S).forEach(([id, s]) => assert.equal(label(Q[id]) === "直角三角形", isRight(s), id));
  [["ptConverse-application-1", [9, 40, 41]], ["ptConverse-application-5", [10, 24, 26]]].forEach(([id, s]) => assert.equal(label(step(id, "s1")) === "直角三角形", isRight(s), id));
  // 座標の三角形：AC ＝ BC の二等辺三角形で、直角ではない
  const [A, Bp, Cp] = [[-1, 2], [5, 2], [2, 6]];
  assert.ok(dist(A, Cp) === dist(Bp, Cp) && !isRight([dist(A, Bp), dist(A, Cp), dist(Bp, Cp)]) && label(step("ptPlane-application-1", "s3")) === "二等辺三角形");
  // 正方形の対角線を1辺とする正方形は2倍、20cm の棒は 17cm の箱に入らない
  near(sq(hyp(3, 3)) / 9, 2); assert.equal(label(step("ptSpecial-application-4", "s3")), "2倍");
  assert.ok(hyp(12, 9, 8) < 20 && label(step("ptSolid-application-4", "s3")) === "入らない");
});

const EXPECT = {
  "ptBasic-basic-1": hyp(3, 4), "ptBasic-basic-3": leg(13, 5), "ptBasic-basic-4": hyp(6, 8), "ptBasic-basic-5": sq(hyp(1, 2)), "ptBasic-basic-6": leg(17, 8),
  "ptBasic-standard-1": sq(hyp(2, 3)), "ptBasic-standard-2": r5(leg(6, 4)), "ptBasic-standard-3": leg(25, 7), "ptBasic-standard-4": hyp(3, Math.sqrt(7)), "ptBasic-standard-5": hyp(9, 12),
  "ptBasic-application-1#s1": leg(5, 3), "ptBasic-application-1#s2": leg(5, 4),
  "ptBasic-application-2#s1": hyp(6, 8), "ptBasic-application-2#s2": hyp(6, 8) / 2,
  "ptBasic-application-3#s1": hyp(15, 20), "ptBasic-application-3#s2": 15 * 20 / 2, "ptBasic-application-3#s3": 15 * 20 / hyp(15, 20),
  "ptBasic-application-4#s1": (17 - Math.sqrt(2 * 169 - 17 * 17)) / 2, "ptBasic-application-4#s2": (17 + Math.sqrt(2 * 169 - 17 * 17)) / 2, "ptBasic-application-4#s3": (17 * 17 - 169) / 4,
  "ptBasic-application-5#s1": hyp(20, 21), "ptBasic-application-5#s2": 20 + 21, "ptBasic-application-5#s3": 20 + 21 - hyp(20, 21),
  "ptBasic-retention-1": hyp(7, 24), "ptBasic-retention-2": leg(41, 9), "ptBasic-retention-3": sq(hyp(5, 9)), "ptBasic-retention-4": per(6)(leg(15, 3)), "ptBasic-retention-5": hyp(12, 35),
  "ptConverse-basic-5": Math.max(9, 12, 15), "ptConverse-standard-1": leg(13, 12), "ptConverse-standard-2": sq(hyp(2, 3)), "ptConverse-standard-5": leg(10, 6),
  "ptConverse-application-1#s2": 41, "ptConverse-application-1#s3": 9 * 40 / 2,
  "ptConverse-application-2#s1": 5 * 30, "ptConverse-application-2#s2": (3 + 4) * 30,
  "ptConverse-application-3#s1": 4 - 1, "ptConverse-application-3#s2": 5 - 1, "ptConverse-application-3#s3": dist([1, 1], [4, 5]),
  "ptConverse-application-4#s1": hyp(5, 12), "ptConverse-application-4#s2": sq(leg(12, 5)),
  "ptConverse-application-5#s2": 10 * 24 / 2, "ptConverse-application-5#s3": 10 + 24 + 26,
  "ptConverse-retention-3": leg(20, 16), "ptConverse-retention-5": leg(25, 7),
  "ptSpecial-basic-1": r2(hyp(4, 4)), "ptSpecial-basic-4": 10 / 2, "ptSpecial-basic-5": 3 * 2, "ptSpecial-basic-6": 6 * Math.sqrt(2) / Math.sqrt(2), "ptSpecial-basic-7": r3(leg(8, 4)),
  "ptSpecial-standard-1": r3(leg(6, 3)), "ptSpecial-standard-2": r2(hyp(8, 8)), "ptSpecial-standard-3": 6 * Math.sqrt(3) * 2 / Math.sqrt(3), "ptSpecial-standard-4": r2(10 / Math.sqrt(2)), "ptSpecial-standard-5": r3(4 * leg(4, 2) / 2), "ptSpecial-standard-6": r3(leg(14, 7)),
  "ptSpecial-application-1#s1": 10 / 2, "ptSpecial-application-1#s2": r3(leg(10, 5)), "ptSpecial-application-1#s3": r3(10 * leg(10, 5) / 2),
  "ptSpecial-application-2#s1": r2(12 / Math.sqrt(2)), "ptSpecial-application-2#s2": r3(12 * 2 / Math.sqrt(3)), "ptSpecial-application-2#s3": r3(12 / Math.sqrt(3)),
  "ptSpecial-application-3#s1": 6, "ptSpecial-application-3#s2": r3(leg(6, 3)), "ptSpecial-application-3#s3": r3(6 * (6 * leg(6, 3) / 2)),
  "ptSpecial-application-4#s1": r2(hyp(3, 3)), "ptSpecial-application-4#s2": sq(hyp(3, 3)),
  "ptSpecial-application-5#s1": 6, "ptSpecial-application-5#s2": r3(6 / Math.sqrt(3)), "ptSpecial-application-5#s3": r3(2 * 6 / Math.sqrt(3)),
  "ptSpecial-retention-1": r2(hyp(9, 9)), "ptSpecial-retention-2": 18 / 2, "ptSpecial-retention-3": r3(leg(14, 7)), "ptSpecial-retention-4": r2(hyp(11, 11)), "ptSpecial-retention-5": r3(leg(10, 5)),
  "ptPlane-basic-1": dist([1, 2], [4, 6]), "ptPlane-basic-2": hyp(5, 12), "ptPlane-basic-3": leg(10, 6), "ptPlane-basic-4": 2 * leg(5, 3), "ptPlane-basic-5": dist([0, 0], [6, 8]), "ptPlane-basic-7": leg(13, 12),
  "ptPlane-standard-1": dist([-2, 1], [3, 13]), "ptPlane-standard-2": 10 * leg(13, 5) / 2, "ptPlane-standard-3": leg(10, 6), "ptPlane-standard-4": hyp(5, 12), "ptPlane-standard-5": leg(5, (10 - 4) / 2), "ptPlane-standard-6": r5(dist([1, 1], [3, 5])),
  "ptPlane-application-1#s1": dist([-1, 2], [5, 2]), "ptPlane-application-1#s2": dist([-1, 2], [2, 6]),
  "ptPlane-application-2#s1": leg(10, 6), "ptPlane-application-2#s2": 2 * leg(10, 6),
  "ptPlane-application-3#s1": leg(10, 8), "ptPlane-application-3#s2": 10 - leg(10, 8), "ptPlane-application-3#s3": (64 - sq(10 - leg(10, 8))) / 16,
  "ptPlane-application-4#s1": (16 - 6) / 2, "ptPlane-application-4#s2": leg(13, 5), "ptPlane-application-4#s3": (6 + 16) * leg(13, 5) / 2,
  "ptPlane-application-5#s1": hyp(9, 12), "ptPlane-application-5#s2": 9 + 12 - hyp(9, 12), "ptPlane-application-5#s3": hyp(9, 12) / 30 * 60,
  "ptPlane-retention-1": dist([2, 3], [10, 18]), "ptPlane-retention-2": leg(17, 8), "ptPlane-retention-3": 2 * leg(25, 7), "ptPlane-retention-4": hyp(20, 21), "ptPlane-retention-5": leg(26, 10),
  "ptSolid-basic-1": hyp(3, 4, 12), "ptSolid-basic-2": r3(hyp(5, 5, 5)), "ptSolid-basic-3": leg(10, 6), "ptSolid-basic-4": leg(5, 3), "ptSolid-basic-6": hyp(12, 5), "ptSolid-basic-7": hyp(6, 8),
  "ptSolid-standard-1": hyp(2, 3, 6), "ptSolid-standard-2": 9 * leg(5, 3) / 3, "ptSolid-standard-3": hyp(3, 4), "ptSolid-standard-4": Math.sqrt(81 - 16 - 16), "ptSolid-standard-5": leg(13, 5), "ptSolid-standard-6": 6 * Math.sqrt(3) / Math.sqrt(3),
  "ptSolid-application-1#s1": hyp(6, 8), "ptSolid-application-1#s2": hyp(6, 8, 24),
  "ptSolid-application-2#s1": leg(13, 5), "ptSolid-application-2#s2": 25 * leg(13, 5) / 3, "ptSolid-application-2#s3": 2 * 5,
  "ptSolid-application-3#s1": r2(hyp(8, 8)), "ptSolid-application-3#s2": r2(hyp(8, 8) / 2), "ptSolid-application-3#s3": leg(9, hyp(8, 8) / 2),
  "ptSolid-application-4#s1": hyp(12, 9), "ptSolid-application-4#s2": hyp(12, 9, 8),
  "ptSolid-application-5#s2": 3 + 4, "ptSolid-application-5#s3": sq(hyp(3 + 4, 5)),
  "ptSolid-retention-1": hyp(6, 6, 7), "ptSolid-retention-2": leg(17, 8), "ptSolid-retention-3": r3(hyp(7, 7, 7)), "ptSolid-retention-4": leg(25, 24), "ptSolid-retention-5": leg(13, 5)
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

test("展開図の糸：縦と横の面を通る張り方が、ほかの2通りより短い", () => {
  const ways = [hyp(3 + 4, 5), hyp(3 + 5, 4), hyp(4 + 5, 3)];
  assert.equal(Math.min(...ways), hyp(3 + 4, 5));
});

test("中3 三平方の定理：円の次・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学3年"].slice(0, 7), ["多項式", "平方根", "二次方程式", "関数 y＝ax²", "相似", "円", U]);
  assert.deepEqual(E.UNITS[U], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck(U).questions.length, 5);
});
