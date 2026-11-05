// node --test tests/*.test.js — 中2 確率：答えをすべての場合を数えて確かめる・分数の答えの判定・単元のつながり
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, L = SC.logic, C = SC.compass, B = SC.bank;
const PROB = ["probMeaning", "probCount", "probBasic", "probTwo", "probDraw", "probNot"];

// ---------- 全部の場合を作る ----------
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const die = range(1, 6);
const dice2 = die.flatMap((a) => die.map((b) => [a, b]));
const coins = (n) => (n === 0 ? [[]] : coins(n - 1).flatMap((c) => [[...c, "表"], [...c, "裏"]]));
const perms = (xs, k) => (k === 0 ? [[]] : xs.flatMap((x, i) => perms(xs.filter((_, j) => j !== i), k - 1).map((p) => [x, ...p])));
const combos = (xs, k) => (k === 0 ? [[]] : xs.flatMap((x, i) => combos(xs.slice(i + 1), k - 1).map((p) => [x, ...p])));
const balls = (spec) => Object.entries(spec).flatMap(([c, n]) => range(1, n).map((i) => c + i));
const has = (c) => (x) => x.startsWith(c);
const deck = ["ハート", "ダイヤ", "スペード", "クラブ"].flatMap((m) => range(1, 13).map((n) => ({ m, n })));
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
function frac(list, pred) {
  const a = list.filter(pred).length, g = gcd(a, list.length);
  return a / g + "/" + list.length / g;
}
const num = (ds) => Number(ds.join(""));
const heads = (c) => c.filter((x) => x === "表").length;
const tails = (c) => c.filter((x) => x === "裏").length;

