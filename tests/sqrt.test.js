// node --test tests/*.test.js — 中3 平方根：根号をふくむ式を値で確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const SK = ["sqMeaning", "sqCompare", "sqMulDiv", "sqAddSub", "sqUse"];
const all = Object.values(Q).filter((q) => q.unit === "平方根");
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 1e-6, (m || "") + " " + a + " と " + b);
const step = (id, s) => Q[id].steps.find((x) => x.id === s);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;

// 「4√5 ÷ 2√10」「7 + 4√3」「√3/3」「(x − 1)² − 1」を JavaScript の式にする（bank.js とは別の読み方）
function toJS(src) {
  return src.replace(/\s|cm²|cm|秒後/g, "").replace(/−/g, "-").replace(/×/g, "*")
    .replace(/÷([0-9.]*√?\d+)/g, "/($1)")
    .replace(/√(\d+(?:\.\d+)?)/g, "S($1)")
    .replace(/(\d|\)|x)(?=S|\(|x)/g, "$1*")
    .replace(/²/g, "**2");
}
const val = (src, x) => { try { return Function("S", "x", "return " + toJS(src))(Math.sqrt, x); } catch (e) { return NaN; } };
const same = (s, t, x) => Math.abs(val(s, x) - val(t, x)) < 1e-9;
// 選択肢のうち、正解だけが src と同じ値
function onlyRight(q, src, k) {
  q.choices.forEach((c) => assert.equal(same(src, c.label), c.key === q.answer, k + " " + c.label));
}

test("計算・簡単にする問題：正解だけが、もとの式と同じ値になる", () => {
  let n = 0;
  all.filter((q) => q.choices && / を(計算すると|a√b の形にすると)？$/.test(q.text)).forEach((q) => { onlyRight(q, q.text.replace(/ を.*$/, ""), q.id); n++; });
  assert.ok(n >= 27, "確かめた数 " + n);
  // 形を変える・有理化する問題
  const M = { "sqMulDiv-basic-5": "3√2", "sqMulDiv-basic-7": "1/√3", "sqMulDiv-standard-3": "6/√2", "sqMulDiv-retention-5": "22/√11", "sqUse-standard-4": "√5 − 2" };
  Object.entries(M).forEach(([id, src]) => assert.ok(same(src, label(Q[id])), id));
  // 有理化の答えは、分母に根号が残らない
  ["sqMulDiv-basic-7", "sqMulDiv-standard-3", "sqMulDiv-retention-5"].forEach((id) => assert.ok(!/\/√/.test(label(Q[id])), id));
  ["sqMulDiv-standard-3", "sqMulDiv-retention-5", "sqUse-standard-4"].forEach((id) => Q[id].choices.filter((c) => c.key !== Q[id].answer).forEach((c) => assert.ok(!same(M[id], c.label), id + " " + c.label)));
  // a√b の形の正解は、b に2乗の数が残っていない
  all.filter((q) => / を a√b の形にすると？$/.test(q.text)).forEach((q) => {
    const b = Number(label(q).split("√")[1]);
    for (let k = 2; k * k <= b; k++) assert.ok(b % (k * k) !== 0, q.id);
  });
});

test("大小をくらべる選択肢：正解だけが正しい不等式になる", () => {
  const truth = (s) => {
    const parts = s.split(/\s*([＞＜＝])\s*/);
    if (parts.length < 3) return false;
    for (let i = 0; i + 2 < parts.length; i += 2) {
      const a = val(parts[i]), b = val(parts[i + 2]), op = parts[i + 1];
      if (!(op === "＞" ? a > b : op === "＜" ? a < b : Math.abs(a - b) < 1e-9)) return false;
    }
    return true;
  };
  let n = 0;
  all.filter((q) => q.skill === "sqCompare" && q.choices && q.choices.some((c) => /[＞＜]/.test(c.label))).forEach((q) => {
    q.choices.forEach((c) => assert.equal(truth(c.label), c.key === q.answer, q.id + " " + c.label)); n++;
  });
  assert.equal(n, 5);
  // 無理数・有理数
  const irr = (s) => /^√\d+$/.test(s) && !Number.isInteger(Math.sqrt(Number(s.slice(1)))) || s === "π";
  ["sqCompare-basic-3", "sqCompare-retention-3"].forEach((id) => Q[id].choices.forEach((c) => assert.equal(irr(c.label), c.key === Q[id].answer, id + " " + c.label)));
  Q["sqCompare-basic-7"].choices.forEach((c) => assert.equal(!irr(c.label), c.key === Q["sqCompare-basic-7"].answer, c.label));
});

