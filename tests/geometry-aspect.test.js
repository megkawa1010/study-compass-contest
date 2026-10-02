// node --test tests/*.test.js — 図形スキルの value / reason（角度を求める力と理由の理解を別々に）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine"].forEach((f) => require("../js/" + f + ".js"));
const E = globalThis.SC.engine;
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;
let n = 0;
const rec = (ok, aspect, day = 0, extra = {}) => Object.assign({ question_id: "g" + (++n), skill: "parallelAngles", level: "basic", context: "compass_check",
  correct: ok, hint_used: false, answered_at: new Date(T0 + day * DAY + n * 1000).toISOString(), aspect }, extra);

test("根拠を聞いていない問題では reason は動かない", () => {
  const s = E.aspectState("parallelAngles", [rec(true, undefined), rec(false, undefined)], {});
  assert.equal(s.reason.attempts, 0);
  assert.equal(s.reason.status, "not_checked");
  assert.equal(s.value.attempts, 2);
});

test("value と reason は別々に育ち、取り違えを数える", () => {
  const s = E.aspectState("parallelAngles", [rec(true, "value"), rec(false, "reason", 0, { confusion: "corresponding_vs_alternate" })], {});
  assert.equal(s.value.correct, 1);
  assert.equal(s.reason.correct, 0);
  assert.deepEqual(s.reason.confusions, { corresponding_vs_alternate: 1 });
  assert.equal(s.overall.reason_practice, true);
});

test("reason が未確認でも value の retained は失わない。mastered には reason の安定が要る", () => {
  assert.equal(E.overallOf({ status: "retained", attempts: 5 }, { status: "not_checked", attempts: 0 }).status, "retained");
  const o = E.overallOf({ status: "retained", attempts: 5 }, { status: "learning", attempts: 2 });
  assert.equal(o.status, "retained");
  assert.match(o.note, /角度を求める力は定着だが、理由の理解はまだ安定していない/);
  assert.equal(E.overallOf({ status: "mastered", attempts: 9 }, { status: "learning", attempts: 2 }).status, "retained");
  assert.equal(E.overallOf({ status: "mastered", attempts: 9 }, { status: "understood", attempts: 3 }).status, "mastered");
});

test("4パターンの原因さがしの入口", () => {
  assert.deepEqual(E.geometryRoute(true, true), { trail: null, reason_practice: false });
  assert.deepEqual(E.geometryRoute(true, false), { trail: null, reason_practice: true });
  assert.equal(E.geometryRoute(false, true).trail, "calc");
  assert.equal(E.geometryRoute(false, false).trail, "concept");
});
