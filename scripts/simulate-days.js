// 開発用：毎日「今日の学習」を続けたときに、問題の再利用・不足がいつ起きるかを調べる
//   node scripts/simulate-days.js [日数] [分] [単元：一次関数 | 連立方程式 | 式の計算] [原因のスキル（省略可）]
// 想定（式の計算）：かっこの前が − の符号でまちがえ、原因が「多項式の加法・減法」。かっこを含む式・等式の変形もまだ不安定。
// 原因のスキルを指定すると、そのスキルを「まだできない」にして、原因さがしの戻る場所にする（例：連立方程式 polyAddSub）
// 想定（一次関数）：最初のチェックで「変化量・変化の割合・グラフ式」がまだ不安定な子ども。
// 想定（連立方程式）：加減法でまちがえ、原因が「移項」。代入法・文章題・小数分数もまだ不安定な子ども。
// 想定（図形の角）：平行線と角でまちがえ、原因が「同位角・錯角」（図形の性質側）。原因に transpose を指定すると、角度を式で表す問題の計算側でつまずく子ども。
// 3日ごとに定期コンパスチェックも行い、チェックの問題不足（緩和・再利用・出題できず）も数える。
//       練習したスキルは、その日のうちにできるようになっていく（知っているスキルは正解する）。
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, P = SC.planner;
const DAYS = Number(process.argv[2] || 10), MIN = Number(process.argv[3] || 30);
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;
const UNIT = process.argv[4] || "一次関数";
const SCHOOL = { grade: "中2", subject: "数学", current_unit: UNIT, school_status: "learning" };

