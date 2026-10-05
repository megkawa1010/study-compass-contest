// node --test tests/*.test.js — 図形②：証明エンジン（行の役割・主張・根拠・依存関係）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
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

test("学習マップ：合同と証明の6スキル。対頂角・錯角のスキルは作り直さない", () => {
  assert.deepEqual(E.UNITS["合同と証明"].slice().sort(), ["congCond", "congCorr", "congUse", "proofBuild", "proofFigureFacts", "proofHypConc"]);
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

// 回答を、アプリと同じ形で記録する（小問ごと：skill・aspect・選んだ答え・取り違え）
function records(q, res, t0) {
  return q.steps.map((st, i) => E.makeAnswerRecord({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, unit: q.unit, aspect: st.aspect },
    { status: res[i].correct ? "correct" : "incorrect", chosen: res[i].chosen, confusion: res[i].correct ? null : G.confusionOf(st, res[i].chosen) },
    { userId: "u", context: "compass_check", now: (t0 || T0) + i * 1000 }));
}

test("A 合同条件で SAS なのに SSS → 主張○・根拠×。学び直すのは合同条件（aspect と diagnostic_target を分ける）", () => {
  const q = Q["proof-sas-common-1"];
  const res = fill(q, { L4r: "SSS" });
  const r = res.find((x) => x.id === "L4r");
  assert.equal(r.aspect, "reason");
  const g = P.entry(q, res);
  assert.deepEqual([g.wrong_aspect, g.diagnostic_target, g.entry], ["reason", "congCond", "concept"], "根拠をまちがえたが、根拠だけの確認ではなく合同条件へ");
  assert.equal(g.findings[0].confusion, "SSS_for_SAS");
  assert.equal(g.value_ok, true, "主張（△ABC ≡ △DCB を含む）は正しい");
  // 記録：合同条件スキルの reason に入る（claim は×にしない）
  const st = E.computeSkillStates(records(q, res), { now: T0 + 3600e3 }).congCond;
  assert.deepEqual([st.value.correct, st.value.attempts], [0, 0]);
  assert.deepEqual([st.reason.correct, st.reason.attempts], [0, 1]);
  assert.deepEqual(st.reason.confusions, { SSS_for_SAS: 1 });
});

test("B 証明の中で根拠だけ誤答 → reason の回数が1増え、取り違えが保存される（単独問題と同じ保存先・計算）", () => {
  // 証明の中（図から使える事実の行で、対頂角なのに錯角）
  const q = Q["proof-sas-vertical-1"];
  const res = fill(q, { L3r: "alternate" });
  const inProof = E.computeSkillStates(records(q, res), { now: T0 + 3600e3 }).proofFigureFacts;
  // 1段階の問題（同じ図・同じ取り違え）
  const s = Q["proofFigureFacts-basic-1"];
  const res2 = fill(s, { s2: "alternate" });
  const single = E.computeSkillStates(records(s, res2), { now: T0 + 3600e3 }).proofFigureFacts;
  for (const st of [inProof, single]) {
    assert.deepEqual([st.reason.attempts, st.reason.correct], [1, 0]);
    assert.ok(["needs_review", "learning"].includes(st.reason.status), st.reason.status); // 不安定（レベルは問題ごと：証明は標準・単独は基礎）
    assert.deepEqual(st.reason.confusions, { alternate_for_vertical: 1 });
    assert.deepEqual([st.value.attempts, st.value.correct], [1, 1]);
  }
  // 両方とも「根拠だけ」。学び直す場所は図形①の対頂角（取り違えたのは図形①の性質どうし）
  const g1 = P.entry(q, res), g2 = P.entry(s, res2);
  assert.deepEqual([g1.entry, g1.diagnostic_target], ["reason_only", "lineAngles"]);
  assert.deepEqual([g2.entry, g2.diagnostic_target], ["reason_only", "lineAngles"]);
});

test("C 対頂角だけを使う問題 → 平行線と角は候補に出ない", () => {
  const q = Q["proof-sas-vertical-1"];
  assert.deepEqual(q.required_geometry_skills || P.requiredGeometry(q), ["lineAngles"]);
  [{ L3c: "aoccob" }, { L3c: "aoccob", L3r: "common" }, { L3r: "alternate" }, { L3r: "common" }].forEach((w) => {
    const g = P.entry(q, fill(q, w));
    const all = [g.diagnostic_target].concat(g.concept_prereqs, g.also || []);
    assert.ok(!all.includes("parallelAngles") && !all.includes("angleNames"), JSON.stringify(w) + " → " + all);
  });
  assert.deepEqual(P.entry(q, fill(q, { L3c: "aoccob" })).concept_prereqs, ["lineAngles"]);
  // 地図の前提にも、図形①のスキルを固定で持たない
  assert.deepEqual(E.SKILLS.proofFigureFacts.prerequisites, ["congCorr"]);
});

test("D 共通な辺だけの問題 → 図形①のスキルへ戻らない", () => {
  const q = Q["proof-sas-common-1"];
  assert.deepEqual(P.requiredGeometry(q), []);
  [{ L3c: "ab" }, { L3r: "hypothesis" }, { L3r: "vertical" }, { L3c: "ab", L3r: "vertical" }].forEach((w) => {
    const g = P.entry(q, fill(q, w));
    const all = [g.diagnostic_target].concat(g.concept_prereqs, g.also || []);
    assert.ok(!all.some((k) => E.SKILLS[k].unit === "図形の角" || k === "angleBasics"), JSON.stringify(w) + " → " + all);
  });
  // 誤答内容で入口を変える：共通を取り違えた → 図から使えることを見つける／対応する別の辺 → 対応する辺・角／結論の側 → 仮定と結論
  assert.deepEqual(P.entry(q, fill(q, { L3c: "ab" })).concept_prereqs, []);
  assert.deepEqual(P.entry(q, fill(q, { L3c: "ac" })).concept_prereqs, ["proofHypConc"]);
  assert.deepEqual(P.entry(Q["proof-asa-parallel-1"], fill(Q["proof-asa-parallel-1"], { L2c: "bacdc" })).concept_prereqs, ["congCorr"]);
  // 錯角を使う問題では、錯角と同位角の取り違え → 平行線と角（同位角・錯角の位置も）
  const g = P.entry(Q["proof-asa-parallel-1"], fill(Q["proof-asa-parallel-1"], { L2r: "corresponding" }));
  assert.deepEqual([g.entry, g.diagnostic_target, g.also], ["reason_only", "parallelAngles", ["angleNames"]]);
});

test("E 対応は分かるが、合同のあとに何を言えるか分からない → 合同から言えること（対応する辺・角とは別の診断）", () => {
  const one = (id, chosen) => P.entry(Q[id], [{ id: null, skill: Q[id].skill, correct: false, aspect: Q[id].aspect || "claim", chosen }]);
  // 対応する辺・角（②）
  assert.equal(one("congCorr-basic-1", "de").diagnostic_target, "congCorr");
  assert.equal(one("congCorr-basic-2", "e").diagnostic_target, "congCorr");
  // 合同から言えること（⑤）
  assert.deepEqual([one("congUse-basic-1", "hypothesis").diagnostic_target, one("congUse-basic-1", "hypothesis").wrong_aspect], ["congUse", "reason"]);
  assert.equal(one("congUse-basic-2", "yes").diagnostic_target, "congUse");
  assert.match(one("congUse-basic-2", "yes").why, /合同を示す前に/);
  assert.equal(one("congUse-basic-3", "aobo").diagnostic_target, "congUse");
  // 同じ⑤の問題でも、対応しない辺を選んだら②の可能性
  assert.equal(one("congUse-basic-3", "acbo").diagnostic_target, "congCorr");
  // 証明の中：合同から言えることの行で対応しない辺 → 合同から言えること → 対応する辺・角
  assert.deepEqual([P.entry(Q["proof-sas-common-1"], fill(Q["proof-sas-common-1"], { L5c: "acdc" })).diagnostic_target,
    P.entry(Q["proof-sas-common-1"], fill(Q["proof-sas-common-1"], { L5c: "acdc" })).concept_prereqs], ["congUse", ["congCorr"]]);
});

test("F 先の行と後の行を両方誤答 → 今回は最初の停止行。後の誤りは pending_findings に残り、次のコンパスチェックで確かめる", () => {
  const q = Q["proof-sas-common-1"];
  const res = fill(q, { L1r: "common", L4r: "SSA" });
  const g = P.entry(q, res);
  assert.equal(g.findings.length, 2);
  assert.deepEqual([g.first_miss_step, g.entry, g.diagnostic_target], ["L1r", "reason_only", "proofHypConc"]);
  assert.deepEqual(g.pending_findings.map((f) => [f.step, f.aspect, f.diagnostic_target]), [["L4r", "reason", "congCond"]]);
  // 今回は深掘りしない（根拠だけ → 追加の問題 0）。結論に pending_findings を残す
  const sim = R.simulate(q, res, {}, { now: T0 });
  assert.equal(sim.asked.length, 0);
  assert.deepEqual(sim.trail.conclusion.pending_findings.map((f) => f.diagnostic_target), ["congCond"]);
  // 次の日のコンパスチェックで最優先に確かめる
  const pend = SC.compass.pendingFromExplorations([{ ...sim.trail, date: new Date(T0).toISOString() }], [], T0 + 864e5);
  assert.ok(pend.some((p) => p.skill === "congCond"));
  // 深掘りする誤り（概念）が先でも、上限は追加4問のまま
  const res2 = fill(q, { L3c: "ab", L5c: "acdc" });
  const sim2 = R.simulate(q, res2, {}, { now: T0, budget: R.CONFIG.BUDGET_INITIAL });
  assert.ok(sim2.asked.length <= 4);
  assert.deepEqual(sim2.trail.conclusion.pending_findings.map((f) => f.diagnostic_target), ["congUse"]);
});

test("G 並べかえ → depends_on で判定。正解順は1通りに固定しない", () => {
  const q = Q["proof-order-asa-parallel-1"];
  ["L1,L2,L3,L4,L5", "L3,L2,L1,L4,L5", "L2,L1,L3,L4,L5"].forEach((o) => assert.ok(L.check(q, o.split(",")), o));
  const g = P.entry(q, P.orderResults(q, ["L1", "L4", "L2", "L3", "L5"]));
  assert.deepEqual([g.diagnostic_target, g.concept_prereqs, g.wrong_aspect], ["proofBuild", ["congCond"], "claim"]);
});

test("6つの段階（仮定・対応・図から使える事実・合同条件・合同から言えること・並べかえ）は、別々の学び直し先になる", () => {
  const one = (id, chosen) => P.entry(Q[id], [{ id: null, skill: Q[id].skill, correct: false, aspect: Q[id].aspect || "claim", chosen }]);
  const cases = {
    "仮定": entryOf("proof-asa-common-1", { L1c: "abcb" }),
    "対応": one("congCorr-basic-1", "de"),
    "図から使える事実": entryOf("proof-sas-common-1", { L3c: "ab" }),
    "合同条件": entryOf("proof-sas-common-1", { L4r: "SSA" }),
    "合同から言えること": one("congUse-basic-3", "aobo"),
    "並べかえ": P.entry(Q["proof-order-sss-1"], P.orderResults(Q["proof-order-sss-1"], ["L4", "L5", "L3", "L2", "L1"]))
  };
  assert.deepEqual(Object.values(cases).map((g) => g.diagnostic_target), ["proofHypConc", "congCorr", "proofFigureFacts", "congCond", "congUse", "proofBuild"]);
});

test("原因さがしを最後まで：図の読み取り（錯角の問題）→ 平行線と角。対応がずれた → 対応する辺・角。計算側は確かめない", () => {
  const q = Q["proof-asa-parallel-1"];
  const r1 = R.simulate(q, fill(q, { L2c: "baoaob" }), { parallelAngles: false, angleNames: true, lineAngles: true }, { now: T0 });
  assert.equal(r1.trail.conclusion.return_to, "parallelAngles");
  const r2 = R.simulate(q, fill(q, { L2c: "bacdc" }), { congCorr: false, angleBasics: true }, { now: T0 });
  assert.equal(r2.trail.conclusion.return_to, "congCorr");
  assert.deepEqual(r2.asked.map((p) => p.skill), ["congCorr", "angleBasics"]);
  const r3 = R.simulate(Q["proof-sas-common-1"], fill(Q["proof-sas-common-1"], { L4r: "SSA" }), {}, { now: T0 });
  assert.deepEqual([r3.asked.length, r3.trail.conclusion.kind, r3.trail.conclusion.return_to], [0, "in_skill", "congCond"]);
});

test("同じ問題の中で、先の根拠は○・後の根拠が× → まとめた1回に後の取り違えが残る", () => {
  const q = Q["proof-asa-parallel-1"];
  const st = E.computeSkillStates(records(q, fill(q, { L3r: "alternate" })), { now: T0 + 3600e3 }).proofFigureFacts;
  assert.deepEqual([st.reason.attempts, st.reason.correct], [1, 0]);
  assert.deepEqual(st.reason.confusions, { alternate_for_vertical: 1 });
});

// ---------- 本番の問題バンク ----------
const UNIT_Q = Object.values(Q).filter((q) => E.SKILLS[q.skill].unit === "合同と証明");

test("合同と証明の全問が自動検算に通る（行・主張・根拠・依存・合同条件・図の印・仮定・結論・required_geometry_skills）", () => {
  for (const q of UNIT_Q) {
    const v = P.check(q);
    assert.ok(v.ok, q.id + "：" + v.messages.join(" / "));
  }
  // 図の印：仮定に印がない図は不合格になる
  const q = clone(Q["proof-sas-common-1"]);
  q.figure.equalSides = [];
  assert.ok(!P.verify(q).ok);
  // 図から使える事実の1段階の問題：required_geometry_skills が行の根拠とずれていたら不合格
  const f = clone(Q["proofFigureFacts-standard-1"]);
  f.required_geometry_skills = ["lineAngles"];
  assert.ok(!P.verifyStage(f).ok);
});

test("6つの段階それぞれに 基礎・標準・定着 があり、並べかえは4〜5行・正解順を1通りに固定しない", () => {
  for (const sk of E.UNITS["合同と証明"]) for (const lv of ["basic", "standard", "retention"]) assert.ok(SC.bank.index[sk][lv].length >= 2, sk + "/" + lv);
  const orders = UNIT_Q.filter((q) => q.type === "order");
  assert.ok(orders.length >= 5);
  for (const q of orders) {
    assert.ok([4, 5].includes(q.proof.lines.length), q.id);
    // 仮定・図の事実の行どうしを入れかえても正解
    const o = q.answer.slice(); [o[0], o[1]] = [o[1], o[0]];
    assert.ok(P.orderCheck(q, o).ok, q.id + " 入れかえ");
  }
});

test("根拠だけの問題（reason_only）：reason だけを記録し、主張や別スキルの skill_state を動かさない", () => {
  const rq = UNIT_Q.filter((q) => q.reason_only);
  assert.ok(rq.length >= 32);
  for (const sk of ["proofHypConc", "proofFigureFacts", "congCond", "congUse"]) assert.ok(rq.filter((q) => q.skill === sk).length >= 8, sk);
  for (const q of rq) {
    assert.ok(!Object.values(SC.bank.index).some((lv) => Object.values(lv).some((ids) => ids.includes(q.id))), q.id + " はチェック・練習の索引に入らない");
    const wrong = q.choices.find((c) => c.key !== q.answer).key;
    const rec = E.makeAnswerRecord(q, { status: "incorrect", chosen: wrong, confusion: G.confusionOf(q, wrong) }, { userId: "u", context: "lesson", now: T0 });
    const st = E.computeSkillStates([rec], { now: T0 + 3600e3 });
    Object.keys(st).forEach((k) => {
      const moved = k === q.skill ? st[k].value && st[k].value.attempts : st[k].attempt_count || (st[k].reason && st[k].reason.attempts);
      assert.ok(!moved, q.id + " が " + k + " を動かした");
    });
    assert.deepEqual([st[q.skill].reason.attempts, Object.keys(st[q.skill].reason.confusions)], [1, [wrong + "_for_" + q.answer]]);
  }
  // 根拠の確認：SSS_for_SAS → 合同条件の根拠だけの問題で、SAS が正解・SSS が選択肢にあるもの
  const picks = SC.planner.reasonPicks({ skill: "congCond", confusions: ["SSS_for_SAS"], missed_questions: [] }, { history: [], now: T0 }, []);
  assert.equal(picks.length, 2);
  picks.forEach((p) => { const q = Q[p.question_id]; assert.ok(q.reason_only && q.skill === "congCond" && q.answer === "SAS" && q.choices.some((c) => c.key === "SSS"), p.question_id); });
  // 図から使える事実の取り違え（錯角のつもりが同位角）→ 図から使えることを見つけるの根拠だけの問題（図形①の問題は使わない）
  const p2 = SC.planner.reasonPicks({ skill: "proofFigureFacts", confusions: ["corresponding_for_alternate"], missed_questions: [] }, { history: [], now: T0 }, []);
  p2.forEach((p) => assert.equal(Q[p.question_id].skill, "proofFigureFacts"));
});
