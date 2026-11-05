// node --test tests/*.test.js — 中2 データの活用：答えを別の計算で確かめる・箱ひげ図の整合・選択肢の真偽
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, C = SC.compass, B = SC.bank, F = SC.figures, L = SC.logic;
const SK = ["dataMedian", "dataQuartile", "dataIqr", "dataBoxRead", "dataBoxMake", "dataCompare"];
const all = Object.values(Q).filter((q) => q.unit === "データの活用");

// 教科書の決め方：奇数個のときは真ん中をのぞいて前半・後半に分ける（bank.js とは別に書く）
function median(sorted) {
  const n = sorted.length;
  if (n % 2 === 1) return sorted[(n - 1) / 2];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}
function five(data) {
  const s = [...data].sort((a, b) => a - b), n = s.length;
  const lower = n % 2 ? s.slice(0, (n - 1) / 2) : s.slice(0, n / 2);
  const upper = n % 2 ? s.slice((n + 1) / 2) : s.slice(n / 2);
  return { min: s[0], q1: median(lower), med: median(s), q3: median(upper), max: s[n - 1] };
}
const value = (f, kind) => (kind === "range" ? f.max - f.min : kind === "iqr" ? f.q3 - f.q1 : f[kind]);

function expected(q, s) {
  const st = s.stat, boxes = q.figure && q.figure.boxes;
  if (st.data) return value(five(st.data), st.kind);
  if (st.find) return st[st.find];
  if (st.q1 !== undefined) return st.q3 - st.q1;
  if (st.kind === "medDiff") return Math.abs(boxes[0].med - boxes[1].med);
  if (st.kind === "iqrDiff") return Math.abs(value(boxes[0], "iqr") - value(boxes[1], "iqr"));
  if (st.kind === "aboveQ3" || st.kind === "belowQ1") return st.n / 4;
  if (st.kind === "aboveMed") return st.n / 2;
  return value(boxes[st.box], st.kind);
}

test("数の答えは、データや図から別の計算で求めた値と一致する", () => {
  let n = 0;
  all.forEach((q) => (q.steps || [q]).filter((s) => s.type === "number").forEach((s) => {
    if (q.id === "dataMedian-basic-4") return; // 「何番目」の問題
    assert.ok(s.stat, q.id + "/" + s.id + " に stat がない");
    assert.equal(s.answer, expected(q, s), q.id + "/" + (s.id || ""));
    n++;
  }));
  assert.ok(n > 60, "確かめた数 " + n);
  assert.equal(Q["dataMedian-basic-4"].answer, (9 + 1) / 2);
});

test("「およそ何人」の問題は、基準の点数が図の値と合っている", () => {
  const box = (id, i) => Q[id].figure.boxes[i];
  assert.equal(box("dataBoxRead-application-1", 0).q3, 70);
  assert.equal(box("dataBoxRead-application-2", 0).q1, 10);
  assert.equal(box("dataCompare-standard-2", 1).q3, 60);
  assert.equal(box("dataCompare-application-3", 1).med, 60);
  assert.equal(box("dataCompare-application-3", 0).q3, 60);
});

test("箱ひげ図：値が小さい順で、目もりの上にある。図が描ける", () => {
  all.forEach((q) => [q.figure, q.figure2].filter((f) => f && f.type === "boxplot").forEach((f) => {
    f.boxes.forEach((b) => {
      const v = [b.min, b.q1, b.med, b.q3, b.max];
      v.forEach((x, i) => {
        if (i) assert.ok(v[i - 1] <= x, q.id + " " + b.label + " の順 " + v);
        assert.ok(x >= f.axis[0] && x <= f.axis[1], q.id + " 目もりの外 " + x);
        assert.equal((x - f.axis[0]) % f.axis[2], 0, q.id + " " + b.label + " が目もりの上にない " + x);
      });
    });
    const svg = F.render(f);
    assert.ok(svg.includes("<svg") && !/NaN|undefined/.test(svg), q.id);
  }));
});

test("データに合う箱ひげ図：正解の図だけが、データの5つの値と一致する", () => {
  const list = all.filter((q) => q.figure2);
  assert.ok(list.length >= 8);
  list.forEach((q) => {
    const f = five(q.stat.data), same = (b) => ["min", "q1", "med", "q3", "max"].every((k) => b[k] === f[k]);
    const hits = q.figure2.boxes.map(same);
    assert.equal(hits.filter(Boolean).length, 1, q.id);
    assert.equal("abcd".charAt(hits.indexOf(true)), q.answer, q.id);
    assert.equal(new Set(q.figure2.boxes.map((b) => JSON.stringify({ ...b, label: "" }))).size, 4, q.id + " 同じ図がある");
    assert.ok(F.render(q.figure).includes(String(q.stat.data[0])), q.id);
  });
  assert.ok(new Set(list.map((q) => q.answer)).size >= 3, "正解の場所がかたよらない");
});