// 問題 id（小問は id#s1）→ 数えた結果
const lots = (win, lose) => [...range(1, win).map((i) => "当" + i), ...range(1, lose).map((i) => "外" + i)];
const hit = (x) => x.startsWith("当");
const EXPECT = {
  // 場合の数
  "probCount-basic-1": perms(["A", "B", "C"], 3).length,
  "probCount-basic-2": coins(2).length,
  "probCount-basic-3": dice2.length,
  "probCount-basic-4": perms([1, 2, 3], 2).length,
  "probCount-basic-5": combos(["A", "B", "C", "D"], 2).length,
  "probCount-standard-1": perms([1, 2, 3, 4], 2).length,
  "probCount-standard-2": coins(3).length,
  "probCount-standard-3": perms(["A", "B", "C", "D"], 4).length,
  "probCount-standard-4": combos(range(1, 5), 2).length,
  "probCount-standard-5": perms([0, 1, 2, 3], 2).filter((p) => p[0] !== 0).length,
  "probCount-application-1#s1": dice2.length,
  "probCount-application-1#s2": dice2.filter(([a, b]) => a + b === 7).length,
  "probCount-application-1#s3": dice2.filter(([a, b]) => a + b >= 10).length,
  "probCount-application-2#s1": perms([1, 2, 3, 4], 3).length,
  "probCount-application-2#s2": perms([1, 2, 3, 4], 3).filter((p) => num(p) % 2 === 0).length,
  "probCount-application-2#s3": perms([1, 2, 3, 4], 3).filter((p) => num(p) >= 300).length,
  "probCount-application-3#s1": combos(["A", "B", "C", "D", "E"], 2).length,
  "probCount-application-3#s2": combos(["A", "B", "C", "D", "E"], 2).filter((c) => c.includes("A")).length,
  "probCount-application-3#s3": combos(["A", "B", "C", "D", "E"], 2).filter((c) => !c.includes("A")).length,
  "probCount-retention-1": range(1, 9).flatMap((a) => range(1, 5).map((b) => [a, b])).length,
  "probCount-retention-2": perms(range(1, 8), 2).length,
  "probCount-retention-3": combos(range(1, 6), 2).length,
  "probCount-retention-4": coins(7).length,
  "probCount-retention-5": perms([0, 5, 6, 7, 8], 2).filter((p) => p[0] !== 0).length,
  // 確率の求め方
  "probBasic-basic-1": frac(die, (x) => x % 2 === 0),
  "probBasic-basic-2": frac(die, (x) => x % 3 === 0),
  "probBasic-basic-3": frac(balls({ 赤: 3, 青: 2 }), has("赤")),
  "probBasic-basic-4": frac(range(1, 10), (x) => x % 5 === 0),
  "probBasic-basic-5": frac(deck, (c) => c.m === "ハート"),
  "probBasic-standard-1": frac(range(1, 20), (x) => x % 3 === 0),
  "probBasic-standard-2": frac(balls({ 白: 5, 赤: 4, 青: 3 }), has("白")),
  "probBasic-standard-3": frac(die, (x) => 6 % x === 0),
  "probBasic-standard-4": frac(deck, (c) => c.n >= 11),
  "probBasic-standard-5": frac(range(1, 30), (x) => x % 4 === 0),
  "probBasic-application-1#s1": balls({ 赤: 3, 白: 5, 青: 2 }).length,
  "probBasic-application-1#s2": frac(balls({ 赤: 3, 白: 5, 青: 2 }), has("赤")),
  "probBasic-application-1#s3": frac(balls({ 赤: 3, 白: 5, 青: 2 }), (x) => has("赤")(x) || has("青")(x)),
  "probBasic-application-2#s1": frac(range(1, 12), (x) => x % 2 === 0),
  "probBasic-application-2#s2": frac(range(1, 12), (x) => x % 3 === 0),
  "probBasic-application-2#s3": frac(range(1, 12), (x) => x % 6 === 0),
  "probBasic-application-3#s1": balls({ 一: 2, 二: 6, 外: 12 }).filter(has("外")).length,
  "probBasic-application-3#s2": frac(balls({ 一: 2, 二: 6, 外: 12 }), (x) => !has("外")(x)),
  "probBasic-application-3#s3": frac(balls({ 一: 2, 二: 6, 外: 12 }), has("一")),
  "probBasic-retention-1": frac(die, (x) => x >= 5),
  "probBasic-retention-2": frac(balls({ 赤: 7, 白: 2 }), has("白")),
  "probBasic-retention-3": frac(range(1, 8), (x) => x % 2 === 1),
  "probBasic-retention-4": frac(range(1, 50), (x) => x % 7 === 0),
  "probBasic-retention-5": frac(deck, (c) => c.n === 1),
  // 2つのさいころ・硬貨
  "probTwo-basic-1": frac(coins(2), (c) => heads(c) === 2),
  "probTwo-basic-2": frac(coins(2), (c) => heads(c) === 1),
  "probTwo-basic-3": frac(dice2, ([a, b]) => a === b),
  "probTwo-basic-4": frac(dice2, ([a, b]) => a + b === 2),
  "probTwo-basic-5": frac(coins(3), (c) => heads(c) === 3),
  "probTwo-standard-1": frac(dice2, ([a, b]) => a + b === 7),
  "probTwo-standard-2": frac(dice2, ([a, b]) => a + b === 5),
  "probTwo-standard-3": frac(dice2, ([a, b]) => a + b >= 10),
  "probTwo-standard-4": frac(dice2, ([a, b]) => (a * b) % 2 === 1),
  "probTwo-standard-5": frac(coins(3), (c) => heads(c) === 2),
  "probTwo-application-1#s1": frac(dice2, ([a, b]) => a < b),
  "probTwo-application-1#s2": frac(dice2, ([a, b]) => (a + b) % 4 === 0),
  "probTwo-application-1#s3": frac(dice2, ([a, b]) => a * b === 12),
  "probTwo-application-2#s1": coins(3).length,
  "probTwo-application-2#s2": frac(coins(3), (c) => heads(c) === 1),
  "probTwo-application-2#s3": frac(coins(3), (c) => tails(c) >= 2),
  "probTwo-application-3#s1": dice2.length,
  "probTwo-application-3#s2": frac(dice2, (d) => num(d) % 3 === 0),
  "probTwo-application-3#s3": frac(dice2, (d) => num(d) > 55),
  "probTwo-application-4#s1": coins(1).flatMap((c) => die.map((d) => [c, d])).length,
  "probTwo-application-4#s2": frac(coins(1).flatMap((c) => die.map((d) => [c, d])), ([c, d]) => heads(c) === 1 && d % 2 === 0),
  "probTwo-application-4#s3": frac(coins(1).flatMap((c) => die.map((d) => [c, d])), ([c, d]) => tails(c) === 1 && d >= 5),
  "probTwo-application-5#s1": coins(2).flatMap((c) => die.map((d) => [c, d])).length,
  "probTwo-application-5#s2": frac(coins(2).flatMap((c) => die.map((d) => [c, d])), ([c, d]) => heads(c) === 2 && d === 6),
  "probTwo-application-5#s3": frac(coins(2).flatMap((c) => die.map((d) => [c, d])), ([c, d]) => heads(c) === 1 && d % 2 === 0),
  "probTwo-retention-1": frac(coins(4), (c) => tails(c) === 4),
  "probTwo-retention-2": frac(dice2, ([a, b]) => a === 2 * b),
  "probTwo-retention-3": frac(dice2, ([a, b]) => a + b === 6),
  "probTwo-retention-4": frac(dice2, ([a, b]) => Math.abs(a - b) === 3),
  "probTwo-retention-5": frac(dice2, ([a, b]) => (a * b) % 12 === 0),
  // 取り出す・くじ
  "probDraw-basic-1": frac(combos(["A", "B", "C"], 2), (c) => c.includes("A")),
  "probDraw-basic-2": frac(perms(lots(1, 2), 2), (p) => hit(p[0])),
  "probDraw-basic-3": frac(perms([1, 2, 3], 2), (p) => num(p) % 2 === 0),
  "probDraw-basic-4": frac(combos(balls({ 赤: 1, 白: 2 }), 2), (c) => c.every(has("白"))),
  "probDraw-basic-5": frac(combos([1, 2, 3, 4], 2), ([a, b]) => (a * b) % 2 === 0),
  "probDraw-basic-6": frac(combos([1, 2, 3, 4], 2), ([a, b]) => a + b === 5),
  "probDraw-basic-7": frac(perms(lots(1, 3), 2), (p) => hit(p[0])),
  "probDraw-basic-8": frac(combos(balls({ 赤: 2, 白: 1 }), 2), (c) => c.some(has("赤")) && c.some(has("白"))),
  "probDraw-standard-1": frac(combos(balls({ 赤: 2, 白: 3 }), 2), (c) => c.every(has("赤"))),
  "probDraw-standard-2": frac(combos(balls({ 赤: 2, 白: 3 }), 2), (c) => c.some(has("赤")) && c.some(has("白"))),
  "probDraw-standard-3": frac(perms(lots(2, 3), 2), (p) => hit(p[1])),
  "probDraw-standard-4": frac(perms([1, 2, 3, 4, 5], 2), (p) => num(p) % 2 === 0),
  "probDraw-standard-5": frac(combos(["A", "B", "C", "D"], 2), (c) => c.includes("A") && c.includes("B")),
  "probDraw-application-1#s1": combos(balls({ 赤: 3, 白: 2 }), 2).length,
  "probDraw-application-1#s2": frac(combos(balls({ 赤: 3, 白: 2 }), 2), (c) => c.every(has("赤"))),
  "probDraw-application-1#s3": frac(combos(balls({ 赤: 3, 白: 2 }), 2), (c) => c.every(has("赤")) || c.every(has("白"))),
  "probDraw-application-2#s1": perms([1, 2, 3, 4, 5], 2).length,
  "probDraw-application-2#s2": frac(perms([1, 2, 3, 4, 5], 2), (p) => num(p) >= 40),
  "probDraw-application-2#s3": frac(perms([1, 2, 3, 4, 5], 2), (p) => num(p) % 3 === 0),
  "probDraw-application-3#s1": lots(1, 3).flatMap((a) => lots(1, 3).map((b) => [a, b])).length,
  "probDraw-application-3#s2": frac(lots(1, 3).flatMap((a) => lots(1, 3).map((b) => [a, b])), (p) => p.every(hit)),
  "probDraw-application-3#s3": frac(lots(1, 3).flatMap((a) => lots(1, 3).map((b) => [a, b])), (p) => p.filter(hit).length === 1),
  "probDraw-retention-1": frac(combos(["A", "B", "C", "D", "E"], 2), (c) => c.includes("C")),
  "probDraw-retention-2": frac(combos(balls({ 白: 1, 黒: 3 }), 2), (c) => c.some(has("白"))),
  "probDraw-retention-3": frac(combos(balls({ 赤: 4, 白: 2 }), 2), (c) => c.every(has("赤"))),
  "probDraw-retention-4": frac(perms(lots(3, 4), 2), (p) => p.every(hit)),
  "probDraw-retention-5": frac(combos([2, 3, 5, 7], 2), ([a, b]) => (a * b) % 2 === 0),
  // 〜でない・少なくとも
  "probNot-basic-1": frac(lots(1, 4), (x) => !hit(x)),
  "probNot-basic-2": frac(die, (x) => x !== 1),
  "probNot-basic-3": frac(balls({ 赤: 3, 白: 7 }), (x) => !has("赤")(x)),
  "probNot-basic-5": frac(range(1, 10), (x) => x % 5 !== 0),
  "probNot-basic-6": frac(die, (x) => x % 3 !== 0),
  "probNot-basic-7": frac(balls({ 赤: 4, 白: 5 }), (x) => !has("白")(x)),
  "probNot-basic-8": frac(lots(3, 5), (x) => !hit(x)),
  "probNot-standard-1": frac(coins(2), (c) => heads(c) >= 1),
  "probNot-standard-2": frac(coins(3), (c) => tails(c) >= 1),
  "probNot-standard-3": frac(dice2, ([a, b]) => a !== b),
  "probNot-standard-4": frac(dice2, ([a, b]) => a + b >= 3),
  "probNot-standard-5": frac(combos(lots(2, 3), 2), (c) => c.some(hit)),
  "probNot-application-1#s1": dice2.length,
  "probNot-application-1#s2": frac(dice2, ([a, b]) => a !== 6 && b !== 6),
  "probNot-application-1#s3": frac(dice2, ([a, b]) => a === 6 || b === 6),
  "probNot-application-2#s1": combos(balls({ 赤: 2, 白: 4 }), 2).length,
  "probNot-application-2#s2": frac(combos(balls({ 赤: 2, 白: 4 }), 2), (c) => c.every(has("白"))),
  "probNot-application-2#s3": frac(combos(balls({ 赤: 2, 白: 4 }), 2), (c) => c.some(has("赤"))),
  "probNot-application-3#s1": coins(4).length,
  "probNot-application-3#s2": frac(coins(4), (c) => tails(c) === 4),
  "probNot-application-3#s3": frac(coins(4), (c) => heads(c) >= 1),
  "probNot-retention-1": frac(lots(2, 5), (x) => !hit(x)),
  "probNot-retention-2": frac(die, (x) => 6 % x !== 0),
  "probNot-retention-3": frac(coins(5), (c) => heads(c) >= 1),
  "probNot-retention-4": frac(dice2, ([a, b]) => (a * b) % 2 === 0),
  "probNot-retention-5": frac(combos(balls({ 赤: 3, 白: 5 }), 2), (c) => c.some(has("白")))
};

