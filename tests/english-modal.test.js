// node --test tests/*.test.js — 中2 英語「助動詞」：助動詞 ＋ もとの形・have to／has to・must not と don't have to の意味・may と should・疑問文の答え方を確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "助動詞";
const SK = ["mdMust", "mdHave", "mdNeg", "mdMay", "mdQues"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s, skill: s.skill || q.skill })) : [{ id: q.id, q, skill: q.skill }]));

const words = (s) => s.split(" ");
const BASE = new Set(words("do go get eat take clean help study practice read write wear return feed bring meet leave stay drink pack buy work walk come make use see " +
  "be ask sit open close sleep rest keep borrow try say talk laugh call play swim run hurry forget touch speak exercise learn show cook watch wash pay have visit rain snow wait"));
const IRR = { do: "did", go: "went", get: "got", eat: "ate", take: "took", write: "wrote", wear: "wore", bring: "brought", meet: "met", leave: "left", drink: "drank",
  buy: "bought", come: "came", make: "made", see: "saw", sit: "sat", sleep: "slept", keep: "kept", say: "said", swim: "swam", run: "ran", forget: "forgot",
  speak: "spoke", pay: "paid", have: "had" };
const pastOf = (v) => (v === "be" ? "was" : IRR[v]) || (/e$/.test(v) ? v + "d" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ied" : v + "ed");
const thirdOf = (v) => (v === "have" ? "has" : /(s|sh|ch|x|o)$/.test(v) ? v + "es" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ies" : v + "s");
const PAST = new Set([...BASE].map(pastOf)), THIRD = new Set([...BASE].map(thirdOf));
const MODAL = /^(must|may|should|can|will)$/;
const AUX = /^(am|is|are|was|were|do|does|did|not|must|may|should|can|will)$/;
const verbish = (w) => BASE.has(w) || PAST.has(w) || THIRD.has(w) || AUX.test(w) || (/ing$/.test(w) && !/^(morning|evening|something|anything)$/.test(w));
const NAMES = new Set(words("ken yumi saki riku emma dad"));

function tokens(text) {
  return text.replace(/^But /, "").replace(/n't\b/g, " not").replace(/[.?,]/g, "").toLowerCase().split(" ").filter(Boolean);
}
// 主語の数：「i」「sg」「pl」。主語にならなければ null
function subjectNum(s) {
  if (!s.length || s.some(verbish)) return null;
  if (s.includes("and")) { const k = s.indexOf("and"); return subjectNum(s.slice(0, k)) && subjectNum(s.slice(k + 1)) ? "pl" : null; }
  if (s.length === 1) {
    const w = s[0];
    if (w === "i") return "i";
    if (/^(you|we|they|children|students)$/.test(w)) return "pl";
    return /^(he|she|it)$/.test(w) || NAMES.has(w) ? "sg" : null;
  }
  if (!/^(my|your|his|her|our|their|the|a|this|that)$/.test(s[0]) || s.length > 3) return null;
  return /s$/.test(s[s.length - 1]) || s[s.length - 1] === "children" ? "pl" : "sg";
}
const restOk = (r) => !r.some(verbish);
// 助動詞（must・may・should）のあと：（not）＋ もとの形 ＋ 残り
const afterModal = (r) => { if (r[0] === "not") r = r.slice(1); return BASE.has(r[0]) && restOk(r.slice(1)); };
const afterHaveTo = (r) => r[0] === "to" && BASE.has(r[1]) && restOk(r.slice(2));
const doAgree = (d, num) => (d === "does") === (num === "sg");
function sentenceOk(text) {
  const t = tokens(text);
  if (/\.$/.test(text)) {
    const k = t.findIndex(verbish);
    if (k < 1) return false;
    const num = subjectNum(t.slice(0, k)), w = t[k], r = t.slice(k + 1);
    if (!num) return false;
    if (MODAL.test(w)) return afterModal(r);
    if (/^(have|has)$/.test(w)) return (w === "has") === (num === "sg") && afterHaveTo(r);
    if (/^(do|does)$/.test(w)) return doAgree(w, num) && r[0] === "not" && r[1] === "have" && afterHaveTo(r.slice(2));
    return false;
  }
  if (!/\?$/.test(text)) return false;
  const i = t[0] === "what" && t[1] === "time" ? 2 : /^(what|where|when)$/.test(t[0]) ? 1 : 0;
  const a = t[i], v = t.findIndex((w, j) => j > i + 1 && verbish(w));
  if (v < 0) return false;
  const num = subjectNum(t.slice(i + 1, v));
  if (!num) return false;
  if (MODAL.test(a)) return BASE.has(t[v]) && restOk(t.slice(v + 1));
  if (/^(do|does)$/.test(a)) return doAgree(a, num) && t[v] === "have" && afterHaveTo(t.slice(v + 1));
  return false;
}
// 文の意味：need（しなければならない）・ban（してはいけない）・noneed（しなくてもよい）・may・should・shouldnt
function meaning(text) {
  const t = tokens(text);
  for (let i = 0; i < t.length; i++) {
    const w = t[i], neg = t[i + 1] === "not";
    if (w === "must") return neg ? "ban" : "need";
    if (/^(have|has)$/.test(w) && t[i + 1] === "to") return t[i - 1] === "not" ? "noneed" : "need";
    if (w === "may") return neg ? "maynot" : "may";
    if (w === "should") return neg ? "shouldnt" : "should";
    if (w === "can") return "can";
  }
  return null;
}
// 日本語の文から、表したい意味を決める
function cue(jp) {
  if (/[てで]はいけ|[てで]はだめ/.test(jp)) return "ban";
  if (/なくてもい|なくてもよ|なくていい|必要はな/.test(jp)) return "noneed";
  if (/べきでは|ないほうが/.test(jp)) return "shouldnt";
  if (/べき|ほうがい|ほうがよ/.test(jp)) return "should";
  if (/なければ|ないといけ/.test(jp)) return "need";
  if (/てもい|てもよ|かもしれ/.test(jp)) return "may";
  return null;
}
const valid = (jp, s) => sentenceOk(s) && (cue(jp) === null || meaning(s) === cue(jp));
// 主語を代名詞にかえる（答えの文の主語）
function pronounOf(s) {
  if (s.join(" ") === "i") return "you";
  if (s.join(" ") === "you") return "i";
  if (s.length === 1 && /^(he|she|it|they)$/.test(s[0])) return s[0];
  const w = s[s.length - 1];
  if (/^(ken|riku|dad|brother|father|him)$/.test(w)) return "he";
  if (/^(yumi|saki|emma|sister|mother)$/.test(w)) return "she";
  return subjectNum(s) === "pl" ? "they" : "it";
}
function questionParts(question) {
  const t = tokens(question), a = t.findIndex((w) => MODAL.test(w) || /^(do|does)$/.test(w)), v = t.findIndex((w, j) => j > a + 1 && verbish(w));
  return { aux: t[a], subj: t.slice(a + 1, v) };
}
// Must I 〜? → Yes, you must.／No, you don't have to.　Do I have to 〜? → Yes, you do.／No, you don't (have to).　Should I 〜? → you should／shouldn't
function ynOk(question, answer) {
  const { aux, subj } = questionParts(question), p = pronounOf(subj), a = tokens(answer), d = /^(he|she|it)$/.test(p) ? "does" : "do";
  if (a[1] !== p) return false;
  const rest = a.slice(2).join(" ");
  if (aux === "must") return a[0] === "yes" ? rest === "must" : a[0] === "no" && rest === d + " not have to";
  if (/^(do|does)$/.test(aux)) return a[0] === "yes" ? rest === d : a[0] === "no" && (rest === d + " not" || rest === d + " not have to");
  return a[0] === "yes" ? rest === aux : a[0] === "no" && rest === aux + " not";
}
// 疑問詞の質問の答え：主語を代名詞にかえた助動詞の文
const whAnsOk = (question, answer) => sentenceOk(answer) && tokens(answer)[0] === pronounOf(questionParts(question).subj);
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 2 && !/[ぁ-んァ-ン一-龥（＋〜→]/.test(s) && !/^(Yes|No),/.test(s);

test("助動詞のきまり：助動詞 ＋ もとの形・have to と has to・don't have to・助動詞の疑問文", () => {
  assert.ok(["I must do my homework.", "She has to help her mother.", "You must not swim here.", "He doesn't have to go.", "You may use this pen.",
    "You shouldn't say that.", "Do I have to go?", "Does Ken have to go?", "May I come in?", "What should I do?", "What time do I have to come?"].every(sentenceOk));
  assert.ok(!["I must to do my homework.", "She have to help her mother.", "She has to helps her mother.", "You not must swim here.", "He don't have to go.",
    "You may uses this pen.", "You don't should say that.", "Do I must go?", "Does I have to go?", "What I should do?", "I have go."].some(sentenceOk));
  assert.deepEqual(["ここで泳いではいけません。", "急がなくてもいいです。", "寝たほうがいいです。", "言うべきではありません。", "しなければなりません。", "入ってもいいですか。"].map(cue),
    ["ban", "noneed", "should", "shouldnt", "need", "may"]);
});

test("英文を選ぶ問題：正解だけが文のきまりと、日本語の意味（禁止・不要・許可・すすめ）に合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q)) || /の答え|と答える/.test(q.text)) return;
    n++;
    q.choices.forEach((c) => assert.equal(valid(q.text, c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 40, "英文を選ぶ問題 " + n);
});

test("（ ）に入れる問題：正解を入れた文だけが文のきまり・日本語の意味・答え方に合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").trim();
    if (!/（ ）/.test(text)) return;
    n++;
    const [qs, as] = text.split(" — ");
    q.choices.forEach((c) => {
      const ok = as !== undefined ? ynOk(qs, as.replace("（ ）", c.label)) : valid(q.text, qs.replace("（ ）", c.label));
      assert.equal(ok, c.key === q.answer, id + " " + text.replace("（ ）", c.label));
    });
  });
  assert.ok(n >= 50, "（ ）の問題 " + n);
});

test("答えを選ぶ問題：Do・Does 〜 have to? には do・does、疑問詞の質問には 代名詞 ＋ 助動詞の文で答える", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    const m = q.type === "choice" && q.text.match(/^([A-Z][^?]*\?) の答え/);
    if (!m) return;
    n++;
    const ok = /^(Do|Does|Must|May|Should) /.test(m[1]) ? (a) => ynOk(m[1], a) : (a) => whAnsOk(m[1], a);
    q.choices.forEach((c) => assert.equal(ok(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 4, "答えの問題 " + n);
});

test("中2 英語 助動詞：未来形の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学2年"].slice(0, 2), ["未来形", U]);
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
