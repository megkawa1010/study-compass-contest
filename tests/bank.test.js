// node --test tests/*.test.js — 問題バンクの検収
const test = require("node:test");
const assert = require("node:assert/strict");
require("../js/questions.js");
require("../js/logic.js");
require("../js/engine.js");
require("../js/bank.js");
require("../js/geometry.js");
require("../js/figures.js");
const { SC } = globalThis;
const L = SC.logic, E = SC.engine, B = SC.bank, Q = SC.QUESTIONS;
const bank = B.ids.map((id) => Q[id]);
const UNIT_SKILLS = ["change", "substitution", "rate", "slopeIntercept", "form"];
const BASE_SKILLS = ["signed", "algebra", "proportion", "coord"];

// 問題の「正解」を、実際に入力される形の文字列にする
function asInput(q) {
  if (q.type === "number") return String(q.answer);
  if (q.type === "fraction") return q.answer;
  if (q.type === "linear") return `y=${q.answer.a}x${q.answer.b >= 0 ? "+" : ""}${q.answer.b}`;
  if (q.type === "pair") return Object.fromEntries(Object.entries(q.answer).map(([k, v]) => [k, String(v)]));
  if (q.type === "choice") return q.answer;
  if (q.type === "poly") return q.answer;
  if (q.type === "steps") return Object.fromEntries(q.steps.map((s) => [s.id, asInput(s)]));
  if (q.type === "order") return q.answer.slice();
}
function asWrong(q) {
  if (q.type === "number") return String(q.answer + 1);
  if (q.type === "fraction") return "999/1000";
  if (q.type === "linear") return `y=${q.answer.a + 1}x+${q.answer.b}`;
  if (q.type === "pair") return Object.fromEntries(Object.entries(q.answer).map(([k, v]) => [k, String(v + 1)]));
  if (q.type === "poly") return q.answer + "+1";
  if (q.type === "choice") return q.choices.find((c) => c.key !== q.answer).key;
  if (q.type === "order") return q.answer.slice().reverse();
  if (q.type === "steps") { const v = asInput(q); v[q.steps[0].id] = typeof v[q.steps[0].id] === "string" && q.steps[0].type !== "choice" ? "999" : "zz"; return v; }
}

test("追加問題の ID は重複せず、既存の B1〜S2 はそのまま", () => {
  assert.ok(B.ids.length >= 68, "追加は68問以上: " + B.ids.length);
  assert.equal(new Set(B.ids).size, B.ids.length);
  for (const id of ["B1", "B2", "B3", "B4", "B5", "C1", "C2", "C3", "C4", "C5", "S1", "S2"]) {
    assert.ok(Q[id] && Q[id].origin === "core", id);
    assert.ok(!B.ids.includes(id));
  }
  assert.equal(Q.B4.answer, 3);
  assert.deepEqual(Q.B5.answer, { a: 2, b: -1 });
});

test("スキル×レベルの問題数（一次関数は各10問以上・変化量と変化の割合は基礎・標準とも5問以上・既習は各5問以上）", () => {
  const c = B.count();
  for (const s of ["change", "rate"]) {
    assert.ok(c[s].basic >= 5 && c[s].standard >= 5, s + JSON.stringify(c[s]));
  }
  for (const s of UNIT_SKILLS) {
    const total = Object.values(c[s]).reduce((a, b) => a + b, 0);
    assert.ok(total >= 10, s + " " + total);
    assert.ok(c[s].basic >= 3 && c[s].standard >= 3 && c[s].application >= 2 && c[s].retention >= 2, s + JSON.stringify(c[s]));
  }
  for (const s of BASE_SKILLS) {
    const total = Object.values(c[s]).reduce((a, b) => a + b, 0);
    assert.ok(total >= 5, s + " " + total); // よく通る土台（正負の数など）は、足りなくなった順に増やす
    assert.ok(c[s].basic >= 3 && c[s].retention >= 2, s);
  }
});