// 図を見て答える選択問題：作ったときの並びの真偽を、図の値から計算する
const TRUTH = {
  "dataCompare-basic-1": ([a, b]) => [b.med > a.med, a.med > b.med, a.med === b.med, false],
  "dataCompare-basic-2": ([a, b]) => { const x = a.max - a.min, y = b.max - b.min; return [x === y, x > y, y > x, false]; },
  "dataCompare-basic-3": ([a, b]) => { const x = a.q3 - a.q1, y = b.q3 - b.q1; return [x > y, y > x, x === y, false]; },
  "dataCompare-basic-4": ([a, b]) => { const x = a.q3 - a.q1, y = b.q3 - b.q1; return [y > x, x > y, x === y, false]; },
  "dataCompare-basic-5": ([a, b]) => [b.max > a.max, a.max > b.max, a.max === b.max, false],
  "dataCompare-standard-1": ([a, b]) => [a.med === 60, b.med === 60, a.min >= 50, b.min >= 30],
  "dataCompare-standard-4": ([a, b]) => { const x = a.max - a.min, y = b.max - b.min; return [y > x, x > y, x === y, false]; },
  "dataCompare-standard-5": ([a, b]) => { const x = a.q3 - a.q1, y = b.q3 - b.q1; return [x === y, x > y, y > x, false]; },
  "dataCompare-retention-1": ([a, b]) => [b.med > a.med, a.med > b.med, a.med === b.med, false],
  "dataCompare-retention-2": ([a, b]) => { const x = a.q3 - a.q1, y = b.q3 - b.q1; return [y > x, x > y, x === y, false]; },
  "dataCompare-retention-3": ([a, b]) => [b.q1 === 40, a.med === 60, b.min >= 40, a.max > b.med],
  "dataCompare-retention-5": ([a, b]) => [b.min > a.min && b.max > a.max, a.med > b.med, false, false]
};

test("箱ひげ図を比べる選択問題：正解の文だけが図の値に合う", () => {
  Object.entries(TRUTH).forEach(([id, fn]) => {
    const q = Q[id], t = fn(q.figure.boxes);
    assert.deepEqual(t, [true, false, false, false], id);
    assert.equal(q.answer, "abcd".charAt(q.rotation), id);
  });
  all.filter((q) => q.skill === "dataCompare" && q.type === "choice").forEach((q) => assert.ok(TRUTH[q.id], q.id + " を確かめていない"));
});

test("選択問題の正解は、1番目にかたよらない（確率・データの活用）", () => {
  const list = Object.values(Q).filter((q) => (q.unit === "データの活用" || q.unit === "確率") && q.type === "choice");
  const at = {};
  list.forEach((q) => { at[q.answer] = (at[q.answer] || 0) + 1; assert.ok(q.choices.some((c) => c.key === q.answer), q.id); });
  ["a", "b", "c", "d"].forEach((k) => assert.ok((at[k] || 0) >= list.length * 0.1, k + " " + JSON.stringify(at)));
});

test("定着の問題は、同じスキルの問題と同じデータ・同じ問いにならない", () => {
  const shape = (q) => q.text + JSON.stringify((q.figure && (q.figure.values || q.figure.boxes)) || null);
  all.filter((q) => q.level === "retention").forEach((r) => {
    all.filter((o) => o.skill === r.skill && o.id !== r.id).forEach((o) => assert.notEqual(shape(r), shape(o), r.id + " と " + o.id));
  });
});

test("答えに単位をつけても読める", () => {
  [["8点", 8], ["5冊", 5], ["10人", 10], ["5番目", 5], ["22kg", 22], ["8.5", 8.5]].forEach(([v, a]) => assert.ok(L.check({ type: "number", answer: a }, v), v));
});

test("データの活用の単元：選べる・前提は先に来る・スキルごとの問題数・はじめのチェック", () => {
  assert.ok(E.SELECTABLE_UNITS.includes("データの活用"));
  assert.deepEqual(E.UNITS["データの活用"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(B.index[k].basic.length >= 5 && B.index[k].standard.length >= 5 && B.index[k].application.length >= 3 && B.index[k].retention.length >= 5, k);
  });
  const c = C.unitCheck("データの活用");
  assert.equal(c.questions.length, 5);
  assert.ok(new Set(c.chosen.map((x) => x.skill)).size >= 4);
});
