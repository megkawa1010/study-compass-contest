// node --test tests/*.test.js — 中1 英語「3人称単数現在」：正解を文のきまり（主語と動詞の形・does・Does・What does）から確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "3人称単数現在";
const SK = ["tsForm", "tsSpell", "tsNeg", "tsQues", "tsWhat"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s })) : [{ id: q.id, q }]));

// 3人称単数の形は、つづりのきまりから作る（表を写さない）
function third(v) {
  if (v === "have") return "has";
  if (/(s|sh|ch|x|o)$/.test(v)) return v + "es";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  return v + "s";
}
const BASES = ("like play have study go drink eat watch clean live speak sing read run do get cook buy visit know wear need use want walk practice make " +
  "teach wash try carry enjoy stay fly catch brush work drive answer sleep open rain ride take swim write wipe grow sell help").split(" ");
const BASE = new Set(BASES), THIRD = new Map(BASES.map((v) => [third(v), v]));
const isVerb = (w) => BASE.has(w) || THIRD.has(w);

test("つづりのきまり：s・es・ies・has", () => {
  assert.deepEqual(["play", "study", "watch", "go", "have", "wash", "enjoy", "try", "drive", "fly"].map(third),
    ["plays", "studies", "watches", "goes", "has", "washes", "enjoys", "tries", "drives", "flies"]);
  // 「〜の形にすると？」の問題は、正解がつづりのきまりどおり
  let n = 0;
  items.forEach(({ id, q }) => {
    const m = q.type === "choice" && q.text.match(/^(\w+) を、主語が \w+ のときの形にすると？/);
    if (!m) return;
    n++;
    assert.equal(label(q), third(m[1]), id);
  });
  assert.ok(n >= 8, "つづりの問題 " + n);
});

// 主語のまとまりと、3人称単数かどうか
const SUBJ = /^(I|You|We|They|He|She|It|you|we|they|he|she|it|[A-Z][a-z]+|(?:Mr\.|Ms\.) [A-Z][a-z]+|(?:My|Our|Your|The|Her|His|my|our|your|the|her|his) \w+|.+ and .+)$/;
function singular(s) {
  if (/\band\b/.test(s) || /^(I|You|We|They|you|they|we)$/.test(s)) return false;
  if (/^(my|our|your|the|her|his) \w+s$/i.test(s) && !/(ss|us)$/.test(s)) return false;
  return true;
}
const ADV_START = /^(in|on|at|after|every|to|by|with|for)$/;
function norm(t) { return t.replace(/^But /, "").replace(/\bdoesn't\b/g, "does not").replace(/\bdon't\b/g, "do not").replace(/\bisn't\b/g, "is not").replace(/\baren't\b/g, "are not").replace(/\bget up\b/g, "get_up").replace(/\bgets up\b/g, "gets_up"); }
BASE.add("get_up"); THIRD.set("gets_up", "get_up");
// 動詞のあと：動詞・be動詞・not をふくまない
const restOk = (r) => !r.some((w) => isVerb(w) || /^(am|is|are|do|does|not)$/.test(w));

