// node --test tests/*.test.js — 中3 標本調査：答えを割合・平均から計算して確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "標本調査";
const SK = ["suMeaning", "suRandom", "suRatio", "suCount", "suMean"];
const all = Object.values(Q).filter((q) => q.unit === U);
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;

const est = (pop, hit, sample) => pop * hit / sample;           // 母集団 × 標本での割合
const pct = (hit, sample) => hit / sample * 100;
const cap = (marked, second, hit) => marked * second / hit;      // x : a ＝ b : c
const added = (put, second, hit) => cap(put, second, hit) - put;  // 入れた印つきの分を引く
const mean = (...v) => v.reduce((s, x) => s + x, 0) / v.length;

test("選ぶ問題：大きい標本を選ぶ・いちばん多い色・範囲外はとばす", () => {
  assert.equal(label(step("suRatio-application-4", "s3")), "標本の大きい B 班");
  assert.ok(est(10000, 4, 80) > est(10000, 2, 50));
  assert.equal(label(step("suRatio-application-3", "s3")), "青");
  assert.ok(27 > 15 && 27 > 18);
  assert.ok(92 > 80 && label(step("suRandom-application-3", "s2")) === "とばす");
  assert.equal(label(Q["suMean-standard-5"]), "標本 B");
  assert.equal(label(Q["suCount-basic-3"]), "x : a ＝ b : c");
  // 印の割合が小さいほど、推定は大きい
  assert.ok(cap(24, 30, 4) > cap(24, 30, 6) && label(Q["suCount-standard-4"]) === "大きくなる");
});

