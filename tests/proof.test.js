// node --test tests/*.test.js — 図形②：証明エンジン（行の役割・主張・根拠・依存関係）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, L = SC.logic, P = SC.proof, R = SC.rootcause, G = SC.geometry;
const T0 = Date.parse("2026-10-01T07:00:00Z");
const clone = (o) => JSON.parse(JSON.stringify(o));
const PROOFS = Object.values(Q).filter((q) => q.proof);

// 子どもの答え（小問ごと）。指定しない小問は正解
function fill(q, wrong) {
  const v = {};
  q.steps.forEach((st) => { v[st.id] = wrong[st.id] !== undefined ? wrong[st.id] : st.answer; });
  return L.checkSteps(q, v);
}
const entryOf = (id, wrong) => P.entry(Q[id], fill(Q[id], wrong));

test("学習マップ：合同と証明の6スキル。図から使える事実は、対頂角・錯角を図形①のスキルへさかのぼる（重複して作らない）", () => {
  assert.deepEqual(E.UNITS["合同と証明"].slice().sort(), ["congCond", "congCorr", "congUse", "proofBuild", "proofFigureFacts", "proofHypConc"]);
  assert.ok(E.SKILLS.proofFigureFacts.prerequisites.includes("lineAngles") && E.SKILLS.proofFigureFacts.prerequisites.includes("parallelAngles"));
  assert.equal(E.SKILLS.proofFigureFacts.label, "図から使えることを見つける");
  assert.ok(!E.SKILL_ORDER.some((k) => /vertical|alternate/i.test(k)), "対頂角・錯角のスキルを作り直さない");
  assert.deepEqual(E.schoolOptions("合同と証明"), ["congCorr", "congCond", "proofHypConc", "proofBuild"]);
});

test("代表の証明：6題すべて、行の役割・主張・根拠・依存関係・図の上の等しさ・合同条件のパターンが正しい", () => {
  assert.ok(PROOFS.filter((q) => q.type === "steps").length >= 6);
  for (const q of PROOFS) {
    const v = P.verify(q);
    assert.ok(v.ok, q.id + "：" + v.messages.join(" / "));
    assert.ok(v.checks.length >= 10, q.id);
    assert.deepEqual(G.audit(q).warnings, [], q.id + " の図");
  }
  // 根拠ごとに図形①と同じ判定（対頂角・錯角・共通な辺・共通な角）を通っている
  const bases = new Set(PROOFS.flatMap((q) => q.proof.lines.filter((l) => l.role === "figure_fact").map((l) => l.reason)));
  ["common", "vertical", "alternate"].forEach((b) => assert.ok(bases.has(b), b));
  ["SSS", "SAS", "ASA"].forEach((c) => assert.ok(PROOFS.some((q) => q.proof.lines.some((l) => l.reason === c)), c));
});

test("こわした証明は見つかる：仮定にない・2辺と間でない角・循環・合同の前に使う・対頂角でない・錯角でない", () => {
  const q1 = clone(Q["proof-sas-common-1"]);
  q1.proof.lines[0].claim = { eq: ["AB", "DB"] };
  assert.match(P.verify(q1).messages.join(), /L1.*仮定にある/);
  const q2 = clone(Q["proof-sas-common-1"]);
  q2.proof.lines[1].claim = { eq: ["∠BAC", "∠CDB"] }; q2.proof.hyp[1] = { eq: ["∠BAC", "∠CDB"] };
  assert.match(P.verify(q2).messages.join(), /角が2辺の間にない/);
  const q3 = clone(Q["proof-sas-common-1"]);
  q3.proof.lines[0].depends_on = ["L5"];
  assert.match(P.verify(q3).messages.join(), /循環/);
  const q4 = clone(Q["proof-sas-common-1"]);
  q4.proof.lines[4].depends_on = [];
  assert.match(P.verify(q4).messages.join(), /合同から/);
  const q5 = clone(Q["proof-sas-vertical-1"]);
  q5.proof.lines[2].claim = { eq: ["∠AOC", "∠COB"] };
  assert.match(P.verify(q5).messages.join(), /根拠（vertical）が図の上で成り立つ/);
  const q6 = clone(Q["proof-asa-parallel-1"]);
  q6.proof.lines[1].reason = "corresponding";
  assert.match(P.verify(q6).messages.join(), /根拠（corresponding）が図の上で成り立つ/);
});

