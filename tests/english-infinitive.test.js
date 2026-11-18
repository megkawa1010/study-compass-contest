// node --test tests/*.test.js — 中2 英語「不定詞」：to ＋ もとの形・want／like to 〜・目的の to・名詞 ＋ to 〜・Why 〜? — To 〜.・It is 〜 for 人 to … を確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "不定詞";
const SK = ["inNoun", "inAdv", "inAdj", "inWhy", "inIt"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s, skill: s.skill || q.skill })) : [{ id: q.id, q, skill: q.skill }]));

const words = (s) => s.split(" ");
const BASE = new Set(words("want play read be visit live make rain take buy go see cook run practice win travel meet study listen write try start decide like help work " +
  "ski fish sing drink do eat watch sit find borrow learn talk wash get stay hear catch leave call ask know finish come exercise swim answer check carry speak need wear tell have"));
const IRR = { buy: "bought", see: "saw", go: "went", get: "got", make: "made", take: "took", run: "ran", win: "won", meet: "met", write: "wrote", eat: "ate",
  drink: "drank", do: "did", have: "had", find: "found", hear: "heard", catch: "caught", leave: "left", know: "knew", come: "came", swim: "swam", tell: "told",
  sit: "sat", sing: "sang", wear: "wore", read: "read" };
const pastOf = (v) => (v === "be" ? "was" : IRR[v]) || (/e$/.test(v) ? v + "d" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ied" : v + "ed");
const thirdOf = (v) => (v === "have" ? "has" : v === "be" ? "is" : /(s|sh|ch|x|o)$/.test(v) ? v + "es" : /[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ies" : v + "s");
const PAST = new Set([...BASE].map(pastOf)), THIRD = new Set([...BASE].map(thirdOf));
const BE = /^(am|is|are|was|were)$/, MODAL = /^(must|may|should|can|will)$/;
const AUX = /^(am|is|are|was|were|do|does|did|must|may|should|can|will|being)$/;
const NOT_ING = /^(morning|evening|something|anything|nothing|interesting|exciting|shopping|building)$/;
const verbish = (w) => BASE.has(w) || PAST.has(w) || THIRD.has(w) || AUX.test(w) || (/ing$/.test(w) && !NOT_ING.test(w));
const NAMES = new Set(words("ken yumi saki riku emma dad mom kyoto tokyo"));
const OBJ = /^(me|him|her|us|them|you|children)$/;

function tokens(text) {
  return text.replace(/^But /, "").replace(/n't\b/g, " not").replace(/'m\b/g, " am").replace(/[.?,!]/g, "").toLowerCase().split(" ").filter(Boolean);
}
// 主語の数：「i」「sg」「pl」「any」（there）。主語にならなければ null
function subjectNum(s) {
  if (!s.length || s.some(verbish) || s.includes("to")) return null;
  if (s.length === 1) {
    const w = s[0];
    if (w === "i") return "i";
    if (w === "there") return "any";
    if (/^(you|we|they|children)$/.test(w)) return "pl";
    return /^(he|she|it)$/.test(w) || NAMES.has(w) ? "sg" : null;
  }
  if (!/^(my|your|his|her|our|their|the|a|this|that)$/.test(s[0]) || s.length > 3) return null;
  return /s$/.test(s[s.length - 1]) || s[s.length - 1] === "children" ? "pl" : "sg";
}
const beAgree = (b, num) => num === "any" || (b === "am" ? num === "i" : /^(is)$/.test(b) ? num === "sg" : b === "was" ? num === "sg" || num === "i" : num === "pl");
const verbAgree = (w, num) => (PAST.has(w) && !BASE.has(w)) || (THIRD.has(w) ? num === "sg" : BASE.has(w) && num !== "sg");
// 残りの語：動詞が出てくるなら、かならず to ＋ もとの形。for のあとに I・we、my・our ＋ to はだめ
function restOk(r) {
  for (let j = 0; j < r.length; j++) {
    if (verbish(r[j]) && !(BASE.has(r[j]) && r[j - 1] === "to")) return false;
    if (r[j] === "for" && /^(i|he|she|we|they)$/.test(r[j + 1])) return false;
    if (/^(my|our|ours|mine|their|theirs|yours|hers|its)$/.test(r[j]) && r[j + 1] === "to") return false;
  }
  return true;
}
// It is ＋ 形容詞 のあと：to ＋ もとの形、または for ＋ 人 ＋ to ＋ もとの形
function itOk(r) {
  let j = 1;
  if (r[j] === "for") {
    const k = r.indexOf("to", j + 1), who = r.slice(j + 1, k);
    if (k < 0 || !(who.length === 1 ? OBJ.test(who[0]) || NAMES.has(who[0]) : who.length === 2 && /^(my|the)$/.test(who[0]) && !verbish(who[1]))) return false;
    j = k;
  }
  return r[j] === "to" && BASE.has(r[j + 1]) && restOk(r);
}
function sentenceOk(text) {
  const t = tokens(text);
  if (/^(yes|no)$/.test(t[0])) return false;
  if (/\.$/.test(text)) {
    if (t[0] === "to") {                       // To ＋ もとの形 …（is 〜.）／ To 〜.（Why への答え）
      if (!BASE.has(t[1])) return false;
      const r = t.slice(2), k = r.findIndex(verbish);
      return k < 0 || (/^(is|was)$/.test(r[k]) && restOk(r.slice(0, k)) && restOk(r.slice(k + 1)));
    }
    const k = t.findIndex(verbish);
    if (k < 1) return false;
    const num = subjectNum(t.slice(0, k)), w = t[k];
    let r = t.slice(k + 1);
    if (!num) return false;
    if (BE.test(w)) {
      if (!beAgree(w, num)) return false;
      return t[0] === "it" && k === 1 ? itOk(r) : restOk(r);
    }
    if (MODAL.test(w)) return BASE.has(r[0]) && restOk(r.slice(1));
    if (/^(do|does|did)$/.test(w) && r[0] === "not") return (w === "did" || (w === "does") === (num === "sg")) && BASE.has(r[1]) && restOk(r.slice(2));
    return verbAgree(w, num) && restOk(r);
  }
  if (!/\?$/.test(text)) return false;
  const i = /^(why|what|where|when|who)$/.test(t[0]) ? 1 : 0, a = t[i];
  if (BE.test(a)) {
    const num = subjectNum([t[i + 1]]), r = t.slice(i + 2);
    if (!num || !beAgree(a, num)) return false;
    return t[i + 1] === "it" ? itOk(r) : restOk(r);
  }
  if (!/^(do|does|did)$/.test(a)) return false;
  const v = t.findIndex((w, j) => j > i + 1 && verbish(w));
  if (v < 0) return false;
  const num = subjectNum(t.slice(i + 1, v));
  return !!num && (a === "did" || (a === "does") === (num === "sg")) && BASE.has(t[v]) && restOk(t.slice(v + 1));
}
// 「なぜ」をたずねる質問は Why で始める
const valid = (jp, s) => sentenceOk(s) && (!/\?$/.test(s) || !/なぜ/.test(jp) || /^Why /.test(s));
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 2 && !/[ぁ-んァ-ン一-龥（＋〜→]/.test(s);

test("不定詞のきまり：to ＋ もとの形・目的の to・名詞 ＋ to・Why 〜? — To 〜.・It is 〜 for 人 to", () => {
  assert.ok(["I want to play tennis.", "My dream is to be a doctor.", "To study English is important.", "I went to the store to buy bread.", "I'm glad to see you.",
    "I want something to drink.", "Is there anything to eat?", "Why did you go to the library?", "To study for the test.", "It is easy for me to swim.",
    "We don't have much time to practice.", "Is it interesting to study history?", "You have time to go shopping, too."].every(sentenceOk));
  assert.ok(!["I want play tennis.", "I want to plays tennis.", "I want playing tennis.", "My dream to be a doctor.", "Study English is important.",
    "I went to the store for buy bread.", "I want to something drink.", "Why did you went to the library?", "Why you went to the library?", "Yes, I did.",
    "It is easy for I to swim.", "It is easy to me to swim.", "It fun to speak English.", "It is important for our to learn.", "Does it interesting to study history?"].some(sentenceOk));
  assert.ok(!valid("「あなたはなぜ早く起きたのですか。」", "What did you get up early?") && valid("「なぜ」", "Why did you get up early?"));
});

test("英文を選ぶ問題：正解だけが to ＋ もとの形と文のきまりに合う（Why への答えも）", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(valid(q.text, c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 50, "英文を選ぶ問題 " + n);
});

test("（ ）に入れる問題：正解を入れた文だけが文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const jp = q.text, text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").trim();
    if (!/（ ）/.test(text)) return;
    n++;
    const [qs, as] = text.split(" — ");
    q.choices.forEach((c) => {
      const ok = as !== undefined ? sentenceOk(qs) && sentenceOk(as.replace("（ ）", c.label)) : valid(jp, qs.replace("（ ）", c.label));
      assert.equal(ok, c.key === q.answer, id + " " + text.replace("（ ）", c.label));
    });
  });
  assert.ok(n >= 50, "（ ）の問題 " + n);
});

test("中2 英語 不定詞：助動詞の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学2年"].slice(0, 3), ["未来形", "助動詞", U]);
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