const EXPECT = {
  "suMeaning-basic-3": 50, "suMeaning-basic-4": 4800, "suMeaning-standard-3": 40, "suMeaning-standard-6": 720 - 105,
  "suMeaning-application-1#s2": 9000, "suMeaning-application-1#s3": 300,
  "suMeaning-application-2#s2": 24000 / 60, "suMeaning-application-2#s3": 24000 - 60,
  "suMeaning-application-3#s2": 12 * 4, "suMeaning-application-3#s3": pct(12 * 4, 480),
  "suMeaning-application-4#s2": 1300, "suMeaning-application-4#s3": 52000 / 1300,
  "suMeaning-application-5#s2": 200,
  "suMeaning-retention-3": 900, "suMeaning-retention-5": 2500 / 125,
  "suRandom-basic-5": 10 * 2, "suRandom-standard-3": 100,
  "suRandom-application-1#s2": 50, "suRandom-application-3#s1": 4 * 10 + 7, "suRandom-application-3#s3": 80,
  "suRandom-application-4#s3": 1200 / 40, "suRandom-application-5#s3": pct(600, 1500),
  "suRandom-retention-3": 60 - 12,
  "suRatio-basic-1": est(5000, 3, 100), "suRatio-basic-2": est(600, 12, 60), "suRatio-basic-3": pct(15, 50), "suRatio-basic-5": est(2000, 72, 80), "suRatio-basic-6": est(1200, 2, 40), "suRatio-basic-7": 8000 * 0.25,
  "suRatio-standard-1": est(3000, 60 - 18, 60), "suRatio-standard-2": est(4500, 150 - 120, 150), "suRatio-standard-3": est(15000, 74, 200), "suRatio-standard-4": est(9600, 9, 120), "suRatio-standard-5": 7500 * 0.04, "suRatio-standard-6": 90 / 4500 * 150,
  "suRatio-application-1#s1": pct(12, 300), "suRatio-application-1#s2": est(18000, 12, 300), "suRatio-application-1#s3": 18000 - est(18000, 12, 300),
  "suRatio-application-2#s1": pct(170, 200), "suRatio-application-2#s2": est(6000, 170, 200), "suRatio-application-2#s3": est(6000, 30, 200),
  "suRatio-application-3#s1": est(2400, 15, 60), "suRatio-application-3#s2": est(2400, 27, 60),
  "suRatio-application-4#s1": est(10000, 2, 50), "suRatio-application-4#s2": est(10000, 4, 80),
  "suRatio-application-5#s1": pct(6, 50), "suRatio-application-5#s2": est(4000, 6, 50), "suRatio-application-5#s3": est(4000, 44, 50) * 150,
  "suRatio-retention-1": est(8000, 4, 160), "suRatio-retention-2": est(900, 18, 45), "suRatio-retention-3": est(20000, 95, 250), "suRatio-retention-4": est(3500, 70 - 14, 70), "suRatio-retention-5": 6400 * 0.15,
  "suCount-basic-1": cap(40, 50, 8), "suCount-basic-2": added(100, 60, 12), "suCount-basic-4": cap(30, 45, 9), "suCount-basic-5": added(200, 100, 8), "suCount-basic-7": cap(60, 80, 12),
  "suCount-standard-1": added(500, 120, 15), "suCount-standard-2": cap(120, 90, 6), "suCount-standard-3": cap(85, 100, 17), "suCount-standard-5": added(50, 40, 4), "suCount-standard-6": 75 * 64 / 600,
  "suCount-application-1#s1": 48 / 6, "suCount-application-1#s2": cap(36, 48, 6),
  "suCount-application-2#s1": cap(150, 80, 6), "suCount-application-2#s2": added(150, 80, 6), "suCount-application-2#s3": added(150, 80, 6) * 25 / 100,
  "suCount-application-3#s1": cap(50, 40, 5), "suCount-application-3#s2": cap(50, 60, 5), "suCount-application-3#s3": cap(50, 40 + 60, 5 + 5),
  "suCount-application-4#s1": cap(24, 30, 4), "suCount-application-4#s3": cap(24, 30, 6),
  "suCount-application-5#s1": cap(40, 50, 4), "suCount-application-5#s2": added(40, 50, 4),
  "suCount-retention-1": cap(70, 55, 7), "suCount-retention-2": added(80, 72, 9), "suCount-retention-3": cap(45, 84, 12), "suCount-retention-4": 150 * 66 / 900, "suCount-retention-5": added(300, 150, 18), "suCount-retention-6": cap(90, 75, 15),
  "suMean-basic-1": mean(58, 62, 60, 61, 59), "suMean-basic-2": 52 * 400, "suMean-basic-4": mean(95, 105, 100, 100), "suMean-basic-5": 180 / 10, "suMean-basic-6": 3200 / 8, "suMean-basic-7": 7.5,
  "suMean-standard-1": 1000 / (25 / 20), "suMean-standard-2": mean(28, 31, 25, 30, 33, 27), "suMean-standard-3": 6000 / (200 / 50), "suMean-standard-4": mean(3, 5, 2, 6, 4) * 450, "suMean-standard-6": 5000 / (2 / 100),
  "suMean-application-1#s1": mean(63, 58, 61, 60, 63), "suMean-application-1#s2": mean(63, 58, 61, 60, 63) * 1200 / 1000,
  "suMean-application-2#s1": 135 / 30, "suMean-application-2#s2": 1800 / (135 / 30), "suMean-application-2#s3": 1800 / (135 / 30) / 40,
  "suMean-application-3#s1": 640 / 32, "suMean-application-3#s2": 75 * 640 / 60,
  "suMean-application-4#s1": 36 / 20, "suMean-application-4#s2": 1800 / (36 / 20), "suMean-application-4#s3": 300 * 1800 / (36 / 20) / 1000,
  "suMean-application-5#s1": 0.8 * 25000, "suMean-application-5#s2": 0.8 * 25000 / 1000, "suMean-application-5#s3": 0.8 * 25000 / 1000 * 365,
  "suMean-retention-1": mean(17, 16, 18, 13), "suMean-retention-2": 35 * 140, "suMean-retention-3": 9000 / (120 / 40), "suMean-retention-4": 14 * 540, "suMean-retention-5": 1200 / (30 / 50)
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

test("中3 標本調査：三平方の定理の次・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学3年"].slice(0, 8), ["多項式", "平方根", "二次方程式", "関数 y＝ax²", "相似", "円", "三平方の定理", U]);
  assert.deepEqual(E.UNITS[U], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck(U).questions.length, 5);
});
