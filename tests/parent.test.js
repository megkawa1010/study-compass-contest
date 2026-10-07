// node --test tests/*.test.js — 保護者向けのまとめ
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner", "parent"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const PR = SC.parent, P = SC.planner, E = SC.engine, Q = SC.QUESTIONS, B = SC.bank;
const HOUR = 3600e3, DAY = 24 * HOUR;
const T0 = new Date(2026, 9, 1, 17, 0).getTime();
const c = "correct", x = "incorrect";
const SCHOOL = { grade: "中2", subject: "数学", current_unit: "一次関数", school_status: "learning" };

function learner() {
  const history = [];
  let n = 0;
  return {
    history,
    add(at, ids, results, context = "compass_check") {
      ids.forEach((id, i) => history.push(E.makeAnswerRecord(Q[id], { status: results[i] }, { userId: "u", sessionId: "s", context, now: at + (++n) * 1000 })));
    }
  };
}
const EXPL = { date: new Date(T0).toISOString(), symptom: { skill: "rate", label: "変化の割合" }, conclusion: { kind: "gap_found", return_to: "change", solid_skills: ["signed"] } };

// 1週目：変化の割合・変化量でつまずく → 2週目：変化の割合が標準まで安定
function scenario() {
  const L = learner();
  L.add(T0, ["B1", "B2", "B3", "B4", "B5", "C4", "C5"], [c, c, c, x, x, x, c]);
  L.add(T0 + DAY, ["change-basic-1", "change-basic-2"], [x, c], "lesson");
  const now = T0 + 9 * DAY;
  L.add(T0 + 8 * DAY, ["rate-basic-1", "rate-standard-1", "change-basic-3"], [c, c, x]);
  L.add(T0 + 8 * DAY + HOUR, ["change-basic-4"], [x]);
  const states = E.computeSkillStates(L.history, { now });
  const todayPlan = P.build({ states, history: L.history, explorations: [EXPL], school: SCHOOL, minutes: 30, goal: "daily_learning", now, rng: B.seeded(1) });
  const plans = [{ id: "p1", completed_at: new Date(T0 + 8 * DAY).toISOString(), total_minutes: 30, focus_skill: "change" }];
  return PR.report({ history: L.history, states, compassHistory: [], explorations: [EXPL], plans, now, school: SCHOOL, todayPlan });
}

test("今週の学習：学習した日・学習時間（目安）・現在の単元", () => {
  const r = scenario();
  assert.equal(r.week.active_days, 1, "この7日間で学習した日");
  assert.equal(r.week.minutes, 30 + 4, "今日の学習30分 ＋ チェック4問ぶん");
  assert.equal(r.week.unit, "一次関数");
});

test("最近できるようになったこと：1週間前と比べて伸びたスキル（変化の割合 △ → ○）", () => {
  const r = scenario();
  const g = r.growth.find((x) => x.skill === "rate");
  assert.ok(g, JSON.stringify(r.growth));
  assert.equal(g.from, "△");
  assert.ok(["○", "◎"].includes(g.to));
  assert.match(g.text, /形が変わった問題でも安定/);
  assert.match(r.message, /今週は「変化の割合」の理解が安定してきました/);
});

test("いちばん伝えたい成長（確認していたところから伸びた単元のスキル）を先頭にする", () => {
  const r = scenario();
  assert.equal(r.growth[0].skill, "rate");
  assert.equal(r.growth[0].was_weak, true);
});

test("今確認しているところ：理由まで（子ども向けより詳しい）", () => {
  const r = scenario();
  assert.ok(r.focus);
  assert.ok(r.focus.why.length > 20);
  assert.match(r.message, new RegExp("いまは「" + r.focus.label + "」を確認"));
});

test("つまずきの可能性：断定しない・解決したものは出さない・1回の×だけでは取り上げない", () => {
  const r = scenario();
  const s = r.stumbles.find((x) => x.skill === "change");
  assert.ok(s, JSON.stringify(r.stumbles));
  assert.match(s.text, /可能性|確認して/);
  assert.match(s.text, /何度か/, "14日で何度かまちがえている");
  r.stumbles.forEach((x) => assert.doesNotMatch(x.text, /苦手です|原因です|できません|悪い/));
  // 変化量ができるようになったら出さない
  const L = learner();
  L.add(T0, ["C4"], [x]);
  L.add(T0 + DAY, ["change-basic-1", "change-standard-1", "change-standard-2"], [c, c, c]);
  const now = T0 + 2 * DAY;
  const r2 = PR.report({ history: L.history, states: E.computeSkillStates(L.history, { now }), explorations: [EXPL], plans: [], now, school: SCHOOL });
  assert.ok(!r2.stumbles.some((x) => x.skill === "change"), "解決したつまずきは出さない");
});

test("次に取り組むこと：今日の学習の流れ ＋ 次のコンパスチェックの目安", () => {
  const r = scenario();
  assert.ok(r.next.length >= 1);
  assert.match(r.next[r.next.length - 1], /コンパスチェック/);
  // 戻って確認しているスキルは「今確認していること」で伝え、予定には重ねない
  r.checking.forEach((c) => assert.ok(!r.next.some((s) => s.includes("「" + c.label + "」")), c.label));
});

