// node --test tests/*.test.js — 中1 英語「過去形」：過去形のつくり方・didn't・Did 〜?・was／were を文のきまりから確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "過去形";
const SK = ["psReg", "psIrr", "psNeg", "psQues", "psBe"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s, skill: s.skill || q.skill })) : [{ id: q.id, q, skill: q.skill }]));

const words = (s) => s.split(" ");
// 規則動詞：ed・d・ied・最後の字を重ねる。不規則動詞は1つずつ
const REGULAR = words("play watch visit clean cook help walk talk listen live study try carry stop practice wash dance call start use stay climb finish");
const IRREGULAR = { go: "went", eat: "ate", make: "made", meet: "met", have: "had", sing: "sang", buy: "bought", get: "got", write: "wrote", read: "read",
  come: "came", swim: "swam", find: "found", give: "gave", leave: "left", take: "took", sleep: "slept", pay: "paid", win: "won", draw: "drew", do: "did",
  is: "was", am: "was", are: "were" };
function past(v) {
  if (IRREGULAR[v]) return IRREGULAR[v];
  if (v === "stop") return "stopped";
  if (/e$/.test(v)) return v + "d";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ied";
  return v + "ed";
}
function third(v) {
  if (v === "have") return "has";
  if (/(s|sh|ch|x|o)$/.test(v)) return v + "es";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  return v + "s";
}
const BASE = new Set([...REGULAR, ...Object.keys(IRREGULAR).filter((v) => !/^(is|am|are)$/.test(v))]);
const PAST = new Set([...BASE].map(past)), THIRD = new Set([...BASE].map(third));
const ADJ = new Set(words("busy tired happy sick hot cold fun great nice sunny rainy cloudy easy difficult interesting free small early"));
const badEd = (w) => /ed$/.test(w) && !PAST.has(w) && !ADJ.has(w) && !/^(bed|red)$/.test(w);
const AUX = /^(am|is|are|was|were|do|does|did|not|can|be)$/;
const verbish = (w) => BASE.has(w) || PAST.has(w) || THIRD.has(w) || badEd(w) || AUX.test(w) || /ing$/.test(w) && !/^(morning|evening|anything|something|interesting|spring)$/.test(w);
const PRON = /^(i|you|he|she|it|we|they)$/;
const NAMES = new Set(words("ken yumi saki riku mai tom"));
const COMP = (w) => ADJ.has(w) || /^(at|in|on|from|with|to|yesterday|last|then)$/.test(w);

