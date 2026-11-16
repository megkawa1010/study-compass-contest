// node --test tests/*.test.js — 中3 相似：答えを比から計算して確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "相似";
const SK = ["smMeaning", "smCond", "smParallel", "smMidpoint", "smAreaVol"];
const all = Object.values(Q).filter((q) => q.unit === U);
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;

// a : b ＝ c : x の x
const prop4 = (a, b, c) => b * c / a;
// 3辺の組が相似か（小さい順に並べて比がそろうか）
const nums = (s) => s.split("、").map((t) => Number(t.replace(/[^0-9.]/g, "")));
const similar = (p, q) => {
  const a = [...p].sort((x, y) => x - y), b = [...q].sort((x, y) => x - y);
  return a.every((v, i) => Math.abs(b[i] / v - b[0] / a[0]) < 1e-9);
};
const third = (a, b) => 180 - a - b;
const cm = 100;

test("3辺の組・角の組を選ぶ問題：正解だけが相似になる", () => {
  [["smCond-basic-7", [2, 3, 4]], ["smCond-retention-3", [5, 7, 11]]].forEach(([id, base]) =>
    Q[id].choices.forEach((c) => assert.equal(similar(base, nums(c.label)), c.key === Q[id].answer, id + " " + c.label)));
  [["smCond-basic-6", 40, 75], ["smCond-retention-2", 35, 100]].forEach(([id, a, b]) =>
    Q[id].choices.forEach((c) => {
      const n = nums(c.label), ok = similar([a, b, third(a, b)], n) && n.reduce((s, v) => s + v, 0) === 180;
      assert.equal(ok, c.key === Q[id].answer, id + " " + c.label);
    }));
  // 「相似」と「相似ではない」の判定
  assert.ok(similar([4, 6, 8], [6, 9, 12]) && /相似$/.test(label(Q["smCond-basic-3"])));
  assert.ok(3 / 6 === 5 / 10 && /相似$/.test(label(Q["smCond-basic-4"])));
  assert.ok(!similar([6, 8, 10], [9, 12, 16]) && /^相似ではない/.test(label(Q["smCond-standard-4"])));
  assert.ok(!similar([5, 7, 9], [15, 21, 28]) && /^相似ではない/.test(label(Q["smCond-retention-5"])));
  // 対応する頂点：AB ＝ 4 ↔ FD ＝ 8、BC ＝ 5 ↔ DE ＝ 10、CA ＝ 6 ↔ EF ＝ 12
  assert.equal(label(step("smCond-application-3", "s2")), "△ABC ∽ △FDE");
  // DE : BC は AD : AB
  assert.equal(label(Q["smParallel-standard-5"]), "DE ∥ BC で、DE : BC ＝ 2 : 5");
  assert.equal(label(Q["smParallel-retention-5"]), "DE ∥ BC で、DE : BC ＝ 3 : 7");
  // 面積あたりの値段：L の相当額 2250 ＞ 2000
  assert.ok(1000 * 9 / 4 > 2000 && label(step("smAreaVol-application-1", "s3")) === "L");
});

