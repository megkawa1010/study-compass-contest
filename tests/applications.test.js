// node --test tests/*.test.js — 中2 前半の単元に足した応用問題：答えを別の計算で確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank;

// 2元1次の連立方程式 a1x + b1y = c1、a2x + b2y = c2 をクラメルの公式で解く（bank.js の解説とは別の計算）
function solve([a1, b1, c1], [a2, b2, c2]) {
  const d = a1 * b2 - a2 * b1;
  return { x: (c1 * b2 - c2 * b1) / d, y: (a1 * c2 - a2 * c1) / d };
}
const interior = (n) => 180 * (n - 2);

// 問題 id → 小問の答えの並び（選択の小問は null）
const EXPECT = {
  "polyAddSub-application-1": [2 + 1, 2 * (2 + 1), 2 * ((2 * 2 + 3) + (2 + 4))],
  "polyAddSub-application-2": [3 - 1, -2 - 4, (3 * 1 - 2 * -1) - (1 + 4 * -1)],
  "polyAddSub-application-3": [3, 10 + 11 + 12, (10 + 11 + 12) / 11],
  "polyMixed-application-3": ["3x+4y", 2 * (3 * -1 - 2) - 3 * (-1 - 2 * 2)],
  "eqTransform-application-3": [null, (2 * 24) / 8, (2 * 21) / 6],
  "simMeaning-application-1": [4 + 3, 2 * 4 - 3, null],
  "simMeaning-application-2": [3 * 2 + 1, 2 - 1, null],
  "simMeaning-application-3": [[1, 2, 3, 4].length, 2, 3],
  "simCoef-application-1": [3, 2, solve([3, 2, 12], [5, -3, 1]).x],
  "simCoef-application-2": [3, 2, solve([2, 3, 13], [3, 4, 18]).y],
  "simCoef-application-3": [12, 3, solve([4, -3, 6], [6, 5, 28]).y],
  "simSubst-application-3": [3 + 4, solve([2, -1, 1], [3, 2, 12]).x, solve([2, -1, 1], [3, 2, 12]).y],
  "simParen-application-1": [1, solve([2, 1, 7], [3, -2, 0]).x, solve([2, 1, 7], [3, -2, 0]).y],
  "simParen-application-2": [10 + 3, 15 - 5, solve([3, 2, 13], [4, -1, 10]).x],
  "simParen-application-3": [9 + 2, 3 + 6, solve([5, -2, 11], [1, 3, 9]).y],
  "simFraction-application-1": [18, solve([3, 2, 18], [1, -1, -4]).x, solve([3, 2, 18], [1, -1, -4]).y],
  "simFraction-application-2": [10, solve([2, 3, 13], [1, -1, -1]).x, solve([2, 3, 13], [1, -1, -1]).y],
  "simFraction-application-3": [6, 10, solve([2, -3, 6], [1, 2, 10]).x],
  "change-application-3": [12 - 5, 48 - 20, (48 - 20) / (12 - 5)],
  "substitution-application-3": [24 - 3 * 4, (24 - 6) / 3, 24 / 3],
  "rate-application-3": [3 * 2 + 1, 3 * 6 + 1, (19 - 7) / (6 - 2)],
  "slopeIntercept-application-3": [4, (0 - 4) / (2 - 0), -2 * 3 + 4],
  "form-application-3": [(19 - 9) / (3 - 1), 9 - 5 * 1, 5 * 10 + 4],
  "simGraph-application-3": [solve([3, -1, 1], [1, 1, 11]).x, solve([3, -1, 1], [1, 1, 11]).y, ((11 - -1) * 3) / 2],
  "lineAngles-application-1": [62, 180 - 62, 180 - 62],
  "lineAngles-application-2": [180 / 6, (180 / 6) * 2, (180 / 6) * 3],
  "lineAngles-application-3": [180 - 40 - 75, 40, 360],
  "angleEq-application-2": [10 + 15, 2 * 25 + 10, 180 - (3 * 25 - 15)],
  "angleEq-application-3": [180, (180 - 20) / 4, 2 * 40],
  "angleNames-application-1": [null, 65, null],
  "angleNames-application-2": [null, 70, 70],
  "angleNames-application-3": [110, 180 - 110, 180],
  "parallelAngles-application-3": [40, 30, 40 + 30],
  "triangleSum-application-3": [2 + 3 + 4, 180 / 9, (180 / 9) * 4],
  "angleCombo-application-3": [50 + 60, (50 + 60) / 2, 180 - 50 - 60 + (50 + 60) / 2],
  "polygonInterior-application-3": [interior(9), interior(9) / 9, 360 / 9],
  "polygonExterior-application-1": [360 / 24, 180 - 24, interior(15)],
  "polygonExterior-application-2": [60 + 70 + 80 + 90, 360 - 300, 180 - 60],
  "polygonExterior-application-3": [180 / 4, 360 / 45, interior(8)],
  "congCorr-application-3": [50, 180 - 50 - 60, 7],
  "congCond-application-3": [null, null, null],
  "proofFigureFacts-application-2": [null, null, null],
  "proofFigureFacts-application-3": [null, null, null],
  "proofHypConc-application-2": [null, null, null],
  "proofHypConc-application-3": [null, null, null],
  "congUse-application-2": [5, 7, 5 + 6 + 7],
  "congUse-application-3": [null, 8, null]
};

test("足した応用問題：小問の答えは別の計算と一致する。選択は正解の位置が選択肢にある", () => {
  Object.entries(EXPECT).forEach(([id, want]) => {
    const q = Q[id];
    assert.ok(q, id + " がない");
    assert.equal(q.type, "steps", id);
    assert.equal(q.level, "application", id);
    assert.equal(q.steps.length, want.length, id);
    q.steps.forEach((s, i) => {
      if (want[i] === null) {
        assert.equal(s.type, "choice", id + "#" + s.id);
        assert.ok(s.choices.some((c) => c.key === s.answer), id + "#" + s.id);
      } else assert.equal(s.answer, want[i], id + "#" + s.id);
    });
  });
});

test("問題文の連立方程式は、解いた値を入れると元の式が成り立つ", () => {
  const ok = (v, x) => assert.ok(Math.abs(v - x) < 1e-9, v + " と " + x);
  ok(2 * (2 + 3) - 3, 7); ok(3 * 2 - 2 * 3, 0);                 // simParen-1
  ok(3 * (3 - 1) + 2 * 2, 10); ok(4 * 3 - (2 - 5), 15);               // simParen-2
  ok(5 * 3 - 2 * (2 + 1), 9); ok(3 + 3 * (2 - 2), 3);           // simParen-3
  ok(2 / 2 + 6 / 3, 3); ok(2 - 6, -4);                           // simFraction-1
  ok(0.2 * 2 + 0.3 * 3, 1.3); ok(2 - 3, -1);                     // simFraction-2
  ok(6 / 3 - 2 / 2, 1); ok(0.1 * 6 + 0.2 * 2, 1);                // simFraction-3
});

test("どのスキルにも応用が3問以上ある（証明の組み立ては別の作りなので2問）", () => {
  E.SELECTABLE_UNITS.forEach((u) => E.UNITS[u].forEach((k) => {
    assert.ok(B.index[k].application.length >= (k === "proofBuild" ? 2 : 3), k + " " + B.index[k].application.length);
  }));
});
