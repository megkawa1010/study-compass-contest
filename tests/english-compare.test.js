// node --test tests/*.test.js — 中2 英語「比較」：-er than・the -est と in／of・more／most・as 〜 as・Which／Who の比較の疑問文と better／best を確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "比較";
const SK = ["cpEr", "cpEst", "cpMore", "cpAs", "cpWhich"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s, skill: s.skill || q.skill })) : [{ id: q.id, q, skill: q.skill }]));

const words = (s) => s.split(" ");
const SHORT = words("tall big easy hot early long fast heavy large cold young hard warm high strong cheap small new old busy nice happy pretty good well fun");
const LONG = new Set(words("interesting beautiful popular expensive difficult useful famous exciting delicious carefully important"));
const DOUBLE = new Set(["big", "hot"]);
const IRR = { good: ["better", "best"], well: ["better", "best"] };
const form = (a, er) => (IRR[a] ? IRR[a][er ? 0 : 1] : DOUBLE.has(a) ? a + a.slice(-1) + (er ? "er" : "est")
  : /e$/.test(a) ? a + (er ? "r" : "st") : /[^aeiou]y$/.test(a) ? a.slice(0, -1) + (er ? "ier" : "iest") : a + (er ? "er" : "est"));
const POS = new Set(SHORT), ER = new Set(SHORT.map((a) => form(a, true))), EST = new Set(SHORT.map((a) => form(a, false)));
// まちがった比較の形（biger・easyer・interestinger・gooder など）
const BAD = new Set(["carefullier", "funner", "funnest"]);
SHORT.forEach((a) => [a + "er", a + "est"].forEach((w) => { if (!ER.has(w) && !EST.has(w)) BAD.add(w); }));
LONG.forEach((a) => { BAD.add(a + "er"); BAD.add(a + "est"); });
const OF_WORDS = /^(all|three|four|five|us|them)$/;

