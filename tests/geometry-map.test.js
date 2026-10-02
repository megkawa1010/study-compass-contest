// node --test tests/*.test.js — 中2 図形の角：学習マップ
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine"].forEach((f) => require("../js/" + f + ".js"));
const E = globalThis.SC.engine;
const GEO = ["lineAngles", "angleEq", "angleNames", "parallelAngles", "triangleSum", "exteriorAngle", "angleCombo", "polygonInterior", "polygonExterior"];

test("図形の角のスキルが地図にあり、前提は図形の性質側と計算側に分かれる", () => {
  assert.deepEqual(E.UNITS["図形の角"], GEO);
  assert.equal(E.SKILLS.angleBasics.unit, "既習");
  GEO.forEach((k) => {
    const s = E.SKILLS[k];
    assert.deepEqual(s.prerequisites, s.concept.concat(s.calc), k);
    s.prerequisites.forEach((p) => assert.ok(E.SKILLS[p], k + " の前提 " + p));
    assert.ok(E.ROOT_ORDER.includes(k) && E.SKILL_ORDER.includes(k));
  });
  assert.ok(!E.SKILL_ORDER.some((k) => /reason/i.test(k)), "根拠は独立スキルにしない");
});

test("角度の計算は一次方程式につながる。角の性質の前提と、方程式の前提は混ぜない", () => {
  assert.deepEqual(E.prereqSide("angleEq", "calc"), ["likeTerms", "transpose"]);
  assert.deepEqual(E.prereqSide("angleEq", "concept"), ["lineAngles"]);
  assert.deepEqual(E.prereqSide("polygonInterior", "calc"), ["eqParen"]);
  GEO.forEach((k) => E.prereqSide(k, "concept").forEach((p) => assert.ok(["図形の角", "既習"].includes(E.SKILLS[p].unit) && !["transpose", "likeTerms", "eqParen", "eqProperty"].includes(p), k + "→" + p)));
  // 図形以外のスキルは、これまでどおり全部が concept
  assert.deepEqual(E.prereqSide("form", "concept"), E.SKILLS.form.prerequisites);
  assert.deepEqual(E.prereqSide("form", "calc"), []);
});

test("学校のようす：角度を式で表す・角の組み合わせは選択肢に出さず、ついていくスキルと同じ状態", () => {
  assert.deepEqual(E.schoolOptions("図形の角"), ["lineAngles", "angleNames", "parallelAngles", "triangleSum", "exteriorAngle", "polygonInterior", "polygonExterior"]);
  const a = E.expandUnit("図形の角", "learning", "lineAngles");
  assert.equal(a.lineAngles, "current");
  assert.equal(a.angleEq, "current");
  assert.equal(a.angleNames, "not_learned");
  const b = E.expandUnit("図形の角", "learning", "exteriorAngle");
  assert.equal(b.angleEq, "learned");
  assert.equal(b.angleCombo, "current");
  assert.equal(b.polygonInterior, "not_learned");
  assert.deepEqual(Object.keys(b), GEO, "単元の順に並ぶ");
  // 一次関数など、follows のない単元はこれまでどおり
  assert.deepEqual(E.expandUnit("一次関数", "learning", "rate"), { change: "learned", substitution: "learned", rate: "current", slopeIntercept: "not_learned", form: "not_learned", simGraph: "not_learned" });
});