const history = [];
let n = 0;
const knows = UNIT === "不定詞"
  ? { ftGoing: true, gvSent: true, psIrr: true, nnSome: true, psQues: true, beSubject: true, inNoun: true, inAdv: true, inAdj: true, inWhy: false, inIt: false }
  : UNIT === "助動詞"
  ? { cnForm: true, ftWill: true, tsForm: true, imNeg: true, cnReq: true, mdMust: true, mdHave: true, mdNeg: true, mdMay: false, mdQues: false }
  : UNIT === "未来形"
  ? { cnForm: true, gvSent: true, cnQues: true, beForm: true, beQues: true, qwWhere: true, ftWill: true, ftWillNQ: true, ftGoing: true, ftGoingNQ: false, ftWhat: false }
  : UNIT === "過去形"
  ? { gvSent: true, tsSpell: true, gvNeg: true, gvWhat: true, beQues: true, psReg: true, psIrr: true, psNeg: true, psQues: false, psBe: false }
  : UNIT === "現在進行形"
  ? { beForm: true, gvSent: true, tsSpell: true, beNeg: true, beQues: true, qwWhere: true, pgForm: true, pgSpell: true, pgNeg: true, pgQues: false, pgWhat: false }
  : UNIT === "疑問詞"
  ? { beWh: true, gvWhat: true, tsWhat: true, nnThese: true, nnMany: true, beSubject: true, qwWhere: true, qwWhen: true, qwWhich: true, qwWhose: false, qwHow: false }
  : UNIT === "can"
  ? { gvSent: true, tsForm: true, gvNeg: true, gvQues: true, gvWhat: true, imPlease: true, cnForm: true, cnNeg: true, cnQues: true, cnWhat: false, cnReq: false }
  : UNIT === "命令文"
  ? { gvSent: true, beForm: true, gvNeg: true, imForm: true, imBe: true, imNeg: true, imLet: false, imPlease: false }
  : UNIT === "名詞の複数形"
  ? { beForm: true, beQues: true, gvNeg: true, gvQues: true, tsSpell: true, tsQues: true, nnArticle: true, nnPlural: true, nnThese: true, nnSome: false, nnMany: false }
  : UNIT === "3人称単数現在"
  ? { beSubject: true, gvSent: true, gvNeg: true, gvQues: true, gvWhat: true, tsForm: true, tsSpell: true, tsNeg: true, tsQues: false, tsWhat: false }
  : UNIT === "一般動詞"
  ? { beSubject: true, beForm: true, beNeg: true, beQues: true, beWh: true, gvKind: true, gvSent: true, gvNeg: true, gvQues: false, gvWhat: false }
  : UNIT === "be動詞"
  ? { beSubject: true, beForm: true, beNeg: true, beQues: false, beWh: false }
  : UNIT === "標本調査"
  ? { dsFreq: true, dsRel: true, dsRep: true, probMeaning: true, eqWord: true, suMeaning: true, suRandom: true, suRatio: false, suCount: false, suMean: false }
  : UNIT === "三平方の定理"
  ? { sqMeaning: true, sqMulDiv: true, angleBasics: true, coord: true, spVolume: true, ptBasic: true, ptConverse: true, ptSpecial: false, ptPlane: false, ptSolid: false }
  : UNIT === "円"
  ? { plCircle: true, isoProps: true, triangleSum: true, smCond: true, ciCentral: true, ciSameArc: false, ciSemicircle: true, ciConverse: false, ciSimilar: false }
  : UNIT === "相似"
  ? { congCorr: true, congCond: true, proportion: true, parallelAngles: true, spVolume: true, smMeaning: true, smCond: true, smParallel: false, smMidpoint: false, smAreaVol: false }
  : UNIT === "関数 y＝ax²"
  ? { prDirect: true, prGraph: true, negPower: true, rate: true, slopeIntercept: true, qfMeaning: true, qfGraph: true, qfRange: false, qfRate: false, qfUse: false }
  : UNIT === "二次方程式"
  ? { eqMeaning: true, eqWord: true, pxExpand: true, pxFactor: true, sqMeaning: true, sqAddSub: true, qeMeaning: true, qeSqrt: true, qeFactor: false, qeFormula: false, qeWord: false }
  : UNIT === "平方根"
  ? { negPower: true, pxExpand: true, pxFormula: true, sqMeaning: true, sqCompare: false, sqMulDiv: true, sqAddSub: false, sqUse: false }
  : UNIT === "多項式"
  ? { polyAddSub: true, polyMixed: true, monoMulDiv: true, distrib: true, pxExpand: true, pxFormula: false, pxCommon: true, pxFactor: false, pxUse: false }
  : UNIT === "データの分布"
  ? { dsFreq: true, dsRel: false, dsHist: true, dsRep: true, dsProb: false }
  : UNIT === "空間図形"
  ? { plLine: true, plCircle: true, plSector: false, spSolid: true, spPosition: true, spNet: false, spArea: false, spVolume: false }
  : UNIT === "平面図形"
  ? { angleBasics: true, coord: true, litExpr: true, plLine: true, plMove: true, plConstruct: false, plCircle: false, plSector: false }
  : UNIT === "比例と反比例"
  ? { negMulDiv: true, litWord: true, litValue: true, proportion: true, coord: true, prFunc: true, prDirect: true, prGraph: false, prInverse: false, prUse: false }
  : UNIT === "文字と式"
  ? { negMeaning: true, negAddSub: true, negMulDiv: true, negPower: true, negUse: true, litExpr: true, litValue: false, litCalc: false, litWord: false, litRel: false }
  : UNIT === "正負の数"
  ? { negMeaning: true, negAddSub: false, negMulDiv: false, negPower: false, negUse: false }
  : UNIT === "一次方程式"
  ? { signed: true, algebra: true, likeTerms: true, distrib: true, eqMeaning: true, eqProperty: true, transpose: false, eqParen: false, eqFraction: false, eqWord: false }
  : UNIT === "三角形と四角形"
  ? { angleBasics: true, lineAngles: true, angleNames: true, parallelAngles: true, triangleSum: true, congCorr: true, congCond: true, isoProps: true, isoCond: false, rightCong: false, paraProps: false, paraCond: false, specialQuad: false, areaEq: false }
  : UNIT === "データの活用"
  ? { dataMedian: true, dataQuartile: false, dataIqr: false, dataBoxRead: true, dataBoxMake: false, dataCompare: false }
  : UNIT === "確率"
  ? { probMeaning: true, probCount: true, probBasic: false, probTwo: false, probDraw: false, probNot: false }
  : UNIT === "合同と証明"
  ? { signed: true, algebra: true, likeTerms: true, distrib: true, eqProperty: true, transpose: true, eqParen: true, angleBasics: true, lineAngles: true, angleNames: true, parallelAngles: true, triangleSum: true,
      proofHypConc: true, congCorr: false, congCond: false, proofFigureFacts: false, congUse: false, proofBuild: false }
  : UNIT === "図形の角"
  ? { signed: true, algebra: true, likeTerms: true, distrib: true, eqProperty: true, transpose: true, eqParen: true, angleBasics: true, lineAngles: true, triangleSum: true,
      angleNames: false, parallelAngles: false, exteriorAngle: false, angleEq: false, angleCombo: false, polygonInterior: false, polygonExterior: false }
  : UNIT === "連立方程式"
  ? { signed: true, algebra: true, likeTerms: true, polyAddSub: true, polyMixed: true, distrib: true, eqMeaning: true, eqProperty: true, simMeaning: true, simCoef: true, transpose: false, eqParen: false, eqFraction: true, simElim: false, simSubst: false, simParen: false, simFraction: false, simWord: false }
  : UNIT === "式の計算"
  ? { signed: true, algebra: true, likeTerms: true, distrib: true, eqProperty: true, transpose: true, monoMulDiv: true, polyAddSub: false, polyMixed: false, eqTransform: false }
  : { coord: true, proportion: true, substitution: true, algebra: true, signed: true, slopeIntercept: true, change: false, rate: false, form: false };
