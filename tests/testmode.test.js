// node --test tests/*.test.js — テストが近いときの今日の学習（test_priority）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner", "testprep", "store"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, B = SC.bank, P = SC.planner, TP = SC.testprep, ST = SC.store;
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;
const RANGE = E.UNITS["一次関数"];

// 学校：一次関数「グラフ・式まで」（2直線の交点はまだ）。グラフ・式が不安定（△）、移項でつまずいている
function school(cur = "form") {
  const s = { current_unit: "一次関数", units: { "式の計算": { status: "learned" }, "連立方程式": { status: "learned" }, "一次関数": { status: "learning", current_skill: cur } } };
  Object.keys(s.units).forEach((u) => { s.units[u].skills = E.expandUnit(u, s.units[u].status, s.units[u].current_skill); });
  return s;
}
function learner({ root = true } = {}) {
  const h = [];
  let n = 0;
  const add = (id, st) => h.push(E.makeAnswerRecord(Q[id], { status: st }, { userId: "u", context: "compass_check", now: T0 + (++n) * 1000 }));
  ["change-basic-1", "change-basic-2", "change-standard-1", "substitution-basic-1", "substitution-basic-2", "rate-basic-1", "rate-basic-2", "rate-standard-1",
    "signed-basic-2", "algebra-basic-1", "likeTerms-basic-1", "eqProperty-basic-1", "slopeIntercept-basic-1"].forEach((id) => add(id, "correct"));
  ["form-basic-1", "form-basic-2"].forEach((id) => add(id, "incorrect"));
  if (root) ["transpose-basic-1", "transpose-basic-2"].forEach((id) => add(id, "incorrect"));
  return h;
}
const EXPL = [{ date: new Date(T0).toISOString(), symptom: { skill: "form", label: "グラフ・式" }, path: [{ depth: 0 }, { depth: 1 }], conclusion: { kind: "gap_found", return_to: "transpose" } }];
function plan(days, opts = {}) {
  const h = opts.history || learner(opts);
  const s = opts.school || school();
  const now = T0 + 3600e3;
  return P.build({ states: E.computeSkillStates(h, { now, school: s }), history: h, explorations: opts.root === false ? [] : EXPL,
    school: { current_unit: "一次関数", school_status: "learning", detail: s }, minutes: opts.minutes || 30, now, rng: B.seeded(1),
    test: days === null ? undefined : { range: opts.range || RANGE, focus: [], kind: "focus", days_left: days } });
}
const rangeMin = (p, range = RANGE) => p.sessions.filter((x) => range.includes(x.skill) && x.type !== "practice").reduce((m, x) => m + x.minutes, 0);
const desc = (p) => p.sessions.map((x) => x.minutes + " " + x.type + ":" + x.skill).join(" / ");

test("残り日数で配分が変わり、テストが近いほどテスト範囲の学習が増える（test_weight 0.2 → 0.4 → 0.7 → 0.9）", () => {
  const ps = [20, 10, 5, 2].map((d) => plan(d));
  assert.deepEqual(ps.map((p) => p.debug.alloc.test.test_weight), [0.2, 0.4, 0.7, 0.9]);
  assert.deepEqual(ps.map((p) => p.test.stage), ["understand", "understand", "solve", "narrow"]);
  const testMin = ps.map((p) => p.sessions.filter((x) => x.type === "test").reduce((m, x) => m + x.minutes, 0));
  for (let i = 1; i < testMin.length; i++) assert.ok(testMin[i] >= testMin[i - 1], "テストが近いほど増える：" + testMin.join(" → "));
  assert.ok(testMin[3] > testMin[0], ps.map(desc).join("\n"));
  // 14日以上前は、いつもの学習（学校の範囲）が中心で、テスト範囲は5分程度
  assert.ok(ps[0].sessions.some((x) => x.type === "current_unit"), desc(ps[0]));
  assert.equal(testMin[0], 5);
  // 3日前：戻る5・テスト範囲20・仕上げ5
  assert.equal(rangeMin(ps[3]) - 5, 20, desc(ps[3]));
  assert.ok(ps.every((p) => p.total_minutes === 30));
});

test("テスト前でも、根本のつまずき（範囲外の移項）を完全には捨てない", () => {
  [7, 3, 2, 1].forEach((d) => {
    const p = plan(d);
    const back = p.sessions.find((x) => x.type === "practice");
    assert.ok(back && back.skill === "transpose", d + "日前：" + desc(p));
    assert.ok(back.minutes >= 5 && back.minutes <= 10, d + "日前：" + desc(p));
  });
});

