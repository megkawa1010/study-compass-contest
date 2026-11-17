// node --test tests/*.test.js — 中1 英語「名詞の複数形」：正解を文のきまり（a・an、複数形、be動詞、some・any、How many）から確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "名詞の複数形";
const SK = ["nnArticle", "nnPlural", "nnThese", "nnSome", "nnMany"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s })) : [{ id: q.id, q }]));

// 複数形は、つづりのきまりから作る（表を写さない）
const IRR = { child: "children", man: "men", woman: "women", tooth: "teeth", foot: "feet" };
function plural(n) {
  if (IRR[n]) return IRR[n];
  if (/(s|sh|ch|x)$/.test(n) || /^(tomato|potato)$/.test(n)) return n + "es";
  if (/[^aeiou]y$/.test(n)) return n.slice(0, -1) + "ies";
  if (/^(leaf|knife)$/.test(n)) return n.replace(/fe?$/, "ves");
  return n + "s";
}
// a か an か：つづりではなく、最初の音で決める
function article(w) {
  if (/^(hour|honest)/.test(w)) return "an";
  if (/^(uni|use|eu|one)/.test(w)) return "a";
  return /^[aeiou]/.test(w) ? "an" : "a";
}

const words = (s) => s.split(" ");
const SG = new Set(words("cat dog pen book apple orange egg box bus dish watch class tomato potato city story baby cherry leaf knife child man woman tooth foot " +
  "umbrella eraser pet ball hour uniform university idea ant elephant lion owl ruler banana cake temple glass student teacher bike bag brother sister cousin friend tree flower " +
  "bird cup notebook cap desk chair window comic guitar poster girl boy shoe plate toy game dictionary pencil rabbit car peach sandwich cookie library strawberry classmate " +
  "day morning school aunt mother father"));
const PL = new Map([...SG].map((n) => [plural(n), n]));
const UNCOUNT = new Set(words("water milk juice tea rice bread homework music coffee chocolate"));
const ADJ = new Set(words("big small new old nice red white black cute good interesting english japanese beautiful same favorite"));
const NUM = new Set(words("two three four five six seven eight nine ten eleven twelve twenty"));
const POSS = new Set(words("my your his her our their the"));
const NAMES = new Set(words("ken yumi mai tom riku saki emma mr_green kyoto monday tuesday"));
const BASE = new Set(words("have eat drink want buy read borrow study like play need"));
const THIRD = new Map([["has", "have"], ...[...BASE].filter((v) => v !== "have").map((v) => [/[^aeiou]y$/.test(v) ? v.slice(0, -1) + "ies" : v + "s", v])]);
const FUNC = new Set(words("i you he she it we they this that these those is are am do does not how what in on at from of to every today too and a an one some any many much"));
const isNoun = (w) => SG.has(w) || PL.has(w) || UNCOUNT.has(w);
const known = (w) => isNoun(w) || ADJ.has(w) || NUM.has(w) || POSS.has(w) || NAMES.has(w) || BASE.has(w) || THIRD.has(w) || FUNC.has(w) || /'s$/.test(w);

