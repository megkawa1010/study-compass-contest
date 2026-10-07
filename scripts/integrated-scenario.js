// 開発用：統合シナリオテスト（中2数学を1人の子どもとして、学校の進度に合わせて30日通す）
//   node scripts/integrated-scenario.js [日数=30] [出力JSON]
//   SEED=数字 で乱数を変える（同じ子ども像で、答えの出方だけを変える）。METRICS=1 で最後に集計を1行の JSON（METRICS ...）で出す
//
// 本物の store（記録・skill_state の計算）・compass（定期チェック・単元のはじめてのチェック）・rootcause（原因さがし）・
// planner（今日の学習）・testprep（テスト）を、アプリの画面と同じ順番で呼ぶ。データは途中でリセットしない。
// 子どもの答えは「スキルごとにできる確率」で決め（乱数は固定）、練習したスキル・学校で習っているスキルは少しずつできるようになる。
// 最後に、1日ごとの記録と集計（原因・克服・単元またぎ・偏り・テスト・問題不足）を出す。出力JSONはブラウザに読み込める（store の形）。
const fs = require("fs");
const path = require("path");
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
["questions", "logic", "engine", "bank", "geometry", "proof", "figures", "compass", "rootcause", "planner", "testprep", "store"].forEach((f) => {
  try { require("../js/" + f + ".js"); } catch (e) { if (f !== "figures") throw e; }
});
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, S = SC.store, C = SC.compass, R = SC.rootcause, P = SC.planner, TP = SC.testprep, G = SC.geometry, L = SC.logic;
const DAYS = Number(process.argv[2] || 30);
const OUT = process.argv[3] || null;
const DAY = 864e5;

// ---------- 乱数（固定） ----------
let seed = Number(process.env.SEED || 20261005);
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

// ---------- 子ども像 ----------
// 学校で習ったときの「できる確率」。根拠（reason）は別に持つ（図形：角度は出せるが根拠を取り違える／証明：対応は分かるが合同条件と組み立てが不安定）
const BASE = {
  signed: 0.93, algebra: 0.9, likeTerms: 0.88, distrib: 0.6, proportion: 0.9, coord: 0.92, eqMeaning: 0.9, eqProperty: 0.85, transpose: 0.6, eqParen: 0.68, eqFraction: 0.72, eqWord: 0.7,
  polyAddSub: 0.82, polyMixed: 0.6, monoMulDiv: 0.86, eqTransform: 0.6,
  simMeaning: 0.92, simCoef: 0.85, simElim: 0.5, simSubst: 0.72, simParen: 0.65, simFraction: 0.65, simWord: 0.6,
  change: 0.88, substitution: 0.86, rate: 0.82, slopeIntercept: 0.86, form: 0.5, simGraph: 0.72,
  angleBasics: 0.95, lineAngles: 0.9, angleEq: 0.68, angleNames: 0.82, parallelAngles: 0.86, triangleSum: 0.88, exteriorAngle: 0.84, angleCombo: 0.7, polygonInterior: 0.8, polygonExterior: 0.8,
  congCorr: 0.9, congCond: 0.55, proofFigureFacts: 0.82, proofHypConc: 0.86, congUse: 0.8, proofBuild: 0.45
};
const REASON = { angleNames: 0.6, parallelAngles: 0.6, triangleSum: 0.7, exteriorAngle: 0.65, lineAngles: 0.8, angleCombo: 0.6, congCond: 0.55, proofFigureFacts: 0.62, proofHypConc: 0.8, congUse: 0.75 };
// 「途中から安定」：加減法は練習で早く伸びる
const GROW = { simElim: 0.09 };
const p = {}, pr = {};
Object.keys(E.SKILLS).forEach((k) => { p[k] = BASE[k] || 0.85; pr[k] = REASON[k] || p[k]; });
const PREVIEW_P = 0.35; // 学校でまだ習っていない内容
function learnedAt(k) { const st = E.schoolSkillStatus(k, S.school()); return st !== "not_learned"; }
function prob(skill, aspect) {
  if (!learnedAt(skill)) return PREVIEW_P;
  return aspect === "reason" ? pr[skill] : p[skill];
}
function practice(skill, aspect, k) {
  const g = (GROW[skill] || 0.05) * (k || 1);
  if (aspect === "reason") pr[skill] = Math.min(0.96, pr[skill] + (1 - pr[skill]) * g * 2);
  else p[skill] = Math.min(0.96, p[skill] + (1 - p[skill]) * g * 2);
  // 分配法則が安定すると、かっこを含む式の計算も少し安定する。移項が安定すると等式の変形・角度の式も
  if (skill === "distrib") p.polyMixed = Math.min(0.96, p.polyMixed + 0.01);
  if (skill === "transpose") { p.eqTransform = Math.min(0.96, p.eqTransform + 0.01); p.angleEq = Math.min(0.96, p.angleEq + 0.01); p.form = Math.min(0.96, p.form + 0.005); }
}

