// node --test tests/*.test.js — 中1 比例と反比例：答えを式の計算で確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const SK = ["prFunc", "prDirect", "prGraph", "prInverse", "prUse"];
const all = Object.values(Q).filter((q) => q.unit === "比例と反比例");
const num = (s) => Number(s.replace("−", "-"));
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const N = "(−?\\d+)";

test("比例・反比例の式の問題は、文の数から計算した値と一致する", () => {
  let n = 0;
  all.filter((q) => q.type === "number").forEach((q) => {
    let m;
    if ((m = q.text.match(new RegExp("^y = " + N + "x で、x = " + N + " のとき")))) { near(q.answer, num(m[1]) * num(m[2]), q.id); n++; }
    else if ((m = q.text.match(new RegExp("^y = " + N + "/x で、x = " + N + " のとき")))) { near(q.answer, num(m[1]) / num(m[2]), q.id); n++; }
    else if ((m = q.text.match(new RegExp("^y = " + N + "(/?)x の比例定数")))) { near(q.answer, num(m[1]), q.id); n++; }
    else if ((m = q.text.match(new RegExp("x に比例し、x = " + N + " のとき y = " + N + " です。x = " + N)))) { near(q.answer, (num(m[2]) / num(m[1])) * num(m[3]), q.id); n++; }
    else if ((m = q.text.match(new RegExp("x に反比例し、x = " + N + " のとき y = " + N + " です。x = " + N)))) { near(q.answer, (num(m[1]) * num(m[2])) / num(m[3]), q.id); n++; }
    else if ((m = q.text.match(new RegExp("^y = " + N + "x で、x の変域が " + N + " ≦ x ≦ " + N + " のとき、y の最大値")))) { near(q.answer, num(m[1]) * num(m[3]), q.id); n++; }
  });
  assert.ok(n >= 20, "確かめた数 " + n);
});

test("「x = ○ のとき y = △ です。式はどれ？」の正解は、その点を通る", () => {
  let n = 0;
  all.filter((q) => q.choices && /式はどれ？$/.test(q.text)).forEach((q) => {
    const m = q.text.match(new RegExp("x = " + N + " のとき y = " + N));
    if (!m) return;
    const x = num(m[1]), y = num(m[2]), inv = /反比例/.test(q.text);
    const a = num(label(q).match(new RegExp("y = " + N))[1]);
    near(inv ? a / x : a * x, y, q.id);
    assert.equal(/\/x$/.test(label(q)), inv, q.id);
    n++;
  });
  assert.ok(n >= 5, "確かめた数 " + n);
});

test("グラフの通る点・通る点からの式・グラフの向きが正しい", () => {
  const P = new RegExp("\\(" + N + ", " + N + "\\)");
  let n = 0;
  all.filter((q) => q.skill === "prGraph" && q.choices).forEach((q) => {
    let m = q.text.match(new RegExp("^y = " + N + "x のグラフが通る点"));
    if (m) {
      q.choices.forEach((c) => { const p = c.label.match(P); assert.equal(num(p[1]) * num(m[1]) === num(p[2]), c.key === q.answer, q.id + c.label); });
      n++;
    }
    m = q.text.match(new RegExp("^点 " + P.source + " を通る"));
    if (m) { near(num(label(q).match(new RegExp("y = " + N))[1]) * num(m[1]), num(m[2]), q.id); n++; }
    m = q.text.match(new RegExp("^y = " + N + "x のグラフは、どの向き"));
    if (m) { assert.equal(label(q), num(m[1]) > 0 ? "右上がり" : "右下がり", q.id); n++; }
  });
  assert.ok(n >= 9, "確かめた数 " + n);
  all.filter((q) => q.figure).forEach((q) => {
    const a = q.figure.lines[0].a;
    assert.equal(q.figure.lines[0].b, 0, q.id + " 比例は原点を通る");
    near(q.answer, /a はいくつ/.test(q.text) ? a : a * 2, q.id);
  });
});

