// node --test tests/*.test.js — 図形：原因さがしの結果を今日の学習へ（根拠の確認5分・図形の性質に戻る10分・計算側へ）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, L = SC.logic, R = SC.rootcause, P = SC.planner, B = SC.bank, G = SC.geometry;
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;

function schoolAt(cur) {
  const s = { current_unit: "図形の角", units: { "図形の角": { status: "learning", current_skill: cur } } };
  s.units["図形の角"].skills = E.expandUnit("図形の角", "learning", cur);
  return s;
}
// アプリと同じ形で記録する（小問ごと・根拠は選んだ選択肢と取り違えも）
function answer(h, qid, wrong, at, context, preview) {
  const q = Q[qid];
  if (q.type !== "steps") {
    const v = wrong !== undefined ? wrong : String(q.answer), ok = L.check(q, v);
    h.push(E.makeAnswerRecord(q, { status: ok ? "correct" : "incorrect", preview, chosen: q.aspect === "reason" ? v : null, confusion: !ok && q.aspect === "reason" ? G.confusionOf(q, v) : null },
      { userId: "u", context: context || "compass_check", now: at }));
    return [{ correct: ok }];
  }
  const v = {};
  q.steps.forEach((st) => { v[st.id] = wrong && wrong[st.id] !== undefined ? wrong[st.id] : String(st.answer); });
  const res = L.checkSteps(q, v);
  q.steps.forEach((st, i) => h.push(E.makeAnswerRecord({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, unit: q.unit, aspect: st.aspect },
    { status: res[i].correct ? "correct" : "incorrect", preview, chosen: res[i].chosen, confusion: res[i].correct ? null : G.confusionOf(st, res[i].chosen) },
    { userId: "u", context: context || "compass_check", now: at + i })));
  return res;
}
// 図形の角を「三角形の外角まで」習った子ども：対頂角・三角形の内角はできている
function base() {
  const h = [];
  ["lineAngles-basic-2", "triangleSum-basic-3", "exteriorAngle-basic-2"].forEach((id, i) => answer(h, id, undefined, T0 + i * 1000));
  return h;
}
function plan(h, explorations, opts = {}) {
  const now = opts.now || T0 + DAY;
  const school = opts.school || schoolAt("exteriorAngle");
  return P.build({ states: E.computeSkillStates(h, { now, school }), history: h, explorations, now, rng: B.seeded(3), minutes: opts.minutes || 30,
    school: { current_unit: "図形の角", school_status: "learning", detail: school } });
}
const part = (p, kind) => p.sessions.find((s) => s.kind === kind);
const desc = (p) => p.sessions.map((s) => s.minutes + " " + (s.kind || s.type) + ":" + s.skill).join(" / ");

test("1 角度○・根拠× → 根拠の確認5分（取り違えた根拠を、別の図で。角度の計算はくり返さない）", () => {
  const h = base();
  const res = answer(h, "parallelAngles-basic-1", { s2: "alternate" }, T0 + 9000);   // 同位角なのに錯角を選んだ
  const ex = { ...R.reasonOnly(Q["parallelAngles-basic-1"], R.geometryEntry(Q["parallelAngles-basic-1"], res), T0 + 9000), date: new Date(T0 + 9000).toISOString() };
  const p = plan(h, [ex]);
  const r = part(p, "reason_review");
  assert.ok(r, desc(p));
  assert.equal(r.skill, "parallelAngles");
  assert.equal(r.minutes, 5);
  assert.match(r.why, /角度は求められています。今日は理由だけ少し確認しよう。/);
  assert.match(r.intro.body[0], /角度は求められています/);
  // 同じ問題ではなく、同じ取り違え（錯角 ↔ 同位角）を別の図で。最初は計算のない「根拠だけ」の問題
  assert.ok(!r.questions.includes("parallelAngles-basic-1"));
  const first = Q[r.questions[0]];
  assert.ok(first.reason_only, r.questions[0]);
  assert.equal(first.answer, "corresponding");
  assert.ok(first.choices.some((c) => c.key === "alternate"));
  assert.ok(r.questions.length <= 2);
  assert.ok(r.questions.every((id) => Q[id].reason_only || (Q[id].position && Q[id].position.with)), "角度の計算をさせる問題は入れない：" + r.questions);
  // 学校の範囲は大きく圧迫しない
  const schoolMin = p.sessions.filter((s) => s.type === "current_unit").reduce((m, s) => m + s.minutes, 0);
  assert.ok(schoolMin >= 10, desc(p));
  assert.equal(p.total_minutes, 30);
  assert.ok(p.debug.geometry.parts.some((x) => x.kind === "reason_review" && x.minutes === 5));
});