test("全問が必須項目を持つ", () => {
  for (const q of bank) {
    const where = q.id;
    assert.ok(E.SKILLS[q.skill], where + " skill");
    assert.ok(B.LEVELS.includes(q.level), where + " level");
    assert.ok(Array.isArray(q.prerequisite_skills), where + " prerequisite_skills");
    q.prerequisite_skills.forEach((p) => assert.ok(E.SKILLS[p], where + " prereq " + p));
    assert.ok(Array.isArray(q.skills_used) && q.skills_used.includes(q.skill), where + " skills_used");
    q.skills_used.forEach((p) => assert.ok(E.SKILLS[p], where + " used " + p));
    assert.ok(q.answer !== undefined && q.answer !== null, where + " answer");
    assert.ok(q.explanation && q.explanation.length > 3, where + " explanation");
    assert.ok(q.hint && q.hint.length > 3, where + " hint");
    assert.ok(["expression", "table", "graph", "word", "numberline", "coordinate", "figure"].includes(q.format), where + " format");
    if (q.level === "retention") assert.ok(["basic", "standard"].includes(q.evidence_level), where + " evidence_level");
    if (q.type === "steps") {
      assert.ok(q.steps.length >= 2, where + " steps");
      q.steps.forEach((s) => {
        assert.ok(E.SKILLS[s.skill], where + "/" + s.id + " skill");
        assert.ok(s.hint && s.explanation, where + "/" + s.id + " hint/explanation");
      });
    }
  }
});

test("自分の正解で正解になり、ちがう答えでは正解にならない", () => {
  for (const q of bank) {
    assert.ok(L.check(q, asInput(q)), q.id + " 正解が通らない");
    assert.ok(!L.check(q, asWrong(q)), q.id + " 誤答が通ってしまう");
    assert.ok(!L.isBlank(q, asInput(q)), q.id);
  }
});

test("応用問題は小問ごとに採点でき、止まった小問のスキルがわかる", () => {
  const apps = bank.filter((q) => q.level === "application");
  assert.ok(apps.length >= 10);
  for (const q of apps) assert.equal(q.type, "steps", q.id + " 応用は小問に分ける");
  const q = Q["rate-application-2"];
  const v = asInput(q);
  v.s2 = "y=6x";              // 式をつくる小問だけまちがえる
  const res = L.checkSteps(q, v);
  const a = L.analyzeSteps(q, res);
  assert.equal(a.solved, 2);
  assert.equal(a.first_miss_step, "s2");
  assert.equal(a.suspected_skill, "form");
});

test("一次関数のスキルは、数式・表・グラフ・文章のうち3種類以上の形で出題される", () => {
  for (const s of UNIT_SKILLS) {
    const formats = new Set(Object.values(Q).filter((q) => q.skill === s).map((q) => q.format));
    assert.ok(formats.size >= 3, s + " " + [...formats]);
  }
});

test("グラフの点は直線の上にあり、答えは図と食いちがわない", () => {
  for (const q of bank.filter((q) => q.figure && q.figure.type === "graph")) {
    const f = q.figure;
    for (const p of f.points || []) {
      assert.ok(p.x >= f.x[0] && p.x <= f.x[1] && p.y >= f.y[0] && p.y <= f.y[1], q.id + " 点が図の外");
      if (f.lines && f.lines.length) assert.ok(f.lines.some((l) => Math.abs(l.a * p.x + l.b - p.y) < 1e-9), q.id + " 点が直線上にない");
    }
    const l = f.lines && f.lines[0];
    if (!l) continue;
    if (q.type === "linear") assert.deepEqual([q.answer.a, q.answer.b], [l.a, l.b], q.id);
    if (q.type === "pair" && "slope" in q.answer) assert.deepEqual([q.answer.slope, q.answer.intercept], [l.a, l.b], q.id);
    if (q.skill === "rate" && q.type === "number") assert.equal(q.answer, l.a, q.id);
    if (q.skill === "proportion") assert.equal(q.answer, l.a, q.id);
  }
  assert.equal(Q["slopeIntercept-basic-2"].answer, Q["slopeIntercept-basic-2"].figure.lines[0].b);
  assert.equal(Q["slopeIntercept-standard-1"].answer, Q["slopeIntercept-standard-1"].figure.lines[0].a);
  assert.deepEqual(Q["coord-basic-1"].answer, { x: 3, y: -2 });
});

