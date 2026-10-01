// 開発用：3日おきに定期コンパスチェックを続けたとき、定着用の問題の再利用がいつ起きるかを調べる
//   node scripts/simulate-checks.js [回数]
["questions", "logic", "engine", "bank", "compass"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, C = SC.compass;
const N = Number(process.argv[2] || 10);
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;
const history = [], sessions = [];
let n = 0;
// はじめは一次関数の5スキルとも基礎ができている（その後の定着を確かめていく）
const first = ["B1", "B2", "B3", "B4", "B5", "C1", "C2", "C4", "C5", "S1", "S2"];
first.forEach((id) => history.push(E.makeAnswerRecord(Q[id], { status: "correct" }, { userId: "u", sessionId: "s0", now: T0 + (++n) * 1000 })));
sessions.push({ id: "s0", finished_at: new Date(T0 + 60e3).toISOString(), question_ids: first });
let reuse = 0, total = 0, retQ = 0, firstReuse = null;
for (let i = 1; i <= N; i++) {
  const now = T0 + i * 3 * DAY;
  const states = E.computeSkillStates(history, { now });
  const r = C.buildCheck({ states, history, sessions, now, rng: SC.bank.seeded(i) });
  const sid = "s" + i;
  const re = r.chosen.filter((c) => c.reused).length;
  reuse += re; total += r.chosen.length; retQ += r.chosen.filter((c) => Q[c.question_id].level === "retention").length;
  if (re && firstReuse === null) firstReuse = i;
  console.log(`${String(i).padStart(2)}回目（${i * 3}日後）：` + r.chosen.map((c) => c.question_id + (c.reused ? "*" : "")).join(" ") + (re ? `  ← 再利用 ${re}` : ""));
  r.chosen.forEach((c) => {
    const q = Q[c.question_id];
    if (q.type === "steps") q.steps.forEach((s) => history.push(E.makeAnswerRecord({ id: q.id + "#" + s.id, skill: s.skill, level: q.level, unit: q.unit }, { status: "correct" }, { userId: "u", sessionId: sid, now: now + (++n) * 1000 })));
    else history.push(E.makeAnswerRecord(q, { status: "correct" }, { userId: "u", sessionId: sid, now: now + (++n) * 1000 }));
  });
  sessions.push({ id: sid, finished_at: new Date(now + 60e3).toISOString(), question_ids: r.questions });
}
const st = E.computeSkillStates(history, { now: T0 + (N * 3 + 1) * DAY });
console.log(`合計 ${total}問（定着用 ${retQ}）中 再利用 ${reuse}・最初の再利用 ${firstReuse ? firstReuse + "回目" : "なし"}`);
console.log("状態：" + ["change", "substitution", "rate", "slopeIntercept", "form"].map((k) => E.SKILLS[k].label + "=" + st[k].learning_status + "(定着確認" + st[k].retention_count + "日)").join(" / "));
