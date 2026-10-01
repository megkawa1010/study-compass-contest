// 開発用：問題バンクの「合格判定」
//   node scripts/audit-bank.js [日数=10]
//
// 「各スキル5問あるか」ではなく、「10日程度使ったときに、不自然な再利用が起きないか」で判定する。
// スキルによって通る回数がまったくちがう（正負の数・等式の性質のようなハブは多く、通らないスキルは少ない）ので、
// 実際の使われ方（scripts/simulate-days.js）を、単元 × つまずきの原因 × 学び方 の組み合わせで流して数える。
//
// 不自然な再利用（＝不合格の理由）
//   - 今日の学習で、前に解いてから GAP_DAYS 日（js/planner.js の AVOID_LESSON_DAYS）未満の問題をもう一度出した
//   - 定期チェックで、除外を「最近の問題」までゆるめないと出せなかった（段階2以降）／出題できなかった
// 前に解いてから GAP_DAYS 日以上あいた再利用は「間をあけた復習」として数えるが、不合格にはしない。
const { execFileSync } = require("child_process");
const path = require("path");
["questions", "logic", "engine", "bank", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine;

const DAYS = process.argv[2] || "10";
// アプリ自身の決まり（練習で出した問題は AVOID_LESSON_DAYS 日は出さない）を破った再利用を「不自然」とする
const GAP_DAYS = SC.planner.CONFIG.AVOID_LESSON_DAYS;
const SCENARIOS = [
  ["一次関数"], ["連立方程式"], ["連立方程式", "polyAddSub"], ["連立方程式", "signed"],
  ["式の計算"], ["式の計算", "signed"], ["式の計算", "eqProperty"]
];
const runs = [];
SCENARIOS.forEach((sc) => [30, 45].forEach((min) => ["", "1"].forEach((learnAll) => runs.push({ sc, min, learnAll }))));

const per = {}; // スキル → 集計
function row(k) { return (per[k] = per[k] || { picks: 0, reuse: 0, unnatural: 0, checkReuse: 0, checkSkip: 0, examples: {} }); }
let fallbacks = 0, totalPicks = 0, totalReuse = 0, totalUnnatural = 0;
runs.forEach((r) => {
  const out = execFileSync(process.execPath, [path.join(__dirname, "simulate-days.js"), DAYS, String(r.min)].concat(r.sc),
    { env: Object.assign({}, process.env, { JSON: "1", LEARN_ALL: r.learnAll }), encoding: "utf8" });
  const line = out.split("\n").filter((l) => l.indexOf("JSON ") === 0)[0];
  const a = JSON.parse(line.slice(5));
  fallbacks += a.fallbacks || 0;
  a.picks.forEach((p) => {
    const x = row(p.skill);
    x.picks++; totalPicks++;
    if (!p.reused) return;
    x.reuse++; totalReuse++;
    if (p.gap_days !== null && p.gap_days < GAP_DAYS) {
      x.unnatural++; totalUnnatural++;
      x.examples[p.question_id + " " + p.level] = (x.examples[p.question_id + " " + p.level] || 0) + 1;
    }
  });
  a.checks.forEach((c) => {
    const x = row(c.skill);
    // 段階1（定着の確認で、以前に解いた問題を許可）は、間をあけた復習なので数えない。段階2以降（最近の問題まで許可）だけ
    if (c.result !== "skipped" && c.stage >= 2) x.checkReuse++;
    if (c.result === "skipped") x.checkSkip++;
  });
});

const L = { basic: "基", standard: "標", application: "応", retention: "定" };
const rows = Object.keys(per).map((k) => {
  const x = per[k], c = SC.bank.count()[k] || {};
  const bad = x.unnatural + x.checkReuse + x.checkSkip;
  return { k, x, bad, have: ["basic", "standard", "application", "retention"].map((lv) => L[lv] + (c[lv] || 0)).join(" ") };
}).sort((a, b) => b.bad - a.bad || b.x.reuse - a.x.reuse);

console.log(`シナリオ ${runs.length} 本（単元×原因×30/45分×学び方）／${DAYS}日／不自然＝${GAP_DAYS}日未満の再利用・チェックの再利用・出題できず`);
console.log(`今日の学習：出題 ${totalPicks}・再利用 ${totalReuse}（${Math.round((totalReuse / totalPicks) * 100)}%）・うち不自然 ${totalUnnatural}・fallback ${fallbacks}`);
console.log("判定  スキル                  問題数(基 標 応 定)   出題  再利用  不自然  チェック再利用/出題できず  例");
rows.forEach(({ k, x, bad, have }) => {
  const ex = Object.keys(x.examples).sort((a, b) => x.examples[b] - x.examples[a]).slice(0, 2).map((e) => e + "×" + x.examples[e]).join(", ");
  console.log(`${bad ? "要補強" : "合格  "} ${E.SKILLS[k].label.padEnd(14, "　")} ${have.padEnd(16)} ${String(x.picks).padStart(5)} ${String(x.reuse).padStart(6)} ${String(x.unnatural).padStart(6)}   ${x.checkReuse}/${x.checkSkip}   ${ex}`);
});
if (process.env.JSON_OUT) console.log("AUDIT " + JSON.stringify({ picks: totalPicks, reuse: totalReuse, unnatural: totalUnnatural, fallbacks: fallbacks,
  skills: rows.map((r) => ({ skill: r.k, bad: r.bad, reuse: r.x.reuse, unnatural: r.x.unnatural, check_reuse: r.x.checkReuse, check_skip: r.x.checkSkip })) }));
