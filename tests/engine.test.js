// node --test tests/  — 学習履歴・理解度エンジン（Phase 1）の受入テスト
const test = require("node:test");
const assert = require("node:assert/strict");
require("../js/questions.js");
require("../js/logic.js");
require("../js/engine.js");
const { SC } = globalThis;
const E = SC.engine;
const Q = SC.QUESTIONS;
const HOUR = 60 * 60 * 1000;
const T0 = Date.parse("2026-10-01T16:00:00Z");

// 履歴を組み立てる小さな道具
function log(history, at, sessionId, context) {
  let n = 0;
  return (qOrId, status, hintUsed) => {
    const q = typeof qOrId === "string" ? Q[qOrId] : qOrId;
    n += 1;
    history.push(E.makeAnswerRecord(q, { status, hintUsed: !!hintUsed }, { userId: "u1", sessionId, context, now: at + n * 1000 }));
  };
}
const lessonQ = (id, skill) => ({ id, skill, level: "basic", unit: "一次関数" });

test("answer_history は仕様の項目をすべて持つ", () => {
  const h = [];
  log(h, T0, "s1")("B4", "incorrect", true);
  const r = h[0];
  for (const k of ["id", "user_id", "question_id", "unit", "skill", "level", "correct", "hint_used", "unknown_selected", "answered_at", "self_evaluation"]) {
    assert.ok(k in r, k);
  }
  assert.equal(r.skill, "rate");
  assert.equal(r.level, "basic");
  assert.equal(r.correct, false);
  assert.equal(r.hint_used, true);
});

test("受入シナリオ：×→学習→○（少し上がる・定着ではない）→数日後○（定着が上がる）", () => {
  const h = [];
  // 1回目のコンパスチェック
  let a = log(h, T0, "s1");
  a("B1", "correct"); a("B2", "correct"); a("B3", "correct"); a("B4", "incorrect"); a("B5", "unknown");
  a("C4", "incorrect"); a("C5", "correct");
  const s1 = E.computeSkillStates(h, { now: T0 + HOUR });
  assert.equal(s1.rate.learning_status, "needs_review");
  assert.equal(s1.rate.basic, "needs_review");
  assert.deepEqual(s1.rate.suspected_root_causes, ["変化量"]);
  assert.equal(s1.rate.next_action, "review_change_amount");
  assert.equal(s1.coord.learning_status, "understood");
  const c1 = s1.rate.confidence;
  assert.ok(c1 <= 0.35, "1回目の確かさは低い: " + c1);

  // 今日の学習（練習）
  a = log(h, T0 + 2 * HOUR, "s1", "lesson");
  a(lessonQ("L-change-1", "change"), "correct");
  a(lessonQ("L-change-2", "rate"), "correct");
  a("B4", "correct");
  const sL = E.computeSkillStates(h, { now: T0 + 3 * HOUR });
  assert.equal(sL.rate.learning_status, "learning", "練習のあとは学習中");
  assert.equal(sL.rate.basic, "needs_review", "練習だけではレベル判定を変えない");

  // 2回目のコンパスチェック（同じ日）
  a = log(h, T0 + 5 * HOUR, "s2");
  a("B4", "correct");
  const s2 = E.computeSkillStates(h, { now: T0 + 6 * HOUR });
  assert.equal(s2.rate.basic, "pass");
  assert.equal(s2.rate.learning_status, "understood");
  assert.ok(s2.rate.confidence > c1, "少し上がる");
  assert.ok(s2.rate.confidence <= 0.5, "基礎だけなら 0.5 まで: " + s2.rate.confidence);
  assert.equal(s2.rate.retention, "not_checked", "まだ定着にはしない");

  // 4日後のコンパスチェック
  a = log(h, T0 + 4 * 24 * HOUR, "s3");
  a("B4", "correct");
  const s3 = E.computeSkillStates(h, { now: T0 + 4 * 24 * HOUR + HOUR });
  assert.equal(s3.rate.retention, "pass");
  assert.equal(s3.rate.learning_status, "retained");
  assert.ok(s3.rate.confidence > s2.rate.confidence, "定着で上がる");
  assert.equal(s3.rate.attempt_count, 5);
  assert.equal(s3.rate.correct_count, 4);
});

test("1回の正解で上がる幅：基礎 +0.04 / 標準 +0.05 / 応用 +0.06 / 数日後の確認 +0.08", () => {
  const h = [];
  const conf = () => E.computeSkillStates(h, {}).rate.confidence;
  let a = log(h, T0, "s1");
  const c0 = E.CONFIG.startConfidence;
  a("B4", "correct");
  const c1 = conf();
  a("S1", "correct");
  const c2 = conf();
  a({ id: "rate-application-1#s2", skill: "rate", level: "application", unit: "一次関数" }, "correct");
  const c3 = conf();
  a = log(h, T0 + 4 * 24 * HOUR, "s2");
  a({ id: "rate-retention-x", skill: "rate", level: "retention", evidence_level: "basic", unit: "一次関数" }, "correct");
  const c4 = conf();
  const near = (x, y) => Math.abs(x - y) < 0.011;
  assert.ok(near(c1 - c0, 0.04), "基礎 " + (c1 - c0));
  assert.ok(near(c2 - c1, 0.05), "標準 " + (c2 - c1));
  assert.ok(near(c3 - c2, 0.06), "応用 " + (c3 - c2));
  assert.ok(near(c4 - c3, 0.08), "定着 " + (c4 - c3));
});

