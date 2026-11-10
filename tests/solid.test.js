// node --test tests/*.test.js — 中1 空間図形：答えを別の計算で確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const SK = ["spSolid", "spPosition", "spNet", "spArea", "spVolume"];
const all = Object.values(Q).filter((q) => q.unit === "空間図形");
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const KAN = { 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十二: 12 };

test("角柱・角錐の面・辺・頂点の数が、n 角柱・n 角錐のきまりと一致する", () => {
  let n = 0;
  all.filter((q) => q.type === "number").forEach((q) => {
    const m = q.text.match(/^(十二|三|四|五|六|七|八|九|十)角(柱|錐)の(面|辺|頂点)の数/);
    if (!m) return;
    const k = KAN[m[1]], prism = m[2] === "柱";
    const want = { 面: prism ? k + 2 : k + 1, 辺: prism ? 3 * k : 2 * k, 頂点: prism ? 2 * k : k + 1 }[m[3]];
    near(q.answer, want, q.id); n++;
  });
  assert.ok(n >= 9, "確かめた数 " + n);
});

const EXPECT = {
  "spSolid-basic-7": 6, "spSolid-standard-3": 5,
  "spArea-basic-5": 3 * 3, "spArea-basic-7": 10 * 2 + 40, "spArea-standard-5": 4 * 4 + ((4 * 5) / 2) * 4,
  "spVolume-standard-3": (6 * 6 * 5) / 3, "spVolume-standard-5": 48 / (4 * 4),
  "spArea-application-4#s1": 10 * 2 * 3, "spArea-application-4#s2": 3 * 3 * 2, "spArea-application-4#s3": 10 * 2 * 3 + 3 * 3 * 2,
  "spArea-application-5#s1": 4 * 4, "spArea-application-5#s2": 4 * 4 * 5, "spArea-application-5#s3": 4 * 4 * 6,
  "spPosition-application-4#s1": 4, "spPosition-application-4#s3": 2,
  "spSolid-application-1#s1": 5 + 1, "spSolid-application-1#s2": 5 * 2, "spSolid-application-1#s3": 5 + 1,
  "spSolid-application-3#s1": 8, "spSolid-application-3#s3": 4,
  "spPosition-application-1#s1": 3, "spPosition-application-1#s2": 4, "spPosition-application-2#s2": 3, "spPosition-application-3#s1": 3,
  "spNet-application-1#s1": 2 * 4, "spNet-application-1#s2": 12, "spNet-application-1#s3": (360 * 4) / 12,
  "spNet-application-2#s1": 8, "spNet-application-2#s2": 2 * 5, "spNet-application-2#s3": 2,
  "spNet-application-3#s1": 6, "spNet-application-3#s2": 1, "spNet-application-3#s3": 12 - (6 - 1),
  "spArea-application-1#s1": 2 * 2, "spArea-application-1#s2": 2 * 2 * 6, "spArea-application-1#s3": 2 * 2 * 2 + 2 * 2 * 6,
  "spArea-application-2#s1": 4 * 4, "spArea-application-2#s2": 4 * 10, "spArea-application-2#s3": 4 * 4 + 4 * 10,
  "spArea-application-3#s1": 3 * 4, "spArea-application-3#s2": 2 * (3 + 4) * 5, "spArea-application-3#s3": 2 * (12 + 15 + 20),
  "spVolume-application-1#s1": 9 * 6, "spVolume-application-1#s2": (9 * 6) / 3, "spVolume-application-1#s3": 3,
  "spVolume-application-2#s1": (4 * 216) / 3, "spVolume-application-2#s2": 36 * 12, "spVolume-application-2#s3": (36 * 12) / ((4 * 216) / 3),
  "spVolume-application-3#s1": 10 * 8 * 6, "spVolume-application-3#s2": 64 / 80, "spVolume-application-3#s3": 6 + 64 / 80
};

// 直方体：上の面 ABCD、A の真下が E。PQRS-TUVW も同じ並び
const P3 = { A: [0, 0, 1], B: [1, 0, 1], C: [1, 1, 1], D: [0, 1, 1], E: [0, 0, 0], F: [1, 0, 0], G: [1, 1, 0], H: [0, 1, 0] };
const EDGES = ["AB", "BC", "CD", "DA", "EF", "FG", "GH", "HE", "AE", "BF", "CG", "DH"];
const vec = (e) => P3[e[1]].map((v, i) => v - P3[e[0]][i]);
const rel = (e, f) => {
  const u = vec(e), v = vec(f), cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  if (cross.every((c) => c === 0)) return "平行な";
  if ([...e].some((p) => f.includes(p))) return u[0] * v[0] + u[1] * v[1] + u[2] * v[2] === 0 ? "垂直に交わる" : "交わる";
  return "ねじれの位置にある";
};
const toABC = (s) => s.replace(/[P-W]/g, (c) => "ABCDEFGH"["PQRSTUVW".indexOf(c)]);
const same = (e, f) => e === f || e === f[1] + f[0];

