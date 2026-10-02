// node --test tests/*.test.js — 問題バンクの合格判定（scripts/audit-bank.js）
// 「各スキル5問」ではなく、10日分の利用シミュレーションで不自然な再利用が起きないかを確かめる。
// 問題を減らしたり、出し方を変えたりして、ここが崩れたら補強が必要。
// 合格済みの単元だけで判定する。図形の角は問題バンクの補強がすんだら ACCEPTED に入れる
const ACCEPTED = ["一次関数", "連立方程式", "式の計算"];
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("child_process");
const path = require("path");

test("10日分の利用シミュレーション：fallback なし・不自然な再利用がほぼない・チェックで出題できないスキルがない", () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, "..", "scripts", "audit-bank.js"), "10"], { env: Object.assign({}, process.env, { JSON_OUT: "1", UNITS: ACCEPTED.join(",") }), encoding: "utf8" });
  const a = JSON.parse(out.split("\n").find((l) => l.indexOf("AUDIT ") === 0).slice(6));
  assert.equal(a.fallbacks, 0);
  assert.ok(a.unnatural <= 3, "今日の学習で2日以内にくり返した問題 " + a.unnatural);
  a.skills.forEach((s) => assert.equal(s.check_skip, 0, s.skill + " のチェックで出題できなかった"));
  const checkReuse = a.skills.reduce((n, s) => n + s.check_reuse, 0);
  assert.ok(checkReuse <= 10, "チェックで最近の問題まで許可した回数 " + checkReuse);
});