function tokens(text) {
  return text.replace(/Mr\. (\w+)/g, "Mr_$1").replace(/n't\b/g, " not").replace(/\bdo not\b/g, "do not").replace(/[.?,!]/g, "").toLowerCase().split(" ").filter(Boolean)
    .map((w) => (w === "does" || w === "do" || w === "is" || w === "are" ? w : w));
}
// 名詞のまとまり：決める語（a・two・some など）のあと、形容詞をとばした最初の名詞
function nounAfter(t, i) { let j = i + 1; while (ADJ.has(t[j])) j++; return j; }
// 主語のまとまりの数：「sg」「pl」「i」
function numberOf(subj) {
  if (subj.includes("and")) return "pl";
  if (subj.length === 1) {
    const w = subj[0];
    if (w === "i") return "i";
    if (/^(you|we|they|these|those)$/.test(w)) return "pl";
    if (/^(he|she|it|this|that)$/.test(w) || NAMES.has(w)) return "sg";
  }
  const nouns = subj.filter(isNoun);
  if (!nouns.length) return null;
  return PL.has(nouns[nouns.length - 1]) ? "pl" : "sg";
}
// 主語として成り立つ形か（代名詞・名前・決める語 ＋ 名詞）
function subjectOk(subj) {
  if (subj.includes("and")) { const k = subj.indexOf("and"); return subjectOk(subj.slice(0, k)) && subjectOk(subj.slice(k + 1)); }
  if (subj.length === 1) return /^(i|you|we|they|he|she|it|this|that|these|those)$/.test(subj[0]) || NAMES.has(subj[0]) || PL.has(subj[0]);
  return (POSS.has(subj[0]) || /^(this|that|these|those)$/.test(subj[0])) && isNoun(subj[subj.length - 1]) && subj.slice(1, -1).every((w) => ADJ.has(w));
}

function sentenceOk(text) {
  const t = tokens(text), question = /\?$/.test(text), neg = t.includes("not");
  if (!t.every(known)) return false;
  // 1. 決める語と名詞の形
  for (let i = 0; i < t.length; i++) {
    const d = t[i];
    const pron = /^(this|that|these|those)$/.test(d) && !isNoun(t[nounAfter(t, i)]);
    if (pron) continue;
    if (/^(a|an|one|every)$/.test(d) || NUM.has(d) || /^(these|those|this|that|many|much|some|any)$/.test(d)) {
      const n = t[nounAfter(t, i)];
      if (!isNoun(n)) return false;
      if (/^(a|an|one|every|this|that)$/.test(d) && !SG.has(n)) return false;
      if ((NUM.has(d) || /^(these|those|many)$/.test(d)) && !PL.has(n)) return false;
      if (d === "much" && !UNCOUNT.has(n)) return false;
      if (/^(some|any)$/.test(d) && !(PL.has(n) || UNCOUNT.has(n))) return false;
      if (/^(a|an)$/.test(d) && article(t[i + 1]) !== d) return false;
    }
  }
  // 2. 数えられる名詞が1つなら、a・my などの決める語が前にいる（形容詞はとばす）
  for (let i = 0; i < t.length; i++) {
    if (!SG.has(t[i]) || /^(day|morning)$/.test(t[i]) && t[i - 1] === "every") continue;
    let j = i - 1; while (ADJ.has(t[j])) j--;
    if (!(/^(a|an|one|every|this|that)$/.test(t[j]) || POSS.has(t[j]) || /'s$/.test(t[j]) || t[j] === "of" && t[j - 1] === "glass" || t[j] === "glass")) return false;
  }
  // 3. some はふつうの文、any は否定文・疑問文
  if (t.includes("any") && !neg && !question) return false;
  if (t.includes("some") && (neg || question)) return false;
  // 4. be動詞と一般動詞はいっしょに使わない
  const be = t.findIndex((w) => /^(is|are|am)$/.test(w));
  const verb = t.findIndex((w) => BASE.has(w) || THIRD.has(w));
  if (be >= 0 && verb >= 0) return false;
  const agree = (num, v) => (v === "am" ? num === "i" : v === "is" ? num === "sg" : num === "pl");
  // 5. How many ＋ 複数形 ＋ do・does 〜?
  let start = 0;
  if (t[0] === "how") {
    if (t[1] !== "many" || !question) return false;
    start = nounAfter(t, 1) + 1;
    if (!/^(do|does)$/.test(t[start])) return false;
  }
  // 6. Do・Does ＋ 主語 ＋ もとの形 〜?
  if (/^(do|does)$/.test(t[start]) && question) {
    if (verb < 0) return false;
    const subj = t.slice(start + 1, verb);
    if (!subjectOk(subj)) return false;
    return (t[start] === "does") === (numberOf(subj) === "sg") && BASE.has(t[verb]);
  }
  // 7. Is・Are ＋ 主語 〜?：主語と、あとの名詞の数をそろえる
  if (be === 0) {
    if (!question) return false;
    const end = /^(this|that|these|those)$/.test(t[1]) && isNoun(t[nounAfter(t, 1)]) ? nounAfter(t, 1) + 1 : 2;
    const subj = t.slice(1, end), num = numberOf(subj);
    if (!subjectOk(subj) || !agree(num, t[0])) return false;
    return complementOk(num, t.slice(end));
  }
  if (question) return false;
  // 8. ふつうの文・否定文
  if (be > 0) {
    const subj = t.slice(0, be), num = numberOf(subj);
    if (!subjectOk(subj) || !agree(num, t[be])) return false;
    return complementOk(num, t.slice(t[be + 1] === "not" ? be + 2 : be + 1));
  }
  if (verb < 1) return false;
  let sEnd = verb;
  if (t[verb - 1] === "not") {
    if (!/^(do|does)$/.test(t[verb - 2])) return false;
    sEnd = verb - 2;
  }
  const subj = t.slice(0, sEnd), num = numberOf(subj);
  if (!subjectOk(subj)) return false;
  if (sEnd !== verb) return (t[sEnd] === "does") === (num === "sg") && BASE.has(t[verb]);
  return num === "sg" ? THIRD.has(t[verb]) : BASE.has(t[verb]);
}
// be動詞のあと：場所（in 〜）でなければ、名詞の数を主語にそろえる
function complementOk(num, rest) {
  if (!rest.length) return false;
  if (/^(in|on|at|from)$/.test(rest[0])) return true;
  const n = rest.find(isNoun);
  if (!n) return rest.every((w) => ADJ.has(w));
  if (num === "pl" && rest.some((w) => /^(a|an|one)$/.test(w))) return false;
  return num === "pl" ? PL.has(n) : SG.has(n) || UNCOUNT.has(n);
}
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 3 && !/（/.test(s) && !/^(Yes|No),/.test(s);

test("つづりのきまり：s・es・ies・ves・形がかわる語。a・an は最初の音", () => {
  assert.deepEqual(["book", "box", "city", "boy", "knife", "tomato", "child", "tooth"].map(plural), ["books", "boxes", "cities", "boys", "knives", "tomatoes", "children", "teeth"]);
  assert.deepEqual(["apple", "hour", "uniform", "pen", "old"].map(article), ["an", "an", "a", "a", "an"]);
  let n = 0, a = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const m = q.text.match(/^(\w+) の複数形は？/);
    if (m) { n++; assert.equal(label(q), plural(m[1]), id); }
    const k = q.text.match(/「（ ） (\w+)/);
    if (k) { a++; assert.equal(label(q), article(k[1]), id); }
  });
  assert.ok(n >= 20, "つづりの問題 " + n);
  assert.ok(a >= 8, "a・an の問題 " + a);
});

test("英文を選ぶ問題：正解だけが、a・an・複数形・be動詞・some・any・How many のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 35, "英文を選ぶ問題 " + n);
});

test("（ ）に語を入れる問題：正解を入れた文だけがきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").replace(/^.*— /, "").trim();
    if (!/（ ）/.test(text) || !/[.?]$/.test(text)) return;
    const fill = (l) => text.replace("（ ）", l);
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(fill(c.label)), c.key === q.answer, id + " " + fill(c.label)));
  });
  assert.ok(n >= 40, "（ ）の問題 " + n);
});

test("These・those で聞かれたら they で答える", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !/^Are (these|those)\b/.test(q.text)) return;
    n++;
    assert.equal(label(q), "Yes, they are.", id);
  });
  assert.ok(n >= 2, "答え方の問題 " + n);
});

test("中1 英語 名詞の複数形：3人称単数現在の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学1年"].slice(0, 4), ["be動詞", "一般動詞", "3人称単数現在", U]);
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
