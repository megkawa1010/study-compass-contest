// node --test tests/*.test.js — 図形の根拠だけの問題：reason だけを記録し、別スキル・主張（value）の skill_state を動かさない
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, G = SC.geometry;
const T0 = Date.parse("2026-10-01T07:00:00Z");
const GEO = Object.values(Q).filter((q) => q.reason_only && E.SKILLS[q.skill].unit === "図形の角");

test("図形の根拠だけの問題：理由の確認でよく使うスキルは4〜6問。図の検算に通る。チェック・練習の索引に入らない", () => {
  const n = {};
  GEO.forEach((q) => (n[q.skill] = (n[q.skill] || 0) + 1));
  ["lineAngles", "parallelAngles", "triangleSum", "exteriorAngle", "angleEq", "polygonInterior", "polygonExterior", "angleCombo"].forEach((k) => assert.ok(n[k] >= 4, k + " " + n[k]));
  assert.ok(n.angleNames >= 3);
  GEO.forEach((q) => {
    assert.deepEqual(G.audit(q).warnings, [], q.id);
    assert.ok(!Object.values(SC.bank.index[q.skill]).flat().includes(q.id), q.id);
    assert.equal(q.level, "basic"); assert.equal(q.aspect, "reason"); assert.equal(q.usage, "practice");
    q.choices.forEach((c) => assert.equal(c.label, G.REASONS[c.key], q.id));
  });
  // 同じ文章ばかりにしない（スキルの中で本文が重ならない）
  Object.keys(n).forEach((k) => { const texts = GEO.filter((q) => q.skill === k).map((q) => q.text); assert.equal(new Set(texts).size, texts.length, k); });
});

test("記録は、そのスキルの reason だけ（value・別のスキルは動かない）。理由の確認は同じスキルの問題だけを選ぶ", () => {
  GEO.forEach((q) => {
    const wrong = q.choices.find((c) => c.key !== q.answer).key;
    const st = E.computeSkillStates([E.makeAnswerRecord(q, { status: "incorrect", chosen: wrong, confusion: G.confusionOf(q, wrong) }, { userId: "u", context: "lesson", now: T0 })], { now: T0 + 1000 });
    Object.keys(st).forEach((k) => {
      const moved = k === q.skill ? st[k].value && st[k].value.attempts : st[k].attempt_count || (st[k].reason && st[k].reason.attempts);
      assert.ok(!moved, q.id + " が " + k + " を動かした");
    });
    assert.equal(st[q.skill].reason.attempts, 1, q.id);
  });
  ["angleEq", "triangleSum", "exteriorAngle", "polygonInterior", "angleCombo"].forEach((k) => {
    const picks = SC.planner.reasonPicks({ skill: k, confusions: ["straight_for_vertical"], missed_questions: [] }, { history: [], now: T0 }, []);
    assert.equal(picks.length, 2, k);
    picks.forEach((p) => assert.equal(Q[p.question_id].skill, k, k + " " + p.question_id));
  });
});
