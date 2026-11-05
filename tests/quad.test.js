// node --test tests/*.test.js — 中2 三角形と四角形：答えの計算・図・選択肢の確かめ
const test = require("node:test");
const assert = require("node:assert/strict");
["questions", "logic", "engine", "bank", "geometry", "figures", "proof", "compass", "rootcause", "planner", "testprep"].forEach((f) => require("../js/" + f + ".js"));
const { SC } = globalThis;
const E = SC.engine, Q = SC.QUESTIONS, C = SC.compass, B = SC.bank, G = SC.geometry;
const SK = ["isoProps", "isoCond", "rightCong", "paraProps", "paraCond", "specialQuad", "areaEq"];
const all = Object.values(Q).filter((q) => q.unit === "三角形と四角形");

const base = (apex) => (180 - apex) / 2, apex = (b) => 180 - 2 * b, third = (a, b) => 180 - a - b;
const ratio = (total, m, n) => (total * m) / (m + n);
// 問題 id（小問は id#s1）→ 図形の性質から計算した値
const EXPECT = {
  "isoProps-basic-1": base(40), "isoProps-basic-2": apex(65), "isoProps-basic-3": base(100),
  "isoProps-standard-1": apex(38), "isoProps-standard-2": base(56), "isoProps-standard-3": 180 / 3, "isoProps-standard-4": 110 / 2, "isoProps-standard-5": 10 / 2,
  "isoProps-application-1#s1": base(36), "isoProps-application-1#s2": base(36) / 2, "isoProps-application-1#s3": third(base(36) / 2, base(36)),
  "isoProps-application-2#s1": 180 - 130, "isoProps-application-2#s2": 180 - 130, "isoProps-application-2#s3": apex(50),
  "isoProps-application-3#s1": base(40), "isoProps-application-3#s2": base(40), "isoProps-application-3#s3": apex(base(40)),
  "isoProps-retention-1": base(24), "isoProps-retention-2": apex(72), "isoProps-retention-3": 180 / 4, "isoProps-retention-4": 140 / 2,
  "isoCond-basic-3": third(40, 70), "isoCond-retention-2": third(34, 73),
  "isoCond-application-1#s1": third(52, 64), "isoCond-application-1#s3": 7, "isoCond-application-2#s1": third(90, 45), "isoCond-application-4#s1": third(36, 72), "isoCond-application-4#s3": 9,
  "paraProps-basic-1": 70, "paraProps-basic-2": 180 - 65, "paraProps-basic-3": 6, "paraProps-basic-4": 14 / 2, "paraProps-basic-6": 9,
  "paraProps-standard-1": 112, "paraProps-standard-2": 180 - 124, "paraProps-standard-3": 2 * (5 + 8), "paraProps-standard-4": ratio(180, 2, 3), "paraProps-standard-5": 18 / 2,
  "paraProps-application-1#s1": 180 - 110, "paraProps-application-1#s2": (180 - 110) / 2, "paraProps-application-1#s3": 6,
  "paraProps-application-2#s1": 30 / 2, "paraProps-application-2#s2": 30 / 2 - 6, "paraProps-application-2#s3": 30 / 2 - 6,
  "paraProps-application-3#s1": 180, "paraProps-application-3#s2": ratio(180, 4, 5), "paraProps-application-3#s3": ratio(180, 4, 5),
  "paraProps-retention-1": 58, "paraProps-retention-2": 180 - 133, "paraProps-retention-3": 22 / 2, "paraProps-retention-4": 2 * (7 + 12), "paraProps-retention-5": ratio(180, 1, 5),
  "paraCond-standard-4": 7 - 3, "paraCond-standard-5": (70 - 10) / 2, "paraCond-retention-4": (13 + 2) / 3, "paraCond-application-4#s1": 360 - 110 - 70 - 110, "paraCond-application-4#s3": 5,
  "specialQuad-application-1#s1": 5 * 4, "specialQuad-application-1#s2": 70, "specialQuad-application-1#s3": 90,
  "specialQuad-application-2#s1": 10, "specialQuad-application-2#s2": 5, "specialQuad-application-2#s3": 5,
  "specialQuad-application-3#s1": 90, "specialQuad-application-3#s2": base(90), "specialQuad-application-3#s3": 8 / 2,
  "specialQuad-retention-2": 16 / 2, "specialQuad-retention-3": 36 / 4, "specialQuad-retention-5": base(64),
  "areaEq-basic-2": 15, "areaEq-basic-5": 40 / 2, "areaEq-standard-1": 30 - 18, "areaEq-standard-3": 48 / 2, "areaEq-standard-4": ratio(36, 1, 2),
  "areaEq-application-1#s1": 24, "areaEq-application-1#s2": 24 - 9, "areaEq-application-1#s3": 24 - (24 - 9),
  "areaEq-application-2#s1": 60 / 2, "areaEq-application-2#s2": 60 / 4, "areaEq-application-2#s3": 60 / 2,
  "areaEq-application-3#s1": ratio(40, 2, 3), "areaEq-application-3#s2": ratio(40, 3, 2), "areaEq-application-3#s3": ratio(40, 3, 2) - ratio(40, 2, 3),
  "areaEq-retention-2": 27, "areaEq-retention-3": 70 / 2, "areaEq-retention-4": ratio(56, 3, 4), "areaEq-retention-5": 42 - 25
};

