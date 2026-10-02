// node --test tests/*.test.js — 図形の問題図（js/geometry.js の共通 renderer）
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const G = SC.geometry, Q = SC.QUESTIONS, L = SC.logic, E = SC.engine;
const GEO = Object.values(Q).filter((q) => q.figure && q.figure.type === "geometry");
const SAMPLES = ["lineAngles-basic-1", "parallelAngles-basic-1", "triangleSum-basic-1", "exteriorAngle-basic-1", "polygonInterior-basic-1", "angleEq-standard-1"];
const clone = (o) => JSON.parse(JSON.stringify(o));

test("代表図6種類がそろっている（対頂角・平行線・三角形の内角・外角・多角形・x を含む角）", () => {
  SAMPLES.forEach((id) => assert.ok(Q[id] && Q[id].figure.type === "geometry", id));
  assert.ok(GEO.length >= 6);
});

test("全図形問題：警告なし（答え・与えた角度から8°以上・分類そのまま・平行・直角・はみ出し・重なり・relation）", () => {
  for (const q of GEO) {
    const a = G.audit(q);
    assert.deepEqual(a.warnings, [], q.id);
    const html = G.render(q.figure);
    assert.ok(!/NaN|undefined|Infinity/.test(html), q.id);
  }
});

test("1・2. 答えの角度・与えた角度と、描いた角度は8°以上ずれていて、鋭角・鈍角の分類は同じ", () => {
  for (const q of GEO) {
    const a = G.audit(q);
    a.angles.filter((r) => r.truth != null).forEach((r) => {
      if (r.truth === 90) return assert.equal(G.kind(r.drawn), "right");
      assert.ok(r.diff >= G.CONFIG.MIN_GAP, q.id + " " + r.label + " 差 " + r.diff);
      assert.equal(G.kind(r.drawn), G.kind(r.truth), q.id + " " + r.label);
    });
    assert.ok(a.angles.some((r) => r.role === "answer"), q.id + "：答えの角が図にある");
  }
  // こわした図は見つかる：答えの角をそのままの大きさで描くと警告
  const q = clone(Q["triangleSum-basic-1"]);
  q.figure.points.Bd = G.polar(q.figure.points.B, 55, 100);
  q.figure.points.Cd = G.polar(q.figure.points.C, 120, 100);
  const w = G.audit(q).warnings.join("／");
  assert.match(w, /与えた角度と描画角度が近すぎます/);
  assert.match(w, /答えと描画角度が近すぎます/);
  // 鈍角を鋭角に描くと警告
  const q2 = clone(Q["exteriorAngle-basic-1"]);
  q2.figure.angles[2].unknown = false; q2.figure.angles[2].value = 80; q2.figure.angles[2].label = "80°";
  assert.match(G.audit(q2).warnings.join(), /鋭角なのに鈍角/);
});

test("3. 平行と指定した直線は、SVG の上でも平行", () => {
  const q = Q["parallelAngles-basic-1"];
  const lay = G.layout(q.figure);
  const [l, m] = ["l", "m"].map((id) => lay.lines.find((x) => x.id === id));
  assert.ok(Math.abs(l.dir[0] * m.dir[1] - l.dir[1] * m.dir[0]) < 1e-6);
  assert.equal(lay.parallel.length, 2, "矢じるしが2本の直線に1つずつ");
  // 平行でない直線に平行の印を付けると警告
  const bad = clone(q);
  bad.figure.points.M2 = [300, 180];
  assert.match(G.audit(bad).warnings.join(), /平行のはずの直線が平行に描かれていません/);
});

test("4. 直角の印は 90° で描く（ちがえば警告）", () => {
  const fig = { type: "geometry", points: { A: [40, 40], H: [40, 160], C: [220, 160] }, segments: [["A", "H"], ["H", "C"]], right: [{ at: "H", from: "A", to: "C" }] };
  assert.deepEqual(G.audit({ figure: fig }).warnings.filter((w) => !/relation/.test(w)), []);
  assert.match(G.render(fig), /geo-right/);
  const bad = clone(fig);
  bad.points.A = [70, 40];
  assert.match(G.audit({ figure: bad }).warnings.join(), /直角の印のある角が 90° に描かれていません/);
});

test("5・6. ラベルは図の外にはみ出さず、ラベルどうしが大きく重ならない", () => {
  for (const q of GEO) {
    const lay = G.layout(q.figure), v = lay.view;
    lay.labels.forEach((l) => {
      const b = l.box;
      assert.ok(b.x >= v.x - 0.5 && b.y >= v.y - 0.5 && b.x + b.w <= v.x + v.w + 0.5 && b.y + b.h <= v.y + v.h + 0.5, q.id + " 「" + l.text + "」");
    });
    for (let i = 0; i < lay.labels.length; i++) for (let j = i + 1; j < lay.labels.length; j++) {
      const a = lay.labels[i].box, b = lay.labels[j].box;
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      const r = w > 0 && h > 0 ? (w * h) / Math.min(a.w * a.h, b.w * b.h) : 0;
      assert.ok(r <= G.CONFIG.OVERLAP, q.id + "「" + lay.labels[i].text + "」と「" + lay.labels[j].text + "」");
    }
  }
  // 文字を大きくしすぎると、重なりを見つける
  const big = clone(Q["polygonInterior-basic-1"]);
  big.figure.fontSize = 40;
  assert.match(G.audit(big).warnings.join(), /ラベルが重なっています/);
  // 余白をなくすと、はみ出しを見つける
  const tight = clone(Q["lineAngles-basic-1"]);
  tight.figure.margin = 0;
  assert.match(G.audit(tight).warnings.join(), /はみ出しています/);
});

