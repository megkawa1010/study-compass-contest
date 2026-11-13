// node --test tests/*.test.js — 中1 データの分布：答えを表のデータから計算して確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const SK = ["dsFreq", "dsRel", "dsHist", "dsRep", "dsProb"];
const all = Object.values(Q).filter((q) => q.unit === "データの分布");
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-9, (m || "") + " " + a + " と " + b);
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const sum = (a) => a.reduce((x, y) => x + y, 0);

// 表から読む：階級 [下, 上]、度数、階級値
function tab(id) {
  const [c, f] = Q[id].figure.rows;
  const cls = c.values.map((s) => String(s).split("〜").map(Number));
  return { cls, f: f.values, mid: cls.map(([a, b]) => (a + b) / 2), n: sum(f.values) };
}
const at = (t, lo) => t.cls.findIndex(([a]) => a === lo);
const from = (t, lo) => sum(t.f.slice(at(t, lo)));
const upto = (t, lo) => sum(t.f.slice(0, at(t, lo) + 1));
const modeMid = (t) => t.mid[t.f.indexOf(Math.max(...t.f))];

test("表の問題：答えが表のデータから計算した値と一致する", () => {
  const W = {
    "dsFreq-basic-5": (t) => t.f[at(t, 20)], "dsFreq-basic-6": (t) => from(t, 25), "dsFreq-standard-1": modeMid, "dsFreq-standard-2": (t) => upto(t, 15),
    "dsFreq-standard-3": (t) => { let k = t.f.length - 1, c = t.f[k]; while (c < 5) c += t.f[--k]; return t.cls[k][0]; },
    "dsFreq-retention-4": (t) => from(t, 24),
    "dsRel-basic-7": (t) => upto(t, 20), "dsRel-standard-1": (t) => t.f[at(t, 20)] / t.n, "dsRel-standard-2": (t) => upto(t, 25) / t.n, "dsRel-retention-4": (t) => upto(t, 24),
    "dsHist-basic-6": (t) => Math.max(...t.f), "dsHist-standard-1": (t) => Math.max(...t.f) - Math.min(...t.f), "dsHist-standard-4": modeMid,
    "dsHist-retention-4": (t) => Math.max(...t.f), "dsHist-retention-5": modeMid,
    "dsRep-standard-1": modeMid, "dsRep-standard-2": (t) => sum(t.mid.map((m, i) => m * t.f[i])) / t.n
  };
  Object.entries(W).forEach(([id, f]) => near(Q[id].answer, f(tab(id)), id));
  const S = {
    "dsFreq-application-1": [(t) => t.f[at(t, 20)], (t) => upto(t, 10), modeMid],
    "dsFreq-application-3": [(t) => t.f[at(t, 4)], (t) => from(t, 8), (t) => t.cls[0][1] - t.cls[0][0]],
    "dsRel-application-2": [(t) => t.f[at(t, 4)] / t.n, (t) => upto(t, 8), (t) => upto(t, 8) / t.n],
    "dsHist-application-1": [(t) => Math.max(...t.f), modeMid, (t) => t.f.length],
    "dsHist-application-4": [(t) => Math.max(...t.f), modeMid, (t) => from(t, 9)],
    "dsHist-application-2": [(t) => t.f.length, (t) => t.mid[t.f.indexOf(9)]],
    "dsRep-application-2": [modeMid, (t) => sum(t.mid.map((m, i) => m * t.f[i])) / t.n, (t) => t.cls.find(([a, b]) => { const m = sum(t.mid.map((x, i) => x * t.f[i])) / t.n; return a <= m && m < b; })[0]]
  };
  Object.entries(S).forEach(([id, fs]) => fs.forEach((f, i) => near(step(id, "s" + (i + 1)).answer, f(tab(id)), id + "#s" + (i + 1))));
  // 表はどれも 20人
  all.filter((q) => q.figure && /20人/.test(q.text)).forEach((q) => assert.equal(tab(q.id).n, 20, q.id));
  // 実験の表：相対度数
  const [n, k] = Q["dsProb-application-1"].figure.rows.map((r) => r.values);
  near(step("dsProb-application-1", "s1").answer, k[0] / n[0]);
  near(step("dsProb-application-1", "s2").answer, k[3] / n[3]);
});

