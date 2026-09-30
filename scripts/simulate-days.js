// 開発用：毎日「今日の学習」を続けたときに、問題の再利用・不足がいつ起きるかを調べる
//   node scripts/simulate-days.js [日数] [分]
// 想定：最初のチェックで「変化量・変化の割合・グラフ式」がまだ不安定な子ども。
//       練習したスキルは、その日のうちにできるようになっていく（知っているスキルは正解する）。
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, P = SC.planner;
const DAYS = Number(process.argv[2] || 10), MIN = Number(process.argv[3] || 30);
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;
const SCHOOL = { grade: "中2", subject: "数学", current_unit: "一次関数", school_status: "learning" };

const history = [];
let n = 0;
const knows = { coord: true, proportion: true, substitution: true, algebra: true, signed: true, slopeIntercept: true, change: false, rate: false, form: false };
function answer(qid, at, context) {
  const q = Q[qid];
  const rec = (qq, id, skill) => history.push(E.makeAnswerRecord({ ...qq, id, skill }, { status: knows[skill] ? "correct" : "incorrect" }, { userId: "u", sessionId: "d", context, now: at + (++n) * 1000 }));
  if (q.type === "steps") q.steps.forEach((s) => rec({ level: q.level, unit: q.unit }, qid + "#" + s.id, s.skill));
  else rec(q, qid, q.skill);
}
["B1", "B2", "B3", "B4", "B5", "C4", "C5"].forEach((id) => answer(id, T0, "compass_check"));
const explorations = [{ date: new Date(T0).toISOString(), symptom: { label: "変化の割合" }, conclusion: { kind: "gap_found", return_to: "change" } }];

console.log(`日数 ${DAYS} ／ ${MIN}分 ／ 問題数 ${SC.bank.ids.length + 12}`);
let totalQ = 0, totalReuse = 0, totalRelax = 0, fallbacks = 0, firstReuseDay = null;
for (let d = 1; d <= DAYS; d++) {
  const now = T0 + d * DAY;
  const plan = P.build({ states: E.computeSkillStates(history, { now }), history, explorations, school: SCHOOL, minutes: MIN, goal: "daily_learning", now, rng: SC.bank.seeded(d) });
  if (!plan.sessions.length) { fallbacks++; console.log(`${d}日目：fallback`); continue; }
  const picks = plan.sessions.flatMap((s) => s.picks.map((p) => ({ ...p, type: s.type, skill: s.skill })));
  const reuse = picks.filter((p) => p.reused).length, relax = picks.filter((p) => p.stage > 0 && !p.reused).length;
  totalQ += picks.length; totalReuse += reuse; totalRelax += relax;
  if (reuse && firstReuseDay === null) firstReuseDay = d;
  console.log(`${String(d).padStart(2)}日目：` + plan.sessions.map((s) => `${s.type}:${s.skill_label}(${s.level_label})${s.questions.length}問`).join(" / ") +
    `  → 再利用 ${reuse}・緩和 ${relax}` + (reuse ? "  [" + picks.filter((p) => p.reused).map((p) => p.question_id).join(",") + "]" : ""));
  // 学習する（練習したスキルは、その日の終わりにはできるようになる）
  plan.sessions.forEach((s) => s.questions.forEach((id) => answer(id, now + 3600e3, s.type === "check" || s.level === "retention" ? "daily_check" : "lesson")));
  plan.sessions.filter((s) => s.type === "practice").forEach((s) => (knows[s.skill] = true));
}
console.log(`合計 ${totalQ}問中 再利用 ${totalReuse}（${Math.round((totalReuse / totalQ) * 100)}%）・緩和 ${totalRelax}・fallback ${fallbacks}・最初の再利用 ${firstReuseDay ? firstReuseDay + "日目" : "なし"}`);
