// node --test tests/*.test.js — 中1 英語「疑問詞」：疑問詞のあとの語順・be動詞と do／does の使い分け・答えがたずねた内容に合うかを確かめる
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, C = SC.compass;
const U = "疑問詞";
const SK = ["qwWhere", "qwWhen", "qwWhich", "qwWhose", "qwHow"];
const all = Object.values(Q).filter((q) => q.unit === U);
const label = (q) => q.choices.find((c) => c.key === q.answer).label;
const items = all.flatMap((q) => (q.steps ? q.steps.map((s) => ({ id: q.id + "#" + s.id, q: s, skill: s.skill || q.skill })) : [{ id: q.id, q, skill: q.skill }]));

const words = (s) => s.split(" ");
const BASE = new Set(words("live go get come play study eat buy practice like want have do read watch walk swim meet leave start take work"));
function third(v) {
  if (v === "have") return "has";
  if (/(s|sh|ch|x|o)$/.test(v)) return v + "es";
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + "ies";
  return v + "s";
}
const THIRD = new Set([...BASE].map(third));
const isVerb = (w) => BASE.has(w) || THIRD.has(w) || (/ing$/.test(w) && w !== "interesting");
const AUX = /^(is|are|am|do|does|can)$/;
const PRON_SG = /^(he|she|it|this|that)$/, PRON_PL = /^(you|we|they|these|those)$/;
const DET = /^(my|your|his|her|our|their|the|this|that|these|those|a)$/;
const POSS_PRON = /^(mine|yours|his|hers|ours|theirs)$/;
const NAMES = new Set(words("ken yumi saki mai tom ms_brown"));
const ADJ = new Set(words("strong interesting"));
const STOP = /^(in|on|at|from|to|now|today)$/;
const plural = (w) => /^(children|people|glasses)$/.test(w) || (/s$/.test(w) && !/(ss|us)$/.test(w) && !/'s$/.test(w));

// 名詞のまとまり（場所・時の語の前まで）の数：「sg」「pl」「i」。主語にならなければ null
function npNumber(r) {
  const k = r.findIndex((w) => STOP.test(w)), np = k < 0 ? r : r.slice(0, k);
  if (!np.length) return null;
  if (np.length === 1) {
    const w = np[0];
    if (w === "i") return "i";
    if (PRON_PL.test(w)) return "pl";
    return PRON_SG.test(w) || NAMES.has(w) ? "sg" : null;
  }
  return DET.test(np[0]) || /'s$/.test(np[0]) ? (plural(np[np.length - 1]) ? "pl" : "sg") : null;
}
// 疑問詞の疑問文として正しいか
function qOk(text) {
  if (!/\?$/.test(text)) return false;
  const t = text.split(",")[0].replace(/\?$/, "").replace(/Ms\. (\w+)/g, "Ms_$1").toLowerCase().split(" ");
  let i, whN = [];
  if (t[0] === "what" && t[1] === "time") i = 2;
  else if (t[0] === "how") {
    if (t[1] === "old") i = 2;
    else if (t[1] === "many") {
      if (!plural(t[2]) || isVerb(t[2]) || AUX.test(t[2])) return false;
      whN = [t[2]]; i = 3;
    } else if (t[1] === "much") return false;
    else i = 1;
  } else if (/^(where|when)$/.test(t[0])) i = 1;
  else if (/^(which|whose)$/.test(t[0])) { i = 1; while (i < t.length && !AUX.test(t[i]) && !isVerb(t[i]) && !DET.test(t[i]) && !PRON_SG.test(t[i]) && !PRON_PL.test(t[i])) whN.push(t[i++]); }
  else return false;
  const a = t[i], rest = t.slice(i + 1);
  const whNum = whN.length ? (plural(whN[whN.length - 1]) ? "pl" : "sg") : null;
  // Which train goes 〜?（Which 〜 が主語）
  if (THIRD.has(a) && !AUX.test(a) && t[0] === "which" && whN.length) return whNum === "sg" && !rest.some((w) => isVerb(w) || AUX.test(w));
  if (/^(is|are|am)$/.test(a)) {
    if (!rest.length || rest.some((w) => isVerb(w) || AUX.test(w))) return false;
    let num = npNumber(rest);
    if (num === null) {
      if (!(rest.length === 1 && (POSS_PRON.test(rest[0]) || ADJ.has(rest[0])))) return false;
      num = whNum || "sg";
    } else if (whNum && rest.length === 1 && /^(this|that|these|those)$/.test(rest[0]) && whNum !== num) return false;
    return a === "am" ? num === "i" : a === "is" ? num === "sg" : num === "pl";
  }
  if (/^(do|does)$/.test(a)) {
    const v = t.findIndex((w, k) => k > i && isVerb(w));
    if (v < 0) return false;
    const s = t.slice(i + 1, v), num = s.includes("and") ? "pl" : npNumber(s);
    if (num === null || s.some((w) => STOP.test(w))) return false;
    return (a === "does") === (num === "sg") && BASE.has(t[v]) && !t.slice(v + 1).some((w) => isVerb(w) || AUX.test(w));
  }
  return false;
}

// たずねている内容と、答えが合うか
function qtype(q) {
  const s = q.toLowerCase();
  if (/^what time/.test(s)) return "time";
  if (/^when/.test(s)) return "when";
  if (/^where/.test(s)) return "where";
  if (/^which/.test(s)) return "which";
  if (/^whose/.test(s)) return "whose";
  if (/^how old/.test(s)) return "old";
  if (/^how many/.test(s)) return "many";
  if (/^how (is|are) the weather/.test(s)) return "weather";
  if (/^how are you/.test(s)) return "feeling";
  if (/^how (do|does)/.test(s)) return "method";
  return null;
}
const TIME = /\bat (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|noon|\d+)\b|o'clock/i;
const DATE = /\b(January|February|March|April|May|June|July|August|September|October|November|December|spring|summer|fall|winter|(Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)days?)\b|\bafter (school|dinner|lunch)\b/i;
function ansOk(type, a, q) {
  switch (type) {
    case "where": return /\b(in|on|under|near|to|at|by) (the|my|your|his|her|our|a)\b/i.test(a) || /\b(in|to|from) (Osaka|Tokyo|Kyoto|Canada|Okinawa|Sapporo)\b/.test(a);
    case "time": return TIME.test(a);
    case "when": return TIME.test(a) || DATE.test(a);
    case "which": {
      const opts = q.slice(q.lastIndexOf(", ") + 2).replace(/\?$/, "").split(" or ").map((o) => o.replace(/^the /, "").toLowerCase());
      return opts.some((o) => a.toLowerCase().includes(o));
    }
    case "whose": {
      const m = a.match(/^(It's|They're) (mine|yours|his|hers|ours|theirs|(?:my |your )?([A-Za-z]+)'s)\.$/);
      if (!m || /^(you|he|she|we|i|it|they)$/i.test(m[3] || "")) return false;
      if (/\b(these|those)\?/.test(q || "")) return m[1] === "They're";
      if (/\b(this|that)\?/.test(q || "")) return m[1] === "It's";
      return true;
    }
    case "old": return /years old\.$/.test(a) || /^(I'm|She's|He's|It's) (\d+|eleven|twelve|thirteen|fourteen|fifteen|sixteen)\.$/.test(a);
    case "many": return /^I have (one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/.test(a);
    case "weather": return /^It's (sunny|rainy|cloudy|snowy|windy|hot|cold)\.$/.test(a);
    case "feeling": return /^I'm (fine|good|great|tired|happy|sleepy|hungry)\b/.test(a);
    case "method": return /^(By (bus|bike|train|car|taxi|plane)|I walk|On foot)\b/.test(a);
  }
  return false;
}
// 日本語の文から、使う疑問詞を決める
function cue(text) {
  if (/何時/.test(text)) return "What time";
  if (/何歳/.test(text)) return "How";
  if (/だれの/.test(text)) return "Whose";
  if (/どこ/.test(text)) return "Where";
  if (/いつ/.test(text)) return "When";
  if (/どちら|どれ/.test(text)) return "Which";
  if (/どうやって|どのように|どう|元気/.test(text)) return "How";
  return null;
}
const WH = /^(What time|What|Where|When|Which|Whose|Who|How)$/;
const isQuestion = (s) => /^[A-Z]/.test(s) && /\?$/.test(s) && !/[（＋〜]/.test(s);

test("疑問詞のきまり：疑問詞のあとは疑問文の語順。be動詞と do・does を主語に合わせる", () => {
  assert.ok(["Where do you live?", "Where are my shoes?", "What time does Ken leave home?", "Which bike is yours?", "Which train goes to Kyoto?", "Whose shoes are those?", "How old are you?", "How many pencils do you have?", "Where are you from?"].every(qOk));
  assert.ok(!["Where you live?", "Where is my shoes?", "What time do Ken leave home?", "Which bike are yours?", "Which train go to Kyoto?", "Which sport your brother likes?", "Which bike does yours?", "Whose shoes is those?", "How old you are?", "How many pencil do you have?", "Where do you from?"].some(qOk));
});

test("疑問文を選ぶ問題：正解だけが疑問詞の文のきまりに合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    if (q.type !== "choice" || !isQuestion(label(q))) return;
    n++;
    q.choices.forEach((c) => assert.equal(qOk(c.label), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 30, "疑問文を選ぶ問題 " + n);
});

test("答えを選ぶ問題：正解だけが、たずねた内容（場所・時・どちら・持ち主・方法・年れい・天気・数）に合う", () => {
  let n = 0;
  items.forEach(({ id, q }) => {
    const m = q.type === "choice" && q.text.match(/^([A-Z][^?]*\?) の答え/);
    if (!m) return;
    const type = qtype(m[1]);
    assert.ok(type, id + " たずねる内容");
    n++;
    q.choices.forEach((c) => assert.equal(ansOk(type, c.label, m[1]), c.key === q.answer, id + " " + c.label));
  });
  assert.ok(n >= 30, "答えの問題 " + n);
});

test("（ ）に入れる問題：疑問詞は日本語の意味から、ほかは文のきまり・答えの合い方から1つだけ正しい", () => {
  let n = 0, w = 0;
  items.forEach(({ id, q, skill }) => {
    if (q.type !== "choice") return;
    const text = q.text.replace(/^.*」/, "").replace(/ の（ ）は？.*$/, "").trim();
    if (!/（ ）/.test(text)) return;
    if (q.choices.every((c) => WH.test(c.label))) {
      w++;
      q.choices.forEach((c) => assert.equal(c.label === cue(q.text), c.key === q.answer, id + " " + c.label));
      return;
    }
    const [qs, as] = text.split(" — ");
    n++;
    q.choices.forEach((c) => {
      let ok;
      if (as !== undefined && /（ ）/.test(as)) ok = ansOk(qtype(qs), as.replace("（ ）", c.label), qs);
      else if (/\?$/.test(qs)) ok = qOk(qs.replace("（ ）", c.label));
      else ok = skill === "qwWhose" && ansOk("whose", qs.replace("（ ）", c.label), "");
      assert.equal(ok, c.key === q.answer, id + " " + text.replace("（ ）", c.label));
    });
  });
  assert.ok(n >= 35, "（ ）の問題 " + n);
  assert.ok(w >= 8, "疑問詞を入れる問題 " + w);
});

test("中1 英語 疑問詞：can の次・前提は英語の中で先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SUBJECT_UNITS["英語"]["中学1年"].slice(0, 7), ["be動詞", "一般動詞", "3人称単数現在", "名詞の複数形", "命令文", "can", U]);
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
