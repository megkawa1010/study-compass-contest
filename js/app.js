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
  ST.recompute(); // 日付によって変わる「次にやること」を、開いた時点の日付で計算し直す
  var COMPASS_VIEW = /(?:^|[?&])debug=compass(?:&|$)/.test(window.location.search.slice(1));
  var PLAN_VIEW = /(?:^|[?&])debug=plan(?:&|$)/.test(window.location.search.slice(1));
  var TEST_VIEW = /(?:^|[?&])debug=test(?:&|$)/.test(window.location.search.slice(1));
  var PARENT_DEBUG = /(?:^|[?&])debug=parent(?:&|$)/.test(window.location.search.slice(1));

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
      setup: { grade: "中学2年", subject: "数学", unit: "一次関数", status: "learning" },
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

  var SCREENS = ["home", "setup", "check", "bridge", "result", "plan", "lesson", "reflect", "checkResult", "daily", "dailyPlan", "testSetup", "testPlan", "parent"];
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
    var chips = q.type === "linear"
      ? '<div class="chips" aria-label="入力の補助">' + ["y =", "x", "−", "+", "/"].map(function (c) {
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

  // ---------- 画面 ----------

  function viewHome() {
    var sessions = ST.finishedSessions();
    var last = sessions[sessions.length - 1];
    // 記録があれば、ホームの中心は「今日の学習」。はじめての人には、まずコンパスチェック
    var hasRecords = ST.get().answer_history.length > 0;
    return (hasRecords ? todayCard(buildToday()) : "") + compassNotice() +
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
      '<details class="card about">' +
        "<summary>このデモについて</summary>" +
        "<ul>" +
          "<li>コンテスト版として、中学2年 数学「一次関数」だけを収録しています。</li>" +
          "<li>点数を出すのではなく、問題ごとに「どのスキル・どの前提知識を見たか」から、つまずきの場所を推定します。</li>" +
          "<li>診断はルール（スキルと前提知識の対応表）で行っています。外部AIへの接続は、このデモでは使っていません。</li>" +
          "<li>名前・学校名などの入力はありません。記録はこの端末のブラウザの中にだけ保存されます。</li>" +
        "</ul>" +
        '<p class="small"><strong>おすすめのデモ手順：</strong>Q1〜Q3は正解（−2、6、7）、Q4とQ5は「わからない」を押す → 追加確認で原因を探す流れが見られます。</p>' +
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
    return { states: d.skill_state, history: d.answer_history, sessions: d.sessions, explorations: d.explorations, now: ST.now(), snoozeDate: ST.snoozeDate() };
  }

  // 定期コンパスチェックのお知らせ。強制はしない（今チェックする / 今日はあとで）
  function compassNotice() {
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
        '<a class="secondary-button link-button" href="./?debug=compass">定期チェックの確認</a>' +
        '<a class="secondary-button link-button" href="./?debug=bank">問題バンク</a>' +
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
        '<p class="muted small">デモ版では「中学2年・数学・一次関数」だけ選べます。</p>' +
        '<div class="form-grid">' +
          sel("grade", "学年", [{ text: "中学2年", selected: true }, { text: "中学1年（準備中）", disabled: true }, { text: "中学3年（準備中）", disabled: true }]) +
          sel("subject", "教科", [{ text: "数学", selected: true }, { text: "英語（準備中）", disabled: true }, { text: "国語・理科・社会（準備中）", disabled: true }]) +
          sel("unit", "今勉強している単元", [{ text: "一次関数", selected: true }, { text: "連立方程式（準備中）", disabled: true }]) +
        "</div>" +
        '<fieldset class="status-group"><legend>一次関数は…</legend>' +
          statuses.map(function (st) {
            return '<label class="radio-chip"><input type="radio" name="study-status" value="' + st[0] + '"' + (s.status === st[0] ? " checked" : "") + "><span>" + st[1] + "</span></label>";
          }).join("") +
        "</fieldset>" +
        '<button class="primary-button big full" type="button" data-action="start-check">現在地をチェックする</button>' +
      "</section>";
  }

  function viewCheck() {
    var id = state.queue[state.idx];
    var q = QS[id];
    var periodic = state.mode === "periodic";
    var probeInfo = state.probes && state.probes[id];
    var isBasic = state.idx < state.basicCount;
    var num = isBasic ? state.idx + 1 : state.idx - state.basicCount + 1;
    var total = isBasic ? state.basicCount : state.queue.length - state.basicCount;
    var pct = Math.round((num - 1) / total * 100);
    var phaseLabel = probeInfo && !probeInfo.probe.seed ? "原因をさがす確認"
      : periodic ? "定期コンパスチェック" : isBasic ? "コンパスチェック" : q.phase === "standard" ? "形を変えた問題" : "原因をさがす確認";
    return '' +
      '<section class="card narrow question-card">' +
        '<div class="progress-head"><span class="eyebrow">' + phaseLabel + '</span><span class="q-count">' + (isBasic ? "Q" : "追加 ") + num + " / " + total + "</span></div>" +
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + (num - 1) + '"><i style="width:' + pct + '%"></i></div>' +
        '<p class="skill-tag">確認するスキル：' + esc(q.skillLabel) + "</p>" +
        (probeInfo && !probeInfo.probe.seed ? '<p class="purpose probe-purpose">' + esc(probeInfo.probe.purpose) + "</p>"
          : q.purpose && !isBasic ? '<p class="purpose">' + esc(q.purpose) + "</p>" : "") +
        '<h1 class="question">' + esc(q.text) + "</h1>" +
        SC.figures.render(q.figure) +
        '<form class="answer-form" data-form="check" novalidate>' +
          inputFields(q, "q") +
          (message ? '<p class="notice" role="alert">' + esc(message) + "</p>" : "") +
          (state.hintOpen ? '<div class="hint"><strong>ヒント</strong><p>' + esc(q.hint) + "</p></div>" : "") +
          '<div class="actions">' +
            '<button class="primary-button" type="submit">答える</button>' +
            (state.hintOpen ? "" : '<button class="secondary-button" type="button" data-action="hint">ヒントを見る</button>') +
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
        (k.roots.length ? '<p class="root">つまずき候補：' + esc(k.roots.join("、")) + "</p>" : "") + "</div></li>";
    }

    return '' +
      '<section class="result-head">' +
        '<p class="eyebrow">RESULT</p>' +
        '<h1 class="h-md">あなたの現在地</h1>' +
        '<p class="muted small">点数ではなく、スキルごとに「どこまで来ているか」を表しています。</p>' +
      "</section>" +
      '<section class="card"><h2 class="card-label">今回のチェック</h2>' + routeMap(d) + "</section>" +
      trailsCard(state.trails) +
      historyCard() +
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

  // これまでの記録（answer_history 全体）から見た現在地。前回のチェックからの変化も出す
  function historyCard() {
    var states = ST.get().skill_state;
    var prev = ST.previousSnapshot(state.sessionId);
    var sessions = ST.finishedSessions().length;
    var rows = E.SKILL_ORDER.filter(function (k) {
      var s = states[k];
      return s && (s.attempt_count || s.learning_status === "not_learned");
    }).map(function (k) {
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
          '<div class="hs-top"><strong>' + esc(s.skill) + '</strong><span class="hs-status">' + v.label + "</span>" + delta + "</div>" +
          (s.attempt_count ? '<div class="hs-meter"><span class="meter wide"><i style="width:' + Math.round(s.confidence * 100) + '%"></i></span></div>' +
            '<div class="hs-levels">' + levels + "</div>" : "") +
          (s.suspected_root_causes.length ? '<p class="root">つまずき候補：' + esc(s.suspected_root_causes.join("、")) + "（可能性）</p>" : "") +
        "</div></li>";
    }).join("");
    return '<section class="card history-card">' +
      '<h2 class="card-label">これまでの記録から見た現在地</h2>' +
      '<p class="small muted">コンパスチェック ' + sessions + " 回分の記録から計算しています。1回の結果だけで決めつけず、記録が増えるほど正確になります。</p>" +
      '<ul class="hs-list">' + rows + "</ul>" +
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
          '<p class="question small-q">' + esc(p.text) + "</p>" + SC.figures.render(p.figure) +
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
    var sessions = ST.finishedSessions().length;
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
      same_good: '<span class="delta">安定</span>', same_weak: '<span class="delta">もう少し</span>' };
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
      '<section class="result-head"><p class="eyebrow">COMPASS CHECK</p><h1 class="h-md">今回わかったこと</h1>' +
        '<p class="muted small">' + entry.questions.length + " 問で、" + esc(entry.skills.join("・")) + " を確かめました。点数ではなく、前回からの変化を見ています。</p></section>" +
      crossed +
      '<section class="card"><ul class="cr-list">' + items + "</ul></section>" +
      trailsCard(ST.explorationsFor(state.sessionId)) +
      '<section class="card discovery"><h2><span class="spark" aria-hidden="true">✦</span> Study Compass のコメント</h2>' +
        "<p>" + nl(entry.comment) + "</p>" +
        '<p class="small muted">1回の結果だけで決めつけず、これからの記録もあわせて現在地を更新していきます。</p></section>' +
      historyCard() +
      '<div class="sticky-cta"><button class="primary-button big full" type="button" data-action="to-plan">今日の学習を作る</button></div>';
  }

  // ---------- 定期コンパスチェックの確認ページ（?debug=compass） ----------

  function viewCompassDebug() {
    var input = compassInput();
    var chk = C.buildCheck({ states: input.states, history: input.history, sessions: input.sessions, now: input.now, rng: SC.bank.seeded(1) });
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
      '<section class="bank-skill"><h2 class="h-sm">これまでの定期チェック（新しい順・最大5件）</h2>' + (hist || '<p class="small muted">まだありません</p>') + "</section>";
  }

  var KIND_LABEL = { gap_found: "前提に原因がありそう", root: "土台まで戻った", in_skill: "前提はできている", not_reproduced: "別の問題ではできた", undetermined: "確かめきれていない" };
  function explorationDebug() {
    return ST.explorations().slice(-5).reverse().map(function (x) {
      var c = x.conclusion || {};
      return '<div class="card bank-item">' +
        '<p class="small"><strong>' + esc(new Date(x.date).toLocaleString("ja-JP")) + "</strong>　症状：" + esc(x.symptom.label) + "（" + esc(x.symptom.question_id) + "）" +
        ' <span class="lv lv-pass">' + esc(KIND_LABEL[c.kind] || "") + "</span></p>" +
        '<p class="small">' + esc(R.pathText(x)) + "</p>" +
        (c.return_to ? '<p class="small">戻る場所：<strong>' + esc(E.SKILLS[c.return_to].label) + "</strong>" +
          (c.solid_skills && c.solid_skills.length ? "／できている前提：" + esc(c.solid_skills.map(function (k) { return E.SKILLS[k].label; }).join("、")) : "") +
          (c.pending_skills && c.pending_skills.length ? "／次回に回す：" + esc(c.pending_skills.map(function (k) { return E.SKILLS[k].label; }).join("、")) : "") + "</p>" : "") +
        '<details><summary class="small">判断の記録</summary><ol class="small muted debug-log">' + x.log.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ol></details>" +
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
    var stumbles = r.stumbles.length
      ? '<ul class="pr-list">' + r.stumbles.map(function (s) { return "<li><p>" + esc(s.text) + "</p></li>"; }).join("") + "</ul>" +
        '<p class="small muted">1回の結果では決めつけず、何度か様子を見たうえでお伝えしています。</p>'
      : '<p class="small muted">いまは、目立ったつまずきは見つかっていません。</p>';
    return head +
      '<section class="card pr-message"><p class="eyebrow">今週のひとこと</p><p class="pr-message-text">' + esc(r.message) + "</p></section>" +
      '<section class="card"><h2 class="h-sm">今週の学習</h2><div class="pr-stats">' +
        '<div><span>学習した日</span><strong>' + w.active_days + ' 日</strong><small>この7日間</small></div>' +
        '<div><span>学習時間</span><strong>' + w.minutes + ' 分</strong><small>目安</small></div>' +
        '<div><span>いまの単元</span><strong>' + esc(w.unit) + "</strong><small>学校：" + ({ done: "習った", learning: "学習中", notyet: "これから" }[w.school_status] || "") + "</small></div>" +
      "</div></section>" +
      '<section class="card"><h2 class="h-sm">最近できるようになったこと</h2>' + growth + "</section>" +
      (r.focus ? '<section class="card"><h2 class="h-sm">いま確認しているところ</h2><p class="pr-focus">「' + esc(r.focus.label) + "」</p><p>" + esc(r.focus.why) + "</p></section>" : "") +
      '<section class="card"><h2 class="h-sm">つまずきの可能性</h2>' + stumbles + "</section>" +
      '<section class="card"><h2 class="h-sm">Study Compass の予定</h2><ol class="pr-next">' + r.next.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></section>" +
      '<section class="card"><h2 class="h-sm">単元の地図</h2><p class="small muted">点数ではなく、いまどの段階にいるかを表しています。</p><ul class="pr-map">' +
        r.map.map(function (m) { return '<li><span class="pr-mark">' + m.mark + "</span><strong>" + esc(m.label) + "</strong><span class=\"muted small\">" + esc(m.word) + "</span></li>"; }).join("") + "</ul></section>" +
      '<p class="small muted center">このページでは、毎回の正誤や点数、ほかの子との比較は表示しません。</p>' +
      '<button class="text-button" type="button" data-action="home">← ホームにもどる</button>';
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
        "日／学習時間 ＝ 完了した今日の学習 " + dbg.week.plan_minutes + "分 ＋ チェック " + dbg.week.check_answers + "問 × 1分 ＝ " + r.week.minutes + "分</p></section>" +
      '<section class="card"><h2 class="h-sm">skill_state（いま）</h2><div class="table-wrap"><table><thead><tr><th>スキル</th><th>状態</th><th>確かさ</th><th>原因候補</th></tr></thead><tbody>' + stateRows + "</tbody></table></div></section>" +
      '<section class="card"><h2 class="h-sm">成長の判定（7日前と比べる）</h2><div class="table-wrap"><table><thead><tr><th>スキル</th><th>状態</th><th>新しくできたレベル</th><th>段階</th><th>判定</th></tr></thead><tbody>' + growthRows + "</tbody></table></div></section>" +
      '<section class="card"><h2 class="h-sm">つまずき候補</h2><div class="table-wrap"><table><thead><tr><th>スキル</th><th>根拠</th><th>14日の×</th><th>表示</th></tr></thead><tbody>' + (stumbleRows || '<tr><td colspan="4">なし</td></tr>') + "</tbody></table></div>" +
        '<p class="small muted">原因さがしで見つかっても、そのあとできるようになったものは表示しない。記録だけの候補は、14日で2回以上の×があるときだけ（1回の×では取り上げない）。</p></section>' +
      '<section class="card"><h2 class="h-sm">次の学習予定</h2><p class="small">今日の学習：' + esc(dbg.next.plan_sessions.join(" / ") || "なし") + "</p>" +
        '<p class="small">次のコンパスチェック：' + (dbg.next.next_check.due ? "すでに時期" : esc(new Date(dbg.next.next_check.at).toLocaleString("ja-JP"))) + "（各スキルの最後の確認＋3日のうち一番早い日）</p>" +
        '<h3 class="small">保護者向けの表示</h3><p class="small">' + esc(r.message) + "</p><ol class=\"small\">" + r.next.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol></section>";
  }

  // ---------- テスト対策の確認ページ（?debug=test） ----------

  function viewTestDebug() {
    var tc = testContext();
    var head = '<section class="card"><p class="eyebrow">DEBUG / TEST</p><h1 class="h-md">テスト対策の確認</h1>' +
      '<p class="small muted">アプリ内の日付：' + esc(new Date(ST.now()).toLocaleString("ja-JP")) + "（" + (ST.get().debug.time_offset_days || 0) + "日進めています）</p>" +
      '<div class="actions"><button class="secondary-button" type="button" data-action="debug-test-sample">テストを7日後に設定（一次関数の5スキル）</button>' +
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
      '<section class="card"><h2 class="h-sm">入力</h2><p class="small">テストの日：' + esc(tc.test.test_date) + "（あと " + tc.left + " 日）／範囲：" +
        esc(tc.test.range_skills.map(function (k) { return E.SKILLS[k].label; }).join("・")) + "／1日 " + ST.settings().minutes + "分／今日の範囲チェック：" + (tc.checkedToday ? "済み" : "まだ") + "</p>" +
      '<h3 class="small">仕上がり（必要度が高いほど多くの日を割り当てる）</h3><div class="table-wrap"><table><thead><tr><th>スキル</th><th>仕上がり</th><th>必要度</th><th>確かさ</th><th></th></tr></thead><tbody>' + ready + "</tbody></table></div></section>" +
      '<section class="card"><h2 class="h-sm">残り日数の計画</h2><div class="table-wrap"><table><thead><tr><th>日付</th><th>種類</th><th>スキル</th><th>メモ</th></tr></thead><tbody>' + days + "</tbody></table></div>" +
        '<ol class="small muted debug-log">' + tc.schedule.log.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ol></section>" +
      '<section class="card"><h2 class="h-sm">今日の学習</h2>' +
        (plan.range_check ? '<p class="small">今日はテスト範囲チェック（' + esc(tc.day.skills.map(function (k) { return E.SKILLS[k].label; }).join("・")) + "）</p>"
          : '<p class="small">' + esc(plan.sessions.map(function (s) { return s.minutes + "分 " + s.type_label + "：" + s.skill_label + "（" + s.level_label + "）"; }).join(" / ")) + "</p>") +
        '<p class="small"><strong>なぜ今日はこれ？：</strong>' + esc(plan.why) + "</p>" +
        (plan.debug ? '<p class="small muted">除外：' + esc(plan.debug.excluded.filter(function (x) { return x.why === "テスト範囲外"; }).map(function (x) { return E.SKILLS[x.skill].label; }).join("・")) + "（テスト範囲外）</p>" : "") +
      "</section>";
  }

  // ---------- 今日の学習の確認ページ（?debug=plan） ----------

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
        '<h3 class="small">生成の記録</h3><ol class="small muted debug-log">' + dbg.log.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ol></section>";
  }

  // ---------- 問題バンクの確認ページ（?debug=bank） ----------

  var LEVEL_LABEL = { basic: "基礎", standard: "標準", application: "応用", retention: "定着" };
  var FORMAT_LABEL = { expression: "数式", table: "表", graph: "グラフ", word: "文章", numberline: "数直線", coordinate: "座標" };

  function answerText(q) {
    var n = SC.figures.num;
    if (q.answer_display) return q.answer_display;
    if (q.type === "number") return n(q.answer);
    if (q.type === "linear") {
      var a = q.answer.a, b = q.answer.b;
      var as = a === 1 ? "" : a === -1 ? "−" : n(a);
      return "y = " + as + "x" + (b === 0 ? "" : b > 0 ? " + " + n(b) : " − " + n(-b));
    }
    if (q.type === "pair") return q.fields.map(function (f) { return f.label + " " + n(q.answer[f.key]); }).join("、");
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
      SC.figures.render(q.figure) +
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
    return '<section class="card"><p class="eyebrow">QUESTION BANK</p><h1 class="h-md">問題バンク（中2数学・一次関数）</h1>' +
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
    testSetup: viewTestSetup, testPlan: viewTestPlan, parent: viewParent };

  function render() {
    var html;
    if (BANK_VIEW || COMPASS_VIEW || PLAN_VIEW || TEST_VIEW || PARENT_DEBUG) {
      app.innerHTML = '<div class="screen">' + (BANK_VIEW ? viewBank() : COMPASS_VIEW ? viewCompassDebug() : PLAN_VIEW ? viewPlanDebug() : TEST_VIEW ? viewTestDebug() : viewParentDebug()) + "</div>";
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
    app.innerHTML = '<div class="screen screen-' + state.screen + enter + '">' + html + "</div>";
    restartButton.hidden = state.screen === "home";
    save(STATE_KEY, state);
    var f = app.querySelector("[data-autofocus]");
    if (f && window.matchMedia("(min-width: 700px)").matches) f.focus();
  }

  // ---------- 操作 ----------

  function currentQuestion() { return QS[state.queue[state.idx]]; }

  // stepResults: 小問つきの問題のとき、小問ごとの正誤（L.checkSteps の結果）
  function recordAnswer(status, stepResults) {
    var id = state.queue[state.idx];
    var q = QS[id];
    var hint = !!state.hintOpen;
    var ctx = { sessionId: state.sessionId, context: "compass_check" };
    state.answers[id] = { status: status, hintUsed: hint, at: new Date(ST.now()).toISOString() };
    if (q.type === "steps") {
      // 小問ごとに、その小問のスキルで記録する（どの小問で止まったかが理解度に反映される）
      q.steps.forEach(function (st, i) {
        var r = stepResults ? stepResults[i] : null;
        var s = status === "unknown" ? "unknown" : r && r.correct ? "correct" : "incorrect";
        ST.addAnswer({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, evidence_level: q.evidence_level, unit: q.unit },
          { status: s, hintUsed: hint }, ctx);
      });
      if (stepResults) state.answers[id].steps = L.analyzeSteps(q, stepResults);
    } else {
      ST.addAnswer(q, { status: status, hintUsed: hint }, ctx);
    }
    state.idx += 1;
    state.hintOpen = false;
    message = "";
    draft = {};

    // 原因さがし：原因確認の問題なら道すじへ。定期チェックでまちがえたら、その前提をさかのぼりはじめる
    var correctNow = status === "correct";
    var wasProbe = onProbeAnswered(id, correctNow);
    if (state.mode === "periodic" && !wasProbe && !correctNow) {
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
    if (q.type === "steps") {
      var res = L.checkSteps(q, v);
      recordAnswer(res.every(function (r) { return r.correct; }) ? "correct" : "incorrect", res);
      return;
    }
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
      states: d.skill_state, now: ST.now(), budgetLeft: state.probeBudget, known: known,
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
    var trail = R.start({ question: q, skill: skill, seeds: seeds || [], now: ST.now() });
    state.trails.push(trail);
    var ti = state.trails.length - 1;
    R.takeSeeds(trail).forEach(function (p) { state.probes[p.question_id] = { trail: ti, probe: p, done: false }; });
    advanceTrail(ti);
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
    return '<section class="card trail-card"><h2 class="h-sm"><span class="spark" aria-hidden="true">✦</span> つまずきの道すじ</h2>' +
      '<p class="small muted">まちがえた問題から、前にある内容をさかのぼって確かめました。○ のところまでは戻らなくてよさそうです。</p>' +
      shown.map(function (t) {
        var c = t.conclusion;
        return '<div class="trail"><ol class="trail-path">' + t.path.map(function (p) {
          var note = p.via === "history" ? "記録から" : p.via === "session" ? "今回の答えから" : p.via === "symptom" ? "まちがえた問題" : "";
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
  function testContext() {
    var t = ST.testPrep();
    if (!t) return null;
    var now = ST.now();
    var left = SC.testprep.daysLeft(t.test_date, now);
    var checkedToday = ST.compassHistory().some(function (h) { return h.kind === "range_check" && C.dateKey(Date.parse(h.date)) === C.dateKey(now); });
    var sch = SC.testprep.schedule(t, ST.get().skill_state, now, { rangeCheckedToday: checkedToday });
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
      if (tc && tc.left >= 1 && tc.day && tc.day.kind === "range_check") {
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
      return '<span class="rc rc-' + ({ "◎": "top", "○": "ok", "△": "warn", "？": "unk" }[r.mark]) + '"><b>' + r.mark + "</b>" + esc(r.label) + "</span>";
    }).join("") + "</div>";
  }

  // テスト対策中の見出し（あと何日・仕上がり・計画へのリンク）
  function testHeader(tc) {
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
    return '<div class="test-head"><p>テストまで <strong class="days-left">あと ' + tc.left + " 日</strong>（" + md + "）</p>" +
      readinessChips(tc) +
      '<button class="text-button" type="button" data-action="to-test-plan">テストまでの計画を見る →</button></div>';
  }

  // ホームと「今日の学習を作る」の両方で使う、今日のプランのカード
  function todayCard(plan, full) {
    var set = ST.settings();
    var tc = plan.testCtx || null;
    var chips =
      '<div class="today-options"><p class="small muted">今日は何分できる？</p>' +
        optionChips("set-minutes", set.minutes, SC.planner.CONFIG.MINUTES.map(function (m) { return { value: m, label: m + "分" }; })) +
      (tc ? "" : '<p class="small muted">今日の目標</p>' +
        optionChips("set-goal", set.goal, Object.keys(SC.planner.GOALS).map(function (g) { return { value: g, label: SC.planner.GOALS[g] }; }))) + "</div>";
    if (plan.range_check) {
      return '<section class="card today-card' + (full ? " narrow" : "") + '"><p class="eyebrow">TEST</p>' + testHeader(tc) +
        '<div class="today-cross"><span>今日越えること</span><strong>「' + esc(plan.cross) + "」</strong></div>" +
        '<p class="small muted">範囲の ' + tc.day.skills.length + " スキルを1問ずつ（約" + Math.max(3, tc.day.skills.length) + "分）</p>" +
        '<button class="primary-button big full" type="button" data-action="start-range-check">テスト範囲チェックをはじめる</button>' +
        '<div class="why"><h2>なぜ今日はこれ？</h2><p>' + esc(plan.why) + "</p></div></section>";
    }
    var timeline = plan.fallback ? "" :
      '<ol class="timeline compact">' + plan.sessions.map(function (s) {
        return '<li><span class="min">' + s.minutes + "分</span><div><strong>" + esc(s.type_label) + "</strong><p class=\"small muted\">" +
          esc(s.skill_label) + "（" + esc(s.level_label) + "）・" + s.questions.length + "問</p></div></li>";
      }).join("") + "</ol>";
    return '<section class="card today-card' + (full ? " narrow" : "") + '">' +
      '<p class="eyebrow">' + (tc ? "TEST" : "TODAY") + "</p>" +
      (tc ? testHeader(tc) : "") +
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
    var unit = SC.testprep.UNIT_SKILLS;
    var base = E.SKILL_ORDER.filter(function (k) { return unit.indexOf(k) === -1; });
    function box(k, on) {
      return '<label class="radio-chip"><input type="checkbox" name="test-range" value="' + k + '"' + (on ? " checked" : "") + "><span>" + esc(E.SKILLS[k].label) + "</span></label>";
    }
    return '<section class="card narrow">' +
      '<p class="eyebrow">TEST</p><h1 class="h-md">テストの予定を入れよう</h1>' +
      '<p class="small muted">テストの日と範囲から、残りの日の計画を作ります。いつもの学習データをそのまま使います。</p>' +
      '<div class="form-grid"><label class="field" for="test-date"><span>テストの日</span><input id="test-date" type="date" min="' + today + '"></label></div>' +
      '<fieldset class="status-group"><legend>テスト範囲（一次関数）</legend>' + unit.map(function (k) { return box(k, true); }).join("") + "</fieldset>" +
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
        '<p class="small muted">' + esc(d.kind === "final_review" ? "範囲をひととおり" : d.skills.map(function (k) { return E.SKILLS[k].label; }).join("・")) + "</p></div></li>";
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
      state.sessionId = ST.startSession("daily", "一次関数");
      ST.addPlan(plan);
      state.lesson = { step: 0, results: {} };
      go("lesson");
      return;
    }
    state = freshState();
    state.mode = "daily";
    state.sessionId = ST.startSession("daily", "一次関数");
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
        intro +
        '<div class="practice">' +
          '<p class="practice-label">やってみよう</p>' +
          '<p class="question small-q">' + esc(q.text) + "</p>" + SC.figures.render(q.figure) +
          (doneQ
            ? feedbackBlock(res === "correct" ? "correct" : "revealed", { explain: q.explanation || q.explain || "" })
            : '<form class="answer-form" data-form="daily" novalidate>' + inputFields(q, "d") +
                (message ? '<p class="notice" role="alert">' + esc(message) + "</p>" : "") +
                (res === "tried" ? '<div class="soft-feedback"><strong>おしい！ここはもう少し確認してみよう。</strong><p>ヒント：' + esc(q.hint) + "</p></div>" : "") +
                (state.hintOpen && res !== "tried" ? '<div class="hint"><strong>ヒント</strong><p>' + esc(q.hint) + "</p></div>" : "") +
                '<div class="actions"><button class="primary-button" type="submit">答える</button>' +
                  (res === "tried" ? '<button class="secondary-button" type="button" data-action="daily-reveal">答えと考え方を見る</button>'
                    : (state.hintOpen ? "" : '<button class="secondary-button" type="button" data-action="lesson-hint">ヒントを見る</button>') +
                      '<button class="secondary-button soft" type="button" data-action="daily-unknown">わからない</button>') +
                "</div></form>") +
        "</div>" +
        (doneQ ? '<button class="primary-button big full" type="button" data-action="' + nextAction + '">' + nextLabel + "</button>" : "") +
      "</section>";
  }

  // 1問目の答えだけを記録する（ヒントを見て答え直した分は、学習の過程として数えない）
  function recordDaily(q, status, stepResults) {
    var sess = dailyCurrent().sess;
    // 確認のパート・定着の確認は「チェック」として記録（理解度のレベル判定に使う）。それ以外は練習
    var context = sess.type === "check" || sess.level === "retention" ? "daily_check" : "lesson";
    var ctx = { sessionId: state.sessionId, context: context };
    var hint = !!state.hintOpen;
    if (q.type === "steps") {
      q.steps.forEach(function (st, i) {
        var r = stepResults ? stepResults[i] : null;
        var s = status === "unknown" ? "unknown" : r && r.correct ? "correct" : "incorrect";
        ST.addAnswer({ id: q.id + "#" + st.id, skill: st.skill, level: q.level, evidence_level: q.evidence_level, unit: q.unit }, { status: s, hintUsed: hint }, ctx);
      });
    } else {
      ST.addAnswer(q, { status: status, hintUsed: hint }, ctx);
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
    message = "";
    var stepRes = q.type === "steps" ? L.checkSteps(q, v) : null;
    var ok = stepRes ? stepRes.every(function (r) { return r.correct; }) : L.check(q, v);
    if (d.results[cur.qid] === undefined) recordDaily(q, ok ? "correct" : "incorrect", stepRes);
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

  // pre：あらかじめ選んだ問題（テスト範囲チェック）。kind："periodic" | "range_check"
  function startPeriodic(pre, kind) {
    var check = pre || C.buildCheck(compassInput());
    if (!check.questions.length) { go("home"); return; }
    var skills = check.chosen.map(function (c) { return c.skill; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    state = freshState();
    state.mode = "periodic";
    state.queue = check.questions.slice();
    state.basicCount = state.queue.length;
    state.sessionId = ST.startSession("periodic", "一次関数");
    state.probeBudget = R.CONFIG.BUDGET_PERIODIC;
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
    state.setup.status = ST.schoolProgress("一次関数");
    go("setup");
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
    if (e.target.name === "study-status") state.setup.status = e.target.value;
  });

  app.addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target.getAttribute("data-form");
    if (form === "check") submitCheck();
    if (form === "lesson") submitLesson();
    if (form === "daily") submitDaily();
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
        state.setup.status = ST.schoolProgress("一次関数");
        go("setup");
        break;
      case "start-check":
        var status = state.setup.status;
        state = freshState();
        state.setup.status = status;
        ST.setSchoolProgress("一次関数", status);
        state.sessionId = ST.startSession("compass_check", "一次関数");
        go("check");
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
        ST.setTestPrep({ test_date: SC.testprep.dateKey(ST.now() + 7 * E.DAY), range_skills: SC.testprep.UNIT_SKILLS.slice() });
        todayCache = null;
        render();
        break;
      case "debug-days-reset": ST.resetDays(); render(); break;
      case "debug-export": downloadJSON(); break;
      case "hint": state.hintOpen = true; render(); break;
      case "lesson-hint": state.hintOpen = true; render(); break;
      case "unknown": recordAnswer("unknown"); break;
      case "continue-check": go("check"); break;
      case "to-result":
        go(state.mode === "periodic" ? "checkResult" : state.mode === "daily" || state.mode === "fallback" ? "home" : "result");
        break;
      case "start-periodic": startPeriodic(); break;
      case "start-range-check":
        (function () {
          var tc = testContext(), d = ST.get();
          var chk = SC.testprep.rangeCheck({ states: d.skill_state, history: d.answer_history, now: ST.now() }, tc.day.skills);
          startPeriodic(chk, "range_check");
        })();
        break;
      case "to-test-setup": message = ""; go("testSetup"); break;
      case "to-test-plan": go("testPlan"); break;
      case "to-parent": go("parent"); break;
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
