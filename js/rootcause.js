/*
 * Study Compass — つまずき原因探索エンジン（Phase 4）
 *
 * 「この問題をまちがえた」で終わらせず、「どの前提スキルまで戻ると理解できるか」をさがす。
 *
 * 1本の「道すじ（trail）」は、まちがえた1問（症状）から始まり、
 *   - その問題が持つ前提スキル（問題ごとの prerequisite_skills）→ スキル地図の前提、の順に候補にする
 *   - 記録から「できている」とわかる前提は、問題を出さずに「できている」と扱う（子どもの負担を増やさない）
 *   - 前提の問題もまちがえたら、そのスキルに1段さかのぼる
 *   - 前提の問題が正解なら、そこが「ここまでは戻らなくてよい」境目
 * を、1段あたり・深さ・問題数の上限の中でくり返す。
 *
 * 結論は断定しない。「〜の可能性があります」「〜まで戻ると理解しやすくなりそう」と伝える。
 * 画面を持たない純粋な関数だけを置く（Node からテストできる）。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});
  var E = SC.engine;

  var CONFIG = {
    MAX_DEPTH: 3,              // 症状から何段までさかのぼるか
    MAX_PROBES_PER_STEP: 3,    // 1つのスキルについて、前提を何個まで問題で確かめるか（一次方程式までたどれるよう3）
    BUDGET_INITIAL: 4,         // 最初のチェックで、原因さがしに追加してよい問題数（C1〜C5 とは別）
    BUDGET_PERIODIC: 2,        // 定期チェックで、原因さがしに追加してよい問題数
    SOLID_FRESH_DAYS: 14       // 記録から「できている」とみなすのは、最後の確認がこの日数以内のとき
  };

  var SOLID_STATUS = { understood: true, applying: true, retained: true, mastered: true };

  function label(k) { return E.SKILLS[k] ? E.SKILLS[k].label : k; }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  // 記録から「このスキルはできている」と言えるか（問題を出さずに済ませてよいか）
  function solidByHistory(skill, states, now) {
    var s = states && states[skill];
    if (!s || !s.attempt_count || !SOLID_STATUS[s.learning_status] || s.basic !== "pass") return false;
    if (!s.last_checked) return false;
    return now - Date.parse(s.last_checked) <= CONFIG.SOLID_FRESH_DAYS * E.DAY;
  }

  // あるスキルの前提の候補。
  // まちがえた問題そのもの（1段目）は、その問題が持つ前提だけを見る（例：傾きと切片から式を書く問題に、
  // 方程式を解く力は関係ないので、地図上の前提でも確かめない）。問題が前提を持たないときと、2段目からはスキル地図の前提。
  function prereqOrder(trail, skill) {
    var list;
    if (trail.geometry) {
      // 図形：いまたどっている側（図形の性質側 concept／計算側 calc）の前提だけを見る
      var side = trail.geometry.sides[trail.geometry.side_idx];
      if (skill === trail.symptom.skill) list = side === "calc" ? trail.geometry.calc_prereqs : trail.geometry.concept_prereqs;
      else list = isGeometry(skill) ? E.prereqSide(skill, side) : E.SKILLS[skill].prerequisites;
    } else {
      var fromQuestion = skill === trail.symptom.skill ? (trail.symptom.prerequisite_skills || []) : [];
      var fromGraph = E.SKILLS[skill] ? E.SKILLS[skill].prerequisites : [];
      list = fromQuestion.length ? fromQuestion : fromGraph;
    }
    return uniq(list).filter(function (p) { return p !== skill && E.SKILLS[p]; });
  }

  // ---------- 図形：value（角度・値）と reason（根拠）の結果から、原因さがしの入口を決める ----------
  //   角度○・根拠×       → reason_only：理由だけ記録。原因さがしはしない（根拠の確認を今日の学習の候補に）
  //   角度×・根拠○       → calc：根拠はわかっているので、計算側（問題ごとの calculation_prerequisites）だけ
  //   角度×・根拠×       → concept：図形の性質側から。そこができていれば、必要なときだけ計算側
  //   根拠を聞かない問題 → concept（同じく、必要なときだけ計算側）
  //   小問に side があれば、最初に止まった値の小問で決める（式を選ぶ ×：concept／x を求める ×：calc）
  function isGeometry(skill) { return !!(E.SKILLS[skill] && E.SKILLS[skill].concept); }
  function geoLists(q, skill) {
    var mine = skill === q.skill;
    return {
      concept: (mine && q.concept_prerequisites) || E.prereqSide(skill, "concept"),
      calc: (mine && q.calculation_prerequisites) || (mine ? [] : E.prereqSide(skill, "calc"))
    };
  }
  // results：L.checkSteps の結果（小問ごと）。小問のない問題は true / false
  // opts.school：学校のようす（学校でまだ習っていない図形スキルは not_learned：苦手にせず、原因さがしもしない）
  function geometryEntry(q, results, opts) {
    opts = opts || {};
    if (!Array.isArray(results)) results = [{ id: null, skill: q.skill, correct: !!results, aspect: "value" }];
    var steps = q.steps || [];
    function stepOf(r) { return steps.filter(function (st) { return st.id === r.id; })[0] || {}; }
    var vals = results.filter(function (r) { return (r.aspect || "value") !== "reason"; });
    var reas = results.filter(function (r) { return r.aspect === "reason"; });
    var out = {
      question_id: q.id,
      value_ok: vals.every(function (r) { return r.correct; }),
      reason_ok: reas.length ? reas.every(function (r) { return r.correct; }) : null,
      first_miss_step: (results.filter(function (r) { return !r.correct; })[0] || {}).id || null,
      entry: "none", skill: null, why: "", then_calc: false, confusions: []
    };
    reas.forEach(function (r) {
      if (r.correct) return;
      var st = stepOf(r);
      out.confusions.push({ skill: r.skill, step: r.id, chosen: r.chosen == null ? null : r.chosen, answer: st.answer,
        confusion: SC.geometry && r.chosen != null ? SC.geometry.confusionOf(st, r.chosen) : null });
    });
    if (out.value_ok) {
      if (out.reason_ok === false) {
        out.entry = "reason_only"; out.skill = reas.filter(function (r) { return !r.correct; })[0].skill;
        out.why = "角度は求められているので、図形の性質側の深い原因さがしはしない。根拠だけを記録";
      }
      return finish();
    }
    var fv = vals.filter(function (r) { return !r.correct; })[0], st = stepOf(fv);
    out.skill = fv.skill || q.skill;
    if (st.side === "concept") { out.entry = "concept"; out.why = "式を立てる（図形の関係を式にする）小問で止まった"; }
    else if (st.side === "calc") { out.entry = "calc"; out.why = "式は立てられたが、x を求める計算で止まった"; }
    else if (out.reason_ok === true) { out.entry = "calc"; out.why = "根拠は正しく選べた（図形の性質はわかっている）が、値をまちがえた"; }
    else if (out.reason_ok === false) { out.entry = "concept"; out.then_calc = true; out.why = "角度も根拠もまちがえた"; }
    else { out.entry = "concept"; out.then_calc = true; out.why = "根拠を聞いていない問題なので、図形の性質側から"; }
    return finish();
    function finish() {
      var lists = geoLists(q, out.skill || q.skill);
      out.concept_prereqs = lists.concept.slice();
      out.calc_prereqs = lists.calc.slice();
      if (out.skill && out.entry !== "none" && E.schoolSkillStatus(out.skill, opts.school) === "not_learned") {
        out.entry = "not_learned";
        out.why = "学校でまだ習っていない（先取り）なので、苦手にせず原因さがしもしない";
      }
      return out;
    }
  }

  // ---------- 道すじをはじめる ----------
  // opts: { question, skill?（応用問題で止まった小問のスキル）, seeds?（先に出すと決まっている原因確認問題ID）, now }
  function start(opts) {
    var q = opts.question;
    var skill = opts.skill || (opts.geometry && opts.geometry.skill) || q.skill;
    var trail = {
      id: E.makeId("trl", opts.now || Date.now()),
      symptom: {
        skill: skill, label: label(skill), question_id: q.id,
        // 小問で止まったときは、その小問のスキルの前提だけを使う
        prerequisite_skills: skill === q.skill ? (q.prerequisite_skills || []) : []
      },
      frontier: skill,          // いま「まちがえている」とわかっている、いちばん深いスキル
      depth: 0,
      probesAtFrontier: 0,
      seeds: (opts.seeds || []).slice(),
      path: [{ skill: skill, label: label(skill), question_id: q.id, correct: false, via: "symptom", depth: 0 }],
      tested: {},               // スキル → true（できた）/ false（まちがえた）
      pending: [],              // 確かめきれなかった前提
      log: ["「" + label(skill) + "」の問題（" + q.id + "）でまちがえたので、前提をさかのぼる"],
      status: "open",
      conclusion: null
    };
    trail.tested[skill] = false;
    var g = opts.geometry;
    if (g) {
      trail.geometry = { question_id: g.question_id, value_ok: g.value_ok, reason_ok: g.reason_ok, first_miss_step: g.first_miss_step,
        entry: g.entry, why: g.why, concept_prereqs: g.concept_prereqs, calc_prereqs: g.calc_prereqs, confusions: g.confusions,
        sides: g.entry === "calc" ? ["calc"] : g.then_calc ? ["concept", "calc"] : ["concept"], side_idx: 0, skipped: [] };
      trail.log.push("入口：" + (g.entry === "calc" ? "計算側" : "図形の性質側") + "（" + g.why + "）");
      if (g.entry === "calc") trail.geometry.skipped.push({ side: "concept", why: "根拠が正しい・式が立てられている＝図形の性質はわかっているので、図形側は確かめない" });
    }
    return trail;
  }

  // 角度○・根拠× のとき：原因さがしの問題は出さず、理由だけを記録した道すじ（結論ずみ）
  function reasonOnly(q, g, now) {
    var trail = start({ question: q, skill: g.skill, now: now });
    trail.path[0].correct = true;
    trail.path[0].label = label(g.skill) + "（角度）";
    trail.path.push({ skill: g.skill, label: label(g.skill) + "（根拠）", question_id: q.id, correct: false, via: "reason", depth: 0 });
    trail.tested = {};
    trail.geometry = { question_id: q.id, value_ok: true, reason_ok: false, first_miss_step: g.first_miss_step, entry: "reason_only", why: g.why,
      concept_prereqs: g.concept_prereqs, calc_prereqs: g.calc_prereqs, confusions: g.confusions, sides: [], side_idx: 0,
      skipped: [{ side: "concept", why: "角度は求められているので、図形の性質側の深い原因さがしはしない" }, { side: "calc", why: "値は正しいので、計算側は確かめない" }] };
    var RS = SC.geometry ? SC.geometry.REASONS : {};
    var c = g.confusions[0] || {};
    trail.status = "done";
    trail.conclusion = { kind: "reason_only", gap_skill: null, return_to: null, solid_skills: [], pending_skills: [], reason_practice: g.skill, confusions: g.confusions,
      message: "「" + label(g.skill) + "」の角度は正しく求められています。理由" + (c.chosen && RS[c.chosen] ? "（選んだ根拠「" + RS[c.chosen] + "」→ 正しくは「" + (RS[c.answer] || c.answer) + "」）" : "") +
        "がまだ不安定なので、根拠を短く確認しましょう。" };
    trail.log.push("角度は正しく、根拠だけまちがえた → 原因さがしはせず、根拠を記録（" + (c.confusion || "") + "）");
    trail.log.push("結論：" + trail.conclusion.message);
    return trail;
  }

  // 先に出すと決まっている原因確認問題（seeds）を、まとめて取り出す。
  // 画面側はこれを問題の列にすでに並べてあるので、答えが来たら answer() に渡す。
  function takeSeeds(trail) {
    var out = [];
    trail.seeds.forEach(function (sid) {
      var sq = SC.QUESTIONS[sid];
      if (sq) out.push({ skill: sq.skill, question_id: sid, seed: true, purpose: purposeText(trail, sq.skill) });
    });
    trail.seeds = [];
    return out;
  }

  // ---------- 次に確かめること ----------
  // ctx: { states, now, budgetLeft, school（学校のようす）, pickQuestion(skill) → 問題ID | null,
  //        known: { スキル: true/false }（同じチェックの中ですでにわかっている結果） }
  // 返り値：{ skill, question_id, purpose, seed } または null（このとき trail は結論まで進む）
  function next(trail, ctx) {
    if (trail.status !== "open") return null;
    // 1) 先に出すと決まっている原因確認問題（最初のチェックの C1〜C5）
    while (trail.seeds.length) {
      var sid = trail.seeds.shift();
      var sq = SC.QUESTIONS[sid];
      if (!sq) continue;
      return { skill: sq.skill, question_id: sid, seed: true,
        purpose: purposeText(trail, sq.skill) };
    }
    // 2) いまのスキルの前提を、上から順に確かめる
    while (true) {
      var cands = prereqOrder(trail, trail.frontier).filter(function (p) { return trail.tested[p] === undefined; });
      var probe = null;
      var moved = false;
      for (var i = 0; i < cands.length; i++) {
        var p = cands[i];
        // 同じチェックの中ですでに結果がわかっているスキルは、問題を出さずにその結果を使う
        // 学校でまだ習っていない前提は、原因さがしの対象にしない（未学習は苦手ではない）
        if (E.schoolSkillStatus(p, ctx.school) === "not_learned") {
          trail.tested[p] = "not_learned";
          trail.log.push("「" + label(p) + "」は学校でまだ習っていないので、確かめない");
          continue;
        }
        var known = ctx.known ? ctx.known[p] : undefined;
        if (known === true) {
          trail.tested[p] = true;
          trail.path.push({ skill: p, label: label(p), question_id: null, correct: true, via: "session", depth: trail.depth + 1 });
          trail.log.push("「" + label(p) + "」は今回のチェックですでにできていたので、問題は出さない");
          continue;
        }
        if (known === false && trail.depth < CONFIG.MAX_DEPTH) {
          trail.tested[p] = false;
          trail.path.push({ skill: p, label: label(p), question_id: null, correct: false, via: "session", depth: trail.depth + 1 });
          trail.log.push("「" + label(p) + "」は今回のチェックですでにまちがえていたので、問題は出さずに1段さかのぼる");
          trail.frontier = p;
          trail.depth++;
          trail.probesAtFrontier = 0;
          trail.pending = [];
          moved = true;
          break;
        }
        if (solidByHistory(p, ctx.states, ctx.now)) {
          trail.tested[p] = true;
          trail.path.push({ skill: p, label: label(p), question_id: null, correct: true, via: "history", depth: trail.depth + 1 });
          trail.log.push("「" + label(p) + "」は最近の記録でできているので、問題は出さない");
          continue;
        }
        if (trail.depth >= CONFIG.MAX_DEPTH) { addPending(trail, p, "さかのぼる深さの上限"); continue; }
        if (trail.probesAtFrontier >= CONFIG.MAX_PROBES_PER_STEP) { addPending(trail, p, "1つのスキルで確かめる前提の数の上限"); continue; }
        if (ctx.budgetLeft <= 0) { addPending(trail, p, "今回のチェックで追加できる問題数の上限"); continue; }
        var qid = ctx.pickQuestion(p);
        if (!qid) { addPending(trail, p, "確かめる問題が残っていない"); continue; }
        probe = { skill: p, question_id: qid, seed: false, purpose: purposeText(trail, p) };
        break;
      }
      if (moved) continue; // 1段さかのぼったので、新しいスキルの前提を見直す
      // 図形：図形の性質側がすべてできていたら、必要なときだけ計算側へ
      var g = trail.geometry;
      if (!probe && g && trail.frontier === trail.symptom.skill && g.side_idx < g.sides.length - 1) {
        var here = prereqOrder(trail, trail.frontier);
        if (!trail.pending.length && here.every(function (p) { return trail.tested[p] === true || trail.tested[p] === "not_learned"; })) {
          g.side_idx++;
          trail.log.push("図形の性質側（" + list(here) + "）はできていた → 計算側を確かめる");
          continue;
        }
      }
      if (probe) {
        trail.log.push("「" + label(trail.frontier) + "」の前提「" + label(probe.skill) + "」を " + probe.question_id + " で確かめる");
        return probe;
      }
      conclude(trail);
      return null;
    }
  }

  function addPending(trail, skill, why) {
    if (trail.pending.indexOf(skill) === -1) {
      trail.pending.push(skill);
      trail.log.push("「" + label(skill) + "」は確かめられなかった（" + why + "）→ 次のチェックで確かめる");
    }
  }

  function purposeText(trail, skill) {
    if (skill === trail.frontier) return "「" + label(skill) + "」をもう一度、別の問題で確かめます";
    return "「" + label(trail.frontier) + "」の前にある「" + label(skill) + "」も確かめます";
  }

  // ---------- 答えを受け取る ----------
  function answer(trail, probe, correct) {
    if (trail.status !== "open") return trail;
    var sameSkill = probe.skill === trail.frontier;
    trail.path.push({ skill: probe.skill, label: label(probe.skill), question_id: probe.question_id, correct: !!correct,
      via: probe.seed ? "seed" : "probe", depth: sameSkill ? trail.depth : trail.depth + 1 });
    if (sameSkill) {
      // 同じスキルを別の問題で確かめた（例：B2 のあとの C3）
      if (correct) {
        trail.log.push("「" + label(probe.skill) + "」は別の問題ではできた → 1回目はうっかりの可能性");
        trail.reproduced = false;
        conclude(trail);
      } else {
        trail.log.push("「" + label(probe.skill) + "」は別の問題でもまちがえた → 前提をさかのぼる");
      }
      return trail;
    }
    trail.tested[probe.skill] = !!correct;
    if (!probe.seed) trail.probesAtFrontier++;
    if (correct) {
      trail.log.push("「" + label(probe.skill) + "」はできた → ここまでは戻らなくてよさそう");
    } else {
      trail.log.push("「" + label(probe.skill) + "」もまちがえた → 「" + label(probe.skill) + "」に1段さかのぼる");
      trail.frontier = probe.skill;
      trail.depth++;
      trail.probesAtFrontier = 0;
      // 1段深く進んだら、確かめきれなかった浅い段の前提は「次回」に回す必要はない（より根元が見つかったため）
      trail.pending = [];
    }
    return trail;
  }

  // ---------- 結論 ----------
  function conclude(trail) {
    if (trail.status === "done") return trail;
    trail.status = "done";
    var gap = trail.frontier;
    var prereqs = prereqOrder(trail, gap);
    var solid = prereqs.filter(function (p) { return trail.tested[p] === true; });
    var g = trail.geometry;
    if (g) {
      if (g.sides.indexOf("calc") === -1 && g.entry === "concept") g.skipped.push({ side: "calc", why: "式を立てる小問で止まったので、計算側は確かめない" });
      else if (g.sides[g.side_idx] === "concept" && g.sides.indexOf("calc") !== -1)
        g.skipped.push({ side: "calc", why: trail.pending.length ? "図形の性質側を確かめきれなかったので、計算側は次回以降" : "図形の性質側に戻る場所が見つかったので、計算側はいまは確かめない" });
      // 図形の性質側もできていて、さかのぼる計算もない（たし算・ひき算だけの問題）
      if (gap === trail.symptom.skill && !trail.pending.length && trail.reproduced !== false && g.calc_prereqs.length === 0 && g.sides[g.side_idx] === "calc") {
        trail.status = "done";
        solid = Object.keys(trail.tested).filter(function (k) { return trail.tested[k] === true; });
        trail.conclusion = { kind: "value_slip", gap_skill: null, return_to: null, solid_skills: solid, pending_skills: [],
          message: "「" + label(gap) + "」の" + (g.reason_ok ? "根拠は正しく選べています" : "図形の性質の前提はできています") + "。角度を求める計算（たし算・ひき算）を見直すと、解けるようになりそうです。" };
        trail.log.push("結論：" + trail.conclusion.message);
        return trail;
      }
    }
    var kind;
    if (trail.reproduced === false) kind = "not_reproduced";
    else if (trail.pending.length) kind = "undetermined";
    else if (gap === trail.symptom.skill) kind = prereqs.length ? "in_skill" : "root";
    else kind = prereqs.length ? "gap_found" : "root";
    trail.conclusion = {
      kind: kind,
      gap_skill: kind === "not_reproduced" ? null : gap,
      return_to: kind === "not_reproduced" ? null : gap,        // ここまで戻って練習するとよさそう
      solid_skills: solid,                                     // ここはできている（戻らなくてよい）
      pending_skills: trail.pending.slice(),
      message: message(trail, kind, gap, solid)
    };
    trail.log.push("結論：" + trail.conclusion.message);
    return trail;
  }

  function q(s) { return "「" + s + "」"; }
  function list(ks) { return ks.map(function (k) { return q(label(k)); }).join("・"); }

  function message(trail, kind, gap, solid) {
    var sym = trail.symptom.label;
    var pend = trail.pending.length ? list(trail.pending) + "はまだ確かめられていないので、次のコンパスチェックで確認します。" : "";
    if (kind === "not_reproduced") {
      return q(sym) + "は、別の問題ではできていました。1回目はうっかりだった可能性もあります。次のチェックでもう一度見てみます。";
    }
    if (kind === "in_skill") {
      return q(sym) + "の前提になる" + list(solid) + "はできています。" + q(sym) + "そのもの（前提どうしをつなげるところ）を練習すると、理解しやすくなりそうです。";
    }
    if (kind === "root") {
      if (gap === trail.symptom.skill) return q(sym) + "の理解が、まだ少し不安定な可能性があります。一番の土台なので、ここから確認していきましょう。";
      return q(sym) + "でつまずいた原因をさかのぼると、一番の土台の" + q(label(gap)) + "の理解が、まだ少し不安定な可能性があります。" +
        q(label(gap)) + "から練習すると、" + q(sym) + "も理解しやすくなりそうです。";
    }
    if (kind === "gap_found") {
      return q(sym) + "でつまずいた原因をさかのぼると、" + q(label(gap)) + "の理解が、まだ少し不安定な可能性があります。" +
        (solid.length ? list(solid) + "はできているので、" : "") +
        q(label(gap)) + "まで戻って練習すると、" + q(sym) + "も理解しやすくなりそうです。";
    }
    // undetermined
    if (gap === trail.symptom.skill) {
      return q(sym) + "でつまずいた原因を、まださがしている途中です。" + (solid.length ? list(solid) + "はできていました。" : "") + pend;
    }
    return q(sym) + "でつまずいた原因をさかのぼると、" + q(label(gap)) + "の理解が、まだ少し不安定な可能性があります。" + pend;
  }

  // 道すじを1行で（例：変化の割合 × → 変化量 × → 正負の数 ○）
  function pathText(trail) {
    return trail.path.map(function (p) {
      return p.label + " " + (p.correct ? "○" : "×") + (p.via === "history" ? "（記録から）" : p.via === "session" ? "（今回の答えから）" : "");
    }).join(" → ");
  }

  // ---------- 同じチェック内の追加出題を省略してよいか ----------
  // 原因さがしの途中で「この前提はできている」とわかったスキルに、予定していた問題がまだ残っているとき、
  // 子どもの負担を減らすため原則として省略する。ただし次の場合は確かめる（例外）：
  //   - 確かさが低い（記録上まだ不安定）
  //   - 過去にこのスキルで誤答が多い
  //   - 今回の1問だけでは判断が不安定（ヒントを使った／今回ほかの問題でこのスキルをまちがえている）
  var SKIP = { MIN_CONFIDENCE: 0.3, MANY_ERRORS_MIN_ATTEMPTS: 3, MANY_ERRORS_MAX_ACCURACY: 0.5 };
  function skipDecision(skill, state, info) {
    info = info || {};
    var lab = label(skill);
    if (info.hintUsed) return { skip: false, reason: "「" + lab + "」はヒントを使って正解したので、今回の1問だけでは判断が不安定 → 予定どおり確かめる" };
    if (info.wrongInSession) return { skip: false, reason: "「" + lab + "」は今回ほかの問題でまちがえているので、判断が不安定 → 予定どおり確かめる" };
    if (state && state.attempt_count) {
      if (state.confidence < SKIP.MIN_CONFIDENCE) {
        return { skip: false, reason: "「" + lab + "」は確かさが " + state.confidence.toFixed(2) + " と低いので → 予定どおり確かめる" };
      }
      var prior = state.attempt_count - 1; // 今回の正解を除いた過去の回答
      var priorCorrect = state.correct_count - 1;
      if (prior >= SKIP.MANY_ERRORS_MIN_ATTEMPTS && priorCorrect / prior < SKIP.MANY_ERRORS_MAX_ACCURACY) {
        return { skip: false, reason: "「" + lab + "」は過去に誤答が多い（" + priorCorrect + "/" + prior + " 正解）ので → 予定どおり確かめる" };
      }
    }
    return { skip: true, reason: "「" + lab + "」は原因さがしの問題で正解し、記録上も不安定な点がないので、同じチェック内の追加問題を省略" };
  }

  // いくつかの道すじの中で、いちばん根元（前提に近い）の「戻る場所」
  var ROOT_ORDER = E.ROOT_ORDER; // 前提に近い順（js/engine.js で一元管理）
  function deepestReturn(trails) {
    var best = null;
    (trails || []).forEach(function (t) {
      var c = t.conclusion;
      if (!c || !c.return_to || c.kind === "not_reproduced") return;
      if (!best || ROOT_ORDER.indexOf(c.return_to) < ROOT_ORDER.indexOf(best.conclusion.return_to)) best = t;
    });
    return best;
  }

  // 根拠の確認（今日の学習の候補）：最近の reason_only の道すじと、skill_state の reason が不安定なスキル
  function reasonPractice(explorations, states, now) {
    var out = [], seen = {};
    (explorations || []).slice().reverse().forEach(function (x) {
      var c = x.conclusion;
      if (!c || c.kind !== "reason_only" || seen[c.reason_practice]) return;
      if (now && x.date && now - Date.parse(x.date) > 14 * E.DAY) return;
      seen[c.reason_practice] = true;
      out.push({ skill: c.reason_practice, from: "exploration", confusions: (c.confusions || []).map(function (z) { return z.confusion; }) });
    });
    Object.keys(states || {}).forEach(function (k) {
      var s = states[k];
      if (seen[k] || !s.overall || !s.overall.reason_practice) return;
      seen[k] = true;
      out.push({ skill: k, from: "skill_state", confusions: Object.keys(s.reason.confusions || {}) });
    });
    return out;
  }

  // 開発・確認用：図形の1問の結果と「本当の理解（knows）」から、道すじを最後まで進める（?debug=compass・テスト）
  // opts: { budget, states, school, now, pickQuestion }
  function simulate(q, results, knows, opts) {
    opts = opts || {};
    var now = opts.now || Date.now();
    var g = geometryEntry(q, results, { school: opts.school });
    if (g.entry === "none" || g.entry === "not_learned") return { entry: g, trail: null, asked: [] };
    if (g.entry === "reason_only") return { entry: g, trail: reasonOnly(q, g, now), asked: [] };
    var trail = start({ question: q, geometry: g, now: now });
    var budget = opts.budget == null ? CONFIG.BUDGET_INITIAL : opts.budget, asked = [], used = [q.id];
    var pick = opts.pickQuestion || function (skill) {
      var p = SC.bank.pick(skill, "basic", { exclude: used, rng: SC.bank.seeded(1) }) || SC.bank.pick(skill, "retention", { exclude: used, rng: SC.bank.seeded(1) }) ||
        SC.bank.pick(skill, "standard", { exclude: used, rng: SC.bank.seeded(1) });
      return p ? p.id : null;
    };
    for (var i = 0; i < 20; i++) {
      var p = next(trail, { states: opts.states || {}, now: now, budgetLeft: budget, school: opts.school, pickQuestion: pick });
      if (!p) break;
      used.push(p.question_id); budget--; asked.push(p);
      answer(trail, p, !!knows[p.skill]);
    }
    if (trail.status === "open") conclude(trail);
    return { entry: g, trail: trail, asked: asked };
  }

  SC.rootcause = {
    geometryEntry: geometryEntry, reasonOnly: reasonOnly, reasonPractice: reasonPractice, simulate: simulate, isGeometry: isGeometry,
    CONFIG: CONFIG, SKIP: SKIP, skipDecision: skipDecision,
    start: start, next: next, answer: answer, conclude: conclude, takeSeeds: takeSeeds,
    solidByHistory: solidByHistory, pathText: pathText, deepestReturn: deepestReturn, ROOT_ORDER: ROOT_ORDER
  };
})(typeof window !== "undefined" ? window : globalThis);