test("7. relation で答えを検算できる（type ごとに処理を分ける）", () => {
  for (const q of GEO) assert.ok(G.verifyRelation(q).ok, q.id + " " + G.verifyRelation(q).messages);
  assert.equal(G.verifyRelation(Q["angleEq-standard-1"]).value, 50);
  assert.equal(G.verifyRelation(Q["exteriorAngle-basic-1"]).value, 120);
  // 答えをまちがえて登録すると見つかる
  const bad = clone(Q["triangleSum-basic-1"]);
  bad.steps[0].answer = 75;
  assert.match(G.verifyRelation(bad).messages.join(), /relationとanswerが一致しません/);
  // 未対応の type は止める
  assert.equal(G.verifyRelation({ answer: 1, relation: { type: "congruence" } }).ok, false);
  // 例：多角形の外角（正多角形の1つの外角 40° → n = 9）
  assert.equal(G.verifyRelation({ answer: 9, relation: { type: "polygonExterior", n: "answer", each: 40 } }).value, 9);
  assert.deepEqual(Object.keys(G.RELATIONS).sort(), ["angleSum", "equalAngles", "polygonExterior", "polygonInterior"]);
});

test("説明文：SVG だけにたよらず、図に何があるかを文章にする", () => {
  const d = G.describe(Q["parallelAngles-basic-1"].figure);
  assert.match(d, /直線ℓとmは平行です/);
  assert.match(d, /角Pは72°、角Qはxです/);
  assert.match(d, /図は正確とは限りません/);
  assert.match(G.describe(Q["triangleSum-basic-1"].figure), /三角形ABCがあります/);
  assert.match(G.describe(Q["angleEq-standard-1"].figure), /点A、O、Bは一直線上にあります/);
  const html = G.render(Q["triangleSum-basic-1"].figure);
  assert.match(html, /role="img" aria-label="三角形ABC/);
  assert.match(html, /<figcaption class="fig-note">図は正確とは限りません<\/figcaption>/);
});

test("スマホ幅：viewBox で縮み、横幅は文字が小さくなりすぎない大きさ。線は細くならない", () => {
  for (const q of GEO) {
    const v = G.layout(q.figure).view;
    assert.ok(v.w <= G.CONFIG.MAX_WIDTH, q.id + " 幅 " + v.w);
    // 320px の画面（左右の余白をのぞいて約 290px）でも、14 の文字が 10px 以上
    assert.ok(G.CONFIG.FONT * 290 / v.w >= 10, q.id);
    const html = G.render(q.figure);
    assert.match(html, /viewBox="/);
    assert.match(html, /vector-effect="non-scaling-stroke"/);
  }
});

test("図形②用：等しい辺・等しい角の印をデータで書ける", () => {
  const fig = { type: "geometry", points: { A: [150, 40], B: [60, 200], C: [240, 200] }, polygons: [["A", "B", "C"]],
    equalSides: [{ segments: [["A", "B"], ["A", "C"]], marks: 1 }],
    angles: [{ id: "b", at: "B", from: "A", to: "C", label: "" }, { id: "c", at: "C", from: "A", to: "B", label: "" }],
    equalAngles: [{ angles: ["b", "c"], marks: 2 }] };
  const lay = G.layout(fig);
  assert.equal(lay.ticks.length, 2);
  assert.ok(lay.angles.every((a) => a.arcs === 2));
  assert.equal((G.render(fig).match(/class="geo-arc/g) || []).length, 4);
  assert.match(G.describe(fig), /ABとACの長さは等しいです/);
});

test("答え方：「65」「65°」「x = 65」「65度」はどれも正解", () => {
  const st = Q["triangleSum-basic-1"].steps[0];
  ["65", "65°", "x = 65", "65度", "６５"].forEach((v) => assert.ok(L.check(st, v), v));
  assert.ok(!L.check(st, "55"));
});

test("データ → 回答 → 記録：角度の小問は value、根拠の小問は reason として別々に育つ（4パターン）", () => {
  const q = Q["parallelAngles-basic-1"];
  const T0 = Date.parse("2026-10-01T07:00:00Z");
  let n = 0;
  function answer(values) {
    const res = L.checkSteps(q, values);
    return q.steps.map((st, i) => E.makeAnswerRecord({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, unit: q.unit, aspect: st.aspect },
      { status: res[i].correct ? "correct" : "incorrect", chosen: res[i].chosen, confusion: res[i].correct ? null : G.confusionOf(st, res[i].chosen) },
      { userId: "u", now: T0 + (++n) * 6e6 }));
  }
  // 角度 ○ / 根拠 ×（錯角と取り違え）
  const h = answer({ s1: "72", s2: "alternate" });
  assert.equal(h[0].aspect, "value");
  assert.equal(h[1].aspect, "reason");
  assert.equal(h[1].chosen, "alternate");
  assert.equal(h[1].confusion, "alternate_for_corresponding");
  const s = E.computeSkillStates(h, { now: T0 + 1e8 }).parallelAngles;
  assert.equal(s.value.correct, 1);
  assert.equal(s.reason.correct, 0);
  assert.deepEqual(s.reason.confusions, { alternate_for_corresponding: 1 });
  assert.equal(s.overall.reason_practice, true, "reason 練習を今日の候補へ");
  assert.equal(s.learning_status, "understood", "理由がまだでも、角度を求める力の状態は下げない");
  assert.deepEqual(E.geometryRoute(true, false), { trail: null, reason_practice: true });
});
