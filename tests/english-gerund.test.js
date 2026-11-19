// node --test tests/*.test.js — 中2 英語「動名詞」：enjoy・finish・stop ＋ 〜ing・〜ing の主語／補語・前置詞 ＋ 〜ing・to と 〜ing の使い分け・否定文と疑問文を確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "動名詞";
const SK = ["grObj", "grSubj", "grPrep", "grVsTo", "grQues"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s, skill: s.skill || q.skill })) : [{ id: q.id, q, skill: q.skill }]));

const words = (s) => s.split(" ");
const BASE = new Set(words("play read take get go talk swim write clean do run practice kick wash cry walk drive snow rain draw blow watch make listen eat cook " +
  "sing speak become learn travel win fish teach sell help come have send invite dance leave show give bake brush hope want decide enjoy finish stop like start " +
  "begin see visit work buy study climb choose wait say stretch"));
const IRR = { read: "read", take: "took", get: "got", go: "went", swim: "swam", write: "wrote", do: "did", run: "ran", drive: "drove", draw: "drew", blow: "blew",
  make: "made", eat: "ate", sing: "sang", speak: "spoke", become: "became", win: "won", teach: "taught", sell: "sold", come: "came", have: "had", send: "sent",
  leave: "left", give: "gave", begin: "began", see: "saw", buy: "bought", choose: "chose", say: "said", stop: "stopped" };