test("並べかえ：見本と同じ順番ではなく、依存関係を壊していないかで採点する", () => {
  const q = Q["proof-order-sas-common-1"];
  ["L1,L2,L3,L4,L5", "L3,L1,L2,L4,L5", "L2,L3,L1,L4,L5"].forEach((o) => assert.ok(L.check(q, o.split(",")), o));
  const early = P.orderCheck(q, ["L1", "L2", "L4", "L3", "L5"]);
  assert.equal(early.ok, false);
  assert.equal(early.tag, "condition_early");
  assert.deepEqual(early.violation.missing, ["L3"]);
  assert.equal(P.orderCheck(q, ["L1", "L2", "L3", "L5", "L4"]).tag, "use_early");
  assert.ok(L.isBlank(q, ["L1", "L2"]), "全部並べるまでは答えにならない");
});

test("診断：止まった行の役割と、選んだ答えの種類で入口が分かれる", () => {
  // 仮定を拾えない（結論を仮定の行に書いた）
  let g = entryOf("proof-asa-common-1", { L1c: "abcb" });
  assert.deepEqual([g.entry, g.skill, g.concept_prereqs], ["concept", "proofHypConc", []]);
  // 図から使える事実：主張×でも「対応」と決めない。対応がずれた → 対応する辺・角、そのあと図形①（錯角）
  g = entryOf("proof-asa-parallel-1", { L2c: "bacdc" });
  assert.deepEqual([g.skill, g.concept_prereqs], ["proofFigureFacts", ["congCorr", "parallelAngles"]]);
  // 図の読み取り（共通な辺を見つけられない）→ 図から使えることを見つける そのもの
  g = entryOf("proof-sas-common-1", { L3c: "ab" });
  assert.deepEqual([g.skill, g.concept_prereqs, g.direct], ["proofFigureFacts", [], true]);
  // まだ示していない結論の側を、図の事実として使った → 仮定と結論
  g = entryOf("proof-sas-common-1", { L3c: "ac" });
  assert.deepEqual([g.skill, g.concept_prereqs], ["proofFigureFacts", ["proofHypConc"]]);
  // 図から使える事実：主張×・根拠×（対頂角）→ 図形①の対頂角・一直線の角から
  g = entryOf("proof-sas-vertical-1", { L3c: "aoccob", L3r: "common" });
  assert.deepEqual([g.skill, g.concept_prereqs], ["proofFigureFacts", ["lineAngles"]]);
  // 主張○・根拠×（対頂角なのに錯角）→ 根拠だけ記録
  g = entryOf("proof-sas-vertical-1", { L3r: "alternate" });
  assert.deepEqual([g.entry, g.skill], ["reason_only", "proofFigureFacts"]);
  assert.equal(g.confusions[0].confusion, "alternate_for_vertical");
  // 合同条件の行：三角形の対応（頂点の順番）をまちがえた → 合同条件 → 対応する辺・角
  g = entryOf("proof-sas-vertical-1", { L4c: "aocdob" });
  assert.deepEqual([g.skill, g.concept_prereqs], ["congCond", ["congCorr"]]);
  // 合同条件の行：2辺と、その間でない角 → 合同条件そのもの
  g = entryOf("proof-sas-common-1", { L4r: "SSA" });
  assert.deepEqual([g.skill, g.direct], ["congCond", true]);
  assert.match(g.why, /2辺と、その間でない角/);
  // 合同から言えること：対応しない辺を選んだ → 合同から言えること → 対応する辺・角
  g = entryOf("proof-sas-common-1", { L5c: "acdc" });
  assert.deepEqual([g.skill, g.concept_prereqs], ["congUse", ["congCorr"]]);
  // 合同から言えること：主張○・根拠×（仮定と書いた）→ 根拠だけ
  g = entryOf("proof-sss-1", { L5r: "hypothesis" });
  assert.deepEqual([g.entry, g.skill], ["reason_only", "congUse"]);
  // 並べかえ
  g = P.entry(Q["proof-order-sas-common-1"], P.orderResults(Q["proof-order-sas-common-1"], ["L1", "L2", "L4", "L3", "L5"]));
  assert.deepEqual([g.skill, g.concept_prereqs], ["proofBuild", ["congCond"]]);
  g = P.entry(Q["proof-order-sas-common-1"], P.orderResults(Q["proof-order-sas-common-1"], ["L1", "L2", "L3", "L5", "L4"]));
  assert.deepEqual([g.skill, g.concept_prereqs], ["proofBuild", ["congUse"]]);
});

