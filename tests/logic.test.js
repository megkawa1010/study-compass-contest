// node --test tests/  で実行。診断ロジックと表記ゆれ判定を確かめる。
const test = require("node:test");
const assert = require("node:assert/strict");
require("../js/questions.js");
require("../js/logic.js");
const { SC } = globalThis;
const L = SC.logic;

function run(results) {
  const answers = {};
  for (const [id, st] of Object.entries(results)) answers[id] = { status: st, hintUsed: false };
  return answers;
}
const c = "correct", x = "incorrect", u = "unknown";

test("表記ゆれを許容する", () => {
  const B5 = SC.QUESTIONS.B5;
  for (const v of ["y=2x-1", "y = 2x - 1", "ｙ＝２ｘ－１", "2x-1", "y=-1+2x", "y=2x−1"]) assert.ok(L.check(B5, v), v);
  for (const v of ["y=2x+1", "y=x-1", "2", "y=2x-1=0"]) assert.ok(!L.check(B5, v), v);
  assert.ok(L.check(SC.QUESTIONS.B1, "−2"));
  assert.ok(L.check(SC.QUESTIONS.B1, "－２"));
  assert.ok(L.check(SC.QUESTIONS.C4, { x_change: "3", y_change: "６" }));
  assert.ok(!L.check(SC.QUESTIONS.C4, { x_change: "3", y_change: "5" }));
  assert.ok(L.isBlank(SC.QUESTIONS.B1, "  "));
  assert.ok(L.isBlank(SC.QUESTIONS.C4, { x_change: "3", y_change: "" }));
});

test("デモシナリオ：B4・B5で止まる → 増加量が原因候補", () => {
  const a = run({ B1: c, B2: c, B3: c, B4: x, B5: x });
  assert.deepEqual(L.followUps(a).map((f) => f.id), ["C4", "C5"]);
  Object.assign(a, run({ C4: x, C5: c }));
  const d = L.diagnose(a);
  const st = Object.fromEntries(d.skills.map((k) => [k.key, k.status]));
  assert.deepEqual(st, { coord: "ok", proportion: "ok", substitution: "ok", rate: "unstable", form: "checking" });
  assert.equal(d.planKey, "change");
  const plan = L.buildPlan(d, a);
  assert.deepEqual(plan.steps.map((s) => s.min), [5, 10, 10]);
  assert.match(plan.steps[0].title, /増加量/);
  assert.match(d.discovery, /可能性|そう/);
  assert.doesNotMatch(d.discovery + plan.why, /苦手です/);
});

test("デモシナリオ（C4は正解）→ 変化の割合を確認", () => {
  const a = run({ B1: c, B2: c, B3: c, B4: x, B5: x, C4: c, C5: x });
  const d = L.diagnose(a);
  assert.equal(d.planKey, "rate");
  assert.equal(d.skills[4].status, "checking");
});

test("例2：B3→C2で止まる → 文字式への代入", () => {
  const a = run({ B1: c, B2: c, B3: x, B4: c, B5: c });
  assert.deepEqual(L.followUps(a).map((f) => f.id), ["C2", "S1", "S2"]);
  Object.assign(a, run({ C2: x, S1: c, S2: c }));
  const d = L.diagnose(a);
  assert.equal(d.planKey, "substitution");
  assert.deepEqual(d.skills[2].roots, ["文字式への代入"]);
});

test("例3・例4：B5×・C5○ → 式につなげる", () => {
  const a = run({ B1: c, B2: c, B3: c, B4: c, B5: x, C5: c, S1: c });
  const d = L.diagnose(a);
  assert.equal(d.planKey, "connect");
  assert.equal(d.skills[3].status, "ok");
});

test("わからない も失敗扱いにせず、原因確認へ進む", () => {
  const a = run({ B1: u, B2: c, B3: c, B4: c, B5: c });
  assert.equal(L.followUps(a)[0].id, "C1");
});

test("全部できた → 標準 → 応用（料金プラン）", () => {
  const a = run({ B1: c, B2: c, B3: c, B4: c, B5: c, S1: c, S2: c });
  const d = L.diagnose(a);
  assert.equal(d.planKey, "challenge");
  const plan = L.buildPlan(d, a);
  assert.equal(plan.steps[2].practice.answer, 4);
  assert.ok(L.check(plan.steps[2].practice, "4GB"));
  assert.ok(L.check(plan.steps[0].practice, "y=200x+500"));
  assert.ok(d.skillState.every((s) => s.confidence < 1));
});

test("標準で止まる → 形が変わると不安定", () => {
  const a = run({ B1: c, B2: c, B3: c, B4: c, B5: c, S1: x, S2: c });
  const d = L.diagnose(a);
  assert.equal(d.planKey, "standard");
  assert.match(d.skills[3].note, /形が変わると/);
});

test("全プランで3ステップ・答えが自分の問題で正解判定される", () => {
  const keys = ["change", "rate", "signed", "coord", "proportion", "substitution", "slope", "connect", "standard", "challenge"];
  for (const planKey of keys) {
    const d = { planKey, skills: [] };
    const plan = L.buildPlan(d, {});
    assert.equal(plan.steps.length, 3, planKey);
    for (const s of plan.steps) {
      const p = s.practice;
      const val = p.type === "linear" ? `y=${p.answer.a}x+${p.answer.b}` : p.type === "pair"
        ? Object.fromEntries(Object.entries(p.answer).map(([k, v]) => [k, String(v)])) : String(p.answer);
      assert.ok(L.check(p, val), planKey + " " + s.title);
    }
  }
});
