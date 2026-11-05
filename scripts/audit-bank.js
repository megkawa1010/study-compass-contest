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
["questions", "logic", "engine", "bank", "geometry", "proof", "compass", "rootcause", "planner"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine;

const DAYS = process.argv[2] || "10";
// アプリ自身の決まり（練習で出した問題は AVOID_LESSON_DAYS 日は出さない）を破った再利用を「不自然」とする
const GAP_DAYS = SC.planner.CONFIG.AVOID_LESSON_DAYS;
const SCENARIOS = [
  ["一次関数"], ["連立方程式"], ["連立方程式", "polyAddSub"], ["連立方程式", "signed"],
  ["式の計算"], ["式の計算", "signed"], ["式の計算", "eqProperty"],
  ["図形の角"], ["図形の角", "transpose"], ["図形の角", "triangleSum"],
  ["合同と証明"], ["合同と証明", "parallelAngles"], ["合同と証明", "proofHypConc"],
  ["確率"], ["確率", "probCount"], ["確率", "probMeaning"],
  ["データの活用"], ["データの活用", "dataMedian"], ["データの活用", "dataBoxRead"]
];
// UNITS=単元,単元 で、その単元のシナリオだけ流す（例：UNITS=図形の角）
const ONLY = process.env.UNITS ? process.env.UNITS.split(",") : null;
const runs = [];
SCENARIOS.filter((sc) => !ONLY || ONLY.includes(sc[0])).forEach((sc) => [30, 45].forEach((min) => ["", "1"].forEach((learnAll) => runs.push({ sc, min, learnAll }))));

const per = {}; // スキル → 集計
function row(k) { return (per[k] = per[k] || { picks: 0, reuse: 0, unnatural: 0, checkReuse: 0, checkSkip: 0, examples: {} }); }
let fallbacks = 0, totalPicks = 0, totalReuse = 0, totalUnnatural = 0;
// 追加の集計：チェックのレベル別不足・並べかえ・ほかの単元（図形①など）への戻り
const levelShort = {}, order = { picks: 0, reuse: 0 }, byUnit = {};
runs.forEach((r) => {
  const out = execFileSync(process.execPath, [path.join(__dirname, "simulate-days.js"), DAYS, String(r.min)].concat(r.sc),
    { env: Object.assign({}, process.env, { JSON: "1", LEARN_ALL: r.learnAll }), encoding: "utf8" });
  const line = out.split("\n").filter((l) => l.indexOf("JSON ") === 0)[0];
  const a = JSON.parse(line.slice(5));
  fallbacks += a.fallbacks || 0;
  a.picks.forEach((p) => {
    const u = E.SKILLS[p.skill].unit;
    byUnit[u] = (byUnit[u] || 0) + 1;
    if (p.qtype === "order") { order.picks++; if (p.reused) order.reuse++; }
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
    if (c.result === "skipped" || c.stage >= 2) { const k = c.skill + "/" + c.level; levelShort[k] = (levelShort[k] || 0) + 1; }
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

// ---------- 合同と証明：根拠だけの確認（reason_review）の在庫 ----------
//   「根拠だけまちがえる → 次の日に確認（2問）→ 正解 → また根拠だけまちがえる」が REASON_EVERY 日ごと（既定2日：1・3・5・7・9日目）に続いたとして、
//   取り違えごとに reasonPicks が2問ずつ出せるか（前回から AVOID_CHECK_DAYS 日は同じ問題を出さない）。REASON_EVERY=1 で毎日（いちばんきびしい場合）。
//   出した問題は、記録したスキルの根拠だけの問題か（別のスキルの skill_state を動かさない）も確かめる
let reasonShort = 0, reasonOther = 0;
const proofUnit = !ONLY || ONLY.includes("合同と証明");
const reasonRows = [];
if (proofUnit) {
  const Q = SC.QUESTIONS, G = SC.geometry, T0 = Date.parse("2026-10-01T07:00:00Z");
  const confs = {}; // スキル → { 取り違え: 出どころの問題 }
  Object.values(Q).filter((q) => E.SKILLS[q.skill].unit === "合同と証明").forEach((q) => {
    (q.type === "steps" ? q.steps : [q]).forEach((st) => {
      const asp = st.aspect || q.aspect;
      if (asp !== "reason" || st.type !== "choice") return;
      const sk = st.skill || q.skill;
      st.choices.filter((c) => c.key !== st.answer).forEach((c) => { (confs[sk] = confs[sk] || {})[G.confusionOf({ aspect: "reason", answer: st.answer }, c.key)] = q.id; });
    });
  });
  Object.keys(confs).forEach((sk) => Object.keys(confs[sk]).forEach((cf) => {
    const history = [], seen = {};
    let short = 0, zero = 0, other = 0, repeat = 0;
    const every = Number(process.env.REASON_EVERY || 2);
    for (let d = 1; d <= Number(DAYS); d += every) {
      const now = T0 + d * 864e5;
      const picks = SC.planner.reasonPicks({ skill: sk, confusions: [cf], missed_questions: [confs[sk][cf]] }, { history, now }, []);
      if (picks.length < 2) short++;
      if (!picks.length) zero++;
      picks.forEach((p, i) => {
        const q = Q[p.question_id];
        if (q.skill !== sk || !q.reason_only) other++;
        if (seen[q.id]) repeat++;
        seen[q.id] = true;
        history.push(E.makeAnswerRecord(q, { status: "correct", chosen: q.answer }, { userId: "u", context: "lesson", now: now + i * 1000 }));
      });
    }
    reasonShort += zero; reasonOther += other;
    reasonRows.push({ skill: sk, confusion: cf, short, zero, other, repeat, distinct: Object.keys(seen).length });
  }));
  console.log("");
  const ev = Number(process.env.REASON_EVERY || 2);
  console.log("根拠だけの確認（reason_review）の在庫：取り違え " + reasonRows.length + " 種類 × " + DAYS + " 日（" + (ev === 1 ? "毎日" : ev + "日ごと") + "に2問）");
  console.log("  スキル                 根拠だけの問題  取り違え  2問出せない回  0問の回  別スキル  使った問題（再登場）");
  Object.keys(confs).forEach((sk) => {
    const rs = reasonRows.filter((r) => r.skill === sk), n = Object.values(Q).filter((q) => q.reason_only && q.skill === sk).length;
    const sum = (k) => rs.reduce((t, r) => t + r[k], 0);
    console.log("  " + E.SKILLS[sk].label.padEnd(14, "　") + String(n).padStart(6) + String(rs.length).padStart(10) + String(sum("short")).padStart(12) + String(sum("zero")).padStart(9) + String(sum("other")).padStart(9) +
      "   " + Math.min.apply(null, rs.map((r) => r.distinct)) + "〜" + Math.max.apply(null, rs.map((r) => r.distinct)) + "問（" + sum("repeat") + "）");
  });
  // 約4割は根拠つき（穴うめ証明・1段階の問題のうち、主張と根拠の両方を確かめる問題）
  const pq = Object.values(Q).filter((q) => E.SKILLS[q.skill].unit === "合同と証明" && !q.reason_only && q.type !== "order");
  const both = pq.filter((q) => { const as = (q.type === "steps" ? q.steps.map((s) => s.aspect) : [q.aspect || "claim"]); return as.includes("reason") && as.some((a) => a !== "reason"); });
  const proofs = Object.values(Q).filter((q) => E.SKILLS[q.skill].unit === "合同と証明");
  const bad = proofs.filter((q) => !SC.proof.check(q).ok).map((q) => q.id);
  console.log("問題数：" + proofs.length + "（根拠だけ " + proofs.filter((q) => q.reason_only).length + "・並べかえ " + proofs.filter((q) => q.type === "order").length + "）／主張と根拠の両方 " + both.length + "/" + pq.length + "（" + Math.round(both.length / pq.length * 100) + "%）／自動検算の不合格 " + bad.length + (bad.length ? "：" + bad.join(",") : ""));
}
const units = Object.keys(byUnit).sort((a, b) => byUnit[b] - byUnit[a]);
console.log("今日の学習の出題（単元別）：" + units.map((u) => u + " " + byUnit[u]).join("・") + "／並べかえ " + order.picks + "問（再利用 " + order.reuse + "）");
const ls = Object.keys(levelShort);
console.log("チェックのレベル別不足（最近の問題まで許可・出題できず）：" + (ls.length ? ls.map((k) => { const [sk, lv] = k.split("/"); return E.SKILLS[sk].label + "/" + lv + "×" + levelShort[k]; }).join("、") : "なし"));
if (process.env.JSON_OUT) console.log("AUDIT " + JSON.stringify({ picks: totalPicks, reuse: totalReuse, unnatural: totalUnnatural, fallbacks: fallbacks, reason_short: reasonShort, reason_other: reasonOther, by_unit: byUnit, order: order,
  skills: rows.map((r) => ({ skill: r.k, bad: r.bad, reuse: r.x.reuse, unnatural: r.x.unnatural, check_reuse: r.x.checkReuse, check_skip: r.x.checkSkip })) }));
