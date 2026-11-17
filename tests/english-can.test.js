// node --test tests/*.test.js — 中1 英語「can」：正解を文のきまり（can ＋ もとの形・can't・Can 〜?・What／Who can・答え方）から確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "can";
const SK = ["cnForm", "cnNeg", "cnQues", "cnWhat", "cnReq"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s, skill: s.skill || q.skill })) : [{ id: q.id, q, skill: q.skill }]));

const words = (s) => s.split(" ");
// 動詞のもとの形。3人称単数の形はつづりのきまりから作る
const BASE = new Set(words("swim run play speak read cook sing dance write ride see jump talk ski skate draw drive carry walk use make come help open close " +
  "eat wash get bake fly do sit ask watch show try call take go buy say clean"));
function third(v) {
  if (/(s|sh|ch|x|o)$/.test(v)) return v + "es";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  return v + "s";
}
const THIRD = new Set([...BASE].map(third));
const isIng = (w) => /ing$/.test(w) && !BASE.has(w) && !/^(morning|evening|something|thing)$/.test(w);
const isVerb = (w) => BASE.has(w) || THIRD.has(w) || isIng(w);
const AUX = /^(can|cans|do|does|is|are|am|not)$/;
const PRON = /^(i|you|he|she|it|we|they)$/;
const NAMES = new Set(words("ken yumi mai tom riku saki emma aoi kenta ms_green"));

function tokens(text) {
  return text.replace(/^But /, "").replace(/Ms\. (\w+)/g, "Ms_$1").replace(/\bcan't\b|\bcannot\b/g, "can not").replace(/n't\b/g, " not").replace(/\bI'm\b/g, "I am")
    .replace(/[.?,]/g, "").toLowerCase().split(" ").filter(Boolean);
}
// 主語のまとまり：代名詞・名前・my 〜・a 〜・複数の名詞。動詞や can・do・be動詞をふくまない
function subjectOk(s) {
  if (!s.length || s.some((w) => isVerb(w) || AUX.test(w))) return false;
  if (s.includes("and")) { const k = s.indexOf("and"); return subjectOk(s.slice(0, k)) && subjectOk(s.slice(k + 1)); }
  if (s.length === 1) return PRON.test(s[0]) || NAMES.has(s[0]) || /s$/.test(s[0]);
  return /^(my|your|his|her|our|the|a|an)$/.test(s[0]) && s.length <= 3;
}
// can のあと：（not）＋ もとの形 ＋ 動詞・can・do・be動詞・not をふくまない残り
function afterCanOk(rest, allowEmpty) {
  if (rest[0] === "not") rest = rest.slice(1);
  if (!rest.length) return allowEmpty;
  return BASE.has(rest[0]) && !rest.slice(1).some((w) => isVerb(w) || AUX.test(w));
}
function sentenceOk(text) {
  const t = tokens(text), question = /\?$/.test(text);
  if (!question) {
    if (!/\.$/.test(text)) return false;
    const c = t.indexOf("can");
    // 「Riku can.」のような短い答えも、主語 ＋ can で正しい
    return c > 0 && subjectOk(t.slice(0, c)) && afterCanOk(t.slice(c + 1), true);
  }
  if (t[0] === "can") {
    const v = t.findIndex((w, i) => i >= 2 && isVerb(w));
    return v > 1 && subjectOk(t.slice(1, v)) && afterCanOk(t.slice(v), false);
  }
  if (t[0] === "who") return t[1] === "can" && afterCanOk(t.slice(2), false);
  if (t[0] === "what") {
    const c = t[1] === "can" ? 1 : t[2] === "can" && !PRON.test(t[1]) && !isVerb(t[1]) && !AUX.test(t[1]) ? 2 : -1;
    if (c < 0) return false;
    if (BASE.has(t[c + 1])) return afterCanOk(t.slice(c + 1), false); // What が主語
    const v = t.findIndex((w, i) => i > c + 1 && isVerb(w));
    return v > c + 1 && subjectOk(t.slice(c + 1, v)) && afterCanOk(t.slice(v), false);
  }
  return false;
}
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 2 && /\bcan\b|\bcan't\b|\bCan\b/.test(s) && !/[（＋〜]/.test(s) && !/^(Yes|No|Sorry),/.test(s);

test("can のきまり：can ＋ もとの形。can't・Can 〜?・What／Who can 〜?", () => {
  assert.ok(["I can swim.", "She can't play the piano.", "Can you swim?", "What can you make?", "Who can sing?", "Riku can.", "What languages can your sister speak?"].every(sentenceOk));
  assert.ok(!["She can plays the piano.", "She cans play.", "I don't can swim.", "Do you can swim?", "What you can make?", "Who can sings?", "He can read not French."].some(sentenceOk));
});

test("英文を選ぶ問題：正解だけが can の文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 50, "英文を選ぶ問題 " + n);
});

