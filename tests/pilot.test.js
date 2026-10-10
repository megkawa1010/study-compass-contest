// node --test tests/*.test.js — 実利用パイロットの記録（?debug=pilot）：日ごとのまとめ・保護者のメモ・見つけたことの分類・書き出し
const test = require("node:test");
const assert = require("node:assert/strict");
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause", "planner", "testprep", "pilot", "store"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const ST = SC.store, PI = SC.pilot, Q = SC.QUESTIONS;

test("今日の学習の記録に、学校の進度・学習可能時間が残り、日ごとに提案と実際がまとまる", () => {
  ST.reset();
  ST.setSchool("一次関数", "rate");
  ST.setSettings({ minutes: 20 });
  const q1 = Object.values(Q).find((q) => q.skill === "rate" && q.type !== "steps");
  const q2 = Object.values(Q).find((q) => q.skill === "rate" && q.type !== "steps" && q.id !== q1.id);
  const rec = ST.addPlan({ id: "pln-x", total_minutes: 20, sessions: [{ type: "current_unit", type_label: "学校の学習", skill: "rate", skill_label: "変化の割合", minutes: 10, questions: [q1.id, q2.id] }] });
  assert.equal(rec.context.available_minutes, 20);
  assert.equal(rec.context.school_unit, "一次関数");
  assert.ok(rec.context.school_skill);
  const sid = ST.startSession("daily", "一次関数");
  ST.addAnswer(q1, { status: "correct" }, { sessionId: sid, context: "daily" });
  ST.addAnswer(q2, { status: "unknown" }, { sessionId: sid, context: "daily" });
  ST.updatePlan("pln-x", { completed_at: new Date(ST.now()).toISOString(), results: { [q1.id]: "correct", [q2.id]: "tried" } });

  const day = PI.days(ST.get())[0];
  assert.equal(day.date, PI.dateKey(ST.now()));
  assert.equal(day.available_minutes, 20);
  assert.match(day.school, /^一次関数（/);
  assert.equal(day.proposed[0].questions, 2);
  assert.equal(day.completed, true);
  assert.deepEqual([day.done[0].answered, day.done[0].correct], [2, 1]);
  assert.equal(day.answers, 2);
  assert.equal(day.unknown, 1);
  assert.deepEqual(day.missed, [q2.id + "（わからない）"]);
});

test("保護者のメモ・その場のメモ・見つけたこと（すぐ直す／あとで）が書き出しに入る。学習の記録には影響しない", () => {
  const before = JSON.stringify(ST.get().skill_state);
  const today = PI.dateKey(ST.now());
  ST.setPilotActive(true);
  assert.equal(ST.pilot().started, today);
  ST.setPilotNote(today, "confused", "結果画面で次に何を押すか迷った");
  ST.addPilotMemo({ date: today, time: "19:05", screen: "今日の学習の問題", question: "q1", text: "この問題むずかしい" });
  ST.addPilotIssue({ date: today, text: "同じ問題が2回出た", category: "wrong_judgement" });
  const later = ST.addPilotIssue({ date: today, text: "ボタンの名前がわかりにくい", category: "button" });
  ST.updatePilotIssue(later.id, { status: "hold" });
  assert.equal(JSON.stringify(ST.get().skill_state), before);

  const md = PI.toMarkdown(ST.get());
  const urgent = md.slice(md.indexOf("### すぐ直す"), md.indexOf("### あとでまとめて判断"));
  assert.match(urgent, /学習判断が大きく誤る｜同じ問題が2回出た/);
  assert.match(md.slice(md.indexOf("### あとでまとめて判断")), /\[保留\].*ボタン名｜ボタンの名前がわかりにくい/);
  assert.match(md, /子どもが迷った画面：結果画面で次に何を押すか迷った/);
  assert.match(md, /メモ（19:05・今日の学習の問題・q1）：この問題むずかしい/);
  assert.match(md, /学習可能時間：20分/);
  // JSON の書き出しにも入る（あとから集計できる）
  assert.equal(JSON.parse(ST.exportJSON()).pilot.issues.length, 2);
});