test("平方根の意味：平方根は ±、√ は正のほう", () => {
  all.filter((q) => q.choices && / の平方根はどれ？$/.test(q.text)).forEach((q) => {
    const [a, b] = q.text.replace(" の平方根はどれ？", "").split("/").map(Number);
    const r = b ? Math.sqrt(a) + "/" + Math.sqrt(b) : String(Math.sqrt(a));
    assert.equal(label(q), "±" + r, q.id);
  });
  all.filter((q) => q.choices && /^x² ＝ \d+ を満たす/.test(q.text)).forEach((q) => assert.equal(label(q), "±√" + q.text.match(/\d+/)[0], q.id));
  assert.equal(label(Q["sqMeaning-basic-5"]), "−" + Math.sqrt(25));
  assert.equal(label(Q["sqMeaning-basic-7"]), String(Math.sqrt((-3) ** 2)));
  assert.equal(label(Q["sqMeaning-standard-2"]), "√16 ＝ 4");
  assert.equal(label(step("sqMeaning-application-3", "s2")), "√" + 60 / 5 + " 秒後");
});

// √(an)・√(a/n)・√(n + a)・√(a − n) が整数（自然数）になるいちばん小さい n：数えて確かめる
function smallest(text) {
  const isSq = (v) => v >= 0 && Number.isInteger(Math.sqrt(v));
  let m;
  for (let n = 1; n < 1000; n++) {
    if ((m = text.match(/√\((\d+)n\)/)) && isSq(Number(m[1]) * n)) return n;
    if ((m = text.match(/√\((\d+)\/n\)/)) && Number(m[1]) % n === 0 && isSq(Number(m[1]) / n) && Number(m[1]) / n > 0) return n;
    if ((m = text.match(/√\(n \+ (\d+)\)/)) && isSq(n + Number(m[1]))) return n;
    if ((m = text.match(/√\((\d+) − n\)/)) && isSq(Number(m[1]) - n)) return n;
  }
}
const EXPECT = {
  "sqMeaning-basic-2": Math.sqrt(64), "sqMeaning-basic-3": 7, "sqMeaning-basic-4": 11, "sqMeaning-basic-6": Math.sqrt(0.16), "sqMeaning-standard-3": Math.sqrt(36), "sqMeaning-standard-5": Math.sqrt(144) - Math.sqrt(121),
  "sqMeaning-retention-1": Math.sqrt(169), "sqMeaning-retention-2": 13, "sqMeaning-retention-5": Math.sqrt(196),
  "sqMeaning-application-1#s2": Math.floor(Math.sqrt(20)), "sqMeaning-application-1#s3": Math.sqrt(80) / Math.sqrt(20),
  "sqMeaning-application-2#s1": [...Array(50)].filter((_, i) => Number.isInteger(Math.sqrt(i + 1))).length, "sqMeaning-application-2#s2": 49, "sqMeaning-application-2#s3": 6 * 6,
  "sqMeaning-application-3#s1": Math.sqrt(80 / 5), "sqMeaning-application-3#s3": Math.floor(Math.sqrt(12)),
  "sqCompare-basic-2": Math.floor(Math.sqrt(30)), "sqCompare-basic-6": [...Array(20)].filter((_, i) => Math.sqrt(i + 1) < 3).length, "sqCompare-standard-1": [...Array(30)].filter((_, i) => Math.sqrt(i + 1) > 3 && Math.sqrt(i + 1) < 4).length,
  "sqCompare-standard-2": 10 * 1.414, "sqCompare-standard-3": 10 * 1.732, "sqCompare-standard-4": Math.floor(Math.sqrt(17)),
  "sqCompare-retention-2": Math.floor(Math.sqrt(75)), "sqCompare-retention-4": [...Array(50)].filter((_, i) => Math.sqrt(i + 1) > 5 && Math.sqrt(i + 1) < 6).length, "sqCompare-retention-5": 10 * 2.236,
  "sqCompare-application-1#s1": Math.floor(Math.SQRT2 * 100) / 100, "sqCompare-application-1#s2": 1.41 * 1.41, "sqCompare-application-2#s1": Math.floor(Math.sqrt(50)), "sqCompare-application-2#s2": 7.1 * 7.1,
  "sqCompare-application-3#s1": 9, "sqCompare-application-3#s2": 15, "sqCompare-application-3#s3": [...Array(30)].filter((_, i) => Math.floor(Math.sqrt(i + 1)) === 3).length,
  "sqMulDiv-application-1#s1": 36, "sqMulDiv-application-1#s3": 6 * 1.414, "sqMulDiv-application-2#s2": 2 * Math.sqrt(90) / Math.sqrt(10), "sqMulDiv-application-2#s3": Math.floor(Math.sqrt(6 * 15)),
  "sqMulDiv-application-3#s2": Math.round(1.732 / 3 * 1000) / 1000, "sqMulDiv-application-3#s3": 2 * 1.732,
  "sqAddSub-application-1#s3": ((x) => x * x - 2 * x)(Math.sqrt(5) + 1), "sqAddSub-application-2#s1": (Math.sqrt(3) + 1) * (Math.sqrt(3) - 1),
  "sqAddSub-application-3#s1": (Math.sqrt(7) + Math.sqrt(2)) * (Math.sqrt(7) - Math.sqrt(2)), "sqAddSub-application-4#s3": 12 + 27, "sqAddSub-application-5#s2": 4, "sqAddSub-application-3#s3": (Math.sqrt(7) + Math.sqrt(2)) ** 2 + (Math.sqrt(7) - Math.sqrt(2)) ** 2,
  "sqUse-basic-1": 2 * 1.414, "sqUse-basic-4": Math.sqrt(18) / Math.SQRT2, "sqUse-basic-5": 3 * 1.732, "sqUse-standard-2": 1.414 / 2, "sqUse-standard-3": Math.floor(Math.sqrt(5)),
  "sqUse-retention-1": 3 * 2.646, "sqUse-retention-3": Math.sqrt(75) / Math.sqrt(3),
  "sqUse-application-1#s1": Math.round(21 * 1.414 * 10) / 10, "sqUse-application-1#s2": 21, "sqUse-application-2#s3": Math.sqrt(24 * 6), "sqUse-application-3#s3": Math.sqrt(32) / Math.sqrt(8)
};

