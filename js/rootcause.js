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
    MAX_PROBES_PER_STEP: 2,    // 1つのスキルについて、前提を何個まで問題で確かめるか
    BUDGET_INITIAL: 3,         // 最初のチェックで、原因さがしに追加してよい問題数（C1〜C5 とは別）
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

  // あるスキルの前提の候補（その問題が持つ前提を先に、次にスキル地図の前提）
  function prereqOrder(trail, skill) {
    var fromQuestion = skill === trail.symptom.skill ? (trail.symptom.prerequisite_skills || []) : [];
    var fromGraph = E.SKILLS[skill] ? E.SKILLS[skill].prerequisites : [];
    return uniq(fromQuestion.concat(fromGraph)).filter(function (p) { return p !== skill && E.SKILLS[p]; });
  }

  // ---------- 道すじをはじめる ----------
  // opts: { question, skill?（応用問題で止まった小問のスキル）, seeds?（先に出すと決まっている原因確認問題ID）, now }
  function start(opts) {
    var q = opts.question;
    var skill = opts.skill || q.skill;
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
  // ctx: { states, now, budgetLeft, pickQuestion(skill) → 問題ID | null,
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
    return "「" + label(trail.frontier) + "」の前にある「" + label(skill) + "」を確かめます（つまずきの原因さがし）";
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

  // いくつかの道すじの中で、いちばん根元（前提に近い）の「戻る場所」
  var ROOT_ORDER = ["signed", "algebra", "coord", "proportion", "change", "substitution", "rate", "slopeIntercept", "form"];
  function deepestReturn(trails) {
    var best = null;
    (trails || []).forEach(function (t) {
      var c = t.conclusion;
      if (!c || !c.return_to || c.kind === "not_reproduced") return;
      if (!best || ROOT_ORDER.indexOf(c.return_to) < ROOT_ORDER.indexOf(best.conclusion.return_to)) best = t;
    });
    return best;
  }

  SC.rootcause = {
    CONFIG: CONFIG, start: start, next: next, answer: answer, conclude: conclude, takeSeeds: takeSeeds,
    solidByHistory: solidByHistory, pathText: pathText, deepestReturn: deepestReturn, ROOT_ORDER: ROOT_ORDER
  };
})(typeof window !== "undefined" ? window : globalThis);
