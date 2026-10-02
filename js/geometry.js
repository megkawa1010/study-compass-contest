/*
 * Study Compass — 図形の問題図（共通の geometry renderer）
 *
 * 問題データの figure（type: "geometry"）から SVG を組み立てる。画像ファイルは使わない。
 * 平行線と角・三角形・多角形のほか、合同・証明（図形②）や中1平面図形でもそのまま使う。
 *
 * figure の形（座標は SVG と同じく右が x、下が y。単位はおおよそ画面の px）
 *   points:   { A: [x, y], P: { intersect: [線, 線] }, D: { along: ["B", "C", 1.4] } }
 *             線は直線の id か ["点", "点"]。along は B から C の向きに BC の 1.4 倍進んだ点
 *   lines:    [{ id: "l", through: ["L1", "L2"], label: "ℓ", extend: 24 }]   … 両はしをのばした直線
 *   segments: [["A", "B"], { from: "A", to: "B", label: "5cm", dashed: true }]
 *   polygons: [["A", "B", "C"]]                                          … 閉じた多角形（三角形ABC など）
 *   parallel: [{ lines: ["l", "m"], marks: 1 }]                           … 平行の矢じるし
 *   angles:   [{ id: "x", at: "Q", from: "M2", to: "T1", label: "x", unknown: true },
 *              { id: "a", at: "P", from: "L2", to: "T1", value: 72 },     … label は省略すると「72°」
 *              { id: "e", at: "O", from: "A", to: "C", expr: { a: 2, b: 10 } }]  … (2x+10)°
 *   right:    [{ at: "H", from: "A", to: "C" }]                           … 直角の印（必ず 90° に描く）
 *   equalSides:  [{ segments: [["A", "B"], ["A", "C"]], marks: 1 }]       … 等しい辺の印（図形②用）
 *   equalAngles: [{ angles: ["b", "c"], marks: 2 }]                       … 等しい角の印（図形②用）
 *   straight: [["B", "C", "D"]]                                           … 一直線上にある点（検査用）
 *   highlight:[{ angle: "x" }, { segment: ["A", "B"] }, { line: "t" }]
 *   labels:   ["A", "B"]（省略すると、名前が大文字1文字の点にだけ名前と点を描く）
 *   note:     false で「図は正確とは限りません」を出さない
 *
 * 図から答えが分からないようにする（js/geometry.js の audit と tests/geometry.test.js で確かめる）
 *   - 与えた角度・答えの角度と、描いた角度は 8° 以上ずらす（直角だけは 90° のまま）
 *   - 鋭角・直角・鈍角の分類は変えない
 *   - 平行・一直線・直角の条件はこわさない
 *
 * relation（答えの検算）：問題ごとの論理関係を、答え x の1次式として解いて確かめる
 *   { type: "angleSum", values: [55, "answer", 60], total: 180 }         … 和が total
 *   { type: "equalAngles", source: "a", target: "answer" }                … 図の角 a の値 ＝ 答え
 *   { type: "polygonInterior", n: 5, sum: "answer" }                      … 180 ×（n − 2）＝ 和
 *   { type: "polygonExterior", n: "answer", each: 40 }                    … 正多角形：1つの外角 × n ＝ 360
 *   項は 数 / "answer" / { a, b }（a × 答え ＋ b）/ 図の角の id。配列にすると全部を確かめる。
 *   relation.answer に小問の id を書くと、その小問の答えを「答え」とする。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});

  var CONFIG = {
    MIN_GAP: 8,            // 与えた角度・答えと、描いた角度の最低限のずれ（度）
    FONT: 14,              // ラベルの文字の大きさ（viewBox の単位）
    MARGIN: 24,            // 図形のまわりの余白
    POINT_GAP: 7,          // 点とその名前のすきま
    ARC: 18,               // 角の弧の半径
    MAX_WIDTH: 400,        // これより横に広い図は、スマホで文字が小さくなりすぎる
    OVERLAP: 0.25          // ラベルどうしが、小さいほうの面積のこの割合より重なったら警告
  };
  var NOTE = "図は正確とは限りません";

  // 根拠のことば（各スキルの reason 面で使う）。key は記録に残す
  var REASONS = {
    vertical: "対頂角は等しい",
    straight: "一直線の角は180°",
    around: "1点のまわりの角は360°",
    corresponding: "平行線の同位角は等しい",
    alternate: "平行線の錯角は等しい",
    triangleSum: "三角形の内角の和は180°",
    exterior: "三角形の外角は、となり合わない2つの内角の和に等しい",
    polygonSum: "n角形の内角の和は 180° ×（n − 2）",
    exteriorSum: "多角形の外角の和は360°",
    auxParallel: "平行な補助線を引くと、錯角が等しい"
  };
  // まちがえた根拠から、取り違えの種類を作る（例：同位角と答えるべきところで錯角 → "alternate_for_corresponding"）
  function confusionOf(step, chosen) {
    if (!step || step.aspect !== "reason" || chosen == null || chosen === "" || chosen === step.answer) return null;
    if (step.confusions && step.confusions[chosen]) return step.confusions[chosen];
    return chosen + "_for_" + step.answer;
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function r1(n) { return Math.round(n * 10) / 10; }

  // ---------- ベクトル ----------
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k]; }
  function len(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1]); }
  function unit(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l]; }
  function cross(a, b) { return a[0] * b[1] - a[1] * b[0]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
  function dirAngle(v) { return Math.atan2(v[1], v[0]); }
  // 中心から、見た目で反時計回りに deg 度（右が 0°、上が 90°）の向きへ r 進んだ点。問題データを作るときに使う
  function polar(c, deg, r) {
    var t = deg * Math.PI / 180;
    return [r1(c[0] + r * Math.cos(t)), r1(c[1] - r * Math.sin(t))];
  }
  // 2本の直線（点の組）の交点
  function intersect(p1, p2, p3, p4) {
    var d1 = sub(p2, p1), d2 = sub(p4, p3);
    var den = cross(d1, d2);
    if (Math.abs(den) < 1e-9) return null;
    var t = cross(sub(p3, p1), d2) / den;
    return add(p1, mul(d1, t));
  }
  // 2本の向きのなす角（0〜180°）
  function between(u, v) {
    var c = dot(unit(u), unit(v));
    return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
  }

  // ---------- 点を決める ----------
  function resolvePoints(fig) {
    var pts = {}, raw = fig.points || {}, lineById = {};
    (fig.lines || []).forEach(function (l) { lineById[l.id] = l; });
    function pair(ref) {
      if (typeof ref === "string") { var l = lineById[ref]; return [get(l.through[0]), get(l.through[1])]; }
      return [get(ref[0]), get(ref[1])];
    }
    var busy = {};
    function get(name) {
      if (pts[name]) return pts[name];
      var d = raw[name];
      if (!d) throw new Error("図の点 " + name + " がありません");
      if (busy[name]) throw new Error("図の点 " + name + " の定義が循環しています");
      busy[name] = true;
      var p;
      if (Array.isArray(d)) p = d.slice();
      else if (d.intersect) { var a = pair(d.intersect[0]), b = pair(d.intersect[1]); p = intersect(a[0], a[1], b[0], b[1]); }
      else if (d.along) { var s = get(d.along[0]), e = get(d.along[1]); p = add(s, mul(sub(e, s), d.along[2])); }
      if (!p) throw new Error("図の点 " + name + " が決まりません");
      return (pts[name] = p);
    }
    Object.keys(raw).forEach(get);
    return pts;
  }

  // ---------- 文字の大きさの見積もり ----------
  function textWidth(s, fs) {
    var w = 0;
    String(s).split("").forEach(function (ch) {
      if (/[°'’()]/.test(ch)) w += 0.38;
      else if (/[ℓ]/.test(ch)) w += 0.5;
      else if (/[ -~]/.test(ch)) w += 0.6;
      else w += 1;
    });
    return w * fs;
  }
  function box(cx, cy, text, fs) { var w = textWidth(text, fs) + 2, h = fs + 2; return { x: cx - w / 2, y: cy - h / 2, w: w, h: h }; }
  function overlapArea(a, b) {
    var w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    var h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return w > 0 && h > 0 ? w * h : 0;
  }
  function overlapRatio(a, b) { return overlapArea(a, b) / Math.min(a.w * a.h, b.w * b.h); }

  // 向き u が角（頂点から u1・u2 の2本の辺）の内側にあるか
  function interiorSide(w) {
    var c = cross(w.u1, w.u2);
    if (Math.abs(c) > 1e-6) return c > 0 ? 1 : -1;
    var b = w.bis || [w.u1[1], -w.u1[0]];
    return cross(w.u1, b) > 0 ? 1 : -1;
  }
  function dirInWedge(u, w) {
    var s = interiorSide(w);
    return cross(w.u1, u) * s > 0 && cross(u, w.u2) * s > 0;
  }
  // ラベルの四すみが、すべて角の内側にあり、2本の辺から margin 以上はなれているか
  function inWedge(b, w, margin) {
    var s = interiorSide(w);
    return [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].every(function (c) {
      var v = sub(c, w.vertex);
      return cross(w.u1, v) * s >= margin && cross(v, w.u2) * s >= margin;
    });
  }

  // ---------- 角の表示名 ----------
  function angleText(a) {
    if (a.label != null) return a.label;
    if (a.unknown) return "x";
    if (a.expr) return a.expr.b ? "(" + exprText(a.expr) + ")°" : exprText(a.expr) + "°";
    if (a.value != null) return a.value + "°";
    return "";
  }
  function exprText(e) {
    var s = (e.a === 1 ? "" : e.a === -1 ? "−" : e.a) + "x";
    if (e.b) s += (e.b > 0 ? "+" : "−") + Math.abs(e.b);
    return s;
  }
  function angleName(fig, a) {
    var same = (fig.angles || []).filter(function (b) { return b.at === a.at; }).length;
    return same > 1 || !/^[A-Z]$/.test(a.at) ? "∠" + a.from + a.at + a.to : "角" + a.at;
  }

  // ---------- 配置（描く前に、線・弧・ラベルの位置をすべて決める） ----------
  function layout(fig) {
    var P = resolvePoints(fig);
    var C = CONFIG, fs = fig.fontSize || C.FONT;
    var labelNames = fig.labels || Object.keys(fig.points || {}).filter(function (k) { return /^[A-Z]'?$/.test(k); });
    var out = { points: P, lines: [], segments: [], polygons: [], angles: [], right: [], parallel: [], ticks: [], labels: [] };

    // 直線：通る2点から、両はしを extend だけのばす
    (fig.lines || []).forEach(function (l) {
      var a = P[l.through[0]], b = P[l.through[1]], d = unit(sub(b, a));
      var ex = l.extend == null ? 24 : l.extend;
      var e0 = Array.isArray(ex) ? ex[0] : ex, e1 = Array.isArray(ex) ? ex[1] : ex;
      out.lines.push({ id: l.id, label: l.label, p1: sub(a, mul(d, e0)), p2: add(b, mul(d, e1)), dir: d, dashed: !!l.dashed });
    });
    function segOf(s) { return Array.isArray(s) ? { from: s[0], to: s[1] } : s; }
    (fig.segments || []).forEach(function (s) {
      s = segOf(s);
      out.segments.push({ from: s.from, to: s.to, p1: P[s.from], p2: P[s.to], label: s.label, dashed: !!s.dashed });
    });
    (fig.polygons || []).forEach(function (pg) { out.polygons.push({ names: pg, pts: pg.map(function (n) { return P[n]; }) }); });

    // 図形の範囲（ラベルを除く）→ viewBox
    var xs = [], ys = [];
    function addPt(p) { xs.push(p[0]); ys.push(p[1]); }
    out.lines.forEach(function (l) { addPt(l.p1); addPt(l.p2); });
    out.segments.forEach(function (s) { addPt(s.p1); addPt(s.p2); });
    out.polygons.forEach(function (pg) { pg.pts.forEach(addPt); });
    labelNames.forEach(function (n) { if (P[n]) addPt(P[n]); });
    var m = fig.margin == null ? C.MARGIN : fig.margin;
    var minX = Math.min.apply(null, xs) - m, minY = Math.min.apply(null, ys) - m;
    out.view = { x: r1(minX), y: r1(minY), w: r1(Math.max.apply(null, xs) + m - minX), h: r1(Math.max.apply(null, ys) + m - minY) };

    // 角：弧の半径とラベルの位置（角の二等分線の上。小さい角はラベルが入る所まで外へ）
    var arcsOf = {};
    (fig.equalAngles || []).forEach(function (g) { g.angles.forEach(function (id) { arcsOf[id] = g.marks || 1; }); });
    var hl = {};
    (fig.highlight || []).forEach(function (h) { if (h.angle) hl["a:" + h.angle] = true; if (h.segment) hl["s:" + h.segment.join("")] = hl["s:" + h.segment.slice().reverse().join("")] = true; if (h.line) hl["l:" + h.line] = true; });
    out.highlight = hl;
    (fig.angles || []).forEach(function (a) {
      var v = P[a.at], u1 = unit(sub(P[a.from], v)), u2 = unit(sub(P[a.to], v));
      var deg = between(u1, u2);
      var bis = unit(add(u1, u2));
      if (len(add(u1, u2)) < 1e-6) bis = [u1[1], -u1[0]]; // 一直線（180°）のときは垂直な向き
      var text = angleText(a);
      // 同じ頂点に角がいくつかあるときは、弧の半径を交互に変える（弧がつながって1つの円に見えないように）
      var sameAt = (fig.angles || []).filter(function (b) { return b.at === a.at; }), k = sameAt.indexOf(a);
      var arc = a.radius || (deg < 40 ? C.ARC + 8 : C.ARC) + (sameAt.length > 1 ? (k % 2) * 7 : 0);
      var w = textWidth(text, fs);
      var half = Math.max(Math.sin(deg * Math.PI / 360), 0.12);
      var dist = Math.min(Math.max(arc + fs * 0.75 + 3, (w / 2 + 3) / half), 70);
      out.angles.push({ id: a.id, def: a, at: a.at, vertex: v, u1: u1, u2: u2, deg: deg, bis: bis, arc: arc, arcs: a.arcs || arcsOf[a.id] || 1,
        text: text, dist: dist, unknown: !!a.unknown, highlight: !!hl["a:" + a.id] });
    });
    (fig.right || []).forEach(function (r) {
      var v = P[r.at], u1 = unit(sub(P[r.from], v)), u2 = unit(sub(P[r.to], v));
      out.right.push({ at: r.at, vertex: v, u1: u1, u2: u2, deg: between(u1, u2) });
    });

    // ラベルを置く。角 → 点 → 直線・辺 の順。重なったら少しずらす
    var placed = [];
    function clash(b) { return placed.some(function (x) { return overlapRatio(x.box, b) > 0.05; }); }
    out.angles.forEach(function (a) {
      if (!a.text) return;
      var d = a.dist, pos, b;
      // 角の2本の辺にラベルの四すみがかからない所まで、二等分線にそって外へ
      while (d < 90) {
        pos = add(a.vertex, mul(a.bis, d));
        b = box(pos[0], pos[1], a.text, fs);
        if (inWedge(b, a, 2)) break;
        d += 2;
      }
      for (var k = 0; k < 4; k++) {
        pos = add(a.vertex, mul(a.bis, d));
        b = box(pos[0], pos[1], a.text, fs);
        if (!clash(b)) break;
        d += 8;
      }
      var L = { kind: "angle", id: a.id, text: a.text, x: pos[0], y: pos[1], box: b, unknown: a.unknown, highlight: a.highlight };
      a.label = L; placed.push(L); out.labels.push(L);
    });
    // 点の名前：その点から出る線・角のラベルの向きをさけて、いちばん広くあいている向きに置く
    labelNames.forEach(function (n) {
      var p = P[n];
      if (!p) return;
      var dirs = [];
      function ray(q) { if (q && len(sub(q, p)) > 1e-6) dirs.push(dirAngle(sub(q, p))); }
      out.lines.forEach(function (l) {
        var d = Math.abs(cross(l.dir, sub(p, l.p1)));
        if (d < 0.5) { ray(l.p1); ray(l.p2); }
      });
      out.segments.forEach(function (s) { if (s.from === n) ray(s.p2); if (s.to === n) ray(s.p1); });
      out.polygons.forEach(function (pg) {
        var i = pg.names.indexOf(n);
        if (i === -1) return;
        ray(pg.pts[(i + 1) % pg.pts.length]); ray(pg.pts[(i - 1 + pg.pts.length) % pg.pts.length]);
      });
      // その点にある角（弧・直角の印）の内側には置かない
      var wedges = out.angles.filter(function (a) { return a.at === n; }).concat(out.right.filter(function (r) { return r.at === n; }));
      var gaps = [];
      if (!dirs.length) gaps.push({ mid: -Math.PI / 4, size: 2 * Math.PI });
      else {
        dirs.sort(function (a, b) { return a - b; });
        dirs.forEach(function (d, i) {
          var next = i + 1 < dirs.length ? dirs[i + 1] : dirs[0] + 2 * Math.PI;
          if (next - d > 1e-3) gaps.push({ mid: (d + next) / 2, size: next - d });
        });
        if (!gaps.length) gaps.push({ mid: dirs[0] + Math.PI / 2, size: Math.PI });
        gaps.sort(function (a, b) { return b.size - a.size; });
        var free = gaps.filter(function (g) {
          var u = [Math.cos(g.mid), Math.sin(g.mid)];
          return !wedges.some(function (w) { return dirInWedge(u, w); });
        });
        if (free.length) gaps = free;
      }
      var L = null, bw = textWidth(n, fs) + 2, bh = fs + 2;
      for (var g = 0; g < gaps.length && g < 4; g++) {
        var u = [Math.cos(gaps[g].mid), Math.sin(gaps[g].mid)];
        var ext = Math.abs(u[0]) * bw / 2 + Math.abs(u[1]) * bh / 2;
        // せまいすき間は、名前が線にかからない所まで離す
        var need = (Math.sqrt(bw * bw + bh * bh) / 2 + 1) / Math.max(Math.sin(Math.min(gaps[g].size, Math.PI) / 2), 0.2);
        var dd = Math.min(Math.max(C.POINT_GAP + ext, need), 34);
        // 角の内側にしか置けないときは、弧の外まで離す
        if (wedges.some(function (w) { return dirInWedge(u, w); })) dd = Math.max(dd, C.ARC + 10 + ext);
        var pos = add(p, mul(u, dd));
        var b = box(pos[0], pos[1], n, fs);
        L = { kind: "point", id: n, text: n, x: pos[0], y: pos[1], box: b };
        if (!clash(b)) break;
      }
      placed.push(L); out.labels.push(L);
    });
    // 直線の名前：のばした先のはしの近く（線の右側か上側）
    out.lines.forEach(function (l) {
      if (!l.label) return;
      var nrm = [l.dir[1], -l.dir[0]];
      if (nrm[1] > 0 || (Math.abs(nrm[1]) < 1e-6 && nrm[0] < 0)) nrm = mul(nrm, -1);
      var pos = add(add(l.p2, mul(l.dir, -6)), mul(nrm, fs * 0.8));
      var b = box(pos[0], pos[1], l.label, fs);
      if (clash(b)) { pos = add(add(l.p1, mul(l.dir, 6)), mul(nrm, fs * 0.8)); b = box(pos[0], pos[1], l.label, fs); }
      var L = { kind: "line", id: l.id, text: l.label, x: pos[0], y: pos[1], box: b };
      placed.push(L); out.labels.push(L);
    });
    // 辺の長さなど：辺の中点から、図形の外側へ
    var cx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, cy = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2;
    out.segments.forEach(function (s) {
      if (!s.label) return;
      var mid = mul(add(s.p1, s.p2), 0.5), d = unit(sub(s.p2, s.p1)), nrm = [d[1], -d[0]];
      if (dot(nrm, sub(mid, [cx, cy])) < 0) nrm = mul(nrm, -1);
      var pos = add(mid, mul(nrm, fs * 0.9));
      var L = { kind: "segment", id: s.from + s.to, text: s.label, x: pos[0], y: pos[1], box: box(pos[0], pos[1], s.label, fs) };
      placed.push(L); out.labels.push(L);
    });

    // 平行の矢じるし：直線の向きをそろえて、のびた先の近くに置く
    (fig.parallel || []).forEach(function (pr) {
      var ref = null;
      pr.lines.forEach(function (id) {
        var l = out.lines.filter(function (x) { return x.id === id; })[0];
        if (!l) return;
        var d = l.dir;
        if (!ref) ref = d; else if (dot(d, ref) < 0) d = mul(d, -1);
        var t = pr.at == null ? 0.8 : pr.at;
        var c = add(l.p1, mul(sub(l.p2, l.p1), dot(d, l.dir) > 0 ? t : 1 - t));
        out.parallel.push({ line: id, center: c, dir: d, marks: pr.marks || 1 });
      });
    });
    // 等しい辺の印
    (fig.equalSides || []).forEach(function (g) {
      g.segments.forEach(function (s) {
        var a = P[s[0]], b = P[s[1]];
        out.ticks.push({ mid: mul(add(a, b), 0.5), dir: unit(sub(b, a)), marks: g.marks || 1 });
      });
    });
    out.fontSize = fs;
    return out;
  }

  // ---------- SVG ----------
  function pt(p) { return r1(p[0]) + "," + r1(p[1]); }
  function render(fig) {
    var L;
    try { L = layout(fig); } catch (e) { return '<p class="notice">図を描けませんでした：' + esc(e.message) + "</p>"; }
    var o = [], fs = L.fontSize, NS = ' vector-effect="non-scaling-stroke"';
    L.polygons.forEach(function (pg) { o.push('<polygon class="geo-shape" points="' + pg.pts.map(pt).join(" ") + '"' + NS + "/>"); });
    L.lines.forEach(function (l) {
      o.push('<line class="geo-line' + (L.highlight["l:" + l.id] ? " hl" : "") + (l.dashed ? " dashed" : "") + '" x1="' + r1(l.p1[0]) + '" y1="' + r1(l.p1[1]) + '" x2="' + r1(l.p2[0]) + '" y2="' + r1(l.p2[1]) + '"' + NS + "/>");
    });
    L.segments.forEach(function (s) {
      o.push('<line class="geo-seg' + (L.highlight["s:" + s.from + s.to] ? " hl" : "") + (s.dashed ? " dashed" : "") + '" x1="' + r1(s.p1[0]) + '" y1="' + r1(s.p1[1]) + '" x2="' + r1(s.p2[0]) + '" y2="' + r1(s.p2[1]) + '"' + NS + "/>");
    });
    // 強調する角の扇形（線の上・弧の下）
    L.angles.forEach(function (a) {
      if (!a.highlight) return;
      var r = a.arc + 4, s = add(a.vertex, mul(a.u1, r)), e = add(a.vertex, mul(a.u2, r));
      var sweep = cross(a.u1, a.u2) > 0 ? 1 : 0;
      o.push('<path class="geo-wedge" d="M' + pt(a.vertex) + " L" + pt(s) + " A" + r + " " + r + " 0 0 " + sweep + " " + pt(e) + ' Z"/>');
    });
    // 角の弧（等しい角の印は弧の本数）
    L.angles.forEach(function (a) {
      var sweep = cross(a.u1, a.u2) > 0 ? 1 : 0;
      for (var k = 0; k < a.arcs; k++) {
        var r = a.arc + k * 4, s = add(a.vertex, mul(a.u1, r)), e = add(a.vertex, mul(a.u2, r));
        o.push('<path class="geo-arc' + (a.unknown ? " unk" : "") + (a.highlight ? " hl" : "") + '" d="M' + pt(s) + " A" + r + " " + r + " 0 0 " + sweep + " " + pt(e) + '"' + NS + "/>");
      }
    });
    L.right.forEach(function (r) {
      var s = 10, a = add(r.vertex, mul(r.u1, s)), b = add(a, mul(r.u2, s)), c = add(r.vertex, mul(r.u2, s));
      o.push('<polyline class="geo-right" points="' + pt(a) + " " + pt(b) + " " + pt(c) + '"' + NS + "/>");
    });
    L.parallel.forEach(function (p) {
      var n = [p.dir[1], -p.dir[0]];
      for (var k = 0; k < p.marks; k++) {
        var tip = add(p.center, mul(p.dir, k * 6 + 4));
        var back = sub(tip, mul(p.dir, 6));
        o.push('<polyline class="geo-mark" points="' + pt(add(back, mul(n, 5))) + " " + pt(tip) + " " + pt(sub(back, mul(n, 5))) + '"' + NS + "/>");
      }
    });
    L.ticks.forEach(function (t) {
      var n = [t.dir[1], -t.dir[0]];
      for (var k = 0; k < t.marks; k++) {
        var c = add(t.mid, mul(t.dir, (k - (t.marks - 1) / 2) * 4));
        o.push('<line class="geo-mark" x1="' + r1(c[0] + n[0] * 6) + '" y1="' + r1(c[1] + n[1] * 6) + '" x2="' + r1(c[0] - n[0] * 6) + '" y2="' + r1(c[1] - n[1] * 6) + '"' + NS + "/>");
      }
    });
    L.labels.forEach(function (l) {
      if (l.kind === "point") o.push('<circle class="geo-dot" cx="' + r1(L.points[l.id][0]) + '" cy="' + r1(L.points[l.id][1]) + '" r="2.6"/>');
    });
    L.labels.forEach(function (l) {
      o.push('<text class="geo-text ' + l.kind + (l.unknown ? " unk" : "") + (l.highlight ? " hl" : "") + '" x="' + r1(l.x) + '" y="' + r1(l.y) + '" font-size="' + fs + '" text-anchor="middle" dominant-baseline="central">' + esc(l.text) + "</text>");
    });
    var desc = describe(fig);
    var v = L.view;
    return '<figure class="fig fig-geometry"><svg viewBox="' + v.x + " " + v.y + " " + v.w + " " + v.h + '" role="img" aria-label="' + esc(desc) + '" style="max-width:' + Math.round(Math.min(v.w * 1.15, 380)) + 'px">' + o.join("") + "</svg>" +
      (fig.note === false ? "" : '<figcaption class="fig-note">' + esc(fig.note || NOTE) + "</figcaption>") + "</figure>";
  }

  // ---------- 説明文（SVG だけにたよらない） ----------
  var SHAPE = { 3: "三角形", 4: "四角形", 5: "五角形", 6: "六角形", 7: "七角形", 8: "八角形" };
  function describe(fig) {
    var s = [];
    var lines = (fig.lines || []).filter(function (l) { return l.label; });
    if (lines.length) s.push("直線" + lines.map(function (l) { return l.label; }).join("、") + "があります。");
    (fig.parallel || []).forEach(function (p) {
      var names = p.lines.map(function (id) { var l = (fig.lines || []).filter(function (x) { return x.id === id; })[0]; return l && l.label || id; });
      s.push("直線" + names.join("と") + "は平行です。");
    });
    (fig.polygons || []).forEach(function (pg) { s.push((SHAPE[pg.length] || pg.length + "角形") + pg.join("") + "があります。"); });
    var names = fig.labels || Object.keys(fig.points || {}).filter(function (k) { return /^[A-Z]'?$/.test(k); });
    if (names.length && !(fig.polygons || []).length) s.push("点" + names.join("、") + "があります。");
    var segs = (fig.segments || []).map(function (x) { return Array.isArray(x) ? x : [x.from, x.to]; });
    if (segs.length) s.push("線分" + segs.map(function (x) { return x.join(""); }).join("、") + "が引かれています。");
    (fig.straight || []).forEach(function (st) { s.push("点" + st.join("、") + "は一直線上にあります。"); });
    // 記号だけの角（a〜h など）は、記号をまとめて伝える
    var marks = (fig.angles || []).filter(function (a) { return a.label && a.value == null && !a.expr && !a.unknown && !a.answer; });
    if (marks.length) s.push("角に記号 " + marks.map(function (a) { return a.label; }).join("、") + " がついています。");
    var ang = (fig.angles || []).filter(function (a) { return marks.indexOf(a) === -1 && angleText(a); }).map(function (a) {
      return angleName(fig, a) + "は" + angleText(a);
    });
    if (ang.length) s.push(ang.join("、") + "です。");
    (fig.right || []).forEach(function (r) { s.push("∠" + r.from + r.at + r.to + "は直角です。"); });
    (fig.equalSides || []).forEach(function (g) { s.push(g.segments.map(function (x) { return x.join(""); }).join("と") + "の長さは等しいです。"); });
    (fig.equalAngles || []).forEach(function (g) {
      s.push(g.angles.map(function (id) { var a = (fig.angles || []).filter(function (x) { return x.id === id; })[0]; return a ? angleName(fig, a) : id; }).join("と") + "は等しいです。");
    });
    if (fig.note !== false) s.push(NOTE + "。");
    return s.join("");
  }

  // ---------- relation の検算 ----------
  // 項は「a × 答え ＋ b」で表す。
  //   数 / "answer" / { a, b } / { ref: 項, k: 係数 }（k × 項。例：180 − 外角 は [180, { ref: "e", k: -1 }]）/ 図の角の id
  // 角の id は、その角の値（value）・式（expr）・答え（unknown、または answer: "小問id"）として読む。
  // mode "drawn" のときは、角の id と「答え」を、描いた角度（度）として読む（図の上でも関係が成り立つかを確かめる）
  function Unresolvable(msg) { this.message = msg; }
  function lin(a, b) { return { a: a, b: b }; }
  function plus(x, y) { return lin(x.a + y.a, x.b + y.b); }
  function scale(x, k) { return lin(x.a * k, x.b * k); }
  function times(x, y) {
    if (x.a && y.a) throw new Error("relation が答えの2次式になっています");
    return x.a ? scale(x, y.b) : scale(y, x.b);
  }
  function angleById(fig, id) { return (fig && fig.angles || []).filter(function (x) { return x.id === id; })[0]; }
  function stepAnswer(q, id) { var st = (q.steps || []).filter(function (x) { return x.id === id; })[0]; return st ? st.answer : null; }
  // relation と結びついた角（その relation の答えが、この角の大きさ）
  function boundAngle(q, rel, idx, count) {
    var fig = q.figure;
    if (!fig) return null;
    return (fig.angles || []).filter(function (a) {
      if (a.answer) return a.answer === rel.answer;
      return a.unknown && idx === count - 1;
    })[0] || null;
  }
  function makeTerm(q, rel, idx, count, mode, drawn) {
    var fig = q.figure;
    function t(x) {
      if (typeof x === "number") return lin(0, x);
      if (x === "answer") {
        if (mode !== "drawn") return lin(1, 0);
        var b = boundAngle(q, rel, idx, count);
        if (!b) throw new Unresolvable("答えが図の角ではない");
        return lin(0, drawn[b.id]);
      }
      if (x && typeof x === "object" && "ref" in x) return scale(t(x.ref), x.k == null ? 1 : x.k);
      // { of: "s1", a, b }：小問 s1 の答えを使った値（a × s1の答え ＋ b）
      if (x && typeof x === "object" && "of" in x) {
        if (mode === "drawn") throw new Unresolvable("小問の答えの式");
        return lin(0, (x.a == null ? 1 : x.a) * stepAnswer(q, x.of) + (x.b || 0));
      }
      if (x && typeof x === "object" && "a" in x) {
        if (mode === "drawn") throw new Unresolvable("答えの式");
        return lin(x.a, x.b || 0);
      }
      if (typeof x === "string") {
        var a = angleById(fig, x);
        if (!a) throw new Error("relation の項 " + x + " が図の角にありません");
        if (mode === "drawn") return lin(0, drawn[a.id]);
        var mine = boundAngle(q, rel, idx, count);
        if (mine && mine.id === a.id) return lin(1, 0);
        if (a.answer) return lin(0, stepAnswer(q, a.answer));
        if (a.unknown) return lin(1, 0);
        if (a.expr) return lin(a.expr.a, a.expr.b || 0);
        if (a.value == null) throw new Error("角 " + x + " に値がありません");
        return lin(0, a.value);
      }
      throw new Error("relation の項が読めません：" + JSON.stringify(x));
    }
    return t;
  }
  // relation.type ごとに「左辺 ＝ 右辺」を作る。新しい関係はここに足す
  var RELATIONS = {
    angleSum: function (r, t) { return [r.values.map(t).reduce(plus, lin(0, 0)), t(r.total)]; },
    equalAngles: function (r, t) { return [t(r.source), t(r.target)]; },
    polygonInterior: function (r, t) { return [plus(scale(t(r.n), 180), lin(0, -360)), t(r.sum)]; },
    polygonExterior: function (r, t) { return [times(t(r.each), t(r.n)), lin(0, 360)]; }
  };
  function answerOf(q, rel) { return rel && rel.answer && q.steps ? stepAnswer(q, rel.answer) : q.answer; }
  // 返り値：{ ok, value（最後の relation から求めた答え）, byAnswer: { 小問id: 値 }, expected, messages }
  function verifyRelation(q) {
    var list = q.relation ? [].concat(q.relation) : [];
    var res = { ok: true, value: null, expected: null, byAnswer: {}, messages: [] };
    if (!list.length) { res.ok = false; res.messages.push("relation がありません"); return res; }
    list.forEach(function (rel, idx) {
      var fn = RELATIONS[rel.type];
      if (!fn) { res.ok = false; res.messages.push("relation.type「" + rel.type + "」は未対応です"); return; }
      var expected = answerOf(q, rel);
      res.expected = expected;
      try {
        var eq = fn(rel, makeTerm(q, rel, idx, list.length, "value")), d = lin(eq[0].a - eq[1].a, eq[0].b - eq[1].b);
        if (Math.abs(d.a) < 1e-9) {
          if (Math.abs(d.b) > 1e-9) { res.ok = false; res.messages.push(rel.type + "：式が成り立ちません"); }
          return;
        }
        var x = Math.round(-d.b / d.a * 1e6) / 1e6;
        res.value = x;
        res.byAnswer[rel.answer || "_"] = x;
        if (typeof expected !== "number" || Math.abs(x - expected) > 1e-6) { res.ok = false; res.messages.push("relationとanswerが一致しません（relation " + x + "／答え " + expected + "）"); }
      } catch (e) { res.ok = false; res.messages.push(e.message); }
    });
    return res;
  }

  // ---------- 角の位置関係（同位角・錯角・対頂角） ----------
  // 角の2本の辺が、それぞれどの直線にのっているか
  function raysOf(L, a) {
    return [a.u1, a.u2].map(function (u) {
      var line = L.lines.filter(function (l) { return Math.abs(cross(l.dir, sub(a.vertex, l.p1))) < 0.6 && Math.abs(cross(l.dir, u)) < 2e-3; })[0];
      return { u: u, line: line ? line.id : null };
    });
  }
  function same(u, v) { return dot(u, v) > 0.9995; }
  function opposite(u, v) { return dot(u, v) < -0.9995; }
  // 2つの角の関係：vertical（対頂角）/ linear（となり合って一直線）/ corresponding（同位角）/ alternate（錯角）/ cointerior（同側内角）/ null
  function relationKindOf(L, a, b) {
    if (len(sub(a.vertex, b.vertex)) < 0.6) {
      if ((opposite(a.u1, b.u1) && opposite(a.u2, b.u2)) || (opposite(a.u1, b.u2) && opposite(a.u2, b.u1))) return "vertical";
      var pairs = [[a.u1, a.u2], [a.u2, a.u1]], other = [[b.u1, b.u2], [b.u2, b.u1]];
      for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) if (same(pairs[i][0], other[j][0]) && opposite(pairs[i][1], other[j][1])) return "linear";
      return null;
    }
    var ra = raysOf(L, a), rb = raysOf(L, b);
    // 2つの頂点を通る直線（横切る直線）
    var tA = ra.filter(function (r) { return r.line && rb.some(function (s) { return s.line === r.line; }); })[0];
    if (!tA) return null;
    var tB = rb.filter(function (r) { return r.line === tA.line; })[0];
    var lA = ra.filter(function (r) { return r !== tA; })[0], lB = rb.filter(function (r) { return r !== tB; })[0];
    if (!lA.line || !lB.line || lA.line === lB.line) return null;
    var t = L.lines.filter(function (l) { return l.id === tA.line; })[0].dir;
    var ref = L.lines.filter(function (l) { return l.id === lA.line; })[0].dir;
    var tSideA = dot(tA.u, t) > 0, tSideB = dot(tB.u, t) > 0;
    var lSideA = dot(lA.u, ref) > 0, lSideB = dot(lB.u, ref) > 0;
    var inA = dot(tA.u, sub(b.vertex, a.vertex)) > 0, inB = dot(tB.u, sub(a.vertex, b.vertex)) > 0;
    if (tSideA === tSideB && lSideA === lSideB) return "corresponding";
    if (inA && inB) return lSideA === lSideB ? "cointerior" : "alternate";
    return null;
  }
  var KIND_NAME = { vertical: "対頂角", linear: "となり合って一直線の角", corresponding: "同位角", alternate: "錯角", cointerior: "同側内角" };
  function angleKind(fig, idA, idB) {
    var L = layout(fig);
    var a = L.angles.filter(function (x) { return x.id === idA; })[0], b = L.angles.filter(function (x) { return x.id === idB; })[0];
    return a && b ? relationKindOf(L, a, b) : null;
  }

  // ---------- 図そのものの数学的な整合性（描いた角度どうしの関係） ----------
  // 「数値は本当の値とちがうが、図形としての関係は正しい」ことを確かめる
  //   - 多角形：描いた内角の和 ＝ (n − 2) × 180°
  //   - 同じ頂点の角：対頂角は等しい・となり合って一直線の角の和は 180°（外角と隣の内角もこれ）
  //   - 平行な2直線と横切る直線：同位角・錯角は等しい・同側内角の和は 180°
  //   - relation を、描いた角度で読んでも成り立つ（例：三角形の3つの角・外角 ＝ となり合わない内角の和）
  function consistency(q, L) {
    var fig = q.figure, checks = [];
    function chk(name, ok, detail) { checks.push({ name: name, ok: ok, detail: detail }); }
    (fig.polygons || []).forEach(function (pg) {
      var n = pg.length, sum = 0;
      pg.forEach(function (name, i) {
        var v = L.points[name], p = L.points[pg[(i - 1 + n) % n]], nx = L.points[pg[(i + 1) % n]];
        sum += between(sub(p, v), sub(nx, v));
      });
      chk((SHAPE[n] || n + "角形") + pg.join("") + "の内角の和", Math.abs(sum - (n - 2) * 180) < 0.5, r1(sum) + "° ／ " + (n - 2) * 180 + "°");
    });
    var parallelPairs = {};
    (fig.parallel || []).forEach(function (p) { p.lines.forEach(function (x) { p.lines.forEach(function (y) { if (x !== y) parallelPairs[x + "|" + y] = true; }); }); });
    for (var i = 0; i < L.angles.length; i++) for (var j = i + 1; j < L.angles.length; j++) {
      var a = L.angles[i], b = L.angles[j], k = relationKindOf(L, a, b);
      if (!k) continue;
      if (k === "corresponding" || k === "alternate" || k === "cointerior") {
        var la = raysOf(L, a).map(function (r) { return r.line; }), lb = raysOf(L, b).map(function (r) { return r.line; });
        var isPar = la.some(function (x) { return lb.some(function (y) { return parallelPairs[x + "|" + y]; }); });
        if (!isPar) continue;
      }
      var sum = k === "linear" || k === "cointerior";
      var ok = sum ? Math.abs(a.deg + b.deg - 180) < 0.5 : Math.abs(a.deg - b.deg) < 0.5;
      chk(KIND_NAME[k] + "（" + a.text + "・" + b.text + "）" + (sum ? "の和は180°" : "は等しい"), ok, r1(a.deg) + "° と " + r1(b.deg) + "°");
    }
    var drawn = {};
    L.angles.forEach(function (a) { drawn[a.id] = a.deg; });
    var list = q.relation ? [].concat(q.relation) : [];
    list.forEach(function (rel, idx) {
      var fn = RELATIONS[rel.type];
      if (!fn) return;
      try {
        var eq = fn(rel, makeTerm(q, rel, idx, list.length, "drawn", drawn));
        chk("図の上の relation（" + rel.type + "）", Math.abs(eq[0].b - eq[1].b) < 0.5, r1(eq[0].b) + " ＝ " + r1(eq[1].b));
      } catch (e) { if (!(e instanceof Unresolvable)) throw e; }
    });
    return checks;
  }

  // ---------- 図から答えが分からないか・図がこわれていないか ----------
  function kind(deg) { return Math.abs(deg - 90) < 0.5 ? "right" : deg < 90 ? "acute" : deg < 180 - 0.5 ? "obtuse" : "straight"; }
  var KIND_JA = { right: "直角", acute: "鋭角", obtuse: "鈍角", straight: "一直線" };
  // 返り値：{ angles: [{ id, label, drawn, truth, diff, role, ok }], checks: [{ name, ok, detail }], warnings: [], relation }
  function audit(q) {
    var fig = q.figure, out = { angles: [], checks: [], warnings: [], relation: null };
    var rel = q.relation ? verifyRelation(q) : null;
    out.relation = rel;
    if (rel && !rel.ok) rel.messages.forEach(function (m) { out.warnings.push(m); });
    if (!fig || fig.type !== "geometry") return out;
    var L;
    try { L = layout(fig); } catch (e) { out.warnings.push("図を描けません：" + e.message); return out; }
    var list = q.relation ? [].concat(q.relation) : [];
    var last = rel ? rel.byAnswer[(list[list.length - 1] || {}).answer || "_"] : null;
    if (last == null && list.length && typeof answerOf(q, list[list.length - 1]) === "number") last = answerOf(q, list[list.length - 1]);
    // 式で表した角（(2x + 10)° など）の x は、最初の relation の答え
    var first = rel && list.length ? rel.byAnswer[list[0].answer || "_"] : null;
    if (first == null && list.length && typeof answerOf(q, list[0]) === "number") first = answerOf(q, list[0]);
    // 1・2. 角ごとに、ほんとうの値と描いた角度をくらべる
    L.angles.forEach(function (a) {
      var d = a.def, truth = null, role = "given";
      if (d.answer) { truth = rel && rel.byAnswer[d.answer] != null ? rel.byAnswer[d.answer] : stepAnswer(q, d.answer); role = "answer"; }
      else if (d.unknown) { truth = last; role = "answer"; }
      else if (d.expr) { truth = first == null ? null : d.expr.a * first + (d.expr.b || 0); role = "answer"; }
      else if (d.value != null) truth = d.value;
      var row = { id: a.id, label: a.text, drawn: r1(a.deg), truth: truth, diff: truth == null ? null : r1(Math.abs(a.deg - truth)), role: role, ok: true };
      if (truth != null) {
        if (truth === 90) {
          if (kind(a.deg) !== "right") { row.ok = false; out.warnings.push(a.text + "：90°の角は直角に描いてください（いま " + r1(a.deg) + "°）"); }
        } else {
          if (kind(a.deg) !== kind(truth)) { row.ok = false; out.warnings.push(a.text + "：" + KIND_JA[kind(truth)] + "なのに" + KIND_JA[kind(a.deg)] + "に描いています"); }
          if (Math.abs(a.deg - truth) < CONFIG.MIN_GAP) {
            row.ok = false;
            out.warnings.push((role === "answer" ? "答えと描画角度が近すぎます" : "与えた角度と描画角度が近すぎます") + "（" + a.text + "：描画 " + r1(a.deg) + "°／本当 " + truth + "°）");
          }
        }
      }
      out.angles.push(row);
    });
    // 図形としての整合性
    out.checks = consistency(q, L);
    out.checks.forEach(function (c) { if (!c.ok) out.warnings.push("図の上で成り立っていません：" + c.name + "（" + c.detail + "）"); });
    // 角の位置の問題（同位角はどれ？など）：答えの角だけがその位置にある
    if (q.position) {
      var byId = {};
      L.angles.forEach(function (a) { byId[a.id] = a; });
      // with があれば「2つの角の関係の名前」を答える問題（答え＝関係の名前）。なければ「その位置の角はどれ」（答え＝角）
      var withId = q.position.with, expectKind = q.position.kind || q.answer;
      var of = byId[q.position.of], ans = byId[withId || q.answer];
      if (!of || !ans) out.warnings.push("position の角が図にありません");
      else {
        var k = relationKindOf(L, of, ans);
        out.checks.push({ name: "「" + of.text + "」と「" + ans.text + "」は" + KIND_NAME[expectKind], ok: k === expectKind, detail: KIND_NAME[k] || "関係なし" });
        if (k !== expectKind) out.warnings.push("答えの角が「" + KIND_NAME[expectKind] + "」の位置にありません（" + (KIND_NAME[k] || "関係なし") + "）");
        if (!withId) (q.choices || []).forEach(function (c) {
          if (c.key === q.answer || !byId[c.key]) return;
          if (relationKindOf(L, of, byId[c.key]) === expectKind) out.warnings.push("答え以外の選択肢「" + c.label + "」も" + KIND_NAME[expectKind] + "になっています");
        });
      }
    }
    // 3. 平行
    (fig.parallel || []).forEach(function (p) {
      var ls = p.lines.map(function (id) { return L.lines.filter(function (l) { return l.id === id; })[0]; });
      if (ls.some(function (l) { return !l; })) { out.warnings.push("平行の指定に、ない直線があります"); return; }
      for (var i = 1; i < ls.length; i++) if (Math.abs(cross(ls[0].dir, ls[i].dir)) > Math.sin(0.3 * Math.PI / 180)) out.warnings.push("平行のはずの直線が平行に描かれていません（" + p.lines.join("・") + "）");
    });
    // 4. 直角
    L.right.forEach(function (r) { if (Math.abs(r.deg - 90) > 0.3) out.warnings.push("直角の印のある角が 90° に描かれていません（" + r.at + "：" + r1(r.deg) + "°）"); });
    // 一直線
    (fig.straight || []).forEach(function (st) {
      var a = L.points[st[0]], b = L.points[st[st.length - 1]];
      st.slice(1, -1).forEach(function (n) { if (Math.abs(cross(unit(sub(b, a)), sub(L.points[n], a))) > 0.5) out.warnings.push("一直線のはずの点がずれています（" + st.join("") + "）"); });
    });
    // 角のラベルが、その角の辺にかかっていない
    L.angles.forEach(function (a) { if (a.label && !inWedge(a.label.box, a, 0)) out.warnings.push("角のラベル「" + a.text + "」が辺にかかっています"); });
    // 5. ラベルが図の外にはみ出さない
    var v = L.view;
    L.labels.forEach(function (l) {
      var b = l.box;
      if (b.x < v.x - 0.5 || b.y < v.y - 0.5 || b.x + b.w > v.x + v.w + 0.5 || b.y + b.h > v.y + v.h + 0.5) out.warnings.push("ラベル「" + l.text + "」が図の外にはみ出しています");
    });
    // 6. ラベルどうしが大きく重ならない
    for (var i = 0; i < L.labels.length; i++) for (var j = i + 1; j < L.labels.length; j++) {
      if (overlapRatio(L.labels[i].box, L.labels[j].box) > CONFIG.OVERLAP) out.warnings.push("ラベルが重なっています（「" + L.labels[i].text + "」と「" + L.labels[j].text + "」）");
    }
    if (v.w > CONFIG.MAX_WIDTH) out.warnings.push("図の横幅が広すぎて、スマホで文字が小さくなります（" + v.w + "）");
    return out;
  }

  SC.geometry = { CONFIG: CONFIG, NOTE: NOTE, REASONS: REASONS, RELATIONS: RELATIONS, polar: polar, layout: layout, render: render, describe: describe,
    verifyRelation: verifyRelation, audit: audit, angleKind: angleKind, confusionOf: confusionOf, kind: kind };
})(typeof window !== "undefined" ? window : globalThis);
