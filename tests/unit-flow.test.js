// node --test tests/*.test.js — 新しい単元に進んだときの振る舞い（はじめてのチェックの問題数・案内・表示の分類）
const test = require("node:test");
const assert = require("node:assert/strict");
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause", "planner", "testprep", "store"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, C = SC.compass, P = SC.planner;
const T0 = Date.parse("2026-10-01T07:00:00Z");
const sch = (u, at) => ({ current_unit: u, units: { [u]: { status: "learning", current_skill: at } } });

test("1 はじめてのチェック：学校が単元を始めたばかりでも3問。未学習のスキルは出さない。debug に候補・除外・最終問題数", () => {
  [["式の計算", "polyAddSub"], ["連立方程式", "simMeaning"], ["図形の角", "lineAngles"], ["合同と証明", "congCorr"], ["合同と証明", "congCond"]].forEach(([u, at]) => {
    const s = sch(u, at), c = C.unitCheck(u, s);
    assert.ok(c.questions.length >= 3 && c.questions.length <= 5, u + "/" + at + " " + c.questions.length);
    assert.equal(new Set(c.questions).size, c.questions.length, "同じ問題をくり返さない");
    c.questions.forEach((id) => assert.notEqual(E.schoolSkillStatus(Q[id].skill, s), "not_learned", id));
    assert.equal(c.debug.final_count, c.questions.length);
    assert.ok(c.debug.excluded.some((x) => /まだ習っていない/.test(x.why)));
  });
  // 単元がひととおり進んでいれば、これまでどおり診断用の5問・複数のスキル
  ["式の計算", "連立方程式", "図形の角", "合同と証明"].forEach((u) => {
    const c = C.unitCheck(u);
    assert.equal(c.questions.length, 5, u);
    assert.ok(new Set(c.chosen.map((x) => x.skill)).size >= 4, u);
  });
  // 合同条件まで：対応・合同条件・図から使える事実（複数のスキル）
  assert.deepEqual(new Set(C.unitCheck("合同と証明", sch("合同と証明", "congCond")).chosen.map((x) => x.skill)), new Set(["congCorr", "congCond", "proofFigureFacts"]));
});

test("2 学校の単元が変わったら、その単元のはじめてのチェックがすんでいるかを覚えている（「今日はあとで」はその日だけ）", () => {
  const S = SC.store;
  S.reset();
  S.setSchool("図形の角", "lineAngles");
  assert.equal(S.unitCheckDone("図形の角"), false);
  S.setUnitCheckSnooze("図形の角", "2026-10-06");
  assert.ok(S.unitCheckSnoozed("図形の角", "2026-10-06"));
  assert.ok(!S.unitCheckSnoozed("図形の角", "2026-10-07"), "翌日はまた案内できる");
  assert.ok(!S.unitCheckSnoozed("合同と証明", "2026-10-06"), "ほかの単元には効かない");
  const sid = S.startSession("compass_check", "図形の角");
  S.finishSession(sid, {});
  assert.ok(S.unitCheckDone("図形の角"), "すんだら再案内しない");
  const d = S.startSession("periodic", "合同と証明"); S.finishSession(d, {});
  assert.ok(!S.unitCheckDone("合同と証明"), "定期チェックは、はじめてのチェックに数えない");
});

test("3 表示の分類は学校との位置関係：学校で学習中のスキルの戻る勉強は「学校の学習」、前に習ったスキルは「もどって確認」（内部の type はそのまま）", () => {
  const school = { current_unit: "合同と証明", units: { "図形の角": { status: "learned" }, "合同と証明": { status: "learning", current_skill: "congCond" } } };
  const h = [];
  let n = 0;
  const rec = (id, ok) => h.push(E.makeAnswerRecord(Q[id], { status: ok ? "correct" : "incorrect" }, { userId: "u", context: "compass_check", now: T0 + ++n * 1000 }));
  rec("congCorr-basic-1", true); rec("congCond-basic-1", false); rec("congCond-basic-3", false); rec("lineAngles-basic-1", false); rec("lineAngles-basic-2", false);
  const now = T0 + 864e5;
  const plan = P.build({ states: E.computeSkillStates(h, { now }), history: h, explorations: [], school: { current_unit: "合同と証明", school_status: "learning", detail: school }, minutes: 45, now, rng: SC.bank.seeded(1) });
  const byskill = (k) => plan.sessions.find((s) => s.skill === k && s.type === "practice");
  const cond = byskill("congCond"), line = byskill("lineAngles");
  if (cond) { assert.equal(cond.display, "current_unit"); assert.equal(cond.type_label, "学校の学習"); assert.match(cond.note, /学校で習っている/); }
  if (line) { assert.equal(line.display, "practice"); assert.equal(line.type_label, "もどって確認"); }
  assert.ok(cond || line, plan.sessions.map((s) => s.type + ":" + s.skill).join(" / "));
  plan.sessions.filter((s) => s.type === "practice").forEach((s) => {
    const st = E.schoolSkillStatus(s.skill, school);
    assert.equal(s.display, st === "current" ? "current_unit" : st === "not_learned" ? "preview" : "practice", s.skill);
  });
});