test("2 角度×・根拠× で図形側に戻った → 10分の戻る勉強（位置関係 → 根拠 → 簡単な角度）", () => {
  const h = base();
  const q = Q["parallelAngles-basic-1"];
  const res = answer(h, q.id, { s1: "108", s2: "straight" }, T0 + 9000);
  answer(h, "angleNames-basic-1", "f", T0 + 9500);                                      // 原因さがしの問題：同位角の位置もまちがえた
  const sim = R.simulate(q, res, { angleNames: false, lineAngles: true }, { now: T0 + 9000 });
  assert.equal(sim.trail.conclusion.return_to, "angleNames");
  const p = plan(h, [{ ...sim.trail, date: new Date(T0 + 9000).toISOString() }]);
  const g = part(p, "geometry_root_review");
  assert.ok(g, desc(p));
  assert.equal(g.skill, "angleNames");
  assert.equal(g.minutes, 10);
  assert.match(g.why, /位置関係 → 根拠 → 簡単な角度/);
  // 順番：① 位置関係（同位角・錯角の基礎）② 根拠だけを選ぶ ③ 平行線と角の基礎（簡単な角度）。標準・応用には戻さない
  const qs = g.questions.map((id) => Q[id]);
  assert.equal(qs[0].skill, "angleNames");
  assert.ok(qs[1].reason_only || qs[1].steps.some((s) => s.aspect === "reason"));
  assert.equal(qs[2].skill, "parallelAngles");
  assert.ok(qs.every((x) => x.level === "basic"), g.questions);
  // 角度も不安定なので、根拠だけの確認は入れない（戻る勉強で扱う）
  assert.ok(!part(p, "reason_review"));
  assert.ok(p.debug.geometry.reason.some((x) => x.skill === "parallelAngles" && /角度もまだ不安定/.test(x.why)));
});

test("3 角度×・根拠○ で計算側（移項）に戻った → 移項の練習だけ。図形の性質は練習し直さない", () => {
  const h = base();
  const q = Q["angleEq-basic-3"];
  const res = answer(h, q.id, { s1: "40" }, T0 + 9000);
  answer(h, "transpose-basic-1", "0", T0 + 9500);
  answer(h, "transpose-basic-2", "0", T0 + 9600);
  const sim = R.simulate(q, res, { likeTerms: true, transpose: false, signed: true, algebra: true }, { now: T0 + 9000 });
  assert.equal(sim.trail.conclusion.return_to, "transpose");
  const p = plan(h, [{ ...sim.trail, date: new Date(T0 + 9000).toISOString() }]);
  const c = part(p, "calculation_root_review");
  assert.ok(c, desc(p));
  assert.equal(c.skill, "transpose");
  assert.equal(c.type, "practice");
  assert.ok(!p.sessions.some((s) => s.type === "practice" && R.isGeometry(s.skill)), "図形の練習時間を増やさない：" + desc(p));
  assert.ok(!part(p, "reason_review") && !part(p, "geometry_root_review"));
});

test("4 根拠が前回×・今回○ → reason の確かさが上がる（value は動かない）", () => {
  const h = base();
  answer(h, "parallelAngles-basic-1", { s2: "alternate" }, T0 + 9000);
  const before = E.computeSkillStates(h, { now: T0 + DAY }).parallelAngles;
  answer(h, "parallelAngles-reason-1", undefined, T0 + DAY + 1000);
  const after = E.computeSkillStates(h, { now: T0 + DAY + 5000 }).parallelAngles;
  assert.ok(after.reason.confidence > before.reason.confidence, before.reason.confidence + " → " + after.reason.confidence);
  assert.equal(after.reason.correct, before.reason.correct + 1);
  assert.equal(after.value.attempts, before.value.attempts);
});

test("5 根拠が安定したら5分枠は消える（毎日固定にしない）。またまちがえたら、また出る", () => {
  const h = base();
  answer(h, "parallelAngles-basic-1", { s2: "alternate" }, T0 + 9000);
  assert.ok(part(plan(h, []), "reason_review"), "1回まちがえた次の学習では確認する");
  answer(h, "parallelAngles-reason-1", undefined, T0 + DAY + 1000, "lesson");              // 根拠の確認で正解
  const p2 = plan(h, [], { now: T0 + 2 * DAY });
  assert.ok(!part(p2, "reason_review"), "正解したら通常の学習へ：" + desc(p2));
  assert.ok(p2.debug.geometry.reason.some((x) => /最後の根拠は正解/.test(x.why)));
  answer(h, "parallelAngles-reason-2", "corresponding", T0 + 2 * DAY + 1000, "lesson");    // 錯角なのに同位角 → またまちがえた
  const p3 = plan(h, [], { now: T0 + 3 * DAY });
  const r = part(p3, "reason_review");
  assert.ok(r, desc(p3));
  assert.equal(Q[r.questions[0]].answer, "alternate", "今度の取り違え（同位角 → 錯角）を確かめる");
});

test("6 学校で未学習の図形スキル → 根拠をまちがえても今日の補習に入れない", () => {
  const school = schoolAt("lineAngles");                                                     // 平行線と角はまだ習っていない
  const h = base();
  answer(h, "parallelAngles-basic-1", { s2: "alternate" }, T0 + 9000, "compass_check", true); // 先取り（store が preview を付ける）
  const p = plan(h, [], { school });
  assert.ok(!part(p, "reason_review"), desc(p));
  assert.ok(!p.sessions.some((s) => s.type === "practice" && s.skill === "parallelAngles"));
  const st = E.computeSkillStates(h, { now: T0 + DAY, school }).parallelAngles;
  assert.equal(st.reason.attempts, 0);
  assert.deepEqual(st.reason.confusions, {});
});

test("時間が短い日：20分なら、根拠の確認は学校の範囲・戻る勉強より先に削る", () => {
  const h = base();
  answer(h, "parallelAngles-basic-1", { s2: "alternate" }, T0 + 9000);
  answer(h, "transpose-basic-1", "0", T0 + 9500);
  const p = plan(h, [], { minutes: 20 });
  assert.equal(p.total_minutes, 20);
  const school = p.sessions.filter((s) => s.type === "current_unit").reduce((m, s) => m + s.minutes, 0);
  assert.ok(school >= 10, desc(p));
});