// ---------- 1問に答える（画面と同じ形で記録） ----------
function wrongKey(st) { const c = (st.choices || []).find((x) => x.key !== st.answer); return c ? c.key : null; }
// 返り値：rootcause 用の小問ごとの結果（L.checkSteps と同じ形）
function answer(qid, ctx) {
  const q = Q[qid];
  if (q.type === "steps") {
    const res = q.steps.map((st) => {
      const ok = rnd() < prob(st.skill, st.aspect);
      const chosen = st.type === "choice" ? (ok ? st.answer : wrongKey(st)) : null;
      S.addAnswer({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, evidence_level: q.evidence_level, unit: q.unit, aspect: st.aspect },
        { status: ok ? "correct" : "incorrect", chosen, confusion: ok ? null : G.confusionOf(st, chosen) }, ctx);
      return { id: st.id, skill: st.skill, correct: ok, aspect: st.aspect || "value", chosen };
    });
    return { q, ok: res.every((r) => r.correct), res };
  }
  if (q.type === "order") {
    const ok = rnd() < prob(q.skill, "claim");
    const o = ok ? q.answer.slice() : [q.answer[0], q.answer[1], q.answer[3], q.answer[2]].concat(q.answer.slice(4));
    S.addAnswer(q, { status: ok ? "correct" : "incorrect", chosen: o.join(","), confusion: ok ? null : SC.proof.orderCheck(q, o).tag }, ctx);
    return { q, ok, res: SC.proof.orderResults(q, o) };
  }
  const ok = rnd() < prob(q.skill, q.aspect);
  const chosen = q.type === "choice" ? (ok ? q.answer : wrongKey(q)) : null;
  S.addAnswer(q, { status: ok ? "correct" : "incorrect", chosen, confusion: ok || q.aspect !== "reason" ? null : G.confusionOf(q, chosen) }, ctx);
  return { q, ok, res: [{ id: null, skill: q.skill, correct: ok, aspect: q.aspect || "claim", chosen }] };
}

