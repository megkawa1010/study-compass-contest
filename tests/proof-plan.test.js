// node --test tests/*.test.js — 合同と証明：学校の単元・テスト範囲・今日の学習への接続（ケース A〜F）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, R = SC.rootcause, P = SC.planner, G = SC.geometry;
const T0 = Date.parse("2026-10-01T07:00:00Z");

const school = (at) => ({ current_unit: "合同と証明", units: { "図形の角": { status: "learned" }, "一次関数": { status: "learned" }, "連立方程式": { status: "learned" }, "式の計算": { status: "learned" },
  "合同と証明": { status: "learning", current_skill: at } } });
// 子ども1人分：前の単元の問題（pre）→ 合同と証明のはじめてのチェック（wrongs の問題だけまちがえる）→ extra（練習・原因さがし）→ 次の日の今日の学習
function day(opts) {
  const h = [], expl = [], det = school(opts.at || "proofBuild");
  let n = 0;
  const ans = (id, vals, ctx) => {
    const q = Q[id];
    if (q.type === "steps") {
      const v = {};
      q.steps.forEach((s) => (v[s.id] = s.answer));
      Object.assign(v, vals || {});
      const res = SC.logic.checkSteps(q, v);
      q.steps.forEach((s, i) => h.push(E.makeAnswerRecord({ id: id + "#" + s.id, skill: s.skill, level: q.level, unit: q.unit, aspect: s.aspect },
        { status: res[i].correct ? "correct" : "incorrect", chosen: res[i].chosen, confusion: res[i].correct ? null : G.confusionOf(s, res[i].chosen) }, { userId: "u", context: ctx || "compass_check", now: T0 + ++n * 1000 })));
      return res;
    }
    const val = vals === undefined ? q.answer : vals, ok = JSON.stringify(val) === JSON.stringify(q.answer);
    h.push(E.makeAnswerRecord(q, { status: ok ? "correct" : "incorrect", chosen: val, confusion: ok || q.aspect !== "reason" ? null : G.confusionOf(q, val),
      preview: E.schoolSkillStatus(q.skill, det) === "not_learned" }, { userId: "u", context: ctx || "compass_check", now: T0 + ++n * 1000 }));
    return [{ id: null, skill: q.skill, correct: ok, aspect: q.aspect || "claim", chosen: val }];
  };
  (opts.pre || ["lineAngles-basic-1", "parallelAngles-basic-1", "triangleSum-basic-1", "angleBasics-basic-1"]).forEach((id) => ans(id));
  SC.compass.unitCheck("合同と証明", det).questions.forEach((id) => ans(id, (opts.wrongs || {})[id]));
  const trail = (q, res, knows) => { const s = R.simulate(q, res, knows, { now: T0 + 5e5, school: det }); expl.push({ ...s.trail, date: new Date(T0 + 5e5).toISOString() }); return s; };
  if (opts.extra) opts.extra({ ans, trail, det });
  const now = T0 + 864e5;
  const plan = P.build({ states: E.computeSkillStates(h, { now, school: det }), history: h, explorations: expl, school: { current_unit: "合同と証明", school_status: "learning", detail: det },
    minutes: opts.minutes || 30, now, rng: SC.bank.seeded(1) });
  return { plan, h, det };
}
const kinds = (p) => p.sessions.map((s) => (s.kind || s.type) + ":" + s.skill + ":" + s.minutes).join(" / ");
const part = (p, kind, skill) => p.sessions.find((s) => (s.kind || s.type) === kind && (!skill || s.skill === skill));
const condTrail = ({ trail }) => trail(Q["congCond-basic-1"], [{ id: null, skill: "congCond", correct: false, aspect: "reason", chosen: "SSS" }], { congCorr: true, angleBasics: true });