test("一次関数の表は、値がすべて一直線上にあり、? の答えも同じ直線上にある", () => {
  for (const q of bank.filter((q) => q.figure && q.figure.type === "table" && q.unit !== "確率")) {
    const [xr, yr] = q.figure.rows;
    const pts = xr.values.map((x, i) => [x, yr.values[i]]).filter(([, y]) => y !== null);
    const [x0, y0] = pts[0], [x1, y1] = pts[1];
    const a = (y1 - y0) / (x1 - x0), b = y0 - a * x0;
    pts.forEach(([x, y]) => assert.ok(Math.abs(a * x + b - y) < 1e-9, q.id + " 表が一次関数になっていない"));
    const blanks = xr.values.filter((x, i) => yr.values[i] === null);
    if (blanks.length === 1 && q.type === "number") assert.ok(Math.abs(a * blanks[0] + b - q.answer) < 1e-9, q.id + " ? の答え");
    if (blanks.length === 2 && q.type === "pair") {
      const vals = Object.values(q.answer);
      blanks.forEach((x, i) => assert.ok(Math.abs(a * x + b - vals[i]) < 1e-9, q.id + " ? の答え"));
    }
    if (q.type === "linear") assert.deepEqual([q.answer.a, q.answer.b], [a, b], q.id);
    if (q.skill === "rate" && q.type === "number") assert.equal(q.answer, a, q.id);
  }
});

// 連立方程式：答え (x, y) が2つの式の両方をみたす。2直線の交点：答えが両方の直線の上にある
function solutionOf(q) {
  if (q.type === "pair" && "x" in q.answer) return q.answer;
  const last = (q.steps || []).filter((s) => s.type === "pair" && "x" in s.answer).pop();
  return last ? last.answer : null;
}
test("連立方程式の答えは2つの式の両方をみたし、2直線の交点は両方の直線の上にある", () => {
  const sims = bank.filter((q) => q.system);
  assert.ok(sims.length >= 25, "連立方程式の問題 " + sims.length);
  for (const q of sims) {
    const s = solutionOf(q);
    if (!s) continue; // 「何倍した式は？」のような工程だけの問題
    q.system.forEach(([a, b, c], i) => assert.ok(Math.abs(a * s.x + b * s.y - c) < 1e-9, `${q.id} の答えが ${i + 1} つ目の式をみたさない`));
    // 本文に出す式（{ の中）と、検算用の式が食いちがわない（そのまま出す式だけ確かめる）
    if (q.figure && q.figure.type === "system") assert.equal(q.figure.eqs.length, 2, q.id);
  }
  for (const q of bank.filter((q) => q.lines)) {
    const s = solutionOf(q);
    q.lines.forEach(([a, b], i) => assert.ok(Math.abs(a * s.x + b - s.y) < 1e-9, `${q.id} の交点が ${i + 1} 本目の直線の上にない`));
    if (q.figure && q.figure.type === "graph") assert.deepEqual(q.figure.lines.map((l) => [l.a, l.b]), q.lines, q.id + " 図の直線");
  }
});

test("旧アプリ（study-compass-app）の連立方程式25問をすべて再利用している", () => {
  const src = new Set(bank.map((q) => q.source).filter((s) => s && s.includes("simultaneous-eq-")));
  for (let i = 1; i <= 25; i++) assert.ok(src.has("study-compass-app:simultaneous-eq-" + String(i).padStart(2, "0")), "simultaneous-eq-" + i);
});

// 問題に出てくる数（本文・図・選択肢）を集める
// （グラフの表示範囲 x / y は問題の中身ではないので数えない）
function numbersOf(q) {
  // 図形の図は、座標ではなく、見える数（角の大きさ・式）だけをくらべる
  const fig = q.figure && q.figure.type === "geometry" ? (q.figure.angles || []).map((a) => [a.value, a.label, a.expr && [a.expr.a, a.expr.b]])
    : q.figure ? { ...q.figure, x: undefined, y: undefined } : {};
  // 穴うめ証明の「［1］」などは穴の番号なので数えない
  const text = [q.text, JSON.stringify(fig), JSON.stringify(q.choices || []), (q.steps || []).map((s) => s.text).join(" ")].join(" ")
    .replace(/［\d+］|\d組/g, "").replace(/[−]/g, "-");
  return new Set((text.match(/-?\d+(\.\d+)?/g) || []).filter((n) => !["0", "1", "-1"].includes(n)));
}

