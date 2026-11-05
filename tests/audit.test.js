// node --test tests/*.test.js — 問題バンクの合格判定（scripts/audit-bank.js）
// 「各スキル5問」ではなく、10日分の利用シミュレーションで不自然な再利用が起きないかを確かめる。
// 問題を減らしたり、出し方を変えたりして、ここが崩れたら補強が必要。
// 単元のまとまりごとに判定する（あとから加えた単元の不足が、前からある単元の判定にまざらないように）
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const path = require("path");

const GROUPS = [["一次関数", "連立方程式", "式の計算"], ["図形の角"], ["合同と証明"], ["確率"], ["データの活用"]];

GROUPS.forEach((units) => {
  test("10日分の利用シミュレーション（" + units.join("・") + "）：fallback なし・不自然な再利用がほぼない・チェックで出題できないスキルがない", () => {
    const out = execFileSync(process.execPath, [path.join(__dirname, "..", "scripts", "audit-bank.js"), "10"], { env: Object.assign({}, process.env, { JSON_OUT: "1", UNITS: units.join(",") }), encoding: "utf8" });
    const a = JSON.parse(out.split("\n").find((l) => l.indexOf("AUDIT ") === 0).slice(6));
    assert.equal(a.fallbacks, 0);
    assert.ok(a.unnatural <= 3, "今日の学習で2日以内にくり返した問題 " + a.unnatural);
    a.skills.forEach((s) => assert.equal(s.check_skip, 0, s.skill + " のチェックで出題できなかった"));
    const checkReuse = a.skills.reduce((n, s) => n + s.check_reuse, 0);
    assert.ok(checkReuse <= 10, "チェックで最近の問題まで許可した回数 " + checkReuse);
    if (units.includes("合同と証明")) {
      // 根拠だけの確認：取り違えごとに、2日ごとの確認で毎回問題が出せる。出すのは記録したスキルの根拠だけの問題
      assert.equal(a.reason_short, 0, "根拠だけの確認で出せる問題がなかった回");
      assert.equal(a.reason_other, 0, "根拠だけの確認で、別のスキルの問題を出した回");
      assert.ok((a.by_unit["図形の角"] || 0) <= a.picks * 0.1, "図形①への戻りが多すぎる " + a.by_unit["図形の角"] + "/" + a.picks);
      assert.ok(a.order.picks > 0, "並べかえが出題されていない");
    }
  });
});