test("確かさは一度で最大にならず、同じ日に何回正解しても到達レベルの上限を超えない", () => {
  const h = [];
  const a = log(h, T0, "s1");
  for (let i = 0; i < 20; i++) a(i % 2 ? "B4" : "S1", "correct");
  const s = E.computeSkillStates(h, { now: T0 }).rate;
  assert.ok(s.confidence <= E.CONFIG.ceiling.standard + 1e-9, "標準までなら 0.65 まで: " + s.confidence);
  assert.equal(s.retention, "not_checked");
});

test("1回の不正解で下がる幅：通常 −0.05 まで、数日後の確認でも −0.10 まで", () => {
  const h = [];
  let a = log(h, T0, "s1");
  for (let i = 0; i < 3; i++) a(i % 2 ? "B4" : "S1", "correct");
  const conf = () => E.computeSkillStates(h, {}).rate.confidence;
  let before = conf();
  a("B4", "incorrect");
  assert.ok(before - conf() <= 0.05 + 1e-9, "通常: " + before + " → " + conf());
  // 定着まで上げてから、数日後に×
  for (let d = 1; d <= 6; d++) { a = log(h, T0 + d * 4 * 24 * HOUR, "d" + d); a("S1", "correct"); }
  before = conf();
  assert.ok(before >= 0.8, "何度も数日後に確かめると高くなる: " + before);
  a = log(h, T0 + 30 * 24 * HOUR, "late");
  a("S1", "incorrect");
  const after = E.computeSkillStates(h, {}).rate;
  assert.ok(before - after.confidence <= 0.10 + 1e-9, "定着の確認での×: " + before + " → " + after.confidence);
  assert.equal(after.standard, "pass", "直近の傾向で見るので、何度もできていた標準を1回の×では取り消さない");
});

test("ヒントありの正解は、ヒントなしより確かさが低い", () => {
  const h1 = [], h2 = [];
  log(h1, T0, "s")("B4", "correct", true);
  log(h2, T0, "s")("B4", "correct", false);
  assert.ok(E.computeSkillStates(h1, {}).rate.confidence < E.computeSkillStates(h2, {}).rate.confidence);
});

test("まだ習っていない単元は「要確認」ではなく「未学習」", () => {
  const h = [];
  const a = log(h, T0, "s1");
  a("B4", "unknown"); a("B1", "incorrect");
  const s = E.computeSkillStates(h, { schoolProgress: "notyet" });
  assert.equal(s.rate.learning_status, "not_learned");
  assert.equal(s.coord.learning_status, "needs_review", "前の学年の内容は影響を受けない");
  assert.equal(s.form.learning_status, "not_learned", "回答がなくても未学習と表示");
});

test("原因候補は前提スキルをいちばん根元までたどる", () => {
  const h = [];
  const a = log(h, T0, "s1");
  a("B5", "incorrect"); a("C5", "correct"); a("B4", "incorrect"); a("C4", "incorrect");
  const s = E.computeSkillStates(h, {});
  assert.deepEqual(s.form.suspected_root_causes, ["変化量"]);
});

test("定着用の問題でも、日数があいていなければ定着にしない", () => {
  const h = [];
  const retQ = { id: "rate-ret-x", skill: "rate", level: "retention", evidence_level: "basic", unit: "一次関数" };
  let a = log(h, T0, "s1");
  a(retQ, "correct");
  let s = E.computeSkillStates(h, {}).rate;
  assert.equal(s.retention, "not_checked", "同じ日に解いても定着ではない");
  assert.equal(s.basic, "pass", "基礎の証拠としては数える");
  a = log(h, T0 + 4 * 24 * HOUR, "s2");
  a(retQ, "correct");
  s = E.computeSkillStates(h, {}).rate;
  assert.equal(s.retention, "pass", "日数があいていれば定着");
});

test("応用問題の中で同じスキルの小問に×と○が混ざったら、そのスキルはできたことにしない", () => {
  const h = [];
  const a = log(h, T0, "s1");
  const step = (id, skill) => ({ id: "rate-application-1#" + id, skill, level: "application", unit: "一次関数" });
  a(step("s1", "change"), "correct");
  a(step("s2", "rate"), "incorrect");
  a(step("s3", "rate"), "correct");
  const s = E.computeSkillStates(h, {});
  assert.equal(s.rate.application, "needs_review");
  assert.equal(s.rate.attempt_count, 1, "小問2つで1回分");
  assert.equal(s.change.application, "pass");
  assert.equal(h.length, 3, "記録そのものは小問ごとに残す");
});

test("上のレベルが新しくできていれば、古い×の残る下のレベルもできたとみなす", () => {
  const h = [];
  let a = log(h, T0, "s1");
  a("B4", "incorrect"); // 基礎 ×
  a = log(h, T0 + 24 * HOUR, "s2");
  a("S1", "correct");   // あとで標準 ○
  const s = E.computeSkillStates(h, {}).rate;
  assert.equal(s.standard, "pass");
  assert.equal(s.basic, "pass", "標準ができたので基礎も");
  // 逆に、基礎の×が標準の○より新しければ、基礎は要確認のまま
  a = log(h, T0 + 48 * HOUR, "s3");
  a("B4", "incorrect");
  assert.equal(E.computeSkillStates(h, {}).rate.basic, "needs_review");
});

test("同じ履歴からは必ず同じ結果（順番が入れ替わっていても）", () => {
  const h = [];
  const a = log(h, T0, "s1");
  a("B4", "incorrect"); a("C4", "incorrect"); a("B4", "correct");
  const x = JSON.stringify(E.computeSkillStates(h, { now: T0 }));
  const y = JSON.stringify(E.computeSkillStates(h.slice().reverse(), { now: T0 }));
  assert.equal(x, y);
});