function tokens(text) {
  return text.replace(/^But /, "").replace(/\bcan't\b/g, "can not").replace(/n't\b/g, " not").replace(/[.?,]/g, "").toLowerCase().split(" ").filter(Boolean);
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
  if (!/^(my|your|his|her|our|their|the|a|this|that)$/.test(s[0]) || s.length > 3) return null;
  return /s$/.test(s[s.length - 1]) || s[s.length - 1] === "children" ? "pl" : "sg";
}
const wasOk = (be, num) => (be === "was" ? num === "i" || num === "sg" : num === "pl");
const restOk = (r) => !r.some(verbish);
function sentenceOk(text) {
  const t = tokens(text);
  if (/\.$/.test(text)) {
    const k = t.findIndex(verbish);
    if (k < 1) return false;
    const num = subjectNum(t.slice(0, k)), w = t[k], r = t.slice(k + 1);
    if (!num) return false;
    if (/^(was|were)$/.test(w)) { const c = r[0] === "not" ? r.slice(1) : r; return wasOk(w, num) && c.length > 0 && restOk(c); }
    if (w === "did") {
      if (r[0] === "not") return BASE.has(r[1]) && restOk(r.slice(2));
      // did が「した」の意味（宿題をした）のときだけ
      return /^(my|your|his|her|our|their)$/.test(r[0]) && r.includes("homework") && restOk(r);
    }
    return PAST.has(w) && restOk(r);
  }
  if (!/\?$/.test(text)) return false;
  let i = 0;
  if (/^(what|where|when|who|how|which)$/.test(t[0])) {
    i = 1;
    if (/^(what|which)$/.test(t[0])) while (i < t.length && !verbish(t[i]) && !PRON.test(t[i]) && !NAMES.has(t[i])) i++;
    if (t[0] === "who" && PAST.has(t[1]) && t[1] !== "did") return restOk(t.slice(2));
  }
  const a = t[i];
  if (a === "did") {
    const v = t.findIndex((w, j) => j > i + 1 && verbish(w));
    return v > i + 1 && !!subjectNum(t.slice(i + 1, v)) && BASE.has(t[v]) && restOk(t.slice(v + 1));
  }
  if (/^(was|were)$/.test(a)) {
    let c = t.findIndex((w, j) => j > i + 1 && COMP(w));
    if (c < 0) { if (i === 0) return false; c = t.length; }
    const num = subjectNum(t.slice(i + 1, c));
    return !!num && wasOk(a, num) && restOk(t.slice(c));
  }
  return false;
}
// 主語を代名詞にかえる（答えの文の主語）
function pronounOf(s) {
  if (s.join(" ") === "you") return "i";
  if (s.includes("and")) return s.includes("you") ? "we" : "they";
  if (s.length === 1 && /^(he|she|it|we|they)$/.test(s[0])) return s[0];
  const w = s[s.length - 1];
  if (/^(ken|riku|tom|brother|father)$/.test(w)) return "he";
  if (/^(yumi|saki|mai|sister|mother)$/.test(w)) return "she";
  return subjectNum(s) === "pl" ? "they" : "it";
}
// 疑問文の主語（did・was・were のあと）
function questionSubject(t) {
  const a = t.findIndex((w) => /^(did|was|were)$/.test(w));
  const e = t[a] === "did" ? t.findIndex((w, j) => j > a + 1 && verbish(w)) : t.findIndex((w, j) => j > a + 1 && COMP(w));
  return { aux: t[a], subj: t.slice(a + 1, e < 0 ? t.length : e) };
}
// Did・Was・Were 〜? の答え：Yes なら 代名詞 ＋ did／was／were、No なら そのあとに not
function ynOk(question, answer) {
  const { aux, subj } = questionSubject(tokens(question)), p = pronounOf(subj), a = tokens(answer);
  const v = aux === "did" ? "did" : p === "i" || /^(he|she|it)$/.test(p) ? "was" : "were";
  if (a[0] === "yes") return a.length === 3 && a[1] === p && a[2] === v;
  return a[0] === "no" && a.length === 4 && a[1] === p && a[2] === v && a[3] === "not";
}
// 疑問詞の質問の答え：主語を代名詞にかえた過去の文
function whAnsOk(question, answer) {
  return sentenceOk(answer) && tokens(answer)[0] === pronounOf(questionSubject(tokens(question)).subj);
}
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 2 && !/[ぁ-んァ-ン一-龥（＋〜→]/.test(s) && !/^(Yes|No),/.test(s);

test("過去形のきまり：過去形・didn't ＋ もとの形・Did ＋ 主語 ＋ もとの形?・was／were", () => {
  assert.ok(["I played tennis yesterday.", "I went to the park.", "He didn't eat lunch.", "Did you go to the zoo?", "What did you do yesterday?", "Who made this cake?",
    "I was busy yesterday.", "Were you at home?", "How was your trip?", "I did my homework."].every(sentenceOk));
  assert.ok(!["I play tennis yesterday.", "I goed to the park.", "He didn't ate lunch.", "Did you went to the zoo?", "What you did yesterday?", "Who did make this cake?",
    "I were busy yesterday.", "Was you at home?", "Did you busy?", "I did tired.", "He doesn't eat lunch yesterday."].some(sentenceOk));
  assert.deepEqual(["play", "live", "study", "stop", "stay", "go", "eat"].map(past), ["played", "lived", "studied", "stopped", "stayed", "went", "ate"]);
});

test("英文を選ぶ問題：正解だけが過去の文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q)) || /の答え|と答える/.test(q.text)) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 45, "英文を選ぶ問題 " + n);
});

test("過去形を選ぶ問題：正解だけが過去形のつくり方に合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    const m = q.type === "choice" && q.text.match(/^(\w+) の過去形は？/);
    if (!m) return;
    n++;
    q.choices.forEach((c) => assert.equal(c.label === past(m[1]), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 10, "過去形の問題 " + n);
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

test("答えを選ぶ問題：Did・Was・Were 〜? には did・was・were で、疑問詞の質問には 代名詞 ＋ 過去の文で答える", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    const m = q.type === "choice" && q.text.match(/^([A-Z][^?]*\?) の答え/);
    if (!m) return;
    n++;
    const ok = /^(Did|Was|Were) /.test(m[1]) ? (a) => ynOk(m[1], a) : (a) => whAnsOk(m[1], a);
    q.choices.forEach((c) => assert.equal(ok(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 7, "答えの問題 " + n);
});

test("中1 英語 過去形：現在進行形の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学1年"].slice(0, 9), ["be動詞", "一般動詞", "3人称単数現在", "名詞の複数形", "命令文", "can", "疑問詞", "現在進行形", U]);
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
