// node --test tests/*.test.js — 中1 英語「現在進行形」：be動詞 ＋ 〜ing・ing のつづり・否定文・疑問文・What are you doing? を文のきまりから確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "現在進行形";
const SK = ["pgForm", "pgSpell", "pgNeg", "pgQues", "pgWhat"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s, skill: s.skill || q.skill })) : [{ id: q.id, q, skill: q.skill }]));

const words = (s) => s.split(" ");
const BASE = new Set(words("play read write watch study eat cook make swim run sit get use dance ride come sleep listen talk wait wash clean do go take " +
  "draw sing walk drink practice cut stop carry"));
// ing のつけ方：短い音 ＋ 1字は重ねる・e で終わる語は e をとる・ほかはそのまま
const DOUBLE = new Set(words("swim run sit get cut stop"));
function ing(v) {
  if (DOUBLE.has(v)) return v + v.slice(-1) + "ing";
  if (/[^e]e$/.test(v)) return v.slice(0, -1) + "ing";
  return v + "ing";
}
function third(v) {
  if (/(s|sh|ch|x|o)$/.test(v)) return v + "es";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  return v + "s";
}
const ING = new Set([...BASE].map(ing)), THIRD = new Set([...BASE].map(third));
const NOT_ING = /^(sing|anything|something|nothing|morning|evening|thing)$/;
const badIng = (w) => /ing$/.test(w) && !ING.has(w) && !NOT_ING.test(w);
const isVerb = (w) => BASE.has(w) || THIRD.has(w) || ING.has(w) || badIng(w) || w === "wrote";
const AUX = /^(am|is|are|do|does|can|not)$/;
const BE = /^(am|is|are)$/;
const NAMES = new Set(words("ken yumi saki tom emma riku dad mom"));

function tokens(text) {
  return text.replace(/\b(I)'m\b/g, "$1 am").replace(/\b(you|we|they|You|We|They)'re\b/g, "$1 are").replace(/\b(he|she|it|He|She|It)'s\b/g, "$1 is")
    .replace(/\bcan't\b/g, "can not").replace(/n't\b/g, " not").replace(/[.?,]/g, "").toLowerCase().split(" ").filter(Boolean);
}
// 主語の数：「i」「sg」「pl」。主語にならなければ null
function subjectNum(s) {
  if (!s.length || s.some((w) => isVerb(w) || AUX.test(w))) return null;
  if (s.includes("and")) { const k = s.indexOf("and"); return subjectNum(s.slice(0, k)) && subjectNum(s.slice(k + 1)) ? "pl" : null; }
  if (s.length === 1) {
    const w = s[0];
    if (w === "i") return "i";
    if (/^(you|we|they)$/.test(w)) return "pl";
    return /^(he|she|it)$/.test(w) || NAMES.has(w) ? "sg" : null;
  }
  if (!/^(my|your|his|her|our|the|a|this|that|these|those)$/.test(s[0]) || s.length > 3) return null;
  const n = s[s.length - 1];
  return n === "children" || (/s$/.test(n) && !/ss$/.test(n)) ? "pl" : "sg";
}
const agree = (be, num) => (be === "am" ? num === "i" : be === "is" ? num === "sg" : num === "pl");
// 〜ing と、そのあと（動詞・be動詞・do・not をふくまない）
const afterOk = (r) => r.length > 0 && ING.has(r[0]) && !r.slice(1).some((w) => isVerb(w) || AUX.test(w));
function sentenceOk(text) {
  const t = tokens(text);
  if (/\.$/.test(text)) {
    const b = t.findIndex((w) => BE.test(w));
    if (b < 1) return false;
    const num = subjectNum(t.slice(0, b));
    let r = t.slice(b + 1);
    if (r[0] === "not") r = r.slice(1);
    return !!num && agree(t[b], num) && afterOk(r);
  }
  if (!/\?$/.test(text)) return false;
  if (t[0] === "who") return t[1] === "is" && afterOk(t.slice(2));
  const k = /^(what|where)$/.test(t[0]) ? 1 : 0;
  if (!BE.test(t[k])) return false;
  const v = t.findIndex((w, i) => i > k + 1 && isVerb(w));
  if (v < 0) return false;
  const num = subjectNum(t.slice(k + 1, v));
  return !!num && agree(t[k], num) && afterOk(t.slice(v));
}
// 主語を代名詞にかえる（答えの文の主語）
function pronounOf(s) {
  if (s.join(" ") === "you") return "i";
  if (s.includes("and")) return s.includes("you") ? "we" : "they";
  if (s.length === 1 && /^(he|she|it|we|they|i)$/.test(s[0])) return s[0] === "i" ? "you" : s[0];
  const w = s[s.length - 1];
  if (/^(ken|tom|riku|dad|brother|father|man|boy)$/.test(w)) return "he";
  if (/^(yumi|saki|emma|mom|sister|mother|woman|girl)$/.test(w)) return "she";
  return subjectNum(s) === "pl" ? "they" : "it";
}
const beOf = (p) => (p === "i" ? "am" : /^(he|she|it)$/.test(p) ? "is" : "are");
// Is・Are 〜? の答え：Yes なら 代名詞 ＋ be動詞、No なら 代名詞 ＋ be動詞 ＋ not
function ynOk(question, answer) {
  const q = tokens(question), v = q.findIndex((w, i) => i > 1 && isVerb(w)), p = pronounOf(q.slice(1, v)), a = tokens(answer);
  if (a[0] === "yes") return a.length === 3 && a[1] === p && a[2] === beOf(p);
  return a[0] === "no" && a.length === 4 && a[1] === p && a[2] === beOf(p) && a[3] === "not";
}
// What・Where 〜? の答え：主語を代名詞にかえた現在進行形の文
function whAnsOk(question, answer) {
  const q = tokens(question), v = q.findIndex((w, i) => i > 2 && isVerb(w));
  return sentenceOk(answer) && tokens(answer)[0] === pronounOf(q.slice(2, v));
}
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 2 && !/[ぁ-んァ-ン一-龥（＋〜→]/.test(s) && !/^(Yes|No),/.test(s);

test("現在進行形のきまり：be動詞 ＋ 〜ing。否定は be動詞のあとに not、疑問文は be動詞が前", () => {
  assert.ok(["I'm watching TV now.", "Ken is running now.", "They aren't playing now.", "Are you studying now?", "What are you doing?", "Who is cooking?", "Where is Tom running now?"].every(sentenceOk));
  assert.ok(!["I watching TV now.", "Ken is runing now.", "Ken is run now.", "They don't playing now.", "Do you studying now?", "What you are doing?", "Who are cooking?", "He are writing.", "I'm writeing."].some(sentenceOk));
  assert.deepEqual(["swim", "make", "play", "write", "study", "sit", "come"].map(ing), ["swimming", "making", "playing", "writing", "studying", "sitting", "coming"]);
});

test("英文を選ぶ問題：正解だけが現在進行形の文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q)) || /の答え|と答える/.test(q.text)) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 40, "英文を選ぶ問題 " + n);
});