function answer(qid, at, context) {
  const q = Q[qid];
  const rec = (qq, id, skill) => history.push(E.makeAnswerRecord({ ...qq, id, skill }, { status: knows[skill] ? "correct" : "incorrect" }, { userId: "u", sessionId: "d", context, now: at + (++n) * 1000 }));
  if (q.type === "steps") q.steps.forEach((s) => rec({ level: q.level, unit: q.unit, aspect: s.aspect }, qid + "#" + s.id, s.skill));
  else rec(q, qid, q.skill);
}
const CAUSE = process.argv[5] || null;
if (CAUSE) { knows[CAUSE] = false; if (UNIT === "合同と証明" && CAUSE !== "congCorr") knows.congCorr = true; if (UNIT === "図形の角" && CAUSE !== "angleNames") knows.angleNames = true; if (CAUSE !== "transpose" && UNIT === "連立方程式") knows.transpose = true; }
const FIRST = UNIT === "不定詞" || UNIT === "助動詞" || UNIT === "未来形" || UNIT === "過去形" || UNIT === "現在進行形" || UNIT === "疑問詞" || UNIT === "can" || UNIT === "命令文" || UNIT === "名詞の複数形" || UNIT === "3人称単数現在" || UNIT === "一般動詞" || UNIT === "be動詞" || UNIT === "標本調査" || UNIT === "三平方の定理" || UNIT === "円" || UNIT === "相似" || UNIT === "関数 y＝ax²" || UNIT === "二次方程式" || UNIT === "平方根" || UNIT === "多項式" || UNIT === "データの分布" || UNIT === "空間図形" || UNIT === "平面図形" || UNIT === "比例と反比例" || UNIT === "文字と式" || UNIT === "正負の数" || UNIT === "一次方程式" || UNIT === "三角形と四角形" || UNIT === "確率" || UNIT === "データの活用" ? SC.compass.unitCheck(UNIT).questions
  : UNIT === "合同と証明" ? SC.compass.unitCheck(UNIT).questions.concat(["angleBasics-basic-1"])
  : UNIT === "図形の角" ? SC.compass.unitCheck(UNIT).questions.concat(["angleBasics-basic-1", "transpose-basic-2"])
  : UNIT === "式の計算" ? SC.compass.unitCheck(UNIT).questions.concat(["likeTerms-basic-2", "signed-basic-2"])
  : UNIT === "連立方程式" ? SC.compass.unitCheck(UNIT).questions.concat(["simCoef-basic-2", "transpose-basic-2", "signed-basic-2", "algebra-basic-1"]) : ["B1", "B2", "B3", "B4", "B5", "C4", "C5"];
