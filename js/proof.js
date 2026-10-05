/*
 * Study Compass — 証明エンジン（図形②：合同と証明）
 *
 * 証明を「1本の正誤」にしない。証明は行の並びで、各行が
 *   role（役割）：hyp_fact 仮定 / figure_fact 図から使える事実 / condition 合同条件 / use 合同から言えること
 *   claim（主張）：{ eq: ["AB", "DC"] } / { eq: ["∠ABC", "∠DCB"] } / { cong: ["ABC", "DCB"] }（△ABC ≡ △DCB、頂点の順に対応）
 *   reason（根拠）：hypothesis 仮定 / common 共通 / vertical 対頂角 / alternate 錯角 / corresponding 同位角 /
 *                   SSS・SAS・ASA（合同条件）/ congruent_parts（合同な図形の対応する辺・角）
 *   depends_on：先に必要な行
 * を持つ。
 *
 *   verify(q)        … 証明データそのものが正しいか（仮定にあるか・共通／対頂角／錯角が図の上で本当にそうか・
 *                      合同条件のパターン・依存関係に循環がないか・描いた図で等しいか）
 *   orderCheck(q, o) … 並べかえの採点。見本と同じ順番かではなく、depends_on を壊していないか
 *   entry(q, results)… 診断の入口。最初に止まった行の役割と、選んだ答えの種類（kind）で決める
 */
