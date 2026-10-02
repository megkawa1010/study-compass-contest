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
  var TYPE_LABEL = { review: "復習・ウォームアップ", practice: "つまずき補強", current_unit: "学校の単元", check: "確認", challenge: "もう少し先へ", test: "テストに出る形で", preview: "先取り" };
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
    // 学校のようす（スキル単位）。学校でまだ習っていないスキルは、先取りの1スキルを除いて候補にしない
    var detail = school.detail || null;
    function schoolSt(k) { return E.schoolSkillStatus(k, detail); }
    function notLearned(k) { return schoolSt(k) === "not_learned"; }
    var previewSkill = E.nextPreviewSkill(detail);
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
    var fromExpl = {}, symptomOf = {}, depthOf = {}; // 戻る場所 → 最初にまちがえた問題のスキル（補強のあと、そこへ戻る）・さかのぼった深さ
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
      var dep = (x.path || []).reduce(function (m, q) { return Math.max(m, q.depth || 0); }, 0);
      depthOf[c.return_to] = Math.max(depthOf[c.return_to] || 0, dep);
    });
    ROOT_ORDER.forEach(function (k) {
      if (!fromExpl[k] && !weak(k)) return;
      if (notLearned(k)) return; // まだ習っていないところは、つまずきの補強にしない
      var lv = nextLevel(k, ["basic", "standard"]);
      if (!lv) {
        excluded.push({ skill: k, why: "つまずきの補強は、最近の練習で基礎・標準ともできている" });
        return;
      }
      p1.push({ skill: k, level: lv, source: fromExpl[k] ? "exploration" : "weak", symptom: fromExpl[k] || null, symptom_skill: symptomOf[k] || null, depth: depthOf[k] || 0,
        advanced: lv === "standard" && practiced(k, "basic") && st(k).basic !== "pass" });
    });

    // --- 優先度2：学校で学習中の単元 ---
    var status = school.school_status || "learning";
    var schoolLog = { learned: [], current: [], preview: null, excluded_not_learned: [] };
    unitSkills.forEach(function (k) {
      if (detail) {
        var ss = schoolSt(k);
        if (ss === "not_learned") {
          // 次の1スキルだけ「先取り」。それより先は今日は扱わない
          if (k === previewSkill) { p2.push({ skill: k, level: "basic", preview: true }); schoolLog.preview = k; }
          else { excluded.push({ skill: k, why: "学校でまだ習っていない（先取りは次の1スキルまで）" }); schoolLog.excluded_not_learned.push(k); }
          return;
        }
        (ss === "current" ? schoolLog.current : schoolLog.learned).push(k);
        var lv0 = nextLevel(k, ["basic", "standard", "application"]);
        if (!lv0) { excluded.push({ skill: k, why: "学校の単元のスキルだが、基礎・標準・応用ともできている" }); return; }
        p2.push({ skill: k, level: lv0, school: ss });
        return;
      }
      if (status === "notyet") {
        // まだ習っていない単元は「先取り」。最初の方のスキルの基礎だけ
        if (rank(k) < 3) p2.push({ skill: k, level: "basic", preview: true });
        return;
      }
      var lv = nextLevel(k, ["basic", "standard", "application"]);
      if (!lv) { excluded.push({ skill: k, why: "学校の単元のスキルだが、基礎・標準・応用ともできている" }); return; }
      p2.push({ skill: k, level: lv });
    });
    if (status === "notyet" && !detail) p2 = p2.slice(0, 2);

    // --- 優先度3：定着の確認 ---
    E.SKILL_ORDER.forEach(function (k) {
      var s = st(k);
      if (!s.attempt_count || !s.first_pass_at || notLearned(k)) return;
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
      if (weak(k) || rank(k) < 3 || notLearned(k)) return;
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
      nextLevel: nextLevel, test: test || null, school: schoolLog, previewSkill: previewSkill, notLearned: notLearned };
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
        // 学校でまだ習っていない次の1スキルは「先取り」としてはっきり分ける
        if (c.preview) return { skill: c.skill, level: "basic", type: "preview", why: "学校でこれから習う内容を、少しだけ先取り（まちがえても苦手にはしない）", meta: c };
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
          first(a.p2.filter(function (c) { return c.level !== "basic" && !c.preview; }), "challenge", function () { return "学校の単元を一段上へ"; }) ||
          first(a.p2.filter(function (c) { return c.preview; }), "preview", function () { return ""; });
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

  // ---------- 時間の配分（戻る勉強・学校の範囲・定着の確認・先取り） ----------
  // 固定の枠ではなく、その日の状態から「重み」を決め、5分単位で時間を割り当てる。
  //   1. つまずきの大きさ（severity）を、確かさ・最近の誤答・原因さがしの深さ・前の単元か・不安定なスキルの数から出す
  //   2. 枠ごとに 重み・最小・最大 を決める（学校の範囲は最小を必ず残す＝戻る勉強だけの日にしない）
  //   3. 5分ずつ、「重みから見た目標」にいちばん足りない枠へ配る
  //   4. 長い枠は、同じスキルを続けすぎないよう2つのスキルに分ける
  var ALLOC = {
    // 戻る勉強の上限（つまずきの大きさ × 時間）
    rootMax: { mild: { 20: 5, 30: 5, 45: 10, 60: 10 }, moderate: { 20: 5, 30: 10, 45: 15, 60: 20 }, severe: { 20: 10, 30: 15, 45: 20, 60: 25 } },
    schoolMin: { 20: 10, 30: 10, 45: 15, 60: 20 }, // 学校の範囲に必ず残す時間
    perSkillMax: { 20: 15, 30: 15, 45: 15, 60: 20 }, // 1つのスキルを続ける上限
    previewMax: { 20: 0, 30: 10, 45: 10, 60: 15 },
    retentionMax: { 20: 5, 30: 5, 45: 5, 60: 10 },
    weights: { school: 0.45, check: 0.15, retention: 0.12, preview: 0.25, challenge: 0.08 },
    severity: { mild: 0.3, moderate: 0.55 } // これ未満が mild / moderate、以上が severe
  };
  var SEVERITY_JA = { none: "なし", mild: "小さい", moderate: "中くらい", severe: "大きい" };

  function severityOf(a, input) {
    var root = a.p1[0];
    if (!root) return { level: "none", score: 0, factors: null };
    var history = input.history || [];
    var s = a.st(root.skill);
    var conf = s.attempt_count ? s.confidence : 0.3;
    var recent = history.filter(function (x) { return x.skill === root.skill && !(x.preview && !x.correct); }).sort(function (x, y) { return t(x) - t(y); }).slice(-4);
    var recentErr = recent.filter(function (x) { return !x.correct; }).length;
    var curUnit = (input.school && input.school.current_unit) || "一次関数";
    var unitAt = function (k) { var u = E.SKILLS[k].unit; return u === "既習" ? 0 : u === "一次方程式" ? 1 : 2 + E.SELECTABLE_UNITS.indexOf(u); };
    var crossUnit = unitAt(root.skill) < unitAt(E.UNITS[curUnit] ? E.UNITS[curUnit][0] : root.skill) ? 1 : 0;
    var errRate = recent.length ? recentErr / recent.length : 0.5;
    var factors = { skill: root.skill, confidence: Math.round(conf * 100) / 100, recent_errors: recentErr, recent_answers: recent.length, depth: root.depth || 0, weak_skills: a.p1.length, cross_unit: crossUnit };
    // 確かさは記録が少ないうちは低く出るので、「理解」の目安（0.65）に対してどれだけ足りないかで見る。
    // いちばん効くのは、最近の答えの誤答の割合
    var score = 0.3 * (1 - Math.min(1, conf / 0.65)) + 0.25 * errRate + 0.15 * Math.min(root.depth || 0, 3) / 3 + 0.1 * Math.min(a.p1.length - 1, 2) / 2 + 0.1 * crossUnit;
    score = Math.round(Math.min(1, Math.max(0, score)) * 100) / 100;
    return { level: score < ALLOC.severity.mild ? "mild" : score < ALLOC.severity.moderate ? "moderate" : "severe", score: score, factors: factors };
  }

  function allocate(a, input, minutes, goal, log) {
    var sev = severityOf(a, input);
    var level = sev.level;
    // 目標による調整：苦手を戻る日は1段重く・先取りなし／もう少し先へは1段軽く／復習は定着を長めに
    var order = ["none", "mild", "moderate", "severe"];
    if (goal === "catch_up" && level !== "none") level = order[Math.min(3, order.indexOf(level) + 1)];
    if (goal === "challenge" && level !== "none") level = order[Math.max(1, order.indexOf(level) - 1)];

    // --- 候補 ---
    var rootCands = a.p1.slice(0, 2);
    var root = rootCands[0] || null;
    var schoolAll = a.p2.filter(function (c) { return !c.preview; });
    // 学校の範囲：まちがえた問題のスキル（補強のあと戻る）→ 学校で学習中のスキル → そのほか習ったスキル
    var symptom = root && root.symptom_skill && a.unitSkills.indexOf(root.symptom_skill) !== -1 ? root.symptom_skill : null;
    // （補強するスキルを前提にしていて、まだ不安定な学校のスキルは、そのレベルで優先：例 変化量 → 変化の割合）
    var shakyOnRoot = function (c) {
      var s = a.st(c.skill);
      return !!root && (a.weak(c.skill) || s.standard === "needs_review" || s.application === "needs_review") && dependsOn(c.skill, root.skill);
    };
    var rankOf = function (c) { return c.skill === symptom ? 0 : shakyOnRoot(c) ? 1 : c.school === "current" ? 2 : 3; };
    var schoolCands = schoolAll.map(function (c) {
      if (!shakyOnRoot(c)) return c;
      var s = a.st(c.skill), o = {};
      for (var k in c) o[k] = c[k];
      o.level = a.weak(c.skill) ? "basic" : s.standard === "needs_review" ? "standard" : s.application === "needs_review" ? "application" : c.level;
      return o;
    }).sort(function (x, y) { return rankOf(x) - rankOf(y); }).filter(function (c) { return !root || c.skill !== root.skill; });
    // 学校の範囲で次に進むレベルがない（ひととおりできている）ときも、学校の範囲は外さない：
    // 学校で習ったスキルのうち確かさのいちばん低いものを、形を変えて（標準）
    if (!schoolCands.length) {
      var keepSchool = a.unitSkills.filter(function (k) { return a.st(k).attempt_count && !a.notLearned(k) && (!root || k !== root.skill); })
        .sort(function (x, y) { return a.st(x).confidence - a.st(y).confidence; })[0];
      if (keepSchool) {
        schoolCands = [{ skill: keepSchool, level: a.rank(keepSchool) >= 3 ? "standard" : "basic", school: "maintain" }];
        log.push("学校の範囲は、ひととおりできているので「" + label(keepSchool) + "」を形を変えておさらい（学校の範囲を0分にしない）");
      }
    }
    var previewCand = a.p2.filter(function (c) { return c.preview; })[0] || null;
    var retentionCand = a.p3[0] || null;
    var busy = function (k) { return (root && k === root.skill) || schoolCands.slice(0, 2).some(function (c) { return c.skill === k; }); };
    var challengeCand = a.p4.filter(function (c) { return a.unitSkills.indexOf(c.skill) !== -1 && !busy(c.skill); })[0] || null;
    // おさらい：ほかの枠が上限でいっぱいのときの受け皿（同じスキルを長く続けないため）。できているところを形を変えて
    // 候補はいくつか持ち、1つのスキルは MAINTAIN_CHUNK 分までにして、ほかのスキルに分ける
    var maintainCands = a.p4.filter(function (c) { return !busy(c.skill) && (!challengeCand || c.skill !== challengeCand.skill); })
      // （前の学年の土台は問題が少なく、定着の確認に残したいので、おさらいには使わない）
      .concat(E.SKILL_ORDER.filter(function (k) { return E.SKILLS[k].unit !== "既習" && a.st(k).attempt_count && a.rank(k) >= 3 && !a.weak(k) && !busy(k) && !a.notLearned(k); })
        .sort(function (x, y) { return a.st(x).confidence - a.st(y).confidence; }).map(function (k) { return { skill: k, level: "standard" }; }))
      .filter(function (c, i, all) { return all.findIndex(function (d) { return d.skill === c.skill; }) === i; }).slice(0, 3);
    var maintainCand = maintainCands[0] || null;
    var MAINTAIN_CHUNK = minutes >= 60 ? 15 : 10;
    var excluded = [];

    // 先取りは余裕があるときだけ（つまずきなし、または小さくて45分以上）。学校の範囲が尽きていれば先取りが学校の代わり
    var previewOk = !!previewCand && minutes >= 30 && goal !== "catch_up" && goal !== "review" &&
      (level === "none" || (level === "mild" && minutes >= 45) || !schoolCands.length);
    if (previewCand && !previewOk) excluded.push({ skill: previewCand.skill, kind: "preview", why: minutes < 30 ? "20分の日は先取りしない" : goal === "catch_up" || goal === "review" ? "今日の目標では先取りしない" : "つまずきの補強と学校の範囲を優先（先取りは余裕があるときだけ）" });
    var retentionOk = !!retentionCand && (minutes >= 30 || level === "none");
    if (retentionCand && !retentionOk) excluded.push({ skill: retentionCand.skill, kind: "retention", why: "20分でつまずきの補強があるので、定着の確認は次の日に" });
    var checkOk = level !== "none" && (minutes >= 30 || level === "moderate" || level === "mild");

    // --- 枠：重み・最小・最大 ---
    var blocks = [];
    function block(id, w, min, max, info) { if (max >= min && max > 0) blocks.push({ id: id, w: w, min: min, max: max, units: 0, info: info }); }
    if (root) block("root", 0.2 + 0.5 * sev.score, 5, ALLOC.rootMax[level === "none" ? "mild" : level][minutes], { skill: root.skill });
    if (schoolCands.length) block("school", ALLOC.weights.school * (goal === "catch_up" ? 0.8 : 1), Math.min(ALLOC.schoolMin[minutes], minutes - (root ? 5 : 0)),
      ALLOC.perSkillMax[minutes] * Math.min(2, schoolCands.length), { skill: schoolCands[0].skill });
    if (retentionOk) block("retention", ALLOC.weights.retention * (goal === "review" ? 2.5 : 1), 5, goal === "review" ? 10 : ALLOC.retentionMax[minutes], { skill: retentionCand.skill });
    if (previewOk) block("preview", ALLOC.weights.preview * (goal === "challenge" ? 1.5 : 1), 5, ALLOC.previewMax[minutes] || 10, { skill: previewCand.skill });
    if (checkOk && (root || schoolCands.length)) block("check", ALLOC.weights.check, 5, 5, {});
    if (challengeCand && (level === "none" || level === "mild")) block("challenge", ALLOC.weights.challenge * (goal === "challenge" ? 3 : 1), 0, 10, { skill: challengeCand.skill });
    if (maintainCand) block("maintain", 0.03, 0, MAINTAIN_CHUNK * maintainCands.length, { skill: maintainCand.skill });
    if (!schoolCands.length) log.push("学校の範囲で今日進める内容がない（ひととおりできている）ので、学校の枠はほかに回す");

    // --- 5分ずつ配る ---
    var total = minutes / 5;
    var wsum = blocks.reduce(function (s, b) { return s + b.w; }, 0) || 1;
    blocks.forEach(function (b) { b.target = total * b.w / wsum; b.units = b.min / 5; });
    var left = total - blocks.reduce(function (s, b) { return s + b.units; }, 0);
    // 最小の合計が時間を超えたら、優先度の低い枠から削る
    var dropOrder = ["maintain", "challenge", "preview", "retention", "check", "school", "root"];
    while (left < 0) {
      var cut = dropOrder.map(function (id) { return blocks.filter(function (b) { return b.id === id && b.units > 0; })[0]; }).filter(Boolean)[0];
      if (!cut) break;
      var keep = cut.id === "school" || cut.id === "root" ? 1 : 0;
      if (cut.units > keep) { cut.units--; left++; } else break;
    }
    while (left > 0) {
      var open = blocks.filter(function (b) { return b.units * 5 < b.max; });
      // どの枠も上限なら、学校の範囲・戻る勉強に足す（それもなければ、ある枠に）
      if (!open.length) open = blocks.filter(function (b) { return b.id === "school" || b.id === "root"; });
      if (!open.length) open = blocks.slice();
      if (!open.length) break;
      open.sort(function (x, y) { return (y.target - y.units) - (x.target - x.units) || y.w - x.w; });
      open[0].units++;
      left--;
    }
    blocks.forEach(function (b) { b.minutes = b.units * 5; b.target = Math.round(b.target * 50) / 10; });

    // --- 枠 → 学習のパート ---
    var chosen = [];
    var cap = ALLOC.perSkillMax[minutes];
    function push(skill, level, type, why, m, role, meta) { if (m > 0) chosen.push({ skill: skill, level: level, type: type, why: why, minutes: m, role: role, meta: meta || null }); }
    var get = function (id) { return blocks.filter(function (b) { return b.id === id; })[0] || { minutes: 0 }; };
    var rb = get("root"), sb = get("school");
    if (rb.minutes) {
      var rm = rb.minutes;
      // 戻る勉強が15分以上でつまずきが中以上なら、最初の5分は「できている前提」を思い出すウォームアップ
      var pre = (E.SKILLS[root.skill].prerequisites || []).filter(function (p) { return a.rank(p) >= 3 && !a.weak(p); })[0];
      if (rm >= 15 && pre && (level === "moderate" || level === "severe")) {
        push(pre, "basic", "review", "「" + label(root.skill) + "」の前にある、できている内容を思い出す", 5, "warmup");
        rm -= 5;
      }
      var second = rootCands[1];
      if (rm > cap && second) {
        push(root.skill, root.level, "practice", root.symptom ? "原因さがしで見つかった戻る場所（" + root.symptom + " から）" : "まだ不安定な、いちばん根元のスキル", cap, "reinforce", root);
        push(second.skill, second.level, "practice", "次に不安定なスキルも少し", rm - cap, "reinforce", second);
      } else {
        push(root.skill, root.level, "practice", root.symptom ? "原因さがしで見つかった戻る場所（" + root.symptom + " から）" : "まだ不安定な、いちばん根元のスキル", rm, "reinforce", root);
      }
    }
    if (sb.minutes) {
      var sm = sb.minutes, c0 = schoolCands[0], c1 = schoolCands[1];
      var swhy = function (c) {
        return c.skill === symptom ? "補強した内容を使って、つまずいた「" + label(c.skill) + "」の問題に戻る"
          : c.school === "current" ? "学校でいま習っている内容" : c.school === "maintain" ? "学校の範囲はひととおりできているので、形を変えておさらい" : "学校で習った範囲から、次に進むレベル";
      };
      if (sm > cap && c1) {
        push(c0.skill, c0.level, "current_unit", swhy(c0), cap, "current", c0);
        push(c1.skill, c1.level, "current_unit", swhy(c1), sm - cap, "current", c1);
      } else push(c0.skill, c0.level, "current_unit", swhy(c0), sm, "current", c0);
    }
    if (get("challenge").minutes) push(challengeCand.skill, challengeCand.level, "challenge", "「" + label(challengeCand.skill) + "」はできているので、" + LEVEL_JA[challengeCand.level] + "へ", get("challenge").minutes, "advance", challengeCand);
    // おさらいは、ほかのパートと同じスキルを避け、1スキル MAINTAIN_CHUNK 分ずつに分ける
    var mLeft = get("maintain").minutes || 0;
    maintainCands.filter(function (c) { return !chosen.some(function (x) { return x.skill === c.skill; }); }).forEach(function (c) {
      if (mLeft <= 0) return;
      var m = Math.min(MAINTAIN_CHUNK, mLeft);
      push(c.skill, c.level === "basic" ? "standard" : c.level, "review", "同じスキルを続けすぎないよう、できているところを形を変えておさらい", m, "maintain", c);
      mLeft -= m;
    });
    if (mLeft > 0 && chosen.length) chosen[chosen.length - 1].minutes += mLeft;
    if (get("retention").minutes) push(retentionCand.skill, "retention", "review", "定着の確認（" + retentionCand.why + "）", get("retention").minutes, "retention", retentionCand);
    if (get("preview").minutes) push(previewCand.skill, "basic", "preview", "学校でこれから習う内容を、少しだけ先取り（まちがえても苦手にはしない）", get("preview").minutes, "preview", previewCand);
    if (get("check").minutes) {
      var focus = chosen.filter(function (c) { return c.type === "practice"; })[0] || chosen.filter(function (c) { return c.type === "current_unit"; })[0];
      if (focus) push(focus.skill, focus.level, "check", "今日の「" + label(focus.skill) + "」ができたか、別の問題で確かめる", 5, "check");
      else if (chosen.length) chosen[0].minutes += 5;
    }

    var alloc = {
      available_minutes: minutes, goal: goal, severity: level, severity_raw: sev.level, severity_score: sev.score, factors: sev.factors,
      candidates: {
        root: rootCands.map(function (c) { return c.skill; }), school: schoolCands.map(function (c) { return c.skill + ":" + (c.school || "") + ":" + c.level; }),
        retention: retentionCand ? retentionCand.skill : null, preview: previewCand ? previewCand.skill : null, challenge: challengeCand ? challengeCand.skill : null
      },
      blocks: blocks.map(function (b) { return { id: b.id, weight: Math.round(b.w * 100) / 100, target: b.target, min: b.min, max: b.max, minutes: b.minutes, skill: b.info.skill || null }; }),
      excluded: excluded,
      final: chosen.map(function (c) { return { minutes: c.minutes, type: c.type, skill: c.skill, level: c.level }; })
    };
    log.push("配分：つまずき「" + SEVERITY_JA[level] + "」（" + sev.score + "）／" + blocks.map(function (b) { return b.id + " " + b.minutes + "分（重み " + Math.round(b.w * 100) / 100 + "）"; }).join("、"));
    return { chosen: chosen, alloc: alloc };
  }

  // 「なぜこの配分？」— 子どもにもわかる言葉で
  function allocWhy(alloc, plan) {
    var s = plan.sessions;
    var practice = s.filter(function (x) { return x.type === "practice"; })[0];
    var school = s.filter(function (x) { return x.type === "current_unit"; })[0];
    var preview = s.filter(function (x) { return x.type === "preview"; })[0];
    var curUnit = plan.school_progress ? plan.school_progress.current_unit : "一次関数";
    if (practice && school) {
      var back = backToLine(practice.skill, curUnit);
      var head = back ? back.replace(/少し確認しよう。$/, "少し確認してから、") : "「" + practice.skill_label + "」を少し確認してから、";
      return head + "学校で習っている「" + school.skill_label + "」に戻ろう。" +
        (alloc.severity === "severe" ? "今日は戻る勉強を少し多めにしたけど、学校の内容も進めるよ。" : "");
    }
    if (practice) return "「" + practice.skill_label + "」を確認する日。学校の内容は、ここができてから進めよう。";
    if (school && preview) return "学校の「" + school.skill_label + "」はよくできているので、今日は少し先の「" + preview.skill_label + "」ものぞいてみよう。";
    if (school) return "学校で習っている「" + school.skill_label + "」を中心に進めよう。";
    if (preview) return "学校でこれから習う「" + preview.skill_label + "」を、少しだけ先取りしてみよう。";
    return "";
  }

  // ふだんの日の「なぜ今日はこれ？」：つまずきの理由 → 配分の理由 → 定着・先取り
  function whyAlloc(a, plan, goal, alloc) {
    var lines = [];
    var opener = { catch_up: "今日は「苦手を戻る」日。", review: "今日は「復習」の日。", challenge: "今日は「もう少し先へ」の日。" }[goal];
    var s = plan.sessions;
    var practice = s.filter(function (x) { return x.type === "practice"; })[0];
    var review = s.filter(function (x) { return x.type === "review" && x.level === "retention"; })[0];
    var preview = s.filter(function (x) { return x.type === "preview"; })[0];
    var school = s.filter(function (x) { return x.type === "current_unit"; })[0];
    if (practice) {
      var c = a.p1.filter(function (x) { return x.skill === practice.skill; })[0] || {};
      lines.push(c.symptom ? "「" + c.symptom + "」の問題では、さかのぼると「" + practice.skill_label + "」のところで少し迷っているようです。"
        : "「" + practice.skill_label + "」のところで、まだ少し迷うことがあるようです。");
    }
    var main = allocWhy(alloc, plan);
    if (main) lines.push(main);
    if (preview && !(school && !practice)) lines.push("学校でこれから習う「" + preview.skill_label + "」を少しだけ先取りします。まだ習っていない内容なので、できなくても大丈夫です。");
    else if (preview) lines.push("まだ習っていない内容なので、できなくても大丈夫です。");
    if (review) lines.push("前にできた「" + review.skill_label + "」を、忘れていないか少しだけ確かめます。");
    if (lines.length < 3) {
      var strong = E.SKILL_ORDER.filter(function (k) { return a.rank(k) >= 3 && !a.weak(k); }).sort(function (x, y) { return a.st(y).confidence - a.st(x).confidence; }).slice(0, 2);
      if (strong.length) lines.unshift(strong.map(function (k) { return "「" + label(k) + "」"; }).join("と") + "はよくできています。");
    }
    if (!lines.length) lines.push("今日の一歩を、少しずつ進めていこう。");
    return (opener || "") + lines.slice(0, 4).join("");
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
      // 定着用の問題は、ふだんの練習では使わない（練習で解いてしまうと、数日後の定着の確認に使えなくなる）。
      // 使うのは、定着の確認の枠と、練習向け・診断用がすべて足りないとき（段階1以降）だけ
      var usage = stg.usage && level !== "retention" ? stg.usage.filter(function (u) { return u !== "retention"; }) : stg.usage;
      for (var i = 0; i < levels.length; i++) {
        var q = SC.bank.pick(skill, levels[i], { history: history, exclude: ex, usage: usage, rng: rng });
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
    var chosen = [], alloc = null;
    if (!input.test) {
      // ふだんの日：その日の状態から、戻る勉強・学校の範囲・定着の確認・先取りに時間を配る
      var al = allocate(a, input, minutes, goal, log);
      chosen = al.chosen;
      alloc = al.alloc;
      tmpl.forEach(function (x) { x.empty = false; }); // 時間はすでに配り終えている
    } else {
      // テスト対策の日：これまでどおり、テスト向けの枠で
      log.push(minutes + "分の枠：" + TEMPLATES[minutes].map(function (x) { return x.role + " " + x.m + "分"; }).join(" / ") +
        "（「" + ALL_GOALS[goal] + "」のため役割を入れかえ：" + tmpl.map(function (x) { return x.role; }).join(" / ") + "）");
      // 枠ごとに中身を決める。中身がない枠は、あとで前後の枠に時間を回す
      tmpl.forEach(function (x) {
        var r = resolveRole(x.role, a, chosen);
        if (!r) { log.push("「" + x.role + "」の枠（" + x.m + "分）は当てはまる内容がないので、ほかの枠に回す"); x.empty = true; return; }
        r.minutes = x.m; r.role = x.role;
        chosen.push(r);
      });
    }
    // どの枠にも当てはまらない（＝今の範囲はひととおりできている）ときは、確かさの低い順に「おさらい」
    if (!chosen.length) {
      tmpl.forEach(function (x) { x.empty = true; });
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
      var intro = (c.type === "practice" || c.type === "current_unit" || c.type === "challenge" || c.type === "preview") && SC.logic ? SC.logic.lessonIntro(c.skill, c.level) : null;
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
    plan.why = input.test ? testWhy(a, plan, input.test) : alloc ? whyAlloc(a, plan, goal, alloc) : whyText(a, plan, goal);
    if (alloc) {
      // 最終の配分は、問題が足りずに出せなかったパートの時間を回したあとの値
      alloc.final = plan.sessions.map(function (x) { return { minutes: x.minutes, type: x.type, skill: x.skill, level: x.level }; });
      plan.alloc = { severity: alloc.severity, text: allocWhy(alloc, plan) };
    }
    plan.debug = { candidates: { p1: a.p1, p2: a.p2, p3: a.p3, p4: a.p4 }, excluded: a.excluded, template: alloc ? null : TEMPLATES[minutes], log: log, school: a.school, preview_skill: a.previewSkill, alloc: alloc };
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
    if (s.type === "preview") return "学校でこれから習う" + s.skill_label + "を、少しのぞいてみる";
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
    currentUnit = currentUnit || "一次関数";
    // 分配法則は、一次関数・連立方程式からは「かっこのある方程式」の手前として扱う。式の計算では単元の中の土台
    var unit = skill === "distrib" ? (currentUnit === "式の計算" ? "既習" : "一次方程式") : sk.unit;
    if (unit === currentUnit || unit === "既習") return null;
    if (unit === "式の計算") return currentUnit + "の前に、式の計算を少し確認しよう。";
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
    var preview = s.filter(function (x) { return x.type === "preview"; })[0];
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
    if (preview) lines.push("学校でこれから習う「" + preview.skill_label + "」を、少しだけ先取りします。まだ習っていない内容なので、できなくても大丈夫です。");
    if (challenge) lines.push("「" + challenge.skill_label + "」はよくできているので、" + (challenge.level === "application" ? "文章題などの応用" : "形を変えた問題") + "にも挑戦します。");
    if (review) lines.push("前にできた「" + review.skill_label + "」を、忘れていないか少しだけ確かめます。");
    if (!lines.length) lines.push("今日の一歩を、少しずつ進めていこう。");
    // 長くなりすぎないように：目標のひとことを除いて4文まで。多いときは「よくできています」を省く
    var head = opener ? [lines.shift()] : [];
    if (lines.length > 4 && strong.length) lines.shift();
    return head.concat(lines.slice(0, 4)).join("");
  }

  SC.planner = { CONFIG: CONFIG, GOALS: GOALS, ALL_GOALS: ALL_GOALS, TYPE_LABEL: TYPE_LABEL, LEVEL_JA: LEVEL_JA, TEMPLATES: TEMPLATES, PICK_STAGES: PICK_STAGES,
    analyze: analyze, build: build, pickFor: pickFor, nearestMinutes: nearestMinutes, backToLine: backToLine, ALLOC: ALLOC, severityOf: severityOf };
})(typeof window !== "undefined" ? window : globalThis);
