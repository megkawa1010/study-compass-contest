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

test("確かさは一度で最大にならず、段階ごとに上がる", () => {
  const h = [];
  const a = log(h, T0, "s1");
  a("B4", "correct");
  const basic = E.computeSkillStates(h, { now: T0 }).rate.confidence;
  a("S1", "correct");
  const standard = E.computeSkillStates(h, { now: T0 }).rate.confidence;
  assert.ok(basic >= 0.45 && basic <= 0.5, "基礎 ≈0.5: " + basic);
  assert.ok(standard > basic && standard <= 0.65, "標準 ≈0.65: " + standard);
  // 同じ日に何回正解しても、定着の上限は超えない
  for (let i = 0; i < 10; i++) a("B4", "correct");
  assert.ok(E.computeSkillStates(h, { now: T0 }).rate.confidence <= 0.65);
});

test("高い確かさから1回の不正解で急落しない", () => {
  const h = [];
  let a = log(h, T0, "s1");
  a("B4", "correct"); a("S1", "correct");
  a = log(h, T0 + 4 * 24 * HOUR, "s2");
  a("B4", "correct"); a("S1", "correct");
  const before = E.computeSkillStates(h, {}).rate.confidence;
  a("B4", "incorrect");
  const after = E.computeSkillStates(h, {}).rate;
  assert.ok(before >= 0.8, "定着後は高い: " + before);
  assert.ok(before - after.confidence <= E.CONFIG.maxDropPerAnswer + 1e-9, before + " → " + after.confidence);
  assert.equal(after.basic, "pass", "直近の傾向で見るので、1回の×では基礎を取り消さない");
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

test("同じ履歴からは必ず同じ結果（順番が入れ替わっていても）", () => {
  const h = [];
  const a = log(h, T0, "s1");
  a("B4", "incorrect"); a("C4", "incorrect"); a("B4", "correct");
  const x = JSON.stringify(E.computeSkillStates(h, { now: T0 }));
  const y = JSON.stringify(E.computeSkillStates(h.slice().reverse(), { now: T0 }));
  assert.equal(x, y);
});