test("数の答えは、図形の性質から計算した値と一致する。数の問題はすべて確かめる", () => {
  Object.entries(EXPECT).forEach(([key, want]) => {
    const [id, st] = key.split("#");
    assert.ok(Q[id], id + " がない");
    const q = st ? Q[id].steps.find((s) => s.id === st) : Q[id];
    assert.equal(q.answer, want, key);
  });
  all.forEach((q) => (q.steps || [q]).filter((s) => s.type === "number").forEach((s) => {
    const key = q.steps ? q.id + "#" + s.id : q.id;
    assert.ok(key in EXPECT, key + " を確かめていない");
  }));
});

test("図：警告なし（答えと描いた角度がずれている・はみ出さない・ラベルが重ならない）。relation で検算できる", () => {
  all.filter((q) => q.figure).forEach((q) => {
    const a = G.audit(q);
    assert.deepEqual(a.warnings, [], q.id);
    assert.ok(!/NaN|undefined|Infinity/.test(G.render(q.figure)), q.id);
  });
  assert.ok(all.filter((q) => q.relation).length >= 13);
});

test("証明の穴うめ：穴の数と小問の数が同じ。根拠の文字が正しい三角形を指す", () => {
  const list = all.filter((q) => q.proof_sheet);
  assert.equal(list.length, 6);
  list.forEach((q) => {
    const holes = q.proof_sheet.join("").match(/［\d］/g) || [];
    assert.equal(new Set(holes).size, q.steps.length, q.id);
    q.steps.forEach((s) => assert.ok(s.choices.some((c) => c.key === s.answer), q.id));
  });
  // 証明の図：直角の印は本当に直角（図の点から計算）
  ["rightCong-application-1", "rightCong-application-2", "rightCong-application-3"].forEach((id) => {
    assert.ok(Q[id].figure.right.length >= 1);
    assert.deepEqual(G.audit(Q[id]).warnings, [], id);
  });
  // 平行四辺形の図：E は BD 上、F は BD 上、BE ＝ DF
  const p = Q["paraCond-application-1"].figure.points;
  const onBD = (P) => Math.abs((p.D[0] - p.B[0]) * (P[1] - p.B[1]) - (p.D[1] - p.B[1]) * (P[0] - p.B[0])) < 1e-9;
  assert.ok(onBD(p.E) && onBD(p.F) && onBD(p.O));
  assert.equal(Math.hypot(p.E[0] - p.B[0], p.E[1] - p.B[1]), Math.hypot(p.F[0] - p.D[0], p.F[1] - p.D[1]));
});

test("角のリストの選択問題：正解だけが内角の和180°で、2つの角が等しい", () => {
  const isIso = (s) => { const a = s.match(/\d+/g).map(Number); return a.reduce((x, y) => x + y, 0) === 180 && new Set(a).size < 3; };
  ["isoCond-basic-4", "isoCond-retention-1"].forEach((id) => {
    const q = Q[id];
    q.choices.forEach((c) => assert.equal(isIso(c.label), c.key === q.answer, id + " " + c.label));
  });
});

test("「いつでも平行四辺形」の問題：∠D を計算すると条件に合う", () => {
  const d = 360 - 100 - 80 - 100;
  assert.equal(d, 80);
  assert.equal(Q["paraCond-standard-1"].choices.find((c) => c.key === Q["paraCond-standard-1"].answer).label, "∠A ＝ 100°、∠B ＝ 80°、∠C ＝ 100°");
});

test("三角形と四角形の単元：教科書の順・前提は先に来る・問題数・はじめのチェック", () => {
  assert.deepEqual(E.SELECTABLE_UNITS, ["式の計算", "連立方程式", "一次関数", "図形の角", "合同と証明", "三角形と四角形", "確率", "データの活用"]);
  assert.deepEqual(E.UNITS["三角形と四角形"], SK);
  SK.forEach((k) => {
    E.SKILLS[k].prerequisites.forEach((p) => assert.ok(E.ROOT_ORDER.indexOf(p) < E.ROOT_ORDER.indexOf(k), k + " より前に " + p));
    assert.ok(B.index[k].basic.length >= 5 && B.index[k].standard.length >= 5 && B.index[k].application.length >= 3 && B.index[k].retention.length >= 5, k);
  });
  const c = C.unitCheck("三角形と四角形");
  assert.equal(c.questions.length, 5);
  assert.ok(new Set(c.chosen.map((x) => x.skill)).size >= 4);
});

test("定着の問題は、同じスキルの問題と同じ文・同じ答えの組にならない", () => {
  all.filter((q) => q.level === "retention").forEach((r) => {
    all.filter((o) => o.skill === r.skill && o.id !== r.id && o.type !== "steps").forEach((o) => {
      assert.ok(!(r.text === o.text && r.answer === o.answer && JSON.stringify(r.figure) === JSON.stringify(o.figure)), r.id + " と " + o.id);
    });
  });
});