test("学校の単元：合同と証明を選べる。「どこまで進んだ？」は4段階で、内部では6スキルに広がる（未学習 ≠ 苦手）", () => {
  assert.ok(E.SELECTABLE_UNITS.includes("合同と証明"));
  assert.deepEqual(E.schoolOptions("合同と証明").map(E.schoolOptionLabel), ["合同な図形まで", "合同条件まで", "仮定と結論まで", "証明まで"]);
  assert.deepEqual(E.expandUnit("合同と証明", "learning", "congCond"),
    { congCorr: "learned", congCond: "current", proofFigureFacts: "current", proofHypConc: "not_learned", proofBuild: "not_learned", congUse: "not_learned" });
  assert.deepEqual(E.expandUnit("合同と証明", "learning", "proofBuild"),
    { congCorr: "learned", congCond: "learned", proofFigureFacts: "learned", proofHypConc: "learned", proofBuild: "current", congUse: "current" });
  // テスト範囲にも選べる
  assert.ok(SC.testprep.RANGE_UNITS.includes("合同と証明"));
  assert.deepEqual(SC.testprep.unitSkills("合同と証明"), E.UNITS["合同と証明"]);
});

test("A 合同条件が弱い → もどって確認10分：合同条件の短い問題 → 証明の合同条件の行", () => {
  const { plan } = day({ wrongs: { "congCond-basic-1": "SSS" }, extra: condTrail });
  const r = part(plan, "proof_root_review", "congCond");
  assert.ok(r, kinds(plan));
  assert.equal(r.minutes, 10);
  assert.equal(r.picks.length, 3);
  assert.ok(r.picks.slice(0, 2).every((p) => Q[p.question_id].skill === "congCond" && !Q[p.question_id].proof));
  const last = Q[r.picks[2].question_id];
  const condLine = last.src ? last.src.proof.lines.find((l) => l.id === last.src.line).role === "condition" : last.steps.some((s) => s.role === "condition");
  assert.ok(condLine, last.id);
  assert.ok(!part(plan, "reason_review", "congCond"), "合同条件そのものに戻るので、同じスキルの根拠の確認は重ねない");
});

test("B 根拠だけ弱い → 理由を確認5分：同じスキルの根拠だけの問題。別スキルの skill_state を動かさない", () => {
  const q = Q["proofFigureFacts-basic-2"];
  const { plan } = day({ wrongs: { [q.id]: { s2: "hypothesis" } } });
  const r = part(plan, "reason_review");
  assert.ok(r, kinds(plan));
  assert.equal(r.skill, "proofFigureFacts");
  assert.equal(r.minutes, 5);
  assert.match(r.why, /主張は合っています/);
  r.picks.forEach((p) => { const x = Q[p.question_id]; assert.ok(x.reason_only && x.skill === "proofFigureFacts", p.question_id); });
  assert.equal(Q[r.picks[0].question_id].answer, "common", "取り違えた根拠（共通）が正解の問題から");
});

test("C 対応する辺・角が弱い → 対応する頂点 → 辺・角 → 短い証明", () => {
  const { plan } = day({ wrongs: { "congCorr-basic-1": "de" }, extra: ({ trail }) => trail(Q["congCorr-basic-1"], [{ id: null, skill: "congCorr", correct: false, aspect: "claim", chosen: "de" }], { angleBasics: true }) });
  const r = part(plan, "proof_root_review", "congCorr");
  assert.ok(r, kinds(plan));
  const [a, b, c] = r.picks.map((p) => Q[p.question_id]);
  assert.equal(a.corr.of.length, 1, "① 頂点");
  assert.ok(b.skill === "congCorr" && b.corr.of.length > 1, "② 辺・角");
  assert.ok(c.proof, "③ 短い証明");
});

test("D 組み立てだけ弱い → 深い原因さがしにせず、学校の学習の中で並べかえ5〜10分", () => {
  const { plan } = day({ extra: ({ ans, trail }) => {
    const q = Q["proof-order-sss-1"], o = ["L1", "L2", "L4", "L3", "L5"];
    ans(q.id, o, "lesson");
    trail(q, SC.proof.orderResults(q, o), { congCond: true, congCorr: true, angleBasics: true });
  } });
  assert.ok(!plan.sessions.some((s) => s.type === "practice" && s.skill === "proofBuild"), kinds(plan));
  const o = plan.sessions.find((s) => s.type === "current_unit" && s.skill === "proofBuild");
  assert.ok(o && o.minutes >= 5 && o.minutes <= 10, kinds(plan));
  assert.ok(o.picks.every((p) => Q[p.question_id].type === "order" && [4, 5].includes(Q[p.question_id].proof.lines.length)));
  assert.ok(plan.debug.excluded.some((x) => x.skill === "proofBuild" && /並べかえ/.test(x.why)));
});

