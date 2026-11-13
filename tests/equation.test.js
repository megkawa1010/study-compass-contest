// node --test tests/*.test.js — 中1 一次方程式と、学年の切りかえ
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep", "guide"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const SK = ["eqMeaning", "eqProperty", "transpose", "eqParen", "eqFraction", "eqWord"];

// 「3(x − 1) + 2」のような式を、x の値で計算する（bank.js とは別に、文字列から計算する）
function evalSide(src, x) {
  const js = src.replace(/−/g, "-").replace(/÷/g, "/").replace(/\s/g, "")
    .replace(/(\d|\))x/g, "$1*x").replace(/(\d|\))\(/g, "$1*(").replace(/x\(/g, "x*(");
  return Function("x", "return " + js)(x);
}

test("「方程式 … を解きましょう」の答えを、元の式に代入すると左辺と右辺が等しい", () => {
  let n = 0;
  Object.values(Q).filter((q) => SK.includes(q.skill) && /^方程式 .+ を解きましょう。$/.test(q.text)).forEach((q) => {
    const [l, r] = q.text.replace("方程式 ", "").replace(" を解きましょう。", "").split(" = ");
    assert.ok(Math.abs(evalSide(l, q.answer) - evalSide(r, q.answer)) < 1e-9, q.id + " " + q.text);
    n++;
  });
  assert.ok(n >= 50, "確かめた数 " + n);
});

const STEPS = {
  "eqMeaning-application-1": [2 * 3 + 3, 2 * 4 + 3, null], "eqMeaning-application-2": [3 * 2 - 1, 2 + 5, null], "eqMeaning-application-3": [null, 3 * 100 + 100, null],
  "eqProperty-application-1": [6, 15 - 6, (15 - 6) / 3], "eqProperty-application-2": [2, 4 + 2, (4 + 2) * 3], "eqProperty-application-3": [10, 28, 2.8 / 0.4],
  "transpose-application-1": [4 - 2, 11 - 3, (11 - 3) / 2], "transpose-application-2": [-3 - 1, -5 - 7, -12 / -4], "transpose-application-3": [null, 9 + 3, 12 / 3],
  "eqParen-application-1": [6, -4, 5], "eqParen-application-2": [8 - 3, -4 - 6, 25 / 5], "eqParen-application-3": [null, 5, 8],
  "eqFraction-application-1": [6, 3, 3], "eqFraction-application-2": [10, 2, 6], "eqFraction-application-3": [6, 6, 8],
  "eqWord-application-3": [null, 12, 6]
};
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " と " + b);

test("応用の小問の答えと、元の方程式の確かめ", () => {
  Object.entries(STEPS).forEach(([id, want]) => {
    assert.equal(Q[id].steps.length, want.length, id);
    Q[id].steps.forEach((s, i) => {
      if (want[i] === null) assert.ok(s.choices.some((c) => c.key === s.answer), id);
      else near(s.answer, want[i]);
    });
  });
  near(2 * (5 + 3), 4 * (5 - 1));
  near(4 * (2 * 5 - 1) - 3 * (5 + 2), 15);
  near(2 * (5 + 5 + 3), 26);
  near(3 / 3 + 1 / 2, 3 / 2);
  near(0.3 * 6 - 0.5, 0.1 * 6 + 0.7);
  near((2 * 8 - 1) / 3, (8 + 2) / 2);
  near(6 / 4 + 6 / 6, 2.5);
});

test("文章題の答え：場面に戻して確かめる", () => {
  near(Q["eqWord-basic-2"].answer - 6, 11);
  near(Q["eqWord-basic-3"].answer * 4, 36);
  near(Q["eqWord-basic-4"].answer * 3, 450);
  near(Q["eqWord-standard-3"].answer * 4, 48);
  near(Q["eqWord-basic-6"].answer * 2 + 3, 19);
  near(Q["eqWord-basic-7"].answer * 3 - 4, 23);
  near(Q["eqWord-standard-4"].answer * 60 + 180, 480);
  near(Q["eqWord-standard-5"].answer * 3 + 5, Q["eqWord-standard-5"].answer * 4 - 2);
  near(Q["eqWord-retention-2"].answer + 9, 20);
  near(Q["eqWord-retention-3"].answer * 5, 65);
  near(Q["eqWord-retention-4"].answer * 3, 45);
  near(Q["eqWord-retention-5"].answer * 50 + 150, 400);
});

test("どのスキルも 基礎5・標準5・応用3・定着5 以上ある。はじめのチェックが作れる", () => {
  SK.forEach((k) => assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k + JSON.stringify(["basic", "standard", "application", "retention"].map((l) => B.index[k][l].length))));
  const c = C.unitCheck("一次方程式");
  assert.equal(c.questions.length, 5);
});

test("学年を切りかえると選べる単元が変わり、もとに戻せる。準備中の学年には変わらない", () => {
  const g2 = E.SELECTABLE_UNITS.slice();
  assert.equal(E.grade(), "中学2年");
  assert.equal(E.setGrade("中学3年"), "中学2年");
  assert.deepEqual(E.SELECTABLE_UNITS, g2);
  assert.equal(E.setGrade("中学1年"), "中学1年");
  assert.deepEqual(E.SELECTABLE_UNITS, ["正負の数", "文字と式", "一次方程式", "比例と反比例", "平面図形", "空間図形", "データの分布"]);
  assert.ok(SC.testprep && E.ALL_UNITS.includes("一次方程式") && E.ALL_UNITS.includes("確率"));
  E.setGrade("中学2年");
  assert.deepEqual(E.SELECTABLE_UNITS, g2);
});
