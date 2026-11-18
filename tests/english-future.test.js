// node --test tests/*.test.js — 中2 英語「未来形」：will ＋ もとの形・won't・Will 〜?・be going to とその否定文・疑問文を文のきまりから確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "未来形";
const SK = ["ftWill", "ftWillNQ", "ftGoing", "ftGoingNQ", "ftWhat"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s, skill: s.skill || q.skill })) : [{ id: q.id, q, skill: q.skill }]));

const words = (s) => s.split(" ");
// 動詞のもとの形と、まちがいの選択肢に出てくる過去形・3人称単数の形
const BASE = new Set(words("go visit play watch study eat cook make buy clean help call come stay leave take see meet read write rain snow be have choose " +
  "practice swim live sing decorate drive work travel do ski bring get use"));
const IRR = { go: "went", eat: "ate", make: "made", buy: "bought", come: "came", leave: "left", take: "took", see: "saw", meet: "met", write: "wrote", have: "had",
  choose: "chose", swim: "swam", sing: "sang", drive: "drove", do: "did", bring: "brought", get: "got" };
const pastOf = (v) => IRR[v] || (/e$/.test(v) ? v + "d" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ied" : v + "ed");
const thirdOf = (v) => (v === "have" ? "has" : /(s|sh|ch|x|o)$/.test(v) ? v + "es" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ies" : v + "s");
const PAST = new Set([...BASE].map(pastOf)), THIRD = new Set([...BASE].map(thirdOf));
const AUX = /^(am|is|are|was|were|do|does|did|will|not|can)$/;
const NOT_ING = /^(morning|evening|something|anything|spring|during)$/;
const verbish = (w) => BASE.has(w) || PAST.has(w) || THIRD.has(w) || AUX.test(w) || (/ing$/.test(w) && !NOT_ING.test(w));
const NAMES = new Set(words("ken yumi saki riku emma tom dad mom"));

function tokens(text) {
  return text.replace(/^But /, "").replace(/\b(I)'m\b/g, "$1 am").replace(/\b(you|we|they|You|We|They)'re\b/g, "$1 are").replace(/\b(he|she|it|He|She|It)'s\b/g, "$1 is")
    .replace(/\bwon't\b/g, "will not").replace(/\bwilln't\b/g, "willnt").replace(/n't\b/g, " not").replace(/[.?,]/g, "").toLowerCase().split(" ").filter(Boolean);
}
// 主語の数：「i」「sg」「pl」。主語にならなければ null
function subjectNum(s) {
  if (!s.length || s.some(verbish)) return null;
  if (s.includes("and")) { const k = s.indexOf("and"); return subjectNum(s.slice(0, k)) && subjectNum(s.slice(k + 1)) ? "pl" : null; }
  if (s.length === 1) {
    const w = s[0];
    if (w === "i") return "i";
    if (/^(you|we|they)$/.test(w)) return "pl";
    return /^(he|she|it)$/.test(w) || NAMES.has(w) ? "sg" : null;
  }
  if (!/^(my|your|his|her|our|their|the|a|this|that|two|three|five)$/.test(s[0]) || s.length > 3) return null;
  return /s$/.test(s[s.length - 1]) ? "pl" : "sg";
}
const agree = (be, num) => (be === "am" ? num === "i" : be === "is" ? num === "sg" : num === "pl");
const restOk = (r) => !r.some(verbish);
// will のあと：もとの形 ＋ 動詞をふくまない残り
const afterWill = (r) => BASE.has(r[0]) && restOk(r.slice(1));
// be動詞のあと：going to ＋ もとの形 ＋ 残り
const afterBe = (r) => r[0] === "going" && r[1] === "to" && BASE.has(r[2]) && restOk(r.slice(3));
function sentenceOk(text) {
  const t = tokens(text);
  if (/\.$/.test(text)) {
    const k = t.findIndex(verbish);
    if (k < 1) return false;
    const num = subjectNum(t.slice(0, k)), w = t[k];
    let r = t.slice(k + 1);
    if (r[0] === "not") r = r.slice(1);
    if (!num) return false;
    if (w === "will") return afterWill(r);
    return /^(am|is|are)$/.test(w) && agree(w, num) && afterBe(r);
  }
  if (!/\?$/.test(text)) return false;
  let i = 0;
  if (t[0] === "what" && t[1] === "time") i = 2;
  else if (/^(what|where|when|who|how)$/.test(t[0])) i = 1;
  if (t[0] === "who") return (t[1] === "will" && afterWill(t.slice(2))) || (t[1] === "is" && afterBe(t.slice(2)));
  const a = t[i], v = t.findIndex((w, j) => j > i + 1 && verbish(w));
  if (v < 0) return false;
  const num = subjectNum(t.slice(i + 1, v));
  if (!num) return false;
  if (a === "will") return afterWill(t.slice(v));
  return /^(am|is|are)$/.test(a) && agree(a, num) && afterBe(t.slice(v));
}
// 主語を代名詞にかえる（答えの文の主語）
function pronounOf(s) {
  if (s.join(" ") === "you") return "i";
  if (s.includes("and")) return s.includes("you") ? "we" : "they";
  if (s.length === 1 && /^(he|she|it|we|they)$/.test(s[0])) return s[0];
  const w = s[s.length - 1];
  if (/^(ken|riku|tom|dad|brother|father)$/.test(w)) return "he";
  if (/^(yumi|saki|emma|mom|sister|mother)$/.test(w)) return "she";
  return subjectNum(s) === "pl" ? "they" : "it";
}
// 疑問文の助動詞（will・be動詞）と主語
function questionParts(question) {
  const t = tokens(question), a = t.findIndex((w) => /^(will|am|is|are)$/.test(w)), v = t.findIndex((w, j) => j > a + 1 && verbish(w));
  return { aux: t[a], subj: t.slice(a + 1, v) };
}
const beOf = (p) => (p === "i" ? "am" : /^(he|she|it)$/.test(p) ? "is" : "are");
// Will 〜? には will・won't、be going to の疑問文には be動詞で答える
function ynOk(question, answer) {
  const { aux, subj } = questionParts(question), p = pronounOf(subj), v = aux === "will" ? "will" : beOf(p), a = tokens(answer);
  if (a[0] === "yes") return a.length === 3 && a[1] === p && a[2] === v;
  return a[0] === "no" && a.length === 4 && a[1] === p && a[2] === v && a[3] === "not";
}
// 疑問詞の質問の答え：主語を代名詞にかえた未来の文
const whAnsOk = (question, answer) => sentenceOk(answer) && tokens(answer)[0] === pronounOf(questionParts(question).subj);
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 2 && !/[ぁ-んァ-ン一-龥（＋〜→]/.test(s) && !/^(Yes|No),/.test(s);

test("未来形のきまり：will ＋ もとの形・won't・Will 〜?・be going to ＋ もとの形と、その否定文・疑問文", () => {
  assert.ok(["I will visit Kyoto tomorrow.", "It will be sunny.", "He won't come.", "Will you be free tomorrow?", "I'm going to play tennis.", "Ken isn't going to study.",
    "Are you going to swim?", "What are you going to do?", "Where will you go?", "Who will help us?", "Who is going to come?"].every(sentenceOk));
  assert.ok(!["I will visits Kyoto.", "I will to visit Kyoto.", "It will sunny.", "I don't will go.", "Do you will come?", "I going to play tennis.", "I'm going play tennis.",
    "Ken are going to study.", "Do you going to swim?", "What you are going to do?", "Who wills help us?", "I visit Kyoto tomorrow."].some(sentenceOk));
});

test("英文を選ぶ問題：正解だけが未来の文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q)) || /の答え|と答える/.test(q.text)) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 40, "英文を選ぶ問題 " + n);
});

test("（ ）に入れる問題：正解を入れた文だけが文のきまり・答え方に合う。疑問詞は日本語の意味から", () => {
  let n = 0;
  const cue = (s) => (/だれ/.test(s) ? "Who" : /どこ/.test(s) ? "Where" : /いつ/.test(s) ? "When" : /何/.test(s) ? "What" : null);
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
  assert.ok(n >= 45, "（ ）の問題 " + n);
});

test("答えを選ぶ問題：Will 〜? には will・won't、be going to の疑問文には be動詞、疑問詞の質問には 代名詞 ＋ 未来の文", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    const m = q.type === "choice" && q.text.match(/^([A-Z][^?]*\?) の答え/);
    if (!m) return;
    n++;
    const ok = /^(Will|Is|Are) /.test(m[1]) ? (a) => ynOk(m[1], a) : (a) => whAnsOk(m[1], a);
    q.choices.forEach((c) => assert.equal(ok(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 12, "答えの問題 " + n);
});

test("中2 英語 未来形：中学2年の最初の単元・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学2年"].slice(0, 1), [U]);
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
