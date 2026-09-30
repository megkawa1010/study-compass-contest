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
      periodic: null     // 定期チェックで選んだスキルと理由
    };
  }

  var SCREENS = ["home", "setup", "check", "bridge", "result", "plan", "lesson", "reflect", "checkResult"];
  function restore() {
    var s = load(STATE_KEY);
    if (!s || SCREENS.indexOf(s.screen) === -1 || !Array.isArray(s.queue) || typeof s.answers !== "object") return freshState();
    var ok = s.queue.every(function (id) { return !!QS[id]; });
    if (!ok || s.idx > s.queue.length) return freshState();
    s.mode = s.mode || "initial";
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
    var d = L.diagnose(state.answers);
    return { d: d, plan: L.buildPlan(d, state.answers) };
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
    return compassNotice() +
      '<section class="hero">' +
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
    return { states: d.skill_state, history: d.answer_history, sessions: d.sessions, now: ST.now(), snoozeDate: ST.snoozeDate() };
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
    var isBasic = state.idx < state.basicCount;
    var num = isBasic ? state.idx + 1 : state.idx - state.basicCount + 1;
    var total = isBasic ? state.basicCount : state.queue.length - state.basicCount;
    var pct = Math.round((num - 1) / total * 100);
    var phaseLabel = periodic ? "定期コンパスチェック" : isBasic ? "コンパスチェック" : q.phase === "standard" ? "形を変えた問題" : "原因をさがす確認";
    return '' +
      '<section class="card narrow question-card">' +
        '<div class="progress-head"><span class="eyebrow">' + phaseLabel + '</span><span class="q-count">' + (isBasic ? "Q" : "追加 ") + num + " / " + total + "</span></div>" +
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + (num - 1) + '"><i style="width:' + pct + '%"></i></div>' +
        '<p class="skill-tag">確認するスキル：' + esc(q.skillLabel) + "</p>" +
        (q.purpose && !isBasic ? '<p class="purpose">' + esc(q.purpose) + "</p>" : "") +
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
        '<p class="small muted">全員に同じ問題を出すのではなく、あなたの答えに合わせて選んでいます。</p>' +
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
    return '<ol class="route" aria-label="一次関数のルートと現在地">' + d.skills.map(function (k) {
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
    ST.finishSession(state.sessionId, {
      plan_key: plan.key,
      focus_skill: d.focusSkill ? d.focusSkill.key : null,
      suspected_root_causes: d.focusSkill ? d.focusSkill.roots : []
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
          '<p class="question small-q">' + esc(p.text) + "</p>" +
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
    var results = state.lesson.results;
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
      '<section class="bank-skill"><h2 class="h-sm">これまでの定期チェック（新しい順・最大5件）</h2>' + (hist || '<p class="small muted">まだありません</p>') + "</section>";
  }

  // ---------- 問題バンクの確認ページ（?debug=bank） ----------

  var LEVEL_LABEL = { basic: "基礎", standard: "標準", application: "応用", retention: "定着" };
  var FORMAT_LABEL = { expression: "数式", table: "表", graph: "グラフ", word: "文章", numberline: "数直線" };

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
  var VIEWS = { home: viewHome, setup: viewSetup, check: viewCheck, bridge: viewBridge, result: viewResult, plan: viewPlan, lesson: viewLesson, reflect: viewReflect, checkResult: viewCheckResult };

  function render() {
    var html;
    if (BANK_VIEW || COMPASS_VIEW) {
      app.innerHTML = '<div class="screen">' + (BANK_VIEW ? viewBank() : viewCompassDebug()) + "</div>";
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
    var screenKey = state.screen + ":" + state.idx + ":" + state.lesson.step;
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
    if (state.mode === "periodic") {
      if (state.idx >= state.queue.length) { finishPeriodic(); go("checkResult"); return; }
      render();
      return;
    }
    if (state.idx === state.basicCount && state.followUps.length === 0) {
      state.followUps = L.followUps(state.answers);
      state.queue = state.queue.slice(0, state.basicCount).concat(state.followUps.map(function (f) { return f.id; }));
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

  // ---------- 定期コンパスチェック ----------

  function startPeriodic() {
    var check = C.buildCheck(compassInput());
    if (!check.questions.length) { go("home"); return; }
    var skills = check.chosen.map(function (c) { return c.skill; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    state = freshState();
    state.mode = "periodic";
    state.queue = check.questions.slice();
    state.basicCount = state.queue.length;
    state.sessionId = ST.startSession("periodic", "一次関数");
    state.periodic = {
      skills: skills,
      chosen: check.chosen,
      before: C.snapshotSkills(ST.get().skill_state, skills)
    };
    go("check");
  }

  // チェックが終わったら、前後の変化と今日の学習の方針を compass_check_history に残す
  function finishPeriodic() {
    var p = state.periodic;
    var states = ST.recompute();
    var after = C.snapshotSkills(states, p.skills);
    var result = C.compare(p.before, after, p.skills);
    var plan = C.planFromStates(states);
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
      focus_skill: plan.focus
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
      case "debug-days-reset": ST.resetDays(); render(); break;
      case "debug-export": downloadJSON(); break;
      case "hint": state.hintOpen = true; render(); break;
      case "lesson-hint": state.hintOpen = true; render(); break;
      case "unknown": recordAnswer("unknown"); break;
      case "continue-check": go("check"); break;
      case "to-result": go(state.mode === "periodic" ? "checkResult" : "result"); break;
      case "start-periodic": startPeriodic(); break;
      case "snooze":
        ST.setSnooze(C.dateKey(ST.now()));
        render();
        break;
      case "choose":
        box(el.getAttribute("data-step")).value = el.getAttribute("data-choice");
        render();
        break;
      case "to-plan": go("plan"); break;
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