function sentenceOk(text) {
  const t = norm(text);
  let m;
  if ((m = t.match(/^What(?: (?!does\b|do\b)\w+)? (does|do) (.+)\?$/))) {
    const w = m[2].split(" "), i = w.findIndex(isVerb);
    if (i < 1) return false;
    const subj = w.slice(0, i).join(" "), rest = w.slice(i + 1);
    return SUBJ.test(subj) && BASE.has(w[i]) && (m[1] === "does") === singular(subj) && (!rest.length || ADV_START.test(rest[0])) && restOk(rest);
  }
  if ((m = t.match(/^What is (.+)\?$/))) return restOk(m[1].split(" "));
  if ((m = t.match(/^(Does|Do) (.+)\?$/))) {
    const w = m[2].split(" "), i = w.findIndex(isVerb);
    if (i < 1) return false;
    const subj = w.slice(0, i).join(" ");
    return SUBJ.test(subj) && BASE.has(w[i]) && (m[1] === "Does") === singular(subj) && restOk(w.slice(i + 1));
  }
  if (/\?$/.test(t) || !/\.$/.test(t)) return false;
  const w = t.slice(0, -1).split(" "), i = w.findIndex((x) => isVerb(x) || /^(am|is|are|do|does)$/.test(x));
  if (i < 1) return false;
  const subj = w.slice(0, i).join(" "), sg = singular(subj);
  if (!SUBJ.test(subj) || /\bnot\b/.test(subj)) return false;
  const v = w[i];
  if (/^(am|is|are)$/.test(v)) return (v === "is") === sg && v !== "am" && restOk(w.slice(w[i + 1] === "not" ? i + 2 : i + 1));
  if (/^(do|does)$/.test(v) && w[i + 1] === "not") return (v === "does") === sg && BASE.has(w[i + 2]) && restOk(w.slice(i + 3));
  return (sg ? THIRD.has(v) : BASE.has(v)) && restOk(w.slice(i + 1));
}
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 3 && !/（/.test(s) && !/^(Yes|No),/.test(s);

test("英文を選ぶ問題：正解だけが、主語と動詞の形・does・Does・What does のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 25, "英文を選ぶ問題 " + n);
});

test("（ ）に語を入れる問題：正解を入れた文がきまりに合い、まちがいの動詞の形を入れた文は合わない", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").replace(/^.*— /, "").trim();
    if (!/（ ）/.test(text) || !/[.?]$/.test(text) || /^(Yes|No),/.test(text) || /^（ ） subject/.test(text)) return;
    const fill = (l) => text.replace("（ ）", l);
    if (!/^[A-Z]/.test(fill(label(q)))) return;
    n++;
    assert.ok(sentenceOk(fill(label(q))), id + " " + fill(label(q)));
    // 動詞の形だけがちがう選択肢（plays／play など）は、入れると文がくずれる
    q.choices.filter((c) => c.key !== q.answer && /^[a-z']+$/.test(c.label) && !/^(is|are|am|does|do|has)$/.test(label(q)))
      .forEach((c) => assert.ok(!sentenceOk(fill(c.label)), id + " " + fill(c.label)));
  });
  assert.ok(n >= 40, "（ ）の問題 " + n);
});

// 答えるときの代名詞
const HE = /\b(he|ken|tom|kenta|taku|brother|father|grandfather|uncle)\b|\bmr\./i, SHE = /\b(she|mai|yumi|emma|rina|saki|ann|kei|mother|sister|grandmother|aunt)\b|\bms\./i;
function pronounOf(s) {
  if (/^you$/i.test(s)) return "I";
  if (!singular(s)) return "they";
  if (HE.test(s)) return "he";
  if (SHE.test(s)) return "she";
  return "it";
}
test("Yes／No の答え方：Does には does、Do には do、Is には is。主語を代名詞にかえる", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const m = q.text.match(/(Does|Do|Is) (.+?) (\w+(?: [^?]*)?)\? — (Yes|No), (（ ）|he （ ）|she （ ）)/);
    if (!m) return;
    const w = (m[2] + " " + m[3]).split(" "), i = m[1] === "Is" ? (w.findIndex((x) => /^(busy|big)$/.test(x))) : w.findIndex(isVerb);
    const subj = w.slice(0, i).join(" "), p = pronounOf(subj);
    const aux = m[1] === "Is" ? "is" : (m[1] === "Does" ? "does" : "do");
    const full = m[4] === "Yes" ? p + " " + aux : p + " " + aux + "n't";
    n++;
    assert.equal((m[5] === "（ ）" ? "" : m[5].replace(" （ ）", "") + " ") + label(q), full, id + " 主語 " + subj);
  });
  assert.ok(n >= 15, "Yes／No の問題 " + n);
});

test("中1 英語 3人称単数現在：一般動詞の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学1年"], ["be動詞", "一般動詞", U]);
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