test("定着用の問題は、同じスキルの他の問題と見た目・数値が重なりすぎない", () => {
  for (const r of bank.filter((q) => q.level === "retention")) {
    const rn = numbersOf(r);
    for (const o of Object.values(Q).filter((q) => q.skill === r.skill && q.id !== r.id)) {
      // 連立方程式は本文が共通（「次の連立方程式を解きましょう。」）で、式は図（{ }）にあるので、本文と図をあわせてくらべる
      assert.notEqual(r.text + JSON.stringify(r.figure || {}), o.text + JSON.stringify(o.figure || {}), r.id + " と " + o.id + " の本文が同じ");
      // 確率は 2個・3枚 のような小さい数が、箱ひげ図は目もりの数がどの問題にも出るので、数の重なりでは比べない
      // （同じ場面の重複は tests/probability.test.js・tests/data-unit.test.js）
      if (r.unit === "確率" || r.unit === "データの活用") continue;
      const on = numbersOf(o);
      const inter = [...rn].filter((n) => on.has(n)).length;
      const union = new Set([...rn, ...on]).size || 1;
      assert.ok(inter / union < 0.5, `${r.id} と ${o.id} の数値が重なりすぎ（${[...rn]} / ${[...on]}）`);
    }
  }
});

test("同じスキル・レベルからランダムに選べる（未出題を優先・乱数は固定できる）", () => {
  const rng1 = B.seeded(42), rng2 = B.seeded(42);
  const a = B.pickMany("rate", "basic", 3, { rng: rng1 }).map((q) => q.id);
  const b = B.pickMany("rate", "basic", 3, { rng: rng2 }).map((q) => q.id);
  assert.deepEqual(a, b, "同じ種なら同じ順番");
  assert.equal(new Set(a).size, 3, "1回のチェックで同じ問題を出さない");
  a.forEach((id) => assert.ok(B.index.rate.basic.includes(id)));

  // B4 を解いた履歴があれば、B4 以外を先に出す
  const t = Date.parse("2026-10-01T00:00:00Z");
  const hist = [{ question_id: "B4", answered_at: new Date(t).toISOString() }];
  for (let seed = 1; seed < 30; seed++) {
    assert.notEqual(B.pick("rate", "basic", { history: hist, rng: B.seeded(seed) }).id, "B4");
  }
  // 全部解いていたら、いちばん前に解いた問題
  const all = B.index.rate.basic.map((id, i) => ({ question_id: id, answered_at: new Date(t + i * 1000).toISOString() }));
  assert.equal(B.pick("rate", "basic", { history: all, rng: B.seeded(7) }).id, B.index.rate.basic[0]);
  assert.equal(B.pick("rate", "basic", { exclude: B.index.rate.basic }), null);
});

test("用途タグ（usage）：全問が持ち、用途で絞って選べる", () => {
  const USAGES = ["diagnosis", "practice", "retention", "multi_use"];
  Object.values(Q).forEach((q) => assert.ok(USAGES.includes(q.usage), q.id + " usage=" + q.usage));
  assert.equal(Q.B4.usage, "diagnosis");
  assert.equal(Q["rate-retention-1"].usage, "retention");
  for (let seed = 1; seed < 20; seed++) {
    const q = B.pick("rate", "basic", { usage: ["practice", "multi_use"], rng: B.seeded(seed) });
    assert.notEqual(q.id, "B4", "練習用に絞れば、診断用の B4 は出ない");
  }
  assert.equal(B.pick("rate", "basic", { usage: ["practice"] }), null, "該当がなければ null（呼ぶ側で段階的にゆるめる）");
});

test("図が描ける（NaN や undefined を含まない）", () => {
  for (const q of bank.filter((q) => q.figure)) {
    const html = SC.figures.render(q.figure);
    assert.ok(html.length > 50, q.id);
    assert.ok(!/NaN|undefined|Infinity/.test(html), q.id + " 図に不正な値");
  }
});