const EXPECT = {
  "smMeaning-basic-1": prop4(2, 3, 8), "smMeaning-basic-3": third(50, 70), "smMeaning-basic-4": 6 * 3 / 9, "smMeaning-basic-6": prop4(5, 3, 20), "smMeaning-basic-7": 6 * 4 / 3,
  "smMeaning-standard-1": prop4(4, 10, 7), "smMeaning-standard-2": prop4(2, 5, 18), "smMeaning-standard-3": prop4(2, 1.5, 12), "smMeaning-standard-4": 4 * 25000 / cm,
  "smMeaning-application-1#s1": 12 * 2 / 8, "smMeaning-application-1#s2": prop4(8, 12, 10), "smMeaning-application-1#s3": prop4(8, 12, 6),
  "smMeaning-application-2#s2": prop4(1.6, 1, 20), "smMeaning-application-2#s3": prop4(1.6, 1, 8),
  "smMeaning-application-3#s1": 3 * 50000 / cm, "smMeaning-application-3#s2": 2000 * cm / 50000, "smMeaning-application-3#s3": 6 * 50000 / cm / 75,
  "smMeaning-retention-1": prop4(4, 5, 16), "smMeaning-retention-2": third(35, 85), "smMeaning-retention-3": 8 * 15 / 12, "smMeaning-retention-4": prop4(2.5, 2, 15), "smMeaning-retention-5": 7 * 20000 / cm,
  "smCond-standard-1": prop4(8, 6, 12), "smCond-standard-5": prop4(9, 6, 6), "smCond-retention-4": prop4(12, 8, 15),
  "smCond-application-1#s2": (4 + 2) * 2 / 4, "smCond-application-1#s3": prop4(4, 4 + 2, 6),
  "smCond-application-4#s3": 14 * 3 / 6, "smCond-application-5#s3": 6 * 6 / 9,
  "smParallel-application-4#s1": prop4(9, 3, 6), "smParallel-application-4#s2": prop4(9, 9 + 3, 12), "smParallel-application-4#s3": 6 + prop4(9, 3, 6),
  "smParallel-application-5#s1": 10 / 4 * 2, "smParallel-application-5#s2": 21 * 4 / 14, "smParallel-application-5#s3": 21 * 10 / 14,
  "smMidpoint-standard-6": third(48, 72), "smMidpoint-standard-7": 18 / 2,
  "smMidpoint-application-4#s1": 14 / 2, "smMidpoint-application-4#s2": 10 / 2, "smMidpoint-application-4#s3": (10 + 12 + 14) / 2,
  "smMidpoint-application-5#s1": 16 / 2, "smMidpoint-application-5#s2": 10 / 2, "smMidpoint-application-6#s1": 13 / 2, "smMidpoint-application-6#s2": 5 / 2, "smMidpoint-application-6#s3": (5 + 13) / 2,
  "smAreaVol-application-4#s1": (9 / 6 * 2) ** 2, "smAreaVol-application-4#s2": 40 * 27 / 8, "smAreaVol-application-4#s3": 180 * 4 / 9,
  "smCond-application-2#s3": 6 * 6 / 10, "smCond-application-3#s1": 8 / 4,
  "smParallel-basic-1": prop4(6, 3, 8), "smParallel-basic-2": prop4(10, 4, 15), "smParallel-basic-4": prop4(6, 9, 4), "smParallel-basic-5": prop4(5, 5 + 10, 4), "smParallel-basic-7": prop4(10, 4, 15),
  "smParallel-standard-1": prop4(3 + 6, 3, 12), "smParallel-standard-2": 5 + prop4(7, 14, 5), "smParallel-standard-3": 2 * 10 / 4, "smParallel-standard-4": prop4(6, 9, 4),
  "smParallel-application-1#s1": prop4(6 + 4, 6, 15), "smParallel-application-1#s2": prop4(6, 4, 9), "smParallel-application-1#s3": 9 + prop4(6, 4, 9),
  "smParallel-application-2#s2": 12 / 6, "smParallel-application-2#s3": 18 * 6 / (6 + 12),
  "smParallel-application-3#s1": 300 * 120 / (120 + 80), "smParallel-application-3#s2": 300 * 80 / (120 + 80),
  "smParallel-retention-1": prop4(8, 2, 12), "smParallel-retention-2": prop4(21, 7, 27), "smParallel-retention-3": prop4(15, 5, 21), "smParallel-retention-4": prop4(12, 20, 9),
  "smMidpoint-basic-1": 14 / 2, "smMidpoint-basic-3": 9 * 2, "smMidpoint-basic-4": 30 / 2, "smMidpoint-basic-5": 12 / 2, "smMidpoint-basic-7": 65,
  "smMidpoint-standard-1": 10 + 14, "smMidpoint-standard-2": (6 + 10) / 2, "smMidpoint-standard-4": 4, "smMidpoint-standard-5": 8 + 12 + 5 * 2,
  "smMidpoint-application-1#s1": 16 / 2, "smMidpoint-application-1#s2": 50, "smMidpoint-application-2#s1": 8 / 2, "smMidpoint-application-2#s2": 8 / 2,
  "smMidpoint-application-3#s1": 8 / 2, "smMidpoint-application-3#s2": 14 / 2, "smMidpoint-application-3#s3": (8 + 14) / 2,
  "smMidpoint-retention-1": 22 / 2, "smMidpoint-retention-2": 19 * 2, "smMidpoint-retention-3": 46 / 2, "smMidpoint-retention-4": (7 + 17) / 2, "smMidpoint-retention-5": 11 + 17,
  "smAreaVol-basic-1": 20 * 9 / 4, "smAreaVol-basic-4": 10 * 27, "smAreaVol-basic-5": (6 / 4 * 2) ** 2, "smAreaVol-basic-6": 5 ** 2, "smAreaVol-basic-7": Math.sqrt(25),
  "smAreaVol-standard-1": 36 * 3 ** 2 / 2 ** 2, "smAreaVol-standard-2": 5 * 3 ** 2, "smAreaVol-standard-3": 36 - 36 * 4 / 9, "smAreaVol-standard-4": 80 / 2 ** 3, "smAreaVol-standard-5": 64 - 64 / 2 ** 3,
  "smAreaVol-application-1#s1": (30 / 20 * 2) ** 2, "smAreaVol-application-1#s2": 1000 * 9 / 4,
  "smAreaVol-application-2#s1": (12 / 8 * 2) ** 3, "smAreaVol-application-2#s2": 160 * 27 / 8, "smAreaVol-application-2#s3": (12 / 8 * 2) ** 2,
  "smAreaVol-application-3#s1": 3 + 2, "smAreaVol-application-3#s2": 50 * 9 / 25, "smAreaVol-application-3#s3": 50 - 50 * 9 / 25,
  "smAreaVol-retention-1": 50 * 36 / 25, "smAreaVol-retention-2": 128 * 125 / 64, "smAreaVol-retention-3": Math.sqrt(81), "smAreaVol-retention-4": 7 * 4 ** 2, "smAreaVol-retention-5": 270 / 3 ** 3
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

test("中3 相似：関数 y＝ax² の次・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学3年"].slice(0, 5), ["多項式", "平方根", "二次方程式", "関数 y＝ax²", U]);
  assert.deepEqual(E.UNITS[U], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck(U).questions.length, 5);
});
