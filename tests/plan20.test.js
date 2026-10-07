// node --test tests/*.test.js — 20分プラン：何を削るか・同じスキルを重ねない・理由の確認を一律に削らない
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, L = SC.logic, P = SC.planner, G = SC.geometry;
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;
const schoolAt = (cur) => ({ current_unit: "図形の角", units: { "図形の角": { status: "learning", current_skill: cur } } });
function answer(h, qid, wrong, at) {
  const q = Q[qid], v = {};
  q.steps.forEach((st) => { v[st.id] = wrong && wrong[st.id] !== undefined ? wrong[st.id] : String(st.answer); });
  const res = L.checkSteps(q, v);
  q.steps.forEach((st, i) => h.push(E.makeAnswerRecord({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, unit: q.unit, aspect: st.aspect },
    { status: res[i].correct ? "correct" : "incorrect", chosen: res[i].chosen, confusion: res[i].correct ? null : G.confusionOf(st, res[i].chosen) }, { userId: "u", context: "compass_check", now: at + i })));
}
const build = (h, school, minutes) => P.build({ states: E.computeSkillStates(h, { now: T0 + DAY }), history: h, explorations: [], minutes, now: T0 + DAY, rng: SC.bank.seeded(2),
  school: { current_unit: "図形の角", school_status: "learning", detail: school } });
const desc = (p) => p.sessions.map((s) => s.minutes + " " + s.type + "[" + s.purposes.join("+") + "]:" + s.skill).join(" / ");
// 平行線と角：角度は何度も正解、根拠（同位角なのに錯角）だけ最後にまちがえた
function reasonWeak(h) {
  ["parallelAngles-basic-1", "parallelAngles-basic-2", "parallelAngles-standard-2"].forEach((id, i) => answer(h, id, undefined, T0 + i * 100));
  answer(h, "parallelAngles-basic-3", { s2: "alternate" }, T0 + 500);
}

test("20分：深い原因・学校・理由の確認の3パート。「理由を確認」は「確認」（仕上げ）より後に削る", () => {
  const h = [];
  ["lineAngles-basic-2", "triangleSum-basic-3"].forEach((id, i) => answer(h, id, undefined, T0 - 3000 + i * 10));
  reasonWeak(h);
  // 移項が不安定（深い原因）
  ["transpose-basic-1", "transpose-basic-2"].forEach((id, i) => h.push(E.makeAnswerRecord(Q[id], { status: "incorrect" }, { userId: "u", context: "compass_check", now: T0 + 1000 + i })));
  const p = build(h, schoolAt("triangleSum"), 20);
  assert.ok(p.sessions.length <= 3, desc(p));
  assert.ok(p.sessions.some((s) => s.purposes.includes("reason_review")), "理由の確認が残る：" + desc(p));
  assert.ok(p.sessions.some((s) => s.display === "current_unit" || s.type === "current_unit"), "学校の学習が0分にならない：" + desc(p));
  assert.ok(p.debug.alloc.compose, "debug：パートの組み立て");
});

test("同じスキルは1つのパートにまとめる：学校の学習（平行線と角）＋理由の確認（平行線と角）→ 1パート・目的は2つ・最後に根拠の問題", () => {
  [20, 30, 45].forEach((m) => {
    const h = [];
    reasonWeak(h);
    const p = build(h, schoolAt("parallelAngles"), m);
    const nonCheck = p.sessions.filter((s) => s.type !== "check").map((s) => s.skill);
    assert.equal(new Set(nonCheck).size, nonCheck.length, m + "分：同じスキルが2つの表示枠に入らない：" + desc(p));
    const host = p.sessions.find((s) => s.skill === "parallelAngles" && s.type !== "check");
    assert.ok(host, desc(p));
    // 学校で学習中の「平行線と角」を飛ばさず、学校の学習の中に理由の確認をまとめる
    assert.equal(host.type, "current_unit", m + "分：" + desc(p));
    assert.deepEqual(host.purposes, ["school", "reason_review"], m + "分：" + desc(p));
    {
      const last = Q[host.questions[host.questions.length - 1]];
      assert.ok(last.reason_only, m + "分：最後に根拠だけの問題：" + host.questions.join(","));
      assert.ok(p.debug.alloc.compose.merges.some((x) => x.skill === "parallelAngles"));
    }
    if (m === 20) assert.ok(p.sessions.length <= 3, desc(p));
  });
});