// ---------- コンパスチェック（画面の startPeriodic / finishPeriodic と同じ流れ） ----------
const log = { days: [], checks: [], trails: [] };
function runCheck(check, kind) {
  if (!check.questions.length) return null;
  const sid = S.startSession(kind === "unit_check" ? "compass_check" : "periodic", check.unit || S.currentUnit());
  const skills = [...new Set(check.chosen.map((c) => c.skill))];
  const before = C.snapshotSkills(S.get().skill_state, skills);
  let budget = kind === "unit_check" ? R.CONFIG.BUDGET_INITIAL : R.CONFIG.BUDGET_PERIODIC;
  const trails = [], queue = check.questions.slice(), asked = [];
  const known = {};
  const ctx = { sessionId: sid, context: "compass_check" };
  const probeCtx = () => ({ states: S.get().skill_state, now: S.now(), budgetLeft: budget, known, school: S.school(),
    pickQuestion: (skill) => { const r = C.pickProbe({ history: S.get().answer_history, sessions: S.get().sessions, now: S.now() }, skill, queue.concat(asked)); return r ? r.question_id : null; } });
  const drive = (t) => {
    for (let i = 0; i < 10; i++) {
      const pq = R.next(t, probeCtx());
      if (!pq) break;
      if (!pq.seed) budget--;
      asked.push(pq.question_id);
      const a = answer(pq.question_id, ctx);
      known[pq.skill] = a.ok;
      R.answer(t, pq, a.ok);
    }
  };
  check.questions.forEach((id) => {
    const a = answer(id, ctx);
    if (a.q.type !== "steps") known[a.q.skill] = a.ok;
    if (R.isGeometry(a.q.skill)) {
      const g = R.geometryEntry(a.q, a.res, { school: S.school() });
      if (g.entry === "none" || g.entry === "not_learned" || trails.some((t) => t.symptom.skill === g.skill)) return;
      if (g.entry === "reason_only") { trails.push(R.reasonOnly(a.q, g, S.now())); return; }
      const t = R.start({ question: a.q, geometry: g, now: S.now() });
      trails.push(t); drive(t);
    } else if (!a.ok) {
      const miss = a.q.type === "steps" ? L.analyzeSteps(a.q, a.res).suspected_skill : null;
      const skill = miss || a.q.skill;
      if (trails.some((t) => t.symptom.skill === skill) || S.schoolSkillStatus(skill) === "not_learned") return;
      const t = R.start({ question: a.q, skill, seeds: [], now: S.now() });
      trails.push(t); drive(t);
    }
  });
  trails.forEach((t) => { if (t.status === "open") R.conclude(t); S.addExploration(t, sid); });
  const states = S.recompute();
  const after = C.snapshotSkills(states, skills);
  const result = C.compare(before, after, skills);
  const best = R.deepestReturn(trails);
  S.finishSession(sid, { plan_key: "daily", focus_skill: best ? best.conclusion.return_to : null, suspected_root_causes: [] });
  S.addCompassCheck({ id: E.makeId("chk", S.now()), session_id: sid, date: new Date(S.now()).toISOString(), questions: check.questions.concat(asked), extra_count: asked.length,
    skills: skills.map((k) => E.SKILLS[k].label), skill_ids: skills, reasons: {}, before, after, comment: result.comment, plan_key: "daily", focus_skill: best ? best.conclusion.return_to : null,
    exploration_ids: trails.map((t) => t.id), skipped: [], kind, trail_best: best ? { return_to: best.conclusion.return_to, symptom_question: best.symptom.question_id, message: best.conclusion.message } : null });
  const info = { day: curDay, kind, unit: S.school().current_unit, questions: check.questions.length, extra: asked.length,
    trails: trails.map((t) => ({ symptom: t.symptom.skill, kind: t.conclusion && t.conclusion.kind, return_to: t.conclusion && t.conclusion.return_to, path: R.pathText(t),
      probes: t.path.length - 1, skipped_solid: (t.log || []).filter((x) => /記録|できている/.test(x) && /省略|確かめない|スキップ/.test(x)).length, target: t.geometry ? t.geometry.diagnostic_target : null })) };
  log.checks.push(info);
  info.trails.forEach((t) => log.trails.push(Object.assign({ day: curDay }, t)));
  return info;
}