test("ing の形を選ぶ問題：正解だけが ing のつけ方に合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    const m = q.type === "choice" && q.text.match(/^(\w+) の ing の形は？/);
    if (!m) return;
    n++;
    q.choices.forEach((c) => assert.equal(c.label === ing(m[1]), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 8, "ing の形 " + n);
});

test("（ ）に入れる問題：正解を入れた文だけが文のきまり・答え方に合う。疑問詞は日本語の意味から", () => {
  let n = 0;
  const cue = (s) => (/だれ/.test(s) ? "Who" : /どこ/.test(s) ? "Where" : /何/.test(s) ? "What" : null);
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").trim();
    if (!/（ ）/.test(text)) return;
    n++;
    if (q.choices.every((c) => /^(What|Where|Who|When)$/.test(c.label))) {
      q.choices.forEach((c) => assert.equal(c.label === cue(q.text), c.key === q.answer, id + " " + c.label));
      return;
    }
    const [qs, as] = text.split(" — ");
    q.choices.forEach((c) => {
      const ok = as !== undefined ? ynOk(qs, as.replace("（ ）", c.label)) : sentenceOk(qs.replace("（ ）", c.label));
      assert.equal(ok, c.key === q.answer, id + " " + text.replace("（ ）", c.label));
    });
  });
  assert.ok(n >= 40, "（ ）の問題 " + n);
});

test("答えを選ぶ問題：Is・Are 〜? には be動詞で、What・Where 〜? には 代名詞 ＋ be動詞 ＋ 〜ing で答える", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    const m = q.type === "choice" && q.text.match(/^([A-Z][^?]*\?) の答え/);
    if (!m) return;
    n++;
    const ok = /^(Is|Are) /.test(m[1]) ? (a) => ynOk(m[1], a) : (a) => whAnsOk(m[1], a);
    q.choices.forEach((c) => assert.equal(ok(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 12, "答えの問題 " + n);
});

test("中1 英語 現在進行形：疑問詞の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学1年"].slice(0, 8), ["be動詞", "一般動詞", "3人称単数現在", "名詞の複数形", "命令文", "can", "疑問詞", U]);
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
