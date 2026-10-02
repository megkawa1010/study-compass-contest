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
    });
    if (q.type === "order") chk("並べかえの見本の順番は依存関係を満たす", orderCheck(q, q.answer).ok);
    return out;
  }

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
  // results：L.checkSteps の結果（小問ごと：id, skill, correct, aspect, chosen）または orderResults。
  // 返り値は js/rootcause.js の geometryEntry と同じ形（entry: none / reason_only / concept / not_learned）
  function entry(q, results, opts) {
    opts = opts || {};
    if (!Array.isArray(results)) results = [{ id: null, skill: q.skill, correct: !!results, aspect: "claim" }];
    var steps = q.steps || [], byId = {};
    (q.proof ? q.proof.lines : []).forEach(function (l) { byId[l.id] = l; });
    function stepOf(r) { return steps.filter(function (s) { return s.id === r.id; })[0] || {}; }
    var claims = results.filter(function (r) { return r.aspect !== "reason"; }), reasons = results.filter(function (r) { return r.aspect === "reason"; });
    var out = { question_id: q.id, value_ok: claims.every(function (r) { return r.correct; }), reason_ok: reasons.length ? reasons.every(function (r) { return r.correct; }) : null,
      first_miss_step: null, entry: "none", skill: null, why: "", then_calc: false, confusions: [], concept_prereqs: [], calc_prereqs: [], direct: false, proof: {} };
    reasons.forEach(function (r) {
      if (r.correct) return;
      var st = stepOf(r);
      out.confusions.push({ skill: r.skill, step: r.id, chosen: r.chosen, answer: st.answer, confusion: SC.geometry && r.chosen != null ? SC.geometry.confusionOf(st, r.chosen) : null });
    });
    var first = results.filter(function (r) { return !r.correct; })[0];
    if (!first) return out;
    out.first_miss_step = first.id;
    function set(skill, prereqs, why, direct) {
      out.entry = "concept"; out.skill = skill; out.concept_prereqs = prereqs.filter(function (x, i, a) { return a.indexOf(x) === i; }); out.why = why; out.direct = !!direct || !out.concept_prereqs.length;
    }
    // 並べかえ：最初に依存関係を破った行の役割で
    if (q.type === "order") {
      var tag = first.tag || orderCheck(q, first.chosen).tag;
      out.proof = { tag: tag, violation: first.violation || null };
      if (tag === "condition_early") set("proofBuild", ["congCond"], ORDER_JA[tag] + "：合同条件の使い方から確かめる");
      else if (tag === "use_early") set("proofBuild", ["congUse"], ORDER_JA[tag] + "：合同から言えることの使い方から確かめる");
      else set("proofBuild", [], ORDER_JA[tag] || "行の順番がずれた：組み立てそのものを確認", true);
      return finish();
    }
    var st = stepOf(first), line = byId[st.line] || null;
    if (!line) {
      // 1段階だけの短い問題：そのスキルそのもの
      var ch = st.choices ? st.choices.filter(function (c) { return c.key === first.chosen; })[0] : null;
      var kind0 = ch && ch.kind;
      if (first.aspect === "reason" && claims.every(function (r) { return r.correct; })) { out.entry = "reason_only"; out.skill = first.skill || q.skill; out.why = "主張は合っていて、根拠だけまちがえた"; return finish(); }
      set(first.skill || q.skill, kind0 === "corr_shift" ? ["congCorr"] : E.prereqSide(first.skill || q.skill, "concept"), "1段階の問題で止まった");
      return finish();
    }
    var role = line.role, lineSkill = ROLE_SKILL[role];
    var mine = results.filter(function (r) { var s = stepOf(r); return s.line === line.id; });
    var claimR = mine.filter(function (r) { return stepOf(r).part === "claim"; })[0], reasonR = mine.filter(function (r) { return stepOf(r).part === "reason"; })[0];
    var chosen = st.choices ? st.choices.filter(function (c) { return c.key === first.chosen; })[0] : null;
    var kind = chosen ? chosen.kind : null;
    var basis = BASIS_SKILL[line.reason] || null;
    out.proof = { line: line.id, role: role, part: st.part, chosen_kind: kind, basis: line.reason };
    // 主張は合っていて、根拠だけまちがえた（合同条件の行は、条件を選ぶこと自体が中身なので除く）
    if (st.part === "reason" && role !== "condition" && (!claimR || claimR.correct)) {
      out.entry = "reason_only"; out.skill = lineSkill;
      out.why = ROLE_JA[role] + "の行で、主張は合っていて根拠だけまちがえた";
      return finish();
    }
    if (role === "hyp_fact") set("proofHypConc", [], "仮定の行で止まった（仮定を拾えない）", true);
    else if (role === "figure_fact") {
      // 主張を間違えた＝対応、とは決めない。選んだ答えの種類で戻る先を決める
      var pre = [];
      if (reasonR && !reasonR.correct && basis) pre.push(basis);
      if (kind === "corr_shift") pre.push("congCorr");
      if (kind === "goal_used") pre.push("proofHypConc");
      if (basis) pre.push(basis);
      set("proofFigureFacts", pre, kind === "corr_shift" ? "図から使える事実の行で、対応する辺・角を取り違えた"
        : kind === "goal_used" ? "図から使える事実の行で、まだ示していない（結論の側の）ことを使った"
        : "図から使える事実の行で、図の読み取りをまちがえた", !pre.length);
    } else if (role === "condition") {
      if (st.part === "claim") set("congCond", ["congCorr"], "合同条件の行で、三角形の対応（頂点の順番）をまちがえた");
      else set("congCond", [], "合同条件の行で、条件の選び方をまちがえた" + (kind === "SSA" ? "（2辺と、その間でない角）" : ""), true);
    } else if (role === "use") {
      set("congUse", kind === "corr_shift" ? ["congCorr"] : [], kind === "corr_shift" ? "合同から言えることの行で、対応しない辺・角を選んだ" : "合同から言えることの行で止まった", kind !== "corr_shift");
    }
    return finish();
    function finish() {
      if (out.skill && out.entry !== "none" && E.schoolSkillStatus(out.skill, opts.school) === "not_learned") {
        out.entry = "not_learned"; out.why = "学校でまだ習っていない（先取り）なので、苦手にせず原因さがしもしない";
      }
      out.direct_message = out.direct && out.skill ? "「" + E.SKILLS[out.skill].label + "」そのもの（" + out.why + "）を、もう一度確認すると理解しやすくなりそうです。" : null;
      return out;
    }
  }

  SC.proof = { ROLE_SKILL: ROLE_SKILL, ROLE_JA: ROLE_JA, BASIS_SKILL: BASIS_SKILL, COND_JA: COND_JA, ORDER_JA: ORDER_JA,
    part: part, claimText: claimText, verify: verify, orderCheck: orderCheck, orderResults: orderResults, entry: entry, conditionHolds: conditionHolds };
})(typeof window !== "undefined" ? window : globalThis);