// ---------- 学校の進度・テスト ----------
// 1〜5日 式の計算 / 6〜11日 連立方程式 / 12〜17日 一次関数 / 18〜23日 図形の角 / 24〜30日 合同と証明
const PLAN_UNITS = [["式の計算", 1, 5], ["連立方程式", 6, 11], ["一次関数", 12, 17], ["図形の角", 18, 23], ["合同と証明", 24, 99]];
const MINUTES = [30, 30, 20, 45, 30, 45, 20];
const T0 = S.now();
const TEST_DAY = 17; // 連立方程式・一次関数のテスト（17日目）。学校のようすで3日目に登録（2週間前）
function dateKeyOf(d) { const x = new Date(T0 + (d - 1) * DAY); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
function schoolOn(d) {
  const [unit, from, to] = PLAN_UNITS.find(([, a, b]) => d >= a && d <= b);
  const opts = E.schoolOptions(unit), len = (to === 99 ? Math.max(DAYS, 30) : to) - from + 1;
  const at = opts[Math.min(opts.length - 1, Math.floor(((d - from) / Math.max(1, len - 1)) * opts.length))];
  return { unit, at, first: d === from };
}
function testInput(now) {
  const nt = S.school().next_test;
  if (!nt || !nt.date) return null;
  const left = TP.daysLeft(nt.date, now);
  if (left < 0 || left > 21) return null;
  let range = [];
  nt.units.forEach((u) => (range = range.concat(TP.unitSkills(u))));
  const sch = TP.schedule({ test_date: nt.date, range_skills: range, source: "school" }, S.get().skill_state, now, { rangeCheckedToday: true });
  const day = sch.days[0];
  if (left < 1 || !day) return { left, none: true };
  return { left, input: { range, focus: day.skills, kind: day.kind, days_left: left } };
}

// ---------- 30日 ----------
let curDay = 0;
S.reset && S.reset();
const practiceSeen = {}; // スキル → もどって確認に出た日
for (let d = 1; d <= DAYS; d++) {
  curDay = d;
  if (d > 1) S.addDays(1);
  const sc = schoolOn(d);
  const nextTest = d >= 3 && d <= TEST_DAY ? { date: dateKeyOf(TEST_DAY), units: ["連立方程式", "一次関数"] } : d > TEST_DAY ? S.school().next_test : null;
  S.setSchool(sc.unit, sc.at, { nextTest });
  // 学校で習う：いま学習中のスキルは毎日少しできるようになる（宿題・授業）
  E.UNITS[sc.unit].forEach((k) => { if (E.schoolSkillStatus(k, S.school()) === "current") { p[k] = Math.min(0.96, p[k] + 0.015); pr[k] = Math.min(0.96, pr[k] + 0.01); } });
  const day = { day: d, unit: sc.unit, at: sc.at, minutes: MINUTES[(d - 1) % MINUTES.length] };
  // 単元がかわった日：はじめてのチェック。3日ごと：定期チェック（お知らせが出ていれば）
  if (sc.first) {
    // ホームの案内（js/app.js unitCheckNoticeInfo と同じ条件）。修正前のアプリには案内がない
    day.unitNotice = !!S.unitCheckDone && S.get().answer_history.length > 0 && !S.unitCheckDone(sc.unit);
    const uc = C.unitCheck(sc.unit, S.school());
    day.unitCheckQ = uc.questions.length;
    day.unitCheckSkills = new Set(uc.chosen.map((c) => c.skill)).size;
    day.check = runCheck(uc, "unit_check");
    day.unitNoticeAfter = !!S.unitCheckDone && !S.unitCheckDone(sc.unit); // チェックのあとも案内が残るか（残ってはいけない）
  }
  else if (d % 3 === 0) {
    const chk = C.buildCheck({ states: S.get().skill_state, history: S.get().answer_history, sessions: S.get().sessions, explorations: S.get().explorations, now: S.now(), school: S.school(), rng: SC.bank.seeded(d) });
    if (chk.chosen.length) day.check = runCheck(chk, "periodic");
    day.check_shortage = (chk.shortage || []).filter((x) => x.result !== "reused" || x.stage >= 2).map((x) => x.skill + "/" + x.level + "→" + x.result);
  }
  // 今日の学習
  S.setSettings && S.setSettings({ minutes: day.minutes });
  const ti = testInput(S.now());
  const input = { states: S.get().skill_state, history: S.get().answer_history, explorations: S.get().explorations, school: S.schoolProgressInfo(), minutes: day.minutes, goal: "daily_learning", now: S.now(), rng: SC.bank.seeded(100 + d) };
  if (ti && ti.input) input.test = ti.input;
  day.test_left = ti ? ti.left : null;
  const plan = P.build(input);
  S.addPlan(plan);
  day.reasonCand = plan.debug && plan.debug.alloc && plan.debug.alloc.candidates ? plan.debug.alloc.candidates.reason : null;
  // 理由の確認に時間を配ったか（配ったのに問題がなくて出せなかった＝問題不足、配らなかった＝時間の都合）
  day.reasonBlock = !!(plan.debug && plan.debug.alloc && (plan.debug.alloc.blocks || []).some((b) => b.id === "reason" && b.minutes > 0));
  day.plan = plan.sessions.map((s) => ({ label: s.type_label, purposes: s.purposes || [s.kind === "reason_review" ? "reason_review" : s.type], type: s.type, display: s.display || s.type, school: E.schoolSkillStatus(s.skill, S.school()), kind: s.kind || null, skill: s.skill, unit: E.SKILLS[s.skill].unit, minutes: s.minutes, level: s.level, q: s.questions.length,
    reused: s.picks.filter((x) => x.reused).length, relaxed: s.picks.filter((x) => x.stage >= 2).length }));
  day.why = plan.why;
  day.focus = plan.focus_skill;
  day.alloc = plan.debug && plan.debug.alloc ? { severity: plan.debug.alloc.severity && plan.debug.alloc.severity.level, test: plan.debug.alloc.test ? plan.debug.alloc.test.stage : null } : null;
  // 学習する（パートごとに記録・練習したスキルは伸びる）
  const lsid = S.startSession("daily", sc.unit);
  plan.sessions.forEach((s) => {
    const context = s.type === "check" || s.level === "retention" ? "daily_check" : "lesson";
    s.questions.forEach((id) => {
      const a = answer(id, { sessionId: lsid, context });
      const q = Q[id];
      (q.type === "steps" ? q.steps : [q]).forEach((st) => practice(st.skill || q.skill, st.aspect || q.aspect, s.type === "practice" || s.kind === "reason_review" ? 1.2 : 0.8));
    });
    if (s.type === "practice") (practiceSeen[s.skill] = practiceSeen[s.skill] || []).push(d);
  });
  S.finishSession(lsid, { plan_key: "daily", focus_skill: plan.focus_skill, suspected_root_causes: [] });
  // その日の終わりの状態
  const st = S.recompute();
  day.weak = Object.keys(st).filter((k) => st[k].learning_status === "needs_review" || st[k].learning_status === "learning");
  day.notLearnedWeak = Object.keys(st).filter((k) => E.schoolSkillStatus(k, S.school()) === "not_learned" && (st[k].learning_status === "needs_review" || st[k].learning_status === "learning"));
  day.status = Object.fromEntries(Object.keys(st).filter((k) => st[k].attempt_count || (st[k].reason && st[k].reason.attempts)).map((k) => [k, st[k].learning_status + (st[k].reason && st[k].reason.attempts ? "/" + st[k].reason.status : "")]));
  log.days.push(day);
}

// ---------- 集計 ----------
const lab = (k) => (E.SKILLS[k] ? E.SKILLS[k].label : k);
const out = [];
const line = (s) => out.push(s);
line("=== 1日ごと ===");
log.days.forEach((d) => {
  const parts = d.plan.map((s) => s.minutes + "分 " + (s.kind === "reason_review" ? "理由" : s.kind === "proof_root_review" || s.kind === "geometry_root_review" || s.type === "practice" ? "戻る" : P.TYPE_LABEL[s.type] || s.type) + ":" + lab(s.skill) + (s.type === "review" && s.level === "retention" ? "(定着)" : "") + (s.reused ? "[再" + s.reused + "]" : ""));
  line(String(d.day).padStart(2) + "日 " + d.minutes + "分 学校=" + d.unit + "・" + lab(d.at) + (d.test_left != null ? " テストまで" + d.test_left + "日" : "") +
    (d.check ? " ｜チェック(" + d.check.kind + ")" + d.check.questions + "+" + d.check.extra + "問" + d.check.trails.map((t) => " [" + lab(t.symptom) + "→" + (t.return_to ? lab(t.return_to) : t.kind) + "]").join("") : "") +
    "\n     " + parts.join(" / "));
});
// 1. 原因
line("\n=== 原因さがし（" + log.trails.length + "本）===");
log.trails.forEach((t) => line(String(t.day).padStart(2) + "日 " + t.path + "  → " + t.kind + (t.return_to ? "：" + lab(t.return_to) : "") + "（追加" + t.probes + "）"));
const probeCounts = log.checks.map((c) => c.extra);
line("チェックごとの追加問題数：" + probeCounts.join(",") + "（上限：はじめて4・定期2）");
// 2. 克服：もどって確認に出たが、最後の5日間は出ていないスキル
line("\n=== もどって確認に出たスキル ===");
Object.keys(practiceSeen).forEach((k) => {
  const ds = practiceSeen[k], last = ds[ds.length - 1], fin = log.days[log.days.length - 1].status[k] || "-";
  line(lab(k).padEnd(14, "　") + " " + ds.join(",") + (DAYS - last >= 5 ? "  → 卒業（最後 " + last + "日）" : "  → まだ候補") + "  最終：" + fin);
});
// 3. 単元をまたいだ再利用
line("\n=== 単元をまたいだ戻る勉強 ===");
log.days.forEach((d) => d.plan.filter((s) => s.type === "practice" && s.unit !== d.unit).forEach((s) => line(String(d.day).padStart(2) + "日 学校=" + d.unit + " ← " + lab(s.skill) + "（" + s.unit + "）" + (s.kind ? " " + s.kind : ""))));
// 4. 偏り
line("\n=== 今日の学習の配分（分数ごと） ===");
[20, 30, 45].forEach((m) => {
  const ds = log.days.filter((d) => d.minutes === m);
  const sum = {};
  ds.forEach((d) => d.plan.forEach((s) => { const k = s.kind === "reason_review" ? "理由を確認" : s.type === "practice" ? "もどって確認" : s.type === "current_unit" ? "学校の学習" : s.type === "test" ? "テスト範囲" : s.type === "review" && s.level === "retention" ? "定着チェック" : s.type === "preview" ? "先取り" : P.TYPE_LABEL[s.type]; sum[k] = (sum[k] || 0) + s.minutes; }));
  line(m + "分の日（" + ds.length + "日）：" + Object.keys(sum).map((k) => k + " " + Math.round(sum[k] / ds.length * 10) / 10 + "分").join("・"));
});
const noSchool = log.days.filter((d) => d.plan.some((s) => s.display === "practice") && !d.plan.some((s) => s.display === "current_unit" || s.type === "test" || (s.type === "challenge" && E.UNITS[d.unit].includes(s.skill))));
line("もどって確認があって、学校の単元に0分の日：" + (noSchool.map((d) => d.day + "日").join(",") || "なし"));
const rootHeavy = log.days.filter((d) => { const r = d.plan.filter((s) => s.type === "practice").reduce((a, s) => a + s.minutes, 0); return r > d.minutes / 2; });
line("もどって確認が半分を超えた日：" + (rootHeavy.map((d) => d.day + "日").join(",") || "なし"));
// 5. 未学習 ≠ 苦手
line("\n未学習なのに要確認・学習中になったスキル（日ごと）：" + (log.days.filter((d) => d.notLearnedWeak.length).map((d) => d.day + "日:" + d.notLearnedWeak.map(lab).join("・")).join(" ") || "なし"));
// 6. reason
line("理由を確認の日：" + log.days.filter((d) => d.plan.some((s) => s.kind === "reason_review")).map((d) => d.day + "日(" + d.plan.filter((s) => s.kind === "reason_review").map((s) => lab(s.skill)).join("・") + ")").join(" "));
// 7. テスト
line("\n=== テスト（" + TEST_DAY + "日目：連立方程式・一次関数） ===");
log.days.filter((d) => d.day <= TEST_DAY + 3).forEach((d) => {
  const range = TP.unitSkills("連立方程式").concat(TP.unitSkills("一次関数"));
  const inR = d.plan.filter((s) => range.includes(s.skill)).reduce((a, s) => a + s.minutes, 0);
  const root = d.plan.filter((s) => s.type === "practice").reduce((a, s) => a + s.minutes, 0);
  line(String(d.day).padStart(2) + "日 " + (d.test_left != null ? "あと" + d.test_left + "日 " : "（テストなし） ") + "範囲 " + inR + "/" + d.minutes + "分（" + Math.round(inR / d.minutes * 100) + "%）・戻る " + root + "分" + (d.plan.some((s) => s.type === "test") ? "・test枠あり" : ""));
});
// 8. 問題不足
const reusedParts = log.days.flatMap((d) => d.plan.filter((s) => s.relaxed).map((s) => d.day + "日 " + lab(s.skill) + "/" + s.level + "×" + s.relaxed));
line("\n問題不足（最近の問題まで再利用した出題）：" + (reusedParts.join("、") || "なし"));
line("チェックの不足：" + (log.days.filter((d) => d.check_shortage && d.check_shortage.length).map((d) => d.day + "日 " + d.check_shortage.join("・")).join(" ") || "なし"));
// 9. 最終状態
const fin = log.days[log.days.length - 1].status;
line("\n=== 30日後の状態 ===");
Object.keys(fin).forEach((k) => line(lab(k).padEnd(14, "　") + " " + fin[k]));
if (!process.env.METRICS) console.log(out.join("\n"));
// ---------- 比較用の集計 ----------
if (process.env.METRICS) {
  const st = S.get().skill_state;
  const prDays = Object.values(practiceSeen);
  const share = (left) => { const d = log.days.find((x) => x.test_left === left); if (!d) return null; const range = TP.unitSkills("連立方程式").concat(TP.unitSkills("一次関数")); return Math.round(d.plan.filter((s) => range.includes(s.skill)).reduce((a, s) => a + s.minutes, 0) / d.minutes * 100); };
  // 原因さがしの戻る場所が、その日か次の日の「もどって確認」に入ったか
  const found = log.trails.filter((t) => t.return_to && t.kind !== "value_slip");
  const used = found.filter((t) => log.days.filter((d) => d.day === t.day || d.day === t.day + 1).some((d) => d.plan.some((s) => ["practice", "current_unit", "test"].includes(s.type) && s.skill === t.return_to)));
  const learnedNever = Object.keys(E.SKILLS).filter((k) => E.SELECTABLE_UNITS.includes(E.SKILLS[k].unit) && E.schoolSkillStatus(k, S.school()) !== "not_learned" && !(st[k].attempt_count || (st[k].reason && st[k].reason.attempts)));
  console.log("METRICS " + JSON.stringify({
    school0: noSchool.length, rootHalf: rootHeavy.length, notLearnedWeakDays: log.days.filter((d) => d.notLearnedWeak.length).length,
    reasonDays: log.days.filter((d) => d.plan.some((s) => s.kind === "reason_review")).length,
    retentionParts: log.days.reduce((a, d) => a + d.plan.filter((s) => s.level === "retention").length, 0),
    test: { w2: share(14), w1: share(7), d3: share(3), d1: share(1), after: log.days.filter((d) => d.day > TEST_DAY && d.plan.some((s) => s.type === "test")).length },
    checks: log.checks.length, extras: log.checks.reduce((a, c) => a + c.extra, 0), extraMax: Math.max(...log.checks.map((c) => c.extra)),
    sessionsAll: S.finishedSessions().length, sessionsChecks: S.finishedChecks ? S.finishedChecks().length : null,
    trails: log.trails.length, rootFound: found.length, rootUsed: used.length,
    practiceSkills: prDays.length, graduated: prDays.filter((ds) => DAYS - ds[ds.length - 1] >= 5).length, maxPracticeDays: Math.max(0, ...prDays.map((ds) => ds.length)),
    repeat4: Object.keys(practiceSeen).filter((k) => practiceSeen[k].length >= 4).map(lab),
    finalWeak: Object.keys(st).filter((k) => ["needs_review", "learning"].includes(st[k].learning_status)).length,
    learnedNever: learnedNever.map(lab), formMeasured: !!st.form.attempt_count,
    unitChecks: log.days.filter((d) => d.unitCheckQ != null).map((d) => d.unit + ":" + d.unitCheckQ + "問/" + d.unitCheckSkills + "スキル"),
    unitNotice: log.days.filter((d) => d.unitCheckQ != null).map((d) => d.unit + ":" + (d.unitNotice ? "案内" : "なし") + (d.unitNoticeAfter ? "（チェック後も残る）" : "")),
    // 「もどって確認」と表示された部分のうち、学校でいま学習中のスキルだった数（0にしたい）
    backButCurrent: log.days.reduce((a, d) => a + d.plan.filter((p) => p.display === "practice" && p.school === "current").length, 0),
    backParts: log.days.reduce((a, d) => a + d.plan.filter((p) => p.display === "practice").length, 0),
    practiceParts: log.days.reduce((a, d) => a + d.plan.filter((p) => p.type === "practice").length, 0),
    schoolMinutes: log.days.reduce((a, d) => a + d.plan.filter((p) => p.display === "current_unit" || p.type === "test").reduce((x, p) => x + p.minutes, 0), 0),
    parts20: (() => { const ds = log.days.filter((d) => d.minutes === 20); return Math.round(ds.reduce((a, d) => a + d.plan.length, 0) / ds.length * 100) / 100; })(),
    parts20max: Math.max(...log.days.filter((d) => d.minutes === 20).map((d) => d.plan.length)),
    reasonCandDays: log.days.filter((d) => d.reasonCand).length,
    reasonLost: log.days.filter((d) => d.reasonCand && !d.plan.some((p) => p.purposes.includes("reason_review"))).length,
    reasonLost20: log.days.filter((d) => d.minutes === 20 && d.reasonCand && !d.plan.some((p) => p.purposes.includes("reason_review"))).length,
    reasonLostTime: log.days.filter((d) => d.reasonCand && !d.reasonBlock && !d.plan.some((p) => p.purposes.includes("reason_review"))).length,
    reasonLostBank: log.days.filter((d) => d.reasonCand && d.reasonBlock && !d.plan.some((p) => p.purposes.includes("reason_review"))).length,
    reasonLostTime20: log.days.filter((d) => d.minutes === 20 && d.reasonCand && !d.reasonBlock && !d.plan.some((p) => p.purposes.includes("reason_review"))).length,
    reasonMerged: log.days.filter((d) => d.plan.some((p) => p.type !== "reason_review" && p.purposes.includes("reason_review"))).length,
    dupDays: log.days.filter((d) => { const ks = d.plan.filter((p) => p.type !== "check").map((p) => p.skill); return new Set(ks).size < ks.length; }).length,
    nearTestLabels: (() => { const out = {}; const range = TP.unitSkills("連立方程式").concat(TP.unitSkills("一次関数")); log.days.filter((d) => d.test_left != null && d.test_left >= 1 && d.test_left <= 3).forEach((d) => d.plan.filter((p) => range.includes(p.skill)).forEach((p) => { out[p.label] = (out[p.label] || 0) + 1; })); return out; })(),
    backMinutes: log.days.reduce((a, d) => a + d.plan.filter((p) => p.display === "practice").reduce((x, p) => x + p.minutes, 0), 0)
  }));
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ store: S.get(), log }, null, 0));
