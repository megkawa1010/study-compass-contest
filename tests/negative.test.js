// node --test tests/*.test.js — 中1 正負の数：答えを別の計算で確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const SK = ["negMeaning", "negAddSub", "negMulDiv", "negPower", "negUse"];
const all = Object.values(Q).filter((q) => q.unit === "正負の数");

// 問題の式を文字列のまま計算する。−3² は −(3²)、(−3)² はかっこごと2乗
function calc(src) {
  const js = src.replace(/\s/g, "").replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/")
    .replace(/\)²/g, ")**2").replace(/\)³/g, ")**3").replace(/(\d+)²/g, "($1**2)").replace(/(\d+)³/g, "($1**3)");
  return Function("return " + js)();
}
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);

test("「… を計算しましょう」は、式を計算した値と一致する", () => {
  const list = all.filter((q) => / を計算しましょう。$/.test(q.text));
  assert.ok(list.length >= 50, "確かめた数 " + list.length);
  list.forEach((q) => near(calc(q.text.replace(" を計算しましょう。", "")), q.answer, q.id));
});

const sum = (...a) => a.reduce((x, y) => x + y, 0), mean = (...a) => sum(...a) / a.length;
const EXPECT = {
  "negMeaning-basic-1": 0 - 5, "negMeaning-basic-3": Math.abs(-6), "negMeaning-basic-5": 4 - 9, "negMeaning-standard-2": -4,
  "negMeaning-standard-3": [-3, -2, -1, 0, 1, 2, 3].length, "negMeaning-standard-5": Math.ceil(-2.5),
  "negMeaning-application-1#s1": 8 - -3, "negMeaning-application-1#s2": 8 - -1, "negMeaning-application-1#s3": Math.min(-3, 8, -1),
  "negMeaning-application-2#s1": 54, "negMeaning-application-2#s2": 47, "negMeaning-application-2#s3": 4 - -3,
  "negMeaning-application-3#s1": 6 - -4, "negMeaning-application-3#s2": (6 + -4) / 2, "negMeaning-application-3#s3": 4,
  "negMeaning-retention-1": -18, "negMeaning-retention-3": 37, "negMeaning-retention-4": -12, "negMeaning-retention-5": 2 * 5 + 1,
  "negAddSub-application-1#s1": sum(8, -3, 5, -6, 1), "negAddSub-application-1#s2": mean(8, -3, 5, -6, 1), "negAddSub-application-1#s3": 60 + mean(8, -3, 5, -6, 1),
  "negAddSub-application-2#s1": sum(300, -500, 400), "negAddSub-application-2#s2": 1000 + sum(300, -500, 400), "negAddSub-application-2#s3": 1000 + 300 - 500,
  "negAddSub-application-3#s1": 3 + 4, "negAddSub-application-3#s2": 3 + 4 - 6, "negAddSub-application-3#s3": 3 + 4 - 6 + 1,
  "negMulDiv-application-1#s1": 4, "negMulDiv-application-1#s3": -2 * -3 * -5 * -1,
  "negMulDiv-application-2#s1": -3 * 5, "negMulDiv-application-2#s2": -3 * -4, "negMulDiv-application-2#s3": 12 - -15,
  "negMulDiv-application-3#s1": 6 * -4, "negMulDiv-application-3#s2": -24 * -2, "negMulDiv-application-3#s3": -24 / 3,
  "negPower-application-1#s1": (-2) ** 3, "negPower-application-1#s2": 3 * -4, "negPower-application-1#s3": (-2) ** 3 + 3 * -4,
  "negPower-application-2#s1": -(3 ** 2), "negPower-application-2#s2": (-2) ** 2, "negPower-application-2#s3": -(3 ** 2) - (-2) ** 2,
  "negPower-application-3#s1": 1 - 4, "negPower-application-3#s2": (1 - 4) ** 2, "negPower-application-3#s3": 6 - 2 * (1 - 4) ** 2,
  "negUse-basic-1": 107, "negUse-basic-2": 88, "negUse-basic-3": 46 - 50, "negUse-basic-4": mean(3, -1, 4), "negUse-basic-5": -5, "negUse-basic-6": sum(2, 6, -2),
  "negUse-standard-1": 70 + mean(5, -3, 7, -1), "negUse-standard-2": sum(10, -20, 30, 0, -5), "negUse-standard-3": 200 + 15 / 5, "negUse-standard-4": 20 + mean(-3, 1, 5), "negUse-standard-5": 3 - 8,
  "negUse-application-1#s1": 150 + 6, "negUse-application-1#s2": 6 - -8, "negUse-application-1#s3": 150 + mean(6, -4, 2, -8),
  "negUse-application-2#s1": sum(10, -5, 15, -10, 0), "negUse-application-2#s2": mean(10, -5, 15, -10, 0), "negUse-application-2#s3": 30 + mean(10, -5, 15, -10, 0),
  "negUse-application-3#s1": sum(200, -100, 300, -200, -50), "negUse-application-3#s2": mean(200, -100, 300, -200, -50), "negUse-application-3#s3": 1000 + mean(200, -100, 300, -200, -50),
  "negUse-retention-1": 250 + 36, "negUse-retention-2": 480 - 75, "negUse-retention-3": mean(13, -5, 22), "negUse-retention-4": 80 + mean(9, -6, 12, -3), "negUse-retention-5": 17 - 25
};

test("計算式でない数の答えは、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    near((st ? Q[id].steps.find((s) => s.id === st) : Q[id]).answer, want, key);
  });
  all.forEach((q) => (q.steps || [q]).filter((s) => s.type === "number").forEach((s) => {
    if (!q.steps && / を計算しましょう。$/.test(q.text)) return;
    const key = q.steps ? q.id + "#" + s.id : q.id;
    assert.ok(key in EXPECT, key + " を確かめていない");
  }));
});

test("大小の選択問題：正解の数がいちばん大きい。小さい順の問題は本当に小さい順", () => {
  assert.equal(Math.max(-3, -7), -3);
  assert.equal(Q["negMeaning-basic-2"].choices.find((c) => c.key === Q["negMeaning-basic-2"].answer).label, "−3");
  assert.equal(Q["negMeaning-retention-2"].choices.find((c) => c.key === Q["negMeaning-retention-2"].answer).label, "−14");
  const q = Q["negMeaning-standard-1"], a = q.choices.find((c) => c.key === q.answer).label.replace(/−/g, "-").split("、").map(Number);
  assert.deepEqual(a, a.slice().sort((x, y) => x - y));
});

test("正負の数の単元：中1で選べる・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学1年"][0], "正負の数");
  assert.deepEqual(E.UNITS["正負の数"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  const c = C.unitCheck("正負の数");
  assert.equal(c.questions.length, 5);
});