test("6つの段階（仮定・対応・図から使える事実・合同条件・合同から言えること・並べかえ）は、別々の診断になる", () => {
  const sig = (g) => g.entry + ":" + g.skill + ":" + g.concept_prereqs.join(">");
  const cases = {
    "仮定": entryOf("proof-asa-common-1", { L1c: "abcb" }),
    "対応": P.entry(Q["congCorr-basic-1"], [{ id: null, skill: "congCorr", correct: false, aspect: "claim", chosen: "de" }]),
    "図から使える事実": entryOf("proof-sas-common-1", { L3c: "ab" }),
    "合同条件": entryOf("proof-sas-common-1", { L4r: "SSA" }),
    "合同から言えること": entryOf("proof-sas-common-1", { L5c: "acdc" }),
    "並べかえ": P.entry(Q["proof-order-sss-1"], P.orderResults(Q["proof-order-sss-1"], ["L1", "L2", "L3", "L5", "L4"].reverse()))
  };
  const sigs = Object.values(cases).map(sig);
  assert.equal(new Set(sigs).size, sigs.length, JSON.stringify(cases, null, 1).slice(0, 400));
  assert.deepEqual(Object.values(cases).map((g) => g.skill), ["proofHypConc", "congCorr", "proofFigureFacts", "congCond", "congUse", "proofBuild"]);
});

test("原因さがしを最後まで：対応がずれた図の事実 → 対応する辺・角 ×（→ 角の基本 ○）→ 戻る場所「対応する辺・角」。計算側は確かめない", () => {
  const q = Q["proof-asa-parallel-1"];
  const r = R.simulate(q, fill(q, { L2c: "bacdc" }), { congCorr: false, angleBasics: true, parallelAngles: true }, { now: T0 });
  assert.equal(r.trail.conclusion.return_to, "congCorr");
  assert.deepEqual(r.asked.map((p) => p.skill), ["congCorr", "angleBasics"]);
  // 対応はできていて、錯角が分からない → 図形①の平行線と角へ
  const r2 = R.simulate(q, fill(q, { L2c: "bacdc" }), { congCorr: true, parallelAngles: false, angleNames: true, lineAngles: true }, { now: T0 });
  assert.equal(r2.trail.conclusion.return_to, "parallelAngles");
  // 合同条件の選び方そのもの：問題を足さずに「合同条件」に戻る
  const r3 = R.simulate(Q["proof-sas-common-1"], fill(Q["proof-sas-common-1"], { L4r: "SSA" }), {}, { now: T0 });
  assert.equal(r3.asked.length, 0);
  assert.equal(r3.trail.conclusion.kind, "in_skill");
  assert.equal(r3.trail.conclusion.return_to, "congCond");
});

test("記録：主張は aspect: \"claim\"、根拠は aspect: \"reason\"。主張は value として、根拠は reason として育つ", () => {
  const q = Q["proof-sas-vertical-1"];
  const res = fill(q, { L3r: "alternate" });
  const recs = q.steps.map((st, i) => E.makeAnswerRecord({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, unit: q.unit, aspect: st.aspect },
    { status: res[i].correct ? "correct" : "incorrect", chosen: res[i].chosen, confusion: res[i].correct ? null : G.confusionOf(st, res[i].chosen) },
    { userId: "u", context: "compass_check", now: T0 + i * 1000 }));
  assert.ok(recs.some((r) => r.aspect === "claim") && recs.some((r) => r.aspect === "reason"));
  const s = E.computeSkillStates(recs, { now: T0 + 3600e3 }).proofFigureFacts;
  assert.equal(s.value.correct, 1);
  assert.equal(s.reason.correct, 0);
  assert.deepEqual(s.reason.confusions, { alternate_for_vertical: 1 });
});