FIRST.forEach((id) => answer(id, T0, "compass_check"));
// 想定（合同と証明）：合同条件でまちがえ、原因が「対応する辺・角」。原因に parallelAngles（図形①）を指定すると、図から使える事実（錯角）でつまずく子ども。
//                      proofHypConc を指定すると、証明の組み立てで仮定と結論を取り違える子ども
const PROOF_SYMPTOM = { congCorr: "congCond", parallelAngles: "proofFigureFacts", proofHypConc: "proofBuild" };
const explorations = UNIT === "不定詞"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "inWhy", label: E.SKILLS.inWhy.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "inAdv" } }]
  : UNIT === "助動詞"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "mdQues", label: E.SKILLS.mdQues.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "mdNeg" } }]
  : UNIT === "未来形"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "ftWhat", label: E.SKILLS.ftWhat.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "ftGoingNQ" } }]
  : UNIT === "過去形"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "psBe", label: E.SKILLS.psBe.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "psQues" } }]
  : UNIT === "現在進行形"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "pgWhat", label: E.SKILLS.pgWhat.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "pgQues" } }]
  : UNIT === "疑問詞"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "qwHow", label: E.SKILLS.qwHow.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "qwWhen" } }]
  : UNIT === "can"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "cnWhat", label: E.SKILLS.cnWhat.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "cnQues" } }]
  : UNIT === "命令文"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "imPlease", label: E.SKILLS.imPlease.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "imNeg" } }]
  : UNIT === "名詞の複数形"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "nnMany", label: E.SKILLS.nnMany.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "nnSome" } }]
  : UNIT === "3人称単数現在"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "tsWhat", label: E.SKILLS.tsWhat.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "tsQues" } }]
  : UNIT === "一般動詞"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "gvWhat", label: E.SKILLS.gvWhat.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "gvQues" } }]
  : UNIT === "be動詞"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "beWh", label: E.SKILLS.beWh.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "beQues" } }]
  : UNIT === "標本調査"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "suCount", label: E.SKILLS.suCount.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "suRatio" } }]
  : UNIT === "三平方の定理"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "ptSpecial", label: E.SKILLS.ptSpecial.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "ptBasic" } }]
  : UNIT === "円"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "ciSameArc", label: E.SKILLS.ciSameArc.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "ciCentral" } }]
  : UNIT === "相似"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "smParallel", label: E.SKILLS.smParallel.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "smMeaning" } }]
  : UNIT === "関数 y＝ax²"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "qfRange", label: E.SKILLS.qfRange.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "qfGraph" } }]
  : UNIT === "二次方程式"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "qeWord", label: E.SKILLS.qeWord.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "qeFactor" } }]
  : UNIT === "平方根"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "sqAddSub", label: E.SKILLS.sqAddSub.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "sqMulDiv" } }]
  : UNIT === "多項式"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "pxFactor", label: E.SKILLS.pxFactor.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "pxFormula" } }]
  : UNIT === "データの分布"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "dsProb", label: E.SKILLS.dsProb.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "dsRel" } }]
  : UNIT === "空間図形"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "spArea", label: E.SKILLS.spArea.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "spNet" } }]
  : UNIT === "平面図形"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "plSector", label: E.SKILLS.plSector.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "plCircle" } }]
  : UNIT === "比例と反比例"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "prInverse", label: E.SKILLS.prInverse.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "prDirect" } }]
  : UNIT === "文字と式"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "litCalc", label: E.SKILLS.litCalc.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "litExpr" } }]
  : UNIT === "正負の数"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "negPower", label: E.SKILLS.negPower.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "negMulDiv" } }]
  : UNIT === "一次方程式"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "eqParen", label: E.SKILLS.eqParen.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "transpose" } }]
  : UNIT === "三角形と四角形"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "paraCond", label: E.SKILLS.paraCond.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "paraProps" } }]
  : UNIT === "データの活用"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "dataIqr", label: E.SKILLS.dataIqr.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "dataQuartile" } }]
  : UNIT === "確率"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "probTwo", label: E.SKILLS.probTwo.label }, conclusion: { kind: "gap_found", return_to: CAUSE || "probBasic" } }]
  : UNIT === "合同と証明"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: PROOF_SYMPTOM[CAUSE || "congCorr"], label: E.SKILLS[PROOF_SYMPTOM[CAUSE || "congCorr"]].label }, conclusion: { kind: "gap_found", return_to: CAUSE || "congCorr" } }]
  : UNIT === "図形の角"
  ? [{ date: new Date(T0).toISOString(), symptom: CAUSE === "transpose" ? { skill: "angleEq", label: "角度を式で表す" } : { skill: "parallelAngles", label: "平行線と角" }, conclusion: { kind: "gap_found", return_to: CAUSE || "angleNames" } }]
  : UNIT === "式の計算"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "polyMixed", label: "かっこを含む式の計算" }, conclusion: { kind: "gap_found", return_to: CAUSE || "polyAddSub" } }]
  : UNIT === "連立方程式"
  ? [{ date: new Date(T0).toISOString(), symptom: { skill: "simElim", label: "加減法" }, conclusion: { kind: "gap_found", return_to: CAUSE || "transpose" } }]
  : [{ date: new Date(T0).toISOString(), symptom: { skill: "rate", label: "変化の割合" }, conclusion: { kind: "gap_found", return_to: "change" } }];