(function (root) {
  var SC = (root.SC = root.SC || {});
  var E = SC.engine;

  var ROLE_SKILL = { hyp_fact: "proofHypConc", figure_fact: "proofFigureFacts", condition: "congCond", use: "congUse" };
  var ROLE_JA = { hyp_fact: "仮定", figure_fact: "図から使える事実", condition: "合同条件", use: "合同から言えること" };
  // 根拠が図形①の性質のとき、さかのぼる図形①のスキル（同じ概念のスキルは作らない）
  var BASIS_SKILL = { vertical: "lineAngles", alternate: "parallelAngles", corresponding: "parallelAngles" };
  var COND_JA = { SSS: "3組の辺がそれぞれ等しい", SAS: "2組の辺とその間の角がそれぞれ等しい", ASA: "1組の辺とその両端の角がそれぞれ等しい" };

  // ---------- 辺・角の名前 ----------
  function part(name) {
    name = String(name);
    if (name.charAt(0) === "∠") return { kind: "angle", v: name.charAt(2), ends: [name.charAt(1), name.charAt(3)] };
    return { kind: "seg", ends: [name.charAt(0), name.charAt(1)] };
  }
  function sameSet(a, b) { return a.length === b.length && a.every(function (x) { return b.indexOf(x) !== -1; }); }
  function claimText(c) {
    if (c.cong) return "△" + c.cong[0] + " ≡ △" + c.cong[1];
    if (c.eq) return c.eq[0] + " ＝ " + c.eq[1];
    if (c.parallel) return c.parallel[0] + " // " + c.parallel[1];
    return "";
  }
  function sameClaim(a, b) {
    if (a.eq && b.eq) return (a.eq[0] === b.eq[0] && a.eq[1] === b.eq[1]) || (a.eq[0] === b.eq[1] && a.eq[1] === b.eq[0]);
    if (a.parallel && b.parallel) return sameSet(a.parallel, b.parallel);
    if (a.cong && b.cong) return a.cong[0] === b.cong[0] && a.cong[1] === b.cong[1];
    return false;
  }
  // △ABC ≡ △DCB の対応（A→D、B→C、C→B）
  function mapOf(cong) { var m = {}; for (var i = 0; i < 3; i++) m[cong[0].charAt(i)] = cong[1].charAt(i); return m; }
  function inTri(p, tri) { return (p.kind === "angle" ? p.ends.concat(p.v) : p.ends).every(function (x) { return tri.indexOf(x) !== -1; }); }
  // x（△1の辺・角）と y（△2の辺・角）が対応しているか
  function corresponds(x, y, m) {
    if (x.kind !== y.kind) return false;
    if (x.kind === "seg") return sameSet(x.ends.map(function (k) { return m[k]; }), y.ends);
    return m[x.v] === y.v && sameSet(x.ends.map(function (k) { return m[k]; }), y.ends);
  }
  // 等式 eq が合同 cong の対応する部分どうしか。{ ok, kind: "seg"|"angle", p1（△1側） }
  function pairUnder(eq, cong) {
    var a = part(eq[0]), b = part(eq[1]), m = mapOf(cong);
    if (inTri(a, cong[0]) && inTri(b, cong[1]) && corresponds(a, b, m)) return { ok: true, kind: a.kind, p1: a };
    if (inTri(b, cong[0]) && inTri(a, cong[1]) && corresponds(b, a, m)) return { ok: true, kind: b.kind, p1: b };
    return { ok: false };
  }

  // ---------- 図の上の値 ----------
  function geo(fig) { return SC.geometry.layout(fig); }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function len(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1]); }
  function unit(v) { var l = len(v) || 1; return [v[0] / l, v[1] / l]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1]; }
  function cross(a, b) { return a[0] * b[1] - a[1] * b[0]; }
  function measure(L, name) {
    var p = part(name), P = L.points;
    if (p.kind === "seg") return len(sub(P[p.ends[0]], P[p.ends[1]]));
    var u = unit(sub(P[p.ends[0]], P[p.v])), w = unit(sub(P[p.ends[1]], P[p.v]));
    return Math.acos(Math.max(-1, Math.min(1, dot(u, w)))) * 180 / Math.PI;
  }
  function rays(L, name) { var p = part(name), P = L.points; return [unit(sub(P[p.ends[0]], P[p.v])), unit(sub(P[p.ends[1]], P[p.v]))]; }
  function sameDir(u, v) { return dot(u, v) > 0.9995; }
  function oppDir(u, v) { return dot(u, v) < -0.9995; }
  function equalDrawn(L, eq) {
    var a = measure(L, eq[0]), b = measure(L, eq[1]);
    return part(eq[0]).kind === "seg" ? Math.abs(a - b) <= Math.max(a, b) * 0.01 : Math.abs(a - b) < 0.5;
  }
  // 根拠が図の上で成り立つか
  function basisHolds(L, line, proof) {
    var e = line.claim.eq, a = part(e[0]), b = part(e[1]);
    if (line.reason === "common") {
      if (a.kind === "seg") return sameSet(a.ends, b.ends);
      if (a.v !== b.v) return false;
      var ra = rays(L, e[0]), rb = rays(L, e[1]);
      return (sameDir(ra[0], rb[0]) && sameDir(ra[1], rb[1])) || (sameDir(ra[0], rb[1]) && sameDir(ra[1], rb[0]));
    }
    if (a.kind !== "angle") return false;
    var r1 = rays(L, e[0]), r2 = rays(L, e[1]);
    if (line.reason === "vertical") return a.v === b.v && ((oppDir(r1[0], r2[0]) && oppDir(r1[1], r2[1])) || (oppDir(r1[0], r2[1]) && oppDir(r1[1], r2[0])));
    if (line.reason === "alternate" || line.reason === "corresponding") {
      if (!(proof.hyp || []).concat(proof.given || []).some(function (h) { return h.parallel; })) return false;
      var P = L.points, t = unit(sub(P[b.v], P[a.v]));
      // 横切る直線にのる辺（t）と、平行線にのる辺
      var ta = r1.filter(function (r) { return Math.abs(cross(r, t)) < 1e-3; })[0], oa = r1.filter(function (r) { return Math.abs(cross(r, t)) >= 1e-3; })[0];
      var tb = r2.filter(function (r) { return Math.abs(cross(r, t)) < 1e-3; })[0], ob = r2.filter(function (r) { return Math.abs(cross(r, t)) >= 1e-3; })[0];
      if (!ta || !tb || !oa || !ob || Math.abs(cross(oa, ob)) > 1e-3) return false;
      if (line.reason === "alternate") return oppDir(oa, ob) && dot(ta, t) > 0 && dot(tb, t) < 0;
      return sameDir(oa, ob) && sameDir(ta, tb);
    }
    return false;
  }
  // 合同条件のパターン：3つの等しさが、対応する部分どうしで、条件の形になっているか
  function conditionHolds(cond, eqs, cong) {
    var pairs = eqs.map(function (e) { return pairUnder(e, cong); });
    if (pairs.some(function (p) { return !p.ok; })) return { ok: false, why: "対応していない辺・角がまざっている" };
    var segs = pairs.filter(function (p) { return p.kind === "seg"; }).map(function (p) { return p.p1; });
    var angs = pairs.filter(function (p) { return p.kind === "angle"; }).map(function (p) { return p.p1; });
    if (cond === "SSS") return { ok: segs.length === 3, why: "3組の辺ではない" };
    if (cond === "SAS") {
      if (segs.length !== 2 || angs.length !== 1) return { ok: false, why: "2組の辺と1組の角ではない" };
      var shared = segs[0].ends.filter(function (x) { return segs[1].ends.indexOf(x) !== -1; })[0];
      return { ok: !!shared && angs[0].v === shared, why: "角が2辺の間にない（2辺と、その間でない角）" };
    }
    if (cond === "ASA") {
      if (segs.length !== 1 || angs.length !== 2) return { ok: false, why: "1組の辺と2組の角ではない" };
      return { ok: sameSet(angs.map(function (x) { return x.v; }), segs[0].ends), why: "角が辺の両端にない" };
    }
    return { ok: false, why: "合同条件ではない" };
  }

  // ---------- 証明データの検証 ----------
  function verify(q) {
    var pr = q.proof, out = { ok: true, messages: [], checks: [] };
    function chk(name, ok, detail) { out.checks.push({ name: name, ok: ok, detail: detail || "" }); if (!ok) { out.ok = false; out.messages.push(name + (detail ? "（" + detail + "）" : "")); } }
    if (!pr || !pr.lines) { out.ok = false; out.messages.push("proof がありません"); return out; }
    var byId = {};
    pr.lines.forEach(function (l) { if (byId[l.id]) chk("行の id が重複", false, l.id); byId[l.id] = l; });
    // 依存関係：あるか・循環しないか
    pr.lines.forEach(function (l) { (l.depends_on || []).forEach(function (d) { if (!byId[d]) chk("depends_on の行がない", false, l.id + "→" + d); }); });
    var state = {};
    function dfs(id) {
      if (state[id] === 1) return false;
      if (state[id] === 2) return true;
      state[id] = 1;
      var ok = (byId[id].depends_on || []).every(function (d) { return !byId[d] || dfs(d); });
      state[id] = 2;
      return ok;
    }
    chk("依存関係に循環がない", pr.lines.every(function (l) { return dfs(l.id); }));
    var L = null;
    try { L = q.figure ? geo(q.figure) : null; } catch (e) { chk("図が描ける", false, e.message); }
    if (q.figure) checkMarks(q.figure, pr, chk);
    pr.lines.forEach(function (l) {
      var name = l.id + "（" + ROLE_JA[l.role] + "：" + claimText(l.claim) + "）";
      if (l.role === "hyp_fact") chk(name + " は仮定にある", (pr.hyp || []).some(function (h) { return sameClaim(h, l.claim); }) && l.reason === "hypothesis");
      if (l.role === "figure_fact") {
        chk(name + " は仮定ではない", !(pr.hyp || []).some(function (h) { return sameClaim(h, l.claim); }));
        if (L) chk(name + " の根拠（" + l.reason + "）が図の上で成り立つ", basisHolds(L, l, pr));
      }
      if (l.role === "condition") {
        var deps = (l.depends_on || []).map(function (d) { return byId[d]; }).filter(Boolean);
        chk(name + " は3つの等しさから", deps.length === 3 && deps.every(function (d) { return d.claim.eq; }));
        var c = conditionHolds(l.reason, deps.map(function (d) { return d.claim.eq; }), l.claim.cong);
        chk(name + " の合同条件（" + l.reason + "）のパターン", c.ok, c.ok ? "" : c.why);
        if (L) {
          var t1 = l.claim.cong[0], t2 = l.claim.cong[1];
          var sides = [[0, 1], [1, 2], [0, 2]].every(function (ij) { return equalDrawn(L, [t1.charAt(ij[0]) + t1.charAt(ij[1]), t2.charAt(ij[0]) + t2.charAt(ij[1])]); });
          chk(name + " は図の上でも対応の順に合同", sides);
        }
      }
      if (l.role === "use") {
        var cond = (l.depends_on || []).map(function (d) { return byId[d]; }).filter(function (d) { return d && d.role === "condition"; })[0];
        chk(name + " は合同から（合同の行のあと）", !!cond && l.reason === "congruent_parts");
        if (cond) chk(name + " は対応する部分どうし", pairUnder(l.claim.eq, cond.claim.cong).ok);
      }
      if (L && l.claim.eq) chk(name + " は図の上でも等しい", equalDrawn(L, l.claim.eq));
    });
    // 結論は最後の行
    var last = pr.lines[pr.lines.length - 1];
    if (pr.goal) chk("最後の行が結論（" + claimText(pr.goal) + "）", sameClaim(last.claim, pr.goal));
    // 穴うめの選択肢：正解は1つ。kind（取り違えの種類）を持つ
    (q.steps || []).forEach(function (st) {
      if (!st.line) return;
      chk(st.id + " の行がある", !!byId[st.line]);
      if (st.type === "choice") chk(st.id + " の正解は選択肢に1つ", st.choices.filter(function (c) { return c.key === st.answer; }).length === 1);
      var ln = byId[st.line], right = st.choices.filter(function (c) { return c.key === st.answer; })[0];
      if (ln && right && st.part === "reason") chk(st.id + " の正解は行の根拠（" + ln.reason + "）", st.answer === ln.reason);
      if (ln && right && st.part === "claim") {
        chk(st.id + " の正解は行の主張（" + claimText(ln.claim) + "）", right.label === claimText(ln.claim));
        st.choices.forEach(function (c) { if (c !== right) chk(st.id + "：まちがいの選択肢 " + c.label + " は行の主張と別", c.label !== claimText(ln.claim)); });
      }
    });
    if (q.type === "order") chk("並べかえの見本の順番は依存関係を満たす", orderCheck(q, q.answer).ok);
    return out;
  }

  // ---------- 図の印：仮定には印がある・結論には印がない・印は仮定だけ ----------
  function samePart(x, y) {
    var a = part(x), b = part(y);
    if (a.kind !== b.kind) return false;
    return a.kind === "seg" ? sameSet(a.ends, b.ends) : a.v === b.v && sameSet(a.ends, b.ends);
  }
  function markGroups(fig) {
    var out = [], byId = {};
    (fig.angles || []).forEach(function (a) { byId[a.id] = a; });
    (fig.equalSides || []).forEach(function (g) { out.push(g.segments.map(function (s) { return s[0] + s[1]; })); });
    (fig.equalAngles || []).forEach(function (g) { out.push(g.angles.map(function (id) { var a = byId[id]; return a ? "∠" + a.from + a.at + a.to : "?"; })); });
    return out;
  }
  function eqMarked(groups, eq) {
    return groups.some(function (g) { return g.some(function (n) { return samePart(n, eq[0]); }) && g.some(function (n) { return samePart(n, eq[1]); }); });
  }
  function parallelMarked(fig, par) {
    var through = {};
    (fig.lines || []).forEach(function (l) { through[l.id] = (l.through || []).join(""); });
    var isLine = function (id, name) { return !!through[id] && sameSet(through[id].split(""), name.split("")); };
    return (fig.parallel || []).some(function (g) {
      return g.lines.length === 2 && ((isLine(g.lines[0], par[0]) && isLine(g.lines[1], par[1])) || (isLine(g.lines[0], par[1]) && isLine(g.lines[1], par[0])));
    });
  }
  function checkMarks(fig, pr, chk) {
    if (!fig || fig.type !== "geometry") return;
    var groups = markGroups(fig);
    (pr.hyp || []).forEach(function (h) {
      if (h.eq) chk("仮定 " + claimText(h) + " に図の印がある", eqMarked(groups, h.eq));
      if (h.parallel) chk("仮定 " + claimText(h) + " に平行の印がある", parallelMarked(fig, h.parallel));
    });
    if (pr.goal && pr.goal.eq) chk("結論 " + claimText(pr.goal) + " には印をつけない", !eqMarked(groups, pr.goal.eq));
    chk("図の印は仮定だけ（図からわかること・結論に印をつけない）", groups.every(function (g) {
      return g.length === 2 && (pr.hyp || []).some(function (h) { return h.eq && eqMarked([g], h.eq); });
    }) && (fig.parallel || []).length === (pr.hyp || []).filter(function (h) { return h.parallel; }).length);
  }

  // ---------- 1段階の問題・根拠だけの問題の自動検算 ----------
  //   src  … どの証明のどの行を問うか（主張の正解＝行の主張、根拠の正解＝行の根拠、選択肢の kind と行の関係）
  //   corr … 対応（正解だけが対応する辺・角・頂点）
  //   cond … 合同条件（正解＝成り立つ条件、なければ「いえない」）。need：あと1つ、sets：いえない組
  //   hc   … 仮定と結論（ask：goal 結論 / hyp 仮定ぜんぶ / hyp_one 仮定の1つ）
  var REASON_KEYS = { hypothesis: 1, common: 1, vertical: 1, alternate: 1, corresponding: 1, congruent_parts: 1, SSS: 1, SAS: 1, ASA: 1, SSA: 1 };
  function verifyStage(q) {
    var out = { ok: true, messages: [], checks: [] };
    function chk(name, ok, detail) { out.checks.push({ name: name, ok: ok, detail: detail || "" }); if (!ok) { out.ok = false; out.messages.push(name + (detail ? "（" + detail + "）" : "")); } }
    var parts = q.type === "steps" ? q.steps : [q];
    parts.forEach(function (st) {
      if (st.type !== "choice") return;
      var keys = st.choices.map(function (c) { return c.key; });
      chk((st.id || q.id) + " の正解は選択肢に1つ", keys.filter(function (k) { return k === st.answer; }).length === 1);
      chk((st.id || q.id) + " の選択肢のキーが重ならない", keys.every(function (k, i) { return keys.indexOf(k) === i; }));
    });
    if (q.reason_only) {
      chk("根拠だけの問題：記録は reason だけ（1つの選択）", q.aspect === "reason" && q.type === "choice" && q.level === "basic" && q.usage === "practice");
      chk("根拠だけの問題：正解・選択肢は根拠の名前", q.choices.every(function (c) { return REASON_KEYS[c.key]; }));
    }
    var has = false;
    if (q.src) {
      has = true;
      var pr = q.src.proof, line = pr.lines.filter(function (l) { return l.id === q.src.line; })[0];
      var v = verify({ proof: pr, figure: q.figure });
      v.checks.forEach(function (c) { chk("元の証明：" + c.name, c.ok, c.detail); });
      var cond = pr.lines.filter(function (l) { return l.role === "condition"; })[0];
      var known = pr.lines.filter(function (l) { return l.role !== "use" && l.role !== "condition"; }).map(function (l) { return l.claim; });
      parts.forEach(function (st) {
        var p = st.part || q.part || (q.reason_only ? "reason" : null), name = st.id || q.id;
        if (p === "reason") chk(name + " の正解は行の根拠（" + line.reason + "）", st.answer === line.reason);
        if (p !== "claim") return;
        var right = st.choices.filter(function (c) { return c.key === st.answer; })[0];
        // 合同から言えることの行は、結論の辺に限らず「対応する部分どうしで、まだ分かっていなかった等しさ」なら正解にできる
        var useOk = line.role === "use" && cond && !!right && !!right.claim && !!right.claim.eq && pairUnder(right.claim.eq, cond.claim.cong).ok && !known.some(function (k) { return sameClaim(k, right.claim); });
        chk(name + " の正解は行の主張（" + claimText(line.claim) + "）" + (line.role === "use" ? "か、合同から新しく言える対応する部分" : ""), !!right && !!right.claim && (sameClaim(right.claim, line.claim) || useOk));
        st.choices.filter(function (c) { return c.key !== st.answer; }).forEach(function (c) {
          if (!c.claim) return;
          chk(name + "：まちがいの選択肢 " + c.label + " は行の主張と別", !sameClaim(c.claim, line.claim));
          if (c.kind === "already_known") chk(name + "：" + c.label + " は合同の前から分かっていること", known.some(function (k) { return sameClaim(k, c.claim); }));
          if ((c.kind === "goal_used" || c.kind === "conclusion_as_hypothesis") && c.claim.eq) chk(name + "：" + c.label + " はまだ示していないこと（仮定・図からわかることではない）", !known.some(function (k) { return sameClaim(k, c.claim); }));
          if (c.kind === "corr_shift" && c.claim.eq && cond) chk(name + "：" + c.label + " は対応していない", !pairUnder(c.claim.eq, cond.claim.cong).ok);
        });
      });
      var req = line.role === "figure_fact" && BASIS_SKILL[line.reason] ? [BASIS_SKILL[line.reason]] : [];
      if (line.role === "figure_fact") chk("required_geometry_skills が行の根拠（" + line.reason + "）と一致", sameSet(q.required_geometry_skills || [], req) && q.basis === line.reason);
      else chk("図形①へ戻らない行（required_geometry_skills なし）", !(q.required_geometry_skills || []).length);
    }
    if (q.corr) {
      has = true;
      var m = mapOf(q.corr.cong);
      q.choices.forEach(function (c) {
        var ok = c.name.length === 1 ? m[q.corr.of] === c.name : pairUnder([q.corr.of, c.name], q.corr.cong).ok;
        chk("対応：" + c.label + (c.key === q.answer ? " は対応する" : " は対応しない"), ok === (c.key === q.answer));
      });
    }
    if (q.cond) {
      has = true;
      var holds = function (eqs) { return ["SSS", "SAS", "ASA"].filter(function (k) { return conditionHolds(k, eqs, q.cond.cong).ok; }); };
      if (q.cond.need) q.choices.forEach(function (c) {
        var ok = conditionHolds(q.cond.need, q.cond.eqs.concat([c.eq]), q.cond.cong).ok;
        chk("あと1つ：" + c.label + (c.key === q.answer ? " で条件がそろう" : " ではそろわない"), ok === (c.key === q.answer));
      });
      else if (q.cond.sets) q.choices.forEach(function (c) {
        var none = !holds(c.eqs).length;
        chk("いえない組：" + c.label, none === (c.key === q.answer));
      });
      else {
        var h = holds(q.cond.eqs);
        chk("合同条件：成り立つのは " + (h.join("・") || "なし") + "、正解は " + q.answer, h.length <= 1 && (h[0] || "no") === q.answer);
      }
    }
    if (q.hc) {
      has = true;
      var inHyp = function (c) { return (q.hc.hyp || []).some(function (x) { return sameClaim(x, c); }); };
      parts.forEach(function (st) {
        if (st.part === "reason") { chk((st.id || q.id) + "：仮定の根拠は「仮定」", st.answer === "hypothesis"); return; }
        st.choices.forEach(function (c) {
          var ok = q.hc.ask === "goal" ? !!c.claim && sameClaim(c.claim, q.hc.goal)
            : q.hc.ask === "hyp_one" ? !!c.claim && inHyp(c.claim)
            : !!c.claims && c.claims.length === q.hc.hyp.length && c.claims.every(inHyp);
          chk("仮定と結論：" + c.label + (c.key === st.answer ? " が正解" : " はちがう"), ok === (c.key === st.answer));
        });
      });
    }
    if (q.use) {
      // 合同から言えること（図なし）：問う等しさが対応する部分どうしで、根拠の正解は「合同な図形の対応する辺・角」
      has = true;
      chk("合同から言えること：" + claimText({ eq: q.use.eq }) + " は対応する部分どうし", pairUnder(q.use.eq, q.use.cong).ok);
      if (q.aspect === "reason") chk("合同から言えること：根拠の正解は congruent_parts", q.answer === "congruent_parts");
    }
    if (q.manual_check) { has = true; chk("自動検算なし（理由：" + q.manual_check + "）", true); }
    chk("自動検算の方法がある（src / corr / cond / hc）", has);
    return out;
  }
  function check(q) { return q.proof ? verify(q) : verifyStage(q); }

  // ---------- 並べかえの採点（depends_on を壊していないか） ----------
  // 返り値：{ ok, violation: { line, role, missing: [先に必要な行] } | null, tag }
  function orderCheck(q, order) {
    var lines = q.proof.lines, byId = {};
    lines.forEach(function (l) { byId[l.id] = l; });
    var res = { ok: false, violation: null, tag: null };
    if (!Array.isArray(order) || order.length !== lines.length || !sameSet(order, lines.map(function (l) { return l.id; }))) { res.tag = "incomplete"; return res; }
    var seen = {};
    for (var i = 0; i < order.length; i++) {
      var l = byId[order[i]];
      var missing = (l.depends_on || []).filter(function (d) { return !seen[d]; });
      if (missing.length) {
        res.violation = { line: l.id, role: l.role, missing: missing };
        res.tag = l.role === "condition" ? "condition_early" : l.role === "use" ? "use_early" : "order_other";
        return res;
      }
      seen[l.id] = true;
    }
    res.ok = true;
    return res;
  }
  function orderResults(q, order) {
    var c = orderCheck(q, order);
    return [{ id: "order", skill: q.skill, correct: c.ok, aspect: "claim", chosen: order, tag: c.tag, violation: c.violation }];
  }
  var ORDER_JA = { condition_early: "3つの等しさより先に「合同」を置いた", use_early: "合同より先に「対応する辺・角が等しい」を置いた", order_other: "行の順番がずれた", incomplete: "並べ終わっていない" };

  // ---------- 診断の入口 ----------
  // 3つを分けて扱う：
  //   aspect            … 何をまちがえたか（claim 主張 / reason 根拠）。記録（skill_state の value / reason）はこれで決まる
  //   diagnostic_target … どこを学び直すか（確かめるスキル）
  //   confusion / route … なぜそう判断したか（選んだ答えの種類・取り違え）
  // 例：合同条件の行で SAS なのに SSS → aspect: reason（主張は正しい）、diagnostic_target: 三角形の合同条件、confusion: SSS_for_SAS
  //
  // 誤った小問ごとに finding を作る。今回たどるのは最初に止まった finding だけで、後の誤りは pending_findings に残す
  // （1回のチェックで全部を深掘りしない。追加の問題の上限はそのまま）
  var GEO_REASONS = { vertical: true, alternate: true, corresponding: true };
  // 問題で実際に使った図形①の性質（根拠）から、戻ってよい図形①のスキル。共通な辺・角だけなら図形①には戻らない
  function requiredGeometry(q) {
    if (q.required_geometry_skills) return q.required_geometry_skills.slice();
    var out = [];
    (q.proof ? q.proof.lines : []).forEach(function (l) {
      if (l.role === "figure_fact" && BASIS_SKILL[l.reason] && out.indexOf(BASIS_SKILL[l.reason]) === -1) out.push(BASIS_SKILL[l.reason]);
    });
    return out;
  }
  // 図から使える事実（証明の行でも、1段階の問題でも同じ規則）
  //   主張×：対応がずれた → 対応する辺・角／結論の側を使った → 仮定と結論／図の読み取り → 図形①の性質を使う問題ならその性質、共通なら図から使えることを見つける そのもの
  //   根拠×（主張○）：図形①の性質どうしの取り違え（錯角↔同位角 など）→ 正しい性質の図形①スキル（錯角・同位角は位置の名前も）。それ以外 → 図から使えることを見つける
  function routeFigureFact(f, basis, required, siblingReasonWrong) {
    var geo = basis && BASIS_SKILL[basis] && required.indexOf(BASIS_SKILL[basis]) !== -1 ? [BASIS_SKILL[basis]] : [];
    if (f.aspect === "claim") {
      f.diagnostic_target = "proofFigureFacts";
      if (f.kind === "corr_shift") { f.prereqs = ["congCorr"]; f.route = "対応する別の辺・角を選んだ → 対応する辺・角の可能性"; }
      else if (f.kind === "goal_used") { f.prereqs = ["proofHypConc"]; f.route = "まだ示していない結論の側を使った → 仮定と結論"; }
      else if (geo.length) { f.prereqs = geo; f.route = "図形①の性質（" + basis + "）を使う事実を読み取れない → その性質のスキル"; }
      else { f.prereqs = []; f.route = "図の読み取り（共通な辺・角など）→ 図から使えることを見つける そのもの"; }
      if (siblingReasonWrong && geo.length && f.prereqs.indexOf(geo[0]) === -1) f.prereqs = geo.concat(f.prereqs);
      return f;
    }
    // 根拠だけまちがえた
    f.reason_only = true;
    if (GEO_REASONS[f.chosen] && GEO_REASONS[f.answer] && BASIS_SKILL[f.answer]) {
      f.diagnostic_target = BASIS_SKILL[f.answer];
      f.route = "図形①の性質どうしを取り違えた（" + f.chosen + " → " + f.answer + "）→ 図形①のスキル";
      if ((f.answer === "alternate" || f.answer === "corresponding") && (f.chosen === "alternate" || f.chosen === "corresponding")) f.also = ["angleNames"];
    } else if (GEO_REASONS[f.answer] && BASIS_SKILL[f.answer] && required.indexOf(BASIS_SKILL[f.answer]) !== -1) {
      f.diagnostic_target = BASIS_SKILL[f.answer];
      f.route = "図形①の性質（" + f.answer + "）だと気づけない → 図形①のスキル";
    } else {
      f.diagnostic_target = "proofFigureFacts";
      f.route = "根拠（共通・仮定 など）を取り違えた → 図から使えることを見つける";
    }
    return f;
  }
  function findingOf(q, r, results) {
    var steps = q.steps || [], byLine = {};
    (q.proof ? q.proof.lines : []).forEach(function (l) { byLine[l.id] = l; });
    var st = steps.filter(function (s) { return s.id === r.id; })[0] || (r.id == null ? q : {});
    var line = byLine[st.line] || null;
    var role = line ? line.role : null;
    var choice = (st.choices || []).filter(function (c) { return c.key === r.chosen; })[0];
    var aspect = r.aspect === "reason" ? "reason" : "claim";
    var f = { question_id: q.id, step: r.id, line: line ? line.id : null, role: role, part: st.part || aspect, aspect: aspect, correct: false,
      chosen: r.chosen == null ? null : r.chosen, answer: st.answer, kind: choice ? choice.kind || null : null,
      confusion: aspect === "reason" && r.chosen != null && SC.geometry ? SC.geometry.confusionOf(st.aspect ? st : { aspect: "reason", answer: st.answer }, r.chosen) : null,
      diagnostic_target: null, prereqs: [], route: "", reason_only: false };
    // 同じ行の、もう一方の面の結果
    var sib = line ? results.filter(function (x) { var s = steps.filter(function (y) { return y.id === x.id; })[0]; return s && s.line === line.id && x.id !== r.id; })[0] : null;
    var required = requiredGeometry(q);
    var skill = q.type === "order" ? "proofBuild" : role ? ROLE_SKILL[role] : (st.skill || q.skill);
    if (q.type === "order") {
      var tag = r.tag || orderCheck(q, r.chosen).tag;
      f.kind = tag; f.confusion = tag; f.diagnostic_target = "proofBuild";
      f.prereqs = tag === "condition_early" ? ["congCond"] : tag === "use_early" ? ["congUse"] : [];
      f.route = ORDER_JA[tag] || "";
      f.violation = r.violation || null;
      return f;
    }
    if (skill === "proofFigureFacts") return routeFigureFact(f, line ? line.reason : (required.length ? q.basis : null) || q.basis, required, !!(sib && !sib.correct && sib.aspect === "reason"));
    if (skill === "proofHypConc") {
      f.diagnostic_target = "proofHypConc";
      if (aspect === "reason" && (!sib || sib.correct)) { f.reason_only = true; f.route = "仮定の行で、根拠（仮定）だけ取り違えた"; }
      else f.route = "仮定を拾えない／結論を仮定にした";
      return f;
    }
    if (skill === "congCond") {
      // 合同条件の行：条件を選ぶ（reason）まちがいでも、記録は reason、学び直すのは合同条件（根拠だけの確認にはしない）
      f.diagnostic_target = "congCond";
      if (aspect === "claim" && role === "condition") { f.prereqs = ["congCorr"]; f.route = "合同の対応（頂点の順番）をまちがえた → 合同条件 → 対応する辺・角"; }
      else f.route = "合同条件の選び方" + (f.kind === "SSA" || /SSA/.test(r.chosen || "") ? "（2辺と、その間でない角）" : "") + " → 合同条件そのもの";
      return f;
    }
    if (skill === "congUse") {
      if (f.kind === "corr_shift") { f.diagnostic_target = role ? "congUse" : "congCorr"; f.prereqs = role ? ["congCorr"] : []; f.route = "対応しない辺・角を選んだ → 対応する辺・角の可能性"; return f; }
      f.diagnostic_target = "congUse";
      if (aspect === "reason" && role && (!sib || sib.correct)) { f.reason_only = true; f.route = "合同から言えることの行で、根拠だけ取り違えた"; }
      else f.route = f.kind === "use_before_cong" ? "合同を示す前に、対応する辺・角の等しさを使った → 合同から言えること"
        : f.kind === "already_known" ? "合同から新しく言えることが分からない（すでに分かっていることを選んだ）→ 合同から言えること"
        : "合同から言えることの使い方 → 合同から言えること";
      return f;
    }
    // 対応する辺・角 などの1段階の問題
    f.diagnostic_target = skill;
    f.route = "「" + (E.SKILLS[skill] ? E.SKILLS[skill].label : skill) + "」の1段階の問題で止まった";
    return f;
  }
  // results：L.checkSteps の結果（小問ごと：id, skill, correct, aspect, chosen）または orderResults。
  // 返り値は js/rootcause.js の geometryEntry と同じ形（entry: none / reason_only / concept / not_learned）＋ findings / pending_findings
  function entry(q, results, opts) {
    opts = opts || {};
    if (!Array.isArray(results)) results = [{ id: null, skill: q.skill, correct: !!results, aspect: q.aspect || "claim" }];
    var claims = results.filter(function (r) { return r.aspect !== "reason"; }), reasons = results.filter(function (r) { return r.aspect === "reason"; });
    var out = { question_id: q.id, value_ok: claims.every(function (r) { return r.correct; }), reason_ok: reasons.length ? reasons.every(function (r) { return r.correct; }) : null,
      first_miss_step: null, entry: "none", skill: null, diagnostic_target: null, wrong_aspect: null, why: "", then_calc: false, confusions: [], concept_prereqs: [], calc_prereqs: [],
      direct: false, proof: {}, findings: [], pending_findings: [], required_geometry_skills: requiredGeometry(q) };
    out.findings = results.filter(function (r) { return !r.correct; }).map(function (r) { return findingOf(q, r, results); });
    out.findings.forEach(function (f) {
      if (f.aspect === "reason" && f.confusion) out.confusions.push({ skill: f.line ? ROLE_SKILL[f.role] : q.skill, step: f.step, chosen: f.chosen, answer: f.answer, confusion: f.confusion, diagnostic_target: f.diagnostic_target });
    });
    var first = out.findings[0];
    if (!first) return out;
    out.first_miss_step = first.step;
    out.diagnostic_target = first.diagnostic_target;
    out.wrong_aspect = first.aspect;
    out.skill = first.diagnostic_target;
    out.why = first.route;
    out.proof = { line: first.line, role: first.role, part: first.part, chosen_kind: first.kind, basis: first.line && q.proof ? q.proof.lines.filter(function (l) { return l.id === first.line; })[0].reason : null, tag: q.type === "order" ? first.kind : null, violation: first.violation || null };
    if (first.reason_only) { out.entry = "reason_only"; out.also = first.also || []; }
    else { out.entry = "concept"; out.concept_prereqs = first.prereqs.filter(function (x, i, a) { return a.indexOf(x) === i; }); out.direct = !out.concept_prereqs.length; }
    // 今回は追わない誤り（学び直す場所が今回と同じものは重ねない）
    var seen = {}; seen[first.diagnostic_target] = true;
    out.pending_findings = out.findings.slice(1).filter(function (f) { if (seen[f.diagnostic_target]) return false; seen[f.diagnostic_target] = true; return true; });
    if (out.skill && E.schoolSkillStatus(out.skill, opts.school) === "not_learned") {
      out.entry = "not_learned"; out.why = "学校でまだ習っていない（先取り）なので、苦手にせず原因さがしもしない";
    }
    out.direct_message = out.direct && out.skill ? "「" + E.SKILLS[out.skill].label + "」そのもの（" + out.why + "）を、もう一度確認すると理解しやすくなりそうです。" : null;
    return out;
  }

  SC.proof = { ROLE_SKILL: ROLE_SKILL, ROLE_JA: ROLE_JA, BASIS_SKILL: BASIS_SKILL, COND_JA: COND_JA, ORDER_JA: ORDER_JA,
    part: part, claimText: claimText, verify: verify, verifyStage: verifyStage, check: check, requiredGeometry: requiredGeometry, orderCheck: orderCheck, orderResults: orderResults, entry: entry, conditionHolds: conditionHolds };
})(typeof window !== "undefined" ? window : globalThis);