test("文だけの問題：階級値・相対度数・平均・確率の見積もりが正しい", () => {
  const N = "(\\d+(?:\\.\\d+)?)";
  const rules = [
    [new RegExp("^" + N + "\\D+ 以上 " + N + "\\D+ 未満の階級の階級値"), (a, b) => (a + b) / 2],
    [new RegExp("^度数が " + N + "、度数の合計が " + N + " の階級の相対度数"), (a, b) => a / b],
    [new RegExp("^相対度数が " + N + "、度数の合計が " + N + " の階級の度数"), (r, n) => r * n],
    [new RegExp("^最大値が " + N + "、最小値が " + N + " のデータの範囲"), (a, b) => a - b],
    [new RegExp(N + "(?:回|本)\\D*?、\\D*?" + N + "(?:回|本)(?:出|でし)"), (a, b) => b / a],
    [new RegExp("確率が " + N + " と考えられることがらは、" + N + "回"), (p, n) => p * n],
    [new RegExp("確率を " + N + " と考えると、\\D*" + N), (p, n) => p * n],
    [new RegExp("^" + N + "人の平均点が " + N + "点です。"), (n, a) => n * a]
  ];
  let n = 0;
  all.filter((q) => q.type === "number" && !q.figure).forEach((q) => {
    const hit = rules.find(([re]) => re.test(q.text));
    if (!hit) return;
    near(q.answer, hit[1](...q.text.match(hit[0]).slice(1).map(Number)), q.id); n++;
  });
  assert.ok(n >= 25, "確かめた数 " + n);
  const list = (s) => s.split("、").map(Number);
  const mode = (v) => { const c = {}; v.forEach((x) => (c[x] = (c[x] || 0) + 1)); return Number(Object.keys(c).sort((a, b) => c[b] - c[a])[0]); };
  all.filter((q) => q.type === "number").forEach((q) => {
    let m = q.text.match(/^([\d、]+) の平均値/);
    if (m) { near(q.answer, sum(list(m[1])) / list(m[1]).length, q.id); n++; }
    m = q.text.match(/^([\d、]+) の最頻値/);
    if (m) { near(q.answer, mode(list(m[1])), q.id); n++; }
  });
  assert.ok(n >= 32, "確かめた数 " + n);
});

const EXPECT = {
  "dsRel-basic-3": 1, "dsRep-standard-5": (60 * 4 + 80) / 5,
  "dsFreq-application-2#s1": (170 - 140) / 5 + 1, "dsFreq-application-2#s2": (140 + 145) / 2, "dsFreq-application-2#s3": (170 + 175) / 2,
  "dsRel-application-1#s1": 6 / 20, "dsRel-application-1#s2": 25 / 100,
  "dsRel-application-3#s1": 30 * 0.2, "dsRel-application-3#s2": 9 / 30, "dsRel-application-3#s3": 0.2 + 9 / 30,
  "dsHist-application-2#s1": 4, "dsHist-application-2#s2": 15,
  "dsHist-application-3#s2": 27.5 - 22.5, "dsHist-application-3#s3": (27.5 - 22.5) / 5,
  "dsRep-application-1#s1": (2 + 3 + 3 + 5 + 12) / 5, "dsRep-application-1#s2": 3,
  "dsRep-application-3#s1": 24, "dsRep-application-3#s2": (23 + 24 + 24 + 24.5 + 24 + 24.5) / 6,
  "dsHist-application-5#s3": (60 + 70) / 2, "dsHist-application-6#s1": (10 + 20) / 2, "dsHist-application-6#s2": 7 + 5 + 2, "dsHist-application-6#s3": (5 + 2) / 25,
  "dsProb-application-4#s1": 300 / 400, "dsProb-application-4#s2": 40 * (300 / 400), "dsProb-application-4#s3": 1 - 300 / 400,
  "dsProb-application-5#s1": 150 / 500, "dsProb-application-5#s2": 3500 * (150 / 500), "dsProb-application-5#s3": 1 - 150 / 500,
  "dsProb-application-2#s1": 25 / 5000, "dsProb-application-2#s2": 20000 * (25 / 5000), "dsProb-application-2#s3": 1 - 25 / 5000,
  "dsProb-application-3#s1": Math.round((98 / 600) * 100) / 100, "dsProb-application-3#s2": 6000 / 6
};

test("そのほかの数の小問は、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    near(st ? step(id, st).answer : Q[id].answer, want, key);
  });
  const covered = new Set(Object.keys(EXPECT));
  ["dsHist-application-4", "dsFreq-application-1", "dsFreq-application-3", "dsRel-application-2", "dsHist-application-1", "dsRep-application-2"].forEach((id) => ["s1", "s2", "s3"].forEach((s) => covered.add(id + "#" + s)));
  ["dsHist-application-2#s1", "dsHist-application-2#s2", "dsProb-application-1#s1", "dsProb-application-1#s2"].forEach((k) => covered.add(k));
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number").forEach((s) => assert.ok(covered.has(q.id + "#" + s.id), q.id + "#" + s.id + " を確かめていない")));
});

test("データの分布の単元：中1の最後・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学1年"], ["正負の数", "文字と式", "一次方程式", "比例と反比例", "平面図形", "空間図形", "データの分布"]);
  assert.deepEqual(E.UNITS["データの分布"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck("データの分布").questions.length, 5);
});
