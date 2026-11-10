// node --test tests/*.test.js — 中1 平面図形：答えを別の計算で確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const SK = ["plLine", "plMove", "plConstruct", "plCircle", "plSector"];
const all = Object.values(Q).filter((q) => q.unit === "平面図形");
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const pt = (x, y) => "(" + [x, y].map((v) => (v < 0 ? "−" + -v : String(v))).join(", ") + ")";

test("円とおうぎ形：□π の □ と、半径・中心角が公式どおり", () => {
  const rules = [
    [/^半径 (\d+)cm、中心角 (\d+)° のおうぎ形の弧の長さ/, (r, a) => (2 * r * a) / 360],
    [/^半径 (\d+)cm、中心角 (\d+)° のおうぎ形の面積/, (r, a) => (r * r * a) / 360],
    [/^半径 (\d+)cm、弧の長さ (\d+)π cm のおうぎ形の中心角/, (r, l) => (l / (2 * r)) * 360],
    [/^半径 (\d+)cm、面積 (\d+)π cm² のおうぎ形の中心角/, (r, s) => (s / (r * r)) * 360],
    [/^半径 (\d+)cm、弧の長さ (\d+)π cm のおうぎ形の面積/, (r, l) => (l * r) / 2],
    [/^半径 (\d+)cm の円の円周/, (r) => 2 * r],
    [/^直径 (\d+)cm の円の円周/, (d) => d],
    [/^半径 (\d+)cm の円の面積/, (r) => r * r],
    [/^円周が (\d+)π cm の円の半径/, (c) => c / 2],
    [/^面積が (\d+)π cm² の円の半径/, (s) => Math.sqrt(s)]
  ];
  let n = 0;
  all.filter((q) => q.type === "number").forEach((q) => {
    for (const [re, f] of rules) {
      const m = q.text.match(re);
      if (m) { near(q.answer, f(...m.slice(1).map(Number)), q.id); n++; break; }
    }
  });
  assert.ok(n >= 25, "確かめた数 " + n);
});

test("図形の移動：座標の答えが、移動のきまりで計算した点と一致する", () => {
  const want = {
    "plMove-basic-6": pt(2 + 3, 1 + 2), "plMove-basic-8": pt(-3 - 1, 2 - 4), "plMove-standard-6": pt(-5, -1), "plMove-basic-9": pt(-1, -4), "plMove-basic-7": pt(3, -4), "plMove-standard-1": pt(2, 5), "plMove-standard-2": pt(-4, 3),
    "plMove-retention-2": pt(-1 + 4, 6 - 7), "plMove-retention-3": pt(7, 8), "plMove-retention-4": pt(6, 9), "plMove-retention-5": pt(11, 12)
  };
  Object.entries(want).forEach(([id, p]) => assert.equal(label(Q[id]), p, id));
  const sl = (id, s) => step(id, s).choices.find((c) => c.key === step(id, s).answer).label;
  assert.equal(sl("plMove-application-1", "s1"), pt(1 - 5, 2 - 3));
  assert.equal(sl("plMove-application-1", "s2"), pt(4 - 5, 2 - 3));
  assert.equal(sl("plMove-application-2", "s1"), pt(2, -3));
  assert.equal(sl("plMove-application-2", "s2"), pt(-2, -3));
  assert.equal(sl("plMove-application-4", "s1"), pt(2, -1));
  assert.equal(sl("plMove-application-4", "s2"), pt(2, 1));
  // 座標の選択肢は、どれも別の点
  all.filter((q) => q.skill === "plMove" && q.choices && /座標/.test(q.text)).forEach((q) => assert.equal(new Set(q.choices.map((c) => c.label)).size, 4, q.id));
});

const EXPECT = {
  "plLine-standard-1": 10 / 2, "plLine-standard-2": 4, "plLine-standard-4": 7 + 5, "plLine-retention-4": 18 / 2, "plLine-retention-5": 13 + 9,
  "plConstruct-basic-5": 80 / 2, "plConstruct-standard-3": 90 / 2, "plConstruct-standard-5": 180 / 2, "plConstruct-retention-2": 140 / 2, "plConstruct-retention-5": 64 / 4,
  "plCircle-standard-5": 90, "plSector-basic-6": 360 / 120,
  "plLine-application-1#s1": 16 / 2, "plLine-application-1#s2": 16 / 4, "plLine-application-1#s3": 16 - 16 / 4, "plLine-application-2#s3": 5,
  "plLine-application-3#s1": 6, "plLine-application-3#s2": (10 * 6) / 2,
  "plMove-application-1#s3": 4 - 1, "plMove-application-4#s3": 1 - -1, "plMove-application-2#s3": 180, "plMove-application-3#s1": 360 / 6, "plMove-application-3#s2": (360 / 6) * 2,
  "plConstruct-application-1#s1": 120 / 2, "plConstruct-application-1#s2": 120 / 4, "plConstruct-application-2#s2": 10 / 2, "plConstruct-application-2#s3": 90,
  "plConstruct-application-3#s1": 180 - 70 - 50, "plConstruct-application-3#s2": (180 - 70 - 50) / 2, "plConstruct-application-3#s3": 70 / 2,
  "plCircle-application-1#s1": 2 * 6, "plCircle-application-1#s2": 6 * 6, "plCircle-application-1#s3": 2 * 6,
  "plCircle-application-2#s1": 4 * 4, "plCircle-application-2#s2": 8 * 8, "plCircle-application-2#s3": (8 * 8) / (4 * 4),
  "plCircle-application-3#s1": 90, "plCircle-application-3#s3": (3 * 4) / 2,
  "plSector-application-1#s1": (2 * 12 * 30) / 360, "plSector-application-1#s2": (12 * 12 * 30) / 360, "plSector-application-1#s3": (2 * 12 * 30) / 360,
  "plSector-application-2#s1": 360 / 6, "plSector-application-2#s2": (15 * 15) / 6, "plSector-application-2#s3": (2 * 15) / 6,
  "plSector-application-3#s1": (3 / 12) * 360, "plSector-application-3#s2": (36 * 3) / 12, "plSector-application-3#s3": 36
};

test("そのほかの数の問題と応用の小問は、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    near(st ? step(id, st).answer : Q[id].answer, want, key);
  });
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number").forEach((s) => assert.ok(q.id + "#" + s.id in EXPECT, q.id + "#" + s.id + " を確かめていない")));
});

test("平面図形の単元：順番・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学1年"].slice(0, 5), ["正負の数", "文字と式", "一次方程式", "比例と反比例", "平面図形"]);
  assert.deepEqual(E.UNITS["平面図形"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck("平面図形").questions.length, 5);
});
