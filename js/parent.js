/*
 * Study Compass — 保護者向けのまとめ（学習のようす）
 *
 * 子ども向け画面と同じデータ（answer_history / skill_state / compass_check_history / explorations / plans）を使い、
 * 見せ方だけを変える。子ども向けは「今日なにをするか」、保護者向けは「なぜそれをやっているか」まで。
 *
 * 伝えるのは「成長」「現在地」「次の方針」。
 * しないこと：点数・正誤の数・他の子との比較・ランキング・「苦手」と断定すること・毎回の間違いを強調すること。
 * 画面を持たない純粋な関数だけを置く（Node からテストできる）。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});
  var E = SC.engine;

  var CONFIG = {
    WEEK_DAYS: 7,               // 「今週」＝直近7日
    STUMBLE_DAYS: 14,           // つまずきの可能性を見る期間
    MINUTES_PER_CHECK_QUESTION: 1, // コンパスチェックの学習時間の目安（1問あたり）
    COMPASS_CHECK_DAYS: 3       // 次のコンパスチェックの目安（js/compass.js と同じ）
  };

  // 保護者向けのことば（点数や「要確認」のような評価語を使わない）
  var WORD = {
    mastered: { mark: "◎", word: "しっかり身についてきている" },
    retained: { mark: "◎", word: "少しずつ身についてきている" },
    applying: { mark: "◎", word: "応用にも使えている" },
    understood: { mark: "○", word: "基本はできている" },
    learning: { mark: "↗", word: "練習しているところ" },
    needs_review: { mark: "△", word: "確認しているところ" },
    not_learned: { mark: "・", word: "学校でこれから習う" },
    not_checked: { mark: "−", word: "まだ取り組んでいない" }
  };
  var TYPE_STEP = {
    review: function (s) { return "「" + s.skill_label + "」を短く復習"; },
    practice: function (s) { return "「" + s.skill_label + "」を、いろいろな形の問題で補強"; },
    current_unit: function (s) { return "「" + s.skill_label + "」（学校の単元）へ戻る"; },
    challenge: function (s) { return "「" + s.skill_label + "」で一段上の問題に挑戦"; },
    test: function (s) { return "テストに向けて「" + s.skill_label + "」をテストに出る形で練習"; }
  };

  function label(k) { return E.SKILLS[k] ? E.SKILLS[k].label : k; }
  function t(a) { return Date.parse(a.answered_at); }
  function dateKey(ms) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function md(ms) { var d = new Date(ms); return (d.getMonth() + 1) + "/" + d.getDate(); }
  function rank(s) { return s ? (E.STATUS_RANK[s.learning_status] || 0) : 0; }

  // input: { history, states, compassHistory, explorations, plans, now, school, testPrep, todayPlan }
  function report(input) {
    var history = input.history || [], states = input.states || {}, now = input.now;
    var weekStart = now - CONFIG.WEEK_DAYS * E.DAY;
    var dbg = { sources: {}, growth: [], stumble: [], next: [] };
    dbg.sources = { answers: history.length, compass_checks: (input.compassHistory || []).length,
      explorations: (input.explorations || []).length, plans: (input.plans || []).length };

    // ---------- 1. 今週の学習 ----------
    var week = history.filter(function (a) { return t(a) >= weekStart && t(a) <= now; });
    var days = {};
    week.forEach(function (a) { days[dateKey(t(a))] = true; });
    var planMinutes = (input.plans || []).filter(function (p) {
      return p.completed_at && Date.parse(p.completed_at) >= weekStart && Date.parse(p.completed_at) <= now;
    }).reduce(function (s, p) { return s + (p.total_minutes || 0); }, 0);
    var checkAnswers = week.filter(function (a) { return a.context === "compass_check"; }).length;
    var minutes = planMinutes + Math.round(checkAnswers * CONFIG.MINUTES_PER_CHECK_QUESTION);
    var weekInfo = { active_days: Object.keys(days).length, minutes: minutes, unit: (input.school && input.school.current_unit) || "一次関数",
      school_status: (input.school && input.school.school_status) || "learning" };
    dbg.week = { answers_in_week: week.length, plan_minutes: planMinutes, check_answers: checkAnswers };

    // ---------- 2. 最近できるようになったこと（1週間前と比べる） ----------
    var before = E.computeSkillStates(history.filter(function (a) { return t(a) <= weekStart; }),
      { now: weekStart, schoolProgress: weekInfo.school_status });
    var growth = [];
    E.SKILL_ORDER.forEach(function (k) {
      var a = before[k], b = states[k];
      if (!b || !b.attempt_count) return;
      var newly = ["application", "standard", "retention", "basic"].filter(function (lv) { return b[lv] === "pass" && (!a || a[lv] !== "pass"); });
      var up = rank(b) > rank(a);
      var judge = { skill: k, before: a ? a.learning_status : "not_checked", after: b.learning_status, newly_passed: newly, rank_up: up };
      if (!up && !newly.length) { judge.result = "変化なし"; dbg.growth.push(judge); return; }
      // 「身についてきています」は、数日後の確認が1回だけなら言い切らない
      var text = newly.indexOf("retention") !== -1
          ? (b.retention_count >= 2 ? "数日後の確認でもできており、少しずつ身についてきています。" : "前回学んだ内容を、今回も使うことができました。")
        : newly.indexOf("application") !== -1 ? "知識を組み合わせる問題にも取り組めるようになってきました。"
        : newly.indexOf("standard") !== -1 ? "基礎問題だけでなく、形が変わった問題でも安定してきました。"
        : "基本の問題を、自分で解けるようになってきました。";
      var wa = WORD[a ? a.learning_status : "not_checked"] || WORD.not_checked, wb = WORD[b.learning_status] || WORD.not_checked;
      judge.result = "成長"; dbg.growth.push(judge);
      var wasWeak = !a || a.learning_status === "needs_review" || a.learning_status === "learning";
      growth.push({ skill: k, label: label(k), from: wa.mark, to: wb.mark, from_word: wa.word, to_word: wb.word, text: text, rank_up: up,
        was_weak: wasWeak && rank(a) > 0, in_unit: E.SKILLS[k].unit === weekInfo.unit });
    });
    // 大事な順：確認していたところ（△）から伸びた → 単元のスキル → 段階が上がった
    function score(g) { return (g.was_weak ? 4 : 0) + (g.in_unit ? 2 : 0) + (g.rank_up ? 1 : 0); }
    growth.sort(function (x, y) { return score(y) - score(x); });
    dbg.growth_order = growth.map(function (g) { return g.label + "(" + score(g) + ")"; });

    // ---------- 3. つまずきの可能性（断定しない） ----------
    var since = now - CONFIG.STUMBLE_DAYS * E.DAY;
    var stumbles = [], seen = {};
    (input.explorations || []).slice().reverse().forEach(function (x) {
      var c = x.conclusion;
      if (!c || !c.return_to || c.kind === "not_reproduced" || Date.parse(x.date) < since) return;
      var k = c.return_to;
      if (seen[k]) return;
      var s = states[k];
      var resolved = s && rank(s) >= 3 && s.learning_status !== "needs_review" && s.learning_status !== "learning";
      var misses = history.filter(function (a) { return a.skill === k && !a.correct && t(a) >= since; }).length;
      dbg.stumble.push({ skill: k, from: x.symptom.label, kind: c.kind, misses_14d: misses, resolved: resolved });
      if (resolved) return;
      seen[k] = true;
      var often = misses >= 2 ? "迷うことが何度かあり" : "迷うことがあり";
      var text = k === x.symptom.skill || label(k) === x.symptom.label
        ? "「" + label(k) + "」そのものの考え方で" + often + "、いま一緒に確認しています。" + (c.solid_skills && c.solid_skills.length ? "その前にある「" + c.solid_skills.slice(0, 2).map(label).join("」「") + "」" + (c.solid_skills.length > 2 ? "など" : "") + "はできています。" : "")
        : "「" + label(k) + "」で" + often + "、「" + x.symptom.label + "」の問題にも影響している可能性があります。";
      stumbles.push({ skill: k, label: label(k), symptom: x.symptom.label, text: text });
    });
    // 原因さがしで見つかっていなくても、記録上まだ不安定なスキル（いちばん根元だけ）
    E.SKILL_ORDER.forEach(function (k) {
      var s = states[k];
      if (!s || seen[k] || (s.learning_status !== "needs_review")) return;
      if (s.suspected_root_causes && s.suspected_root_causes.length) return; // 根元はほかのスキル
      var misses = history.filter(function (a) { return a.skill === k && !a.correct && t(a) >= since; }).length;
      if (misses < 2) return; // 1回の×では取り上げない
      seen[k] = true;
      dbg.stumble.push({ skill: k, from: "記録", misses_14d: misses, resolved: false });
      stumbles.push({ skill: k, label: label(k), symptom: null, text: "「" + label(k) + "」で迷うことが何度かあるようです。もう少し確かめながら進めています。" });
    });

    // ---------- 4. 今確認しているところ ----------
    var plan = input.todayPlan && !input.todayPlan.fallback ? input.todayPlan : null;
    var focusKey = plan ? plan.focus_skill : null;
    if (!focusKey) {
      var last = (input.plans || []).slice().reverse().filter(function (p) { return p.focus_skill; })[0];
      focusKey = last ? last.focus_skill : null;
    }
    var focus = null;
    if (focusKey) {
      var st = stumbles.filter(function (s) { return s.skill === focusKey && s.symptom && s.symptom !== label(focusKey); })[0];
      var fs = states[focusKey];
      var why = st ? "「" + st.symptom + "」そのものではなく、その前にある「" + label(focusKey) + "」を確認しています。ここが安定すると、「" + st.symptom + "」の問題も進めやすくなります。"
        : fs && (fs.learning_status === "needs_review" || fs.learning_status === "learning") ? "「" + label(focusKey) + "」の考え方を、数式・表・グラフなど、いろいろな形の問題で確かめています。"
        : input.testPrep ? "テストに向けて、「" + label(focusKey) + "」をテストに出る形の問題で練習しています。"
        : "「" + label(focusKey) + "」は基本ができているので、形を変えた問題で一段上を目指しています。";
      focus = { skill: focusKey, label: label(focusKey), why: why };
    }

    // ---------- 5. Study Compass の予定 ----------
    var next = [];
    if (plan) {
      plan.sessions.forEach(function (s) {
        var f = TYPE_STEP[s.type];
        if (!f) return;
        var step = f(s);
        if (next.indexOf(step) === -1) next.push(step);
      });
    }
    var nextCheck = nextCheckDate(history, now);
    if (input.testPrep) {
      var left = Math.round((new Date(input.testPrep.test_date + "T00:00:00").getTime() - new Date(dateKey(now) + "T00:00:00").getTime()) / E.DAY);
      if (left >= 1) next.push("テスト（" + input.testPrep.test_date.slice(5).replace("-", "/") + "）まで残り " + left + " 日の計画で進め、前日は範囲をひととおり確認");
    }
    next.push(nextCheck.due ? "近いうちにコンパスチェック（今の理解を、前とは違う問題で短く確かめます）"
      : md(nextCheck.at) + " ごろにコンパスチェック（今の理解を、前とは違う問題で短く確かめます）");
    dbg.next = { plan_sessions: plan ? plan.sessions.map(function (s) { return s.type + ":" + s.skill; }) : [], next_check: nextCheck };

    // ---------- 6. 今週のひとこと（通知の文） ----------
    var lines = [];
    var g = growth[0];
    if (g) lines.push("今週は「" + g.label + "」の理解が安定してきました。");
    else if (weekInfo.active_days) lines.push("今週は " + weekInfo.active_days + " 日、学習しました。少しずつ積み重ねています。");
    else lines.push("今週はまだ学習していません。無理のないペースで大丈夫です。");
    if (focus) lines.push("次は「" + focus.label + "」を中心に進めます。");
    var message = lines.join("");

    // ---------- 7. 単元の地図（評価ではなく、いまどこにいるか） ----------
    var map = E.SKILL_ORDER.filter(function (k) { return states[k] && (states[k].attempt_count || states[k].learning_status === "not_learned"); })
      .map(function (k) { var w = WORD[states[k].learning_status] || WORD.not_checked; return { skill: k, label: label(k), mark: w.mark, word: w.word, unit: E.SKILLS[k].unit }; });

    return { empty: !history.length, week: weekInfo, message: message, growth: growth, focus: focus, stumbles: stumbles, next: next, map: map, debug: dbg };
  }

  // 次のコンパスチェックの目安：各スキルの最後の確認 ＋ 3日 のうち、いちばん早い日
  function nextCheckDate(history, now) {
    var lastBySkill = {};
    history.forEach(function (a) {
      if (a.context === "lesson") return;
      if (!lastBySkill[a.skill] || t(a) > lastBySkill[a.skill]) lastBySkill[a.skill] = t(a);
    });
    var times = Object.keys(lastBySkill).map(function (k) { return lastBySkill[k] + CONFIG.COMPASS_CHECK_DAYS * E.DAY; });
    if (!times.length) return { due: false, at: now + CONFIG.COMPASS_CHECK_DAYS * E.DAY };
    var at = Math.min.apply(null, times);
    return { due: at <= now, at: at };
  }

  SC.parent = { CONFIG: CONFIG, WORD: WORD, report: report, nextCheckDate: nextCheckDate };
})(typeof window !== "undefined" ? window : globalThis);