test("変域の問題：言葉と不等号が合い、ふくまれる整数の数が正しい", () => {
  const count = (lo, loIn, hi, hiIn) => { let c = 0; for (let i = lo; i <= hi; i++) if ((i > lo || loIn) && (i < hi || hiIn)) c++; return c; };
  near(Q["prFunc-standard-2"].answer, count(-2, false, 1, true));
  near(Q["prFunc-retention-5"].answer, count(-7, false, -4, true));
  const want = { "prFunc-basic-3": "2 ≦ x ≦ 5", "prFunc-basic-4": "−1 < x < 3", "prFunc-basic-5": "0 ≦ x < 4", "prFunc-retention-1": "6 ≦ x ≦ 9", "prFunc-retention-2": "7 < x ≦ 12", "prFunc-standard-5": "0 ≦ y ≦ 6" };
  Object.entries(want).forEach(([id, l]) => assert.equal(label(Q[id]), l, id));
  assert.equal(label(Q["prFunc-standard-1"]), "6");
});

const EXPECT = {
  "prFunc-basic-6": 80 * 6, "prFunc-basic-7": 3 * 7, "prFunc-retention-3": 90 * 8,
  "prUse-basic-5": (40 / 10) * 25, "prUse-basic-6": (5 * 12) / 10, "prUse-basic-7": (45 / 3) * 8,
  "prUse-standard-1": (24 * 10) / 40, "prUse-standard-2": 360 / (120 / 5), "prUse-standard-3": (8 * 15) / 12, "prUse-standard-4": (2 / 3) * 12, "prUse-standard-5": (60 * 20) / 80,
  "prUse-retention-1": (1400 / 7) * 9, "prUse-retention-2": (6 * 30) / 9, "prUse-retention-4": (18 * 20) / 45, "prUse-retention-5": (6 * 14) / 7,
  "prUse-basic-8": (90 / 6) * 10, "prUse-basic-9": (4 * 15) / 12, "prUse-standard-6": 1200 / (450 / 3), "prUse-standard-7": (20 * 15) / 30,
  "prInverse-standard-5": 24,
  "prFunc-application-1#s1": 30 - 2 * 5, "prFunc-application-2#s1": 4 * 3, "prFunc-application-3#s1": 5 * -1, "prFunc-application-3#s2": 5 * 3,
  "prDirect-application-1#s2": 30 * 8, "prDirect-application-1#s3": 150 / 30, "prDirect-application-2#s1": 18 / 3, "prDirect-application-2#s2": 6 * -2, "prDirect-application-2#s3": 30 / 6,
  "prDirect-application-3#s2": 15 * 6, "prDirect-application-3#s3": 120 / 15,
  "prGraph-application-1#s1": 2 * 3, "prGraph-application-1#s2": -8 / 2, "prGraph-application-2#s2": 3 * -1, "prGraph-application-2#s3": 12 / 3, "prGraph-application-3#s2": 80 * 5 - 60 * 5,
  "prInverse-application-1#s2": 24 / 6, "prInverse-application-1#s3": 24 / 3, "prInverse-application-2#s2": 120 / 40, "prInverse-application-2#s3": 120 / 2,
  "prInverse-application-3#s1": 3 * 8, "prInverse-application-3#s2": 24 / -4, "prInverse-application-3#s3": 24 / 12,
  "prUse-application-1#s2": 1200 / 60, "prUse-application-1#s3": 1200 / 15, "prUse-application-2#s2": (30 * 8) / 40, "prUse-application-2#s3": (30 * 8) / 12,
  "prUse-application-3#s2": (400 / 100) * 350, "prUse-application-3#s3": 2000 / (400 / 100)
};

test("場面の問題と応用の数の小問は、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    near(st ? Q[id].steps.find((s) => s.id === st).answer : Q[id].answer, want, key);
  });
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number").forEach((s) => assert.ok(q.id + "#" + s.id in EXPECT, q.id + "#" + s.id + " を確かめていない")));
});

test("比例と反比例の単元：順番・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学1年"].slice(0, 4), ["正負の数", "文字と式", "一次方程式", "比例と反比例"]);
  assert.deepEqual(E.UNITS["比例と反比例"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck("比例と反比例").questions.length, 5);
});
