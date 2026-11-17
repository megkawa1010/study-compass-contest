// node --test tests/*.test.js — 中1 英語「命令文」：正解を文のきまり（動詞のもとの形で始める・Be・Don't・Let's・please・呼びかけ）から確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "命令文";
const SK = ["imForm", "imBe", "imNeg", "imLet", "imPlease"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s })) : [{ id: q.id, q }]));

const words = (s) => s.split(" ");
// 動詞のもとの形。3人称単数の形はつづりのきまりから作る
const BASE = new Set(words("open close wash clean run eat drink use speak sing read write sit stand come go look listen wait help play watch study take make " +
  "turn touch bring enjoy talk walk swim stop throw call have forget do get brush raise cut add cook jump sleep worry meet stay carry bake show say tell give lend answer please"));
function third(v) {
  if (v === "have") return "has";
  if (/(s|sh|ch|x|o)$/.test(v)) return v + "es";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  return v + "s";
}
const THIRD = new Set([...BASE].map(third));
const isIng = (w) => /ing$/.test(w) && !BASE.has(w) && !/^(morning|evening|something|nothing|thing)$/.test(w);
// 様子を表す語（Be のあとに来る）
const ADJ = new Set(words("quiet careful kind brave polite ready honest calm strong friendly afraid noisy late shy sad mean nice good"));
const CALL = "Ken|Yumi|Mai|Tom|Riku|Saki|Emma|Mom|Everyone|everyone";

// 命令文として正しいか
function commandOk(text) {
  if (!/\.$/.test(text)) return false;
  let s = text.slice(0, -1);
  s = s.replace(new RegExp("^(" + CALL + "), "), "");                       // 呼びかけ（文の最初）
  for (let k = 0; k < 2; k++) s = s.replace(new RegExp(", (please|" + CALL + ")$"), ""); // , please／呼びかけ（文の最後）
  let t = s.replace(/\bLet's\b/g, "let_us").replace(/n't\b/g, " not").replace(/,/g, "").toLowerCase().split(" ");
  if (t[0] === "please") t = t.slice(1);
  let i = 0;
  if (t[0] === "let_us") i = 1;
  else if (t[0] === "do" && t[1] === "not") i = 2;
  const v = t[i], rest = t.slice(i + 1);
  // 動詞のあとに、動詞・be動詞・not・do をふくまない
  const restOk = !rest.some((w) => BASE.has(w) || THIRD.has(w) || isIng(w) || /^(am|is|are|be|not|do|does)$/.test(w));
  if (!restOk) return false;
  if (v === "be") return ADJ.has(rest[0]) || /^(a|an)$/.test(rest[0]);
  if (!BASE.has(v)) return false;
  return !ADJ.has(rest[0]);
}
const isSentence = (s) => /^[A-Z]/.test(s) && /\.$/.test(s) && s.split(" ").length >= 2 && !/[（＋]/.test(s) && !/^(Yes|No),/.test(s);

test("命令文のきまり：もとの形で始める。様子は Be、禁止は Don't、さそいは Let's、please・呼びかけはコンマ", () => {
  assert.ok(["Open the window.", "Be quiet.", "Don't be late.", "Let's play tennis.", "Please help me.", "Wait here, please.", "Ken, come here."].every(commandOk));
  assert.ok(!["Opens the window.", "Are quiet.", "Doesn't run here.", "Let's to play tennis.", "Please you help me.", "Ken comes here."].some(commandOk));
});

test("英文を選ぶ問題：正解だけが命令文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(commandOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 35, "英文を選ぶ問題 " + n);
});

test("（ ）に語を入れる問題：正解を入れた文だけが命令文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").trim();
    if (!/（ ）/.test(text) || !/\.$/.test(text)) return;
    const fill = (l) => {
      const f = text.replace("（ ）", l);
      return f[0].toUpperCase() + f.slice(1);
    };
    n++;
    q.choices.forEach((c) => assert.equal(commandOk(fill(c.label)), c.key === q.answer, id + " " + fill(c.label)));
  });
  assert.ok(n >= 40, "（ ）の問題 " + n);
});

test("Let's 〜. の答え：Yes, let's.・No, let's not.・Sure.・OK. だけ", () => {
  const OK = /^(Yes, let's\.|No, let's not\.|Sure\.|OK\.)$/;
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !/^Let's [^。]*\. (の答え|に「)/.test(q.text)) return;
    n++;
    q.choices.forEach((c) => assert.equal(OK.test(c.label), c.key === q.answer, id + " " + c.label));
    if (/いいえ/.test(q.text)) assert.equal(label(q), "No, let's not.", id);
  });
  assert.ok(n >= 5, "Let's の答え " + n);
});

test("中1 英語 命令文：名詞の複数形の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学1年"].slice(0, 5), ["be動詞", "一般動詞", "3人称単数現在", "名詞の複数形", U]);
  assert.deepEqual(E.UNITS[U], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => {
      assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p);
      assert.equal(E.SKILLS[p].subject, "英語", k + " の前提 " + p);
    });
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.ok(all.every((q) => q.subject === "英語"));
  assert.equal(C.unitCheck(U).questions.length, 5);
});