test("監視・比較をしない：点数・正誤の数・ランキング・他の子を出さない", () => {
  const r = scenario();
  const all = JSON.stringify({ week: r.week, message: r.message, growth: r.growth, focus: r.focus, stumbles: r.stumbles, next: r.next, map: r.map });
  assert.doesNotMatch(all, /点|順位|ランキング|平均|ほかの子|他の子|不正解|間違えた回数|正答率|苦手/);
  assert.ok(!("correct_count" in r.week) && !("score" in r));
  r.map.forEach((m) => assert.ok(m.word && !/\d/.test(m.word), "地図はことばで表す（数字を出さない）"));
});

test("「身についてきています」は数日後の確認が2回以上のときだけ。1回なら「今回も使うことができました」", () => {
  const L = learner();
  L.add(T0, ["B4"], [c]);
  L.add(T0 + 4 * DAY, ["rate-retention-1"], [c]);
  let now = T0 + 4 * DAY + HOUR;
  let r = PR.report({ history: L.history, states: E.computeSkillStates(L.history, { now }), now, school: SCHOOL });
  let g = r.growth.find((x) => x.skill === "rate");
  assert.match(g.text, /前回学んだ内容を、今回も使うことができました/);
  L.add(T0 + 9 * DAY, ["rate-retention-3"], [c]);
  now = T0 + 9 * DAY + HOUR;
  r = PR.report({ history: L.history, states: E.computeSkillStates(L.history, { now }), now, school: SCHOOL });
  g = r.growth.find((x) => x.skill === "rate");
  assert.ok(g, JSON.stringify(r.growth));
  assert.match(g.text, /数日後の確認でもできており、少しずつ身についてきています/);
});

test("記録がなくても止まらない", () => {
  const r = PR.report({ history: [], states: E.computeSkillStates([], {}), now: T0, school: SCHOOL });
  assert.equal(r.empty, true);
  assert.match(r.message, /無理のないペース/);
});

test("3つに分ける：今できていること・今確認していること・次に進むこと に同じスキルを出さない（「今週は変化量が安定。次は変化量」のような文にしない）", () => {
  // 変化量：1週間で「まだ → 練習しているところ」に上がったが、今日の学習でも戻って確認している
  const L = learner();
  L.add(T0, ["B1", "B2", "B3", "B4", "B5", "C4", "C5"], [c, c, c, x, x, x, c]);
  const now = T0 + 9 * DAY;
  L.add(T0 + 8 * DAY, ["change-basic-1", "change-basic-2", "change-standard-1"], [c, x, c]);
  const states = E.computeSkillStates(L.history, { now });
  const todayPlan = P.build({ states, history: L.history, explorations: [EXPL], school: SCHOOL, minutes: 30, goal: "daily_learning", now, rng: B.seeded(1) });
  const r = PR.report({ history: L.history, states, compassHistory: [], explorations: [EXPL], plans: [], now, school: SCHOOL, todayPlan });
  const g = r.growth.map((x) => x.skill), ch = r.checking.map((x) => x.skill);
  g.forEach((k) => assert.ok(!ch.includes(k), k + " ができている と 確認している の両方に入っている"));
  r.growth.forEach((x) => assert.ok(E.STATUS_RANK[states[x.skill].learning_status] >= E.STATUS_RANK.understood, x.skill + " は練習中なのに「できるようになった」"));
  // ひとことで同じスキルを2回言わない
  const names = (r.message.match(/「[^」]+」/g) || []);
  assert.equal(new Set(names).size, names.length, r.message);
  // 戻って確認しているスキルは「確認していること」に入る（つまずきの欄と今日の学習が食いちがわない）
  todayPlan.sessions.filter((s) => s.type === "practice" && (s.display || s.type) === "practice").forEach((s) => assert.ok(ch.includes(s.skill), s.skill));
});

test("確認していることの説明は単元に合わせる：一次関数以外で「表・グラフ」と言わない。根拠だけの確認は根拠のことばで", () => {
  const sch = { grade: "中2", subject: "数学", current_unit: "図形の角", school_status: "learning" };
  const L = learner();
  L.add(T0, ["angleNames-basic-1", "angleNames-basic-2"], [x, x]);
  const now = T0 + DAY;
  const states = E.computeSkillStates(L.history, { now });
  const expl = { date: new Date(T0).toISOString(), symptom: { skill: "parallelAngles", label: "平行線と角" }, conclusion: { kind: "gap_found", return_to: "angleNames", solid_skills: [] } };
  const todayPlan = P.build({ states, history: L.history, explorations: [expl], school: sch, minutes: 30, goal: "daily_learning", now, rng: B.seeded(1) });
  const r = PR.report({ history: L.history, states, compassHistory: [], explorations: [expl], plans: [], now, school: sch, todayPlan });
  [r.focus ? r.focus.why : ""].concat(r.checking.map((c) => c.text)).forEach((t2) => assert.doesNotMatch(t2, /表・グラフ/, t2));
});