test("直方体の辺の位置関係：選んだ辺・数が、座標で調べた関係と一致する", () => {
  let n = 0;
  all.filter((q) => q.skill === "spPosition").forEach((q) => {
    const m = toABC(q.text).match(/辺 ([A-H]{2}) と(平行な|ねじれの位置にある|垂直に交わる)辺(はどれ|はいくつ)/);
    if (!m) return;
    const hits = EDGES.filter((e) => !same(e, m[1]) && rel(m[1], e) === m[2]);
    if (m[3] === "はいくつ") near(q.answer, hits.length, q.id);
    else q.choices.forEach((c) => assert.equal(hits.some((e) => same(e, toABC(c.label).slice(1))), c.key === q.answer, q.id + " " + c.label));
    n++;
  });
  assert.ok(n >= 9, "確かめた数 " + n);
  near(Q["spPosition-standard-4"].answer, EDGES.filter((e) => vec(e)[2] !== 0).length);
});

test("円錐・円柱の展開図、表面積、体積が公式どおり", () => {
  const rules = [
    [/^底面の半径 (\d+)cm、母線 (\d+)cm の円錐の展開図で、側面のおうぎ形の中心角/, (r, l) => (360 * r) / l],
    [/^底面の半径 (\d+)cm の円柱の展開図で、側面の長方形の横の長さ/, (r) => 2 * r],
    [/^1辺 (\d+)cm の立方体の表面積/, (a) => 6 * a * a],
    [/^1辺 (\d+)cm の立方体の体積/, (a) => a ** 3],
    [/^縦 (\d+)cm、横 (\d+)cm、高さ (\d+)cm の直方体の表面積/, (a, b, c) => 2 * (a * b + b * c + c * a)],
    [/^縦 (\d+)cm、横 (\d+)cm、高さ (\d+)cm の直方体の体積/, (a, b, c) => a * b * c],
    [/^底面の半径 (\d+)cm、高さ (\d+)cm の円柱の側面積/, (r, h) => 2 * r * h],
    [/^底面の半径 (\d+)cm、高さ (\d+)cm の円柱の表面積/, (r, h) => 2 * r * r + 2 * r * h],
    [/^底面の半径 (\d+)cm、高さ (\d+)cm の円柱の体積/, (r, h) => r * r * h],
    [/^底面の半径 (\d+)cm、高さ (\d+)cm の円錐の体積/, (r, h) => (r * r * h) / 3],
    [/^底面の半径 (\d+)cm、母線 (\d+)cm の円錐の側面積/, (r, l) => r * l],
    [/^底面の半径 (\d+)cm、母線 (\d+)cm の円錐の表面積/, (r, l) => r * r + r * l],
    [/^半径 (\d+)cm の球の表面積/, (r) => 4 * r * r],
    [/^半径 (\d+)cm の球の体積/, (r) => (4 * r ** 3) / 3],
    [/^底面積 (\d+)cm²、高さ (\d+)cm の角柱の体積/, (s, h) => s * h],
    [/^底面積 (\d+)cm²、高さ (\d+)cm の角錐の体積/, (s, h) => (s * h) / 3]
  ];
  let n = 0;
  all.filter((q) => q.type === "number" && ["spNet", "spArea", "spVolume"].includes(q.skill)).forEach((q) => {
    const hit = rules.find(([re]) => re.test(q.text));
    if (hit) { near(q.answer, hit[1](...q.text.match(hit[0]).slice(1).map(Number)), q.id); n++; }
    else assert.ok(q.id in EXPECT, q.id + " を確かめていない");
  });
  assert.ok(n >= 25, "確かめた数 " + n);
});


test("そのほかの数の問題と応用の小問は、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    near(st ? step(id, st).answer : Q[id].answer, want, key);
  });
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number").forEach((s) => assert.ok(q.id + "#" + s.id in EXPECT, q.id + "#" + s.id + " を確かめていない")));
});

test("空間図形の単元：順番・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学1年"].slice(0, 6), ["正負の数", "文字と式", "一次方程式", "比例と反比例", "平面図形", "空間図形"]);
  assert.deepEqual(E.UNITS["空間図形"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck("空間図形").questions.length, 5);
  assert.equal(label(Q["spPosition-basic-5"]), "面EFGH");
});