test("E 図から使える事実（対頂角）で止まり、図形①もできていない → 図形①の「対頂角・一直線の角」まで戻る。共通だけの問題では戻らない", () => {
  const { plan } = day({ pre: ["angleBasics-basic-1"], extra: ({ ans, trail }) => {
    const q = Q["proof-sas-vertical-1"];
    trail(q, ans(q.id, { L3c: "aoccob" }, "lesson"), { lineAngles: false, angleBasics: true });
  } });
  const r = part(plan, "geometry_root_review", "lineAngles");
  assert.ok(r, kinds(plan));
  assert.ok(!plan.sessions.some((s) => s.skill === "parallelAngles"), "錯角は使っていないので平行線と角へは戻らない");
  assert.match(r.picks[2].why, /証明に戻る/);
  // 共通な辺だけの問題で止まった → 図形①へは戻らない
  const p2 = day({ pre: ["angleBasics-basic-1"], extra: ({ ans, trail }) => {
    const q = Q["proof-sas-common-1"];
    trail(q, ans(q.id, { L3c: "ab" }, "lesson"), { lineAngles: false, angleBasics: true });
  } }).plan;
  assert.ok(!p2.sessions.some((s) => E.SKILLS[s.skill].unit === "図形の角" && s.type === "practice"), kinds(p2));
});

test("F 学校でまだ習っていない証明の問題 → 先取り扱い：まちがえても苦手にせず、原因さがしもしない。先取りは次の1スキルだけ", () => {
  const { plan, det } = day({ at: "congCorr" });
  const g = SC.proof.entry(Q["congCond-basic-1"], [{ id: null, skill: "congCond", correct: false, aspect: "reason", chosen: "SSS" }], { school: det });
  assert.equal(g.entry, "not_learned");
  assert.equal(E.schoolSkillStatus("proofBuild", det), "not_learned");
  assert.ok(!plan.sessions.some((s) => ["proofHypConc", "proofBuild", "congUse"].includes(s.skill)), kinds(plan));
  assert.ok(plan.sessions.filter((s) => s.type === "preview").every((s) => s.skill === "congCond"), kinds(plan));
  // はじめてのチェックも、習ったスキルだけ
  assert.ok(SC.compass.unitCheck("合同と証明", det).questions.every((id) => E.schoolSkillStatus(Q[id].skill, det) !== "not_learned"));
});

test("証明だけで時間を使い切らない：30分以上は、ほかの単元を5分。20分の日は証明の戻る勉強と学校を優先", () => {
  const { plan } = day({});
  const other = plan.sessions.filter((s) => E.SKILLS[s.skill].unit !== "合同と証明");
  assert.ok(other.length && other.every((s) => s.minutes === 5), kinds(plan));
  const p20 = day({ minutes: 20, wrongs: { "congCond-basic-1": "SSS" }, extra: condTrail }).plan;
  assert.ok(part(p20, "proof_root_review"), kinds(p20));
  assert.ok(!p20.sessions.some((s) => E.SKILLS[s.skill].unit !== "合同と証明" && s.type === "review"), kinds(p20));
});

test("テスト範囲に合同と証明：学校のようすで登録したテストが、そのままテスト対策の枠と範囲チェックにつながる", () => {
  const { h, det } = day({ wrongs: { "congCond-basic-1": "SSS" } });
  const now = T0 + 864e5, range = SC.testprep.unitSkills("合同と証明");
  const plan = P.build({ states: E.computeSkillStates(h, { now, school: det }), history: h, explorations: [], school: { current_unit: "合同と証明", school_status: "learning", detail: det },
    minutes: 30, now, rng: SC.bank.seeded(1), test: { range, focus: [], kind: "focus", days_left: 5 } });
  assert.ok(plan.sessions.some((s) => s.type === "test" && range.includes(s.skill)), kinds(plan));
  const rc = SC.testprep.rangeCheck({ states: E.computeSkillStates(h, { now }), history: h, now, rng: SC.bank.seeded(1) }, range);
  assert.ok(rc.chosen.length && rc.chosen.every((c) => range.includes(c.skill)));
});