const DOUBLE = new Set(words("swim run get win begin stop"));
const pastOf = (v) => IRR[v] || (/e$/.test(v) ? v + "d" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ied" : v + "ed");
const thirdOf = (v) => (v === "have" ? "has" : /(s|sh|ch|x|o)$/.test(v) ? v + "es" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ies" : v + "s");
const ingOf = (v) => (DOUBLE.has(v) ? v + v.slice(-1) + "ing" : /[^e]e$/.test(v) ? v.slice(0, -1) + "ing" : v + "ing");
const LEMMA = new Map();
BASE.forEach((v) => [v, pastOf(v), thirdOf(v), ingOf(v)].forEach((w) => { if (!LEMMA.has(w)) LEMMA.set(w, v); }));
const PAST = new Set([...BASE].map(pastOf)), THIRD = new Set([...BASE].map(thirdOf)), ING = new Set([...BASE].map(ingOf));
const lemma = (w) => LEMMA.get(w) || w;
const BE = /^(am|is|are|was|were)$/, MODAL = /^(must|may|should|can|will)$/;
const AUX = /^(am|is|are|was|were|do|does|did|must|may|should|can|will)$/;
const NOT_ING = /^(morning|evening|something|anything|nothing|interesting|exciting|shopping|building)$/;
const verbish = (w) => BASE.has(w) || PAST.has(w) || THIRD.has(w) || ING.has(w) || AUX.test(w);
const ING_ONLY = new Set(["enjoy", "finish", "stop"]), TO_ONLY = new Set(["want", "hope", "decide"]), BOTH = new Set(["like", "start", "begin"]);
const PREP = /^(at|in|for|about|before|after|without)$/;
const NAMES = new Set(words("ken yumi saki riku"));

function tokens(text) {
  return text.replace(/^(But|Then|Next|So) /, "").replace(/n't\b/g, " not").replace(/'m\b/g, " am").replace(/[.?,!]/g, "").toLowerCase().split(" ").filter(Boolean);
}
// つづりのまちがった 〜ing（swiming・writeing など）
const badWord = (w) => /ing$/.test(w) && !ING.has(w) && !NOT_ING.test(w);
function subjectNum(s) {
  if (!s.length || s.some(verbish) || s.includes("to") || s.includes("not")) return null;
  if (s.length === 1) {
    const w = s[0];
    if (w === "i") return "i";
    if (/^(you|we|they)$/.test(w)) return "pl";
    return /^(he|she|it)$/.test(w) || NAMES.has(w) ? "sg" : null;
  }
  if (!/^(my|your|his|her|our|their|the|a|this|that)$/.test(s[0]) || s.length > 3) return null;
  return /s$/.test(s[s.length - 1]) ? "pl" : "sg";
}
const beAgree = (b, num) => (b === "am" ? num === "i" : b === "is" ? num === "sg" : b === "was" ? num === "sg" || num === "i" : num === "pl");
const verbAgree = (w, num) => (PAST.has(w) && !BASE.has(w)) || (THIRD.has(w) ? num === "sg" : BASE.has(w) && num !== "sg");
// 残りの語：動詞は to ＋ もとの形か、enjoy・finish・stop・like・start・前置詞・be動詞のあとの 〜ing だけ
function restOk(r, prev) {
  for (let j = 0; j < r.length; j++) {
    const p = j === 0 ? prev : r[j - 1], w = r[j], lp = lemma(p);
    if (w === "to" && (PREP.test(p) || ING_ONLY.has(lp))) return false;
    if (!verbish(w)) continue;
    if (BASE.has(w) && p === "to") continue;
    if (ING.has(w) && (PREP.test(p) || ING_ONLY.has(lp) || BOTH.has(lp) || BE.test(p))) continue;
    return false;
  }
  return true;
}
function sentenceOk(text) {
  const t = tokens(text);
  if (t.some(badWord) || /^(yes|no)$/.test(t[0])) return false;
  if (/\.$/.test(text)) {
    if (t[0] === "thank") return t[1] === "you" && restOk(t.slice(2), "you");
    if (ING.has(t[0])) {                      // 〜ing が主語：〜ing … is／was 〜.
      const k = t.findIndex((w, j) => j > 0 && verbish(w) && !(BASE.has(w) && t[j - 1] === "to"));
      return k > 0 && /^(is|was)$/.test(t[k]) && !t.slice(1, k).includes("not") && restOk(t.slice(1, k), t[0]) && restOk(t.slice(k + 1), t[k]);
    }
    const k = t.findIndex(verbish);
    if (k < 1) return false;
    const num = subjectNum(t.slice(0, k)), w = t[k], r = t.slice(k + 1);
    if (!num) return false;
    if (BE.test(w)) return beAgree(w, num) && restOk(r, w);
    if (MODAL.test(w)) return BASE.has(r[0]) && restOk(r.slice(1), r[0]);
    if (/^(do|does|did)$/.test(w) && r[0] === "not") return (w === "did" || (w === "does") === (num === "sg")) && BASE.has(r[1]) && restOk(r.slice(2), r[1]);
    return verbAgree(w, num) && restOk(r, w);
  }
  if (!/\?$/.test(text)) return false;
  if (t[0] === "how" && t[1] === "about") return ING.has(t[2]) && restOk(t.slice(3), t[2]);
  const i = /^(what|where|when|who)$/.test(t[0]) ? 1 : 0, a = t[i];
  if (BE.test(a)) {
    const num = subjectNum([t[i + 1]]);
    return !!num && beAgree(a, num) && restOk(t.slice(i + 2), a);
  }
  if (!/^(do|does|did)$/.test(a)) return false;
  const v = t.findIndex((w, j) => j > i + 1 && verbish(w));
  if (v < 0) return false;
  const num = subjectNum(t.slice(i + 1, v));
  return !!num && (a === "did" || (a === "does") === (num === "sg")) && BASE.has(t[v]) && restOk(t.slice(v + 1), t[v]);
}
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 2 && !/[ぁ-んァ-ン一-龥（＋〜→]/.test(s);

test("動名詞のきまり：〜ing をとる動詞・to をとる動詞・前置詞のあと・主語の 〜ing・疑問文", () => {
  assert.ok(["I enjoyed playing tennis.", "Playing soccer is fun.", "My hobby is reading books.", "I am good at swimming.", "Thank you for helping me.",
    "How about going to the park?", "I want to swim.", "I want to start studying science.", "I will finish my homework before leaving home.",
    "Did you enjoy cooking?", "What do you enjoy doing?", "What is Saki good at doing?", "I don't like cooking.", "Do you like shopping?"].every(sentenceOk));
  assert.ok(!["I enjoyed to play tennis.", "I enjoyed play tennis.", "Play soccer is fun.", "Playing soccer are fun.", "I am good at to swim.",
    "Thank you for help me.", "How about go to the park?", "I want swimming.", "I hope coming here again.", "Did you enjoyed cooking?",
    "What did you enjoy to do?", "We enjoy runing every morning.", "Does Ken good at singing?", "Playing the piano not is easy for me."].some(sentenceOk));
});

test("英文を選ぶ問題：正解だけが 〜ing と to の使い分けと文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 40, "英文を選ぶ問題 " + n);
});

test("（ ）に入れる問題：正解を入れた文だけが文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").trim();
    if (!/（ ）/.test(text)) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(text.replace("（ ）", c.label)), c.key === q.answer, id + " " + text.replace("（ ）", c.label)));
  });
  assert.ok(n >= 50, "（ ）の問題 " + n);
});

test("中2 英語 動名詞：不定詞の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学2年"].slice(0, 4), ["未来形", "助動詞", "不定詞", U]);
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
