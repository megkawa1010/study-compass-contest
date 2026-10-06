// node --test tests/*.test.js — 統合シナリオ（2026-10-05）で見つかった必須4項目の回帰テスト
const test = require("node:test");
const assert = require("node:assert/strict");
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause", "planner", "testprep", "store"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, P = SC.planner, C = SC.compass;
const T0 = Date.parse("2026-10-01T07:00:00Z"), DAY = 864e5;
let n = 0;
const rec = (id, ok, at, ctx) => E.makeAnswerRecord(Q[id], { status: ok ? "correct" : "incorrect" }, { userId: "u", context: ctx || "compass_check", now: at + ++n * 1000 });
const school = { current_unit: "図形の角", units: { "式の計算": { status: "learned" }, "連立方程式": { status: "learned" }, "一次関数": { status: "learned" }, "図形の角": { status: "learning", current_skill: "lineAngles" }, "合同と証明": { status: "not_learned" } } };
const plan = (h, expl, now) => P.build({ states: E.computeSkillStates(h, { now }), history: h, explorations: expl, minutes: 30, now, rng: SC.bank.seeded(1),
  school: { current_unit: "図形の角", school_status: "learning", detail: school } });

test("1 原因さがしで見つかった戻る場所は、前からの記録で「活用できる」でも、今日の学習に入る（そのあと立て直したら外れる）", () => {
  // 移項は前から何度も正解（活用できる）。今日の原因さがしで移項をまちがえた
  const h = [];
  ["transpose-basic-1", "transpose-basic-2", "transpose-standard-1", "transpose-standard-2", "transpose-retention-1"].forEach((id, i) => h.push(rec(id, true, T0 - 10 * DAY + i * DAY)));
  h.push(rec("transpose-basic-3", false, T0));
  const expl = [{ date: new Date(T0 + 60e3).toISOString(), symptom: { skill: "angleEq", label: "角度を式で表す" }, conclusion: { kind: "gap_found", return_to: "transpose" } }];
  const p1 = plan(h, expl, T0 + 3600e3);
  assert.ok(p1.sessions.some((s) => s.type === "practice" && s.skill === "transpose"), p1.sessions.map((s) => s.type + ":" + s.skill).join(" / "));
  // そのあと練習で2回続けて正解 → 外れる
  h.push(rec("transpose-standard-3", true, T0 + DAY, "lesson"), rec("transpose-basic-4", true, T0 + DAY, "lesson"));
  const p2 = plan(h, expl, T0 + 2 * DAY);
  assert.ok(!p2.sessions.some((s) => s.type === "practice" && s.skill === "transpose"));
  assert.ok(p2.debug.log.some((l) => /そのあとの練習で続けて正解/.test(l)));
});

test("2 学校で習ったのに一度も記録がないスキルは、定期チェックで確かめる（いまの単元とひとつ前の単元、2つまで）", () => {
  const h = [rec("lineAngles-basic-1", true, T0), rec("change-basic-1", true, T0)];
  const chk = C.buildCheck({ states: E.computeSkillStates(h, { now: T0 + 4 * DAY }), history: h, sessions: [], explorations: [], now: T0 + 4 * DAY, school, rng: SC.bank.seeded(1) });
  const un = chk.chosen.filter((c) => /まだ一度も確かめていない/.test(c.reason));
  assert.ok(un.length >= 1 && un.length <= 2, JSON.stringify(chk.chosen.map((c) => c.skill)));
  un.forEach((c) => assert.ok(["一次関数", "図形の角"].includes(E.SKILLS[c.skill].unit), c.skill));
  // 学校でまだ習っていないスキル・前の前の単元は出さない
  assert.ok(!chk.chosen.some((c) => E.SKILLS[c.skill].unit === "合同と証明" || E.SKILLS[c.skill].unit === "連立方程式"));
  // まだ記録がない人には、定期チェックのお知らせを出さない（はじめてのチェックが先）
  const none = C.buildCheck({ states: E.computeSkillStates([], { now: T0 }), history: [], sessions: [], explorations: [], now: T0, school, rng: SC.bank.seeded(1) });
  assert.equal(none.chosen.length, 0);
});

test("3・4 テストが終わったあとも学校のようすを保存できる／コンパスチェックの回数に毎日の学習を数えない", () => {
  const S = SC.store;
  S.reset();
  S.setSchool("一次関数", "change", { nextTest: { date: "2026-10-05", units: ["一次関数"] } });
  assert.ok(SC.testprep.daysLeft("2026-10-05", Date.parse("2026-10-10T07:00:00")) < 0, "過去のテスト日は入力に残さない（app.js viewSchool）");
  const a = S.startSession("compass_check", "一次関数"); S.finishSession(a, {});
  const b = S.startSession("daily", "一次関数"); S.finishSession(b, {});
  const c = S.startSession("periodic", "一次関数"); S.finishSession(c, {});
  assert.equal(S.finishedSessions().length, 3);
  assert.equal(S.finishedChecks().length, 2);
});