const all = Object.values(Q).filter((q) => PROB.includes(q.skill));

test("確率の答えは、すべての場合を数えた結果と一致する", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, step] = key.split("#");
    assert.ok(Q[id], id + " がない");
    const q = step ? Q[id].steps.find((s) => s.id === step) : Q[id];
    assert.ok(q, key + " がない");
    assert.equal(q.answer, want, key);
  });
  // 数えて確かめていない数の答えは「確率の意味」（実験の割合）と、選択の問題だけ
  all.forEach((q) => (q.steps || [q]).forEach((s) => {
    const key = q.steps ? q.id + "#" + s.id : q.id;
    if (s.type !== "choice" && q.skill !== "probMeaning") assert.ok(key in EXPECT, key + " を数えて確かめていない");
  }));
});

test("分数の答えは約分してある。解説の最後の分数と答えが一致する", () => {
  all.forEach((q) => (q.steps || [q]).filter((s) => s.type === "fraction").forEach((s) => {
    const [a, b] = s.answer.split("/").map(Number);
    assert.equal(gcd(a, b), 1, q.id + " " + s.answer);
    assert.ok(s.explanation.includes(s.answer), q.id + " の解説に答え " + s.answer + " がない");
  }));
});

test("分数の答えの判定：同じ値は正解。約分していないときは、まちがいにせず声をかける", () => {
  const q = { type: "fraction", answer: "1/3" };
  ["1/3", "１／３", "1 / 3", "3分の1"].forEach((v) => { assert.ok(L.check(q, v), v); assert.equal(L.answerNote(q, v), null, v); });
  assert.ok(!L.check(q, "1/2"));
  assert.ok(!L.check(q, "3/1"));
  assert.ok(!L.check(q, "あ"));
  assert.match(L.answerNote(q, "2/6"), /約分/);
  assert.match(L.answerNote(q, "6分の2"), /約分/);
  assert.equal(L.answerNote(q, "1/2"), null, "約分してあれば、まちがいでも声はかけない");
  assert.equal(L.answerNote({ type: "number", answer: 3 }, "6/2"), null, "分数の問題だけ");
  const st = { type: "steps", steps: [{ id: "s1", type: "number", answer: 36 }, { id: "s2", type: "fraction", answer: "1/6" }] };
  assert.match(L.answerNote(st, { s1: "36", s2: "6/36" }), /約分/);
  assert.equal(L.answerNote(st, { s1: "36", s2: "1/6" }), null);
});

