/*
 * Study Compass — 画面
 * ホーム → 初期設定 → コンパスチェック（基礎5問）→ 追加確認（回答で変わる）
 * → 現在地 → 今日の学習（25分・3ステップ）→ 振り返り
 *
 * 学習の記録（answer_history / skill_state / sessions）は js/store.js が持つ。
 * ここで保存しているのは「画面の途中状態」だけ（リロードしても続きから開けるように）。
 */
(function () {
  "use strict";

  var SC = window.SC;
  var L = SC.logic;
  var E = SC.engine;
  if (SC.store.get().profile.grade) E.setGrade(SC.store.get().profile.grade);
  var ST = SC.store;
  var C = SC.compass;
  var R = SC.rootcause;
  var QS = SC.QUESTIONS;
  var STATE_KEY = "study-compass-contest/state/v1";
  var DEBUG = /(?:^|[?&])debug=1(?:&|$)/.test(window.location.search.slice(1));
  var BANK_VIEW = /(?:^|[?&])debug=bank(?:&|$)/.test(window.location.search.slice(1));
  var FEELING_LABEL = { good: "できた", soso: "もう少し", hard: "わからなかった" };
  var app = document.getElementById("app");
  var restartButton = document.getElementById("restart-button");

  ST.load();
  // パイロット用の起動アイコンから開いたとき（?pilot=start）：パイロットを始めて、ふだんのホームを出す
  if (/(?:^|[?&])pilot=start(?:&|$)/.test(window.location.search.slice(1))) {
    if (!ST.pilot().active) ST.setPilotActive(true);
    if (window.history && window.history.replaceState) window.history.replaceState(null, "", window.location.pathname);
  }
  ST.recompute(); // 日付によって変わる「次にやること」を、開いた時点の日付で計算し直す
  var COMPASS_VIEW = /(?:^|[?&])debug=compass(?:&|$)/.test(window.location.search.slice(1));
  var PLAN_VIEW = /(?:^|[?&])debug=plan(?:&|$)/.test(window.location.search.slice(1));
  var TEST_VIEW = /(?:^|[?&])debug=test(?:&|$)/.test(window.location.search.slice(1));
  var PARENT_DEBUG = /(?:^|[?&])debug=parent(?:&|$)/.test(window.location.search.slice(1));
  var MAP_VIEW = /(?:^|[?&])debug=map(?:&|$)/.test(window.location.search.slice(1));
  var SCHOOL_VIEW = /(?:^|[?&])debug=school(?:&|$)/.test(window.location.search.slice(1));
  var FIGURE_VIEW = /(?:^|[?&])debug=figure(?:&|$)/.test(window.location.search.slice(1));
  var PROOF_VIEW = /(?:^|[?&])debug=proof(?:&|$)/.test(window.location.search.slice(1));
  var PILOT_VIEW = /(?:^|[?&])debug=pilot(?:&|$)/.test(window.location.search.slice(1));
  // ?debug=figure&try=問題ID：その問題をふだんと同じ入力欄で解き、記録・解説・状態の変化まで確かめる
  var FIGURE_TRY = FIGURE_VIEW ? decodeURIComponent((window.location.search.match(/[?&]try=([^&]+)/) || [])[1] || "") : "";
  var figTry = null;

  // ---------- 保存（使えない環境でも止まらない） ----------

  function load(key) {
    try { var raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function save(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 保存できなくても続ける */ }
  }

  function freshState() {
    return {
      screen: "home",
      setup: { grade: E.grade(), subject: "数学", unit: E.SELECTABLE_UNITS.indexOf("一次関数") !== -1 ? "一次関数" : E.SELECTABLE_UNITS[0], status: "learning" },
      queue: SC.BASIC_ORDER.slice(),
      basicCount: SC.BASIC_ORDER.length,
      followUps: [],
      idx: 0,
      answers: {},
      hintOpen: false,
      lesson: { step: 0, results: {} },
      feeling: null,
      sessionId: null,
      mode: "initial",   // "initial"（はじめてのチェック）| "periodic"（定期コンパスチェック）
      periodic: null,    // 定期チェックで選んだスキルと理由
      trails: [],        // つまずきの原因さがしの道すじ（js/rootcause.js）
      skipped: [],       // 原因さがしで確認済みになり、省略した（または例外で残した）予定問題
      probes: {},        // 問題ID → { trail: 道すじの番号, probe, done }
      probeBudget: 0,    // 原因さがしで、あと何問追加してよいか
      daily: null        // 今日の学習（自動生成）の進み具合 { plan, si, qi, results }
    };
  }

  var SCREENS = ["home", "setup", "check", "bridge", "result", "plan", "lesson", "reflect", "checkResult", "daily", "dailyPlan", "testSetup", "testPlan", "parent", "school", "guide"];
  function restore() {
    var s = load(STATE_KEY);
    if (!s || SCREENS.indexOf(s.screen) === -1 || !Array.isArray(s.queue) || typeof s.answers !== "object") return freshState();
    var ok = s.queue.every(function (id) { return !!QS[id]; });
    if (!ok || s.idx > s.queue.length) return freshState();
    s.mode = s.mode || "initial";
    s.trails = s.trails || [];
    s.probes = s.probes || {};
    s.probeBudget = s.probeBudget || 0;
    if (s.screen === "daily" && !(s.daily && s.daily.plan && s.daily.plan.sessions)) s.screen = "home";
    if (s.screen === "check" && s.idx >= s.queue.length) s.screen = s.mode === "periodic" ? "checkResult" : "result";
    s.lesson = s.lesson || { step: 0, results: {} };
    return s;
  }

  var state = restore();
  var draft = {}; // 入力中の値（描画し直しても消えないように）
  var message = "";

  // ---------- ユーティリティ ----------

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nl(text) { return esc(text).replace(/\n/g, "<br>"); }

  function go(screen) {
    state.screen = screen;
    state.hintOpen = false;
    message = "";
    draft = {};
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function diagnosisAndPlan() {
    if (state.mode === "periodic") return periodicPlan();
    if (state.mode === "fallback") {
      // 自動生成に失敗したときの固定プラン
      var fk = state.fallbackFocus;
      var fd = { planKey: state.fallbackKey, skills: [], focusSkill: fk ? { key: fk, label: E.SKILLS[fk].label } : null };
      return { d: fd, plan: L.buildPlan(fd, {}) };
    }
    if (state.mode === "daily") {
      // ふり返り画面用：今日の学習の問題を「ステップ」として数える
      var p = state.daily.plan;
      var all = [];
      p.sessions.forEach(function (s) { s.questions.forEach(function (id) { all.push(id); }); });
      return { d: { focusSkill: p.focus_skill ? { key: p.focus_skill, label: p.focus_label } : null },
        plan: { cross: p.cross, beyond: "次の一歩", steps: all, why: p.why } };
    }
    var d = L.diagnose(state.answers);
    var plan = applyTrailToPlan(d, L.buildPlan(d, state.answers), state.trails);
    if (plan.fromTrail) {
      // 原因さがしで前提に戻った場合は、「発見」の文も道すじの結論に合わせる
      d.discovery = R.deepestReturn(state.trails).conclusion.message + "\n1回のチェックだけで決めつけず、これからの学習結果もあわせて現在地を更新していきます。";
      d.planKey = plan.key;
    }
    return { d: d, plan: plan };
  }

  // 定期チェックのあとは、その回の回答ではなく skill_state（これまでの記録全体）から今日の学習を作る。
  // 方針はチェックが終わった時点で決めて保存してあるので、学習の途中で変わらない。
  function periodicPlan() {
    var entry = ST.compassCheck(state.sessionId) || {};
    var states = ST.get().skill_state;
    var focus = entry.focus_skill || null;
    var d = {
      planKey: entry.plan_key || C.planFromStates(states).planKey,
      skills: E.SKILL_ORDER.filter(function (k) { return states[k] && states[k].attempt_count; }).map(function (k) {
        var s = states[k];
        return { key: k, label: E.SKILLS[k].label, status: (E.STATUS_RANK[s.learning_status] || 0) >= 3 ? "ok" : "unstable", roots: s.suspected_root_causes };
      }),
      focusSkill: focus ? { key: focus, label: E.SKILLS[focus].label } : null
    };
    var plan = L.buildPlan(d, {});
    if (entry.before && entry.after) {
      plan.why = C.planWhy(C.compare(entry.before, entry.after, entry.skill_ids), { focus: focus });
    }
    // 原因さがしで「戻る場所」が今日の中心になったときは、最後にまちがえた問題へ再挑戦する
    var tb = entry.trail_best;
    if (tb && tb.return_to === focus) {
      var sq = QS[tb.symptom_question];
      if (sq && sq.type !== "steps") plan.steps[2] = L.retryStep(sq.id, "つまずいた問題に再挑戦");
      plan.why = tb.message;
    }
    return { d: d, plan: plan };
  }

  // 定着の確認の問題は、まず自力で。ヒントを使うと、定着の判定は次回にまわる（js/engine.js）
  function hintLabel(q) {
    return q && q.level === "retention" ? "ヒントを見る（定着の確認は次回に）" : "ヒントを見る";
  }

  // 問題の図と、証明の紙（行ごとに ［1］［2］… の穴）
  function qFigure(q) {
    return SC.figures.render(q.figure) + SC.figures.render(q.figure2) +
      (q.proof_sheet ? '<div class="proof-sheet" aria-label="証明"><p class="proof-intro">' + esc(q.proof_sheet[0]) + "</p><ol>" +
        q.proof_sheet.slice(1).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ol></div>" : "");
  }

  // ---------- 入力欄 ----------

  // 入力中の値の置き場所。小問つきの問題は、小問ごとに分けて持つ
  function box(stepId) {
    if (!stepId) return draft;
    draft.steps = draft.steps || {};
    return (draft.steps[stepId] = draft.steps[stepId] || {});
  }

  function inputFields(q, prefix, stepId, first) {
    if (first === undefined) first = true;
    var cur = box(stepId);
    var stepAttr = stepId ? ' data-step="' + esc(stepId) + '"' : "";
    var ph = q.placeholder || "答えを入力";
    if (q.type === "steps") {
      return '<ol class="step-list">' + q.steps.map(function (st, i) {
        return '<li><p class="step-text">' + esc(st.text) + "</p>" + inputFields(st, prefix + "-" + st.id, st.id, first && i === 0) + "</li>";
      }).join("") + "</ol>";
    }
    if (q.type === "order") {
      var picked = Array.isArray(cur.value) ? cur.value : [];
      var labelOf = function (k) { return (q.cards.filter(function (c) { return c.key === k; })[0] || {}).label || k; };
      return '<div class="order-input">' +
        '<ol class="order-picked">' + picked.map(function (k) { return "<li>" + esc(labelOf(k)) + "</li>"; }).join("") +
          (picked.length < q.cards.length ? '<li class="order-next">' + (picked.length ? "次のカードをタップ" : "1行目になるカードをタップ") + "</li>" : "") + "</ol>" +
        '<div class="choices order-cards">' + q.cards.filter(function (c) { return picked.indexOf(c.key) === -1; }).map(function (c) {
          return '<button type="button" class="choice order-card" data-action="order-pick" data-card="' + esc(c.key) + '"' + stepAttr + ">" + esc(c.label) + "</button>";
        }).join("") + "</div>" +
        '<div class="order-tools"><button type="button" class="secondary-button soft" data-action="order-undo"' + stepAttr + (picked.length ? "" : " disabled") + ">1つ戻す</button>" +
          '<button type="button" class="secondary-button soft" data-action="order-reset"' + stepAttr + (picked.length ? "" : " disabled") + ">最初から</button></div></div>";
    }
    if (q.type === "choice") {
      return '<div class="choices" role="radiogroup">' + q.choices.map(function (c) {
        var on = cur.value === c.key;
        return '<button type="button" class="choice' + (on ? " selected" : "") + '" role="radio" aria-checked="' + on + '" data-action="choose" data-choice="' + esc(c.key) + '"' + stepAttr + ">" + esc(c.label) + "</button>";
      }).join("") + "</div>";
    }
    if (q.type === "pair") {
      return '<div class="pair">' + q.fields.map(function (f, i) {
        var id = prefix + "-" + f.key;
        return '<label class="field" for="' + id + '"><span>' + esc(f.label) + '</span>' +
          '<input id="' + id + '" data-field="' + f.key + '"' + stepAttr + ' autocomplete="off" inputmode="text" value="' + esc(cur[f.key] || "") + '"' +
          (first && i === 0 ? " data-autofocus" : "") + '></label>';
      }).join("") + "</div>";
    }
    var inputId = prefix + "-v";
    // 文字式の答え（poly）は、文字・2乗の入力を補助する
    var chipKeys = q.type === "fraction" ? ["/"] : q.type === "linear" ? ["y =", "x", "−", "+", "/"]
      : q.type === "poly" ? (/[ab]/.test(q.answer) ? ["a", "b", "−", "+"] : /\^/.test(q.answer) ? ["x", "y", "^2", "^3"] : ["x", "y", "−", "+"]) : null;
    var chips = chipKeys
      ? '<div class="chips" aria-label="入力の補助">' + chipKeys.map(function (c) {
          return '<button type="button" class="chip" data-action="chip" data-target="' + inputId + '" data-chip="' + esc(c) + '">' + esc(c) + "</button>";
        }).join("") + "</div>"
      : "";
    return '<label class="field single" for="' + inputId + '"><span class="sr-only">答え</span>' +
      '<input id="' + inputId + '" data-field="value"' + stepAttr + ' autocomplete="off" inputmode="text" placeholder="' + esc(ph) + '" value="' + esc(cur.value || "") + '"' + (first ? " data-autofocus" : "") + "></label>" + chips;
  }

  function readFrom(q, cur) {
    if (q.type === "pair") {
      var v = {};
      q.fields.forEach(function (f) { v[f.key] = cur[f.key] || ""; });
      return v;
    }
    return cur.value || "";
  }

  function readInput(q) {
    if (q.type === "steps") {
      var out = {};
      q.steps.forEach(function (st) { out[st.id] = readFrom(st, box(st.id)); });
      return out;
    }
    return readFrom(q, draft);
  }

  // ---------- 学校のようす（どこまで習ったか・次のテスト） ----------

  var SCHOOL_STALE_DAYS = 7; // これ以上更新がなければ、ホームで「学校はどこまで進んだ？」と聞く
  // 「一次関数・変化の割合まで」のような1行
  function schoolText(s) {
    s = s || ST.school();
    var u = s.units[s.current_unit] || {};
    if (u.status === "not_learned") return s.current_unit + "（まだ始まっていない）";
    if (u.status === "learned") return s.current_unit + "（習い終わった）";
    return s.current_unit + (u.current_skill ? "・" + E.schoolOptionLabel(u.current_skill) : "（どこまでかは未登録）");
  }
  function testDaysText(s) {
    s = s || ST.school();
    if (!s.next_test || !s.next_test.date) return "";
    var left = SC.testprep.daysLeft(s.next_test.date, ST.now());
    return left > 0 ? "次のテストまで" + left + "日" : left === 0 ? "今日はテスト" : "";
  }
  function schoolStale(s) {
    if (!s.updated_at) return true;
    return ST.now() - Date.parse(s.updated_at) >= SCHOOL_STALE_DAYS * E.DAY;
  }
  // ホームの小さなカード。7日以上更新がないときは「学校はどこまで進んだ？」（強制はしない）
  function schoolCard() {
    var s = ST.school();
    var days = testDaysText(s);
    if (schoolStale(s) && s.snooze_date !== C.dateKey(ST.now())) {
      return '<section class="card notice-card school-card"><p class="eyebrow">SCHOOL</p><h2 class="h-sm">学校はどこまで進んだ？</h2>' +
        '<p class="small">いまの登録：' + esc(schoolText(s)) + (days ? "／" + esc(days) : "") + "</p>" +
        '<p class="small muted">学校の進み方に合わせて、まだ習っていないところは「苦手」にせず、今日の学習も学校に合わせます。</p>' +
        '<div class="actions"><button class="primary-button" type="button" data-action="to-school">更新する</button>' +
        '<button class="secondary-button" type="button" data-action="school-snooze">今日はあとで</button></div></section>';
    }
    return '<section class="card school-card compact"><div class="school-line"><span class="eyebrow">学校のようす</span>' +
      "<strong>" + esc(schoolText(s)) + "</strong>" + (days ? '<span class="small muted">' + esc(days) + "</span>" : "") +
      '<button class="text-button inline" type="button" data-action="to-school">更新する</button></div></section>';
  }

  function viewSchool() {
    var s = ST.school();
    var dr = state.schoolDraft || (state.schoolDraft = {
      unit: s.current_unit,
      skill: s.units[s.current_unit].status === "not_learned" ? "__notyet" : (s.units[s.current_unit].current_skill || ""),
      // 終わったテスト（今日より前の日）は入力に残さない。残すと「今日より後の日を選んでね」で保存できなくなる
      testDate: s.next_test && SC.testprep.daysLeft(s.next_test.date, ST.now()) >= 0 ? s.next_test.date : "",
      testUnits: s.next_test && SC.testprep.daysLeft(s.next_test.date, ST.now()) >= 0 ? s.next_test.units.slice() : [s.current_unit]
    });
    var today = SC.testprep.dateKey(ST.now());
    var options = E.schoolOptions(dr.unit).map(function (k) { return { value: k, label: E.schoolOptionLabel(k) }; })
      .concat([{ value: "__notyet", label: "この単元はまだ始まっていない" }]);
    return '<section class="card narrow"><p class="eyebrow">SCHOOL</p><h1 class="h-md">学校のようす</h1>' +
      '<p class="small muted">学校で今どこをやっているかを教えてね。まだ習っていないところは「苦手」にしないで、今日の学習を学校に合わせます。</p>' +
      '<div class="form-grid"><label class="field" for="school-unit"><span>学校で今やっている単元</span><select id="school-unit">' +
        E.SELECTABLE_UNITS.map(function (u) { return "<option" + (u === dr.unit ? " selected" : "") + ">" + esc(u) + "</option>"; }).join("") + "</select></label></div>" +
      '<fieldset class="status-group"><legend>' + esc(dr.unit) + "は、学校ではどこまで進んだ？</legend>" +
        options.map(function (o) {
          return '<label class="radio-chip"><input type="radio" name="school-skill" value="' + esc(o.value) + '"' + (dr.skill === o.value ? " checked" : "") + "><span>" + esc(o.label) + "</span></label>";
        }).join("") + "</fieldset>" +
      '<p class="small muted">' + esc(dr.unit) + "より前の単元は「習った」、後の単元は「まだ」として記録します。</p>" +
      '<fieldset class="status-group"><legend>次のテスト（なければ空のままで大丈夫）</legend>' +
        '<label class="field" for="school-test-date"><span>テストの日</span><input id="school-test-date" type="date" min="' + today + '" value="' + esc(dr.testDate || "") + '"></label>' +
        '<p class="small muted">テスト範囲</p>' +
        E.SELECTABLE_UNITS.map(function (u) {
          return '<label class="radio-chip"><input type="checkbox" name="school-test-unit" value="' + esc(u) + '"' + (dr.testUnits.indexOf(u) !== -1 ? " checked" : "") + "><span>" + esc(u) + "</span></label>";
        }).join("") + "</fieldset>" +
      (message ? '<p class="notice" role="alert">' + esc(message) + "</p>" : "") +
      '<button class="primary-button big full" type="button" data-action="save-school">この内容で保存する</button>' +
      '<button class="text-button" type="button" data-action="home">← ホームにもどる</button></section>';
  }

  // ---------- 画面 ----------

  function viewHome() {
    var sessions = ST.finishedChecks();
    var last = sessions[sessions.length - 1];
    // 記録があれば、ホームの中心は「今日の学習」。はじめての人には、まずコンパスチェック
    var hasRecords = ST.get().answer_history.length > 0;
    return (hasRecords ? todayCard(buildToday()) : "") + compassNotice() + (hasRecords ? schoolCard() : "") +
      '<section class="hero' + (hasRecords ? " hero-sub" : "") + '">' +
        '<div class="hero-copy">' +
          '<p class="eyebrow">STUDY COMPASS</p>' +
          '<h1>「わからない」を越えて、<br>自分の可能性へ。</h1>' +
          '<p class="lead">何を勉強したらいいかわからなくても大丈夫。<br>まずは短いチェックで、今の自分の現在地を見つけよう。</p>' +
          '<button class="primary-button big" type="button" data-action="to-setup">コンパスチェックをはじめる</button>' +
          '<ul class="assure"><li>約5問からスタート</li><li>分からなくても大丈夫</li><li>ログインなし</li></ul>' +
          (sessions.length ? '<p class="small muted">これまでのコンパスチェック：' + sessions.length + "回（前回 " + esc(dateLabel(last.finished_at)) + "）</p>" : "") +
        "</div>" +
        '<div class="hero-art" aria-hidden="true">' + compassArt() + "</div>" +
      "</section>" +
      '<section class="cycle">' +
        '<h2 class="section-title">Study Compass の 1 サイクル</h2>' +
        '<ol class="cycle-list">' +
          cycleItem("1", "現在地を知る", "短いチェックで、今どこまでできているかを見る") +
          cycleItem("2", "つまずきの原因を探す", "答えに合わせて、必要な確認問題だけを出す") +
          cycleItem("3", "今日やることを決める", "今日越えることを1つに絞った25分のプラン") +
          cycleItem("4", "学習して、また確かめる", "ふり返りで現在地を更新していく") +
        "</ol>" +
      "</section>" +
      '<button class="parent-link" type="button" data-action="to-guide">単元の説明を読む →</button>' +
      '<details class="card about">' +
        "<summary>このアプリについて</summary>" +
        "<ul>" +
          "<li>いまは試用版です。中学1年 数学「正負の数」「文字と式」「一次方程式」「比例と反比例」、中学2年 数学「式の計算」「連立方程式」「一次関数」「図形の角」「合同と証明」「三角形と四角形」「確率」「データの活用」を収録しています。</li>" +
          "<li>点数を出すのではなく、問題ごとに「どのスキル・どの前提知識を見たか」から、つまずきの場所を推定します。</li>" +
          "<li>診断はルール（スキルと前提知識の対応表）で行っています。外部AIへの接続は使っていません。</li>" +
          "<li>名前・学校名などの入力はありません。記録はこの端末のブラウザの中にだけ保存されます。</li>" +
        "</ul>" +
      "</details>" +
      (hasRecords ? '<button class="parent-link" type="button" data-action="to-parent">保護者の方へ：学習のようすを見る →</button>' : "") +
      '<details class="card about">' +
        "<summary>学習の記録について</summary>" +
        '<p class="small muted">回答はすべて、この端末のブラウザに記録しています。理解度は1回の結果ではなく、これまでの記録全体から計算します。</p>' +
        '<p class="small">記録した回答：' + ST.get().answer_history.length + "件 / コンパスチェック：" + sessions.length + "回</p>" +
        '<button class="secondary-button" type="button" data-action="reset-data">記録をすべて消す</button>' +
      "</details>" +
      debugPanel();
  }

  function compassInput() {
    var d = ST.get();
    return { states: d.skill_state, history: d.answer_history, sessions: d.sessions, explorations: d.explorations, now: ST.now(), snoozeDate: ST.snoozeDate(), school: ST.school() };
  }

  // 定期コンパスチェックのお知らせ。強制はしない（今チェックする / 今日はあとで）
  // 学校の単元が変わって、その単元のはじめてのチェックがまだのとき：軽い案内（強制しない。「今日はあとで」はその日だけ）
  function unitCheckNoticeInfo() {
    if (!ST.get().answer_history.length) return null; // はじめての人は、ホームの「コンパスチェックをはじめる」から
    var s = ST.school(), unit = s.current_unit, u = s.units[unit];
    if (!unit || !u || u.status === "not_learned" || ST.unitCheckDone(unit)) return null;
    return { unit: unit, snoozed: ST.unitCheckSnoozed(unit, C.dateKey(ST.now())) };
  }
  function unitCheckNotice() {
    var n = unitCheckNoticeInfo();
    if (!n || n.snoozed) return "";
    return '<section class="card notice-card">' +
      '<p class="eyebrow">NEW UNIT</p>' +
      '<h2 class="h-sm">新しい単元に進んだね。今のところを少し確認しよう。</h2>' +
      "<p>「" + esc(n.unit) + "」の、学校で習ったところだけを3〜5問。まだ習っていないところは出しません。</p>" +
      '<div class="actions">' +
        '<button class="primary-button" type="button" data-action="start-unit-check">チェックする</button>' +
        '<button class="secondary-button" type="button" data-action="snooze-unit-check">今日はあとで</button>' +
      "</div></section>";
  }

  function compassNotice() {
    // 単元のはじめてのチェックを案内している日は、定期チェックのお知らせは出さない（チェックの案内を2つ並べない）
    // 「今日はあとで」にした日は、定期チェックのお知らせも出さない（断ったすぐあとに別のチェックをすすめない）
    var un = unitCheckNoticeInfo();
    if (un) return un.snoozed ? "" : unitCheckNotice();
    var n = C.notice(compassInput());
    if (n.snoozed && n.count) {
      return '<p class="small muted snoozed-note">今日のコンパスチェックは「あとで」にしました。明日またお知らせします。' +
        '<button class="text-button inline" type="button" data-action="start-periodic">やっぱり今チェックする</button></p>';
    }
    if (!n.show) return "";
    return '<section class="card notice-card">' +
      '<p class="eyebrow">COMPASS CHECK</p>' +
      '<h2 class="h-sm">そろそろ現在地を確認しよう</h2>' +
      '<p>最近勉強したところを ' + n.count + " 問だけ確認します。</p>" +
      '<p class="small muted">所要時間：約3〜5分 ／ 確認するところ：' + esc(n.skills.join("、")) + "</p>" +
      '<div class="actions">' +
        '<button class="primary-button" type="button" data-action="start-periodic">今チェックする</button>' +
        '<button class="secondary-button" type="button" data-action="snooze">今日はあとで</button>' +
      "</div></section>";
  }

  function dateLabel(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return (d.getMonth() + 1) + "/" + d.getDate();
  }

  // ?debug=1 のときだけ出す動作確認用のパネル（ふだんの利用者には見えない）
  function debugPanel() {
    if (!DEBUG) return "";
    var off = ST.get().debug.time_offset_days || 0;
    return '<section class="card debug">' +
      "<h2 class=\"h-sm\">動作確認パネル（debug）</h2>" +
      '<p class="small muted">アプリ内の日付：' + esc(new Date(ST.now()).toLocaleString("ja-JP")) + (off ? "（" + off + "日進めています）" : "") + "</p>" +
      '<div class="actions">' +
        '<button class="secondary-button" type="button" data-action="debug-days">日付を3日進める</button>' +
        '<button class="secondary-button" type="button" data-action="debug-days-reset">日付を元に戻す</button>' +
        '<button class="secondary-button" type="button" data-action="debug-export">記録を書き出す（JSON）</button>' +
        '<button class="secondary-button" type="button" data-action="debug-day1">日付を1日進める</button>' +
        '<a class="secondary-button link-button" href="./?debug=plan">今日の学習の確認</a>' +
        '<a class="secondary-button link-button" href="./?debug=parent">保護者向けの根拠</a>' +
        '<a class="secondary-button link-button" href="./?debug=map">学習マップ</a>' +
        '<a class="secondary-button link-button" href="./?debug=school">学校のようす</a>' +
        '<a class="secondary-button link-button" href="./?debug=compass">定期チェックの確認</a>' +
        '<a class="secondary-button link-button" href="./?debug=bank">問題バンク</a>' +
        '<a class="secondary-button link-button" href="./?debug=figure">図形の図</a>' +
        '<a class="secondary-button link-button" href="./?debug=proof">証明</a>' +
        '<a class="secondary-button link-button" href="./?debug=pilot">パイロットの記録</a>' +
      "</div></section>";
  }

  function cycleItem(n, title, text) {
    return '<li><span class="cycle-num">' + n + "</span><div><strong>" + title + "</strong><p>" + text + "</p></div></li>";
  }

  function compassArt() {
    // 夜空の文字盤。北には北極星、まわりに小さな星座。
    return '<svg viewBox="0 0 240 240" class="compass-art">' +
      '<defs>' +
        '<radialGradient id="face" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="#27407f"/><stop offset="1" stop-color="#0d1838"/></radialGradient>' +
        '<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0c4"/><stop offset="1" stop-color="#ffb35c"/></linearGradient>' +
      '</defs>' +
      '<circle cx="120" cy="120" r="108" fill="url(#face)" stroke="#ffd98a" stroke-opacity=".55" stroke-width="1.5"/>' +
      '<circle cx="120" cy="120" r="84" fill="none" stroke="#c8d6ff" stroke-opacity=".25" stroke-dasharray="2 6"/>' +
      '<g stroke="#c8d6ff" stroke-opacity=".35" stroke-width="1" fill="none"><path d="M58 150 L74 166 L92 160 L100 178"/><path d="M150 70 L166 62 L180 76"/></g>' +
      '<g fill="#e8eeff"><circle cx="58" cy="150" r="1.8"/><circle cx="74" cy="166" r="1.5"/><circle cx="92" cy="160" r="1.8"/><circle cx="100" cy="178" r="1.4"/><circle cx="150" cy="70" r="1.5"/><circle cx="166" cy="62" r="1.8"/><circle cx="180" cy="76" r="1.4"/><circle cx="70" cy="80" r="1"/><circle cx="178" cy="160" r="1.2"/></g>' +
      '<path class="polaris" d="M120 6 L123 15 L132 18 L123 21 L120 30 L117 21 L108 18 L117 15 Z" fill="#fff3cf"/>' +
      '<g font-size="12" font-weight="700" fill="#a8b5da" text-anchor="middle"><text x="120" y="44">N</text><text x="120" y="210">S</text><text x="206" y="124">E</text><text x="34" y="124">W</text></g>' +
      '<path class="needle" d="M120 52 L132 120 L120 188 L108 120 Z" fill="#c8d6ff" fill-opacity=".35"/>' +
      '<path class="needle" d="M120 52 L132 120 L108 120 Z" fill="url(#gold)"/>' +
      '<circle cx="120" cy="120" r="7" fill="#0d1838" stroke="#ffd98a" stroke-width="2.5"/>' +
      "</svg>";
  }

  function viewSetup() {
    var s = state.setup;
    function sel(id, label, options) {
      return '<label class="field" for="' + id + '"><span>' + label + "</span>" +
        '<select id="' + id + '">' + options.map(function (o) {
          return "<option" + (o.disabled ? " disabled" : "") + (o.selected ? " selected" : "") + ">" + esc(o.text) + "</option>";
        }).join("") + "</select></label>";
    }
    var statuses = [["done", "習った"], ["learning", "習っている途中"], ["notyet", "まだ習っていない"]];
    return '' +
      '<section class="card narrow">' +
        '<p class="eyebrow">STEP 1 / はじめに</p>' +
        '<h1 class="h-md">今の学習のようすを教えてね</h1>' +
        '<p class="muted small">いまは「中学1年・数学」の「正負の数」「文字と式」「一次方程式」「比例と反比例」と、「中学2年・数学」の「式の計算」「連立方程式」「一次関数」「図形の角」「合同と証明」「三角形と四角形」「確率」「データの活用」が選べます。</p>' +
        '<div class="form-grid">' +
          sel("grade", "学年", [{ text: "中学1年", selected: E.grade() === "中学1年" }, { text: "中学2年", selected: E.grade() === "中学2年" }, { text: "中学3年（準備中）", disabled: true }]) +
          sel("subject", "教科", [{ text: "数学", selected: true }, { text: "英語（準備中）", disabled: true }, { text: "国語・理科・社会（準備中）", disabled: true }]) +
          sel("unit", "今勉強している単元", E.SELECTABLE_UNITS.map(function (u) { return { text: u, selected: u === s.unit }; })) +
        "</div>" +
        '<fieldset class="status-group"><legend>' + esc(s.unit) + "は…</legend>" +
          statuses.map(function (st) {
            return '<label class="radio-chip"><input type="radio" name="study-status" value="' + st[0] + '"' + (s.status === st[0] ? " checked" : "") + "><span>" + st[1] + "</span></label>";
          }).join("") +
        "</fieldset>" +
        // 習っている途中なら「どこまで進んだ？」（まだ習っていないところはチェックに出さない・苦手にしない）
        (s.status === "learning"
          ? '<fieldset class="status-group"><legend>学校ではどこまで進んだ？</legend>' +
              E.schoolOptions(s.unit).map(function (k) { return { value: k, label: E.schoolOptionLabel(k) }; }).concat([{ value: "", label: "どこまでかわからない" }]).map(function (o) {
                return '<label class="radio-chip"><input type="radio" name="study-skill" value="' + esc(o.value) + '"' + ((s.skill || "") === o.value ? " checked" : "") + "><span>" + esc(o.label) + "</span></label>";
              }).join("") + "</fieldset>"
          : "") +
        (s.status === "notyet" && s.unit !== "一次関数"
          ? '<p class="muted small">まだ習っていない単元はチェックしません。学校で習い始めたら、ここからチェックしよう。</p>' +
            '<button class="primary-button big full" type="button" data-action="start-check">ホームへ進む</button>'
          : '<button class="primary-button big full" type="button" data-action="start-check">現在地をチェックする</button>') +
      "</section>";
  }

  // チェックの進み具合：基本チェック（最初に決まった問題）と追加確認（原因さがし・形を変えた問題）を分けて数える
  function isExtraAt(i) {
    var qid = state.queue[i];
    return !!(state.probes && state.probes[qid]) || (state.mode !== "periodic" && i >= state.basicCount);
  }
  function checkProgress() {
    var out = { extra: isExtraAt(state.idx), baseNum: 0, baseTotal: 0, extraNum: 0, extraMax: state.extraMax || 0, afterExtra: state.idx > 0 && isExtraAt(state.idx - 1) };
    state.queue.forEach(function (qid, i) {
      if (isExtraAt(i)) { if (i <= state.idx) out.extraNum++; }
      else { out.baseTotal++; if (i <= state.idx) out.baseNum++; }
    });
    // 最大数は、追加できる上限（原因さがしの上限＋最初のチェックの形を変えた問題・原因確認）。実際に出た数より小さくはしない
    out.extraMax = Math.max(out.extraMax, state.queue.filter(function (_, i) { return isExtraAt(i); }).length);
    return out;
  }

  function viewCheck() {
    var id = state.queue[state.idx];
    var q = QS[id];
    var periodic = state.mode === "periodic";
    var probeInfo = state.probes && state.probes[id];
    // 問題番号：最初に決まった「基本チェック」の数は固定（追加しても分母を増やさない）。
    // 原因さがしなどで足した問題は「追加確認 k / 最大N」として別に数える（子どもに「終わらない」と感じさせない）
    var pg = checkProgress();
    var isBasic = !pg.extra;
    var num = pg.extra ? pg.extraNum : pg.baseNum, total = pg.extra ? pg.extraMax : pg.baseTotal;
    var pct = Math.round((num - 1) / Math.max(total, 1) * 100);
    var phaseLabel = pg.extra ? "もう少しだけ確認しよう"
      : periodic ? (state.periodic && state.periodic.kind === "unit_check" ? "コンパスチェック（" + (state.setup.unit || "") + "）"
        : state.periodic && state.periodic.kind === "range_check" ? "テスト範囲チェック" : "定期コンパスチェック") : "コンパスチェック";
    var stepNote = pg.extra && pg.extraNum === 1 ? '<p class="small muted progress-note">答えをたしかめるために、少しだけ問題を足します（最大' + pg.extraMax + "問）。</p>"
      : !pg.extra && pg.afterExtra ? '<p class="small muted progress-note">基本チェックにもどります（あと' + (pg.baseTotal - pg.baseNum + 1) + "問）。</p>" : "";
    return '' +
      '<section class="card narrow question-card">' +
        '<div class="progress-head"><span class="eyebrow">' + phaseLabel + '</span><span class="q-count">' + (pg.extra ? "追加確認 " + num + " / 最大" + total : "基本チェック " + num + " / " + total) + "</span></div>" +
        '<div class="progress' + (pg.extra ? " extra" : "") + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + (num - 1) + '"><i style="width:' + pct + '%"></i></div>' +
        stepNote +
        '<p class="skill-tag">確認するスキル：' + esc(q.skillLabel) + "</p>" +
        (probeInfo && !probeInfo.probe.seed ? '<p class="purpose probe-purpose">' + esc(probeInfo.probe.purpose) + "</p>"
          : q.purpose && !isBasic ? '<p class="purpose">' + esc(q.purpose) + "</p>" : "") +
        '<h1 class="question">' + esc(q.text) + "</h1>" +
        qFigure(q) +
        '<form class="answer-form" data-form="check" novalidate>' +
          inputFields(q, "q") +
          (message ? '<p class="notice" role="alert">' + esc(message) + "</p>" : "") +
          (state.hintOpen ? '<div class="hint"><strong>ヒント</strong><p>' + esc(q.hint) + "</p></div>" : "") +
          '<div class="actions">' +
            '<button class="primary-button" type="submit">答える</button>' +
            (state.hintOpen ? "" : '<button class="secondary-button" type="button" data-action="hint">' + hintLabel(q) + "</button>") +
            '<button class="secondary-button soft" type="button" data-action="unknown">わからない</button>' +
          "</div>" +
        "</form>" +
        '<p class="small muted center">「わからない」も大事な記録です。遠慮なく押してOK。</p>' +
      "</section>";
  }

  function viewBridge() {
    var list = state.followUps;
    var causes = list.filter(function (f) { return QS[f.id].phase === "cause"; });
    var stds = list.filter(function (f) { return QS[f.id].phase === "standard"; });
    var intro = causes.length
      ? "答えをもとに、つまずきの原因を探す問題を " + causes.length + " 問えらびました。" + (stds.length ? "できていたところは、形を変えた問題でもう少しだけ確かめます。" : "")
      : "基礎はしっかりできていました。形を変えた問題で、もう少しだけ確かめます。";
    return '' +
      '<section class="card narrow">' +
        '<p class="eyebrow">コンパスチェック 5 / 5 おつかれさま！</p>' +
        '<h1 class="h-md">もう少しだけ、確かめさせてね</h1>' +
        '<p class="lead-sm">' + esc(intro) + "</p>" +
        '<p class="small muted">全員に同じ問題を出すのではなく、あなたの答えに合わせて選んでいます。答えによっては、さらに前の内容を1〜2問確かめることがあります。</p>' +
        '<ol class="followups">' + list.map(function (f) {
          var q = QS[f.id];
          return '<li><span class="badge ' + (q.phase === "cause" ? "b-cause" : "b-std") + '">' + (q.phase === "cause" ? "原因確認" : "標準") + "</span>" +
            "<div><strong>" + esc(q.skillLabel) + "</strong><p>" + esc(f.reason) + "</p></div></li>";
        }).join("") + "</ol>" +
        '<button class="primary-button big full" type="button" data-action="continue-check">追加の確認へ（' + list.length + " 問）</button>" +
      "</section>";
  }

  function routeMap(d) {
    var focusKey = d.focusSkill ? d.focusSkill.key : null;
    var icon = { ok: "✓", unstable: "△", checking: "…" };
    var onRoute = d.skills.some(function (k) { return k.key === focusKey; });
    // 原因さがしで、ルートより前の土台（正負の数など）に戻ることになったときは、その土台をルートの先頭に出す
    var base = focusKey && !onRoute
      ? '<li class="node s-unstable here"><span class="dot" aria-hidden="true">△</span><span class="node-label">' + esc(d.focusSkill.label) +
        "<small>土台・ここから</small></span><span class=\"flag\">今日越える</span></li>"
      : "";
    return '<ol class="route" aria-label="一次関数のルートと現在地">' + base + d.skills.map(function (k) {
      var here = k.key === focusKey;
      return '<li class="node s-' + k.status + (here ? " here" : "") + '">' +
        '<span class="dot" aria-hidden="true">' + icon[k.status] + "</span>" +
        '<span class="node-label">' + esc(k.label) + '<small>' + esc(k.statusLabel) + "</small></span>" +
        (here ? '<span class="flag">今日越える</span>' : "") +
      "</li>";
    }).join("") +
      (focusKey ? "" : '<li class="node s-next here"><span class="dot" aria-hidden="true">★</span><span class="node-label">次の山<small>' + (d.planKey === "challenge" ? "応用" : "標準") + '</small></span><span class="flag">今日越える</span></li>') +
    "</ol>";
  }

  function viewResult() {
    // 原因さがしの道すじを結論まで進めてから、診断と今日の学習を作る
    state.trails.forEach(function (t) { if (t.status === "open") R.conclude(t); });
    var r = diagnosisAndPlan(), d = r.d, plan = r.plan;
    ensureSessionFinished(d, plan);
    var okList = d.skills.filter(function (k) { return k.status === "ok"; });
    var unstable = d.skills.filter(function (k) { return k.status === "unstable"; });
    var checking = d.skills.filter(function (k) { return k.status === "checking"; });
    var notYet = state.setup.status === "notyet";

    function item(k, mark) {
      var extra = k.withHint ? "（ヒントありでできた）" : "";
      return '<li><span class="mark">' + mark + "</span><div><strong>" + esc(k.label) + extra + "</strong><p>" + esc(k.note) + "</p>" +
        (k.roots.length ? '<p class="root">確認したいところ：' + esc(k.roots.join("、")) + "</p>" : "") + "</div></li>";
    }

    return '' +
      '<section class="result-head">' +
        '<p class="eyebrow">RESULT</p>' +
        '<h1 class="h-md">あなたの現在地</h1>' +
        '<p class="muted small">点数ではなく、スキルごとに「どこまで来ているか」を表しています。</p>' +
      "</section>" +
      '<section class="card"><h2 class="card-label">今回のチェック</h2>' + routeMap(d) + "</section>" +
      trailsCard(state.trails) +
      historyCard(state.trails, Object.keys(state.answers).map(function (id) { return QS[id] && QS[id].skill; }).filter(Boolean)) +
      '<div class="result-grid">' +
        '<section class="card list-card ok-card"><h2>できているところ</h2>' +
          (okList.length || d.foundOk.length
            ? '<ul class="status-list">' + okList.map(function (k) { return item(k, "✓"); }).join("") +
              (d.foundOk.length ? '<li><span class="mark">✓</span><div><strong>' + esc(d.foundOk.join("・")) + "</strong><p>追加の確認でできていました</p></div></li>" : "") + "</ul>"
            : '<p class="muted small">今回はまだ見つかりませんでした。ここから一緒に見つけていこう。</p>') +
        "</section>" +
        '<section class="card list-card warn-card"><h2>もう少し確認したいところ</h2>' +
          (unstable.length ? '<ul class="status-list">' + unstable.map(function (k) { return item(k, "△"); }).join("") + "</ul>" : '<p class="muted small">大きなつまずきは見つかりませんでした。</p>') +
          (checking.length ? '<h3>確認中</h3><ul class="status-list">' + checking.map(function (k) { return item(k, "…"); }).join("") + "</ul>" : "") +
        "</section>" +
      "</div>" +
      '<section class="card cross-card">' +
        '<p class="eyebrow light">今、越えたいところ</p>' +
        '<h2 class="cross-title">「' + esc(plan.cross) + "」</h2>" +
        '<p class="beyond">その先に → ' + esc(plan.beyond) + "</p>" +
      "</section>" +
      '<section class="card discovery">' +
        '<h2><span class="spark" aria-hidden="true">✦</span> Study Compass の発見</h2>' +
        "<p>" + nl(d.discovery) + "</p>" +
        (notYet ? '<p class="small muted">「まだ習っていない」と答えてくれたので、今はできなくて当たり前の部分もあります。</p>' : "") +
      "</section>" +
      detailsBlock(d) +
      '<div class="sticky-cta"><button class="primary-button big full" type="button" data-action="to-plan">今日の学習を作る</button></div>';
  }

  function detailsBlock(d) {
    var statusText = { correct: "できた", incorrect: "もう少し", unknown: "わからないを選んだ" };
    var rows = Object.keys(state.answers).map(function (id) {
      var a = state.answers[id], q = QS[id];
      if (!q) return "";
      return "<tr><td>" + id + "</td><td>" + esc(q.skillLabel) + "</td><td>" + statusText[a.status] + (a.hintUsed ? "・ヒント使用" : "") + "</td></tr>";
    }).join("");
    var lv = { pass: "○", needs_review: "△", not_checked: "−" };
    var states = ST.get().skill_state;
    var srows = E.SKILL_ORDER.filter(function (k) { return states[k] && states[k].attempt_count; }).map(function (k) {
      var s = states[k];
      return "<tr><td>" + esc(s.skill) + "</td><td>" + lv[s.basic] + "</td><td>" + lv[s.standard] + "</td><td>" + lv[s.application] + "</td><td>" + lv[s.retention] + "</td>" +
        '<td><span class="meter"><i style="width:' + Math.round(s.confidence * 100) + '%"></i></span> ' + s.confidence.toFixed(2) + "</td>" +
        "<td>" + s.correct_count + "/" + s.attempt_count + "</td></tr>";
    }).join("");
    return '' +
      '<details class="card details">' +
        "<summary>くわしい記録を見る（どう判断したか）</summary>" +
        '<p class="small muted">Study Compass は正解数ではなく、各問題が見ているスキル・前提知識・ヒントの有無・追加確認の結果を組み合わせて判断しています。</p>' +
        '<div class="table-wrap"><table><thead><tr><th>問題</th><th>見たスキル</th><th>結果</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
        '<h3>理解のレベル（これまでの記録全体から）</h3>' +
        '<div class="table-wrap"><table><thead><tr><th>スキル</th><th>基礎</th><th>標準</th><th>応用</th><th>定着</th><th>たしかさ</th><th>正解/回答</th></tr></thead><tbody>' + srows + "</tbody></table></div>" +
        '<p class="small muted">「たしかさ」は、どのレベルまでできたかと最近の結果から計算します。1回のチェックでは最大にせず、1回の不正解で大きく下げることもしません。' +
        "最初にできた日から" + E.CONFIG.retentionDays + "日以上たってもう一度できたら「定着」に進みます。</p>" +
      "</details>";
  }

  // いまの単元（一次関数）とちがう単元のスキルには、小さく「中1・一次方程式」などと付ける
  function unitTag(k) {
    var sk = E.SKILLS[k];
    if (!sk || sk.unit === ST.schoolProgressInfo().current_unit) return "";
    return '<span class="unit-tag">' + esc(sk.grade + (sk.unit === "既習" ? "" : "・" + sk.unit)) + "</span>";
  }

  // これまでの記録（answer_history 全体）から見た現在地。前回のチェックからの変化も出す
  // trails：今回の原因さがし。今回確かめたスキル・道すじのスキルだけを開いて見せ、ほかは「ほかのスキル」にたたむ（長い一覧にしない）。
  // 今回の原因さがしで「戻って練習するところ」になったスキルは、記録全体の段階が高くても、今回はここから練習することを書きそえる
  function historyCard(trails, checked) {
    var states = ST.get().skill_state;
    var prev = ST.previousSnapshot(state.sessionId);
    var sessions = ST.finishedChecks().length;
    var focus = {}, back = {};
    (checked || []).forEach(function (k) { focus[k] = true; });
    (trails || []).forEach(function (t) {
      (t.path || []).forEach(function (p) { if (p.skill) focus[p.skill] = true; });
      var c = t.conclusion;
      if (c && c.return_to && c.kind !== "not_reproduced" && c.kind !== "value_slip") { focus[c.return_to] = true; back[c.return_to] = true; }
    });
    var shown = E.SKILL_ORDER.filter(function (k) {
      var s = states[k];
      return s && (s.attempt_count || s.learning_status === "not_learned");
    });
    var rows = shown.map(function (k) {
      var s = states[k], v = E.STATUS_VIEW[s.learning_status];
      var delta = "";
      if (prev && prev[k] && s.attempt_count) {
        var diff = s.confidence - prev[k].confidence;
        delta = diff > 0.005 ? '<span class="delta up">前回より ↑</span>'
          : diff < -0.005 ? '<span class="delta down">前回より少し ↓</span>'
          : '<span class="delta">前回と同じ</span>';
      } else if (s.attempt_count) {
        delta = '<span class="delta">はじめての記録</span>';
      }
      var levels = [["basic", "基礎"], ["standard", "標準"], ["application", "応用"], ["retention", "定着"]].map(function (l) {
        return '<span class="lv lv-' + s[l[0]] + '">' + l[1] + "</span>";
      }).join("");
      return '<li class="hs tone-' + v.tone + '">' +
        '<span class="hs-mark" aria-hidden="true">' + v.mark + "</span>" +
        '<div class="hs-body">' +
          '<div class="hs-top"><strong>' + esc(s.skill) + "</strong>" + unitTag(k) + '<span class="hs-status">' + v.label + "</span>" + delta + "</div>" +
          (s.attempt_count ? '<div class="hs-meter"><span class="meter wide"><i style="width:' + Math.round(s.confidence * 100) + '%"></i></span></div>' +
            '<div class="hs-levels">' + levels + "</div>" : "") +
          (back[k] ? '<p class="root">今回の確認でまちがえたので、ここから練習します' + (E.STATUS_RANK[s.learning_status] >= E.STATUS_RANK.understood ? "（これまでの記録では「" + esc(v.label) + "」）" : "") + "</p>" : "") +
          (s.suspected_root_causes.length ? '<p class="root">確認したいところ：' + esc(s.suspected_root_causes.join("、")) + "（可能性）</p>" : "") +
        "</div></li>";
    });
    var hasFocus = Object.keys(focus).length > 0;
    var main = hasFocus ? rows.filter(function (_, i) { return focus[shown[i]]; }) : rows;
    var rest = hasFocus ? rows.filter(function (_, i) { return !focus[shown[i]]; }) : [];
    return '<section class="card history-card">' +
      '<h2 class="card-label">これまでの記録から見た現在地</h2>' +
      '<p class="small muted">コンパスチェック ' + sessions + " 回分の記録から計算しています。1回の結果だけで決めつけず、記録が増えるほど正確になります。" +
        (hasFocus ? "ここでは、今回確かめたスキルだけを出しています。" : "") + "</p>" +
      '<ul class="hs-list">' + main.join("") + "</ul>" +
      (rest.length ? '<details class="hs-more"><summary>ほかのスキル（' + rest.length + "）</summary>" + '<ul class="hs-list">' + rest.join("") + "</ul></details>" : "") +
    "</section>";
  }

  // チェックが終わった時点で一度だけ、セッションを締めて確かさの控えを残す
  function ensureSessionFinished(d, plan) {
    if (!state.sessionId) return;
    var s = ST.session(state.sessionId);
    if (!s || s.finished_at) return;
    saveTrails();
    var best = R.deepestReturn(state.trails);
    ST.finishSession(state.sessionId, {
      plan_key: plan.key,
      focus_skill: d.focusSkill ? d.focusSkill.key : null,
      suspected_root_causes: best ? [E.SKILLS[best.conclusion.return_to].label] : d.focusSkill ? d.focusSkill.roots : []
    });
  }

  function viewPlan() {
    var plan = diagnosisAndPlan().plan;
    var total = plan.steps.reduce(function (s, st) { return s + st.min; }, 0);
    return '' +
      '<section class="card narrow plan">' +
        '<p class="eyebrow">TODAY</p>' +
        '<h1 class="h-md">今日の' + total + "分</h1>" +
        '<div class="today-cross"><span>今日越えること</span><strong>「' + esc(plan.cross) + "」</strong></div>" +
        '<ol class="timeline">' + plan.steps.map(function (st, i) {
          return '<li><span class="min">' + st.min + "分</span><div><strong>" + (i + 1) + ". " + esc(st.title) + "</strong></div></li>";
        }).join("") + "</ol>" +
        '<div class="why"><h2>なぜ今日はこれ？</h2><p>' + esc(plan.why) + "</p></div>" +
        '<button class="primary-button big full" type="button" data-action="start-lesson">学習をはじめる</button>' +
        '<button class="text-button" type="button" data-action="to-result">← 現在地にもどる</button>' +
      "</section>";
  }

  function viewLesson() {
    var plan = diagnosisAndPlan().plan;
    var i = Math.min(state.lesson.step, plan.steps.length - 1);
    var st = plan.steps[i], p = st.practice;
    var res = state.lesson.results[i]; // "correct" | "revealed" | "tried"
    var done = res === "correct" || res === "revealed";
    var last = i === plan.steps.length - 1;
    return '' +
      '<section class="card narrow lesson">' +
        '<div class="progress-head"><span class="eyebrow">今日越えること：' + esc(plan.cross) + '</span><span class="q-count">STEP ' + (i + 1) + " / " + plan.steps.length + "</span></div>" +
        '<ol class="steps-dots">' + plan.steps.map(function (_, k) {
          var r = state.lesson.results[k];
          var cls = k === i ? "now" : (r === "correct" || r === "revealed") ? "done" : "";
          return '<li class="' + cls + '"></li>';
        }).join("") + "</ol>" +
        '<h1 class="h-md">' + esc(st.title) + '<span class="min-tag">' + st.min + "分</span></h1>" +
        st.body.map(function (b) { return '<p class="lead-sm">' + esc(b) + "</p>"; }).join("") +
        (st.example ? '<div class="example"><span>例</span><p>' + esc(st.example) + "</p></div>" : "") +
        '<div class="practice">' +
          '<p class="practice-label">やってみよう</p>' +
          '<p class="question small-q">' + esc(p.text) + "</p>" + SC.figures.render(p.figure) + SC.figures.render(p.figure2) +
          (done
            ? feedbackBlock(res, p)
            : '<form class="answer-form" data-form="lesson" novalidate>' + inputFields(p, "l") +
                (message ? '<p class="notice" role="alert">' + esc(message) + "</p>" : "") +
                (res === "tried" ? '<div class="soft-feedback"><strong>おしい！ここはもう少し確認してみよう。</strong><p>ヒント：' + esc(p.hint) + "</p></div>" : "") +
                '<div class="actions"><button class="primary-button" type="submit">答える</button>' +
                (res === "tried" ? '<button class="secondary-button" type="button" data-action="reveal">答えと考え方を見る</button>' : '<button class="secondary-button" type="button" data-action="lesson-hint">ヒントを見る</button>') +
                "</div>" +
                (state.hintOpen && res !== "tried" ? '<div class="hint"><strong>ヒント</strong><p>' + esc(p.hint) + "</p></div>" : "") +
              "</form>") +
        "</div>" +
        (done ? '<button class="primary-button big full" type="button" data-action="' + (last ? "to-reflect" : "next-step") + '">' + (last ? "今日の学習を終える" : "次のステップへ") + "</button>" : "") +
      "</section>";
  }

  function feedbackBlock(res, p) {
    if (res === "correct") {
      return '<div class="success"><span class="burst" aria-hidden="true">★</span><div><strong>ひとつ越えました！</strong><p>' + esc(p.explain) + "</p></div></div>";
    }
    return '<div class="soft-feedback"><strong>考え方をいっしょに確認しよう</strong><p>' + esc(p.explain) + '</p><p class="small muted">答えを見て理解するのも、立派な一歩です。</p></div>';
  }

  function viewReflect() {
    var plan = diagnosisAndPlan().plan;
    var results = state.mode === "daily" ? state.daily.results : state.lesson.results;
    var solved = Object.keys(results).filter(function (k) { return results[k] === "correct"; }).length;
    if (!state.feeling) {
      return '' +
        '<section class="card narrow center">' +
          '<p class="eyebrow">ふり返り</p>' +
          '<h1 class="h-md">今日どうだった？</h1>' +
          '<p class="muted">自分で解けたステップ：' + solved + " / " + plan.steps.length + "</p>" +
          '<div class="feelings">' +
            feelingButton("good", "😊", "できた") +
            feelingButton("soso", "🤔", "もう少し") +
            feelingButton("hard", "😣", "わからなかった") +
          "</div>" +
        "</section>";
    }
    var focus = diagnosisAndPlan().d.focusSkill;
    var nextText = {
      good: "次回は、今日の内容が身についているかを短く確認して、「" + esc(plan.beyond) + "」に進みます。",
      soso: "次回は、今日のところをもう一度だけ確認してから先に進みます。",
      hard: "次回は、もう一段やさしいところから一緒に確かめます。わからなかったと言えたことが、次の一歩になります。"
    }[state.feeling];
    var sessions = ST.finishedChecks().length;
    var fs = focus && ST.get().skill_state[focus.key];
    var fsView = fs && E.STATUS_VIEW[fs.learning_status];
    return '' +
      '<section class="card narrow center">' +
        '<div class="saved-icon" aria-hidden="true">✓</div>' +
        '<h1 class="h-md">今日の結果を記録しました。</h1>' +
        '<p class="lead-sm">一度の結果だけで判断せず、これからの学習結果も合わせて<br class="pc">あなたの現在地を更新していきます。</p>' +
      "</section>" +
      '<section class="card narrow">' +
        '<h2 class="h-sm">現在地の更新</h2>' +
        '<ul class="update-list">' +
          '<li><span>今日越えること</span><strong>' + esc(plan.cross) + "</strong></li>" +
          (fsView ? '<li><span>' + esc(focus.label) + "</span><strong>" + fsView.mark + " " + fsView.label + "（今日は " + solved + "/" + plan.steps.length + " ステップ自力で正解）</strong></li>" : "") +
          '<li><span>次のコンパスチェック</span><strong>今日の内容が身についたかを、もう一度確かめます。' + E.CONFIG.retentionDays + "日以上あけてできたら「定着」に進みます</strong></li>" +
          '<li><span>これまでのコンパスチェック</span><strong>' + sessions + " 回（この端末に記録）</strong></li>" +
        "</ul>" +
        '<p class="next-text">' + nextText + "</p>" +
        '<div class="actions stack">' +
          '<button class="primary-button" type="button" data-action="restart-now">もう一度コンパスチェックする</button>' +
          '<button class="secondary-button" type="button" data-action="to-result">現在地を見る</button>' +
        "</div>" +
      "</section>";
  }

  function feelingButton(key, emoji, label) {
    return '<button class="feeling" type="button" data-action="feeling" data-feeling="' + key + '"><span class="emoji" aria-hidden="true">' + emoji + "</span>" + label + "</button>";
  }

  // ---------- 定期コンパスチェックの結果 ----------

  function viewCheckResult() {
    var entry = ST.compassCheck(state.sessionId);
    if (!entry) { state.screen = "home"; return viewHome(); }
    var res = C.compare(entry.before, entry.after, entry.skill_ids);
    var V = E.STATUS_VIEW;
    var TAG = { up: '<span class="delta up">前回より ↑</span>', down: '<span class="delta down">今回は少し ↓</span>',
      same_good: '<span class="delta">安定</span>', same_weak: '<span class="delta">もう少し</span>', first: '<span class="delta">はじめて</span>' };
    var items = res.items.map(function (i) {
      var b = V[i.before.learning_status], a = V[i.after.learning_status];
      return '<li class="cr-item change-' + i.change + '">' +
        '<strong class="cr-label">' + esc(i.label) + "</strong>" +
        '<span class="cr-move"><span class="cr-mark">' + b.mark + '</span><span class="cr-arrow">→</span><span class="cr-mark now">' + a.mark + "</span></span>" +
        '<span class="cr-status small muted">' + esc(b.label) + " → " + esc(a.label) + "</span>" + TAG[i.change] +
      "</li>";
    }).join("");
    var crossed = res.crossed.length
      ? '<div class="success"><span class="burst" aria-hidden="true">★</span><div><strong>ひとつ越えました！</strong><p>' +
        esc(res.crossed.map(function (i) { return i.label; }).join("・")) + " が、次の段階に進みました。</p></div></div>"
      : "";
    return '' +
      '<section class="result-head"><p class="eyebrow">COMPASS CHECK</p><h1 class="h-md">チェックの結果</h1>' +
        '<p class="muted small">' + (entry.extra_count == null ? entry.questions.length + " 問" : "基本チェック " + (entry.questions.length - entry.extra_count) + " 問" + (entry.extra_count ? "（＋追加確認 " + entry.extra_count + " 問）" : "")) + "で、" + esc(entry.skills.join("・")) + " を確かめました。点数ではなく、前回からの変化を見ています。</p></section>" +
      crossed +
      '<section class="card"><ul class="cr-list">' + items + "</ul></section>" +
      trailsCard(ST.explorationsFor(state.sessionId)) +
      '<section class="card discovery"><h2><span class="spark" aria-hidden="true">✦</span> 今回わかったこと</h2>' +
        "<p>" + nl(entry.comment) + "</p>" +
        (nextStepLine() ? '<h2 class="next-head">これからやること</h2><p>' + esc(nextStepLine()) + "</p>" : "") +
        '<p class="small muted">1回の結果だけで決めつけず、これからの記録もあわせて現在地を更新していきます。</p></section>' +
      historyCard(ST.explorationsFor(state.sessionId), entry.skill_ids || []) +
      '<div class="sticky-cta"><button class="primary-button big full" type="button" data-action="to-plan">今日の学習を作る</button></div>';
  }

  // 結果画面の「これからやること」：今日の学習（同じプラン）から1行で
  function nextStepLine() {
    var p;
    try { p = buildToday(); } catch (e) { return ""; }
    if (!p || !p.sessions || !p.sessions.length) return "";
    var d = function (x) { return x.display || x.type; };
    var back = p.sessions.filter(function (x) { return x.type === "practice" && d(x) === "practice"; })[0];
    var school = p.sessions.filter(function (x) { return d(x) === "current_unit" || x.type === "test"; })[0];
    var reason = p.sessions.filter(function (x) { return x.kind === "reason_review" || (x.purposes || []).indexOf("reason_review") !== -1; })[0];
    var line = back && school ? "まず「" + back.skill_label + "」を" + back.minutes + "分確認してから、学校で習っている「" + school.skill_label + "」に戻ります。"
      : back ? "まず「" + back.skill_label + "」を" + back.minutes + "分確認します。"
      : school ? "学校で習っている「" + school.skill_label + "」を進めます。" : "";
    if (reason) line += "「" + reason.skill_label + "」は、どうしてそう言えるか（根拠）も短く確認します。";
    return line;
  }

  // ---------- 定期コンパスチェックの確認ページ（?debug=compass） ----------

  function viewCompassDebug() {
    var input = compassInput();
    var chk = C.buildCheck({ states: input.states, history: input.history, sessions: input.sessions, explorations: input.explorations, now: input.now, rng: SC.bank.seeded(1) });
    var n = C.notice(input);
    var cfg = C.CONFIG;
    var L2 = { basic: "基礎", standard: "標準", application: "応用", retention: "定着" };
    function row(c) {
      var s = input.states[c.skill];
      return "<tr><td>" + esc(c.label) + "</td><td>" + esc(E.STATUS_VIEW[c.status].label) + "</td><td>" + (s ? s.confidence.toFixed(2) : "−") + "</td>" +
        "<td>" + (c.due && c.due.daysSince !== null ? c.due.daysSince + "日" : "−") + (c.due && c.due.byDays ? " ✓" : "") + "</td>" +
        "<td>" + (c.due ? c.due.lessonSince + "問" : "−") + (c.due && c.due.byAttempts ? " ✓" : "") + "</td>" +
        "<td>" + (c.reasons.length ? c.reasons.map(function (r) { return "P" + r.p + " " + esc(r.text); }).join("<br>") : esc(c.why_not || "優先理由なし")) + "</td>" +
        "<td>" + (c.level ? L2[c.level] + (c.retentionPurpose ? "（定着目的）" : "") : "−") + "</td></tr>";
    }
    var head = "<thead><tr><th>スキル</th><th>状態</th><th>確かさ</th><th>最後のチェックから</th><th>チェック後の練習</th><th>理由</th><th>出題レベル</th></tr></thead>";
    var chosen = chk.chosen.map(function (c) {
      var mark = c.reused ? ' <span class="lv lv-needs_review">問題不足のため再利用</span>' : c.relax_stage > 0 ? ' <span class="lv lv-needs_review">除外条件を緩和</span>' : "";
      return "<tr><td>" + esc(c.question_id) + mark + "</td><td>" + esc(c.label) + "</td><td>" + L2[c.level] + "</td><td>" + esc(c.reason) + "</td><td>" + esc(QS[c.question_id].text) + "</td></tr>";
    }).join("");
    var shortageRows = chk.shortage.map(function (s) {
      var what = s.result === "reused" ? "再利用：" + esc(s.question_id) : s.result === "relaxed" ? "緩和して出題：" + esc(s.question_id) : "出題できず";
      return "<tr><td>" + esc(s.label) + "</td><td>" + L2[s.level] + "</td><td>" + what + "</td><td>" + esc(s.note) + "</td></tr>";
    }).join("");
    var hist = ST.compassHistory().slice(-5).reverse().map(function (h) {
      return '<div class="card bank-item"><p class="small"><strong>' + esc(new Date(h.date).toLocaleString("ja-JP")) + "</strong>　問題：" + esc(h.questions.join(", ")) + "</p>" +
        '<div class="table-wrap"><table><thead><tr><th>スキル</th><th>前</th><th>後</th><th>確かさ</th></tr></thead><tbody>' +
        h.skill_ids.map(function (k) {
          var b = h.before[k], a = h.after[k];
          return "<tr><td>" + esc(E.SKILLS[k].label) + "</td><td>" + esc(E.STATUS_VIEW[b.learning_status].label) + "</td><td>" + esc(E.STATUS_VIEW[a.learning_status].label) + "</td><td>" + b.confidence.toFixed(2) + " → " + a.confidence.toFixed(2) + "</td></tr>";
        }).join("") + "</tbody></table></div>" +
        (h.skipped && h.skipped.length
          ? '<p class="small"><strong>追加問題の省略：</strong></p><ul class="small muted debug-log">' + h.skipped.map(function (s) {
              return "<li>" + esc(s.question_id) + "：" + (s.skipped ? "省略" : "出題") + "（" + esc(s.reason) + "）</li>";
            }).join("") + "</ul>"
          : "") +
        '<p class="small muted">今日の学習：' + esc(h.plan_key) + (h.focus_skill ? "（中心：" + esc(E.SKILLS[h.focus_skill].label) + "）" : "") + "</p></div>";
    }).join("");
    return '<section class="card"><p class="eyebrow">DEBUG / COMPASS</p><h1 class="h-md">定期コンパスチェックの確認</h1>' +
      '<p class="small muted">アプリ内の日付：' + esc(new Date(input.now).toLocaleString("ja-JP")) + "（" + (ST.get().debug.time_offset_days || 0) + "日進めています）" +
        "／ホームのお知らせ：" + (n.show ? "表示する" : n.snoozed ? "今日はあとで" : "表示しない") + "</p>" +
      '<p class="small muted">設定：' + cfg.COMPASS_CHECK_DAYS + "日経過 または 練習" + cfg.COMPASS_CHECK_MIN_ATTEMPTS + "問で候補／1回 " + cfg.MIN_QUESTIONS + "〜" + cfg.MAX_QUESTIONS + "問・1スキル" + cfg.MAX_PER_SKILL +
        "問まで／直近" + cfg.RECENT_EXCLUDE_CHECKS + "回・" + cfg.RECENT_EXCLUDE_DAYS + "日以内の問題は除外／確かさ " + cfg.LOW_CONFIDENCE + " 未満を優先</p>" +
      '<div class="actions"><button class="secondary-button" type="button" data-action="debug-days">日付を3日進める</button>' +
        '<button class="secondary-button" type="button" data-action="debug-days-reset">日付を元に戻す</button>' +
        '<a class="secondary-button link-button" href="./?debug=1">アプリへ</a></div></section>' +
      '<section class="card"><h2 class="h-sm">チェック対象のスキル（優先度順）</h2><div class="table-wrap"><table>' + head + "<tbody>" +
        (chk.candidates.map(row).join("") || '<tr><td colspan="7">いまは対象なし</td></tr>') + "</tbody></table></div>" +
        (chk.maintenance.length ? '<h3 class="h-sm">条件は満たすが優先理由なし（問題数が足りないときだけ使う）</h3><div class="table-wrap"><table>' + head + "<tbody>" + chk.maintenance.map(row).join("") + "</tbody></table></div>" : "") +
        '<h3 class="h-sm">対象外</h3><div class="table-wrap"><table>' + head + "<tbody>" + chk.notDue.map(row).join("") + "</tbody></table></div></section>" +
      '<section class="card"><h2 class="h-sm">出題する問題（例：乱数の種 1 で選んだ場合）</h2><div class="table-wrap"><table><thead><tr><th>問題ID</th><th>スキル</th><th>レベル</th><th>選んだ理由</th><th>問題文</th></tr></thead><tbody>' +
        (chosen || '<tr><td colspan="5">なし</td></tr>') + "</tbody></table></div></section>" +
      '<section class="card"><h2 class="h-sm">問題不足（今回のチェック）</h2>' +
        (shortageRows
          ? '<div class="table-wrap"><table><thead><tr><th>スキル</th><th>予定レベル</th><th>対応</th><th>段階</th></tr></thead><tbody>' + shortageRows + "</tbody></table></div>"
          : '<p class="small muted">なし（すべて通常の条件で、最近出していない問題を選べました）</p>') +
        '<p class="small muted">足りないときは ' + C.RELAX_STAGES.slice(1).map(function (s) { return "段階" + s.stage + "「" + esc(s.label) + "」"; }).join(" → ") +
        " の順にゆるめます。どの段階でも、今回すでに出した問題・前回のチェックの問題・3日以内に解いた問題は出しません。</p></section>" +
      '<section class="card"><h2 class="h-sm">除外した問題（' + chk.excluded.length + "）</h2>" +
        '<p class="small">' + (chk.excluded.map(function (e) { return esc(e.id) + "（" + esc(e.why) + "）"; }).join("、") || "なし") + "</p></section>" +
      '<section class="bank-skill"><h2 class="h-sm">原因さがしの道すじ（新しい順・最大5件）</h2>' + (explorationDebug() || '<p class="small muted">まだありません</p>') +
        '<p class="small muted">上限：深さ ' + R.CONFIG.MAX_DEPTH + " 段／1スキルで確かめる前提 " + R.CONFIG.MAX_PROBES_PER_STEP + " 個／追加の問題 最初のチェック " + R.CONFIG.BUDGET_INITIAL +
        "問・定期チェック " + R.CONFIG.BUDGET_PERIODIC + "問／記録から「できている」とみなすのは " + R.CONFIG.SOLID_FRESH_DAYS + "日以内に確認したスキル。" +
        "確かめきれなかった前提は、次の定期チェックで最優先（P0）になります。</p></section>" +
      '<section class="bank-skill"><h2 class="h-sm">これまでの定期チェック（新しい順・最大5件）</h2>' + (hist || '<p class="small muted">まだありません</p>') + "</section>" +
      geometryRootDebug();
  }

  // ---------- 図形の原因さがし（value / reason で入口を変える） ----------
  var ENTRY_JA = { reason_only: "理由だけ記録（原因さがしなし）", calc: "計算側", concept: "図形の性質側", none: "なし", not_learned: "未学習（原因さがしなし）" };
  function okMark(v) { return v === true ? "○" : v === false ? "×" : "聞いていない"; }
  function skillList(ks) { return ks && ks.length ? ks.map(function (k) { return E.SKILLS[k].label; }).join("・") : "−"; }
  // 1本の道すじの図形の情報：value・reason の結果／入口／図形側・計算側の前提／確認したスキル／スキップした側と理由／戻る場所
  function geoTrailDetail(t) {
    var g = t.geometry, c = t.conclusion || {};
    var checked = t.path.filter(function (p) { return p.via === "probe" || p.via === "history" || p.via === "session"; })
      .map(function (p) { return p.label + " " + (p.correct ? "○" : "×") + (p.via === "history" ? "（記録から）" : p.via === "session" ? "（今回の答えから）" : ""); });
    var rows = [
      ["value（角度・値）", okMark(g.value_ok) + (g.first_miss_step ? "（最初に止まった小問：" + g.first_miss_step + "）" : "")],
      ["reason（根拠）", okMark(g.reason_ok) + (g.confusions && g.confusions.length ? "（取り違え：" + g.confusions.map(function (z) { return z.confusion; }).join("、") + "）" : "")],
      ["選ばれた入口", ENTRY_JA[g.entry] + "：" + g.why],
      ["図形側の前提", skillList(g.concept_prereqs)],
      ["計算側の前提", skillList(g.calc_prereqs)],
      ["実際に確認したスキル", checked.length ? checked.join(" → ") : "なし"],
      ["スキップした側", g.skipped && g.skipped.length ? g.skipped.map(function (x) { return (x.side === "calc" ? "計算側" : "図形側") + "：" + x.why; }).join("／") : "なし"],
      ["戻る場所", c.return_to ? E.SKILLS[c.return_to].label : c.kind === "reason_only" ? "なし（根拠の確認を今日の学習の候補へ：" + E.SKILLS[c.reason_practice].label + "）" : c.kind === "value_slip" ? "なし（計算の見直し）" : "−"],
      ["次回に回す", skillList(c.pending_skills)]
    ];
    return '<div class="table-wrap"><table><tbody>' + rows.map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td>" + esc(r[1]) + "</td></tr>"; }).join("") + "</tbody></table></div>";
  }
  function geometryRootDebug() {
    var recent = ST.explorations().filter(function (x) { return x.geometry; }).slice(-5).reverse().map(function (x) {
      return '<div class="card bank-item"><p class="small"><strong>' + esc(new Date(x.date).toLocaleString("ja-JP")) + "</strong>　" + esc(x.symptom.label) + "（" + esc(x.symptom.question_id) + "）</p>" + geoTrailDetail(x) + "</div>";
    }).join("");
    // 例：同じしくみを、決まった「本当の理解」で動かした結果（tests/geometry-rootcause.test.js と同じ）
    function steps(q, wrong) { return L.checkSteps(q, q.steps.reduce(function (v, st) { v[st.id] = wrong[st.id] !== undefined ? wrong[st.id] : String(st.answer); return v; }, {})); }
    var EX = [
      ["A 角度○・根拠×", "parallelAngles-basic-1", { s2: "alternate" }, {}],
      ["B 角度×・根拠○", "angleEq-basic-3", { s1: "40" }, { likeTerms: true, transpose: false, signed: true, algebra: true }],
      ["C 角度×・根拠×", "parallelAngles-basic-1", { s1: "108", s2: "straight" }, { angleNames: false, lineAngles: true }],
      ["D 式○・x の計算×", "angleEq-standard-1", { s1: "40", s2: "vertical" }, { likeTerms: false, signed: true, transpose: true, algebra: true }],
      ["E 式を立てる×", "angleEq-standard-1", { s0: "c", s1: "60" }, { lineAngles: false, angleBasics: true }],
      ["G 上限をこえそう（定期チェック：2問まで）", "parallelAngles-basic-1", { s1: "108", s2: "straight" }, { angleNames: false, lineAngles: false, angleBasics: false }, R.CONFIG.BUDGET_PERIODIC]
    ];
    var demo = EX.map(function (e) {
      var q = QS[e[1]], r = R.simulate(q, steps(q, e[2]), e[3], { now: ST.now(), budget: e[4] });
      return '<div class="card bank-item"><p class="small"><strong>' + esc(e[0]) + "</strong>　" + esc(e[1]) + "（答え：" + esc(JSON.stringify(e[2])) + "／本当にできる：" +
        esc(Object.keys(e[3]).filter(function (k) { return e[3][k]; }).map(function (k) { return E.SKILLS[k].label; }).join("・") || "−") + "）</p>" +
        (r.trail ? geoTrailDetail(r.trail) + '<p class="small">' + esc(r.trail.conclusion.message) + "</p>" : '<p class="small muted">' + esc(ENTRY_JA[r.entry.entry]) + "</p>") + "</div>";
    }).join("");
    return '<section class="bank-skill"><h2 class="h-sm">図形の原因さがし（角度 value・根拠 reason で入口を変える）</h2>' +
      '<p class="small muted">角度○・根拠× → 理由だけ記録／角度×・根拠○ → 計算側だけ／角度×・根拠× → 図形の性質側から（できていれば計算側）。小問は最初に止まった小問が入口。学校で未学習のスキルは原因さがしをしない。</p>' +
      "<h3 class=\"small\">最近の図形の原因さがし</h3>" + (recent || '<p class="small muted">まだありません</p>') +
      "<h3 class=\"small\">例（決まった答えで動かした結果）</h3>" + demo + "</section>";
  }

  var KIND_LABEL = { gap_found: "前提に原因がありそう", root: "土台まで戻った", in_skill: "前提はできている", not_reproduced: "別の問題ではできた", undetermined: "確かめきれていない" };
  function explorationDebug() {
    return ST.explorations().slice(-5).reverse().map(function (x) {
      var c = x.conclusion || {};
      return '<div class="card bank-item">' +
        '<p class="small"><strong>' + esc(new Date(x.date).toLocaleString("ja-JP")) + "</strong>　症状：" + esc(x.symptom.label) + "（" + esc(x.symptom.question_id) + "）" +
        ' <span class="lv lv-pass">' + esc(KIND_LABEL[c.kind] || "") + "</span></p>" +
        '<p class="small">' + esc(x.path ? R.pathText(x) : "") + "</p>" +
        (x.geometry ? geoTrailDetail(x) : "") +
        (c.return_to ? '<p class="small">戻る場所：<strong>' + esc(E.SKILLS[c.return_to].label) + "</strong>" +
          (c.solid_skills && c.solid_skills.length ? "／できている前提：" + esc(c.solid_skills.map(function (k) { return E.SKILLS[k].label; }).join("、")) : "") +
          (c.pending_skills && c.pending_skills.length ? "／次回に回す：" + esc(c.pending_skills.map(function (k) { return E.SKILLS[k].label; }).join("、")) : "") + "</p>" : "") +
        '<details><summary class="small">判断の記録</summary><ol class="small muted debug-log">' + (x.log || []).map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ol></details>" +
      "</div>";
    }).join("");
  }

  // ---------- 保護者向け：学習のようす ----------

  function parentReport() {
    var d = ST.get();
    var today = d.answer_history.length ? buildToday() : null;
    return SC.parent.report({ history: d.answer_history, states: d.skill_state, compassHistory: d.compass_check_history,
      explorations: d.explorations, plans: d.plans, now: ST.now(), school: ST.schoolProgressInfo(), testPrep: ST.testPrep(),
      todayPlan: today && !today.range_check ? today : null });
  }

  function viewParent() {
    var r = parentReport();
    var head = '<section class="result-head"><p class="eyebrow">FOR PARENTS</p><h1 class="h-md">学習のようす（保護者の方へ）</h1>' +
      '<p class="muted small">点数や他の子との比較ではなく、「いまどこにいて、次に何をするか」をお伝えします。毎日すべてを見なくても大丈夫です。</p></section>';
    if (r.empty) {
      return head + '<section class="card"><p>まだ学習の記録がありません。最初のコンパスチェックのあとから、ここに学習のようすが表示されます。</p></section>' +
        '<button class="text-button" type="button" data-action="home">← ホームにもどる</button>';
    }
    var w = r.week;
    var growth = r.growth.length
      ? '<ul class="pr-list">' + r.growth.slice(0, 3).map(function (g) {
          return '<li><div class="pr-top"><strong>' + esc(g.label) + '</strong><span class="pr-move">' + g.from + " → " + g.to + "</span></div><p>" + esc(g.text) + "</p></li>";
        }).join("") + "</ul>" +
        (r.growth.length > 3 ? '<p class="small muted">ほかに「' + r.growth.slice(3).map(function (g) { return g.label; }).join("」「") + "」も、前より安定してきています。</p>" : "")
      : '<p class="small muted">この1週間で大きく変わったところは、まだありません。少しずつ積み重ねています。</p>';
    // 今確認していること：いちばん大事なところ（いま確認しているところ）を先頭に、理由までくわしく
    var checks = r.checking.slice().sort(function (a, b) { return (r.focus && a.skill === r.focus.skill ? 0 : 1) - (r.focus && b.skill === r.focus.skill ? 0 : 1); });
    var checking = checks.length
      ? '<ul class="pr-list">' + checks.map(function (c) {
          var text = r.focus && c.skill === r.focus.skill ? r.focus.why : c.text;
          return '<li><div class="pr-top"><strong>' + esc(c.label) + "</strong></div><p>" + esc(text) + "</p></li>";
        }).join("") + "</ul>" +
        '<p class="small muted">1回の結果では決めつけず、何度か様子を見たうえでお伝えしています。</p>'
      : '<p class="small muted">いまは、特に確かめ直しているところはありません。学校の内容を進めています。</p>';
    return head +
      '<section class="card pr-message"><p class="eyebrow">今週のひとこと</p><p class="pr-message-text">' + esc(r.message) + "</p></section>" +
      '<section class="card"><h2 class="h-sm">今週の学習</h2><div class="pr-stats">' +
        '<div><span>学習した日</span><strong>' + w.active_days + ' 日</strong><small>この7日間</small></div>' +
        '<div><span>学習の目安</span><strong>' + w.minutes + ' 分</strong><small>予定時間の合計</small></div>' +
        '<div><span>いまの単元</span><strong>' + esc(w.unit) + "</strong><small>学校：" + ({ done: "習った", learning: "学習中", notyet: "これから" }[w.school_status] || "") + "</small></div>" +
      "</div>" +
      '<p class="small pr-school">学校の進度：「' + esc(schoolText()) + "」" + (testDaysText() ? "　" + esc(testDaysText()) : "") + "</p></section>" +
      '<section class="card"><h2 class="h-sm">今できていること</h2>' + growth + "</section>" +
      '<section class="card"><h2 class="h-sm">今確認していること</h2>' + checking + "</section>" +
      '<section class="card"><h2 class="h-sm">次に進むこと</h2><ol class="pr-next">' + r.next.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></section>" +
      '<section class="card"><h2 class="h-sm">単元の地図</h2><p class="small muted">点数ではなく、いまどの段階にいるかを表しています。</p><ul class="pr-map">' +
        r.map.map(function (m) { return '<li><span class="pr-mark">' + m.mark + "</span><strong>" + esc(m.label) + unitTag(m.skill) + "</strong><span class=\"muted small\">" + esc(m.word) + "</span></li>"; }).join("") + "</ul></section>" +
      '<p class="small muted center">このページでは、毎回の正誤や点数、ほかの子との比較は表示しません。</p>' +
      '<button class="text-button" type="button" data-action="home">← ホームにもどる</button>';
  }

  // ---------- 学校のようすの確認ページ（?debug=school） ----------

  // 単元のはじめてのチェック：候補スキル・選んだ問題・除外したスキルと理由・最終問題数。案内を出すかどうかも
  function unitCheckDebug(s) {
    var unit = s.current_unit, S = E.SKILLS;
    if (unit === "一次関数") return '<section class="card"><h2 class="h-sm">はじめてのチェック（' + esc(unit) + "）</h2><p class=\"small\">一次関数は B1〜B5（原因確認 C1〜C5 つき）の別の流れ</p></section>";
    var c = C.unitCheck(unit, s), d = c.debug, info = unitCheckNoticeInfo();
    return '<section class="card"><h2 class="h-sm">はじめてのチェック（' + esc(unit) + "）</h2><ul class=\"small debug-log\">" +
      "<li>候補スキル：" + esc(d.candidates.map(function (x) { return S[x.skill].label + "（" + x.school + (x.diagnosis ? "・診断用あり" : "・基礎で代用") + "）"; }).join("、") || "なし") + "</li>" +
      "<li>選んだ問題：" + esc(c.chosen.map(function (x) { return x.question_id + "（" + S[x.skill].label + "）"; }).join("、") || "なし") + "</li>" +
      "<li>除外したスキル：" + esc(d.excluded.map(function (x) { return S[x.skill].label + "（" + x.why + "）"; }).join("、") || "なし") + "</li>" +
      "<li>最終問題数：" + d.final_count + "問（原則 " + C.UNIT_CHECK.MIN + "〜" + C.UNIT_CHECK.MAX + "問。習ったスキルが少ないときは、学習中のスキルに2問目）</li>" +
      "<li>この単元のはじめてのチェック：" + (ST.unitCheckDone(unit) ? "済み（案内しない）" : info ? (info.snoozed ? "まだ・今日は「あとで」" : "まだ・ホームで案内中") : "まだ・記録がないので案内しない（ホームのコンパスチェックから）") + "</li>" +
      "</ul></section>";
  }

  // ?debug=plan：パートの組み立て（同じスキルのまとめ・目的・20分で削った候補・テストの表示名）
  function composeDebug(c, plan) {
    if (!c) return "";
    var S = E.SKILLS, lab = function (k) { return S[k] ? S[k].label : k; };
    var row = function (x) { return x.minutes + "分 " + x.type + "：" + lab(x.skill) + (x.purposes ? "［" + x.purposes.join("＋") + "］" : ""); };
    return '<h3 class="small">パートの組み立て</h3><ul class="small debug-log">' +
      "<li>original candidates：" + esc(c.original.map(row).join(" ／ ")) + "</li>" +
      "<li>merged candidates：" + esc(c.merged.map(row).join(" ／ ")) + "</li>" +
      "<li>同じスキルのまとめ：" + esc(c.merges.length ? c.merges.map(function (m) { return lab(m.skill) + "（" + m.what + " → " + m.into + "）" + m.why; }).join("、") : "なし") + "</li>" +
      "<li>理由の確認の候補：" + esc(c.reason ? lab(c.reason) + (plan.sessions.some(function (s) { return (s.purposes || []).indexOf("reason_review") !== -1; }) ? "（残した）" : "（今日は入れなかった）") : "なし") + "</li>" +
      "<li>20分の制約で削った候補：" + esc(c.cut.length ? c.cut.map(function (x) { return x.minutes + "分 " + x.type + "：" + lab(x.skill) + "／" + x.why; }).join("、") : "なし") + "</li>" +
      "<li>表示カテゴリ：" + esc(plan.sessions.map(function (s) { return s.type + "→" + s.display + "「" + s.type_label + "」：" + s.skill_label; }).join(" ／ ")) + "</li>" +
      "<li>テストの文脈による表示名の変更：" + esc((c.renamed || []).length ? c.renamed.map(function (x) { return lab(x.skill) + "「" + x.from + "」→「" + x.to + "」"; }).join("、") : "なし") + "</li></ul>";
  }

  function viewSchoolDebug() {
    var s = ST.school(), states = ST.get().skill_state;
    var S = E.SKILLS, MARK = { learned: "習った", current: "学習中", not_learned: "まだ" };
    function list(ks) { return ks.length ? ks.map(function (k) { return S[k].label; }).join("、") : "−"; }
    var all = [], byStatus = { learned: [], current: [], not_learned: [] };
    E.SELECTABLE_UNITS.forEach(function (u) { E.UNITS[u].forEach(function (k) { all.push(k); byStatus[E.schoolSkillStatus(k, s)].push(k); }); });
    var preview = E.nextPreviewSkill(s);
    var unitRows = E.SELECTABLE_UNITS.map(function (u) {
      var x = s.units[u];
      return "<tr><td>" + esc(u) + (u === s.current_unit ? "（いま）" : "") + "</td><td>" + esc(x.status) + "</td><td>" + esc(x.current_skill ? S[x.current_skill].label : "−") + "</td><td>" +
        E.UNITS[u].map(function (k) { return esc(S[k].label) + "：" + MARK[x.skills[k]]; }).join("<br>") + "</td></tr>";
    }).join("");
    var stateRows = byStatus.not_learned.map(function (k) {
      var st = states[k] || {};
      return "<tr><td>" + esc(S[k].label) + (k === preview ? "（先取り候補）" : "") + "</td><td>" + esc(st.learning_status || "−") + "</td><td>" + (st.confidence !== undefined ? st.confidence.toFixed(2) : "−") +
        "</td><td>" + (st.preview_misses || 0) + "</td></tr>";
    }).join("");
    var hasRecords = ST.get().answer_history.length > 0;
    var plan = hasRecords ? buildToday(true) : null;
    var schoolSessions = plan && plan.sessions ? plan.sessions.filter(function (x) { return x.type === "current_unit" || x.type === "preview"; }) : [];
    var dbg = plan && plan.debug ? plan.debug : null;
    var nt = s.next_test;
    var since = s.updated_at ? Math.floor((ST.now() - Date.parse(s.updated_at)) / E.DAY) : null;
    return '<section class="card"><p class="eyebrow">DEBUG / SCHOOL</p><h1 class="h-md">学校のようす</h1>' +
      '<p class="small muted">アプリ内の日付：' + esc(new Date(ST.now()).toLocaleString("ja-JP")) + "／表示：「" + esc(schoolText(s)) + "」" + (testDaysText(s) ? "／" + esc(testDaysText(s)) : "") + "</p>" +
      '<div class="actions"><a class="secondary-button link-button" href="./?debug=1">アプリへ</a></div></section>' +
      '<section class="card"><h2 class="h-sm">いまの登録</h2><ul class="small debug-log">' +
        "<li>current_unit：" + esc(s.current_unit) + "</li>" +
        "<li>updated_at：" + esc(s.updated_at || "（未登録）") + (since !== null ? "（" + since + "日前）" : "") + "／更新のお知らせ：" + (schoolStale(s) ? (s.snooze_date === C.dateKey(ST.now()) ? "今日はあとで" : "表示する") : "表示しない（" + SCHOOL_STALE_DAYS + "日未満）") + "</li>" +
        "<li>次のテスト：" + (nt ? esc(nt.date) + "／範囲 " + esc(nt.units.join("・")) + "／" + esc(testDaysText(s) || "終わった") : "なし") + "</li></ul>" +
        '<div class="table-wrap"><table><thead><tr><th>単元</th><th>status</th><th>current_skill</th><th>スキルごと</th></tr></thead><tbody>' + unitRows + "</tbody></table></div></section>" +
      '<section class="card"><h2 class="h-sm">スキル単位</h2><ul class="small debug-log">' +
        "<li>習った（learned）：" + esc(list(byStatus.learned)) + "</li>" +
        "<li>学習中（current）：" + esc(list(byStatus.current)) + "</li>" +
        "<li>まだ（not_learned）：" + esc(list(byStatus.not_learned)) + "</li>" +
        "<li>先取りしてよい次のスキル：" + esc(preview ? S[preview].label : "なし") + "</li></ul>" +
        '<p class="small muted">まだ習っていないスキル：苦手にしない・確かさを下げない（先取りのまちがいは理解度の計算に入れない）・定期チェックと原因さがしの対象にしない。</p>' +
        (stateRows ? '<div class="table-wrap"><table><thead><tr><th>まだのスキル</th><th>learning_status</th><th>確かさ</th><th>先取りでまちがえた回数（計算に入れない）</th></tr></thead><tbody>' + stateRows + "</tbody></table></div>" : "") + "</section>" +
      unitCheckDebug(s) +
      '<section class="card"><h2 class="h-sm">今日の学習の「学校」の枠</h2>' +
        (plan ? (schoolSessions.length ? '<ul class="small debug-log">' + schoolSessions.map(function (x) {
          return "<li>" + esc(x.type_label) + "：" + esc(x.skill_label) + "（" + esc(x.level_label) + "）" + x.minutes + "分・" + x.questions.length + "問／" + esc(x.why) + "</li>";
        }).join("") + "</ul>" : '<p class="small muted">今日の学習には、学校の単元・先取りの枠が入っていません（つまずきの補強などが優先）。</p>') +
          (dbg && dbg.school ? '<ul class="small debug-log"><li>学校の単元の候補（習った）：' + esc(list(dbg.school.learned)) + "</li><li>学校の単元の候補（学習中）：" + esc(list(dbg.school.current)) +
            "</li><li>先取り：" + esc(dbg.school.preview ? S[dbg.school.preview].label : "なし") + "</li><li>除外した未学習スキル：" + esc(list(dbg.school.excluded_not_learned)) + "</li></ul>" : "")
          : '<p class="small muted">まだ記録がないので、今日の学習は作っていません。</p>') + "</section>";
  }

  // ---------- 学習マップの確認ページ（?debug=map） ----------

  function viewMapDebug() {
    var states = ST.get().skill_state;
    var S = E.SKILLS;
    var units = [];
    E.SKILL_ORDER.forEach(function (k) { var u = S[k].grade + " " + S[k].unit; if (units.indexOf(u) === -1) units.push(u); });
    var dependents = {};
    E.SKILL_ORDER.forEach(function (k) { S[k].prerequisites.forEach(function (p) { (dependents[p] = dependents[p] || []).push(k); }); });
    var STATUS_NOTE = { not_checked: "まだ（記録なし・苦手とは扱わない）", not_learned: "未学習（学校でまだ習っていない）" };
    var sections = units.map(function (u) {
      var rows = E.SKILL_ORDER.filter(function (k) { return S[k].grade + " " + S[k].unit === u; }).map(function (k) {
        var s = states[k];
        var n = SC.bank.LEVELS.reduce(function (a, lv) { return a + SC.bank.index[k][lv].length; }, 0);
        return "<tr><td>" + esc(S[k].label) + "<br><span class=\"muted small\">" + k + (S[k].bridge ? "・" + esc(S[k].bridge) + "とのかけ橋" : "") + "</span></td><td>" + (S[k].concept ? "図形：" + esc(S[k].concept.map(function (p) { return S[p].label; }).join("、") || "−") + "<br>計算：" + esc(S[k].calc.map(function (p) { return S[p].label; }).join("、") || "−") +
            (S[k].follows ? '<br><span class="muted small">学校の進み具合は「' + esc(S[S[k].follows].label) + "」と一緒</span>" : "")
          : esc(S[k].prerequisites.map(function (p) { return S[p].label; }).join("、") || "−")) +
          "</td><td>" + esc((dependents[k] || []).map(function (d) { return S[d].label; }).join("、") || "−") + "</td><td>" + n + "問</td><td>" +
          esc(s ? (STATUS_NOTE[s.learning_status] || E.STATUS_VIEW[s.learning_status].label) : "−") + "</td></tr>";
      }).join("");
      return '<h3 class="small">' + esc(u) + '</h3><div class="table-wrap"><table><thead><tr><th>スキル</th><th>前提</th><th>この上に積むスキル</th><th>問題</th><th>いまの状態</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
    }).join("");
    // 一次関数の各スキルから、前提をたどって土台までの道（すべての道）
    function chains(k, path) {
      path = (path || []).concat(k);
      var pre = S[k].prerequisites;
      if (!pre.length) return [path];
      return pre.reduce(function (acc, p) { return acc.concat(chains(p, path)); }, []);
    }
    // スキル k から、指定した単元（through）を通って土台まで下りる道。長いので最大 max 本まで表示
    var MAX_CHAINS = 6;
    function chainList(k, through, label) {
      var via = chains(k).filter(function (c) { return c.slice(1).some(function (x) { return S[x].unit === through; }); })
        // 同じ道の途中までを省いて短く：through の単元に入ったところで止める
        .map(function (c) { var i = 1; while (i < c.length && S[c[i]].unit !== through) i++; return c.slice(0, i + 1); })
        .filter(function (c, i, all) { var key = c.join(">"); return all.findIndex(function (d) { return d.join(">") === key; }) === i; });
      return "<li><strong>" + esc(S[k].label) + "</strong>（" + esc(label || through) + "へ下りる道 " + via.length + " 本）<ul>" +
        via.slice(0, MAX_CHAINS).map(function (c) { return "<li>" + esc(c.map(function (x) { return S[x].label; }).join(" → ")) + "</li>"; }).join("") +
        (via.length > MAX_CHAINS ? "<li>ほか " + (via.length - MAX_CHAINS) + " 本</li>" : "") + "</ul></li>";
    }
    function questionsWith(unit, prereq) {
      return Object.keys(QS).filter(function (id) { var q = QS[id]; return S[q.skill] && S[q.skill].unit === unit && (q.prerequisite_skills || []).indexOf(prereq) !== -1; });
    }
    // 途中の工程を小問に分けた問題（どこで止まったかがわかる）
    function stepsOf(unit) {
      return Object.keys(QS).filter(function (id) { var q = QS[id]; return q.type === "steps" && S[q.skill] && S[q.skill].unit === unit; }).map(function (id) {
        return id + "（" + QS[id].steps.map(function (st) { return S[st.skill].label; }).join(" → ") + "）";
      });
    }
    var withTranspose = questionsWith("一次関数", "transpose");
    var links =
      '<section class="card"><h2 class="h-sm">一次関数 → 一次方程式 のつながり</h2><ul class="small debug-log">' +
        chainList("substitution", "一次方程式") + chainList("form", "一次方程式") + "</ul>" +
        '<p class="small muted">方程式を解く必要がある一次関数の問題（前提に「移項」を付けた問題）：' + withTranspose.length + "問（" + esc(withTranspose.join(", ")) + "）</p></section>" +
      '<section class="card"><h2 class="h-sm">連立方程式 → 一次方程式 のつながり</h2><ul class="small debug-log">' +
        E.UNITS["連立方程式"].map(function (k) { return chainList(k, "一次方程式"); }).join("") + "</ul>" +
        '<p class="small muted">途中の工程を小問に分けた問題：' + esc(stepsOf("連立方程式").join("、")) + "</p></section>" +
      '<section class="card"><h2 class="h-sm">一次関数 ⇄ 連立方程式（2直線の交点）</h2>' +
        '<p class="small">2直線の交点の座標 ＝ 2つの式を連立方程式として解いた解。まちがえたら、グラフ側（グラフ・式・座標）にも、連立方程式側（加減法）にも戻れる。</p><ul class="small debug-log">' +
        chainList("simGraph", "連立方程式", "連立方程式の側") +
        "<li><strong>2直線の交点</strong>（グラフの側）：" + esc(S.simGraph.prerequisites.filter(function (p) { return S[p].unit !== "連立方程式"; }).map(function (p) { return S[p].label; }).join("・")) + "</li></ul>" +
        '<p class="small muted">途中の工程を小問に分けた問題：' + esc(stepsOf("一次関数").filter(function (s) { return s.indexOf("simGraph") === 0; }).join("、")) + "</p></section>" +
      // 式の計算は、まっすぐ1本の線ではなく、一次方程式・連立方程式・一次関数のそれぞれ別の所につながる
      '<section class="card"><h2 class="h-sm">式の計算 → 一次方程式／連立方程式／一次関数</h2><ul class="small debug-log">' +
        chainList("simElim", "式の計算") + chainList("simParen", "式の計算") +
        "<li><strong>移項</strong> → 同類項をまとめる（中1の土台。両辺に x がある方程式）</li>" +
        "<li><strong>係数をそろえる</strong> → 分配法則（中1の土台を文字2つまで広げた）</li>" +
        "<li><strong>等式の変形</strong>を前提に持つ問題：" + esc(Object.keys(QS).filter(function (id) { return (QS[id].prerequisite_skills || []).indexOf("eqTransform") !== -1; }).join("、") || "−") + "</li>" +
        "<li><strong>単項式の乗法・除法</strong>：この上に積むスキルはまだない（中3の展開へ）</li></ul>" +
        '<p class="small muted">途中の工程を小問に分けた問題：' + esc(stepsOf("式の計算").join("、")) + "</p></section>" +
      // 図形の角：角度も根拠もまちがえたら図形の性質側、根拠は合っていて角度だけまちがえたら計算側だけをさかのぼる
      '<section class="card"><h2 class="h-sm">図形の角 → 図形の性質側／計算側</h2>' +
        '<p class="small">角度 ○・根拠 × → 原因さがしはせず、理由の練習を今日の候補へ／角度 ×・根拠 ○ → 計算側だけ／角度 ×・根拠 × → 図形の性質側から。</p><ul class="small debug-log">' +
        E.UNITS["図形の角"].map(function (k) {
          return "<li><strong>" + esc(S[k].label) + "</strong>：図形の性質側 " + esc(E.prereqSide(k, "concept").map(function (p) { return S[p].label; }).join("・") || "−") +
            "／計算側 " + esc(E.prereqSide(k, "calc").map(function (p) { return S[p].label; }).join("・") || "−") + "</li>";
        }).join("") +
        chainList("angleEq", "一次方程式") + chainList("polygonInterior", "一次方程式") + "</ul>" +
        '<p class="small muted">学校の「どこまで」の選択肢：' + esc(E.schoolOptions("図形の角").map(function (k) { return S[k].label; }).join(" → ")) + "</p></section>";
    var ex = ST.explorations().slice(-5).reverse().map(function (x) {
      var depth = Math.max.apply(null, x.path.map(function (p) { return p.depth || 0; }));
      var reached = [];
      x.path.forEach(function (p) { var u = S[p.skill] && S[p.skill].unit; if (u && u !== "既習" && u !== S[x.symptom.skill].unit && reached.indexOf(u) === -1) reached.push(u); });
      return "<li>" + esc(R.pathText(x)) + '<br><span class="muted small">' + depth + "段さかのぼった" + (reached.length ? "・" + esc(reached.join("・")) + "まで到達" : "") +
        "／戻る場所：" + esc(x.conclusion && x.conclusion.return_to ? S[x.conclusion.return_to].label : "−") + "</span></li>";
    }).join("");
    return '<section class="card"><p class="eyebrow">DEBUG / MAP</p><h1 class="h-md">学習マップ（スキルのつながり）</h1>' +
      '<p class="small muted">' + E.SKILL_ORDER.length + " スキル（" + esc(units.join("／")) + "）。原因さがしは、まちがえた問題が持つ前提 → 2段目からはこの地図の前提、の順にさかのぼる。</p>" +
      '<div class="actions"><a class="secondary-button link-button" href="./?debug=1">アプリへ</a></div></section>' +
      '<section class="card"><h2 class="h-sm">スキルと前提</h2>' + sections + "</section>" +
      links +
      '<section class="card"><h2 class="h-sm">最近の原因さがし（どこまでさかのぼったか）</h2>' + (ex ? '<ul class="small debug-log">' + ex + "</ul>" : '<p class="small muted">まだありません</p>') + "</section>";
  }

  // ---------- 保護者向けの確認ページ（?debug=parent） ----------

  function viewParentDebug() {
    var r = parentReport(), dbg = r.debug, d = ST.get();
    var states = d.skill_state;
    var growthRows = dbg.growth.map(function (g) {
      return "<tr><td>" + esc(E.SKILLS[g.skill].label) + "</td><td>" + esc(E.STATUS_VIEW[g.before].label) + " → " + esc(E.STATUS_VIEW[g.after].label) + "</td><td>" +
        esc(g.newly_passed.join(",") || "−") + "</td><td>" + (g.rank_up ? "上がった" : "−") + "</td><td>" + esc(g.result) + "</td></tr>";
    }).join("");
    var stumbleRows = dbg.stumble.map(function (s) {
      return "<tr><td>" + esc(E.SKILLS[s.skill].label) + "</td><td>" + esc(s.from) + (s.kind ? "（" + esc(s.kind) + "）" : "") + "</td><td>" + s.misses_14d + "</td><td>" + (s.resolved ? "解決済み→表示しない" : "表示") + "</td></tr>";
    }).join("");
    var stateRows = E.SKILL_ORDER.filter(function (k) { return states[k] && states[k].attempt_count; }).map(function (k) {
      var s = states[k];
      return "<tr><td>" + esc(s.skill) + "</td><td>" + esc(E.STATUS_VIEW[s.learning_status].label) + "</td><td>" + s.confidence.toFixed(2) + "</td><td>" + esc((s.suspected_root_causes || []).join("、")) + "</td></tr>";
    }).join("");
    return '<section class="card"><p class="eyebrow">DEBUG / PARENT</p><h1 class="h-md">保護者向けの表示の根拠</h1>' +
      '<p class="small muted">アプリ内の日付：' + esc(new Date(ST.now()).toLocaleString("ja-JP")) + "／使ったデータ：回答 " + dbg.sources.answers + "件・定期チェック " + dbg.sources.compass_checks +
        "回・原因さがし " + dbg.sources.explorations + "件・今日の学習の記録 " + dbg.sources.plans + "件</p>" +
      '<div class="actions"><button class="secondary-button" type="button" data-action="debug-day1">日付を1日進める</button>' +
        '<button class="secondary-button" type="button" data-action="debug-days-reset">日付を元に戻す</button>' +
        '<a class="secondary-button link-button" href="./?debug=1">アプリへ</a></div></section>' +
      '<section class="card"><h2 class="h-sm">今週の学習の計算</h2><p class="small">この7日間の回答 ' + dbg.week.answers_in_week + "件 → 学習した日 " + r.week.active_days +
        "日／学習の目安 ＝ 完了した今日の学習の予定時間 " + dbg.week.plan_minutes + "分 ＋ チェック " + dbg.week.check_answers + "問 × 1分 ＝ " + r.week.minutes + "分</p></section>" +
      '<section class="card"><h2 class="h-sm">skill_state（いま）</h2><div class="table-wrap"><table><thead><tr><th>スキル</th><th>状態</th><th>確かさ</th><th>原因候補</th></tr></thead><tbody>' + stateRows + "</tbody></table></div></section>" +
      '<section class="card"><h2 class="h-sm">成長の判定（7日前と比べる）</h2><div class="table-wrap"><table><thead><tr><th>スキル</th><th>状態</th><th>新しくできたレベル</th><th>段階</th><th>判定</th></tr></thead><tbody>' + growthRows + "</tbody></table></div></section>" +
      '<section class="card"><h2 class="h-sm">つまずき候補</h2><div class="table-wrap"><table><thead><tr><th>スキル</th><th>根拠</th><th>14日の×</th><th>表示</th></tr></thead><tbody>' + (stumbleRows || '<tr><td colspan="4">なし</td></tr>') + "</tbody></table></div>" +
        '<p class="small muted">原因さがしで見つかっても、そのあとできるようになったものは表示しない。記録だけの候補は、14日で2回以上の×があるときだけ（1回の×では取り上げない）。</p></section>' +
      '<section class="card"><h2 class="h-sm">次の学習予定</h2><p class="small">今日の学習：' + esc(dbg.next.plan_sessions.join(" / ") || "なし") + "</p>" +
        '<p class="small">次のコンパスチェック：' + (dbg.next.next_check.due ? "すでに時期" : esc(new Date(dbg.next.next_check.at).toLocaleString("ja-JP"))) + "（各スキルの最後の確認＋3日のうち一番早い日）</p>" +
        '<h3 class="small">保護者向けの表示</h3><p class="small">' + esc(r.message) + "</p><ol class=\"small\">" + r.next.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></section>";
  }

  // ---------- テスト対策の確認ページ（?debug=test） ----------

  // テスト範囲の中の優先順位・学習の目的・未学習スキルの扱い
  function testPriorityDebug(plan) {
    var al = plan.debug && plan.debug.alloc, T = al && al.test;
    if (!T) return "";
    var S = E.SKILLS, st = ST.get().skill_state;
    var rows = T.priority.map(function (c) {
      var s = st[c.skill] || {};
      return "<tr><td>" + esc(S[c.skill].label) + "</td><td>" + c.mark + "</td><td>" + c.priority + "</td><td>" + esc(SC.planner.LEVEL_JA[c.level] || c.level) + "</td><td>" +
        esc(E.STATUS_VIEW[s.learning_status] ? E.STATUS_VIEW[s.learning_status].label : "−") + " ／ " + (s.confidence !== undefined ? s.confidence.toFixed(2) : "−") + "</td><td>" +
        esc((c.preview ? "先取り候補（まちがえても苦手にしない）・" : "") + c.reasons.join("・")) + (c.retry.length ? "<br>もう一度：" + esc(c.retry.join(", ")) : "") + "</td></tr>";
    }).join("");
    var testEx = al.excluded.filter(function (x) { return x.kind === "test"; });
    return '<section class="card"><h2 class="h-sm">テスト範囲の優先順位</h2>' +
      '<p class="small">残り ' + T.days_left + " 日／学習の目的：" + esc(T.stage_ja) + "（" + esc(T.stage) + "）／test_weight " + T.test_weight +
      "／学校の範囲をテスト範囲の枠で扱う：" + (T.merge_school ? "はい" : "いいえ") + "</p>" +
      '<p class="small muted">優先：確かさが低い → 最近のまちがい → 標準・応用が弱い → 定着が未確認 →（最後に）学校でまだ習っていないスキルの先取り</p>' +
      '<div class="table-wrap"><table><thead><tr><th>スキル</th><th>仕上がり</th><th>優先度</th><th>今日のレベル</th><th>状態／確かさ</th><th>理由</th></tr></thead><tbody>' + (rows || '<tr><td colspan="6" class="muted">なし</td></tr>') + "</tbody></table></div>" +
      (testEx.length ? '<p class="small muted">範囲の中で今日は扱わないスキル：' + esc(testEx.map(function (x) { return S[x.skill].label + "（" + x.why + "）"; }).join("、")) + "</p>" : "") + "</section>";
  }

  function viewTestDebug() {
    var tc = testContext();
    var head = '<section class="card"><p class="eyebrow">DEBUG / TEST</p><h1 class="h-md">テスト対策の確認</h1>' +
      '<p class="small muted">アプリ内の日付：' + esc(new Date(ST.now()).toLocaleString("ja-JP")) + "（" + (ST.get().debug.time_offset_days || 0) + "日進めています）</p>" +
      '<div class="actions"><button class="secondary-button" type="button" data-action="debug-test-sample">テストを7日後に設定（いまの単元：' + esc(ST.currentUnit()) + '）</button>' +
        '<button class="secondary-button" type="button" data-action="debug-day1">日付を1日進める</button>' +
        '<button class="secondary-button" type="button" data-action="debug-days-reset">日付を元に戻す</button>' +
        '<a class="secondary-button link-button" href="./?debug=1">アプリへ</a></div></section>';
    if (!tc) return head + '<section class="card"><p class="small muted">テスト対策は設定されていません。</p></section>';
    var plan = buildToday(true);
    var ready = tc.schedule.readiness.map(function (r) {
      return "<tr><td>" + esc(r.label) + "</td><td>" + r.mark + "</td><td>" + r.need + "</td><td>" + r.confidence.toFixed(2) + "</td><td>" + (r.stale ? "7日以上確かめていない" : "") + "</td></tr>";
    }).join("");
    var days = tc.schedule.days.map(function (d) {
      return "<tr><td>" + d.date + "</td><td>" + KIND_JA[d.kind] + "</td><td>" + esc(d.skills.map(function (k) { return E.SKILLS[k].label; }).join("・")) + "</td><td>" + esc(d.note) + "</td></tr>";
    }).join("");
    return head +
      '<section class="card"><h2 class="h-sm">入力</h2><p class="small">テストの日：' + esc(tc.test.test_date) + "（あと " + tc.left + " 日）／登録：" + (tc.test.source === "school" ? "学校のようす" : "テスト対策モード") + "／範囲：" +
        esc(tc.test.range_skills.map(function (k) { return E.SKILLS[k].label; }).join("・")) + "／1日 " + ST.settings().minutes + "分／今日の範囲チェック：" + (tc.checkedToday ? "済み" : "まだ") + "</p>" +
      '<h3 class="small">仕上がり（必要度が高いほど多くの日を割り当てる）</h3><div class="table-wrap"><table><thead><tr><th>スキル</th><th>仕上がり</th><th>必要度</th><th>確かさ</th><th></th></tr></thead><tbody>' + ready + "</tbody></table></div></section>" +
      '<section class="card"><h2 class="h-sm">残り日数の計画</h2><div class="table-wrap"><table><thead><tr><th>日付</th><th>種類</th><th>スキル</th><th>メモ</th></tr></thead><tbody>' + days + "</tbody></table></div>" +
        '<ol class="small muted debug-log">' + tc.schedule.log.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ol></section>" +
      '<section class="card"><h2 class="h-sm">今日の学習</h2>' +
        (plan.range_check ? '<p class="small">今日はテスト範囲チェック（' + esc(tc.day.skills.map(function (k) { return E.SKILLS[k].label; }).join("・")) + "）</p>"
          : '<p class="small">' + esc(plan.sessions.map(function (s) { return s.minutes + "分 " + s.type_label + "：" + s.skill_label + "（" + s.level_label + "）"; }).join(" / ")) + "</p>") +
        '<p class="small"><strong>なぜ今日はこれ？：</strong>' + esc(plan.why) + "</p>" + (plan.focus_text ? '<p class="small">今日の重点：' + esc(plan.focus_text) + "</p>" : "") + "</section>" +
      testPriorityDebug(plan) + (plan.debug ? allocDebug(plan.debug.alloc) : "");
  }

  // ---------- 今日の学習の確認ページ（?debug=plan） ----------

  // 時間配分（戻る勉強・学校の範囲・定着の確認・先取り）の根拠
  function allocDebug(al) {
    if (!al) return "";
    var S = E.SKILLS, BLOCK = { root: "戻る勉強", school: "学校の範囲", test: "テスト範囲", retention: "定着の確認", preview: "先取り", check: "確認", challenge: "もう少し先へ", maintain: "おさらい" };
    var nm = function (k) { return k && S[k] ? S[k].label : k ? String(k) : "−"; };
    var f = al.factors;
    var rows = al.blocks.map(function (b) {
      return "<tr><td>" + esc(BLOCK[b.id] || b.id) + "</td><td>" + esc(nm(b.skill)) + "</td><td>" + b.weight + "</td><td>" + b.target + "分</td><td>" + b.min + "〜" + b.max + "分</td><td><strong>" + b.minutes + "分</strong></td></tr>";
    }).join("");
    return '<section class="card"><h2 class="h-sm">時間の配分</h2>' +
      '<ul class="small debug-log">' +
        "<li>available_minutes：" + al.available_minutes + "分／目標：" + esc(al.goal) + "</li>" +
        "<li>つまずきの大きさ：" + esc(al.severity) + "（スコア " + al.severity_score + (al.severity !== al.severity_raw ? "、目標で " + esc(al.severity_raw) + " から調整" : "") + "）" +
          (f ? "／根拠：" + esc(nm(f.skill)) + "・確かさ " + f.confidence + "・最近 " + f.recent_answers + " 回中 " + f.recent_errors + " 回まちがい・さかのぼった深さ " + f.depth + "・不安定なスキル " + f.weak_skills + "・前の単元 " + (f.cross_unit ? "はい" : "いいえ") : "") + "</li>" +
        (al.test ? "<li>テスト：あと " + al.test.days_left + " 日・" + esc(al.test.stage_ja) + "・test_weight " + al.test.test_weight + "／範囲の候補：" + esc(al.candidates.test.map(nm).join("、") || "なし") + "</li>" : "") +
        "<li>戻る勉強の候補（root cause）：" + esc(al.candidates.root.map(nm).join("、") || "なし") + "</li>" +
        "<li>学校の範囲の候補：" + esc(al.candidates.school.map(function (x) { var p = x.split(":"); return nm(p[0]) + "（" + ({ current: "学習中", learned: "習った", maintain: "おさらい" }[p[1]] || "") + "・" + (SC.planner.LEVEL_JA[p[2]] || p[2]) + "）"; }).join("、") || "なし") + "</li>" +
        "<li>定着の確認の候補：" + esc(nm(al.candidates.retention)) + "／先取りの候補：" + esc(nm(al.candidates.preview)) + "／もう少し先へ：" + esc(nm(al.candidates.challenge)) + "</li></ul>" +
      '<div class="table-wrap"><table><thead><tr><th>枠</th><th>スキル</th><th>重み</th><th>重みから見た時間</th><th>最小〜最大</th><th>配分</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<p class="small">最終の配分：' + esc(al.final.map(function (x) { return x.minutes + "分 " + (SC.planner.TYPE_LABEL[x.type] || x.type) + "：" + nm(x.skill); }).join(" ／ ")) + "</p>" +
      (al.excluded.length ? '<p class="small muted">入れなかった候補：' + esc(al.excluded.map(function (x) { return nm(x.skill) + "（" + x.why + "）"; }).join("、")) + "</p>" : "") + "</section>";
  }

  function viewPlanDebug() {
    var input = plannerInput();
    var plan = buildToday(true);
    var P = SC.planner, LV = P.LEVEL_JA;
    var set = ST.settings();
    function candRows(list, extra) {
      if (!list.length) return '<tr><td colspan="3" class="muted">なし</td></tr>';
      return list.map(function (c) {
        return "<tr><td>" + esc(E.SKILLS[c.skill].label) + "</td><td>" + (LV[c.level] || "") + "</td><td>" + esc(extra(c)) + "</td></tr>";
      }).join("");
    }
    var dbg = plan.debug || { candidates: { p1: [], p2: [], p3: [], p4: [] }, excluded: [], log: [] };
    var cand = dbg.candidates;
    var states = input.states;
    var stateRows = E.SKILL_ORDER.map(function (k) {
      var s = states[k];
      if (!s) return "";
      return "<tr><td>" + esc(s.skill) + "</td><td>" + esc(E.STATUS_VIEW[s.learning_status].label) + "</td><td>" + s.confidence.toFixed(2) + "</td><td>" +
        [s.basic, s.standard, s.application, s.retention].map(function (x) { return x === "pass" ? "○" : x === "needs_review" ? "△" : "−"; }).join(" ") + "</td></tr>";
    }).join("");
    var sessRows = (plan.sessions || []).map(function (s) {
      return "<tr><td>" + s.minutes + "分</td><td>" + esc(s.type) + "<br><span class=\"muted small\">" + esc(s.role) + "</span></td><td>" + esc(s.skill_label) + "（" + esc(s.level_label) + "）</td><td>" + esc(s.why) + "</td><td>" +
        s.picks.map(function (p) {
          return esc(p.question_id) + (p.stage > 0 || p.reused ? ' <span class="lv lv-needs_review">' + (p.reused ? "再利用" : "緩和") + "</span>" : "") +
            (p.why ? '<br><span class="muted small">' + esc(p.why) + "</span>" : "");
        }).join("<br>") + "</td></tr>";
    }).join("");
    return '<section class="card"><p class="eyebrow">DEBUG / PLAN</p><h1 class="h-md">今日の学習の生成</h1>' +
      '<p class="small muted">アプリ内の日付：' + esc(new Date(input.now).toLocaleString("ja-JP")) + "（" + (ST.get().debug.time_offset_days || 0) + "日進めています）</p>" +
      '<div class="today-options">' +
        optionChips("set-minutes", set.minutes, P.CONFIG.MINUTES.map(function (m) { return { value: m, label: m + "分" }; })) +
        optionChips("set-goal", set.goal, Object.keys(P.GOALS).map(function (g) { return { value: g, label: P.GOALS[g] + "（" + g + "）" }; })) + "</div>" +
      '<div class="actions"><button class="secondary-button" type="button" data-action="debug-day1">日付を1日進める</button>' +
        '<button class="secondary-button" type="button" data-action="debug-days-reset">日付を元に戻す</button>' +
        '<a class="secondary-button link-button" href="./?debug=1">アプリへ</a></div></section>' +
      '<section class="card"><h2 class="h-sm">入力</h2><div class="table-wrap"><table><tbody>' +
        "<tr><th>school_progress</th><td>" + esc(JSON.stringify(input.school)) + "</td></tr>" +
        "<tr><th>available_minutes</th><td>" + input.minutes + "</td></tr>" +
        "<tr><th>learning_goal</th><td>" + esc(input.goal) + "（" + esc(P.GOALS[input.goal]) + "）</td></tr>" +
        "<tr><th>原因さがしの結論（14日以内）</th><td>" + esc(input.explorations.filter(function (x) { return x.conclusion && x.conclusion.return_to; }).map(function (x) { return x.symptom.label + "→" + E.SKILLS[x.conclusion.return_to].label; }).join("、") || "なし") + "</td></tr>" +
      "</tbody></table></div>" +
      '<h3 class="h-sm">skill_state</h3><div class="table-wrap"><table><thead><tr><th>スキル</th><th>状態</th><th>確かさ</th><th>基 標 応 定</th></tr></thead><tbody>' + stateRows + "</tbody></table></div></section>" +
      allocDebug(dbg.alloc) +
      '<section class="card"><h2 class="h-sm">優先候補</h2>' +
        '<h3 class="small">P1 根本のつまずき</h3><div class="table-wrap"><table><tbody>' + candRows(cand.p1, function (c) { return (c.symptom ? "原因さがし（" + c.symptom + " から）" : "不安定なスキル") + (c.advanced ? "／練習で基礎ができたので標準へ" : ""); }) + "</tbody></table></div>" +
        '<h3 class="small">P2 学校で学習中の単元</h3><div class="table-wrap"><table><tbody>' + candRows(cand.p2, function (c) { return c.preview ? "先取り（まだ習っていない）" : "次に進むレベル"; }) + "</tbody></table></div>" +
        '<h3 class="small">P3 定着の確認</h3><div class="table-wrap"><table><tbody>' + candRows(cand.p3, function (c) { return c.why; }) + "</tbody></table></div>" +
        '<h3 class="small">P4 得意の発展</h3><div class="table-wrap"><table><tbody>' + candRows(cand.p4, function (c) { return "確かさ " + c.confidence.toFixed(2); }) + "</tbody></table></div>" +
        '<h3 class="small">除外したスキル</h3><p class="small">' + (dbg.excluded.map(function (x) { return esc(E.SKILLS[x.skill].label) + "（" + esc(x.why) + "）"; }).join("、") || "なし") + "</p></section>" +
      '<section class="card"><h2 class="h-sm">生成結果' + (plan.fallback ? '<span class="lv lv-needs_review">固定プランで代用</span>' : "") + "</h2>" +
        (plan.fallback ? '<p class="small">理由：' + esc(plan.fallback_reason) + "／固定プラン：" + esc(plan.planKey) + "</p>" : "") +
        '<p class="small"><strong>focus_skill：</strong>' + esc(plan.focus_label || "−") + "　<strong>今日越えること：</strong>" + esc(plan.cross) + "</p>" +
        '<p class="small"><strong>reason：</strong>' + esc(plan.reason || "") + "</p>" +
        '<p class="small"><strong>なぜ今日はこれ？：</strong>' + esc(plan.why) + "</p>" +
        '<h3 class="small">時間配分と選んだ問題（合計 ' + plan.total_minutes + "分）</h3>" +
        '<div class="table-wrap"><table><thead><tr><th>時間</th><th>種類</th><th>スキル</th><th>理由</th><th>問題</th></tr></thead><tbody>' + sessRows + "</tbody></table></div>" +
        composeDebug(dbg.alloc && dbg.alloc.compose, plan) +
        '<h3 class="small">生成の記録</h3><ol class="small muted debug-log">' + dbg.log.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ol></section>" +
      geometryPlanDebug(dbg.geometry);
  }

  // 図形：value / reason の状態・取り違え・原因さがし・今日の学習に入れた種類・時間・理由
  var GEO_KIND_JA = { reason_review: "根拠の確認（reason_review）", geometry_root_review: "図形の性質に戻る（geometry_root_review）", calculation_root_review: "計算側に戻る（calculation_root_review）",
    proof_root_review: "証明のスキルに戻る（proof_root_review）" };
  function geometryPlanDebug(g) {
    if (!g) return "";
    var st = function (x) { return x.attempts ? esc(E.STATUS_VIEW[x.status].label) + " " + x.correct + "/" + x.attempts + (x.confidence != null ? "・確かさ " + x.confidence : "") : "−"; };
    var rows = g.states.map(function (x) {
      return "<tr><td>" + esc(E.SKILLS[x.skill].label) + "</td><td>" + st(x.value) + "</td><td>" + st(x.reason) + "</td><td>" + esc(Object.keys(x.reason.confusions || {}).map(function (k) { return k + "×" + x.reason.confusions[k]; }).join("、") || "−") +
        "</td><td>" + esc(E.STATUS_VIEW[x.overall.status].label + (x.overall.note ? "（" + x.overall.note + "）" : "")) + "</td></tr>";
    }).join("");
    var ex = g.explorations.map(function (x) {
      return "<li>" + esc(E.SKILLS[x.symptom].label) + "：入口 " + esc(x.entry) + " → " + esc(x.return_to ? E.SKILLS[x.return_to].label : "戻る場所なし") + "（" + esc(GEO_KIND_JA[x.type] || x.type || x.kind || "") + "）" +
        (x.diagnostic_target ? '<br><span class="muted">まちがえた面：' + esc(x.wrong_aspect || "−") + "／学び直す場所（diagnostic_target）：" + esc(E.SKILLS[x.diagnostic_target] ? E.SKILLS[x.diagnostic_target].label : x.diagnostic_target) +
          (x.pending && x.pending.length ? "／今回は追わない誤り：" + esc(x.pending.map(function (k) { return E.SKILLS[k] ? E.SKILLS[k].label : k; }).join("・")) : "") + "</span>" : "") + "</li>";
    }).join("");
    var parts = g.parts.map(function (p) {
      return "<tr><td>" + esc(GEO_KIND_JA[p.kind]) + "</td><td>" + esc(E.SKILLS[p.skill].label) + "</td><td>" + p.minutes + "分</td><td>" + esc(p.why) + "</td><td>" + esc(p.picks.join("／")) + "</td></tr>";
    }).join("");
    return '<section class="card"><h2 class="h-sm">図形：今日の学習への接続</h2>' +
      '<h3 class="small">geometry value / reason state</h3>' + (rows ? '<div class="table-wrap"><table><thead><tr><th>スキル</th><th>value（角度・証明の主張）</th><th>reason（根拠）</th><th>reason confusion</th><th>総合</th></tr></thead><tbody>' + rows + "</tbody></table></div>" : '<p class="small muted">図形の記録はまだありません</p>') +
      '<h3 class="small">geometry root cause（最近の原因さがし）</h3>' + (ex ? '<ul class="small debug-log">' + ex + "</ul>" : '<p class="small muted">なし</p>') +
      '<h3 class="small">根拠の確認の候補</h3>' + (g.reason.length ? '<ul class="small debug-log">' + g.reason.map(function (r) { return "<li>" + esc(E.SKILLS[r.skill].label) + "：" + esc(r.why) + "</li>"; }).join("") + "</ul>" : '<p class="small muted">なし（根拠をまちがえた記録がない）</p>') +
      '<h3 class="small">今日の学習に入れた種類</h3>' + (parts ? '<div class="table-wrap"><table><thead><tr><th>種類</th><th>スキル</th><th>時間</th><th>選んだ理由</th><th>問題</th></tr></thead><tbody>' + parts + "</tbody></table></div>" : '<p class="small muted">今日は図形の補強なし</p>') + "</section>";
  }

  // ---------- 図形の図の確認ページ（?debug=figure） ----------
  // 図形の問題ごとに：geometry データ・SVG・描いた角度と本当の角度の差・relation の検算・警告
  function viewFigureDebug() {
    var G = SC.geometry;
    if (FIGURE_TRY && QS[FIGURE_TRY]) return viewFigureTry(QS[FIGURE_TRY]);
    var ids = Object.keys(QS).filter(function (id) { return QS[id].figure && QS[id].figure.type === "geometry"; });
    var ROLE = { answer: "答え", given: "与えた角" };
    var total = 0;
    var items = ids.map(function (id) {
      var q = QS[id], a = G.audit(q);
      total += a.warnings.length;
      var rows = a.angles.map(function (r) {
        return "<tr><td>" + esc(r.label) + "</td><td>" + ROLE[r.role] + "</td><td>" + r.drawn + "°</td><td>" + (r.truth == null ? "−" : r.truth + "°") + "</td><td>" +
          (r.diff == null ? "−" : r.diff + "°") + "</td><td>" + (G.kind(r.drawn) === (r.truth == null ? G.kind(r.drawn) : G.kind(r.truth)) ? "同じ" : "ちがう") + '</td><td class="' + (r.ok ? "geo-ok" : "geo-warn") + '">' + (r.ok ? "OK" : "要修正") + "</td></tr>";
      }).join("");
      var rel = a.relation;
      var relText = rel ? (rel.ok ? '<span class="geo-ok">一致</span>（relation から ' + rel.value + "／答え " + rel.expected + "）" : '<span class="geo-warn">' + esc(rel.messages.join("、")) + "</span>") : "−";
      var steps = q.steps ? q.steps.map(function (st) { return st.id + "：" + (st.aspect === "reason" ? "根拠" : "角度") + "［" + E.SKILLS[st.skill].label + "］"; }).join("／") : "";
      return '<article class="card" id="' + esc(id) + '"><p class="eyebrow">' + esc(id) + "</p><p>" + esc(q.text) + "</p>" +
        '<div class="geo-debug"><div>' + qFigure(q) + "</div><div>" +
        '<div class="table-wrap"><table><thead><tr><th>角</th><th>役わり</th><th>描画</th><th>本当</th><th>差</th><th>分類</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
        '<p class="small"><strong>relation の検算：</strong>' + relText + "</p>" +
        '<p class="small"><strong>図そのものの整合性：</strong>' + (a.checks.length ? a.checks.map(function (c) { return '<span class="' + (c.ok ? "geo-ok" : "geo-warn") + '">' + (c.ok ? "○ " : "× ") + esc(c.name) + "（" + esc(c.detail) + "）</span>"; }).join("<br>") : "−") + "</p>" +
        '<p class="small"><strong>小問：</strong>' + esc(steps || "−") + "</p>" +
        '<p class="small"><strong>説明文：</strong>' + esc(G.describe(q.figure)) + "</p>" +
        '<p class="small"><strong>警告：</strong>' + (a.warnings.length ? '<span class="geo-warn">' + esc(a.warnings.join("／")) + "</span>" : '<span class="geo-ok">なし</span>') + "</p>" +
        '<a class="secondary-button link-button" href="./?debug=figure&try=' + encodeURIComponent(id) + '">この問題を解いてみる</a>' +
        "<details><summary class=\"small\">geometry データ</summary><pre>" + esc(JSON.stringify({ figure: q.figure, relation: q.relation }, null, 1)) + "</pre></details>" +
        "</div></div></article>";
    }).join("");
    return '<section class="card"><p class="eyebrow">DEBUG / FIGURE</p><h1 class="h-md">図形の図</h1>' +
      '<p class="small muted">' + ids.length + "問／警告 " + total + "件。描いた角度は、与えた角度・答えから " + G.CONFIG.MIN_GAP + "° 以上ずらし、鋭角・直角・鈍角の分類は変えない。</p>" +
      '<div class="actions"><a class="secondary-button link-button" href="./?debug=1">アプリへ</a></div></section>' + items;
  }

  // 1問を解く：問題表示 → 回答 → 小問ごとの○× と解説 → 記録された value / reason と、原因さがしの入口
  var ROUTE_JA = { none: "原因さがしはしない", reason: "原因さがしはせず、理由の練習を今日の学習の候補へ", calc: "計算側だけ原因さがし", concept: "図形の性質側から原因さがし" };
  function viewFigureTry(q) {
    var head = '<section class="card narrow"><p class="eyebrow">DEBUG / FIGURE / ' + esc(q.id) + "</p>" +
      '<p class="question small-q">' + esc(q.text) + "</p>" + qFigure(q);
    var back = '<div class="actions"><a class="secondary-button link-button" href="./?debug=figure">図の一覧へ</a></div></section>';
    if (!figTry) {
      return head + '<form class="answer-form" data-form="figtry" novalidate>' + inputFields(q, "f") +
        (message ? '<p class="notice" role="alert">' + esc(message) + "</p>" : "") +
        '<div class="actions"><button class="primary-button" type="submit">答える</button></div></form>' + back;
    }
    var res = figTry.res, steps = q.steps || [];
    var rows = steps.map(function (st, i) {
      var r = res[i], v = figTry.v[st.id];
      var shown = st.type === "choice" ? ((st.choices.filter(function (c) { return c.key === v; })[0] || {}).label || v) : v;
      return "<li><p>" + esc(st.text) + '<span class="muted small">［' + (st.aspect === "reason" ? "根拠" : st.side === "concept" ? "式" : st.side === "calc" ? "計算" : "角度") + "］</span></p>" +
        '<p class="' + (r.correct ? "geo-ok" : "geo-warn") + '">' + (r.correct ? "○ " : "× ") + esc(shown) + (r.correct ? "" : "（答え：" + esc(answerText(st)) + "）") + "</p>" +
        '<p class="small muted">' + esc(st.explanation || "") + "</p></li>";
    }).join("");
    if (q.type === "order" && Array.isArray(figTry.v)) {
      var oc = SC.proof.orderCheck(q, figTry.v), lab = function (k) { return (q.cards.filter(function (c) { return c.key === k; })[0] || {}).label || k; };
      rows = "<li><p>あなたの順番</p><ol>" + figTry.v.map(function (k) { return "<li>" + esc(lab(k)) + "</li>"; }).join("") + "</ol>" +
        '<p class="' + (oc.ok ? "geo-ok" : "geo-warn") + '">' + (oc.ok ? "○ 依存関係を満たしている（見本と順番がちがっても正解）" : "× " + esc(SC.proof.ORDER_JA[oc.tag] || oc.tag) +
          (oc.violation ? "（" + esc(oc.violation.line) + " の前に " + esc(oc.violation.missing.join("・")) + " が必要）" : "")) + "</p></li>";
    }
    var valueOk = res.filter(function (r) { return r.aspect !== "reason"; }).every(function (r) { return r.correct; });
    var reasons = res.filter(function (r) { return r.aspect === "reason"; });
    var reasonOk = reasons.length ? reasons.every(function (r) { return r.correct; }) : null;
    // 原因さがしの入口（定期チェックと同じ R.geometryEntry）
    var ge = R.geometryEntry(q, res, { school: ST.school() });
    var key = ge.entry === "reason_only" ? "reason" : ge.entry === "calc" || ge.entry === "concept" ? ge.entry : "none";
    var side = ge.entry === "calc" ? skillList(ge.calc_prereqs) : ge.entry === "concept" ? skillList(ge.concept_prereqs) + (ge.then_calc ? "（できていれば計算側：" + skillList(ge.calc_prereqs) + "）" : "") : "";
    var st = ST.get().skill_state[q.skill] || {};
    // 証明は「主張（claim）」、図形①は「角度（value）」
    var isProof = !!(q.proof || q.proof_stage), vName = isProof ? "主張" : "角度", vPower = isProof ? "主張する力（claim）" : "角度を求める力（value）";
    var asp = st.value ? "<li>" + vPower + "：" + esc(E.STATUS_VIEW[st.value.status].label) + "・確かさ " + st.value.confidence + "・" + st.value.correct + "/" + st.value.attempts + "</li>" +
      "<li>理由の理解（reason）：" + esc(E.STATUS_VIEW[st.reason.status].label) + "・" + st.reason.correct + "/" + st.reason.attempts +
        (Object.keys(st.reason.confusions).length ? "・取り違え " + esc(JSON.stringify(st.reason.confusions)) : "") + "</li>" +
      "<li>総合：" + esc(E.STATUS_VIEW[st.overall.status].label) + (st.overall.note ? "（" + esc(st.overall.note) + "）" : "") + "</li>" : "";
    return head + '<ol class="bank-steps">' + rows + "</ol>" +
      feedbackBlock(valueOk && reasonOk !== false ? "correct" : "revealed", { explain: q.explanation || "" }) +
      '<h2 class="h-sm">記録と、このあと</h2><ul class="small debug-log">' +
        "<li>" + vName + " " + (valueOk ? "○" : "×") + "／根拠 " + (reasonOk === null ? "聞いていない" : reasonOk ? "○" : "×") + " → " + esc(ROUTE_JA[key]) + (side && side !== "−" ? "（" + esc(side) + "）" : ge.entry === "calc" ? "（計算の前提なし：計算の見直し）" : "") + "</li>" +
        (ge.first_miss_step ? "<li>最初に止まった小問：" + esc(ge.first_miss_step) + "（" + esc(ge.why) + "）</li>" : "") +
        asp + "</ul>" +
      '<div class="actions"><button class="secondary-button" type="button" data-action="figtry-reset">もう一度解く</button></div>' + back;
  }
  function submitFigTry() {
    var q = QS[FIGURE_TRY], v = readInput(q);
    if (L.isBlank(q, v)) { message = "答えを入力してね。"; render(); return; }
    var note = L.answerNote(q, v);
    if (note) { message = note; render(); return; }
    message = "";
    var res = q.type === "steps" ? L.checkSteps(q, v) : plainResults(q, v, L.check(q, v));
    var ctx = { sessionId: null, context: "lesson" };
    if (q.type === "steps") q.steps.forEach(function (st, i) { ST.addAnswer(stepRecord(q, st), stepResult(st, res[i], res[i].correct ? "correct" : "incorrect", false), ctx); });
    else ST.addAnswer(q, plainResult(q, res[0].correct ? "correct" : "incorrect", false, v), ctx);
    figTry = { res: res, v: v };
    render();
  }

  // ---------- 証明の確認ページ（?debug=proof） ----------
  // 証明ごとに：行（役割・主張・根拠・依存関係・スキル）・検証・穴うめの誤答ごとの診断の入口・並べかえの採点の例
  var ROLE_JA2 = { hyp_fact: "仮定", figure_fact: "図から使える事実", condition: "合同条件", use: "合同から言えること" };
  function viewProofDebug() {
    var PF = SC.proof, items = Object.keys(QS).map(function (id) { return QS[id]; }).filter(function (q) { return q.proof || q.proof_stage; });
    var sk = function (k) { return E.SKILLS[k] ? E.SKILLS[k].label : k; };
    var T = Date.parse("2026-10-01T07:00:00Z");
    // この回答を記録したとき、どの skill_state のどの面がどう変わるか（記録のない状態からの before → after）
    function saved(q, res, f, value) {
      var recs = [];
      if (q.type === "steps") q.steps.forEach(function (st, i) {
        recs.push(E.makeAnswerRecord(stepRecord(q, st), stepResult(st, res[i], res[i].correct ? "correct" : "incorrect", false), { userId: "dbg", context: "compass_check", now: T + i * 1000 }));
      });
      else recs.push(E.makeAnswerRecord(q, plainResult(q, res.every(function (r) { return r.correct; }) ? "correct" : "incorrect", false, value !== undefined ? value : res[0].chosen), { userId: "dbg", context: "compass_check", now: T }));
      var rec = q.type === "steps" ? recs.filter(function (r) { return r.question_id === q.id + "#" + f.step; })[0] : recs[0];
      var skill = rec.skill, face = rec.aspect === "reason" ? "reason" : "value";
      var after = E.computeSkillStates(recs, { now: T + 3600e3 })[skill][face];
      return esc(sk(skill)) + "／" + esc(rec.aspect || (q.proof || q.proof_stage ? "claim" : "value")) + "：0/0 → " + after.correct + "/" + after.attempts + "（" + esc(E.STATUS_VIEW[after.status].label) + "）" +
        (face === "reason" && Object.keys(after.confusions || {}).length ? "／" + esc(Object.keys(after.confusions).join("、")) : "");
    }
    // 今回たどる経路（前提が全部まだのとき、追加4問の上限まで）
    function route(q, res) {
      var r = R.simulate(q, res, {}, { now: T, budget: R.CONFIG.BUDGET_INITIAL });
      if (!r.trail) return "−";
      if (r.trail.conclusion && r.trail.conclusion.kind === "reason_only") return "追加の問題なし（根拠だけ記録 → 理由を確認）";
      return R.pathText(r.trail) + (r.asked.length ? "（追加 " + r.asked.length + "問）" : "（追加なし）");
    }
    function rowOf(q, res, value) {
      var g = PF.entry(q, res), f = g.findings[0];
      if (!f) return "";
      var claimR = res.filter(function (r) { return r.aspect !== "reason"; }), reasonR = res.filter(function (r) { return r.aspect === "reason"; });
      var mark = function (list) { return !list.length ? "−" : list.every(function (r) { return r.correct; }) ? "○" : "×"; };
      return "<tr><td>" + esc(f.step || "−") + "</td><td>" + esc(f.line || "−") + "</td><td>" + esc(f.role ? ROLE_JA2[f.role] : "−") + "</td><td>" + esc(String(f.chosen)) + "（" + esc(f.kind || "−") + "）</td>" +
        "<td>" + mark(claimR) + "</td><td>" + mark(reasonR) + "</td><td>" + esc(f.aspect) + "</td><td>" + esc(f.confusion || "−") + "</td><td><strong>" + esc(sk(g.diagnostic_target)) + "</strong>" +
        (g.entry === "reason_only" ? "（根拠だけ）" : g.concept_prereqs.length ? " → " + esc(g.concept_prereqs.map(sk).join(" → ")) : "（そのもの）") + "<br><span class=\"muted\">" + esc(f.route) + "</span></td>" +
        "<td>" + esc((g.required_geometry_skills || []).map(sk).join("・") || "なし") + "</td><td>" + esc(route(q, res)) + "</td>" +
        "<td>" + esc(g.pending_findings.map(function (p) { return p.step + "（" + p.aspect + "）→ " + sk(p.diagnostic_target); }).join("、") || "−") + "</td>" +
        "<td>" + saved(q, res, f, value) + "</td></tr>";
    }
    var HEAD = "<tr><th>小問</th><th>行</th><th>役割</th><th>選んだ答え（種類）</th><th>主張</th><th>根拠</th><th>まちがえた面</th><th>取り違え</th><th>学び直す場所（diagnostic_target）と理由</th><th>使った図形①</th><th>今回たどる経路</th><th>今回は追わない誤り（pending）</th><th>保存先・面・before → after</th></tr>";
    var cards = items.map(function (q) {
      var v = PF.check(q);
      var lines = q.proof ? q.proof.lines.map(function (l) {
        return "<tr><td>" + l.id + "</td><td>" + esc(ROLE_JA2[l.role]) + "</td><td>" + esc(PF.claimText(l.claim)) + "</td><td>" + esc(l.reason) + "</td><td>" + esc((l.depends_on || []).join("・") || "−") + "</td><td>" + esc(sk(PF.ROLE_SKILL[l.role])) + "</td></tr>";
      }).join("") : "";
      var rows = "";
      if (q.type === "steps") {
        q.steps.forEach(function (st) {
          st.choices.filter(function (c) { return c.key !== st.answer; }).forEach(function (c) {
            var vals = {}; q.steps.forEach(function (x) { vals[x.id] = x.id === st.id ? c.key : x.answer; });
            rows += rowOf(q, L.checkSteps(q, vals));
          });
        });
        // 複数の誤り：先の行と後の行を両方まちがえた例（今回は最初の行、後は pending）
        if (q.steps.length >= 2) {
          var first = q.steps[0], last = q.steps[q.steps.length - 1], vals2 = {};
          q.steps.forEach(function (x) { vals2[x.id] = x.answer; });
          vals2[first.id] = first.choices.filter(function (c) { return c.key !== first.answer; })[0].key;
          vals2[last.id] = last.choices.filter(function (c) { return c.key !== last.answer; })[0].key;
          rows += rowOf(q, L.checkSteps(q, vals2)).replace("<tr>", '<tr class="multi">');
        }
      } else if (q.type === "choice") {
        q.choices.filter(function (c) { return c.key !== q.answer; }).forEach(function (c) {
          rows += rowOf(q, [{ id: null, skill: q.skill, correct: false, aspect: q.aspect || "claim", chosen: c.key }]);
        });
      } else if (q.type === "order") {
        // まちがいの例：合同の行を3つ目に置く／（5行なら）結論の行を合同より先に置く
        var ids = q.proof.lines.map(function (l) { return l.id; }), n = ids.length;
        var wrongs = [ids.slice(0, 2).concat([ids[3], ids[2]], ids.slice(4))];
        if (n === 5) wrongs.push(ids.slice(0, 3).concat([ids[4], ids[3]]));
        wrongs.forEach(function (o) { rows += rowOf(q, PF.orderResults(q, o), o); });
      }
      var orders = "";
      if (q.type === "order") {
        var ids2 = q.proof.lines.map(function (l) { return l.id; });
        orders = [ids2, [ids2[2], ids2[0], ids2[1]].concat(ids2.slice(3)), [ids2[1], ids2[2], ids2[0]].concat(ids2.slice(3))].map(function (o) {
          return "<li>" + esc(o.join(" → ")) + "：" + (PF.orderCheck(q, o).ok ? '<span class="geo-ok">正解</span>' : '<span class="geo-warn">×</span>') + "</li>";
        }).join("");
      }
      return '<article class="card" id="' + esc(q.id) + '"><p class="eyebrow">' + esc(q.id) + "（" + esc(q.type) + "）</p><p>" + esc(q.text) + "</p>" +
        '<div class="geo-debug"><div>' + (q.figure ? qFigure(q) : "") + "</div><div>" +
        (lines ? '<div class="table-wrap"><table><thead><tr><th>行</th><th>役割</th><th>主張</th><th>根拠</th><th>先に必要</th><th>スキル</th></tr></thead><tbody>' + lines + "</tbody></table></div>" : "") +
        (v ? '<p class="small"><strong>検証：</strong>' + (v.ok ? '<span class="geo-ok">OK（' + v.checks.length + "項目）</span>" : '<span class="geo-warn">' + esc(v.messages.join("／")) + "</span>") + "</p>" : "") +
        '<p class="small"><strong>使った図形①の性質（required_geometry_skills）：</strong>' + esc(PF.requiredGeometry(q).map(sk).join("・") || "なし（図形①へは戻らない）") + "</p>" +
        (orders ? '<p class="small"><strong>並べかえの正解の例（依存関係）</strong></p><ul class="small debug-log">' + orders + "</ul>" : "") +
        '<a class="secondary-button link-button" href="./?debug=figure&try=' + encodeURIComponent(q.id) + '">この問題を解いてみる</a>' +
        "</div></div>" +
        (rows ? '<p class="small"><strong>誤答ごとの診断</strong>（最後の行の色ちがいは、先の行と後の行の両方をまちがえた例）</p><div class="table-wrap proof-diag"><table><thead>' + HEAD + "</thead><tbody>" + rows + "</tbody></table></div>" : "") +
        "</article>";
    }).join("");
    return '<section class="card"><p class="eyebrow">DEBUG / PROOF</p><h1 class="h-md">証明（図形②：合同と証明）</h1>' +
      '<p class="small muted">' + items.length + "問。まちがえた面（aspect）・学び直す場所（diagnostic_target）・判断の理由（confusion / route）を分けて表示。今回たどるのは最初に止まった誤りだけで、後の誤りは pending に残す。並べかえは依存関係を壊していなければ正解。</p>" +
      '<div class="actions"><a class="secondary-button link-button" href="./?debug=1">アプリへ</a></div></section>' + cards;
  }

  // ---------- 問題バンクの確認ページ（?debug=bank） ----------

  var LEVEL_LABEL = { basic: "基礎", standard: "標準", application: "応用", retention: "定着" };
  var FORMAT_LABEL = { expression: "数式", table: "表", graph: "グラフ", word: "文章", numberline: "数直線", coordinate: "座標", figure: "図形" };

  function answerText(q) {
    var n = SC.figures.num;
    if (q.answer_display) return q.answer_display;
    if (q.type === "number") return n(q.answer);
    if (q.type === "fraction") return String(q.answer);
    if (q.type === "linear") {
      var a = q.answer.a, b = q.answer.b;
      var as = a === 1 ? "" : a === -1 ? "−" : n(a);
      return "y = " + as + "x" + (b === 0 ? "" : b > 0 ? " + " + n(b) : " − " + n(-b));
    }
    if (q.type === "pair") return q.fields.map(function (f) { return f.label + " " + n(q.answer[f.key]); }).join("、");
    if (q.type === "poly") return L.polyText(q.answer);
    if (q.type === "choice") {
      var c = q.choices.filter(function (x) { return x.key === q.answer; })[0];
      return c ? c.label : q.answer;
    }
    return "";
  }

  function bankItem(q) {
    return '<article class="card bank-item" id="' + esc(q.id) + '">' +
      '<div class="bank-meta"><span class="lv lv-pass">' + LEVEL_LABEL[q.level] + (q.evidence_level ? "（" + LEVEL_LABEL[q.evidence_level] + "相当）" : "") + "</span>" +
        '<span class="lv">' + (FORMAT_LABEL[q.format] || "") + "</span>" +
        '<span class="bank-id">' + esc(q.id) + (q.origin === "core" ? "（既存）" : "") + "</span></div>" +
      '<p class="bank-text">' + esc(q.text) + "</p>" +
      qFigure(q) +
      (q.type === "choice" ? '<ol class="bank-choices">' + q.choices.map(function (c) { return "<li>" + esc(c.label) + "</li>"; }).join("") + "</ol>" : "") +
      (q.type === "steps"
        ? '<ol class="bank-steps">' + q.steps.map(function (st) {
            return "<li><p>" + esc(st.text) + "</p>" +
              (st.type === "choice" ? '<ol class="bank-choices">' + st.choices.map(function (c) { return "<li>" + esc(c.label) + "</li>"; }).join("") + "</ol>" : "") +
              '<p class="bank-ans">答え：' + esc(answerText(st)) + ' <span class="muted">［' + esc(E.SKILLS[st.skill].label) + "］</span></p>" +
              '<p class="small muted">' + esc(st.explanation || "") + "</p></li>";
          }).join("") + "</ol>"
        : '<p class="bank-ans">答え：' + esc(answerText(q)) + "</p>") +
      '<p class="small"><strong>ヒント：</strong>' + esc(q.hint || "") + "</p>" +
      '<p class="small"><strong>解説：</strong>' + esc(q.explanation || q.explain || "") + "</p>" +
      '<p class="small muted">前提スキル：' + esc((q.prerequisite_skills || []).map(function (s) { return E.SKILLS[s].label; }).join("、") || "なし") +
        "／使うスキル：" + esc((q.skills_used || []).map(function (s) { return E.SKILLS[s].label; }).join("、")) + "</p>" +
    "</article>";
  }

  function viewBank() {
    var c = SC.bank.count();
    var total = 0;
    var rows = E.SKILL_ORDER.map(function (s) {
      var sum = SC.bank.LEVELS.reduce(function (a, lv) { return a + c[s][lv]; }, 0);
      var target = E.SKILLS[s].unit === "既習" ? SC.bank.TARGETS.base : SC.bank.TARGETS.unit;
      total += sum;
      return "<tr><td>" + esc(E.SKILLS[s].label) + "</td>" + SC.bank.LEVELS.map(function (lv) {
        var need = target[lv] - c[s][lv];
        return "<td>" + c[s][lv] + (target[lv] ? '<span class="muted small"> / ' + target[lv] + "</span>" : "") + (need > 0 ? ' <span class="lv lv-needs_review">あと' + need + "</span>" : "") + "</td>";
      }).join("") + "<td><strong>" + sum + "</strong></td></tr>";
    }).join("");
    var sections = E.SKILL_ORDER.map(function (s) {
      var list = [];
      SC.bank.LEVELS.forEach(function (lv) { SC.bank.index[s][lv].forEach(function (id) { list.push(QS[id]); }); });
      return '<section class="bank-skill"><h2 class="h-sm">' + esc(E.SKILLS[s].label) + '<span class="muted small">（' + list.length + "問）</span></h2>" +
        '<div class="bank-grid">' + list.map(bankItem).join("") + "</div></section>";
    }).join("");
    return '<section class="card"><p class="eyebrow">QUESTION BANK</p><h1 class="h-md">問題バンク（中1〜中2数学：一次方程式・式の計算・連立方程式・一次関数）</h1>' +
      '<p class="small muted">全 ' + total + " 問。数学として正しいか、図と答えが合っているかを確かめるためのページです。ふだんの利用者には表示されません。" +
        "「 / 」のあとは将来の目安の問題数。定期チェックで問題が足りなくなったスキルから順に追加します（目安まであと " +
        SC.bank.shortage().reduce(function (a, s) { return a + s.need; }, 0) + " 問）。</p>" +
      '<div class="table-wrap"><table><thead><tr><th>スキル</th><th>基礎</th><th>標準</th><th>応用</th><th>定着</th><th>計</th></tr></thead><tbody>' + rows + "</tbody></table></div></section>" +
      sections;
  }

  // ---------- 描画 ----------

  var lastScreenKey = "";
  var VIEWS = { home: viewHome, setup: viewSetup, check: viewCheck, bridge: viewBridge, result: viewResult, plan: viewPlan, lesson: viewLesson, reflect: viewReflect, checkResult: viewCheckResult,
    daily: viewDaily, dailyPlan: function () { return todayCard(buildToday(), true); },
    testSetup: viewTestSetup, testPlan: viewTestPlan, parent: viewParent, school: viewSchool, guide: viewGuide };

  function render() {
    var html;
    if (BANK_VIEW || COMPASS_VIEW || PLAN_VIEW || TEST_VIEW || PARENT_DEBUG || MAP_VIEW || SCHOOL_VIEW || FIGURE_VIEW || PROOF_VIEW || PILOT_VIEW) {
      app.innerHTML = '<div class="screen">' + (PILOT_VIEW ? viewPilot() : PROOF_VIEW ? viewProofDebug() : FIGURE_VIEW ? viewFigureDebug() : BANK_VIEW ? viewBank() : COMPASS_VIEW ? viewCompassDebug() : PLAN_VIEW ? viewPlanDebug() : TEST_VIEW ? viewTestDebug() : MAP_VIEW ? viewMapDebug() : SCHOOL_VIEW ? viewSchoolDebug() : viewParentDebug()) + "</div>";
      restartButton.hidden = true;
      return;
    }
    try {
      html = VIEWS[state.screen]();
    } catch (err) {
      // どんな状態でも操作不能にしない
      if (window.console) console.error(err);
      state = freshState();
      html = VIEWS.home();
    }
    // 画面が切り替わったときだけ、ふわっと出す（エラー表示やヒントでは点滅させない）
    var screenKey = state.screen + ":" + state.idx + ":" + state.lesson.step + ":" + (state.daily ? state.daily.si + "." + state.daily.qi : "");
    var enter = screenKey !== lastScreenKey ? " enter" : "";
    lastScreenKey = screenKey;
    // .screen には動き（transform）があるので、メモボタンはその外に置く（画面の右下に固定するため）
    var memo = ST.pilot().active ? '<button class="pilot-memo" type="button" data-action="pilot-memo" title="気になったことを一言メモ（パイロット用）">メモ</button>' : "";
    app.innerHTML = '<div class="screen screen-' + state.screen + enter + '">' + html + "</div>" + memo;
    restartButton.hidden = state.screen === "home";
    save(STATE_KEY, state);
    var f = app.querySelector("[data-autofocus]");
    if (f && window.matchMedia("(min-width: 700px)").matches) f.focus();
  }

  // ---------- 操作 ----------

  function currentQuestion() { return QS[state.queue[state.idx]]; }

  // 小問1つ分の記録。図形の小問は、角度の値（value）か根拠（reason）かを残す
  function stepRecord(q, st) {
    return { id: q.id + "#" + st.id, skill: st.skill, level: q.level, evidence_level: q.evidence_level, unit: q.unit, aspect: st.aspect };
  }
  // 小問のない問題の記録。根拠だけの問題（aspect: "reason"）は、選んだ根拠と取り違えも残す
  function plainResult(q, status, hint, value) {
    var r = { status: status, hintUsed: hint };
    if (q.type === "order" && Array.isArray(value)) {
      r.chosen = value.join(",");
      r.confusion = status === "incorrect" && SC.proof ? SC.proof.orderCheck(q, value).tag : null;
      return r;
    }
    if (q.type === "choice" && value != null && value !== "" && q.aspect !== "reason") r.chosen = value;
    if (q.aspect === "reason" && value != null && value !== "") {
      r.chosen = value;
      r.confusion = status === "incorrect" && SC.geometry ? SC.geometry.confusionOf(q, value) : null;
    }
    return r;
  }
  function stepResult(st, r, s, hint) {
    var chosen = r && r.chosen != null ? r.chosen : null;
    return { status: s, hintUsed: hint, chosen: chosen, confusion: SC.geometry && s === "incorrect" ? SC.geometry.confusionOf(st, chosen) : null };
  }

  // stepResults: 小問つきの問題のとき、小問ごとの正誤（L.checkSteps の結果）
  // 小問のない問題の結果（入口の判定用）。並べかえは依存関係を破った行、選択は選んだ選択肢の種類（kind）
  function plainResults(q, value, correct) {
    if (q.type === "order" && SC.proof && Array.isArray(value)) return SC.proof.orderResults(q, value);
    return [{ id: null, skill: q.skill, correct: correct, aspect: q.aspect || "claim", chosen: value == null || value === "" ? null : value }];
  }

  function recordAnswer(status, stepResults) {
    var id = state.queue[state.idx];
    var q = QS[id];
    var answeredValue = state.lastValue;
    var hint = !!state.hintOpen;
    var ctx = { sessionId: state.sessionId, context: "compass_check" };
    state.answers[id] = { status: status, hintUsed: hint, at: new Date(ST.now()).toISOString() };
    if (q.type === "steps") {
      // 小問ごとに、その小問のスキルで記録する（どの小問で止まったかが理解度に反映される）
      q.steps.forEach(function (st, i) {
        var r = stepResults ? stepResults[i] : null;
        var s = status === "unknown" ? "unknown" : r && r.correct ? "correct" : "incorrect";
        ST.addAnswer(stepRecord(q, st), stepResult(st, r, s, hint), ctx);
      });
      if (stepResults) state.answers[id].steps = L.analyzeSteps(q, stepResults);
    } else {
      ST.addAnswer(q, plainResult(q, status, hint, status === "unknown" ? null : state.lastValue), ctx);
      state.lastValue = null;
    }
    state.idx += 1;
    state.hintOpen = false;
    message = "";
    draft = {};

    // 原因さがし：原因確認の問題なら道すじへ。定期チェックでまちがえたら、その前提をさかのぼりはじめる
    var correctNow = status === "correct";
    var wasProbe = onProbeAnswered(id, correctNow);
    if (state.mode === "periodic" && !wasProbe && R.isGeometry(q.skill)) {
      // 図形：角度（value）と根拠（reason）の結果で、原因さがしの入口を変える
      startGeometryTrail(q, stepResults || (status === "unknown" ? false : plainResults(q, answeredValue, correctNow)));
    } else if (state.mode === "periodic" && !wasProbe && !correctNow) {
      var stepSkill = q.type === "steps" && state.answers[id].steps ? state.answers[id].steps.suspected_skill : null;
      startTrail(q, stepSkill || q.skill, []);
    }

    if (state.mode === "periodic") {
      if (state.idx >= state.queue.length) { finishPeriodic(); go("checkResult"); return; }
      render();
      return;
    }
    if (state.idx === state.basicCount && state.followUps.length === 0) {
      state.followUps = L.followUps(state.answers);
      state.queue = state.queue.slice(0, state.basicCount).concat(state.followUps.map(function (f) { return f.id; }));
      // まちがえた基礎問題ごとに道すじをはじめる。先に決まっている原因確認（C1〜C5）が最初の確認になる
      state.probeBudget = R.CONFIG.BUDGET_INITIAL;
      state.extraMax = state.followUps.length + R.CONFIG.BUDGET_INITIAL;
      SC.BASIC_ORDER.forEach(function (bid) {
        var a = state.answers[bid];
        if (!a || a.status === "correct") return;
        startTrail(QS[bid], QS[bid].skill, state.followUps.filter(function (f) { return f.from === bid; }).map(function (f) { return f.id; }));
      });
      go(state.followUps.length ? "bridge" : "result");
      return;
    }
    if (state.idx >= state.queue.length) { go("result"); return; }
    render();
  }

  function submitCheck() {
    var q = currentQuestion();
    var v = readInput(q);
    if (L.isBlank(q, v)) {
      message = q.type === "pair" ? "両方の欄に答えを入れるか、「わからない」を選んでね。"
        : q.type === "steps" ? "すべての小問に答えるか、「わからない」を選んでね。"
        : q.type === "choice" ? "答えをひとつ選ぶか、「わからない」を選んでね。"
        : "答えを入力するか、「わからない」を選んでね。";
      render();
      return;
    }
    var note = L.answerNote(q, v);
    if (note) { message = note; render(); return; }
    if (q.type === "steps") {
      var res = L.checkSteps(q, v);
      recordAnswer(res.every(function (r) { return r.correct; }) ? "correct" : "incorrect", res);
      return;
    }
    state.lastValue = v;
    recordAnswer(L.check(q, v) ? "correct" : "incorrect");
  }

  // ---------- つまずきの原因さがし（Phase 4） ----------
  // まちがえた問題から前提スキルをさかのぼり、確かめる問題を「次の問題」として1問ずつ差し込む。

  function probeCtx() {
    var d = ST.get();
    // このチェックの中ですでにわかっている結果（同じことを2回きかない）
    var known = {};
    Object.keys(state.answers).forEach(function (qid) {
      var q = QS[qid];
      if (q && q.type !== "steps") known[q.skill] = state.answers[qid].status === "correct";
    });
    return {
      states: d.skill_state, now: ST.now(), budgetLeft: state.probeBudget, known: known, school: ST.school(),
      pickQuestion: function (skill) {
        var r = C.pickProbe({ history: d.answer_history, sessions: d.sessions, now: ST.now() }, skill, state.queue);
        return r ? r.question_id : null;
      }
    };
  }

  function waitingFor(ti) {
    return Object.keys(state.probes).some(function (k) { return state.probes[k].trail === ti && !state.probes[k].done; });
  }

  // 道すじを1歩すすめる。確かめる問題があれば、今の位置（次に出す問題）に差し込む
  function advanceTrail(ti) {
    if (waitingFor(ti)) return; // まだ答えを待っている問題がある
    var p = R.next(state.trails[ti], probeCtx());
    if (!p) return;             // 結論まで進んだ
    state.probes[p.question_id] = { trail: ti, probe: p, done: false };
    state.queue.splice(state.idx, 0, p.question_id);
    if (!p.seed) state.probeBudget--;
    if (state.mode === "periodic") state.basicCount++;
  }

  // q をまちがえたので、skill から原因をさがしはじめる。seeds は、すでに問題の列に並んでいる原因確認問題
  function startTrail(q, skill, seeds) {
    if (state.trails.some(function (t) { return t.symptom.skill === skill; })) return; // 同じスキルは1本だけ
    if (ST.schoolSkillStatus(skill) === "not_learned") return; // 学校でまだ習っていないところは、原因さがしをしない（未学習は苦手ではない）
    var trail = R.start({ question: q, skill: skill, seeds: seeds || [], now: ST.now() });
    state.trails.push(trail);
    var ti = state.trails.length - 1;
    R.takeSeeds(trail).forEach(function (p) { state.probes[p.question_id] = { trail: ti, probe: p, done: false }; });
    advanceTrail(ti);
  }

  // 図形の問題：角度○・根拠× は理由だけ記録（原因さがしの問題は出さない）。角度× は入口（図形側／計算側）を決めてさかのぼる。
  // 学校でまだ習っていない図形スキルは、苦手にせず原因さがしもしない
  function startGeometryTrail(q, results) {
    var g = R.geometryEntry(q, results, { school: ST.school() });
    if (g.entry === "none" || g.entry === "not_learned") return;
    if (state.trails.some(function (t) { return t.symptom.skill === g.skill; })) return; // 同じスキルは1本だけ
    if (g.entry === "reason_only") { state.trails.push(R.reasonOnly(q, g, ST.now())); return; }
    state.trails.push(R.start({ question: q, geometry: g, now: ST.now() }));
    advanceTrail(state.trails.length - 1);
  }

  // 原因さがしの問題に答えたら、道すじに結果を渡して次へ。原因さがしの問題でなければ false
  function onProbeAnswered(qid, correct) {
    var info = state.probes[qid];
    if (!info || info.done) return false;
    info.done = true;
    R.answer(state.trails[info.trail], info.probe, correct);
    if (correct && !info.probe.seed) skipConfirmedLater(info.probe.skill);
    advanceTrail(info.trail);
    return true;
  }

  // 原因さがしで「できている」とわかったスキルに、このあと予定している問題が残っていれば、原則として省略する
  function skipConfirmedLater(skill) {
    state.skipped = state.skipped || [];
    var hint = !!(state.answers[state.queue[state.idx - 1]] || {}).hintUsed;
    var wrongInSession = Object.keys(state.answers).some(function (id) {
      var q = QS[id];
      return q && q.skill === skill && state.answers[id].status !== "correct";
    });
    for (var i = state.idx; i < state.queue.length; i++) {
      var id = state.queue[i];
      if (state.probes[id] || !QS[id] || QS[id].skill !== skill) continue; // 原因さがしの問題はそのまま
      var dec = R.skipDecision(skill, ST.get().skill_state[skill], { hintUsed: hint, wrongInSession: wrongInSession });
      state.skipped.push({ question_id: id, skill: skill, skipped: dec.skip, reason: dec.reason });
      if (dec.skip) {
        state.queue.splice(i, 1);
        if (state.mode === "periodic") state.basicCount--;
        i--;
      }
    }
  }

  // チェックの終わりに、道すじをすべて結論まで進めて保存する
  function saveTrails() {
    state.trails.forEach(function (t) {
      if (t.status === "open") R.conclude(t);
      ST.addExploration(t, state.sessionId);
    });
  }

  function trailsCard(trails) {
    var shown = (trails || []).filter(function (t) { return t.conclusion; });
    if (!shown.length) return "";
    var told = {}; // 同じ「戻る場所」にたどりついた道すじは、説明を1回だけにする
    return '<section class="card trail-card"><h2 class="h-sm"><span class="spark" aria-hidden="true">✦</span> 確認した道すじ</h2>' +
      '<p class="small muted">まちがえた問題から、前にある内容をさかのぼって確かめました。○ のところまでは戻らなくてよさそうです。</p>' +
      shown.map(function (t) {
        var c = t.conclusion;
        return '<div class="trail"><ol class="trail-path">' + t.path.map(function (p) {
          var note = p.via === "history" ? "記録から" : p.via === "session" ? "今回の答えから" : p.via === "symptom" ? (p.correct ? "正解" : "まちがえた問題") : p.via === "reason" ? "まちがえた根拠" : "";
          return '<li class="tp ' + (p.correct ? "ok" : "ng") + (p.via === "history" || p.via === "session" ? " hist" : "") + '">' +
            '<span class="tp-mark" aria-hidden="true">' + (p.correct ? "○" : "×") + "</span>" +
            '<span class="tp-label">' + esc(p.label) + (note ? "<small>" + note + "</small>" : "") + "</span></li>";
        }).join("") + "</ol>" +
        (c.return_to && told[c.return_to]
          ? '<p class="small muted">この道すじも「' + esc(E.SKILLS[c.return_to].label) + "」にたどりつきました。</p></div>"
          : (c.return_to ? '<p class="trail-return">戻って練習するところ：<strong>「' + esc(E.SKILLS[c.return_to].label) + "」</strong></p>" : "") +
            '<p class="small">' + esc(c.message) + "</p></div>") + (c.return_to ? (told[c.return_to] = true, "") : "");
      }).join("") + "</section>";
  }

  // 原因さがしで見つかった「戻る場所」が、今の方針より前提に近ければ、今日の学習をそこから始める。
  // 最後のステップは、最初にまちがえた問題への再挑戦にする。
  function applyTrailToPlan(d, plan, trails) {
    var best = R.deepestReturn(trails);
    if (!best) return plan;
    var back = best.conclusion.return_to;
    var cur = d.focusSkill ? d.focusSkill.key : null;
    var order = R.ROOT_ORDER;
    if (cur && order.indexOf(back) >= order.indexOf(cur)) return plan;
    var key = C.planForSkill(back);
    if (!key) return plan;
    d.planKey = key;
    d.focusSkill = { key: back, label: E.SKILLS[back].label, roots: [] };
    var p2 = L.buildPlan(d, state.answers);
    var sq = QS[best.symptom.question_id];
    if (sq && sq.type !== "steps") p2.steps[2] = L.retryStep(sq.id, "つまずいた問題に再挑戦");
    p2.why = best.conclusion.message;
    p2.fromTrail = true;
    return p2;
  }

  // ---------- 今日の学習（Phase 5：自動生成） ----------

  function plannerInput() {
    var d = ST.get(), set = ST.settings();
    return { states: d.skill_state, history: d.answer_history, explorations: d.explorations, school: ST.schoolProgressInfo(),
      minutes: set.minutes, goal: set.goal, now: ST.now() };
  }

  // 自動生成に失敗したとき（エラー・出せる問題がない）は、固定10プランから選ぶ方式に切り替える
  function fallbackPlan(reason) {
    var fp = C.planFromStates(ST.get().skill_state);
    var set = ST.settings();
    return { id: E.makeId("pln", ST.now()), fallback: true, fallback_reason: reason, planKey: fp.planKey, focus_skill: fp.focus,
      focus_label: fp.focus ? E.SKILLS[fp.focus].label : null, total_minutes: 25, goal: set.goal, goal_label: SC.planner.GOALS[set.goal],
      cross: L.buildPlan({ planKey: fp.planKey, skills: [] }, {}).cross, why: "今日は、いつもの3ステップの学習にします。", sessions: [] };
  }

  // テスト対策中なら、テストの日・範囲・残り日数の計画と今日の予定
  // テストの予定：テスト対策モード（ST.testPrep）がなければ、「学校のようす」で登録した次のテストを使う。
  // テスト対策を別の仕組みにしない：どちらでも、今日の学習の配分にテスト範囲の重みが入るだけ
  var SCHOOL_TEST_DAYS = 21; // 学校のようすのテストは、この日数以内になったら配分に入れる
  function testContext() {
    var t = ST.testPrep();
    var now = ST.now();
    if (!t) {
      var nt = ST.school().next_test;
      if (!nt || !nt.date || !nt.units || !nt.units.length) return null;
      var d = SC.testprep.daysLeft(nt.date, now);
      if (d < 0 || d > SCHOOL_TEST_DAYS) return null;
      var range = [];
      nt.units.forEach(function (u) { range = range.concat(SC.testprep.unitSkills(u)); });
      t = { test_date: nt.date, range_skills: range, source: "school" };
    }
    var left = SC.testprep.daysLeft(t.test_date, now);
    var checkedToday = ST.compassHistory().some(function (h) { return h.kind === "range_check" && C.dateKey(Date.parse(h.date)) === C.dateKey(now); });
    // 学校のようすで登録したテストでは、範囲チェックの日を作らない（テスト対策モードをはじめたときだけ）
    var sch = SC.testprep.schedule(t, ST.get().skill_state, now, { rangeCheckedToday: checkedToday || t.source === "school" });
    return { test: t, left: left, schedule: sch, day: sch.days[0] || null, checkedToday: checkedToday };
  }

  var todayCache = null;
  function buildToday(force) {
    var set = ST.settings();
    var tc = testContext();
    var key = [set.minutes, set.goal, ST.get().answer_history.length, C.dateKey(ST.now()), ST.get().debug.time_offset_days,
      tc ? tc.test.test_date + tc.test.range_skills.join(",") + tc.checkedToday : ""].join("|");
    if (!force && todayCache && todayCache.key === key) return todayCache.plan;
    var plan;
    try {
      var input = plannerInput();
      // テスト対策モードをはじめたときだけ、1日目にテスト範囲チェック（学校のようすのテストでは出さない）
      if (tc && tc.test.source !== "school" && tc.left >= 1 && tc.day && tc.day.kind === "range_check") {
        // テスト対策の1日目：まず範囲チェック
        plan = { id: E.makeId("pln", ST.now()), range_check: true, testCtx: tc, total_minutes: 5, goal: "test_preparation", goal_label: "テスト対策",
          cross: "テスト範囲の今の力を確かめる", sessions: [],
          why: "テストまであと" + tc.left + "日。まず範囲のスキルを1問ずつ確かめて、残りの日の計画を作ります。" };
        todayCache = { key: key, plan: plan };
        return plan;
      }
      if (tc && tc.left >= 1 && tc.day) {
        var nextDay = tc.schedule.days[1];
        input.test = { range: tc.test.range_skills, focus: tc.day.skills, kind: tc.day.kind, days_left: tc.left,
          next_note: nextDay ? (nextDay.kind === "final_review" ? "「総仕上げ」" : nextDay.skills.map(function (k) { return "「" + E.SKILLS[k].label + "」"; }).join("と")) : null };
      }
      plan = SC.planner.build(input);
      if (tc) plan.testCtx = tc;
      if (!plan.sessions.length) plan = fallbackPlan("出せる問題が見つからなかった");
    } catch (err) {
      if (window.console) console.error(err);
      plan = fallbackPlan("自動生成でエラー：" + (err && err.message));
    }
    todayCache = { key: key, plan: plan };
    return plan;
  }

  function optionChips(action, current, options) {
    return '<div class="opt-chips" role="radiogroup">' + options.map(function (o) {
      var on = String(o.value) === String(current);
      return '<button type="button" class="opt-chip' + (on ? " selected" : "") + '" role="radio" aria-checked="' + on + '" data-action="' + action + '" data-value="' + esc(o.value) + '">' + esc(o.label) + "</button>";
    }).join("") + "</div>";
  }

  function readinessChips(tc) {
    return '<div class="ready-chips">' + tc.schedule.readiness.map(function (r) {
      return '<span class="rc rc-' + ({ "◎": "top", "○": "ok", "△": "warn", "？": "unk", "・": "later" }[r.mark]) + '"' + (r.mark === "・" ? ' title="学校でまだ習っていない（苦手ではない）"' : "") + "><b>" + r.mark + "</b>" + esc(r.label) + "</span>";
    }).join("") + "</div>";
  }

  // テスト対策中の見出し（あと何日・仕上がり・計画へのリンク）
  // plan：今日の学習。あれば「今日の重点」と、残り日数による学習の目的を出す
  function testHeader(tc, plan) {
    var md = tc.test.test_date.slice(5).replace("-", "/");
    if (tc.left < 0) {
      return '<div class="test-head"><p><strong>テストおつかれさま！</strong>（' + md + "）</p>" +
        '<p class="small muted">テスト対策モードを終えて、いつもの勉強にもどりましょう。</p>' +
        '<button class="secondary-button" type="button" data-action="end-test">いつもの勉強にもどる</button></div>';
    }
    if (tc.left === 0) {
      return '<div class="test-head"><p><strong>今日はテスト本番（' + md + "）</strong></p>" +
        '<p class="small muted">これまでの練習を思い出して、落ち着いてがんばろう。</p>' + readinessChips(tc) + "</div>";
    }
    var focus = plan && plan.focus_text ? '<p class="test-focus">今日の重点：<strong>' + esc(plan.focus_text) + "</strong>" +
      (plan.test && plan.test.stage_ja ? '<span class="small muted">（' + esc(plan.test.stage_ja) + "）</span>" : "") + "</p>" : "";
    return '<div class="test-head"><p>テストまで <strong class="days-left">あと ' + tc.left + " 日</strong>（" + md + "）" +
      (tc.test.source === "school" ? '<span class="small muted">「学校のようす」で登録したテスト</span>' : "") + "</p>" +
      focus + readinessChips(tc) +
      '<button class="text-button" type="button" data-action="to-test-plan">テストまでの計画を見る →</button></div>';
  }

  // ホームと「今日の学習を作る」の両方で使う、今日のプランのカード
  function todayCard(plan, full) {
    var set = ST.settings();
    var tc = plan.testCtx || null;
    var chips =
      '<div class="today-options"><p class="small muted">今日は何分できる？</p>' +
        optionChips("set-minutes", set.minutes, SC.planner.CONFIG.MINUTES.map(function (m) { return { value: m, label: m + "分" }; })) +
      // テストまで7日以内（テスト対策モードなら常に）は、テストに合わせるので目標は選ばない
      (tc && (tc.test.source !== "school" || tc.left <= 7) ? "" : '<p class="small muted">今日の目標</p>' +
        optionChips("set-goal", set.goal, Object.keys(SC.planner.GOALS).map(function (g) { return { value: g, label: SC.planner.GOALS[g] }; }))) + "</div>";
    if (plan.range_check) {
      return '<section class="card today-card' + (full ? " narrow" : "") + '"><p class="eyebrow">TEST</p>' + testHeader(tc, plan) +
        '<div class="today-cross"><span>今日越えること</span><strong>「' + esc(plan.cross) + "」</strong></div>" +
        '<p class="small muted">範囲の ' + tc.day.skills.length + " スキルを1問ずつ（約" + Math.max(3, tc.day.skills.length) + "分）</p>" +
        '<button class="primary-button big full" type="button" data-action="start-range-check">テスト範囲チェックをはじめる</button>' +
        '<div class="why"><h2>なぜ今日はこれ？</h2><p>' + esc(plan.why) + "</p></div></section>";
    }
    var timeline = plan.fallback ? "" :
      '<ol class="timeline compact">' + plan.sessions.map(function (s) {
        return '<li><span class="min">' + s.minutes + "分</span><div><strong>" + esc(s.type_label) + "</strong><p class=\"small muted\">" +
          esc(s.skill_label) + "（" + esc(s.level_label) + "）・" + s.questions.length + "問</p>" + (s.note ? '<p class="small">' + esc(s.note) + "</p>" : "") + "</div></li>";
      }).join("") + "</ol>";
    return '<section class="card today-card' + (full ? " narrow" : "") + '">' +
      '<p class="eyebrow">' + (tc ? "TEST" : "TODAY") + "</p>" +
      (tc ? testHeader(tc, plan) : "") +
      '<div class="today-cross"><span>今日越えること</span><strong>「' + esc(plan.cross) + "」</strong></div>" +
      '<p class="today-meta">今日の学習 <strong>' + plan.total_minutes + "分</strong>" + (plan.goal_label ? "・" + esc(plan.goal_label) : "") + "</p>" +
      chips + timeline +
      '<button class="primary-button big full" type="button" data-action="start-daily">今日の学習をはじめる</button>' +
      '<div class="why"><h2>なぜ今日はこれ？</h2><p>' + esc(plan.why) + "</p></div>" +
      (tc ? "" : '<button class="text-button" type="button" data-action="to-test-setup">テストが近い？ テストの予定を入れる →</button>') +
      (full ? '<button class="text-button" type="button" data-action="to-result">← 現在地にもどる</button>' : "") +
    "</section>";
  }

  // ---------- テスト対策の画面 ----------

  function viewTestSetup() {
    var set = ST.settings();
    var today = SC.testprep.dateKey(ST.now());
    // テスト範囲は単元ごとに選ぶ（中2：連立方程式・一次関数）。いま学校で学習中の単元にはじめから印を付ける
    var cur = ST.currentUnit();
    // 学校のようすで登録した次のテスト（日付・範囲）を初期値にする。ここで変えてもよい
    var nt = ST.school().next_test;
    var ntOk = nt && nt.date && SC.testprep.daysLeft(nt.date, ST.now()) >= 0;
    var defUnits = ntOk && nt.units && nt.units.length ? nt.units : [cur];
    var rangeUnits = SC.testprep.RANGE_UNITS;
    var inUnits = [];
    rangeUnits.forEach(function (u) { inUnits = inUnits.concat(SC.testprep.unitSkills(u)); });
    var base = E.SKILL_ORDER.filter(function (k) { return inUnits.indexOf(k) === -1; });
    function box(k, on) {
      return '<label class="radio-chip"><input type="checkbox" name="test-range" value="' + k + '"' + (on ? " checked" : "") + "><span>" + esc(E.SKILLS[k].label) + "</span></label>";
    }
    var unitSets = rangeUnits.map(function (u) {
      return '<fieldset class="status-group"><legend>テスト範囲（' + esc(u) + "）" +
        '<button type="button" class="text-button inline" data-action="toggle-range" data-unit="' + esc(u) + '">まとめて選ぶ／外す</button></legend>' +
        SC.testprep.unitSkills(u).map(function (k) { return box(k, defUnits.indexOf(u) !== -1 && ST.schoolSkillStatus(k) !== "not_learned"); }).join("") + "</fieldset>";
    }).join("");
    return '<section class="card narrow">' +
      '<p class="eyebrow">TEST</p><h1 class="h-md">テストの予定を入れよう</h1>' +
      '<p class="small muted">テストの日と範囲から、残りの日の計画を作ります。いつもの学習データをそのまま使います。</p>' +
      '<div class="form-grid"><label class="field" for="test-date"><span>テストの日</span><input id="test-date" type="date" min="' + today + '" value="' + (ntOk ? esc(nt.date) : "") + '"></label></div>' +
      (ntOk ? '<p class="small muted">「学校のようす」で登録したテストの日と範囲を入れてあります。変えてもかまいません。</p>' : "") +
      unitSets +
      '<fieldset class="status-group"><legend>前の学年までの内容も入れる（必要なら）</legend>' + base.map(function (k) { return box(k, false); }).join("") + "</fieldset>" +
      '<p class="small muted">1日の学習時間</p>' +
      optionChips("set-minutes", set.minutes, SC.planner.CONFIG.MINUTES.map(function (m) { return { value: m, label: m + "分" }; })) +
      (message ? '<p class="notice" role="alert">' + esc(message) + "</p>" : "") +
      '<button class="primary-button big full test-save" type="button" data-action="save-test">この予定でテスト対策をはじめる</button>' +
      '<button class="text-button" type="button" data-action="home">← ホームにもどる</button>' +
    "</section>";
  }

  var KIND_JA = { range_check: "範囲チェック", focus: "練習", final_review: "総仕上げ" };
  function viewTestPlan() {
    var tc = testContext();
    if (!tc) { state.screen = "home"; return viewHome(); }
    var rows = tc.schedule.days.map(function (d, i) {
      var md = d.date.slice(5).replace("-", "/");
      return '<li class="' + (i === 0 ? "now" : "") + '"><span class="min">' + (i === 0 ? "今日" : md) + "</span><div><strong>" + KIND_JA[d.kind] + "</strong>" +
        '<p class="small muted">' + esc(d.kind === "final_review" ? "範囲の不安定なところと、まちがえた問題" : d.skills.map(function (k) { return E.SKILLS[k].label; }).join("・")) +
        (d.stage ? "／" + esc(SC.testprep.STAGE_JA[d.stage]) : "") + "</p></div></li>";
    }).join("");
    return '<section class="card narrow"><p class="eyebrow">TEST</p><h1 class="h-md">テストまでの計画</h1>' + testHeader(tc).replace(/<button class="text-button"[^>]*>[^<]*<\/button>/, "") +
      '<p class="small muted">仕上がりの低いスキルほど多くの日を使い、前にある内容から順に練習します。毎日の結果で計画は変わります。</p>' +
      '<ol class="timeline compact test-days">' + rows + "</ol>" +
      '<button class="primary-button big full" type="button" data-action="home">今日の学習へ</button>' +
      '<button class="text-button" type="button" data-action="end-test">テスト対策をやめる</button></section>';
  }

  function startDaily() {
    var plan = buildToday();
    var sessionMode = state.mode;
    if (plan.fallback) {
      // 固定プラン（3ステップ）の学習へ
      state = freshState();
      state.mode = "fallback";
      state.fallbackKey = plan.planKey;
      state.fallbackFocus = plan.focus_skill;
      state.sessionId = ST.startSession("daily", ST.currentUnit());
      ST.addPlan(plan);
      state.lesson = { step: 0, results: {} };
      go("lesson");
      return;
    }
    state = freshState();
    state.mode = "daily";
    state.sessionId = ST.startSession("daily", ST.currentUnit());
    var rec = ST.addPlan(plan);
    state.daily = { plan: rec, si: 0, qi: 0, results: {}, from: sessionMode };
    go("daily");
  }

  function dailyCurrent() {
    var d = state.daily;
    var sess = d.plan.sessions[d.si];
    return { d: d, sess: sess, qid: sess.questions[d.qi], q: QS[sess.questions[d.qi]] };
  }

  // 学習画面：パートごとに、ミニ解説 → 問題（1問ずつ）
  // 単元の説明。スキルごとに「大事なこと・例・まちがえやすいところ」（js/guide.js）
  var guideUnit = null;
  function guideBody(g) {
    return '<p>' + esc(g.point) + '</p>' +
      '<div class="example"><span>例</span><p>' + esc(g.example) + '</p></div>' +
      '<p class="guide-trap"><strong>まちがえやすいところ</strong>' + esc(g.trap) + '</p>';
  }
  function viewGuide() {
    var units = E.ALL_UNITS, u = guideUnit && units.indexOf(guideUnit) !== -1 ? guideUnit : E.SELECTABLE_UNITS[0];
    return '<section class="card narrow guide">' +
      '<p class="eyebrow">単元の説明</p><h1 class="h-md">' + esc(u) + '</h1>' +
      '<p class="lead-sm">' + esc(SC.guide.units[u]) + '</p>' +
      '<div class="guide-units" role="group" aria-label="単元を選ぶ">' + units.map(function (x) {
        return '<button type="button" class="guide-unit' + (x === u ? " now" : "") + '" data-action="guide-unit" data-unit="' + esc(x) + '"' + (x === u ? ' aria-current="true"' : "") + '>' + esc(x) + "</button>";
      }).join("") + "</div>" +
      E.UNITS[u].map(function (k) {
        return '<article class="guide-skill"><h2>' + esc(E.SKILLS[k].label) + "</h2>" + guideBody(SC.guide.skills[k]) + "</article>";
      }).join("") +
      '<div class="actions"><button class="secondary-button" type="button" data-action="home">ホームへ戻る</button></div>' +
    "</section>";
  }
  // 今日の学習で開ける説明。定着の確認は自力で思い出す問題なので出さない
  function guidePeek(q) {
    var g = q.level !== "retention" && SC.guide.skills[q.skill];
    return g ? '<details class="guide-peek"><summary>このスキルの説明を見る</summary>' + guideBody(g) + "</details>" : "";
  }

  function viewDaily() {
    var cur = dailyCurrent(), d = cur.d, sess = cur.sess, q = cur.q, plan = d.plan;
    var res = d.results[cur.qid];
    var doneQ = res === "correct" || res === "revealed" || res === "unknown";
    var lastQ = d.qi === sess.questions.length - 1, lastS = d.si === plan.sessions.length - 1;
    var nextLabel = !lastQ ? "次の問題へ" : !lastS ? "次のパートへ" : "今日の学習を終える";
    var nextAction = lastQ && lastS ? "daily-finish" : "daily-next";
    var intro = d.qi === 0 && sess.intro
      ? '<div class="example daily-intro"><span>ミニ解説</span><div><p><strong>' + esc(sess.intro.title) + "</strong></p>" +
        sess.intro.body.map(function (b) { return "<p>" + esc(b) + "</p>"; }).join("") +
        (sess.intro.example ? '<p class="muted">例：' + esc(sess.intro.example) + "</p>" : "") + "</div></div>"
      : "";
    return '' +
      '<section class="card narrow lesson">' +
        '<div class="progress-head"><span class="eyebrow">今日越えること：' + esc(plan.cross) + '</span><span class="q-count">パート ' + (d.si + 1) + " / " + plan.sessions.length + "</span></div>" +
        '<ol class="steps-dots">' + plan.sessions.map(function (_, k) {
          return '<li class="' + (k === d.si ? "now" : k < d.si ? "done" : "") + '"></li>';
        }).join("") + "</ol>" +
        '<h1 class="h-md">' + esc(sess.type_label) + '<span class="min-tag">' + sess.minutes + "分</span></h1>" +
        '<p class="muted small">' + esc(sess.skill_label) + "（" + esc(sess.level_label) + "）・" + (d.qi + 1) + " / " + sess.questions.length + " 問目</p>" +
        intro + guidePeek(q) +
        (sess.type === "preview" ? '<p class="preview-note">先取り：学校でこれから習うところです。まちがえても「苦手」にはなりません。</p>' : "") +
        '<div class="practice">' +
          '<p class="practice-label">やってみよう</p>' +
          '<p class="question small-q">' + esc(q.text) + "</p>" + qFigure(q) +
          (doneQ
            ? feedbackBlock(res === "correct" ? "correct" : "revealed", { explain: q.explanation || q.explain || "" })
            : '<form class="answer-form" data-form="daily" novalidate>' + inputFields(q, "d") +
                (message ? '<p class="notice" role="alert">' + esc(message) + "</p>" : "") +
                (res === "tried" ? '<div class="soft-feedback"><strong>' + (sess.type === "preview" ? "まだ習っていない内容に挑戦しました。今はできなくても大丈夫。" : "おしい！ここはもう少し確認してみよう。") + "</strong><p>ヒント：" + esc(q.hint) + "</p></div>" : "") +
                (state.hintOpen && res !== "tried" ? '<div class="hint"><strong>ヒント</strong><p>' + esc(q.hint) + "</p></div>" : "") +
                '<div class="actions"><button class="primary-button" type="submit">答える</button>' +
                  (res === "tried" ? '<button class="secondary-button" type="button" data-action="daily-reveal">答えと考え方を見る</button>'
                    : (state.hintOpen ? "" : '<button class="secondary-button" type="button" data-action="lesson-hint">' + hintLabel(q) + "</button>") +
                      '<button class="secondary-button soft" type="button" data-action="daily-unknown">わからない</button>') +
                "</div></form>") +
        "</div>" +
        (doneQ ? '<button class="primary-button big full" type="button" data-action="' + nextAction + '">' + nextLabel + "</button>" : "") +
      "</section>";
  }

  // 1問目の答えだけを記録する（ヒントを見て答え直した分は、学習の過程として数えない）
  function recordDaily(q, status, stepResults, value) {
    var sess = dailyCurrent().sess;
    // 確認のパート・定着の確認は「チェック」として記録（理解度のレベル判定に使う）。それ以外は練習
    var context = sess.type === "check" || sess.level === "retention" ? "daily_check" : "lesson";
    var ctx = { sessionId: state.sessionId, context: context };
    var hint = !!state.hintOpen;
    if (q.type === "steps") {
      q.steps.forEach(function (st, i) {
        var r = stepResults ? stepResults[i] : null;
        var s = status === "unknown" ? "unknown" : r && r.correct ? "correct" : "incorrect";
        ST.addAnswer(stepRecord(q, st), stepResult(st, r, s, hint), ctx);
      });
    } else {
      ST.addAnswer(q, plainResult(q, status, hint, value), ctx);
    }
  }

  function submitDaily() {
    var cur = dailyCurrent(), q = cur.q, d = cur.d;
    var v = readInput(q);
    if (L.isBlank(q, v)) {
      message = "答えを入力してね。わからないときは「ヒントを見る」か「わからない」を押してみよう。";
      render();
      return;
    }
    var note = L.answerNote(q, v);
    if (note) { message = note; render(); return; }
    message = "";
    var stepRes = q.type === "steps" ? L.checkSteps(q, v) : null;
    var ok = stepRes ? stepRes.every(function (r) { return r.correct; }) : L.check(q, v);
    if (d.results[cur.qid] === undefined) recordDaily(q, ok ? "correct" : "incorrect", stepRes, v);
    d.results[cur.qid] = ok ? "correct" : "tried";
    if (!ok) draft = {};
    state.hintOpen = false;
    render();
  }

  function finishDaily() {
    var d = state.daily;
    var focus = d.plan.focus_skill;
    ST.finishSession(state.sessionId, { plan_key: "daily", focus_skill: focus, suspected_root_causes: [] });
    ST.updatePlan(d.plan.id, { completed_at: new Date(ST.now()).toISOString(), results: d.results });
    todayCache = null; // 学習結果で、次のプランが変わる
  }

  // ---------- 定期コンパスチェック ----------

  // pre：あらかじめ選んだ問題（テスト範囲チェック・単元のはじめてのチェック）。kind："periodic" | "range_check" | "unit_check"
  function startPeriodic(pre, kind) {
    var check = pre || C.buildCheck(compassInput());
    if (!check.questions.length) { go("home"); return; }
    var skills = check.chosen.map(function (c) { return c.skill; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    state = freshState();
    state.mode = "periodic";
    state.queue = check.questions.slice();
    state.basicCount = state.queue.length;
    // 単元のはじめてのチェックは、最初のチェックと同じだけ原因さがしの問題を追加してよい
    state.sessionId = ST.startSession(kind === "unit_check" ? "compass_check" : "periodic", check.unit || ST.currentUnit());
    state.probeBudget = kind === "unit_check" ? R.CONFIG.BUDGET_INITIAL : R.CONFIG.BUDGET_PERIODIC;
    state.extraMax = state.probeBudget;
    state.periodic = {
      kind: kind || "periodic",
      skills: skills,
      chosen: check.chosen,
      before: C.snapshotSkills(ST.get().skill_state, skills)
    };
    go("check");
  }

  // チェックが終わったら、前後の変化と今日の学習の方針を compass_check_history に残す
  function finishPeriodic() {
    var p = state.periodic;
    saveTrails();
    var states = ST.recompute();
    var after = C.snapshotSkills(states, p.skills);
    var result = C.compare(p.before, after, p.skills);
    var plan = C.planFromStates(states);
    // 原因さがしで、今の方針より前提に近い「戻る場所」が見つかったら、そこから
    var best = R.deepestReturn(state.trails);
    if (best && (!plan.focus || R.ROOT_ORDER.indexOf(best.conclusion.return_to) < R.ROOT_ORDER.indexOf(plan.focus))) {
      plan = { planKey: C.planForSkill(best.conclusion.return_to), focus: best.conclusion.return_to };
    }
    ST.finishSession(state.sessionId, { plan_key: plan.planKey, focus_skill: plan.focus, suspected_root_causes: [] });
    var reasons = {};
    p.chosen.forEach(function (c) { reasons[c.question_id] = c.reason; });
    ST.addCompassCheck({
      id: E.makeId("chk", ST.now()),
      session_id: state.sessionId,
      date: new Date(ST.now()).toISOString(),
      questions: state.queue.slice(),
      extra_count: state.queue.filter(function (_, i) { return isExtraAt(i); }).length, // 追加確認（原因さがし）の問題数
      skills: p.skills.map(function (k) { return E.SKILLS[k].label; }),
      skill_ids: p.skills,
      reasons: reasons,
      before: p.before,
      after: after,
      comment: result.comment,
      plan_key: plan.planKey,
      focus_skill: plan.focus,
      exploration_ids: state.trails.map(function (t) { return t.id; }),
      skipped: state.skipped || [],
      kind: p.kind || "periodic",
      trail_best: best ? { return_to: best.conclusion.return_to, symptom_question: best.symptom.question_id, message: best.conclusion.message } : null
    });
  }

  function submitLesson() {
    var plan = diagnosisAndPlan().plan;
    var i = state.lesson.step;
    var p = plan.steps[i].practice;
    var v = readInput(p);
    if (L.isBlank(p, v)) {
      message = "答えを入力してね。わからないときは「ヒントを見る」を押してみよう。";
      render();
      return;
    }
    message = "";
    var correct = L.check(p, v);
    // 練習は各ステップの「最初の1回」だけを記録する（ヒントを見て答え直した分は学習の過程として数えない）
    if (state.lesson.results[i] === undefined) {
      ST.addAnswer(p, { status: correct ? "correct" : "incorrect", hintUsed: !!state.hintOpen }, { sessionId: state.sessionId, context: "lesson" });
    }
    state.lesson.results[i] = correct ? "correct" : "tried";
    if (state.lesson.results[i] === "tried") draft = {};
    state.hintOpen = false;
    render();
  }

  function restart() {
    state = freshState();
    state.setup.unit = ST.currentUnit();
    state.setup.status = ST.schoolProgress(state.setup.unit);
    go("setup");
  }

  // ---------- 実利用パイロットの記録（?debug=pilot） ----------
  var SCREEN_JA = { home: "ホーム", setup: "チェックの準備", check: "チェックの問題", bridge: "チェックの途中", result: "チェックの結果", plan: "学習プラン", lesson: "学習（3ステップ）",
    reflect: "ふり返り", checkResult: "チェックの結果", daily: "今日の学習の問題", dailyPlan: "今日の学習", testSetup: "テスト対策の準備", testPlan: "テスト対策の計画", parent: "保護者画面", guide: "単元の説明", school: "学校のようす" };
  function pilotMemo() {
    var text = window.prompt("気になったことを一言で（例：このボタンがわかりにくい／この問題はむずかしすぎる）");
    if (!text || !text.trim()) return;
    var qid = null;
    try {
      if (state.screen === "check") qid = state.queue[state.idx] || null;
      if (state.screen === "daily" && state.daily) qid = dailyCurrent().qid;
    } catch (e) { qid = null; }
    var t = ST.now();
    ST.addPilotMemo({ date: SC.pilot.dateKey(t), time: new Date(t).toTimeString().slice(0, 5), screen: SCREEN_JA[state.screen] || state.screen, question: qid, text: text.trim() });
    window.alert("メモしました。");
  }
  function downloadText(text, name, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }
  function viewPilot() {
    var P = SC.pilot, pl = ST.pilot(), list = P.days(ST.get()), today = P.dateKey(ST.now());
    if (!list.some(function (d) { return d.date === today; })) list.unshift(P.days({ pilot: { notes: (function () { var o = {}; o[today] = {}; return o; })() } })[0]);
    var catOpts = function (sel) {
      return '<optgroup label="すぐ直す">' + P.CATEGORIES.filter(function (c) { return c.urgent; }).map(function (c) { return '<option value="' + c.key + '"' + (sel === c.key ? " selected" : "") + ">" + esc(c.label) + "</option>"; }).join("") + "</optgroup>" +
        '<optgroup label="あとでまとめて判断">' + P.CATEGORIES.filter(function (c) { return !c.urgent; }).map(function (c) { return '<option value="' + c.key + '"' + (sel === c.key ? " selected" : "") + ">" + esc(c.label) + "</option>"; }).join("") + "</optgroup>";
    };
    var STATUS = { open: "未対応", fixed: "直した", hold: "保留" };
    var issues = pl.issues.slice().reverse().map(function (x) {
      var c = P.CAT[x.category] || P.CAT.other;
      return '<li class="pilot-issue' + (c.urgent ? " urgent" : "") + '"><p class="small"><strong>' + esc(c.urgent ? "すぐ直す" : "あとで") + "｜" + esc(c.label) + "</strong>（" + esc(x.date) + "）</p><p>" + esc(x.text) + "</p>" +
        '<select data-pilot-issue="' + esc(x.id) + '">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (x.status === k ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") + "</select></li>";
    }).join("");
    var dayCards = list.map(function (d) {
      var auto = '<ul class="small debug-log">' +
        "<li>学校の進度：" + esc(d.school || "（今日の学習を開くと記録されます）") + (d.test_date ? "／次のテスト " + esc(d.test_date) : "") + "</li>" +
        "<li>学習可能時間：" + (d.available_minutes ? d.available_minutes + "分" : "−") + "</li>" +
        "<li>提案：" + (d.proposed.length ? esc(d.proposed.map(function (x) { return x.label + "「" + x.skill + "」" + x.minutes + "分・" + x.questions + "問"; }).join(" ／ ")) : "−") + "</li>" +
        "<li>実際：" + (d.done.length ? (d.completed ? "完了" : "途中まで") + "｜" + esc(d.done.map(function (x) { return "「" + x.skill + "」" + x.answered + "/" + x.total + "問（正解" + x.correct + "）"; }).join(" ／ ")) : "今日の学習なし") + (d.plan_starts > 1 ? "（開始 " + d.plan_starts + " 回）" : "") + "</li>" +
        (d.checks.length ? "<li>チェック：" + esc(d.checks.map(function (c) { return c.kind + "（" + c.unit + "・" + c.questions + "問・" + c.at + "）"; }).join(" ／ ")) + "</li>" : "") +
        "<li>回答：" + d.answers + "問（まちがい" + d.wrong + "・わからない" + d.unknown + "・ヒント" + d.hints + "）" + (d.span ? "｜" + esc(d.span) : "") + (d.feeling ? "｜ふり返り：" + esc(d.feeling) : "") + "</li>" +
        (d.missed.length ? "<li>まちがえた問題：" + esc(d.missed.join("、")) + "</li>" : "") +
        d.memos.map(function (m) { return "<li>メモ（" + esc(m.time + "・" + m.screen + (m.question ? "・" + m.question : "")) + "）：" + esc(m.text) + "</li>"; }).join("") +
        "</ul>";
      var notes = P.NOTE_FIELDS.map(function (fl) {
        return '<label class="pilot-note"><span class="small">' + esc(fl.label) + '</span><textarea rows="2" data-pilot-note="' + esc(d.date + "|" + fl.key) + '">' + esc(d.note[fl.key] || "") + "</textarea></label>";
      }).join("");
      return '<details class="card pilot-day"' + (d.date === today ? " open" : "") + "><summary><strong>" + esc(d.date) + "</strong>" + (d.date === today ? "（今日）" : "") +
        '<span class="small muted">　' + d.answers + "問" + (d.completed ? "・今日の学習 完了" : "") + "</span></summary>" + auto +
        '<p class="small muted">保護者のメモ（書いたら自動で保存されます。なければ空欄で大丈夫です）</p>' + notes + "</details>";
    }).join("");
    return '<section class="card debug"><h1 class="h-sm">実利用パイロットの記録</h1>' +
      '<p class="small muted">1日の終わりに、その日の欄を5分ほどで書きます。学習の判断には使いません。' + (pl.started ? "開始：" + esc(pl.started) : "") + "</p>" +
      '<div class="actions">' +
        (pl.active ? '<button class="secondary-button" type="button" data-action="pilot-off">メモボタンをしまう</button>' : '<button class="primary-button" type="button" data-action="pilot-on">パイロットを始める（画面にメモボタンを出す）</button>') +
        '<button class="secondary-button" type="button" data-action="pilot-export-md">記録を書き出す（Markdown）</button>' +
        '<button class="secondary-button" type="button" data-action="debug-export">記録を書き出す（JSON）</button>' +
        '<a class="secondary-button link-button" href="./">アプリへ</a></div></section>' +
      '<section class="card"><h2 class="h-sm">見つけたこと</h2>' +
        '<p class="small muted">「すぐ直す」は、学習できない・データが壊れる・明らかに間違った問題・学習判断が大きく誤る、の4つだけ。ほかはパイロットが終わってからまとめて判断します。</p>' +
        '<textarea id="pilot-issue-text" rows="2" placeholder="例：今日の学習で同じ問題が2回出た"></textarea>' +
        '<div class="actions"><select id="pilot-issue-cat">' + catOpts("wording") + '</select><button class="secondary-button" type="button" data-action="pilot-add-issue">追加する</button></div>' +
        (issues ? '<ul class="pilot-issues">' + issues + "</ul>" : '<p class="small muted">まだありません。</p>') + "</section>" +
      dayCards;
  }

  function downloadJSON() {
    var blob = new Blob([ST.exportJSON()], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "study-compass-record-" + new Date(ST.now()).toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  app.addEventListener("input", function (e) {
    var key = e.target.getAttribute && e.target.getAttribute("data-field");
    if (key) box(e.target.getAttribute("data-step"))[key] = e.target.value;
  });

  app.addEventListener("change", function (e) {
    var pn = e.target.getAttribute && e.target.getAttribute("data-pilot-note");
    if (pn) { ST.setPilotNote(pn.split("|")[0], pn.split("|")[1], e.target.value); return; }
    var pi = e.target.getAttribute && e.target.getAttribute("data-pilot-issue");
    if (pi) { ST.updatePilotIssue(pi, { status: e.target.value }); return; }
    if (e.target.name === "study-status") { state.setup.status = e.target.value; render(); }
    if (e.target.name === "study-skill") state.setup.skill = e.target.value;
    // 学校のようす：単元を変えたら、その単元の「どこまで」を出しなおす
    if (e.target.id === "school-unit") {
      var sc = ST.school(), u = e.target.value;
      state.schoolDraft.unit = u;
      state.schoolDraft.skill = sc.units[u].status === "not_learned" ? "__notyet" : (sc.units[u].current_skill || "");
      render();
    }
    if (e.target.name === "school-skill") state.schoolDraft.skill = e.target.value;
    if (e.target.id === "school-test-date") state.schoolDraft.testDate = e.target.value;
    if (e.target.name === "school-test-unit") {
      state.schoolDraft.testUnits = [].slice.call(document.querySelectorAll('input[name="school-test-unit"]:checked')).map(function (i) { return i.value; });
    }
    if (e.target.id === "grade") {
      ST.setGrade(e.target.value);
      state.setup.grade = E.grade();
      state.setup.unit = E.SELECTABLE_UNITS[0];
      state.setup.status = "learning";
      state.setup.skill = "";
      render();
    }
    if (e.target.id === "unit") {
      // 単元を変えたら、その単元の「習った／途中／まだ」を前回の答えから出しなおす
      state.setup.unit = e.target.value;
      // 「今勉強している単元」で選んだので、記録が「まだ」の単元は「習っている途中」から始める
      state.setup.status = ST.schoolProgress(e.target.value) === "notyet" ? "learning" : ST.schoolProgress(e.target.value);
      state.setup.skill = ST.school().units[e.target.value] ? ST.school().units[e.target.value].current_skill || "" : "";
      render();
    }
  });

  // 単元のはじめてのチェック。一次関数は B1〜B5（原因確認 C1〜C5 つき）、ほかの単元は問題バンクの診断用の問題
  function startUnitCheck(unit, status, skill) {
    state = freshState();
    state.setup = { grade: E.grade(), subject: "数学", unit: unit, status: status, skill: skill || "" };
    ST.setCurrentUnit(unit);
    ST.setSchoolProgress(unit, status);
    // 「どこまで進んだ？」で選んだスキルまでを学習済みに（その先は未学習：チェックに出さない・苦手にしない）
    if (status === "learning") ST.setSchool(unit, skill || null, { unitStatus: "learning" });
    todayCache = null;
    if (unit === "一次関数") {
      state.sessionId = ST.startSession("compass_check", unit);
      go("check");
      return;
    }
    startPeriodic(C.unitCheck(unit, ST.school()), "unit_check"); // state を作り直すので、選んだ単元を入れなおす
    state.setup = { grade: E.grade(), subject: "数学", unit: unit, status: status, skill: skill || "" };
    render();
  }

  app.addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target.getAttribute("data-form");
    if (form === "check") submitCheck();
    if (form === "lesson") submitLesson();
    if (form === "daily") submitDaily();
    if (form === "figtry") submitFigTry();
  });

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("[data-action]") : null;
    if (!el) return;
    var action = el.getAttribute("data-action");
    switch (action) {
      case "home":
        if (state.screen !== "home") go("home");
        break;
      case "restart":
        if (state.screen === "setup" || window.confirm("はじめからやり直しますか？（今の途中経過は消えます）")) restart();
        break;
      case "restart-now": restart(); break;
      case "to-setup":
        if (state.screen === "home" && Object.keys(state.answers).length) state = freshState();
        state.setup.unit = ST.currentUnit();
        state.setup.status = ST.schoolProgress(state.setup.unit);
        go("setup");
        break;
      case "start-check":
        startUnitCheck(state.setup.unit || "一次関数", state.setup.status, state.setup.skill);
        break;
      case "reset-data":
        if (window.confirm("この端末に記録した回答と理解度を、すべて消します。元に戻せません。消してもいいですか？")) {
          ST.reset();
          state = freshState();
          go("home");
        }
        break;
      case "debug-days": ST.addDays(3); render(); break;
      case "debug-day1": ST.addDays(1); render(); break;
      case "debug-test-sample":
        ST.setTestPrep({ test_date: SC.testprep.dateKey(ST.now() + 7 * E.DAY), range_skills: SC.testprep.unitSkills(ST.currentUnit()) });
        todayCache = null;
        render();
        break;
      case "debug-days-reset": ST.resetDays(); render(); break;
      case "debug-export": downloadJSON(); break;
      case "pilot-memo": pilotMemo(); break;
      case "pilot-on": ST.setPilotActive(true); render(); break;
      case "pilot-off": ST.setPilotActive(false); render(); break;
      case "pilot-export-md": downloadText(SC.pilot.toMarkdown(ST.get()), "study-compass-pilot-" + SC.pilot.dateKey(ST.now()) + ".md", "text/markdown"); break;
      case "pilot-add-issue": {
        var it = document.getElementById("pilot-issue-text");
        if (!it || !it.value.trim()) break;
        ST.addPilotIssue({ date: SC.pilot.dateKey(ST.now()), text: it.value.trim(), category: document.getElementById("pilot-issue-cat").value });
        render();
        break;
      }
      case "hint": state.hintOpen = true; render(); break;
      case "figtry-reset": figTry = null; draft = {}; render(); break;
      case "lesson-hint": state.hintOpen = true; render(); break;
      case "unknown": recordAnswer("unknown"); break;
      case "continue-check": go("check"); break;
      case "to-result":
        go(state.mode === "periodic" ? "checkResult" : state.mode === "daily" || state.mode === "fallback" ? "home" : "result");
        break;
      case "start-periodic": startPeriodic(); break;
      case "start-unit-check": {
        var us = ST.school(), uu = us.units[us.current_unit];
        startUnitCheck(us.current_unit, ST.schoolProgress(us.current_unit), uu.status === "learning" ? uu.current_skill : null);
        break;
      }
      case "snooze-unit-check":
        ST.setUnitCheckSnooze(ST.school().current_unit, C.dateKey(ST.now()));
        render();
        break;
      case "start-range-check":
        (function () {
          var tc = testContext(), d = ST.get();
          var chk = SC.testprep.rangeCheck({ states: d.skill_state, history: d.answer_history, now: ST.now(), range: tc.test.range_skills }, tc.day.skills);
          startPeriodic(chk, "range_check");
        })();
        break;
      case "to-test-setup": message = ""; go("testSetup"); break;
      case "to-school": state.schoolDraft = null; message = ""; go("school"); break;
      case "school-snooze": ST.setSchoolSnooze(C.dateKey(ST.now())); render(); break;
      case "save-school":
        (function () {
          var dr = state.schoolDraft;
          if (!dr.skill) { message = "どこまで進んだかを1つ選んでね。"; render(); return; }
          if (dr.testDate && SC.testprep.daysLeft(dr.testDate, ST.now()) < 0) { message = "テストの日は、今日より後の日を選んでね。"; render(); return; }
          if (dr.testDate && !dr.testUnits.length) { message = "テスト範囲の単元を1つ以上選んでね。"; render(); return; }
          var notyet = dr.skill === "__notyet";
          ST.setSchool(dr.unit, notyet ? null : dr.skill, { unitStatus: notyet ? "not_learned" : "learning",
            nextTest: dr.testDate ? { date: dr.testDate, units: dr.testUnits.slice() } : null });
          state.schoolDraft = null;
          todayCache = null;
          go("home");
        })();
        break;
      case "toggle-range":
        (function () {
          var ks = SC.testprep.unitSkills(el.getAttribute("data-unit"));
          var inputs = [].slice.call(document.querySelectorAll('input[name="test-range"]')).filter(function (i) { return ks.indexOf(i.value) !== -1; });
          var allOn = inputs.every(function (i) { return i.checked; });
          inputs.forEach(function (i) { i.checked = !allOn; });
        })();
        break;
      case "to-test-plan": go("testPlan"); break;
      case "to-parent": go("parent"); break;
      case "to-guide": go("guide"); break;
      case "guide-unit": guideUnit = el.getAttribute("data-unit"); render(); window.scrollTo(0, 0); break;
      case "save-test":
        (function () {
          var date = (document.getElementById("test-date") || {}).value;
          var range = [].slice.call(document.querySelectorAll('input[name="test-range"]:checked')).map(function (i) { return i.value; });
          if (!date) { message = "テストの日を選んでね。"; render(); return; }
          if (SC.testprep.daysLeft(date, ST.now()) < 0) { message = "テストの日は、今日より後の日を選んでね。"; render(); return; }
          if (!range.length) { message = "テスト範囲を1つ以上選んでね。"; render(); return; }
          ST.setTestPrep({ test_date: date, range_skills: range });
          todayCache = null;
          message = "";
          go("testPlan");
        })();
        break;
      case "end-test":
        if (window.confirm("テスト対策モードを終えて、いつもの勉強にもどりますか？（学習の記録は残ります）")) {
          ST.endTestPrep();
          todayCache = null;
          go("home");
        }
        break;
      case "snooze":
        ST.setSnooze(C.dateKey(ST.now()));
        render();
        break;
      case "choose":
        box(el.getAttribute("data-step")).value = el.getAttribute("data-choice");
        render();
        break;
      case "order-pick":
        (function (b) { b.value = (Array.isArray(b.value) ? b.value : []).concat(el.getAttribute("data-card")); })(box(el.getAttribute("data-step")));
        render();
        break;
      case "order-undo":
        (function (b) { if (Array.isArray(b.value)) b.value = b.value.slice(0, -1); })(box(el.getAttribute("data-step")));
        render();
        break;
      case "order-reset":
        box(el.getAttribute("data-step")).value = [];
        render();
        break;
      case "to-plan":
        // 自動生成の今日の学習へ。失敗したら固定プラン（従来の画面）
        go(buildToday(true).fallback ? "plan" : "dailyPlan");
        break;
      case "set-minutes":
        ST.setSettings({ minutes: Number(el.getAttribute("data-value")) });
        render();
        break;
      case "set-goal":
        ST.setSettings({ goal: el.getAttribute("data-value") });
        render();
        break;
      case "start-daily": startDaily(); break;
      case "daily-unknown":
        (function () {
          var cur = dailyCurrent();
          if (cur.d.results[cur.qid] === undefined) recordDaily(cur.q, "unknown");
          cur.d.results[cur.qid] = "unknown";
          state.hintOpen = false;
          render();
        })();
        break;
      case "daily-reveal":
        state.daily.results[dailyCurrent().qid] = "revealed";
        render();
        break;
      case "daily-next":
        (function () {
          var d = state.daily, sess = d.plan.sessions[d.si];
          if (d.qi < sess.questions.length - 1) d.qi++;
          else { d.si++; d.qi = 0; }
          go("daily");
        })();
        break;
      case "daily-finish":
        finishDaily();
        state.feeling = null;
        go("reflect");
        break;
      case "start-lesson":
        state.lesson = { step: 0, results: {} };
        state.feeling = null;
        go("lesson");
        break;
      case "reveal":
        state.lesson.results[state.lesson.step] = "revealed";
        render();
        break;
      case "next-step":
        state.lesson.step += 1;
        go("lesson");
        break;
      case "to-reflect":
        state.feeling = null;
        go("reflect");
        break;
      case "feeling":
        state.feeling = el.getAttribute("data-feeling");
        ST.setSelfEvaluation(state.sessionId, FEELING_LABEL[state.feeling]);
        if (state.mode === "daily") ST.updatePlan(state.daily.plan.id, { self_evaluation: FEELING_LABEL[state.feeling] });
        render();
        break;
      case "chip":
        var input = document.getElementById(el.getAttribute("data-target")) || app.querySelector('input[data-field="value"]');
        if (!input) break;
        var chip = el.getAttribute("data-chip").replace("−", "-");
        input.value = input.value + (chip === "y =" ? "y=" : chip);
        box(input.getAttribute("data-step")).value = input.value;
        input.focus();
        break;
    }
  });

  render();
})();