test("（ ）に語を入れる問題：正解を入れた文だけが can の文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").replace(/^.*— /, "").trim();
    if (!/（ ）/.test(text) || !/[.?]$/.test(text) || /^(Yes|No),/.test(text)) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(text.replace("（ ）", c.label)), c.key === q.answer, id + " " + text.replace("（ ）", c.label)));
  });
  assert.ok(n >= 40, "（ ）の問題 " + n);
});

// Can 〜? の答え：主語を代名詞にかえて can・can't
function pronounOf(s) {
  if (s.join(" ") === "you") return "I";
  if (s.includes("and")) return s.includes("you") ? "we" : "they";
  if (s.length === 1 && /^(he|she|it|we|they)$/.test(s[0])) return s[0];
  const w = s[s.length - 1];
  if (/^(ken|tom|riku|kenta|brother|father|grandfather)$/.test(w)) return "he";
  if (/^(yumi|mai|saki|emma|aoi|sister|mother|grandmother)$/.test(w)) return "she";
  if (/^(a|the)$/.test(s[0]) || s.length === 2) return "it";
  return /s$/.test(w) ? "they" : "it";
}
test("Can 〜? の答え方：主語を代名詞にかえて、Yes なら can、No なら can't", () => {
  let n = 0;
  items.forEach(({ id, q, skill }) => {
    if (q.type !== "choice" || skill !== "cnQues") return;
    const m = q.text.match(/^(Can [^?]*\?)/);
    if (!m) return;
    const t = tokens(m[1]), v = t.findIndex((w, i) => i >= 2 && isVerb(w)), p = pronounOf(t.slice(1, v));
    const yn = q.text.match(/— (Yes|No), （ ）/);
    if (!yn && !/の答え/.test(q.text)) return;
    const full = (l) => (yn ? yn[1] + ", " + l + "." : l);
    const ok = (s) => { const a = s.match(/^(Yes|No), (\w+) (can|can't)\.$/); return !!a && a[2] === p && (a[1] === "Yes") === (a[3] === "can"); };
    n++;
    q.choices.forEach((c) => assert.equal(ok(full(c.label)), c.key === q.answer, id + " " + full(c.label) + "（主語 " + p + "）"));
  });
  assert.ok(n >= 10, "Can 〜? の答え " + n);
});

test("依頼と許可の答え方：Can you 〜? には Sure.・Sorry, I can't.、Can I 〜? には Sure.・Yes, you can.・Sorry, you can't.", () => {
  const OK = { you: /^(Sure|OK|All right|Of course|Sorry, I can't)\.$/, I: /^(Sure|OK|All right|Of course|Yes, you can|Sorry, you can't)\.$/ };
  let n = 0;
  items.forEach(({ id, q, skill }) => {
    if (q.type !== "choice" || skill !== "cnReq") return;
    const m = q.text.match(/^Can (you|I) [^?]*\? (の答え|にことわる)/);
    if (!m) return;
    n++;
    q.choices.forEach((c) => assert.equal(OK[m[1]].test(c.label), c.key === q.answer, id + " " + c.label));
    if (/ことわる|だめ/.test(q.text)) assert.ok(/^Sorry,/.test(label(q)), id);
  });
  assert.ok(n >= 7, "依頼・許可の答え " + n);
});

test("中1 英語 can：命令文の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学1年"].slice(0, 6), ["be動詞", "一般動詞", "3人称単数現在", "名詞の複数形", "命令文", U]);
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