test("定着の問題は、同じスキルの問題と「数だけ変えて答えも同じ」にならない", () => {
  const shape = (q) => q.text.replace(/\d+/g, "#");
  all.filter((q) => q.level === "retention").forEach((r) => {
    all.filter((o) => o.skill === r.skill && o.id !== r.id && o.type !== "steps").forEach((o) => {
      assert.ok(!(shape(r) === shape(o) && r.answer === o.answer), r.id + " と " + o.id + " が同じ場面・同じ答え");
    });
  });
});

test("確率の単元：選べる・前提は単元の中で先に来る・スキルごとの問題数", () => {
  assert.ok(E.SELECTABLE_UNITS.includes("確率"));
  assert.deepEqual(E.UNITS["確率"], PROB);
  PROB.forEach((k) => {
    assert.equal(E.SKILLS[k].unit, "確率");
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(B.index[k].basic.length >= 5 && B.index[k].standard.length >= 5 && B.index[k].application.length >= 3 && B.index[k].retention.length >= 5, k);
  });
});

test("はじめてのチェック：5問で、複数のスキルを見る。学校が始めたばかりなら習った所だけ", () => {
  const c = C.unitCheck("確率");
  assert.equal(c.questions.length, 5);
  assert.ok(new Set(c.chosen.map((x) => x.skill)).size >= 4);
  const s = { current_unit: "確率", units: { "確率": { status: "learning", current_skill: "probCount" } } };
  const early = C.unitCheck("確率", s);
  assert.ok(early.questions.length >= 3);
  early.questions.forEach((id) => assert.notEqual(E.schoolSkillStatus(Q[id].skill, s), "not_learned", id));
});
