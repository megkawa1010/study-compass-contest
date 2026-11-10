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

  var GOALS = { daily_learning: "いつもの勉強", catch_up: "前にもどって確認", review: "復習", challenge: "もう少し先へ" };
  // テスト対策はホームの目標ボタンには出さず、テストの予定を入れたときだけ使う
  var ALL_GOALS = { daily_learning: GOALS.daily_learning, catch_up: GOALS.catch_up, review: GOALS.review, challenge: GOALS.challenge, test_preparation: "テスト対策" };
  // 子ども向けの表示名（内部の type はそのまま）。戻る勉強は「もどって確認」（つまずき・苦手を強調しない）
  var TYPE_LABEL = { review: "復習・ウォームアップ", practice: "もどって確認", current_unit: "学校の学習", check: "確認", challenge: "もう少し先へ", test: "テストに出る形で", preview: "先取り", reason_review: "理由を確認",
    test_review: "テスト範囲を確認", test_retention: "テスト前の確認", test_check: "仕上げ確認" };
  // 戻る場所の、子ども向けの言い方（図形は「何を確かめるか」が分かる言葉に）
  var FRIENDLY = { angleNames: "角の位置関係", lineAngles: "対頂角と一直線の角", parallelAngles: "平行線と角の関係", triangleSum: "三角形の角の和", exteriorAngle: "三角形の外角", angleBasics: "角の基本" };
  function typeLabel(c) {
    if (c.display && c.display.indexOf("test_") === 0) return TYPE_LABEL[c.display];
    return c.type === "review" && c.level === "retention" ? "定着チェック" : TYPE_LABEL[c.display || c.type];
  }
  // テストまで7日以内：テスト範囲のスキルの「おさらい・ウォームアップ・発展・定着」は、テストの文脈の名前で見せる（内部の type はそのまま）
  function testDisplayOf(c, alloc) {
    var t = alloc && alloc.test;
    if (!t || t.days_left > 7 || t.range.indexOf(c.skill) === -1) return null;
    if (c.type === "review") return c.level === "retention" ? "test_retention" : "test_review";
    if (c.type === "challenge") return "test_review";
    if (c.type === "check") return "test_check";
    return null;
  }
  // 表示の分類（display）：内部の type（優先度・原因さがし）とは分けて、学校との位置関係で決める。
  //   戻る勉強（practice）でも、学校でいま学習中のスキルなら「学校の学習」、まだ習っていないスキルなら「先取り」。前に習ったスキルだけ「もどって確認」
  function displayOf(c, detail) {
    if (c.type !== "practice") return c.type;
    var st = E.schoolSkillStatus(c.skill, detail);
    return st === "current" ? "current_unit" : st === "not_learned" ? "preview" : "practice";
  }
  // 今日の学習の一覧に出す、パートごとのひとこと
  function partNote(c) {
    if (c.type === "practice" && c.display === "current_unit") return "学校で習っている「" + label(c.skill) + "」を、もう少していねいに確認しよう。";
    if (c.type === "practice" && c.meta) {
      var what = FRIENDLY[c.skill] || "「" + label(c.skill) + "」";
      return c.meta.symptom_skill && c.meta.symptom_skill !== c.skill ? "「" + label(c.meta.symptom_skill) + "」の前に、" + what + "を少し確認しよう。" : what + "を少し確認しよう。";
    }
    if (c.type === "reason_review") return isProof(c.skill) ? "主張は合っています。根拠だけ少し確認しよう。" : "角度は求められています。理由だけ少し確認しよう。";
    if (c.type === "current_unit" && c.meta && c.meta.order) return "証明の行を、正しい順番に並べてみよう。";
    if (c.type === "review" && c.level === "retention") return "前にできたところを、忘れていないか確かめよう。";
    return null;
  }
  // 図形：原因さがしの結果から、今日の学習に入れる種類
  //   reason_review：角度は出せるが根拠が弱い → 5分だけ根拠の確認（取り違えた根拠を、別の図で）
  //   geometry_root_review：図形の性質そのものが不安定（図形側に戻った）→ 10分の戻る勉強（位置関係 → 根拠 → 簡単な角度）
  //   calculation_root_review：根拠は合っていて計算で止まった → これまでどおり計算側へ戻る（図形の練習は増やさない）
  //   proof_root_review：証明（合同と証明）のスキルが不安定 → 10分の戻る勉強（スキルごとの短い問題 → 証明の行）。
  //                      「証明の組み立て」だけが弱いときは戻る勉強にせず、学校の学習の中で並べかえ（5〜10分）
  var GEO_MIN = { reason: 5, root: 10 };
  var REASON_TEXT = "角度は求められています。今日は理由だけ少し確認しよう。";
  var PROOF_REASON_TEXT = "主張は合っています。今日は根拠（理由）だけ少し確認しよう。";
  function isProof(k) { return !!E.SKILLS[k] && E.SKILLS[k].unit === "合同と証明"; }
  function reasonReviewText(k) { return isProof(k) ? PROOF_REASON_TEXT : REASON_TEXT; }
  var LEVEL_JA = { basic: "基礎", standard: "標準", application: "応用", retention: "定着の確認" };
  var UNIT_SKILLS = E.UNITS; // 単元ごとのスキル（js/engine.js で一元管理）
  var ROOT_ORDER = E.ROOT_ORDER; // 前提に近い順（js/engine.js で一元管理）

  // 時間の「枠」の初期値（いまは allocate が配分を決める。問題を出せなかったときの「おさらい」の時間の目安に使う）
  var TEMPLATES = {
    20: [{ role: "warmup", m: 5 }, { role: "main", m: 10 }, { role: "check", m: 5 }],
    30: [{ role: "warmup", m: 5 }, { role: "reinforce", m: 10 }, { role: "current", m: 10 }, { role: "check", m: 5 }],
    45: [{ role: "warmup", m: 5 }, { role: "reinforce", m: 15 }, { role: "current", m: 15 }, { role: "advance", m: 10 }],
    60: [{ role: "review", m: 10 }, { role: "reinforce", m: 20 }, { role: "current", m: 20 }, { role: "advance", m: 10 }]
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
    function recoveredSince(k, at) {
      var after = history.filter(function (a) { return a.skill === k && !a.preview && a.aspect !== "reason" && t(a) > at; }).sort(function (x, y) { return t(x) - t(y); });
      return after.length >= 2 && after.slice(-2).every(function (a) { return a.correct && !a.hint_used; });
    }

    // --- 優先度1：根本のつまずき（原因さがしの「戻る場所」＋ いちばん根元の不安定なスキル） ---
    var fromExpl = {}, symptomOf = {}, depthOf = {}, geoKindOf = {}; // 戻る場所 → 最初にまちがえた問題のスキル（補強のあと、そこへ戻る）・さかのぼった深さ
    (input.explorations || []).forEach(function (x) {
      var c = x.conclusion;
      if (!c || !c.return_to || c.kind === "not_reproduced") return;
      if (now - Date.parse(x.date) > CONFIG.EXPLORATION_DAYS * E.DAY) return;
      // 外すのは「原因さがしのあと」の記録で立て直したときだけ（そのあと2回以上答えて、最後の2回が正解）。
      // 総合状態だけで判断すると、前からの記録で「活用できる」のスキルは、今日の原因さがしで見つかっても外れてしまう
      if (recoveredSince(c.return_to, Date.parse(x.date))) {
        var msg = "原因さがしの戻る場所「" + label(c.return_to) + "」は、そのあとの練習で続けて正解できたので優先度1から外す";
        if (log.indexOf(msg) === -1) log.push(msg);
        return;
      }
      fromExpl[c.return_to] = fromExpl[c.return_to] || x.symptom.label;
      if (x.geometry && !geoKindOf[c.return_to]) geoKindOf[c.return_to] = isProof(c.return_to) ? "proof_root_review" : E.SKILLS[c.return_to].concept || c.return_to === "angleBasics" ? "geometry_root_review" : "calculation_root_review";
      symptomOf[c.return_to] = symptomOf[c.return_to] || x.symptom.skill;
      var dep = (x.path || []).reduce(function (m, q) { return Math.max(m, q.depth || 0); }, 0);
      depthOf[c.return_to] = Math.max(depthOf[c.return_to] || 0, dep);
    });
    var buildOnly = false;
    ROOT_ORDER.forEach(function (k) {
      if (!fromExpl[k] && !weak(k)) return;
      if (notLearned(k)) return; // まだ習っていないところは、つまずきの補強にしない
      // 「証明の組み立て」（行の順番）だけが弱いときは、深い原因さがし・戻る勉強にしない。学校の学習の中で並べかえを5〜10分
      if (k === "proofBuild") {
        buildOnly = true;
        excluded.push({ skill: k, why: "証明の組み立て（順番）だけが弱いので、戻る勉強ではなく学校の学習の中で並べかえ" });
        return;
      }
      var lv = nextLevel(k, ["basic", "standard"]);
      // 原因さがしで今回まちがえた戻る場所は、前の記録で基礎・標準が「できた」になっていても、基礎から確かめ直す
      if (!lv && fromExpl[k]) lv = "basic";
      if (!lv) {
        excluded.push({ skill: k, why: "つまずきの補強は、最近の練習で基礎・標準ともできている" });
        return;
      }
      p1.push({ skill: k, level: lv, source: fromExpl[k] ? "exploration" : "weak", symptom: fromExpl[k] || null, symptom_skill: symptomOf[k] || null, depth: depthOf[k] || 0,
        geo_kind: geoKindOf[k] || (isProof(k) ? "proof_root_review" : null),
        advanced: lv === "standard" && practiced(k, "basic") && st(k).basic !== "pass" });
    });

    // --- 根拠の確認（図形）：最後の根拠の答えがまちがいのスキルだけ。毎日固定では入れない ---
    //   1回まちがえたら次の学習で5分確認 → 正解したら通常の学習へ戻す → またまちがえたら、また入れる
    //   角度もまだ不安定なスキルは、根拠だけの確認ではなく戻る勉強で扱う。学校でまだ習っていないスキルは入れない（未学習は苦手ではない）
    var reasonCands = [], reasonLog = [];
    E.SKILL_ORDER.forEach(function (k) {
      if (!E.SKILLS[k].concept) return;
      var rs = history.filter(function (x) { return x.skill === k && x.aspect === "reason" && !x.preview; }).sort(function (x, y) { return t(x) - t(y); });
      if (!rs.length) return;
      var last = rs[rs.length - 1];
      if (notLearned(k)) { reasonLog.push({ skill: k, why: "学校でまだ習っていないので、根拠の確認はしない" }); return; }
      if (last.correct) { if (rs.some(function (x) { return !x.correct; })) reasonLog.push({ skill: k, why: "最後の根拠は正解（もう確認しなくてよい）" }); return; }
      var v = st(k).value;
      if (v && v.attempts && (RANK[v.status] || 0) < RANK.understood) { reasonLog.push({ skill: k, why: "角度もまだ不安定なので、根拠だけの確認ではなく戻る勉強で" }); return; }
      var conf = [];
      for (var i = rs.length - 1; i >= 0 && !rs[i].correct; i--) if (rs[i].confusion && conf.indexOf(rs[i].confusion) === -1) conf.push(rs[i].confusion);
      var missed = rs.filter(function (x) { return !x.correct; }).map(function (x) { return baseId(x.question_id); });
      reasonCands.push({ skill: k, level: "basic", confusions: conf, missed_questions: missed, last_miss: last.answered_at,
        why: "最後の根拠がまちがい" + (conf.length ? "（" + conf.join("・") + "）" : "") });
      reasonLog.push({ skill: k, why: "根拠の確認の候補：" + "最後の根拠がまちがい" + (conf.length ? "（" + conf.join("・") + "）" : ""), candidate: true });
    });
    reasonCands.sort(function (x, y) { return Date.parse(y.last_miss) - Date.parse(x.last_miss); });

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
        if (k === "proofBuild" && buildOnly) { p2.push({ skill: k, level: "standard", school: ss, order: true }); return; }
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

    // テストが近いとき：別の仕組みにはせず、時間の配分（allocate）の中で「テスト範囲」の枠を重くする。
    // 根本のつまずき（範囲の外でも）は短くても残すので、ここでは候補を範囲でしぼらない
    var test = input.test;
    if (test) {
      log.push("テスト：あと" + test.days_left + "日／範囲 " + test.range.map(label).join("・"));
      // 定着の確認は、範囲の中のスキルを先に
      p3.sort(function (x, y) { return (test.range.indexOf(x.skill) === -1 ? 1 : 0) - (test.range.indexOf(y.skill) === -1 ? 1 : 0); });
    }

    // 扱わないスキル
    E.SKILL_ORDER.forEach(function (k) {
      var s = st(k);
      if (s.learning_status === "mastered") excluded.push({ skill: k, why: "マスター済み（定着の確認の時期まで扱わない）" });
      else if (!s.attempt_count && unitSkills.indexOf(k) === -1) excluded.push({ skill: k, why: "まだ記録がなく、学校の単元でもない" });
      else if (s.learning_status === "not_learned" && status !== "notyet") excluded.push({ skill: k, why: "学校でまだ習っていない" });
    });

    return { p1: p1, p2: p2, p3: p3, p4: p4, build_only: buildOnly, reason: reasonCands, reasonLog: reasonLog, excluded: excluded, log: log, st: st, weak: weak, rank: rank, done: done, practiced: practiced, unitSkills: unitSkills,
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
    var unitAt = function (k) { var u = E.SKILLS[k].unit; return u === "既習" ? 0 : u === "正負の数" ? 0.3 : u === "文字と式" ? 0.6 : u === "一次方程式" ? 1 : u === "比例と反比例" ? 1.5 : u === "平面図形" ? 1.7 : u === "空間図形" ? 1.8 : 2 + E.SELECTABLE_UNITS.indexOf(u); };
    var crossUnit = unitAt(root.skill) < unitAt(E.UNITS[curUnit] ? E.UNITS[curUnit][0] : root.skill) ? 1 : 0;
    var errRate = recent.length ? recentErr / recent.length : 0.5;
    var factors = { skill: root.skill, confidence: Math.round(conf * 100) / 100, recent_errors: recentErr, recent_answers: recent.length, depth: root.depth || 0, weak_skills: a.p1.length, cross_unit: crossUnit };
    // 確かさは記録が少ないうちは低く出るので、「理解」の目安（0.65）に対してどれだけ足りないかで見る。
    // いちばん効くのは、最近の答えの誤答の割合
    var score = 0.3 * (1 - Math.min(1, conf / 0.65)) + 0.25 * errRate + 0.15 * Math.min(root.depth || 0, 3) / 3 + 0.1 * Math.min(a.p1.length - 1, 2) / 2 + 0.1 * crossUnit;
    score = Math.round(Math.min(1, Math.max(0, score)) * 100) / 100;
    return { level: score < ALLOC.severity.mild ? "mild" : score < ALLOC.severity.moderate ? "moderate" : "severe", score: score, factors: factors };
  }

  // ---------- テストが近いとき（test_priority） ----------
  // テスト対策は別の仕組みにしない。残り日数で「テスト範囲」の枠の重み・最小時間と、学習の目的（段階）を変えるだけ。
  //   14日以上前：通常の学習が基本（範囲は軽く）／8〜13日前：範囲を少し優先／4〜7日前：範囲を明確に優先／1〜3日前：範囲が中心
  var TEST = {
    weight: function (d) { return d >= 14 ? 0.2 : d >= 8 ? 0.4 : d >= 4 ? 0.7 : 0.9; },
    stage: function (d) { return d >= 8 ? "understand" : d >= 4 ? "solve" : d >= 2 ? "narrow" : "confirm"; },
    stageJa: { understand: "理解を作る", solve: "問題を解けるようにする", narrow: "弱点をしぼる", confirm: "新しいことはせず確認" },
    minRatio: { understand: 0.17, solve: 0.5, narrow: 0.67, confirm: 0.67 }, // テスト範囲に必ず使う時間（全体に対する割合）
    rootMax: { understand: null, solve: { 20: 5, 30: 10, 45: 10, 60: 15 }, narrow: { 20: 5, 30: 5, 45: 10, 60: 10 }, confirm: { 20: 5, 30: 5, 45: 5, 60: 10 } },
    RETRY_DAYS: 7
  };
  var TEST_MARK = { "◎": 0, "○": 1, "？": 2, "△": 3 };

  // テスト範囲の中の優先順位：確かさが低い → 最近のまちがい → 標準・応用が弱い → 定着が未確認 → （最後に）未学習の先取り
  function rankTest(a, input, test, stage) {
    var history = input.history || [], now = input.now;
    var out = [], excluded = [];
    var previewSkill = a.previewSkill;
    test.range.forEach(function (k) {
      var s = a.st(k);
      if (a.notLearned(k)) {
        // 学校でまだ習っていない：苦手にはしない。テストが近く、学校で次に習う1スキルなら「先取り候補」
        if (k === previewSkill && stage === "solve") out.push({ skill: k, level: "basic", preview: true, priority: 0.5, mark: "・", reasons: ["テスト範囲・学校でこれから習う（先取り候補）"] });
        else excluded.push({ skill: k, why: "テスト範囲だが学校でまだ習っていない（苦手にはしない" + (stage === "confirm" ? "・前日は新しいことをしない" : stage === "narrow" ? "・3日前からは弱点にしぼる" : "") + "）" });
        return;
      }
      var mine = history.filter(function (x) { return x.skill === k && !(x.preview && !x.correct); }).sort(function (x, y) { return t(x) - t(y); });
      var recent = mine.slice(-4);
      var mistakes = recent.filter(function (x) { return !x.correct; }).length;
      var reasons = [], p = 0;
      var weak = a.weak(k), conf = s.attempt_count ? s.confidence : 0;
      if (!s.attempt_count) { p += 2; reasons.push("まだ確かめていない"); }
      if (weak) { p += 3; reasons.push("まだ不安定"); }
      if (s.attempt_count && conf < 0.65) { p += (0.65 - conf) * 4; reasons.push("確かさ " + conf.toFixed(2)); }
      if (mistakes) { p += mistakes * 0.7; reasons.push("最近 " + mistakes + " 回まちがい"); }
      if (s.standard === "needs_review" || s.application === "needs_review") { p += 1.5; reasons.push("標準・応用が弱い"); }
      if (s.first_pass_at && s.retention !== "pass" && now - Date.parse(s.first_pass_at) >= CONFIG.RETENTION_DAYS * E.DAY) { p += 1; reasons.push("定着が未確認"); }
      if (test.focus && test.focus.indexOf(k) !== -1) p += 0.5; // 計画で今日の予定にしたスキル
      var mark = !s.attempt_count ? "？" : weak ? "△" : s.learning_status === "understood" ? "○" : "◎";
      // 段階ごとの目的：理解を作る（基礎→標準）／問題を解けるように（標準・応用）／弱点をしぼる（△・？だけ）／前日（記録のあるスキルだけ）
      var level = weak || !s.attempt_count ? "basic"
        : stage === "understand" ? (a.nextLevel(k, ["basic", "standard"]) || "standard")
        : stage === "solve" ? (a.nextLevel(k, ["standard", "application"]) || "standard") : "standard";
      if (stage === "narrow" && mark !== "△" && mark !== "？") { excluded.push({ skill: k, why: "テスト3日前までは弱点にしぼる（" + mark + "）" }); return; }
      if (stage === "confirm" && !s.attempt_count) { excluded.push({ skill: k, why: "前日は新しいスキルをしない（まだ記録がない）" }); return; }
      if (stage === "confirm" && mark === "◎" && !(s.first_pass_at && s.retention !== "pass")) { excluded.push({ skill: k, why: "前日：仕上がっている（◎）" }); return; }
      // 最近まちがえた問題（そのあと正解していないもの）は、前日・3日前にもう一度
      var retry = [];
      if (stage === "narrow" || stage === "confirm") {
        var seenOk = {};
        mine.slice().reverse().forEach(function (x) {
          var id = String(x.question_id).split("#")[0];
          if (x.correct) { seenOk[id] = true; return; }
          if (!seenOk[id] && now - t(x) <= TEST.RETRY_DAYS * E.DAY && retry.indexOf(id) === -1 && SC.QUESTIONS[id]) retry.push(id);
        });
      }
      out.push({ skill: k, level: level, priority: Math.round(p * 100) / 100, mark: mark, reasons: reasons, retry: retry });
    });
    out.sort(function (x, y) { return y.priority - x.priority || ROOT_ORDER.indexOf(x.skill) - ROOT_ORDER.indexOf(y.skill); });
    return { list: out, excluded: excluded };
  }

  function allocate(a, input, minutes, goal, log) {
    var sev = severityOf(a, input);
    var level = sev.level;
    // 目標による調整：前にもどって確認する日は1段重く・先取りなし／もう少し先へは1段軽く／復習は定着を長めに
    var order = ["none", "mild", "moderate", "severe"];
    if (goal === "catch_up" && level !== "none") level = order[Math.min(3, order.indexOf(level) + 1)];
    if (goal === "challenge" && level !== "none") level = order[Math.max(1, order.indexOf(level) - 1)];
    var test = a.test;
    var stage = test ? TEST.stage(test.days_left) : null;
    var tw = test ? TEST.weight(test.days_left) : 0;
    var inRange = function (k) { return !!test && test.range.indexOf(k) !== -1; };

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
    var rankOf = function (c) { return c.order ? 0 : c.skill === symptom ? 0 : shakyOnRoot(c) ? 1 : c.school === "current" ? 2 : 3; };
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
    var excluded = [];

    // テスト範囲の候補（テストが近いとき）
    var tr = test ? rankTest(a, input, test, stage) : { list: [], excluded: [] };
    var testCands = tr.list.filter(function (c) { return !root || c.skill !== root.skill; });
    tr.excluded.forEach(function (x) { excluded.push({ skill: x.skill, kind: "test", why: x.why }); });
    // 学校の範囲とテスト範囲が重なっているとき、テストが近い日は学校の枠をテスト範囲の枠に含める
    var schoolInTest = schoolCands.some(function (c) { return inRange(c.skill); });
    var mergeSchool = !!test && stage !== "understand" && (schoolInTest || stage === "confirm");
    if (mergeSchool && schoolCands.length) log.push("テストまで" + test.days_left + "日：学校の範囲はテスト範囲の枠の中で扱う");

    var previewCand = a.p2.filter(function (c) { return c.preview; })[0] || null;
    var retentionCand = a.p3.filter(function (c) { return !test || stage === "understand" || inRange(c.skill); })[0] || null;
    var busy = function (k) {
      return (root && k === root.skill) || schoolCands.slice(0, 2).some(function (c) { return c.skill === k; }) || testCands.slice(0, 3).some(function (c) { return c.skill === k; });
    };
    var challengeCand = !test || stage === "understand" ? a.p4.filter(function (c) { return a.unitSkills.indexOf(c.skill) !== -1 && !busy(c.skill); })[0] || null : null;
    // おさらい：ほかの枠が上限でいっぱいのときの受け皿（同じスキルを長く続けないため）。できているところを形を変えて
    // 候補はいくつか持ち、1つのスキルは MAINTAIN_CHUNK 分までにして、ほかのスキルに分ける（テストが近ければ範囲の中を先に）
    var maintainCands = a.p4.filter(function (c) { return !busy(c.skill) && (!challengeCand || c.skill !== challengeCand.skill); })
      // （前の学年の土台は問題が少なく、定着の確認に残したいので、おさらいには使わない）
      .concat(E.SKILL_ORDER.filter(function (k) { return E.SKILLS[k].unit !== "既習" && a.st(k).attempt_count && a.rank(k) >= 3 && !a.weak(k) && !busy(k) && !a.notLearned(k); })
        .sort(function (x, y) { return a.st(x).confidence - a.st(y).confidence; }).map(function (k) { return { skill: k, level: "standard" }; }))
      .filter(function (c, i, all) { return all.findIndex(function (d) { return d.skill === c.skill; }) === i; })
      .sort(function (x, y) { return (inRange(x.skill) ? 0 : 1) - (inRange(y.skill) ? 0 : 1); }).slice(0, 3);
    var maintainCand = maintainCands[0] || null;
    var MAINTAIN_CHUNK = minutes >= 60 ? 15 : 10;
    // 証明（合同と証明）の日は、証明だけでその日の時間を使い切らない：30分以上なら、ほかの単元を5分（定着の確認 → なければ形を変えておさらい）
    var otherCand = null;
    if (isProof(a.unitSkills[0]) && minutes >= 30 && !(retentionCand && !isProof(retentionCand.skill))) {
      var oc = a.p3.filter(function (c) { return !isProof(c.skill); })[0];
      if (oc) otherCand = { skill: oc.skill, level: "retention", why: "証明だけにならないよう、ほかの単元の定着の確認（" + oc.why + "）" };
      else {
        var ok = E.SKILL_ORDER.filter(function (k) { return !isProof(k) && E.SKILLS[k].unit !== "既習" && a.st(k).attempt_count && !a.notLearned(k) && !a.weak(k); })
          .sort(function (x, y) { return a.st(x).confidence - a.st(y).confidence; })[0];
        if (ok) otherCand = { skill: ok, level: a.rank(ok) >= 3 ? "standard" : "basic", why: "証明だけにならないよう、ほかの単元を少しおさらい（形を変えて）" };
      }
      if (otherCand) log.push("証明の日：ほかの単元を5分（" + label(otherCand.skill) + "）");
    }

    // 先取りは余裕があるときだけ（つまずきなし、または小さくて45分以上）。学校の範囲が尽きていれば先取りが学校の代わり。
    // テストが近いときは、テスト範囲の先取り候補として「テスト範囲」の枠で扱う（前日はしない）
    var previewInTest = testCands.some(function (c) { return c.preview; });
    var previewOk = !!previewCand && !previewInTest && minutes >= 30 && goal !== "catch_up" && goal !== "review" && (!test || stage === "understand") &&
      (level === "none" || (level === "mild" && minutes >= 45) || !schoolCands.length);
    if (previewCand && !previewOk && !previewInTest) excluded.push({ skill: previewCand.skill, kind: "preview", why: test && stage !== "understand" ? (stage === "confirm" ? "テスト前日は新しいことをしない" : "テストが近いので、先取りはテスト範囲に入っているときだけ") : minutes < 30 ? "20分の日は先取りしない" : goal === "catch_up" || goal === "review" ? "今日の目標では先取りしない" : "つまずきの補強と学校の範囲を優先（先取りは余裕があるときだけ）" });
    var retentionOk = !!retentionCand && (minutes >= 30 || level === "none" || stage === "confirm");
    if (retentionCand && !retentionOk) excluded.push({ skill: retentionCand.skill, kind: "retention", why: "20分でつまずきの補強があるので、定着の確認は次の日に" });
    var checkOk = (level !== "none" || (test && stage !== "understand")) && (minutes >= 30 || level === "moderate" || level === "mild");
    // 根拠の確認（5分）：戻る勉強のスキルとは別のスキル。前日は新しいことをしない日なので、テスト範囲のスキルだけ
    var reasonCand = (a.reason || []).filter(function (c) { return (!root || c.skill !== root.skill) && (!test || stage !== "confirm" || inRange(c.skill)); })[0] || null;

    // --- 枠：重み・最小・最大 ---
    var blocks = [];
    function block(id, w, min, max, info) { if (max >= min && max > 0) blocks.push({ id: id, w: w, min: min, max: max, units: 0, info: info }); }
    var rootMax = ALLOC.rootMax[level === "none" ? "mild" : level][minutes];
    if (test && TEST.rootMax[stage]) rootMax = Math.min(rootMax, TEST.rootMax[stage][minutes]); // テストが近いほど短く。ただし0にはしない
    // 図形の性質そのものに戻るときは、原則10分（短い日・テストが近い日は、いつもの上限まで縮める）
    var geoRoot = root && (root.geo_kind === "geometry_root_review" || root.geo_kind === "proof_root_review");
    var geoRootM = geoRoot ? Math.max(5, Math.min(GEO_MIN.root, test && TEST.rootMax[stage] ? TEST.rootMax[stage][minutes] : GEO_MIN.root)) : 0;
    // 20分で理由の確認もある日は、図形の戻る勉強を5分にして、理由の確認と学校の学習を残す
    if (geoRoot && minutes <= 20 && reasonCand && reasonCand.skill !== root.skill) geoRootM = 5;
    if (root) block("root", 0.2 + 0.5 * sev.score, geoRoot ? geoRootM : 5, geoRoot ? geoRootM : Math.max(5, rootMax), { skill: root.skill });
    // 根拠の確認：5分だけ（学校の範囲を大きく圧迫しない。時間が足りない日は、定着の確認の次に削る）
    if (reasonCand) block("reason", 0.1, GEO_MIN.reason, GEO_MIN.reason, { skill: reasonCand.skill });
    if (testCands.length) {
      var tmin = Math.max(5, Math.round(minutes * TEST.minRatio[stage] / 5) * 5);
      var tmax = ALLOC.perSkillMax[minutes] * Math.min(3, testCands.length); // 1スキル15分まで。足りない分は、範囲の中の「おさらい」へ
      block("test", tw * 1.2, Math.min(tmin, minutes - (root ? 5 : 0), tmax), tmax, { skill: testCands[0].skill });
    }
    if (schoolCands.length && !mergeSchool) {
      var smin = !test ? ALLOC.schoolMin[minutes] : stage === "understand" && tw < 0.3 ? ALLOC.schoolMin[minutes] : 5;
      block("school", ALLOC.weights.school * (goal === "catch_up" ? 0.8 : 1) * (1 - tw), Math.min(smin, minutes - (root ? 5 : 0)),
        ALLOC.perSkillMax[minutes] * Math.min(2, schoolCands.length), { skill: schoolCands[0].skill });
    }
    if (retentionOk) block("retention", ALLOC.weights.retention * (goal === "review" || stage === "confirm" ? 2.5 : 1), 5, goal === "review" || stage === "confirm" ? 10 : ALLOC.retentionMax[minutes], { skill: retentionCand.skill });
    if (previewOk) block("preview", ALLOC.weights.preview * (goal === "challenge" ? 1.5 : 1), 5, ALLOC.previewMax[minutes] || 10, { skill: previewCand.skill });
    if (checkOk && (root || schoolCands.length || testCands.length)) block("check", ALLOC.weights.check, 5, 5, {});
    if (challengeCand && (level === "none" || level === "mild")) block("challenge", ALLOC.weights.challenge * (goal === "challenge" ? 3 : 1), 0, 10, { skill: challengeCand.skill });
    if (maintainCand) block("maintain", 0.03, 0, MAINTAIN_CHUNK * maintainCands.length, { skill: maintainCand.skill });
    if (otherCand) block("other", 0.1, 5, 5, { skill: otherCand.skill });
    if (!schoolCands.length) log.push("学校の範囲で今日進める内容がない（ひととおりできている）ので、学校の枠はほかに回す");

    // --- 5分ずつ配る ---
    var total = minutes / 5;
    var wsum = blocks.reduce(function (s, b) { return s + b.w; }, 0) || 1;
    blocks.forEach(function (b) { b.target = total * b.w / wsum; b.units = b.min / 5; });
    var left = total - blocks.reduce(function (s, b) { return s + b.units; }, 0);
    // 最小の合計が時間を超えたら、優先度の低い枠から削る
    // 20分の日は「理由を確認」を「確認」（仕上げ）より後に削る（根拠だけ弱い子の5分を、一律に落とさない）
    var dropOrder = minutes <= 20 ? ["maintain", "challenge", "preview", "other", "retention", "check", "reason", "school", "test", "root"]
      : ["maintain", "challenge", "preview", "other", "retention", "reason", "check", "school", "test", "root"];
    while (left < 0) {
      var cut = dropOrder.map(function (id) { return blocks.filter(function (b) { return b.id === id && b.units > 0; })[0]; }).filter(Boolean)[0];
      if (!cut) break;
      var keep = cut.id === "school" || cut.id === "root" || cut.id === "test" ? 1 : 0;
      if (cut.units > keep) { cut.units--; left++; } else break;
    }
    while (left > 0) {
      var open = blocks.filter(function (b) { return b.units * 5 < b.max; });
      // どの枠も上限なら、テスト範囲・学校の範囲・戻る勉強に足す（それもなければ、ある枠に）
      if (!open.length) open = blocks.filter(function (b) { return b.id === "test" || b.id === "school" || b.id === "root"; });
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
    var rb = get("root"), sb = get("school"), tb = get("test");
    if (rb.minutes) {
      var rm = rb.minutes;
      // 戻る勉強が15分以上でつまずきが中以上なら、最初の5分は「できている前提」を思い出すウォームアップ
      var pre = (E.SKILLS[root.skill].prerequisites || []).filter(function (p) { return a.rank(p) >= 3 && !a.weak(p); })[0];
      if (rm >= 15 && pre && (level === "moderate" || level === "severe")) {
        push(pre, "basic", "review", "「" + label(root.skill) + "」の前にある、できている内容を思い出す", 5, "warmup");
        rm -= 5;
      }
      var rwhy = root.geo_kind === "proof_root_review" ? "証明の「" + label(root.skill) + "」で止まっているので、短い問題 → 証明の行の順に確かめる（" + (root.symptom ? root.symptom + " から" : "まだ不安定") + "）"
        : geoRoot ? "図形の性質のところで迷っているので、位置関係 → 根拠 → 簡単な角度の順に戻る（" + (root.symptom ? root.symptom + " から" : "まだ不安定") + "）"
        : test && stage !== "understand" ? "テストが近くても、根本のつまずきは短く確認（" + (root.symptom ? root.symptom + " から" : "まだ不安定") + "）"
        : root.symptom ? "原因さがしで見つかった戻る場所（" + root.symptom + " から）" : "まだ不安定な、いちばん根元のスキル";
      var second = rootCands[1];
      if (rm > cap && second) {
        push(root.skill, root.level, "practice", rwhy, cap, "reinforce", root);
        push(second.skill, second.level, "practice", "次に不安定なスキルも少し", rm - cap, "reinforce", second);
      } else push(root.skill, root.level, "practice", rwhy, rm, "reinforce", root);
    }
    if (get("reason").minutes) push(reasonCand.skill, "basic", "reason_review", reasonReviewText(reasonCand.skill), get("reason").minutes, "reason", reasonCand);
    if (tb.minutes) {
      // テスト範囲：優先順位の高いスキルから、1スキル cap 分まで
      var tLeft = tb.minutes;
      testCands.forEach(function (c) {
        if (tLeft <= 0 || chosen.some(function (x) { return x.skill === c.skill; })) return;
        var m = Math.min(cap, tLeft);
        if (tLeft - m > 0 && tLeft - m < 5) m = tLeft;
        var why = c.preview ? "テスト範囲で、学校でこれから習うところを少しだけ先取り（まちがえても苦手にはしない）"
          : "テスト範囲（" + TEST.stageJa[stage] + "）：" + (c.reasons.length ? c.reasons.join("・") : "仕上げ") + "（" + c.mark + "）";
        push(c.skill, c.level, c.preview ? "preview" : "test", why, m, "test", c);
        tLeft -= m;
      });
      if (tLeft > 0 && chosen.length) chosen[chosen.length - 1].minutes += tLeft;
    }
    if (sb.minutes) {
      // 理由の確認と同じスキルでも、学校で学習中のスキルはそのまま選ぶ（あとで1つのパートにまとめる。学校のスキルを飛ばさない）
      var sm = sb.minutes, sc = schoolCands.filter(function (c) { return !chosen.some(function (x) { return x.skill === c.skill && x.type !== "reason_review"; }); });
      var c0 = sc[0], c1 = sc[1];
      var swhy = function (c) {
        return c.skill === symptom ? "補強した内容を使って、つまずいた「" + label(c.skill) + "」の問題に戻る"
          : c.school === "current" ? "学校でいま習っている内容" : c.school === "maintain" ? "学校の範囲はひととおりできているので、形を変えておさらい" : "学校で習った範囲から、次に進むレベル";
      };
      if (c0 && c0.order && c1 && sm > 10) {
        // 組み立てだけ弱い：並べかえは学校の学習の中で5〜10分。残りは次の学校のスキル
        var om = sm >= 20 ? 10 : 5;
        push(c0.skill, c0.level, "current_unit", "証明の組み立て（行の順番）だけが不安定なので、4〜5行の並べかえを少し", om, "current", c0);
        push(c1.skill, c1.level, "current_unit", swhy(c1), sm - om, "current", c1);
      } else if (!c0) { if (chosen.length) chosen[chosen.length - 1].minutes += sm; }
      else if (sm > cap && c1) {
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
    if (get("other").minutes) push(otherCand.skill, otherCand.level, "review", otherCand.why, get("other").minutes, otherCand.level === "retention" ? "retention" : "maintain", otherCand);
    if (get("preview").minutes) push(previewCand.skill, "basic", "preview", "学校でこれから習う内容を、少しだけ先取り（まちがえても苦手にはしない）", get("preview").minutes, "preview", previewCand);
    if (get("check").minutes) {
      var focus = chosen.filter(function (c) { return c.type === "test"; })[0] || chosen.filter(function (c) { return c.type === "practice"; })[0] || chosen.filter(function (c) { return c.type === "current_unit"; })[0];
      if (focus) push(focus.skill, focus.level, "check", test && stage !== "understand" ? "仕上げチェック：今日の「" + label(focus.skill) + "」を、別の問題で確かめる" : "今日の「" + label(focus.skill) + "」ができたか、別の問題で確かめる", 5, "check");
      else if (chosen.length) chosen[0].minutes += 5;
    }

    // --- 組み立て：同じスキルは1つのパートにまとめる（目的は purposes に残す）。20分は3パートまで ---
    //   「確認」（仕上げ）は、その日の中心のスキルを別の問題で確かめるパートなので、まとめの対象にしない
    var PURPOSE = { practice: "root", current_unit: "school", test: "test", reason_review: "reason_review", review: "review", challenge: "challenge", preview: "preview", check: "check" };
    var compose = { original: chosen.map(function (c) { return { type: c.type, skill: c.skill, minutes: c.minutes, level: c.level }; }), merges: [], cut: [], reason: reasonCand ? reasonCand.skill : null };
    if (reasonCand && root && reasonCand.skill === root.skill) compose.merges.push({ skill: reasonCand.skill, into: "practice", what: "reason_review", why: "戻る勉強の中で根拠も選ぶので、別のパートにしない" });
    var merged = [];
    chosen.forEach(function (c) {
      c.purposes = [PURPOSE[c.type] || c.type];
      if (c.type === "retention" || (c.type === "review" && c.level === "retention")) c.purposes = ["retention"];
      var host = c.type === "check" ? null : merged.filter(function (m) { return m.type !== "check" && m.skill === c.skill; })[0];
      if (!host) { merged.push(c); return; }
      // 理由の確認が先に入っていたら、学校の学習などを「主」にして、理由の確認をその中にまとめる（表示は学校の学習）
      if (host.type === "reason_review" && c.type !== "reason_review") {
        c.reasonMeta = host.meta;
        c.baseMinutes = c.minutes;
        c.minutes += host.minutes;
        c.purposes = c.purposes.concat(["reason_review"]);
        merged[merged.indexOf(host)] = c;
        compose.merges.push({ skill: c.skill, into: c.type, what: "reason_review", why: "同じスキルなので1つのパートにまとめる（" + c.purposes.join("＋") + "）。最後に根拠の問題" });
        return;
      }
      // まとめても、問題はそれぞれのパートの目的・レベルのまま選ぶ（定着の問題を基礎の問題で置きかえない）
      if (host.baseMinutes == null) host.baseMinutes = host.minutes;
      if (c.type !== "reason_review") host.extra = (host.extra || []).concat([{ level: c.level, minutes: c.minutes, type: c.type }]);
      host.minutes += c.minutes;
      c.purposes.forEach(function (p) { if (host.purposes.indexOf(p) === -1) host.purposes.push(p); });
      if (c.type === "reason_review") host.reasonMeta = c.meta;
      compose.merges.push({ skill: c.skill, into: host.type, what: c.type, why: "同じスキルなので1つのパートにまとめる（" + host.purposes.join("＋") + "）" });
    });
    chosen = merged;
    if (minutes <= 20) {
      // 優先度：深い原因 ＞ 学校 ＞ テスト範囲（テストが近い日は学校と同じ）＞ 理由の確認 ＞ 仕上げの確認 ＞ 定着 ＞ 先取り ＞ そのほか
      var near = test && stage !== "understand";
      var pri = function (c) {
        return c.type === "practice" ? 1 : c.type === "current_unit" ? 2 : c.type === "test" ? (near ? 2 : 3) : c.type === "reason_review" ? 4 : c.type === "check" ? 5
          : c.purposes.indexOf("retention") !== -1 ? 6 : c.type === "preview" ? 7 : 8;
      };
      while (chosen.length > 3) {
        var worst = chosen.slice().sort(function (x, y) { return pri(y) - pri(x); })[0];
        chosen.splice(chosen.indexOf(worst), 1);
        var keepTo = chosen.filter(function (c) { return c.type === "current_unit" || c.type === "test"; })[0] || chosen.filter(function (c) { return c.type !== "check"; })[0] || chosen[0];
        keepTo.minutes += worst.minutes;
        compose.cut.push({ skill: worst.skill, type: worst.type, minutes: worst.minutes, why: "20分は3パートまで。優先度（深い原因 ＞ 学校 ＞ テスト範囲 ＞ 理由の確認 ＞ 仕上げ ＞ 定着 ＞ 先取り）が低いので、「" + label(keepTo.skill) + "」に時間を回す" });
      }
      // 仕上げの確認の相手がいなくなったら、その日の中心のスキルにそろえる
      var chk = chosen.filter(function (c) { return c.type === "check"; })[0];
      if (chk && !chosen.some(function (c) { return c !== chk && c.skill === chk.skill; })) {
        var f2 = chosen.filter(function (c) { return c.type === "test" || c.type === "practice" || c.type === "current_unit"; })[0];
        if (f2) { compose.merges.push({ skill: chk.skill, into: "check", what: "check", why: "仕上げの確認を、今日の中心の「" + label(f2.skill) + "」にそろえる" }); chk.skill = f2.skill; chk.level = f2.level; }
      }
    }
    compose.merged = chosen.map(function (c) { return { type: c.type, skill: c.skill, minutes: c.minutes, purposes: c.purposes.slice() }; });

    var alloc = {
      available_minutes: minutes, goal: goal, severity: level, severity_raw: sev.level, severity_score: sev.score, factors: sev.factors,
      test: test ? { days_left: test.days_left, stage: stage, stage_ja: TEST.stageJa[stage], test_weight: tw, range: test.range.slice(), merge_school: mergeSchool,
        priority: tr.list.map(function (c) { return { skill: c.skill, priority: c.priority, mark: c.mark, level: c.level, reasons: c.reasons, preview: !!c.preview, retry: (c.retry || []).slice() }; }) } : null,
      candidates: {
        root: rootCands.map(function (c) { return c.skill; }), school: schoolCands.map(function (c) { return c.skill + ":" + (c.school || "") + ":" + c.level; }),
        test: testCands.map(function (c) { return c.skill; }),
        retention: retentionCand ? retentionCand.skill : null, preview: previewCand ? previewCand.skill : null, challenge: challengeCand ? challengeCand.skill : null,
        reason: reasonCand ? reasonCand.skill : null
      },
      blocks: blocks.map(function (b) { return { id: b.id, weight: Math.round(b.w * 100) / 100, target: b.target, min: b.min, max: b.max, minutes: b.minutes, skill: b.info.skill || null }; }),
      excluded: excluded,
      final: chosen.map(function (c) { return { minutes: c.minutes, type: c.type, skill: c.skill, level: c.level, purposes: c.purposes }; }),
      compose: compose
    };
    log.push("配分：つまずき「" + SEVERITY_JA[level] + "」（" + sev.score + "）" + (test ? "／テストまで" + test.days_left + "日（" + TEST.stageJa[stage] + "・重み " + tw + "）" : "") + "／" +
      blocks.map(function (b) { return b.id + " " + b.minutes + "分（重み " + Math.round(b.w * 100) / 100 + "）"; }).join("、"));
    return { chosen: chosen, alloc: alloc };
  }

  // 「なぜこの配分？」— 子どもにもわかる言葉で
  function allocWhy(alloc, plan) {
    var s = plan.sessions;
    var practice = s.filter(function (x) { return x.type === "practice" && x.display === "practice"; })[0];
    var school = s.filter(function (x) { return x.display === "current_unit"; })[0];
    var preview = s.filter(function (x) { return x.display === "preview"; })[0];
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
    if (alloc.test && alloc.test.stage !== "understand") return whyTest(a, plan, alloc);
    var lines = [];
    var opener = { catch_up: "今日は「前にもどって確認」する日。", review: "今日は「復習」の日。", challenge: "今日は「もう少し先へ」の日。" }[goal];
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
    var rr = s.filter(function (x) { return x.type === "reason_review"; })[0];
    if (rr) lines.splice(practice ? 1 : 0, 0, "「" + rr.skill_label + "」は" + (isProof(rr.skill) ? "主張は合っています" : "角度は求められています") + "。今日は理由だけ5分、少し確認しよう。");
    if (preview && !(school && !practice)) lines.push("学校でこれから習う「" + preview.skill_label + "」を少しだけ先取りします。まだ習っていない内容なので、できなくても大丈夫です。");
    else if (preview) lines.push("まだ習っていない内容なので、できなくても大丈夫です。");
    if (review) lines.push("前にできた「" + review.skill_label + "」を、忘れていないか少しだけ確かめます。");
    var testLine = alloc.test ? "テストまで" + alloc.test.days_left + "日。いつもの学習を中心に" + (s.filter(function (x) { return x.type === "test"; })[0] ? "、テスト範囲の「" + s.filter(function (x) { return x.type === "test"; })[0].skill_label + "」も少し確かめます。" : "進めます。") : null;
    if (testLine) lines.unshift(testLine);
    if (lines.length < 3) {
      var strong = E.SKILL_ORDER.filter(function (k) { return a.rank(k) >= 3 && !a.weak(k); }).sort(function (x, y) { return a.st(y).confidence - a.st(x).confidence; }).slice(0, 2);
      if (strong.length) lines.unshift(strong.map(function (k) { return "「" + label(k) + "」"; }).join("と") + "はよくできています。");
    }
    if (!lines.length) lines.push("今日の一歩を、少しずつ進めていこう。");
    return (opener || "") + lines.slice(0, 4).join("");
  }

  // テストまで7日以内の「なぜ今日はこれ？」
  function whyTest(a, plan, alloc) {
    var T = alloc.test, s = plan.sessions, lines = [];
    var parts = s.filter(function (x) { return x.type === "test"; });
    var names = parts.slice(0, 2).map(function (x) { return "「" + x.skill_label + "」"; }).join("と");
    // いちばん優先したパートの仕上がりで言い方を変える（△ まだ不安定／？ まだ確かめていない）
    var lead = parts[0] ? parts[0].mark : null;
    var how = lead === "△" ? "まだ不安定な" : lead === "？" ? "まだ確かめていない" : "";
    if (T.stage === "confirm") lines.push("明日はテストなので、新しいことは増やさず、まちがえた問題とまだ不安定なところを確かめます。");
    else if (names) lines.push("テストまで" + T.days_left + "日なので、テスト範囲の中で" + how + names + "を" + (T.stage === "narrow" ? "しぼって練習します。" : "優先します。"));
    else lines.push("テストまで" + T.days_left + "日。テスト範囲はよくできているので、仕上げの確認をします。");
    var practice = s.filter(function (x) { return x.type === "practice"; })[0];
    if (practice) lines.push("テストの問題を解くときにも使う「" + practice.skill_label + "」も、少しだけ確認します。");
    var pv = s.filter(function (x) { return x.type === "preview"; })[0];
    if (pv) lines.push("テスト範囲の「" + pv.skill_label + "」は学校でこれから習うところなので、少しだけ先取りします。できなくても大丈夫です。");
    var rv = s.filter(function (x) { return x.type === "review" && x.level === "retention"; })[0];
    if (rv) lines.push("前にできた「" + rv.skill_label + "」を、忘れていないか確かめます。");
    return lines.slice(0, 4).join("");
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

  // ---------- 図形：根拠の確認・戻る勉強の問題 ----------
  function parseConfusion(z) { var m = /^(.+)_for_(.+)$/.exec(z || ""); return m ? { chosen: m[1], answer: m[2] } : null; }
  function reasonStepOf(q) { return (q.steps || []).filter(function (st) { return st.aspect === "reason"; })[0] || null; }
  function recentIds(input, days) {
    var out = {};
    (input.history || []).forEach(function (a) { if (input.now - t(a) < days * E.DAY) out[baseId(a.question_id)] = true; });
    return out;
  }
  // 根拠の確認：同じ問題をもう一度ではなく、同じ取り違えを別の図で。
  //   使うのは、根拠だけを選ぶ短い問題（reason_only・aspect: "reason"）だけ。
  //   位置の名前の問題（同位角・錯角のスキル）や角度を求める問題を使うと、ほかのスキルの記録（value）が動いたり、
  //   定着の確認用の問題を使ってしまったりするので使わない（本番導線の確認で見つかった）
  function reasonPicks(c, input, used) {
    var recent = recentIds(input, CONFIG.AVOID_CHECK_DAYS);
    var avoid = function (id) { return used.indexOf(id) !== -1 || recent[id] || (c.missed_questions || []).indexOf(id) !== -1; };
    var confs = (c.confusions || []).map(parseConfusion).filter(Boolean);
    var all = Object.keys(SC.QUESTIONS).map(function (id) { return SC.QUESTIONS[id]; }).filter(function (q) { return q.origin === "bank" && !avoid(q.id); });
    // ① 取り違えた根拠が正解で、まちがえた根拠も選択肢にある問題（同じスキル → ほかのスキル）② 同じ正しい根拠の別の図 ③ 同じスキルの根拠だけの問題
    var short = all.filter(function (q) { return q.reason_only; });
    // 根拠は、記録したスキルの根拠だけの問題で確かめる（図形の角・合同と証明とも。別のスキルの reason を動かさない）
    short = short.filter(function (q) { return q.skill === c.skill; });
    var sameFirst = function (x, y) { return (x.skill === c.skill ? 0 : 1) - (y.skill === c.skill ? 0 : 1); };
    var ranked = [];
    confs.forEach(function (z) {
      short.filter(function (q) { return q.answer === z.answer && q.choices.some(function (ch) { return ch.key === z.chosen; }); }).sort(sameFirst).forEach(function (q) { ranked.push(q); });
      short.filter(function (q) { return q.answer === z.answer; }).sort(sameFirst).forEach(function (q) { ranked.push(q); });
    });
    short.filter(function (q) { return q.skill === c.skill; }).forEach(function (q) { ranked.push(q); });
    var out = [];
    ranked.forEach(function (q) {
      if (out.length >= 2 || out.some(function (p) { return p.question_id === q.id; })) return;
      out.push({ question_id: q.id, level: q.level, stage: 0, reused: false,
        why: out.length === 0 && confs.length ? "取り違えた根拠（" + confs.map(function (z) { return z.chosen + "→" + z.answer; }).join("・") + "）を、別の図で選ぶ（計算なし）" : "同じ根拠を、もう1つ別の図で選ぶ（計算なし）" });
    });
    return out;
  }
  // 図形の性質に戻る勉強：① 位置関係を見つける（戻る場所のスキルの基礎）→ ② 根拠を選ぶ → ③ 簡単な角度（まちがえた問題のスキルの基礎）
  //   いきなり複雑な角度計算へ戻さない（標準・応用は使わない）
  function geometryRootPicks(c, input, used, rng) {
    var out = [];
    var p1 = pickFor(c.skill, "basic", input, used, rng);
    if (p1) { p1.why = "① 位置関係・性質を見つける" + (p1.why ? "／" + p1.why : ""); out.push(p1); used.push(p1.question_id); }
    var recent = recentIds(input, CONFIG.AVOID_LESSON_DAYS);
    var skills = [c.skill, c.symptom_skill].filter(Boolean);
    // 根拠だけの短い問題を先に（計算させない）。なければ根拠の小問がある基礎の問題
    var rq = Object.keys(SC.QUESTIONS).map(function (id) { return SC.QUESTIONS[id]; }).filter(function (q) {
      return q.origin === "bank" && skills.indexOf(q.skill) !== -1 && q.level === "basic" && (q.reason_only || reasonStepOf(q)) && used.indexOf(q.id) === -1 && !recent[q.id];
    }).sort(function (x, y) { return (x.reason_only ? 0 : 1) - (y.reason_only ? 0 : 1) || skills.indexOf(x.skill) - skills.indexOf(y.skill); })[0];
    if (rq) { out.push({ question_id: rq.id, level: rq.level, stage: 0, reused: false, why: "② 根拠を選ぶ" }); used.push(rq.id); }
    var p3 = c.symptom_skill ? pickFor(c.symptom_skill, "basic", input, used, rng) : null;
    if (p3 && SC.QUESTIONS[p3.question_id].level === "basic") { p3.why = isProof(c.symptom_skill) ? "③ 証明に戻る（「" + label(c.symptom_skill) + "」の基礎）" : "③ 簡単な角度を求める（「" + label(c.symptom_skill) + "」の基礎）"; out.push(p3); used.push(p3.question_id); }
    return out;
  }

  // ---------- 証明（合同と証明）の戻る勉強 ----------
  //   スキルごとに「短い問題 → 証明の行」の順に3問。図形①へ戻るのは、原因さがしで図形①が戻る場所になったときだけ（geometry_root_review）
  var PROOF_ROOT_INTRO = {
    proofHypConc: "まず「仮定／結論」を選ぶ短い問題、次に短い穴うめ証明で、仮定の行を書いてみます。",
    congCorr: "まず対応する頂点、次に対応する辺・角、最後に短い証明で合同の書き方を確かめます。",
    proofFigureFacts: "共通な辺・角、対頂角、錯角など、図からわかる等しいことを短い問題で見つけます。",
    congCond: "まず合同条件の短い問題、次に証明の「合同条件の行」を確かめます。",
    congUse: "まず「合同を示したあと何が言えるか」、次に対応する辺・角を使う短い証明を確かめます。"
  };
  var isFill = function (q) { return !!q.proof && q.type === "steps"; };
  var stepRole = function (q, role, part) { return isFill(q) && q.steps.some(function (st) { return st.role === role && (!part || st.part === part); }); };
  var PROOF_ROOT_SEQ = {
    proofHypConc: [
      { why: "① 仮定／結論を選ぶ", test: function (q) { return q.skill === "proofHypConc" && !q.reason_only && q.level === "basic"; } },
      { why: "② 仮定／結論をもう1問", test: function (q) { return q.skill === "proofHypConc" && !q.reason_only && (q.level === "basic" || q.level === "standard"); } },
      { why: "③ 短い穴うめ証明（仮定の行）", test: function (q) { return stepRole(q, "hyp_fact") && q.level !== "application"; } }],
    congCorr: [
      { why: "① 対応する頂点", test: function (q) { return q.skill === "congCorr" && !!q.corr && q.corr.of.length === 1; }, fallback: function (q) { return q.skill === "congCorr" && q.level === "basic"; } },
      { why: "② 対応する辺・角", test: function (q) { return q.skill === "congCorr" && !!q.corr && q.corr.of.length > 1 && q.level !== "application"; } },
      { why: "③ 短い証明（合同の書き方・対応する辺）", test: function (q) { return (stepRole(q, "condition", "claim") || stepRole(q, "use", "claim")) && q.level !== "application"; } }],
    proofFigureFacts: [
      { why: "① 共通な辺・角を見つける", test: function (q) { return q.skill === "proofFigureFacts" && !q.reason_only && q.basis === "common"; } },
      { why: "② 対頂角・錯角などを見つける", test: function (q) { return q.skill === "proofFigureFacts" && !q.reason_only && !!q.basis && q.basis !== "common"; } },
      { why: "③ もう1つ、図から使えること", test: function (q) { return q.skill === "proofFigureFacts" && !q.reason_only && q.level !== "application"; } }],
    congCond: [
      { why: "① 合同条件の短い問題", test: function (q) { return q.skill === "congCond" && !q.reason_only && !!q.cond; } },
      { why: "② 合同条件の短い問題をもう1問", test: function (q) { return q.skill === "congCond" && !q.reason_only && !!q.cond; } },
      { why: "③ 証明の「合同条件の行」", test: function (q) { return (q.skill === "congCond" && !q.reason_only && !!q.src) || stepRole(q, "condition", "reason"); } }],
    congUse: [
      { why: "① 合同を示したあと、何が言えるか", test: function (q) { return q.skill === "congUse" && !q.reason_only && q.level === "basic"; } },
      { why: "② 合同から言えることをもう1問", test: function (q) { return q.skill === "congUse" && !q.reason_only && q.level !== "application"; } },
      { why: "③ 対応する辺・角を使う短い証明", test: function (q) { return stepRole(q, "use") && q.level !== "application"; } }]
  };
  // 条件に合う問題を1問。最近の診断・チェック（7日）・練習（2日）で出した問題は避け、まだ解いていない問題を先に
  function pickWhere(test, input, used, rng) {
    var history = input.history || [], now = input.now, last = {};
    history.forEach(function (a) { var id = baseId(a.question_id); last[id] = Math.max(last[id] || 0, t(a)); });
    var recent = {};
    history.forEach(function (a) { if (now - t(a) < (a.context === "lesson" ? CONFIG.AVOID_LESSON_DAYS : CONFIG.AVOID_CHECK_DAYS) * E.DAY) recent[baseId(a.question_id)] = true; });
    var pool = Object.keys(SC.QUESTIONS).map(function (id) { return SC.QUESTIONS[id]; }).filter(function (q) {
      return q.origin === "bank" && !q.reason_only && q.usage !== "diagnosis" && q.level !== "retention" && used.indexOf(q.id) === -1 && !recent[q.id] && test(q);
    });
    if (!pool.length) return null;
    var unseen = pool.filter(function (q) { return !last[q.id]; });
    // 戻る勉強なので、まだ解いていない問題のうち、いちばんやさしいレベルから（短い問題・短い証明を先に）
    var LV = { basic: 0, standard: 1, application: 2 };
    var low = Math.min.apply(null, unseen.map(function (q) { return LV[q.level]; }));
    var cands = unseen.length ? unseen.filter(function (q) { return LV[q.level] === low; }) : pool.sort(function (x, y) { return last[x.id] - last[y.id]; }).slice(0, 1);
    var q = cands[Math.floor((rng || Math.random)() * cands.length)];
    return { question_id: q.id, level: q.level, stage: 0, reused: !!last[q.id], why: "" };
  }
  function proofRootPicks(c, input, used, rng) {
    var out = [];
    (PROOF_ROOT_SEQ[c.skill] || []).forEach(function (s) {
      var p = pickWhere(s.test, input, used, rng) || (s.fallback ? pickWhere(s.fallback, input, used, rng) : null);
      if (!p) return;
      p.why = s.why;
      out.push(p); used.push(p.question_id);
    });
    return out;
  }
  // 組み立てだけ弱い：4〜5行の並べかえ（学校の学習の中で）
  function orderPicks(input, used, n) {
    var out = [];
    for (var i = 0; i < Math.max(1, Math.min(n, 2)); i++) {
      var p = pickWhere(function (q) { return q.type === "order"; }, input, used);
      if (!p) break;
      p.why = "4〜5行の並べかえ（先に必要な行から）";
      out.push(p); used.push(p.question_id);
    }
    return out;
  }

  // ---------- 今日の学習を組み立てる ----------
  // input: { states, history, explorations, school, minutes, goal, now, rng }
  function build(input) {
    var minutes = nearestMinutes(input.minutes || CONFIG.DEFAULT_MINUTES);
    var goal = input.test ? "test_preparation" : GOALS[input.goal] ? input.goal : CONFIG.DEFAULT_GOAL;
    var rng = input.rng || Math.random;
    var a = analyze(input);
    var log = a.log.slice();
    var tmpl = TEMPLATES[minutes].map(function (x) { return { role: x.role, baseRole: x.role, m: x.m }; });
    // ふだんの日もテストが近い日も同じ考え方：その日の状態から、戻る勉強・学校の範囲・テスト範囲・定着の確認・先取りに時間を配る
    var al = allocate(a, input, minutes, goal, log);
    var chosen = al.chosen, alloc = al.alloc;
    tmpl.forEach(function (x) { x.empty = false; }); // 時間はすでに配り終えている
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
    var detailForDisplay = input.school && input.school.detail;
    chosen.forEach(function (c) {
      c.display = displayOf(c, detailForDisplay);
      var td = testDisplayOf(c, alloc);
      if (td) { if (alloc && alloc.compose) alloc.compose.renamed = (alloc.compose.renamed || []).concat([{ skill: c.skill, type: c.type, from: typeLabel({ type: c.type, level: c.level }), to: TYPE_LABEL[td] }]); c.display = td; }
    });
    var sessions = chosen.map(function (c) {
      var n = questionCount(c.baseMinutes != null ? c.baseMinutes : c.minutes);
      var picks = [];
      var kind = c.type === "reason_review" ? "reason_review" : c.meta && c.meta.geo_kind && c.type === "practice" ? c.meta.geo_kind : null;
      if (kind === "reason_review") { picks = reasonPicks(c.meta, input, used); picks.forEach(function (p) { used.push(p.question_id); }); n = 0; }
      else if (kind === "geometry_root_review") { picks = geometryRootPicks(c.meta, input, used, rng); n = picks.length ? 0 : n; }
      else if (kind === "proof_root_review") { picks = proofRootPicks(c.meta, input, used, rng); n = picks.length ? 0 : n; }
      else if (c.type === "current_unit" && c.meta && c.meta.order) { picks = orderPicks(input, used, n); n = picks.length ? 0 : n; }
      // 理由の確認をまとめたパート：最後に根拠だけの問題を1〜2問（その分、ふつうの問題を減らす）
      var tail = [];
      if (c.reasonMeta && kind !== "reason_review") {
        tail = reasonPicks(c.reasonMeta, input, used).slice(0, c.minutes >= 15 ? 2 : 1);
        tail.forEach(function (p) { used.push(p.question_id); p.why = "最後に根拠の確認（" + (p.why || "") + "）"; });
        n = Math.max(1, n - tail.length);
      }
      for (var i = 0; i < n; i++) {
        // テストが近い日：最近まちがえた問題（そのあと正解していないもの）を先にもう一度
        var retry = c.meta && c.meta.retry ? c.meta.retry.filter(function (id) { return used.indexOf(id) === -1; })[0] : null;
        var p = retry ? { question_id: retry, level: SC.QUESTIONS[retry].level, stage: 0, reused: true, why: "最近まちがえた問題にもう一度（テスト前）" }
          : pickFor(c.skill, c.level, input, used, rng);
        if (!p) break;
        used.push(p.question_id);
        picks.push(p);
        if (SC.QUESTIONS[p.question_id].type === "steps") i++; // 小問つきの応用は2問分と数える
      }
      // まとめたパートの分：そのパートのレベルで
      (c.extra || []).forEach(function (x) {
        for (var k = 0; k < questionCount(x.minutes); k++) {
          var px = pickFor(c.skill, x.level, input, used, rng);
          if (!px) break;
          used.push(px.question_id); picks.push(px);
        }
      });
      picks = picks.concat(tail);
      var intro = (c.type === "practice" || c.type === "current_unit" || c.type === "challenge" || c.type === "preview") && SC.logic ? SC.logic.lessonIntro(c.skill, c.level) : null;
      if (kind === "reason_review") intro = isProof(c.skill) ? { title: "理由を確認（5分）", body: [PROOF_REASON_TEXT, "主張は問題文に書いてあります。「どうしてそう言えるか」だけを、別の図で選びます。"] }
        : { title: "理由を確認（5分）", body: [REASON_TEXT, "角度の計算はくり返さず、「どの性質を使ったか」だけを、別の図で確かめます。"] };
      if (kind === "proof_root_review") intro = { title: "もどって確認：" + label(c.skill), body: [partNote(c), PROOF_ROOT_INTRO[c.skill] || "短い問題で確かめてから、証明の行に戻ります。"] };
      if (kind === "geometry_root_review") intro = { title: "もどって確認：" + label(c.skill), body: [partNote(c), c.meta && isProof(c.meta.symptom_skill)
        ? "まず図形の性質（位置関係）を見つけて、次に根拠を選び、最後に証明の「図から使えること」に戻ります。"
        : "まず位置関係を見つけて、次に根拠を選び、最後に簡単な角度を求めます。むずかしい角度の計算には、まだ戻りません。"] };
      return {
        kind: kind,
        minutes: c.minutes, type: c.type, display: c.display || c.type, purposes: (c.purposes || [c.type]).slice(), type_label: typeLabel(c), note: partNote(c) || (c.reasonMeta ? "最後に、根拠（どうしてそう言えるか）も1〜2問確かめよう。" : null), role: c.role,
        skill: c.skill, skill_label: label(c.skill), level: c.level, level_label: LEVEL_JA[c.level],
        title: typeLabel(c) + "：" + label(c.skill) + "（" + LEVEL_JA[c.level] + "）",
        why: c.why, intro: intro,
        questions: picks.map(function (p) { return p.question_id; }), picks: picks,
        mark: c.type === "test" && c.meta ? c.meta.mark : null // テスト範囲の仕上がり（◎ ○ △ ？）
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

    // 今日の中心：テストまで7日以内はテスト範囲のパート。ふだんは 戻る勉強 → 学校の範囲
    var testNear = alloc && alloc.test && alloc.test.stage !== "understand";
    var focusS = (testNear ? sessions.filter(function (s) { return s.type === "test"; })[0] : null) ||
      sessions.filter(function (s) { return s.type === "practice" || s.type === "current_unit" || s.type === "challenge" || s.type === "test"; })[0] || sessions[0] || null;
    var plan = {
      id: E.makeId("pln", input.now),
      date: new Date(input.now).toISOString(),
      total_minutes: sessions.reduce(function (s, x) { return s + x.minutes; }, 0),
      requested_minutes: input.minutes || CONFIG.DEFAULT_MINUTES,
      goal: goal, goal_label: ALL_GOALS[goal],
      test: input.test ? { days_left: input.test.days_left, kind: input.test.kind, focus: input.test.focus, range: input.test.range,
        stage: alloc.test.stage, stage_ja: alloc.test.stage_ja, test_weight: alloc.test.test_weight } : null,
      school_progress: input.school || null,
      focus_skill: focusS ? focusS.skill : null,
      focus_label: focusS ? focusS.skill_label : null,
      sessions: sessions,
      fallback: false
    };
    plan.cross = crossText(plan, focusS);
    plan.reason = reasonText(a, plan, focusS);
    plan.why = whyAlloc(a, plan, goal, alloc);
    // ホームの「今日の重点」：テスト範囲のパート（なければ戻る勉強・学校の範囲）の 単元・スキル
    var focusParts = plan.sessions.filter(function (x) { return x.type === "test"; });
    if (!focusParts.length) focusParts = plan.sessions.filter(function (x) { return x.type === "practice" || x.type === "current_unit"; });
    plan.focus_text = focusParts.slice(0, 2).map(function (x) { var u = E.SKILLS[x.skill].unit; return (u === "既習" ? "" : u + "・") + x.skill_label; }).join("、");
    if (alloc) {
      // 最終の配分は、問題が足りずに出せなかったパートの時間を回したあとの値
      alloc.final = plan.sessions.map(function (x) { return { minutes: x.minutes, type: x.type, skill: x.skill, level: x.level }; });
      plan.alloc = { severity: alloc.severity, text: allocWhy(alloc, plan) };
    }
    plan.debug = { geometry: geometryDebug(a, input, plan), candidates: { p1: a.p1, p2: a.p2, p3: a.p3, p4: a.p4 }, excluded: a.excluded, template: alloc ? null : TEMPLATES[minutes], log: log, school: a.school, preview_skill: a.previewSkill, alloc: alloc };
    return plan;
  }

  // ?debug=plan 用：図形の value / reason の状態・取り違え・原因さがし・今日の学習に入れた種類
  function geometryDebug(a, input, plan) {
    var states = [];
    E.SKILL_ORDER.forEach(function (k) {
      var s = a.st(k);
      if (!E.SKILLS[k].concept || !s.value || (!s.value.attempts && !s.reason.attempts)) return;
      states.push({ skill: k, value: s.value, reason: s.reason, overall: s.overall });
    });
    var expl = (input.explorations || []).filter(function (x) { return x.geometry && input.now - Date.parse(x.date) <= CONFIG.EXPLORATION_DAYS * E.DAY; }).slice(-5).map(function (x) {
      var c = x.conclusion || {};
      return { symptom: x.symptom.skill, entry: x.geometry.entry, return_to: c.return_to || null, kind: c.kind,
        type: c.kind === "reason_only" ? "reason_review" : c.return_to ? (c.return_to === "proofBuild" ? "current_unit（並べかえ）" : isProof(c.return_to) ? "proof_root_review" : E.SKILLS[c.return_to].concept || c.return_to === "angleBasics" ? "geometry_root_review" : "calculation_root_review") : null,
        diagnostic_target: x.geometry.diagnostic_target || null, wrong_aspect: x.geometry.wrong_aspect || null, pending: (c.pending_findings || []).map(function (f) { return f.diagnostic_target; }) };
    });
    var parts = plan.sessions.filter(function (x) { return x.kind; }).map(function (x) {
      return { kind: x.kind, skill: x.skill, minutes: x.minutes, why: x.why, picks: x.picks.map(function (p) { return p.question_id + "：" + (p.why || ""); }) };
    });
    return { states: states, explorations: expl, reason: a.reasonLog, parts: parts };
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

  SC.planner = { CONFIG: CONFIG, GOALS: GOALS, ALL_GOALS: ALL_GOALS, TYPE_LABEL: TYPE_LABEL, LEVEL_JA: LEVEL_JA, TEMPLATES: TEMPLATES, PICK_STAGES: PICK_STAGES,
    analyze: analyze, build: build, pickFor: pickFor, reasonPicks: reasonPicks, proofRootPicks: proofRootPicks, PROOF_ROOT_SEQ: PROOF_ROOT_SEQ, GEO_MIN: GEO_MIN, nearestMinutes: nearestMinutes, backToLine: backToLine, ALLOC: ALLOC, severityOf: severityOf };
})(typeof window !== "undefined" ? window : globalThis);
