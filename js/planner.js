/*
 * Study Compass — 今日の学習の自動生成（Phase 5）
 *
 * 「現在地を知る → 目的地を決める → 今日の一歩を示す」の3つ目。
 * 固定プランを選ぶのではなく、その子の現在地と条件から、今日の学習を組み立てる。
 *
 * 入力：school_progress（学校の進み具合）/ available_minutes（今日の時間）/ learning_goal（学習目標）
 *       / skill_state / explorations（つまずきの原因さがし）/ answer_history（最近の学習）
 * 優先順位：1 根本のつまずき → 2 学校で学習中の単元 → 3 定着の確認 → 4 得意の発展
 * 時間配分：20/30/45/60分の「枠」を土台に、中身（スキル・レベル）を skill_state で決める。
 *           当てはまる中身がない枠は、ほかの枠に時間を回す。
 * 前進：最近の練習でできたレベルは、翌日は1つ上のレベル（または次のスキル）に進む。
 *
 * 画面を持たない純粋な関数だけを置く（Node からテストできる）。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});
  var E = SC.engine;

  var CONFIG = {
    MINUTES: [20, 30, 45, 60],
    DEFAULT_MINUTES: 30,
    DEFAULT_GOAL: "daily_learning",
    PRACTICE_WINDOW_DAYS: 7,     // 「最近の練習」とみなす日数
    PRACTICED_MIN_ATTEMPTS: 2,   // そのレベルを「練習でできた」とみなす最少回答数
    PRACTICED_RATIO: 0.67,       // そのレベルを「練習でできた」とみなす正答率（3回中2回）
    AVOID_CHECK_DAYS: 7,         // 診断・チェックで出した問題を、練習で避ける日数
    AVOID_LESSON_DAYS: 2,        // 練習で出した問題を、次の練習で避ける日数
    EXPLORATION_DAYS: 14,        // 原因さがしの結論を使う日数
    RETENTION_DAYS: 3,           // 最初にできた日から何日で定着を確かめるか（engine と同じ）
    LONG_GAP_DAYS: 14            // 定着していても、この日数あいたら確かめ直す
  };

  var GOALS = { daily_learning: "いつもの勉強", catch_up: "苦手を戻る", review: "復習", challenge: "もう少し先へ" };
  // テスト対策はホームの目標ボタンには出さず、テストの予定を入れたときだけ使う
  var ALL_GOALS = { daily_learning: GOALS.daily_learning, catch_up: GOALS.catch_up, review: GOALS.review, challenge: GOALS.challenge, test_preparation: "テスト対策" };
  var TYPE_LABEL = { review: "復習・ウォームアップ", practice: "つまずき補強", current_unit: "学校の単元", check: "確認", challenge: "もう少し先へ", test: "テストに出る形で" };
  var LEVEL_JA = { basic: "基礎", standard: "標準", application: "応用", retention: "定着の確認" };
  var UNIT_SKILLS = E.UNITS; // 単元ごとのスキル（js/engine.js で一元管理）
  var ROOT_ORDER = E.ROOT_ORDER; // 前提に近い順（js/engine.js で一元管理）

  // 時間の「枠」。role は中身の決め方（下の resolveRole）
  var TEMPLATES = {
    20: [{ role: "warmup", m: 5 }, { role: "main", m: 10 }, { role: "check", m: 5 }],
    30: [{ role: "warmup", m: 5 }, { role: "reinforce", m: 10 }, { role: "current", m: 10 }, { role: "check", m: 5 }],
    45: [{ role: "warmup", m: 5 }, { role: "reinforce", m: 15 }, { role: "current", m: 15 }, { role: "advance", m: 10 }],
    60: [{ role: "review", m: 10 }, { role: "reinforce", m: 20 }, { role: "current", m: 20 }, { role: "advance", m: 10 }]
  };
  // 学習目標で枠の役割を入れかえる
  var GOAL_ROLES = {
    daily_learning: {},
    catch_up: { current: "reinforce_next", advance: "reinforce_next", warmup: "warmup" },
    review: { reinforce: "review", main: "review", current: "review_unit", advance: "review", check: "check_retention" },
    challenge: { reinforce: "advance", main: "advance", current: "current_up", check: "check_advance" },
    test_preparation: { warmup: "warmup", reinforce: "reinforce", main: "test_focus", current: "test_focus", advance: "test_range", review: "test_range", check: "check" }
  };

  var RANK = E.STATUS_RANK;
  function label(k) { return E.SKILLS[k] ? E.SKILLS[k].label : k; }
  function t(a) { return Date.parse(a.answered_at); }
  function baseId(qid) { return String(qid).split("#")[0]; }
  function nearestMinutes(m) {
    var best = CONFIG.MINUTES[0];
    CONFIG.MINUTES.forEach(function (x) { if (Math.abs(x - m) < Math.abs(best - m)) best = x; });
    return best;
  }

  // ---------- 現在地の読み取り ----------
  function analyze(input) {
    var states = input.states || {}, history = input.history || [], now = input.now;
    var school = input.school || {};
    var unit = school.current_unit || "一次関数";
    var unitSkills = UNIT_SKILLS[unit] || [];
    var log = [];

    function st(k) { return states[k] || { attempt_count: 0, learning_status: "not_checked" }; }
    function weak(k) { var s = st(k); return s.learning_status === "needs_review" || s.learning_status === "learning"; }
    function rank(k) { return RANK[st(k).learning_status] || 0; }

    // 最近の練習で、そのレベルが「できた」か（練習はレベル判定に使わないので、ここで前進の判断に使う）
    function practiced(k, lv) {
      var recent = history.filter(function (a) {
        if (a.skill !== k || a.context !== "lesson" || now - t(a) > CONFIG.PRACTICE_WINDOW_DAYS * E.DAY) return false;
        var alv = a.level === "retention" ? (a.evidence_level || "basic") : a.level;
        return alv === lv;
      });
      if (recent.length < CONFIG.PRACTICED_MIN_ATTEMPTS) return false;
      // 直近3回で判断する（前の日の×がいつまでも足を引っぱらないように）
      recent.sort(function (x, y) { return t(x) - t(y); });
      var last = recent.slice(-3);
      var ok = last.filter(function (a) { return a.correct && !a.hint_used; }).length;
      return ok / last.length >= CONFIG.PRACTICED_RATIO;
    }
    function done(k, lv) { return st(k)[lv] === "pass" || practiced(k, lv); }
    // 問題バンクにそのレベルの問題が1問もないスキル（例：連立方程式の意味の標準）は、そのレベルを目標にしない
    function hasLevel(k, lv) { return !SC.bank || !SC.bank.index[k] || SC.bank.index[k][lv].length > 0; }
    function nextLevel(k, levels) {
      levels = levels || ["basic", "standard", "application"];
      for (var i = 0; i < levels.length; i++) if (hasLevel(k, levels[i]) && !done(k, levels[i])) return levels[i];
      return null;
    }

    var excluded = [];
    var p1 = [], p2 = [], p3 = [], p4 = [];

    // --- 優先度1：根本のつまずき（原因さがしの「戻る場所」＋ いちばん根元の不安定なスキル） ---
    var fromExpl = {}, symptomOf = {}; // 戻る場所 → 最初にまちがえた問題のスキル（補強のあと、そこへ戻る）
    (input.explorations || []).forEach(function (x) {
      var c = x.conclusion;
      if (!c || !c.return_to || c.kind === "not_reproduced") return;
      if (now - Date.parse(x.date) > CONFIG.EXPLORATION_DAYS * E.DAY) return;
      if (!weak(c.return_to) && rank(c.return_to) >= 3) {
        var msg = "原因さがしの戻る場所「" + label(c.return_to) + "」は、そのあとできるようになったので優先度1から外す";
        if (log.indexOf(msg) === -1) log.push(msg);
        return;
      }
      fromExpl[c.return_to] = fromExpl[c.return_to] || x.symptom.label;
      symptomOf[c.return_to] = symptomOf[c.return_to] || x.symptom.skill;
    });
    ROOT_ORDER.forEach(function (k) {
      if (!fromExpl[k] && !weak(k)) return;
      var lv = nextLevel(k, ["basic", "standard"]);
      if (!lv) {
        excluded.push({ skill: k, why: "つまずきの補強は、最近の練習で基礎・標準ともできている" });
        return;
      }
      p1.push({ skill: k, level: lv, source: fromExpl[k] ? "exploration" : "weak", symptom: fromExpl[k] || null, symptom_skill: symptomOf[k] || null,
        advanced: lv === "standard" && practiced(k, "basic") && st(k).basic !== "pass" });
    });

    // --- 優先度2：学校で学習中の単元 ---
    var status = school.school_status || "learning";
    unitSkills.forEach(function (k) {
      if (status === "notyet") {
        // まだ習っていない単元は「先取り」。最初の方のスキルの基礎だけ
        if (rank(k) < 3) p2.push({ skill: k, level: "basic", preview: true });
        return;
      }
      var lv = nextLevel(k, ["basic", "standard", "application"]);
      if (!lv) { excluded.push({ skill: k, why: "学校の単元のスキルだが、基礎・標準・応用ともできている" }); return; }
      p2.push({ skill: k, level: lv });
    });
    if (status === "notyet") p2 = p2.slice(0, 2);

    // --- 優先度3：定着の確認 ---
    E.SKILL_ORDER.forEach(function (k) {
      var s = st(k);
      if (!s.attempt_count || !s.first_pass_at) return;
      // まだ標準・応用に「要確認」があるスキルは、定着の確認より先にそこを確かめる
      if (weak(k) || s.standard === "needs_review" || s.application === "needs_review") return;
      var since = now - Date.parse(s.first_pass_at);
      if (s.retention !== "pass" && since >= CONFIG.RETENTION_DAYS * E.DAY) p3.push({ skill: k, level: "retention", why: "一度できてから" + Math.floor(since / E.DAY) + "日" });
      else if ((s.learning_status === "retained" || s.learning_status === "mastered") && s.last_checked &&
        now - Date.parse(s.last_checked) >= CONFIG.LONG_GAP_DAYS * E.DAY) p3.push({ skill: k, level: "retention", why: "前回の確認から時間がたった" });
    });
    p3.sort(function (a, b) { return Date.parse(st(a.skill).first_pass_at) - Date.parse(st(b.skill).first_pass_at); });

    // --- 優先度4：得意の発展（できているスキルを、標準・応用へ） ---
    E.SKILL_ORDER.forEach(function (k) {
      if (weak(k) || rank(k) < 3) return;
      var lv = nextLevel(k, ["standard", "application"]);
      if (!lv) return;
      if (E.SKILLS[k].unit === "既習") return; // 既習スキルは標準・応用の問題を持たない
      p4.push({ skill: k, level: lv, confidence: st(k).confidence });
    });
    p4.sort(function (a, b) {
      var ua = unitSkills.indexOf(a.skill) !== -1 ? 0 : 1, ub = unitSkills.indexOf(b.skill) !== -1 ? 0 : 1;
      return ua - ub || b.confidence - a.confidence;
    });

    // テスト対策モード：範囲の中だけで組み立てる。今日の予定スキルを先頭に
    var test = input.test;
    if (test) {
      var inRange = function (c) { return test.range.indexOf(c.skill) !== -1; };
      E.SKILL_ORDER.forEach(function (k) { if (test.range.indexOf(k) === -1) excluded.push({ skill: k, why: "テスト範囲外" }); });
      var focusFirst = function (x, y) { return (test.focus.indexOf(x.skill) === -1 ? 1 : 0) - (test.focus.indexOf(y.skill) === -1 ? 1 : 0); };
      p1 = p1.filter(inRange).sort(focusFirst);
      p2 = p2.filter(inRange).sort(focusFirst);
      p3 = p3.filter(inRange);
      p4 = p4.filter(inRange);
      log.push("テスト対策：範囲 " + test.range.map(label).join("・") + "／今日の予定 " + test.focus.map(label).join("・"));
    }

    // 扱わないスキル
    E.SKILL_ORDER.forEach(function (k) {
      var s = st(k);
      if (s.learning_status === "mastered") excluded.push({ skill: k, why: "マスター済み（定着の確認の時期まで扱わない）" });
      else if (!s.attempt_count && unitSkills.indexOf(k) === -1) excluded.push({ skill: k, why: "まだ記録がなく、学校の単元でもない" });
      else if (s.learning_status === "not_learned" && status !== "notyet") excluded.push({ skill: k, why: "学校でまだ習っていない" });
    });

    return { p1: p1, p2: p2, p3: p3, p4: p4, excluded: excluded, log: log, st: st, weak: weak, rank: rank, done: done, practiced: practiced, unitSkills: unitSkills,
      nextLevel: nextLevel, test: test || null };
  }

  // スキル k が、前提をたどると r にたどりつくか
  function dependsOn(k, r, seen) {
    seen = seen || {};
    if (seen[k]) return false;
    seen[k] = true;
    var pre = E.SKILLS[k] ? E.SKILLS[k].prerequisites : [];
    return pre.indexOf(r) !== -1 || pre.some(function (p) { return dependsOn(p, r, seen); });
  }

  // ---------- 枠の中身を決める ----------
  function resolveRole(role, a, chosen) {
    function used(k, lv) { return chosen.some(function (c) { return c.skill === k && (!lv || c.level === lv); }); }
    function first(list, type, why, allowSameSkill) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (allowSameSkill ? used(c.skill, c.level) : used(c.skill)) continue;
        return { skill: c.skill, level: c.level, type: type, why: why(c), meta: c };
      }
      return null;
    }
    var focus = chosen.filter(function (c) { return c.type === "practice" || c.type === "current_unit" || c.type === "challenge"; })[0];
    switch (role) {
      case "warmup": {
        var r = first(a.p3, "review", function (c) { return "定着の確認（" + c.why + "）"; });
        if (r) return r;
        // 今日の中心スキルの前提で、できているものを軽く思い出す
        var target = a.p1[0] || a.p2[0];
        if (target) {
          var pre = (E.SKILLS[target.skill].prerequisites || []).filter(function (p) {
            return a.rank(p) >= 3 && !used(p) && (!a.test || a.test.range.indexOf(p) !== -1); // テスト対策中は範囲の中だけ
          })[0];
          if (pre) return { skill: pre, level: "basic", type: "review", why: "今日の「" + label(target.skill) + "」の前にある、できている内容を思い出す" };
        }
        return null;
      }
      case "reinforce":
        return first(a.p1, "practice", function (c) { return c.symptom ? "原因さがしで見つかった戻る場所（" + c.symptom + " から）" : "まだ不安定な、いちばん根元のスキル"; });
      case "reinforce_next": {
        var r2 = first(a.p1, "practice", function () { return "苦手を戻る日なので、次の不安定なスキルも補強"; });
        return r2 || first(a.p2, "current_unit", function () { return "学校の単元"; });
      }
      case "main":
        return first(a.p1, "practice", function (c) { return c.symptom ? "原因さがしで見つかった戻る場所" : "まだ不安定な、いちばん根元のスキル"; }) ||
          first(a.p2, "current_unit", function () { return "学校で学習中の単元"; }) ||
          first(a.p4, "challenge", function () { return "できているので、形を変えた問題へ"; });
      case "current": {
        // つまずきの補強をしたら、学校の単元に戻る。
        // まず「補強したスキルを前提にしていて、まだ不安定な単元のスキル」（例：変化量 → 変化の割合）に、基礎から戻る
        var practiced = chosen.filter(function (c) { return c.type === "practice"; });
        var reinforced = practiced.map(function (c) { return c.skill; });
        // 原因さがしの「戻る場所」を補強したなら、最初にまちがえた問題のスキル（学校の単元）に戻る
        // （例：加減法 × → 移項 を補強 → 加減法へ。加減法の基礎はできていても、まちがえた問題のレベルで）
        var symptomBack = practiced.map(function (c) { return c.meta && c.meta.symptom_skill; }).filter(function (k) { return k && a.unitSkills.indexOf(k) !== -1; })
          .map(function (k) { var p = a.p2.filter(function (c) { return c.skill === k; })[0]; return p ? { skill: k, level: p.level } : null; }).filter(Boolean);
        var fromSymptom = first(symptomBack, "current_unit", function (c) { return "補強した内容を使って、つまずいた「" + label(c.skill) + "」の問題に戻る"; });
        if (fromSymptom) return fromSymptom;
        // （基礎はできていても、標準・応用に「要確認」があれば、そのレベルに戻る：例 移項 → グラフ・式の標準）
        var backTo = a.p2.filter(function (c) {
          var s = a.st(c.skill);
          var shaky = a.weak(c.skill) || s.standard === "needs_review" || s.application === "needs_review";
          return shaky && reinforced.some(function (r) { return dependsOn(c.skill, r); });
        }).map(function (c) {
          var s = a.st(c.skill);
          return { skill: c.skill, level: a.weak(c.skill) ? "basic" : s.standard === "needs_review" ? "standard" : "application" };
        });
        return first(backTo, "current_unit", function () { return "補強した内容を使って、学校の単元の問題に戻る"; }) ||
          first(a.p2, "current_unit", function (c) { return c.preview ? "学校でこれから習う内容を少し先取り" : "学校で学習中の単元から離れすぎないように"; }) ||
          first(a.p2, "current_unit", function () { return "学校で学習中の単元"; }, true);
      }
      case "current_up": {
        var cu = first(a.p4.filter(function (c) { return a.unitSkills.indexOf(c.skill) !== -1; }), "challenge", function () { return "学校の単元で、できているところを一段上へ"; });
        return cu || first(a.p2, "current_unit", function () { return "学校で学習中の単元"; });
      }
      case "advance":
        return first(a.p4, "challenge", function (c) { return "「" + label(c.skill) + "」はできているので、" + LEVEL_JA[c.level] + "へ"; }) ||
          first(a.p2.filter(function (c) { return c.level !== "basic"; }), "challenge", function () { return "学校の単元を一段上へ"; });
      case "review":
        return first(a.p3, "review", function (c) { return "定着の確認（" + c.why + "）"; }) ||
          first(a.p4.map(function (c) { return { skill: c.skill, level: "standard" === c.level ? "basic" : "standard" }; }), "review", function () { return "できているところの復習"; });
      case "review_unit":
        return first(a.p2.map(function (c) { return { skill: c.skill, level: c.level === "basic" ? "basic" : "standard" }; }), "review", function () { return "学校の単元の復習"; });
      case "check":
        // 今日の中心スキルを、別の問題で確かめる
        if (focus) return { skill: focus.skill, level: focus.level, type: "check", why: "今日の「" + label(focus.skill) + "」ができたか、別の問題で確かめる" };
        return first(a.p3, "check", function () { return "定着の確認"; });
      case "check_retention":
        return first(a.p3, "check", function () { return "定着の確認"; }) ||
          (focus ? { skill: focus.skill, level: focus.level, type: "check", why: "今日の内容の確認" } : null);
      case "check_advance":
        return focus ? { skill: focus.skill, level: focus.level === "basic" ? "standard" : focus.level, type: "check", why: "もう少し先の問題で確かめる" } : null;
      // --- テスト対策 ---
      case "test_focus": {
        // 今日の予定スキルを、テストに出る形（基礎ができていれば標準以上）で
        var tf = (a.test ? a.test.focus : []).map(function (k) {
          var lv = a.weak(k) ? "basic" : (a.nextLevel(k, ["standard", "application"]) || "standard");
          return { skill: k, level: lv };
        });
        return first(tf, "test", function (c) { return "今日の予定：「" + label(c.skill) + "」をテストに出る形の問題で"; });
      }
      case "test_range": {
        // 範囲のほかのスキルも、仕上がりの低い順に少しずつ（テストは範囲全体から出るため）
        var rest = (a.test ? a.test.range : []).filter(function (k) { return !used(k); })
          .sort(function (x, y) { return a.rank(x) - a.rank(y) || a.st(x).confidence - a.st(y).confidence; })
          .map(function (k) { return { skill: k, level: a.weak(k) ? "basic" : "standard" }; });
        return first(rest, "test", function (c) { return "テスト範囲の「" + label(c.skill) + "」も確かめる"; });
      }
    }
    return null;
  }

  // ---------- 問題を選ぶ（練習向けを優先、最近の診断・チェックで出した問題は避ける） ----------
  var PICK_STAGES = [
    { stage: 0, usage: ["practice", "multi_use", "retention"], checkDays: CONFIG.AVOID_CHECK_DAYS, lessonDays: CONFIG.AVOID_LESSON_DAYS, label: "通常（練習向けの問題・最近の診断/チェック/練習で出していない）" },
    { stage: 1, usage: null, checkDays: CONFIG.AVOID_CHECK_DAYS, lessonDays: CONFIG.AVOID_LESSON_DAYS, label: "練習向けが足りないため、診断用の問題も使う" },
    { stage: 2, usage: null, checkDays: 3, lessonDays: 1, label: "問題不足のため、少し前の問題を再利用（診断・チェックは3日、練習は1日より前）" },
    { stage: 3, usage: null, checkDays: 0.5, lessonDays: 0.5, label: "問題不足のため、半日より前の問題を再利用" }
  ];
  var FALLBACK_LV = {
    basic: ["basic", "retention", "standard"], standard: ["standard", "retention", "application", "basic"],
    application: ["application", "standard"], retention: ["retention", "standard", "basic"]
  };

  function pickFor(skill, level, input, used, rng) {
    var history = input.history || [], now = input.now;
    var ever = {};
    history.forEach(function (a) { ever[baseId(a.question_id)] = true; });
    for (var s = 0; s < PICK_STAGES.length; s++) {
      var stg = PICK_STAGES[s];
      var avoid = {};
      history.forEach(function (a) {
        var days = a.context === "lesson" ? stg.lessonDays : stg.checkDays;
        if (now - t(a) < days * E.DAY) avoid[baseId(a.question_id)] = true;
      });
      var ex = Object.keys(avoid).concat(used);
      var levels = FALLBACK_LV[level] || [level];
      for (var i = 0; i < levels.length; i++) {
        var q = SC.bank.pick(skill, levels[i], { history: history, exclude: ex, usage: stg.usage, rng: rng });
        if (q) {
          var reused = !!ever[q.id];
          return { question_id: q.id, level: q.level, stage: s, reused: reused,
            why: (s === 0 ? "" : stg.label) + (levels[i] !== level ? (s === 0 ? "" : "／") + LEVEL_JA[level] + "の問題が足りないため" + LEVEL_JA[levels[i]] + "の問題" : "") + (reused ? (s === 0 ? "" : "／") + "以前に解いた問題" : "") };
        }
      }
    }
    return null;
  }

  function questionCount(m) { return m <= 5 ? 2 : m <= 10 ? 3 : m <= 15 ? 4 : 5; }

  // ---------- 今日の学習を組み立てる ----------
  // input: { states, history, explorations, school, minutes, goal, now, rng }
  function build(input) {
    var minutes = nearestMinutes(input.minutes || CONFIG.DEFAULT_MINUTES);
    var goal = input.test ? "test_preparation" : GOALS[input.goal] ? input.goal : CONFIG.DEFAULT_GOAL;
    var rng = input.rng || Math.random;
    var a = analyze(input);
    var log = a.log.slice();
    if (input.test && input.test.kind === "final_review") return buildFinalReview(input, a, minutes, rng, log);
    var tmpl = TEMPLATES[minutes].map(function (x) { return { role: (GOAL_ROLES[goal][x.role] || x.role), baseRole: x.role, m: x.m }; });
    log.push(minutes + "分の枠：" + TEMPLATES[minutes].map(function (x) { return x.role + " " + x.m + "分"; }).join(" / ") +
      (goal !== "daily_learning" ? "（「" + GOALS[goal] + "」のため役割を入れかえ：" + tmpl.map(function (x) { return x.role; }).join(" / ") + "）" : ""));
    // 苦手を戻る日は、学校の単元の時間を5分つまずき補強へ
    if (goal === "catch_up") {
      var rf = tmpl.filter(function (x) { return x.role === "reinforce"; })[0], cur = tmpl.filter(function (x) { return x.baseRole === "current"; })[0];
      if (rf && cur && cur.m > 5) { rf.m += 5; cur.m -= 5; log.push("苦手を戻る日なので、学校の単元から5分をつまずき補強へ"); }
    }

    // 枠ごとに中身を決める。中身がない枠は、あとで前後の枠に時間を回す
    var chosen = [];
    tmpl.forEach(function (x) {
      var r = resolveRole(x.role, a, chosen);
      if (!r) { log.push("「" + x.role + "」の枠（" + x.m + "分）は当てはまる内容がないので、ほかの枠に回す"); x.empty = true; return; }
      r.minutes = x.m; r.role = x.role;
      chosen.push(r);
    });
    // どの枠にも当てはまらない（＝今の範囲はひととおりできている）ときは、確かさの低い順に「おさらい」
    if (!chosen.length) {
      var pool = (a.test ? a.test.range : a.unitSkills.length ? a.unitSkills : E.SKILL_ORDER).filter(function (k) { return a.st(k).attempt_count; })
        .sort(function (x, y) { return a.st(x).confidence - a.st(y).confidence; });
      tmpl.forEach(function (x, i) {
        var k = pool[i % Math.max(pool.length, 1)];
        if (!k || chosen.some(function (c) { return c.skill === k; })) return;
        chosen.push({ skill: k, level: "standard", type: "review", why: "ひととおりできているので、忘れないように形を変えておさらい", minutes: x.m, role: "maintain" });
        x.empty = false;
      });
      if (chosen.length) log.push("今の範囲はひととおりできているので、確かさの低い順におさらい：" + chosen.map(function (c) { return label(c.skill); }).join("・"));
    }

    // 空いた時間を、いちばん大事な枠（最初の practice / current_unit / challenge、なければ最初の枠）に足す
    var spare = tmpl.filter(function (x) { return x.empty; }).reduce(function (s, x) { return s + x.m; }, 0);
    if (spare && chosen.length) {
      var main = chosen.filter(function (c) { return c.type === "practice" || c.type === "current_unit" || c.type === "challenge" || c.type === "test"; })[0] || chosen[0];
      main.minutes += spare;
      log.push("空いた " + spare + "分 を「" + label(main.skill) + "」に回す");
    }

    // 問題を選ぶ
    var used = [];
    var sessions = chosen.map(function (c) {
      var n = questionCount(c.minutes);
      var picks = [];
      for (var i = 0; i < n; i++) {
        var p = pickFor(c.skill, c.level, input, used, rng);
        if (!p) break;
        used.push(p.question_id);
        picks.push(p);
        if (SC.QUESTIONS[p.question_id].type === "steps") i++; // 小問つきの応用は2問分と数える
      }
      var intro = (c.type === "practice" || c.type === "current_unit" || c.type === "challenge") && SC.logic ? SC.logic.lessonIntro(c.skill, c.level) : null;
      return {
        minutes: c.minutes, type: c.type, type_label: TYPE_LABEL[c.type], role: c.role,
        skill: c.skill, skill_label: label(c.skill), level: c.level, level_label: LEVEL_JA[c.level],
        title: TYPE_LABEL[c.type] + "：" + label(c.skill) + "（" + LEVEL_JA[c.level] + "）",
        why: c.why, intro: intro,
        questions: picks.map(function (p) { return p.question_id; }), picks: picks
      };
    });
    // 問題が足りず1問も出せなかった枠の時間は、いちばん大事な枠に回す（予定の時間を黙って減らさない）
    var lost = sessions.filter(function (s) { return !s.questions.length; });
    sessions = sessions.filter(function (s) { return s.questions.length; });
    if (lost.length && sessions.length) {
      var keep = sessions.filter(function (s) { return s.type === "practice" || s.type === "current_unit" || s.type === "challenge" || s.type === "test"; })[0] || sessions[0];
      lost.forEach(function (s) {
        keep.minutes += s.minutes;
        log.push("「" + s.skill_label + "（" + s.level_label + "）」の問題が足りず出せなかったので、" + s.minutes + "分を「" + keep.skill_label + "」に回す（問題不足）");
      });
    }

    var focusS = sessions.filter(function (s) { return s.type === "practice" || s.type === "current_unit" || s.type === "challenge" || s.type === "test"; })[0] || sessions[0] || null;
    var plan = {
      id: E.makeId("pln", input.now),
      date: new Date(input.now).toISOString(),
      total_minutes: sessions.reduce(function (s, x) { return s + x.minutes; }, 0),
      requested_minutes: input.minutes || CONFIG.DEFAULT_MINUTES,
      goal: goal, goal_label: ALL_GOALS[goal],
      test: input.test ? { days_left: input.test.days_left, kind: input.test.kind, focus: input.test.focus, range: input.test.range } : null,
      school_progress: input.school || null,
      focus_skill: focusS ? focusS.skill : null,
      focus_label: focusS ? focusS.skill_label : null,
      sessions: sessions,
      fallback: false
    };
    plan.cross = crossText(plan, focusS);
    plan.reason = reasonText(a, plan, focusS);
    plan.why = input.test ? testWhy(a, plan, input.test) : whyText(a, plan, goal);
    plan.debug = { candidates: { p1: a.p1, p2: a.p2, p3: a.p3, p4: a.p4 }, excluded: a.excluded, template: TEMPLATES[minutes], log: log };
    return plan;
  }

  // テスト前日の総仕上げ：範囲をひととおり、1スキル1〜2問ずつ（不安定なスキルから）
  function buildFinalReview(input, a, minutes, rng, log) {
    // 必要度の高い順（△ まだ不安定 > ？ まだ確かめていない > ○ > ◎）。js/testprep.js の readiness と同じ考え方
    var need = function (k) { return a.weak(k) ? 3 : a.rank(k) === 0 ? 2.5 : a.rank(k) === 3 ? 2 : 0.5; };
    var range = input.test.range.slice().sort(function (x, y) { return need(y) - need(x) || a.st(x).confidence - a.st(y).confidence; });
    var n = Math.max(1, Math.min(range.length, Math.floor(minutes / 5)));
    var per = Math.floor(minutes / n);
    var used = [];
    var sessions = range.slice(0, n).map(function (k, i) {
      var m = i === n - 1 ? minutes - per * (n - 1) : per;
      var level = a.weak(k) ? "basic" : "standard";
      var picks = [];
      for (var j = 0; j < (m >= 8 ? 2 : 1); j++) {
        var p = pickFor(k, level, input, used, rng);
        if (!p) break;
        used.push(p.question_id);
        picks.push(p);
      }
      return { minutes: m, type: "check", type_label: "総仕上げ", role: "final_review", skill: k, skill_label: label(k), level: level, level_label: LEVEL_JA[level],
        title: "総仕上げ：" + label(k), why: "テスト前日：範囲をひととおり確かめる", intro: null,
        questions: picks.map(function (p) { return p.question_id; }), picks: picks };
    }).filter(function (s) { return s.questions.length; });
    if (range.length > n) log.push("時間が足りないので、仕上がりの低い " + n + " スキルにしぼった（" + range.slice(n).map(label).join("・") + " は省略）");
    return {
      id: E.makeId("pln", input.now), date: new Date(input.now).toISOString(),
      total_minutes: sessions.reduce(function (s, x) { return s + x.minutes; }, 0), requested_minutes: input.minutes,
      goal: "test_preparation", goal_label: ALL_GOALS.test_preparation, school_progress: input.school || null,
      test: { days_left: input.test.days_left, kind: "final_review", focus: input.test.focus, range: input.test.range },
      focus_skill: sessions[0] ? sessions[0].skill : null, focus_label: sessions[0] ? sessions[0].skill_label : null,
      sessions: sessions, fallback: false,
      cross: "テスト範囲をひととおり確かめる",
      reason: "テスト前日の総仕上げのため",
      why: "テストまであと" + input.test.days_left + "日。今日は範囲をひととおり、テストに出る形の問題で確かめます。まちがえたところは、解説を読んで考え方を確認しよう。",
      debug: { candidates: { p1: a.p1, p2: a.p2, p3: a.p3, p4: a.p4 }, excluded: a.excluded, template: null, log: log.concat(["総仕上げ：" + sessions.map(function (s) { return s.skill_label; }).join("・")]) }
    };
  }

  // テスト対策の「なぜ今日はこれ？」
  function testWhy(a, plan, test) {
    var lines = ["テストまであと" + test.days_left + "日。"];
    var strong = test.range.filter(function (k) { return a.rank(k) >= 3 && !a.weak(k); })
      .sort(function (x, y) { return a.st(y).confidence - a.st(x).confidence; }).slice(0, 2);
    if (strong.length) lines.push("範囲のうち" + strong.map(function (k) { return "「" + label(k) + "」"; }).join("と") + "はよくできています。");
    var weak = test.focus.filter(function (k) { return a.weak(k); });
    if (weak.length) lines.push(weak.map(function (k) { return "「" + label(k) + "」"; }).join("と") + "がまだ少し不安定なので、今日はここを中心に練習します。");
    else if (test.focus.length) lines.push("今日は" + test.focus.map(function (k) { return "「" + label(k) + "」"; }).join("と") + "を、テストに出る形の問題で練習します。");
    if (test.next_note) lines.push("明日は" + test.next_note + "の予定です。");
    return lines.join("");
  }

  // 画面では「」でくくって出すので、ここでは「」を付けない
  function crossText(plan, s) {
    if (!s) return "今日の一歩をふみ出す";
    if (s.type === "practice") return s.level === "standard" ? s.skill_label + "を、形が変わっても使えるようになる" : (SC.logic && SC.logic.planCross(s.skill)) || s.skill_label + "を使えるようになる";
    if (s.type === "challenge") return s.skill_label + "を" + (s.level === "application" ? "組み合わせて使えるようになる" : "形が変わっても使えるようになる");
    if (s.type === "review" || s.type === "check") return "前にできたところを、忘れないようにする";
    if (s.type === "test") return s.skill_label + "を、テストに出る形でも使えるようにする";
    return s.skill_label + "の" + LEVEL_JA[s.level] + "を越える";
  }

  function reasonText(a, plan, s) {
    if (!s) return "今日取り組める内容が見つからなかったため";
    var c = a.p1.filter(function (x) { return x.skill === s.skill; })[0];
    if (s.type === "practice" && c) {
      return c.symptom ? "「" + c.symptom + "」の問題で、さかのぼると「" + s.skill_label + "」につまずきが見られるため"
        : "「" + s.skill_label + "」に、まだ不安定なところが見られるため";
    }
    if (s.type === "current_unit") return "学校で学習中の「" + (plan.school_progress && plan.school_progress.current_unit || "一次関数") + "」を進めるため";
    if (s.type === "challenge") return "「" + s.skill_label + "」ができているので、次のレベルへ進むため";
    return "以前できた内容の定着を確かめるため";
  }

  // 前の単元に戻るときのひとこと。同じ単元・前の学年の土台（正負の数など）のときは何も言わない
  function backToLine(skill, currentUnit) {
    var sk = E.SKILLS[skill];
    if (!sk) return null;
    var unit = skill === "distrib" ? "一次方程式" : sk.unit; // 分配法則は、かっこのある方程式の手前として扱う
    currentUnit = currentUnit || "一次関数";
    if (unit === currentUnit || unit === "既習") return null;
    if (unit === "一次方程式") return currentUnit === "一次関数" ? "一次関数の前に、方程式を少し確認しよう。" : currentUnit + "の前に、一次方程式を少し確認しよう。";
    if (unit === "連立方程式") return currentUnit + "の前に、連立方程式を少し確認しよう。";
    return null;
  }

  // 「なぜ今日はこれ？」— 子どもにもわかる言葉で、3〜4文
  function whyText(a, plan, goal) {
    var lines = [];
    var opener = { catch_up: "今日は「苦手を戻る」日。", review: "今日は「復習」の日。", challenge: "今日は「もう少し先へ」の日。" }[goal];
    if (opener) lines.push(opener);
    var strong = E.SKILL_ORDER.filter(function (k) { return a.rank(k) >= 3 && !a.weak(k); })
      .sort(function (x, y) { return a.st(y).confidence - a.st(x).confidence; }).slice(0, 2);
    if (strong.length) lines.push(strong.map(function (k) { return "「" + label(k) + "」"; }).join("と") + "はよくできています。");
    var s = plan.sessions;
    var practices = s.filter(function (x) { return x.type === "practice"; });
    var practice = practices[0];
    var current = s.filter(function (x) { return x.type === "current_unit"; })[0];
    var challenge = s.filter(function (x) { return x.type === "challenge"; })[0];
    var review = s.filter(function (x) { return x.type === "review" && x.level === "retention"; })[0];
    if (practice) {
      var c = a.p1.filter(function (x) { return x.skill === practice.skill; })[0] || {};
      lines.push(c.symptom
        ? "「" + c.symptom + "」の問題では、さかのぼると「" + practice.skill_label + "」のところで少し迷っているようです。"
        : "「" + practice.skill_label + "」のところで、まだ少し迷うことがあるようです。");
      // 学校の単元より前の単元まで戻るときは、子どもにもそれだけ短く伝える
      // （一次関数 → 中1の方程式、連立方程式 → 中1の一次方程式、一次関数 → 連立方程式）
      var back = backToLine(practice.skill, plan.school_progress ? plan.school_progress.current_unit : "一次関数");
      if (back) lines.push(back);
      if (c.advanced) lines.push("最近の練習で基礎はできていたので、今日は形を変えた問題にしてみよう。");
      var nexts = practices.slice(1).map(function (x) { return "「" + x.skill_label + "」"; });
      lines.push(current && current.skill !== practice.skill
        ? "今日はここを確認してから、「" + current.skill_label + "」の問題に戻ってみよう。"
        : nexts.length ? "今日はここを確認してから、" + nexts.join("、") + "へと順にもどってみよう。"
        : "今日はここを、別の問題でもう一度確かめてみよう。");
    } else if (current) {
      lines.push(current.level === "basic" && plan.school_progress && plan.school_progress.school_status === "notyet"
        ? "「" + (plan.school_progress.current_unit || "一次関数") + "」は学校でこれから習うところなので、はじめの部分を少しだけ先取りします。"
        : "学校で習っている「" + current.skill_label + "」を、" + current.level_label + "の問題で進めます。");
    }
    if (challenge) lines.push("「" + challenge.skill_label + "」はよくできているので、" + (challenge.level === "application" ? "文章題などの応用" : "形を変えた問題") + "にも挑戦します。");
    if (review) lines.push("前にできた「" + review.skill_label + "」を、忘れていないか少しだけ確かめます。");
    if (!lines.length) lines.push("今日の一歩を、少しずつ進めていこう。");
    // 長くなりすぎないように：目標のひとことを除いて4文まで。多いときは「よくできています」を省く
    var head = opener ? [lines.shift()] : [];
    if (lines.length > 4 && strong.length) lines.shift();
    return head.concat(lines.slice(0, 4)).join("");
  }

  SC.planner = { CONFIG: CONFIG, GOALS: GOALS, ALL_GOALS: ALL_GOALS, TYPE_LABEL: TYPE_LABEL, LEVEL_JA: LEVEL_JA, TEMPLATES: TEMPLATES, PICK_STAGES: PICK_STAGES,
    analyze: analyze, build: build, pickFor: pickFor, nearestMinutes: nearestMinutes, backToLine: backToLine };
})(typeof window !== "undefined" ? window : globalThis);