test("数の問題と応用の数の小問は、別の計算と一致する。確かめ漏れがない", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    near(st ? step(id, st).answer : Q[id].answer, want, key);
  });
  let n = 0;
  all.filter((q) => q.type === "number" && /いちばん小さい自然数 n/.test(q.text)).forEach((q) => { assert.equal(q.answer, smallest(q.text), q.id); n++; });
  assert.equal(n, 8);
  assert.equal(step("sqUse-application-2", "s2").answer, smallest("√(24n)"));
  const covered = (k) => k in EXPECT || /いちばん小さい自然数 n/.test(Q[k] ? Q[k].text : "") || k === "sqUse-application-2#s2";
  all.filter((q) => q.type === "number").forEach((q) => assert.ok(covered(q.id), q.id + " を確かめていない"));
  all.filter((q) => q.steps).forEach((q) => q.steps.filter((s) => s.type === "number").forEach((s) => assert.ok(covered(q.id + "#" + s.id), q.id + "#" + s.id + " を確かめていない")));
});

test("応用の選ぶ小問：正解だけが場面の値と一致する", () => {
  const P = {
    "sqMeaning-application-1#s1": "√20", "sqMulDiv-application-1#s2": "√72", "sqMulDiv-application-2#s1": "√6 × √15", "sqMulDiv-application-3#s1": "1/√3",
    "sqAddSub-application-1#s1": "√5 + 1 − 1", "sqAddSub-application-2#s2": "2((√3 + 1) + (√3 − 1))", "sqAddSub-application-2#s3": "(√3 + 1) − (√3 − 1)",
    "sqAddSub-application-3#s2": "(√7 + √2) + (√7 − √2)",
    "sqAddSub-application-4#s1": "√12 + √27", "sqAddSub-application-4#s2": "√27 − √12", "sqAddSub-application-5#s1": "(√6 + 2) + (√6 − 2)", "sqAddSub-application-5#s3": "(√6 + 2)² − (√6 − 2)²", "sqUse-application-1#s3": "21/(21√2/2)", "sqUse-application-3#s1": "√32", "sqUse-application-3#s2": "√32 + √8"
  };
  Object.entries(P).forEach(([k, src]) => { const [id, s] = k.split("#"); onlyRight(step(id, s), src, k); });
  // x² − 2x の変形：x にいろいろな数を入れて、正解だけが同じ式
  const st = step("sqAddSub-application-1", "s2");
  st.choices.forEach((c) => assert.equal([2, -1, 0.5].every((x) => Math.abs(val(c.label, x) - (x * x - 2 * x)) < 1e-9), c.key === st.answer, c.label));
  // 24 の素因数分解：正解だけが素数の積
  const f = step("sqUse-application-2", "s1");
  assert.equal(label(f), "2³ × 3");
  f.choices.forEach((c) => assert.ok(/[468]|12/.test(c.label) === (c.key !== f.answer), c.label));
});

test("中3 平方根：多項式の次・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.GRADE_UNITS["中学3年"].slice(0, 2), ["多項式", "平方根"]);
  assert.deepEqual(E.UNITS["平方根"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck("平方根").questions.length, 5);
});