test("テスト範囲の中では弱点（△）から。仕上がりはスキルごとに ◎ ○ △ ？ ・", () => {
  const p = plan(5);
  const first = p.sessions.find((x) => x.type === "test");
  assert.equal(first.skill, "form");
  assert.equal(first.mark, "△");
  const pri = p.debug.alloc.test.priority;
  assert.equal(pri[0].skill, "form");
  assert.ok(pri[0].reasons.includes("まだ不安定"));
  const h = learner();
  const ready = TP.readiness(E.computeSkillStates(h, { now: T0, school: school() }), RANGE, T0);
  assert.equal(ready.find((r) => r.skill === "form").mark, "△");
  assert.equal(ready.find((r) => r.skill === "simGraph").mark, "・", "学校でまだ習っていない");
  assert.equal(ready.find((r) => r.skill === "simGraph").need, 0, "計画の日を割り当てない");
});

test("未学習の扱い：テスト範囲でも苦手にしない。4〜7日前なら、学校で次に習う1スキルだけ先取り候補", () => {
  const p7 = plan(6);
  const pv = p7.debug.alloc.test.priority.find((c) => c.skill === "simGraph");
  assert.ok(pv && pv.preview, "先取り候補");
  p7.sessions.filter((x) => x.skill === "simGraph").forEach((x) => assert.equal(x.type, "preview"));
  const p2 = plan(2);
  assert.ok(!p2.sessions.some((x) => x.skill === "simGraph"), "3日前からは弱点にしぼる：" + desc(p2));
  assert.ok(p2.debug.alloc.excluded.some((x) => x.skill === "simGraph" && /苦手にはしない/.test(x.why)));
  // 先取りでまちがえても、確かさを下げない・苦手にしない
  const h = learner();
  h.push(E.makeAnswerRecord(Q["simGraph-basic-1"], { status: "incorrect", preview: true }, { userId: "u", now: T0 + 9e6 }));
  const st = E.computeSkillStates(h, { now: T0 + DAY, school: school() });
  assert.equal(st.simGraph.learning_status, "not_learned");
  assert.equal(st.simGraph.attempt_count, 0);
});

test("前日は新しいことを増やさない：まちがえた問題・不安定なスキル・定着の確認", () => {
  const h = learner();
  const p = plan(1, { history: h });
  assert.equal(p.test.stage, "confirm");
  assert.ok(!p.sessions.some((x) => x.type === "preview" || x.type === "challenge"), desc(p));
  const states = E.computeSkillStates(h, { now: T0 + 3600e3, school: school() });
  p.sessions.forEach((x) => assert.ok(states[x.skill].attempt_count > 0, "前日に記録のないスキル：" + x.skill));
  // 最近まちがえた問題に、もう一度
  const formPart = p.sessions.find((x) => x.type === "test" && x.skill === "form");
  assert.ok(formPart.picks.some((k) => k.question_id === "form-basic-1" || k.question_id === "form-basic-2"), JSON.stringify(formPart.picks));
  assert.match(p.why, /明日はテストなので、新しいことは増やさず/);
});

test("「なぜ今日はこれ？」と「今日の重点」にテストの理由が入る", () => {
  const p = plan(5);
  assert.match(p.why, /テストまで5日なので、テスト範囲の中でまだ不安定な「グラフ・式」を優先します/);
  assert.match(p.why, /「移項」も、少しだけ確認します/);
  assert.equal(p.focus_text, "一次関数・グラフ・式");
  const far = plan(20);
  assert.match(far.why, /テストまで20日。いつもの学習を中心に/);
});

test("テストの予定がない日は、これまでどおり（テスト範囲の枠を作らない）", () => {
  const p = plan(null);
  assert.equal(p.test, null);
  assert.ok(!p.sessions.some((x) => x.type === "test"));
});

test("テスト範囲チェック：学校でまだ習っていないスキルと、最近十分に確かめたスキルは出さない（3〜6問）", () => {
  const h = learner();
  const now = T0 + 3600e3;
  const states = E.computeSkillStates(h, { now, school: school() });
  const rc = TP.rangeCheck({ states, history: h, now, range: RANGE }, []);
  assert.ok(rc.chosen.length >= 3 && rc.chosen.length <= 6, rc.chosen.length);
  assert.ok(!rc.chosen.some((c) => c.skill === "simGraph"));
  const later = TP.rangeCheck({ states, history: h, now: T0 + 10 * DAY, range: RANGE }, RANGE);
  assert.ok(!later.chosen.some((c) => c.skill === "simGraph"));
});

test("テスト結果をあとで入れられる形：test_prep.result と、終わったテストの履歴", () => {
  ST.reset();
  const t = ST.setTestPrep({ test_date: "2026-10-20", range_skills: RANGE });
  assert.ok(t.id);
  assert.equal(t.result, null);
  ST.endTestPrep();
  const hist = ST.get().profile.test_history;
  assert.equal(hist.length, 1);
  assert.equal(hist[0].result, null);
  assert.equal(hist[0].test_date, "2026-10-20");
  ST.reset();
});
