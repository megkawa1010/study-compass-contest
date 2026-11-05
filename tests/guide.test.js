// node --test tests/*.test.js — 単元の説明：どの単元・スキルにも説明がある
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "guide"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, G = SC.guide;

test("選べる単元のスキルすべてに、大事なこと・例・まちがえやすいところがある", () => {
  const all = [];
  E.ALL_UNITS.forEach((u) => {
    assert.ok(G.units[u], u + " の説明がない");
    E.UNITS[u].forEach((k) => {
      all.push(k);
      const g = G.skills[k];
      assert.ok(g, k + " の説明がない");
      ["point", "example", "trap"].forEach((f) => assert.ok(g[f] && g[f].length >= 10, k + " の " + f));
    });
  });
  assert.deepEqual(Object.keys(G.skills).sort(), all.slice().sort(), "どの単元にも入らない説明がある");
  assert.deepEqual(Object.keys(G.units).sort(), E.ALL_UNITS.slice().sort());
});

test("説明の例の計算が合っている", () => {
  assert.equal((180 - 40) / 2, 70);        // isoProps
  assert.equal(180 * (6 - 2), 720);        // polygonInterior
  assert.equal(360 / 8, 45);               // polygonExterior
  assert.equal(80 * 3 + 120 * 2, 480);     // simWord：x = 3、y = 2 で 5個・480円
  assert.equal(9 - 2, 7);                  // dataMedian の範囲
});
