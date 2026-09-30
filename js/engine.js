/*
 * Study Compass — 学習履歴・理解度エンジン（Phase 1）
 *
 * 考え方
 * - 回答はすべて answer_history に1件ずつ残す（上書きしない）。
 * - skill_state は保存した値を足し引きせず、毎回 answer_history 全体から計算し直す。
 *   → 同じ履歴からは必ず同じ結果になり、あとで保存先を移しても履歴だけ運べばよい。
 * - 一度の結果で決めつけない：確かさ（confidence）には「どのレベルまでできたか」で上限をかけ、
 *   1回の回答で下がる幅も制限する。
 * - 画面を持たない純粋な関数だけを置く（Node からテストできる）。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});

  var DAY = 24 * 60 * 60 * 1000;

  // ---------- 学習地図（スキルと前提スキル） ----------
  // unit が「既習」のものは前の学年までの内容。「まだ習っていない」の影響を受けない。
  var SKILLS = {
    signed:         { label: "正負の数",       unit: "既習",     prerequisites: [] },
    algebra:        { label: "文字式への代入", unit: "既習",     prerequisites: ["signed"] },
    proportion:     { label: "比例",           unit: "既習",     prerequisites: ["algebra"] },
    coord:          { label: "座標",           unit: "既習",     prerequisites: ["signed"] },
    change:         { label: "変化量",         unit: "一次関数", prerequisites: ["signed"] },
    substitution:   { label: "式への代入",     unit: "一次関数", prerequisites: ["algebra"] },
    rate:           { label: "変化の割合",     unit: "一次関数", prerequisites: ["change"] },
    // 傾きは「変化の割合」そのもの。切片は比例 y = ax からの平行移動として理解する
    slopeIntercept: { label: "傾き・切片",     unit: "一次関数", prerequisites: ["rate", "proportion"] },
    form:           { label: "グラフ・式",     unit: "一次関数", prerequisites: ["slopeIntercept", "rate", "substitution", "coord"] }
  };
  // 現在地画面で上から並べる順（土台 → 一次関数の本体）
  var SKILL_ORDER = ["signed", "algebra", "proportion", "coord", "change", "substitution", "rate", "slopeIntercept", "form"];
  var LEVELS = ["basic", "standard", "application", "retention"];

  // ---------- 調整値（ここを変えると理解度の動き方が変わる） ----------
  var CONFIG = {
    ceiling: { none: 0.3, basic: 0.5, standard: 0.65, application: 0.8, retentionBonus: 0.12, retentionBonus2: 0.15, max: 0.95 },
    ema: { check: 0.35, lesson: 0.175 }, // 最近の結果をどれだけ重く見るか（練習はチェックの半分）
    prior: 0.5,                           // 何も分からないときの正答率の見込み
    startConfidence: 0.3,                 // 記録がないときの確かさ（= ceiling.none。「まだわからない」）
    minConfidence: 0.05,
    // 1回の回答で確かさが動く幅（「一度の結果で決めつけない」ため、小さく固定する）
    step: {
      up: { basic: 0.04, standard: 0.05, application: 0.06, retention: 0.08 },
      down: { normal: 0.05, retention: 0.10 }
    },
    lessonStepScale: 0.5,                 // 練習（lesson）はチェックの半分の幅
    maxDropPerAnswer: 0.10,               // 1回の回答で下がる最大幅（= step.down.retention）
    hintCeilingPenalty: 0.1,              // ヒントありでできたときに下げる上限の幅
    retentionDays: 3,                     // 最初に「できた」から何日後の正解を「定着」の確認とみなすか
    masteredConfidence: 0.85,             // 4レベルすべて pass ＋ この確かさ以上で「マスター」
    levelWindow: 3                        // レベルの判定に使う直近の回答数
  };

  // ---------- 回答1件を記録の形にする ----------
  var seq = 0;
  function makeId(prefix, now) {
    seq = (seq + 1) % 1e6;
    return prefix + "_" + now.toString(36) + "_" + seq.toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // q: 問題（skill / level / unit を持つ）、r: { status, hintUsed }、ctx: { userId, sessionId, context, now }
  function makeAnswerRecord(q, r, ctx) {
    return {
      id: makeId("ans", ctx.now),
      user_id: ctx.userId,
      session_id: ctx.sessionId || null,
      context: ctx.context || "compass_check", // "compass_check" | "lesson"
      question_id: q.id,
      unit: q.unit || "一次関数",
      skill: q.skill,
      level: q.level || "basic",
      evidence_level: q.evidence_level || null,
      correct: r.status === "correct",
      hint_used: !!r.hintUsed,
      unknown_selected: r.status === "unknown",
      answered_at: new Date(ctx.now).toISOString(),
      self_evaluation: null
    };
  }

  // ---------- 理解度の計算 ----------

  // その回答が「どれだけできた」とみなせるか（ヒントありは半分）
  function credit(a) {
    if (!a.correct) return 0;
    return a.hint_used ? 0.5 : 1;
  }

  // 直近 levelWindow 件を新しいものほど重く見て、半分以上できていれば pass
  function levelStatus(attempts) {
    if (!attempts.length) return "not_checked";
    var recent = attempts.slice(-CONFIG.levelWindow);
    var sum = 0, weight = 0;
    for (var i = 0; i < recent.length; i++) {
      var w = i + 1; // 古い 1 … 新しい 3
      sum += credit(recent[i]) * w;
      weight += w;
    }
    return sum / weight >= 0.5 ? "pass" : "needs_review";
  }

  // 上のレベルが「できた」で、その証拠が下のレベルの最後の回答より新しければ、下のレベルも「できた」とみなす。
  // （標準問題が自力で解けるなら、基礎もわかっている。古い基礎の×だけで「要確認」のまま残さない）
  function impliedLevels(levels, byLevel) {
    var order = ["basic", "standard", "application"];
    function lastT(list) { return list.length ? Date.parse(list[list.length - 1].answered_at) : -Infinity; }
    for (var i = order.length - 1; i > 0; i--) {
      var hi = order[i];
      if (levels[hi] !== "pass") continue;
      for (var j = i - 1; j >= 0; j--) {
        var lo = order[j];
        if (levels[lo] === "needs_review" && lastT(byLevel[hi]) > lastT(byLevel[lo])) levels[lo] = "pass";
      }
    }
  }

  // 上限 = どのレベルまでできたか ＋ 数日後もできたか（定着のぶん上乗せ）
  // 例：基礎 0.5 → 基礎＋定着 0.62、応用 0.8 → 応用＋定着 0.92（2回確認で 0.95）
  function ceilingFor(levels, retentionPasses) {
    var c = CONFIG.ceiling;
    var base = c.none;
    if (levels.application === "pass") base = c.application;
    else if (levels.standard === "pass") base = c.standard;
    else if (levels.basic === "pass") base = c.basic;
    if (levels.retention === "pass" && base > c.none) {
      base += retentionPasses >= 2 ? c.retentionBonus2 : c.retentionBonus;
    }
    return Math.min(base, c.max);
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // ひとつのスキルの履歴（古い順）から状態を作る
  function computeOne(skillId, attempts, opts) {
    var byLevel = { basic: [], standard: [], application: [], retention: [] };
    var acc = CONFIG.prior;
    var conf = null;
    var firstPassAt = null;
    var retentionPasses = 0;
    var levels = { basic: "not_checked", standard: "not_checked", application: "not_checked", retention: "not_checked" };
    var lastCheckIndex = -1;
    var lastCheckHinted = false;

    attempts.forEach(function (a, idx) {
      var t = Date.parse(a.answered_at);
      var isCheck = a.context !== "lesson";

      // この回答が「数日後の確認（定着の証拠）」にあたるか。firstPassAt を更新する前に判定する
      var retentionEvidence = isCheck && firstPassAt !== null && t - firstPassAt >= CONFIG.retentionDays * DAY;
      var accBefore = acc;

      if (isCheck) {
        lastCheckIndex = idx;
        // 定着用の問題（level: retention）も、ふだんは基礎・標準の証拠として数える。
        // 「定着」になるかどうかは、問題の種類ではなく日数で決める（下の firstPassAt の判定）
        var lv = a.level === "retention" ? (a.evidence_level || "basic") : a.level;
        byLevel[lv] && byLevel[lv].push(a);
        // 最初に「できた」と言えた日から retentionDays 以上たってからの回答は、定着の確認にもなる
        if (firstPassAt !== null && t - firstPassAt >= CONFIG.retentionDays * DAY) {
          byLevel.retention.push(a);
          if (a.correct && !a.hint_used) retentionPasses++;
        }
        LEVELS.forEach(function (lv) { levels[lv] = levelStatus(byLevel[lv]); });
        impliedLevels(levels, byLevel);
        if (firstPassAt === null && (levels.basic === "pass" || levels.standard === "pass" || levels.application === "pass")) {
          firstPassAt = t;
        }
      }

      // 最近の正答率（練習はチェックの半分の重さ）
      var alpha = isCheck ? CONFIG.ema.check : CONFIG.ema.lesson;
      acc = acc * (1 - alpha) + credit(a) * alpha;

      // 確かさ（confidence）の更新：1回の回答で動く幅を小さく固定する。
      // - 目標値 target ＝「どのレベルまでできたか」の上限 と「これまでの正答率（新しいほど重い）」の小さい方。
      //   正解しても target より上には上がらない → 履歴が悪ければ1回の正解では上がりにくい。
      // - 上がる幅はレベルごとに決まった値まで（基礎 +0.04 / 標準 +0.05 / 応用 +0.06 / 数日後の確認 +0.08）。
      // - 下がる幅は通常 −0.05、数日後の確認 −0.10 まで。これまでの正答率が高いほど下げ幅は小さい。
      // - 練習（lesson）はチェックの半分の幅。ヒントありの正解は上がる幅も半分。
      if (isCheck) lastCheckHinted = a.correct && a.hint_used;
      var ceiling = ceilingFor(levels, retentionPasses) - (lastCheckHinted ? CONFIG.hintCeilingPenalty : 0);
      var target = Math.min(ceiling, 0.1 + acc * 0.9);
      var scale = isCheck ? 1 : CONFIG.lessonStepScale;
      if (conf === null) conf = CONFIG.startConfidence;
      if (a.correct) {
        var levelKey = a.level === "retention" ? (a.evidence_level || "basic") : a.level;
        var up = (retentionEvidence ? CONFIG.step.up.retention : (CONFIG.step.up[levelKey] || CONFIG.step.up.basic)) * scale;
        if (a.hint_used) up *= 0.5;
        conf = Math.min(conf + up, Math.max(conf, target));
      } else {
        var down = (retentionEvidence ? CONFIG.step.down.retention : CONFIG.step.down.normal) * scale;
        down *= 1 - 0.5 * accBefore; // これまでよくできていたスキルほど、1回の×では下げすぎない
        conf = conf - down;
      }
      // 上限（到達レベル）を超えていたら上限に向けて下げるが、1回に下げるのは通常の幅（0.05）まで
      if (conf > ceiling) conf = Math.max(ceiling, conf - CONFIG.step.down.normal);
      conf = Math.min(Math.max(conf, CONFIG.minConfidence), CONFIG.ceiling.max);
    });

    var correctCount = attempts.filter(function (a) { return a.correct; }).length;
    var last = attempts[attempts.length - 1];
    var lessonAfterCheck = attempts.slice(lastCheckIndex + 1).filter(function (a) { return a.context === "lesson"; });

    var status = learningStatus(skillId, levels, attempts.length, lessonAfterCheck, opts);
    // 4つのレベルすべてが pass で確かさも高ければ「マスター」。
    // ただし永久には固定しない（履歴から毎回計算し直すので、あとの不正解で下がりうる）
    if (status === "retained" && LEVELS.every(function (lv) { return levels[lv] === "pass"; }) &&
        conf !== null && conf >= CONFIG.masteredConfidence) {
      status = "mastered";
    }

    return {
      skill: SKILLS[skillId] ? SKILLS[skillId].label : skillId,
      skill_id: skillId,
      learning_status: status,
      basic: levels.basic,
      standard: levels.standard,
      application: levels.application,
      retention: levels.retention,
      confidence: conf === null ? 0 : round2(conf),
      attempt_count: attempts.length,
      correct_count: correctCount,
      suspected_root_causes: [],
      first_pass_at: firstPassAt === null ? null : new Date(firstPassAt).toISOString(),
      last_checked: last ? last.answered_at : null,
      next_action: null
    };
  }

  // 未学習 / 学習中 / 要確認 / 理解 / 活用 / 定着
  function learningStatus(skillId, levels, count, lessonAfterCheck, opts) {
    var inUnit = SKILLS[skillId] && SKILLS[skillId].unit !== "既習";
    var notYet = inUnit && opts.schoolProgress === "notyet";
    if (!count) return notYet ? "not_learned" : "not_checked";
    if (levels.retention === "pass") return "retained";
    if (levels.application === "pass") return "applying";
    if (levels.basic === "pass" || levels.standard === "pass") return "understood";
    // ここから下は「まだできていない」。まだ習っていない単元なら苦手扱いしない
    if (notYet) return "not_learned";
    // チェックのあとに練習して、そこで正解できていれば「学習中」
    if (lessonAfterCheck.some(function (a) { return a.correct; })) return "learning";
    if (levels.basic === "not_checked") return "learning"; // 練習だけで、まだチェックしていない
    return "needs_review";
  }

  var WEAK = { needs_review: true, learning: true };

  // 前提スキルをたどり、いちばん根元にある「まだ不安定なスキル」を原因候補にする
  function rootCauses(skillId, states, seen) {
    seen = seen || {};
    var out = [];
    (SKILLS[skillId] ? SKILLS[skillId].prerequisites : []).forEach(function (p) {
      if (seen[p]) return;
      seen[p] = true;
      var s = states[p];
      if (!s || !WEAK[s.learning_status]) return;
      var deeper = rootCauses(p, states, seen);
      out = out.concat(deeper.length ? deeper : [p]);
    });
    return out.filter(function (v, i) { return out.indexOf(v) === i; });
  }

  var NEXT_ACTION = {
    signed: "review_signed_numbers", algebra: "review_substitution", proportion: "review_proportion",
    coord: "review_coordinates", change: "review_change_amount", substitution: "review_substitution",
    rate: "review_rate_of_change", slopeIntercept: "review_slope_intercept", form: "practice_slope_to_equation"
  };

  function nextAction(skillId, s, rootIds, now) {
    if (WEAK[s.learning_status]) {
      return rootIds.length ? NEXT_ACTION[rootIds[0]] : NEXT_ACTION[skillId];
    }
    if (s.learning_status === "understood" || s.learning_status === "applying") {
      if (s.first_pass_at && s.retention === "not_checked" && now - Date.parse(s.first_pass_at) >= CONFIG.retentionDays * DAY) {
        return "retention_check_due";
      }
      if (s.standard === "not_checked") return "try_standard";
      if (s.standard === "needs_review") return "practice_standard";
      if (s.application === "not_checked") return "try_application";
      return "wait_for_retention_check";
    }
    if (s.learning_status === "retained" || s.learning_status === "mastered") return "keep";
    return null;
  }

  // 応用問題の小問（question_id が "問題ID#小問ID"）は小問ごとに記録するが、
  // 理解度を計算するときは「1つの問題の中の、同じスキルの小問」を1回分にまとめる。
  // まとめた1回は、そのスキルの小問がすべて正解のときだけ正解（1問の中で×と○が混ざっても、できたことにしない）。
  function mergeSteps(sorted) {
    var out = [], groups = {};
    sorted.forEach(function (a) {
      var qid = String(a.question_id);
      var hash = qid.indexOf("#");
      if (hash === -1) { out.push(a); return; }
      var key = qid.slice(0, hash) + "|" + a.skill + "|" + (a.session_id || "") + "|" + a.context;
      var g = groups[key];
      if (g && Date.parse(a.answered_at) - Date.parse(g.answered_at) < 60 * 60 * 1000) {
        g.correct = g.correct && a.correct;
        g.hint_used = g.hint_used || a.hint_used;
        g.unknown_selected = g.unknown_selected || a.unknown_selected;
        return;
      }
      g = groups[key] = {};
      for (var k in a) g[k] = a[k];
      g.question_id = qid.slice(0, hash);
      out.push(g);
    });
    return out;
  }

  // answer_history 全体から、全スキルの skill_state を作る
  // opts: { schoolProgress: "done" | "learning" | "notyet", now: ミリ秒 }
  function computeSkillStates(history, opts) {
    opts = opts || {};
    var now = opts.now || Date.now();
    var bySkill = {};
    mergeSteps(history.slice().sort(function (a, b) { return Date.parse(a.answered_at) - Date.parse(b.answered_at) || (a.question_id < b.question_id ? -1 : 1); }))
      .forEach(function (a) { (bySkill[a.skill] = bySkill[a.skill] || []).push(a); });

    var states = {};
    SKILL_ORDER.forEach(function (id) { states[id] = computeOne(id, bySkill[id] || [], opts); });
    SKILL_ORDER.forEach(function (id) {
      var s = states[id];
      var rootIds = WEAK[s.learning_status] ? rootCauses(id, states) : [];
      s.suspected_root_causes = rootIds.map(function (p) { return SKILLS[p].label; });
      s.next_action = nextAction(id, s, rootIds, now);
    });
    return states;
  }

  // 画面用：学習状態の表示
  var STATUS_VIEW = {
    mastered:     { mark: "★", label: "マスター",   tone: "ok" },
    retained:     { mark: "◎", label: "定着",       tone: "ok" },
    applying:     { mark: "◎", label: "活用できる", tone: "ok" },
    understood:   { mark: "○", label: "理解",       tone: "ok" },
    learning:     { mark: "↗", label: "学習中",     tone: "learning" },
    needs_review: { mark: "△", label: "要確認",     tone: "warn" },
    not_learned:  { mark: "・", label: "未学習",     tone: "muted" },
    not_checked:  { mark: "−", label: "まだ",       tone: "muted" }
  };

  // 状態の「高さ」。前回と今回をくらべて、上がったか下がったかを判断するのに使う
  var STATUS_RANK = { not_checked: 0, not_learned: 0, needs_review: 1, learning: 2, understood: 3, applying: 4, retained: 5, mastered: 6 };

  // セッションの終わりに、確かさの控え（前回との比較用）を作る
  function snapshot(states) {
    var out = {};
    Object.keys(states).forEach(function (k) {
      out[k] = { confidence: states[k].confidence, learning_status: states[k].learning_status };
    });
    return out;
  }

  SC.engine = {
    SKILLS: SKILLS, SKILL_ORDER: SKILL_ORDER, LEVELS: LEVELS, CONFIG: CONFIG, STATUS_VIEW: STATUS_VIEW, STATUS_RANK: STATUS_RANK, DAY: DAY,
    makeId: makeId, makeAnswerRecord: makeAnswerRecord, computeSkillStates: computeSkillStates, snapshot: snapshot
  };
})(typeof window !== "undefined" ? window : globalThis);
