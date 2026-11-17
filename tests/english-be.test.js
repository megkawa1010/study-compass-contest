// node --test tests/*.test.js — 中1 英語「be動詞」：正解を文のきまり（主語と be動詞の一致・語順・答え方）から確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "be動詞";
const SK = ["beSubject", "beForm", "beNeg", "beQues", "beWh"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
// 選ぶ問題と、応用の選ぶ小問をまとめて
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s })) : [{ id: q.id, q }]));

// 主語に合う be動詞（I → am、you・2人以上 → are、ほか → is）
const HEAD = /^(the|my|your|his|her|our|this|that|these|those)$/;
function beOf(subject) {
  // 名詞のまとまり（in・on などの前まで）。HEAD で始まるときは最後の語が名詞
  const w = subject.trim().toLowerCase().split(/\s+/), cut = w.findIndex((x, i) => i > 0 && /^(in|on|of|from|under|near|at)$/.test(x));
  const np = cut === -1 ? w : w.slice(0, cut);
  if (np.length === 1 && np[0] === "i") return "am";
  if (np.includes("and") || /^(you|we|they|these|those)$/.test(np[0])) return "are";
  const last = np[np.length - 1];
  if (HEAD.test(np[0]) && np.length > 1 && /s$/.test(last) && !/(ss|us|is)$/.test(last)) return "are";
  return "is";
}
// 人・ものを he・she・it・they に
const HE = /\b(he|ken|tom|man|boy|brother|father|grandfather|mr\.)\b/i, SHE = /\b(she|mother|sister|woman|girl|ms\.|mai)\b/i;
function pronounOf(subject) {
  const s = subject.toLowerCase();
  if (beOf(subject) === "are") return "they";
  if (HE.test(s)) return "he";
  if (SHE.test(s)) return "she";
  return "it";
}

// 英文が、主語と be動詞の一致・語順のきまりに合っているか
function norm(t) { return t.replace(/\bI'm\b/g, "I am").replace(/(\w)'re\b/g, "$1 are").replace(/\b(It|He|She|That|What|Who)'s\b/gi, "$1 is").replace(/n't\b/g, " not"); }
function sentenceOk(text, ja) {
  if (/amn't/.test(text)) return false;
  const t = norm(text);
  const notAfterBe = (s) => !/\bnot\b/i.test(s) || /\b(am|is|are) not\b/.test(s);
  let m;
  if ((m = t.match(/^(What|Who) (is|are) (.+)\?$/))) {
    if (/\b(what|who)\b/i.test(m[3])) return false;
    if (/だれ/.test(ja) && m[1] !== "Who") return false;
    if (/何/.test(ja) && m[1] !== "What") return false;
    return beOf(m[3]) === m[2];
  }
  if ((m = t.match(/^(Am|Is|Are) (.+)\?$/))) {
    if (/\b(what|who|not|do|does)\b/i.test(m[2])) return false;
    return beOf(m[2].split(" ").slice(0, 2).join(" ")) === m[1].toLowerCase();
  }
  if ((m = t.match(/^([A-Z].*?) (am|is|are)\b(.*)\.$/))) {
    if (/\b(not|do|does)\b/i.test(m[1])) return false;
    return notAfterBe(t) && beOf(m[1]) === m[2];
  }
  return false;
}
const isSentence = (s) => /^[A-Z]/.test(s) && /[.?]$/.test(s) && s.split(" ").length >= 3 && !/\(|（/.test(s);

test("英文を選ぶ問題：正解だけが、主語と be動詞の一致・語順のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isSentence(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(sentenceOk(c.label, q.text), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 15, "英文を選ぶ問題 " + n);
});

test("（ ）に be動詞を入れる問題：主語に合う形が正解", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "");
    const base = norm(label(q)).split(" ")[0].toLowerCase();
    if (!["am", "is", "are"].includes(base)) return;
    let m;
    if ((m = text.match(/^（ ） (\w+)/))) { n++; assert.equal(base, beOf(m[1]), id); return; }
    const before = text.split("（ ）")[0].trim();
    if (before && !/—/.test(before)) {
      const subj = before.split(/(?<!\b(?:Mr|Ms|Mt)[.])(?<=[.?!])\s+/).pop();
      if (/^[A-Z]/.test(subj)) { n++; assert.equal(base, beOf(subj), id + " 主語 " + subj); }
    }
  });
  assert.ok(n >= 25, "be動詞を入れる問題 " + n);
});

test("Yes／No の答え方：主語を代名詞にかえ、同じ be動詞で答える", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const m = q.text.match(/(Am|Is|Are) ([^?]+)\?[^—]*— (Yes|No), （ ）/);
    if (!m) return;
    n++;
    const subj = m[2].replace(/\s+(a|an|my|your|in|on|from|busy|cold|hot|open|OK|sisters|brothers|teachers|friends|students|new|2,000|the)\b.*$/, "");
    let p = /^you and\b/i.test(subj) ? "we" : /^you$/i.test(subj) ? "I" : pronounOf(subj);
    const be = p === "I" ? "am" : ["we", "they"].includes(p) ? "are" : "is";
    const want = m[3] === "Yes" ? p + " " + be : p === "I" ? "I'm not" : p + " " + be + "n't";
    n && assert.equal(label(q), want, id + " 主語 " + subj);
  });
  assert.ok(n >= 12, "Yes／No の問題 " + n);
});

test("What・Who の答え：もの → It's、人 → He's・She's、2つ以上 → They're", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice") return;
    const m = norm(q.text).match(/(What|Who) (is|are) ([^?]+)\? — （ ）/);
    if (!m || !/^(It|He|She|They)'/.test(label(q))) return;
    n++;
    const p = m[2] === "are" ? "they" : m[1] === "What" ? "it" : pronounOf(m[3]);
    assert.equal(label(q), p[0].toUpperCase() + p.slice(1) + (p === "they" ? "'re" : "'s"), id);
  });
  assert.ok(n >= 12, "What・Who の答え " + n);
});

test("教科の切りかえ：英語は中学1年だけ。数学にもどすと元の単元", () => {
  const g = E.grade(), list = E.SELECTABLE_UNITS.slice();
  assert.equal(E.setSubject("英語"), "英語");
  assert.equal(E.grade(), "中学1年");
  assert.deepEqual(E.SELECTABLE_UNITS, [U, "一般動詞", "3人称単数現在", "名詞の複数形", "命令文"]);
  assert.equal(E.setGrade("中学2年"), "中学1年");
  assert.ok(!E.gradeHasUnits("英語", "中学2年") && E.gradeHasUnits("英語", "中学1年"));
  assert.equal(E.setSubject("国語"), "英語");
  E.setSubject("数学"); E.setGrade(g);
  assert.deepEqual(E.SELECTABLE_UNITS, list);
  assert.equal(E.subjectOf(U), "英語");
  assert.equal(E.subjectOf("一次関数"), "数学");
  assert.ok(all.every((q) => q.subject === "英語"));
  assert.ok(Object.values(Q).every((q) => q.subject === E.subjectOf(q.unit)));
});

test("中1 英語 be動詞：前提は先に来る・数学にはつながらない・問題数・はじめのチェック", () => {
  assert.deepEqual(E.UNITS[U], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => {
      assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p);
      assert.equal(E.SKILLS[p].subject, "英語", k + " の前提 " + p);
    });
    assert.ok(["basic", "standard", "retention"].every((l) => B.index[k][l].length >= 5) && B.index[k].application.length >= 3, k);
  });
  assert.equal(C.unitCheck(U).questions.length, 5);
});