const sessions = [];
let chkQ = 0, chkRelax = 0, chkReuse = 0, chkSkip = 0;
// JSON=1 のとき、scripts/audit-bank.js 用に、問題ごとの出題・再利用（前回から何日あいたか）を記録する
const audit = { picks: [], checks: [] };
function lastSeen(qid, now) {
  let t = null;
  history.forEach((a) => { if (String(a.question_id).split("#")[0] === qid && Date.parse(a.answered_at) < now) t = Math.max(t || 0, Date.parse(a.answered_at)); });
  return t;
}

console.log(`日数 ${DAYS} ／ ${MIN}分 ／ 単元 ${UNIT} ／ 問題数 ${SC.bank.ids.length + 12}`);
let totalQ = 0, totalReuse = 0, totalRelax = 0, fallbacks = 0, firstReuseDay = null;
for (let d = 1; d <= DAYS; d++) {
  const now = T0 + d * DAY;
  if (d % 3 === 0) {
    // 定期コンパスチェック（朝）
    const st = E.computeSkillStates(history, { now: now - 3600e3 });
    const chk = SC.compass.buildCheck({ states: st, history, sessions, explorations, now: now - 3600e3, rng: SC.bank.seeded(100 + d) });
    chk.questions.forEach((id) => answer(id, now - 3600e3, "compass_check"));
    sessions.push({ id: "chk" + d, finished_at: new Date(now - 3000e3).toISOString(), question_ids: chk.questions.slice() });
    chkQ += chk.questions.length;
    chk.shortage.forEach((x) => { if (x.result === "reused") chkReuse++; else if (x.result === "relaxed") chkRelax++; else chkSkip++; });
    chk.shortage.forEach((x) => audit.checks.push({ day: d, skill: x.skill, level: x.level, result: x.result, stage: x.stage || null, question_id: x.question_id || null }));
    console.log(`${String(d).padStart(2)}日目 チェック：` + chk.chosen.map((c) => c.label + "(" + c.level + ")").join("・") +
      (chk.shortage.length ? "  不足：" + chk.shortage.map((x) => x.label + "/" + x.level + "→" + x.result + (x.question_id ? " " + x.question_id : "")).join("、") : ""));
  }
  // TEST_IN=日数 なら、その日数後にテスト（範囲＝いまの単元）。毎日、残り日数が減っていく
  const testLeft = process.env.TEST_IN ? Number(process.env.TEST_IN) - d : null;
  const testIn = testLeft !== null && testLeft >= 1 ? { range: E.UNITS[UNIT], focus: [], kind: "focus", days_left: testLeft } : undefined;
  const plan = P.build({ states: E.computeSkillStates(history, { now }), history, explorations, school: SCHOOL, minutes: MIN, goal: "daily_learning", now, rng: SC.bank.seeded(d), test: testIn });
  if (!plan.sessions.length) { fallbacks++; audit.fallbacks = (audit.fallbacks || 0) + 1; console.log(`${d}日目：fallback`); continue; }
  const picks = plan.sessions.flatMap((s) => s.picks.map((p) => ({ ...p, type: s.type, skill: s.skill })));
  picks.forEach((p) => {
    const seen = p.reused ? lastSeen(p.question_id, now) : null;
    audit.picks.push({ day: d, skill: Q[p.question_id].skill, level: p.level, question_id: p.question_id, stage: p.stage, reused: p.reused, type: p.type, qtype: Q[p.question_id].type,
      gap_days: seen === null ? null : Math.round(((now - seen) / DAY) * 10) / 10, why: p.why || "" });
  });
  const reuse = picks.filter((p) => p.reused).length, relax = picks.filter((p) => p.stage > 0 && !p.reused).length;
  totalQ += picks.length; totalReuse += reuse; totalRelax += relax;
  if (reuse && firstReuseDay === null) firstReuseDay = d;
  console.log(`${String(d).padStart(2)}日目：` + plan.sessions.map((s) => `${s.type}:${s.skill_label}(${s.level_label})${s.questions.length}問`).join(" / ") +
    `  → 再利用 ${reuse}・緩和 ${relax}` + (reuse ? "  [" + picks.filter((p) => p.reused).map((p) => p.question_id).join(",") + "]" : ""));
  // 学習する（練習したスキルは、その日の終わりにはできるようになる）
  plan.sessions.forEach((s) => s.questions.forEach((id) => answer(id, now + 3600e3, s.type === "check" || s.level === "retention" ? "daily_check" : "lesson")));
  // LEARN_ALL=1 なら、学校の単元の練習でもできるようになる（ふだんは、つまずき補強で練習したスキルだけ）
  plan.sessions.filter((s) => s.type === "practice" || (process.env.LEARN_ALL && s.type === "current_unit")).forEach((s) => (knows[s.skill] = true));
}
console.log(`今日の学習：合計 ${totalQ}問中 再利用 ${totalReuse}（${Math.round((totalReuse / totalQ) * 100)}%）・緩和 ${totalRelax}・fallback ${fallbacks}・最初の再利用 ${firstReuseDay ? firstReuseDay + "日目" : "なし"}`);
console.log(`定期チェック：合計 ${chkQ}問・緩和 ${chkRelax}・再利用 ${chkReuse}・出題できず ${chkSkip}`);
// COUNT=スキル なら、そのスキルの問題の出題数と、そのスキルを前提に持つ問題（単元別）の出題数を出す
if (process.env.COUNT) {
  const k = process.env.COUNT, own = {}, via = {};
  history.forEach((a) => {
    const q = Q[String(a.question_id).split("#")[0]];
    if (!q) return;
    const u = E.SKILLS[a.skill].unit;
    if (a.skill === k) own[u] = (own[u] || 0) + 1;
    else if ((q.prerequisite_skills || []).includes(k) && a.skill === q.skill) via[u] = (via[u] || 0) + 1;
  });
  console.log(`「${E.SKILLS[k].label}」の問題：${JSON.stringify(own)}／前提に持つ問題（単元別）：${JSON.stringify(via)}`);
}
if (process.env.JSON) console.log("JSON " + JSON.stringify(audit));
