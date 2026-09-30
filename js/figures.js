/*
 * Study Compass — 問題の図（表・グラフ・数直線）をデータから描く
 * 画像は使わない。問題データの数値から SVG / HTML を組み立てるので、
 * 「グラフの線が本当にその点を通るか」をテストで確かめられる。
 * 色は CSS のクラス（.fig-*）で付ける（夜空テーマに合わせる）。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // 表示用の数（マイナスは全角の − にする）
  function num(n) {
    if (n === null || n === undefined) return "?";
    if (typeof n === "string") return n;
    var s = Math.round(n * 1000) / 1000;
    return s < 0 ? "−" + String(-s) : String(s);
  }

  // ---------- 表 ----------
  // { type: "table", rows: [{ label: "x", values: [..] }, { label: "y", values: [.., null] }] }  null は「?」
  function table(fig) {
    return '<div class="fig fig-table-wrap"><table class="fig-table">' + fig.rows.map(function (r) {
      return "<tr><th>" + esc(r.label) + "</th>" + r.values.map(function (v) {
        return v === null ? '<td class="blank">?</td>' : "<td>" + esc(num(v)) + "</td>";
      }).join("") + "</tr>";
    }).join("") + "</table></div>";
  }

  // ---------- グラフ ----------
  // { type: "graph", x: [min, max, 目盛り], y: [min, max, 目盛り],
  //   lines: [{ a, b, from?, to? }], points: [{ x, y, label?, coords? }], xLabel?, yLabel? }
  function graph(fig) {
    var W = 280, H = 280, pad = 30;
    var xs = fig.x, ys = fig.y;
    var xStep = xs[2] || 1, yStep = ys[2] || 1;
    var sx = (W - pad * 2) / (xs[1] - xs[0]);
    var sy = (H - pad * 2) / (ys[1] - ys[0]);
    function px(x) { return pad + (x - xs[0]) * sx; }
    function py(y) { return H - pad - (y - ys[0]) * sy; }
    var out = [];
    var x, y;
    // 方眼
    for (x = xs[0]; x <= xs[1] + 1e-9; x += xStep) out.push('<line class="fig-grid" x1="' + px(x) + '" y1="' + py(ys[0]) + '" x2="' + px(x) + '" y2="' + py(ys[1]) + '"/>');
    for (y = ys[0]; y <= ys[1] + 1e-9; y += yStep) out.push('<line class="fig-grid" x1="' + px(xs[0]) + '" y1="' + py(y) + '" x2="' + px(xs[1]) + '" y2="' + py(y) + '"/>');
    // 軸（0 が範囲外なら端に置く）
    var ax = Math.min(Math.max(0, xs[0]), xs[1]);
    var ay = Math.min(Math.max(0, ys[0]), ys[1]);
    out.push('<line class="fig-axis" x1="' + px(xs[0]) + '" y1="' + py(ay) + '" x2="' + (px(xs[1]) + 8) + '" y2="' + py(ay) + '"/>');
    out.push('<line class="fig-axis" x1="' + px(ax) + '" y1="' + py(ys[0]) + '" x2="' + px(ax) + '" y2="' + (py(ys[1]) - 8) + '"/>');
    // x 軸の名前は、右端の少し上に右寄せで置く（長い名前でもはみ出さない）
    out.push('<text class="fig-text axis-name" x="' + (px(xs[1]) + 6) + '" y="' + (py(ay) - 6) + '" text-anchor="end">' + esc(fig.xLabel || "x") + "</text>");
    out.push('<text class="fig-text axis-name" x="' + (px(ax) - 4) + '" y="' + (py(ys[1]) - 12) + '" text-anchor="middle">' + esc(fig.yLabel || "y") + "</text>");
    // 目盛りの数（多すぎるときは間引く）
    var xEvery = Math.ceil(((xs[1] - xs[0]) / xStep) / 10), yEvery = Math.ceil(((ys[1] - ys[0]) / yStep) / 10);
    var i = 0;
    for (x = xs[0]; x <= xs[1] + 1e-9; x += xStep, i++) {
      if (Math.abs(x) < 1e-9 || i % xEvery) continue;
      out.push('<text class="fig-text tick" x="' + px(x) + '" y="' + (py(ay) + 13) + '" text-anchor="middle">' + num(x) + "</text>");
    }
    i = 0;
    for (y = ys[0]; y <= ys[1] + 1e-9; y += yStep, i++) {
      if (Math.abs(y) < 1e-9 || i % yEvery) continue;
      out.push('<text class="fig-text tick" x="' + (px(ax) - 5) + '" y="' + (py(y) + 4) + '" text-anchor="end">' + num(y) + "</text>");
    }
    out.push('<text class="fig-text tick" x="' + (px(ax) - 5) + '" y="' + (py(ay) + 13) + '" text-anchor="end">O</text>');
    // 直線（表示範囲で切り取る）
    (fig.lines || []).forEach(function (l) {
      var x1 = Math.max(xs[0], l.from !== undefined ? l.from : -Infinity);
      var x2 = Math.min(xs[1], l.to !== undefined ? l.to : Infinity);
      if (l.a !== 0) {
        var xa = (ys[0] - l.b) / l.a, xb = (ys[1] - l.b) / l.a;
        x1 = Math.max(x1, Math.min(xa, xb));
        x2 = Math.min(x2, Math.max(xa, xb));
      }
      if (x2 <= x1) return;
      out.push('<line class="fig-line" x1="' + px(x1) + '" y1="' + py(l.a * x1 + l.b) + '" x2="' + px(x2) + '" y2="' + py(l.a * x2 + l.b) + '"/>');
    });
    // 点
    (fig.points || []).forEach(function (p) {
      out.push('<circle class="fig-point" cx="' + px(p.x) + '" cy="' + py(p.y) + '" r="4.5"/>');
      var label = (p.label || "") + (p.coords ? "(" + num(p.x) + ", " + num(p.y) + ")" : "");
      if (!label) return;
      // 右端に近い点は、ラベルを左側に出す（見切れ防止）
      var nearRight = px(p.x) + 7 + label.length * 6.5 > W - 4;
      var nearTop = py(p.y) - 7 < 12;
      out.push('<text class="fig-text point-label" x="' + (nearRight ? px(p.x) - 7 : px(p.x) + 7) + '" y="' + (nearTop ? py(p.y) + 16 : py(p.y) - 7) + '"' +
        (nearRight ? ' text-anchor="end"' : "") + ">" + esc(label) + "</text>");
    });
    return '<div class="fig fig-graph"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="グラフ">' + out.join("") + "</svg></div>";
  }

  // ---------- 数直線 ----------
  // { type: "numberline", from, to, marks: [{ x, label }] }
  function numberline(fig) {
    var W = 320, H = 70, pad = 18;
    var s = (W - pad * 2) / (fig.to - fig.from);
    function px(x) { return pad + (x - fig.from) * s; }
    var out = ['<line class="fig-axis" x1="' + pad + '" y1="40" x2="' + (W - pad + 6) + '" y2="40"/>'];
    for (var x = fig.from; x <= fig.to; x++) {
      out.push('<line class="fig-axis" x1="' + px(x) + '" y1="35" x2="' + px(x) + '" y2="45"/>');
      out.push('<text class="fig-text tick" x="' + px(x) + '" y="60" text-anchor="middle">' + num(x) + "</text>");
    }
    (fig.marks || []).forEach(function (m) {
      out.push('<circle class="fig-point" cx="' + px(m.x) + '" cy="40" r="5"/>');
      out.push('<text class="fig-text point-label" x="' + px(m.x) + '" y="24" text-anchor="middle">' + esc(m.label) + "</text>");
    });
    return '<div class="fig fig-numberline"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="数直線">' + out.join("") + "</svg></div>";
  }

  function render(fig) {
    if (!fig) return "";
    if (fig.type === "table") return table(fig);
    if (fig.type === "graph") return graph(fig);
    if (fig.type === "numberline") return numberline(fig);
    return "";
  }

  SC.figures = { render: render, num: num };
})(typeof window !== "undefined" ? window : globalThis);
