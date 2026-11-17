// node --test tests/*.test.js — 中1 英語「一般動詞」：正解を文のきまり（be動詞と一般動詞・語順・don't・Do・What）から確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "一般動詞";
const SK = ["gvKind", "gvSent", "gvNeg", "gvQues", "gvWhat"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s })) : [{ id: q.id, q }]));

// この単元で使う一般動詞（もとの形）
const VERBS = new Set("like play have study go drink eat watch clean live speak sing read run do get_up cook buy visit know wear need use want walk practice climb make".split(" "));
// 文の終わりに置く「場所・時・様子」のまとまり
const ADV = ["every day", "every morning", "every night", "every Saturday", "on Sundays", "on Saturdays", "on Mondays", "on Fridays", "on weekends", "on your birthday",
  "after school", "after dinner", "at seven", "at six", "at eight", "at night", "at home", "at school", "at lunch", "at the supermarket", "in the morning", "in the gym", "in Kyoto", "in Tokyo",
  "in Osaka", "in your hand", "in the science room", "in Australia", "on TV", "for breakfast", "for your birthday", "by bus", "to school", "to the park", "very much", "well", "hard", "today", "together"];
const ADV_WORDS = /\b(every|well|much|after school|at night|on Sundays|on weekends|at seven|at the supermarket)\b/;
const SUBJ = /^(I|You|We|They|It|My parents|My brothers|My sisters|[A-Z][a-z]+ and [A-Z][a-z]+)$/;

function stripAdv(rest) {
  let r = rest.trim(), moved = true;
  while (moved) { moved = false; for (const a of ADV) if (r === a || r.endsWith(" " + a)) { r = r.slice(0, r.length - a.length).trim(); moved = true; } }
  return r;
}
// 「〜を」のまとまり：場所・時の語がまざらず、前置詞や冠詞で終わらない
const objectOk = (o) => !ADV_WORDS.test(o) && !/\b(to|at|in|on|the|a|an)$/.test(o) && !o.split(" ").some((w) => VERBS.has(w) || /^(am|is|are|do|don't|not|what|who)$/.test(w));
function norm(t) { return t.replace(/\bget up\b/g, "get_up").replace(/\bI'm\b/g, "I am").replace(/(\w)'re\b/g, "$1 are").replace(/\b(It|What)'s\b/g, "$1 is").replace(/\bdon't\b/g, "do not").replace(/\baren't\b/g, "are not"); }
const beOf = (s) => (s === "I" ? "am" : s === "It" ? "is" : "are");

function sentenceOk(text) {
  const t = norm(text);
  let m;
  // What ＋（名詞）＋ do ＋ 主語 ＋ 動詞 ＋（場所・時）？
  if ((m = t.match(/^What( [a-zA-Z ]+?)? do (you|they|we|your \w+) (\w+)(.*)\?$/))) return VERBS.has(m[3]) && stripAdv(m[4]) === "";
  // What is ＋ 名詞？（be動詞の文）
  if ((m = t.match(/^What is (your|this|that) ?(.*)\?$/))) return !m[2].split(" ").some((w) => VERBS.has(w));
  // Are ＋ 主語 ＋ 様子・名詞？（be動詞の疑問文。一般動詞を続けない）
  if ((m = t.match(/^(Are|Am) (you|they|we|your \w+) (.+)\?$/))) return !m[3].split(" ").some((w) => VERBS.has(w));
  // Do ＋ 主語 ＋ 動詞 ＋ 「〜を」 ＋ 場所・時？
  if ((m = t.match(/^Do (you|they|we|your \w+|[A-Z][a-z]+ and [A-Z][a-z]+) (\w+)(.*)\?$/))) return VERBS.has(m[2]) && objectOk(stripAdv(m[3]));
  if (/\?$/.test(t)) return false;
  if (!/\.$/.test(t)) return false;
  const w = t.slice(0, -1).split(" ");
  for (let k = 1; k <= 3; k++) {
    const subj = w.slice(0, k).join(" ");
    if (!SUBJ.test(subj)) continue;
    let rest = w.slice(k);
    // be動詞の文：主語 ＋ am・are（＋ not）＋ 様子・場所（一般動詞を続けない）
    if (rest[0] === "am" || rest[0] === "are" || rest[0] === "is") return beOf(subj) === rest[0] && !rest.slice(rest[1] === "not" ? 2 : 1).some((x) => VERBS.has(x) || x === "not");
    // 一般動詞の文：主語 ＋（do not）＋ 動詞 ＋ 「〜を」 ＋ 場所・時
    if (rest[0] === "do" && rest[1] === "not") rest = rest.slice(2);
    return VERBS.has(rest[0]) && objectOk(stripAdv(rest.slice(1).join(" ")));
  }
  return false;
}
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 3 && !/（/.test(s) && !/^(Yes|No),/.test(s);

test("英文を選ぶ問題：正解だけが、be動詞と一般動詞・語順・don't・Do・What のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 30, "英文を選ぶ問題 " + n);
});

test("（ ）に語を入れる問題：正解を入れた文が、きまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/の（ ）は？.*$/, "").replace(/^.*— /, "").trim();
    if (!/（ ）/.test(text) || !/[.?]$/.test(text) || /^(Yes|No),/.test(text)) return;
    const filled = text.replace("（ ）", label(q));
    if (!/^[A-Z]/.test(filled) || /Japanese food|need （|like （/.test(text)) return;
    n++;
    assert.ok(sentenceOk(filled), id + " " + filled);
  });
  assert.ok(n >= 35, "（ ）の問題 " + n);
});

test("Yes／No の答え方：Do には do、Are には am・are。主語は答える人に合わせる", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const m = q.text.match(/(Do|Are) (you and \w+(?: \w+)?|you|they|your \w+|[A-Z][a-z]+ and [A-Z][a-z]+) ([^?]*)\? — (Yes|No), (（ ）|I （ ）)/);
    if (!m) return;
    n++;
    const subj = m[2];
    const p = /^you and\b/i.test(subj) ? "we" : /^you$/i.test(subj) ? "I" : "they";
    const aux = m[1] === "Do" ? "do" : p === "I" ? "am" : "are";
    let want = m[4] === "Yes" ? p + " " + aux : aux === "do" ? p + " don't" : p === "I" ? "I'm not" : p + " aren't";
    if (m[5] === "I （ ）") want = want.replace(/^I /, "");
    assert.equal(label(q), want, id + " 主語 " + subj);
  });
  assert.ok(n >= 15, "Yes／No の問題 " + n);
});

test("What do 〜? の答え：主語は答える人（you → I、you and 〜 → We、they・2人以上 → They）", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const m = q.text.match(/What do (you and \w+|you|they|your \w+) (\w+)(?: [^?]*)?\? — （ ） (\w+)/);
    if (!m || !/^(I|We|They)$/.test(label(q))) return;
    n++;
    const want = /^you and\b/.test(m[1]) ? "We" : m[1] === "you" ? "I" : "They";
    assert.equal(label(q), want, id);
    assert.ok(VERBS.has(m[3]), id + " 答えの動詞 " + m[3]);
  });
  assert.ok(n >= 3, "What の答え " + n);
});

test("中1 英語 一般動詞：be動詞の次・前提は先に来る・英語の中でつながる・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学1年"].slice(0, 2), ["be動詞", U]);
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