function tokens(text) {
  return text.replace(/n't\b/g, " not").replace(/,/g, " , ").replace(/[.?!]/g, "").toLowerCase().split(" ").filter(Boolean);
}
const isER = (t, j) => ER.has(t[j]) || (LONG.has(t[j]) && t[j - 1] === "more");
const isEST = (t, j) => EST.has(t[j]) || (LONG.has(t[j]) && t[j - 1] === "most");
function sentenceOk(text) {
  const t = tokens(text);
  if (/^(yes|no)$/.test(t[0]) || t.some((w) => BAD.has(w))) return false;
  for (let j = 0; j < t.length; j++) {
    const w = t[j], nx = t[j + 1];
    if (w === "more" || w === "most") {                       // more・most のあとは長い語。most には the、more には the・as をつけない
      if (!LONG.has(nx) || (w === "most" && t[j - 1] !== "the") || (w === "more" && /^(the|as)$/.test(t[j - 1]))) return false;
    }
    if (w === "as" && (POS.has(nx) || LONG.has(nx) || ER.has(nx) || EST.has(nx) || /^(more|most)$/.test(nx || ""))) {
      if (!(POS.has(nx) || LONG.has(nx)) || t[j + 2] !== "as") return false;   // as ＋ もとの形 ＋ as
    }
    if (w === "than" && !isER(t, j - 1)) return false;          // than の前は比較級
    if (isER(t, j)) {
      if (ER.has(w) && t[j - 1] === "the") return false;
      if (nx !== undefined && nx !== "than" && nx !== ",") return false;
    } else if (isEST(t, j)) {
      if (EST.has(w) && t[j - 1] !== "the") return false;
      const k = t.findIndex((x, i) => i > j && /^(in|of|at|on)$/.test(x));
      if (k > 0 && t[k] !== (t.slice(k + 1).some((x) => OF_WORDS.test(x)) ? "of" : "in")) return false;
    } else if (POS.has(w) || (LONG.has(w) && !/^(more|most)$/.test(t[j - 1]))) {
      if ((POS.has(w) && t[j - 1] === "the") || nx === "than" || (nx === "as" && t[j - 1] !== "as")) return false;
    }
  }
  return true;
}
// 日本語の意味：いちばん → 最上級、より・どちら → 比較級、同じくらい → as 〜 as、ほど 〜ない → not as 〜 as
function cueOk(jp, s) {
  const t = tokens(s);
  if (/いちばん/.test(jp) && !t.some((_, j) => isEST(t, j))) return false;
  if (/より|どちら/.test(jp) && !t.some((_, j) => isER(t, j))) return false;
  if (/同じくらい/.test(jp) && (!t.includes("as") || t.includes("not"))) return false;
  if (/ほど/.test(jp) && (!t.includes("as") || !t.includes("not"))) return false;
  return true;
}
const valid = (jp, s) => sentenceOk(s) && cueOk(jp, s);
// Who is 〜? → 〜 is.／Who runs 〜? → 〜 does.
function ansOk(question, answer) {
  const v = tokens(question)[1], want = /^(is|are|was|were|can)$/.test(v) ? v : "does", a = tokens(answer);
  return a.length >= 2 && a[a.length - 1] === want && !a.slice(0, -1).some((w) => /^(is|are|do|does|can)$/.test(w));
}
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 2 && !/[ぁ-んァ-ン一-龥（＋〜→]/.test(s);

test("比較のきまり：-er than・the -est と in／of・more／most・as 〜 as・better／best", () => {
  assert.ok(["Ken is taller than Riku.", "This dog is bigger than that one.", "Ken is the tallest in his class.", "Ken is the tallest of the three.",
    "This book is more interesting than that one.", "This is the most famous temple in Japan.", "Ken is as tall as Riku.", "I am not as tall as my brother.",
    "Who is taller, Ken or Riku?", "Which do you like better, tea or coffee?", "I like soccer the best of all sports.", "Riku can swim as well as Ken."].every(sentenceOk));
  assert.ok(!["Ken is more tall than Riku.", "Ken is tallest than Riku.", "Ken is tall than Riku.", "This dog is biger than that one.", "Ken is tallest in his class.",
    "Ken is the tallest of his class.", "Ken is the tallest in the three.", "This book is interestinger than that one.", "This is most famous temple in Japan.",
    "Ken is as taller as Riku.", "Ken is as tall than Riku.", "Who is the taller, Ken or Riku?", "I like tea more good.", "This box is so heavy as that one."].some(sentenceOk));
  assert.ok(!cueOk("「わたしは兄ほど背が高くありません。」", "I am as tall as my brother.") && !cueOk("「…と同じくらい」", "I am not as tall as my sister."));
  assert.ok(ansOk("Who is taller, Ken or Riku?", "Ken is.") && !ansOk("Who runs faster, Ken or Riku?", "Ken is."));
});

test("英文を選ぶ問題：正解だけが比較の形と日本語の意味（いちばん・より・同じくらい・ほど〜ない）に合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(valid(q.text, c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 40, "英文を選ぶ問題 " + n);
});

test("（ ）に入れる問題：正解を入れた文だけが比較の形・意味・答え方に合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").trim();
    if (!/（ ）/.test(text)) return;
    n++;
    const [qs, as] = text.split(" — ");
    q.choices.forEach((c) => {
      const ok = as !== undefined ? sentenceOk(qs) && ansOk(qs, as.replace("（ ）", c.label)) : valid(q.text, qs.replace("（ ）", c.label));
      assert.equal(ok, c.key === q.answer, id + " " + text.replace("（ ）", c.label));
    });
  });
  assert.ok(n >= 50, "（ ）の問題 " + n);
});

test("中2 英語 比較：動名詞の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学2年"].slice(0, 5), ["未来形", "助動詞", "不定詞", "動名詞", U]);
  assert.deepEqual(E.UNITS[U], SK);
  SK.forEach((k) => {
    assert.equal(E.SKILLS[k].grade, "中2");
    E.SKILLS[k].prerequisites.forEach((p) => {
      assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p);
      assert.equal(E.SKILLS[p].subject, "英語", k + " の前提 " + p);
    });
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.ok(all.every((q) => q.subject === "英語"));
  assert.equal(C.unitCheck(U).questions.length, 5);
});
