/*
 * Study Compass コンテスト版 — 画面
 * ホーム → 初期設定 → コンパスチェック（基礎5問）→ 追加確認（回答で変わる）
 * → 現在地 → 今日の学習（25分・3ステップ）→ 振り返り
 */
(function () {
  "use strict";

  var SC = window.SC;
  var L = SC.logic;
  var QS = SC.QUESTIONS;
  var STATE_KEY = "study-compass-contest/state/v1";
  var HISTORY_KEY = "study-compass-contest/history/v1";
  var app = document.getElementById("app");
  var restartButton = document.getElementById("restart-button");

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
      feeling: null
    };
  }

  var SCREENS = ["home", "setup", "check", "bridge", "result", "plan", "lesson", "reflect"];
  function restore() {
    var s = load(STATE_KEY);
    if (!s || SCREENS.indexOf(s.screen) === -1 || !Array.isArray(s.queue) || typeof s.answers !== "object") return freshState();
    var ok = s.queue.every(function (id) { return !!QS[id]; });
    if (!ok || s.idx > s.queue.length) return freshState();
    if (s.screen === "check" && s.idx >= s.queue.length) s.screen = "result";
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
    var d = L.diagnose(state.answers);
    return { d: d, plan: L.buildPlan(d, state.answers) };
  }

  // ---------- 入力欄 ----------

  function inputFields(q, prefix) {
    var ph = q.placeholder || "答えを入力";
    if (q.type === "pair") {
      return '<div class="pair">' + q.fields.map(function (f, i) {
        var id = prefix + "-" + f.key;
        return '<label class="field" for="' + id + '"><span>' + esc(f.label) + '</span>' +
          '<input id="' + id + '" data-field="' + f.key + '" autocomplete="off" inputmode="text" value="' + esc(draft[f.key] || "") + '"' +
          (i === 0 ? " data-autofocus" : "") + '></label>';
      }).join("") + "</div>";
    }
    var chips = q.type === "linear"
      ? '<div class="chips" aria-label="入力の補助">' + ["y =", "x", "−", "+"].map(function (c) {
          return '<button type="button" class="chip" data-action="chip" data-chip="' + esc(c) + '">' + esc(c) + "</button>";
        }).join("") + "</div>"
      : "";
    return '<label class="field single" for="' + prefix + '-v"><span class="sr-only">答え</span>' +
      '<input id="' + prefix + '-v" data-field="value" autocomplete="off" inputmode="text" placeholder="' + esc(ph) + '" value="' + esc(draft.value || "") + '" data-autofocus></label>' + chips;
  }

  function readInput(q) {
    if (q.type === "pair") {
      var v = {};
      q.fields.forEach(function (f) { v[f.key] = draft[f.key] || ""; });
      return v;
    }
    return draft.value || "";
  }

  // ---------- 画面 ----------

  function viewHome() {
    var history = load(HISTORY_KEY) || [];
    return '' +
      '<section class="hero">' +
        '<div class="hero-copy">' +
          '<p class="eyebrow">STUDY COMPASS</p>' +
          '<h1>「わからない」を越えて、<br>自分の可能性へ。</h1>' +
          '<p class="lead">何を勉強したらいいかわからなくても大丈夫。<br>まずは短いチェックで、今の自分の現在地を見つけよう。</p>' +
          '<button class="primary-button big" type="button" data-action="to-setup">コンパスチェックをはじめる</button>' +
          '<ul class="assure"><li>約5問からスタート</li><li>分からなくても大丈夫</li><li>ログインなし</li></ul>' +
          (history.length ? '<p class="small muted">これまでの記録：' + history.length + '回（この端末にだけ保存）</p>' : "") +
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
      "</details>";
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
    var isBasic = state.idx < state.basicCount;
    var num = isBasic ? state.idx + 1 : state.idx - state.basicCount + 1;
    var total = isBasic ? state.basicCount : state.queue.length - state.basicCount;
    var pct = Math.round((num - 1) / total * 100);
    var phaseLabel = isBasic ? "コンパスチェック" : q.phase === "standard" ? "形を変えた問題" : "原因をさがす確認";
    return '' +
      '<section class="card narrow question-card">' +
        '<div class="progress-head"><span class="eyebrow">' + phaseLabel + '</span><span class="q-count">' + (isBasic ? "Q" : "追加 ") + num + " / " + total + "</span></div>" +
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + (num - 1) + '"><i style="width:' + pct + '%"></i></div>' +
        '<p class="skill-tag">確認するスキル：' + esc(q.skillLabel) + "</p>" +
        (q.purpose && !isBasic ? '<p class="purpose">' + esc(q.purpose) + "</p>" : "") +
        '<h1 class="question">' + esc(q.text) + "</h1>" +
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
      '<section class="card">' + routeMap(d) + "</section>" +
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
    var lv = { pass: "○", unstable: "△", not_checked: "−" };
    var srows = d.skillState.map(function (s) {
      return "<tr><td>" + esc(s.skill) + "</td><td>" + lv[s.basic] + "</td><td>" + lv[s.standard] + "</td><td>" + lv[s.application] + "</td><td>" + lv[s.retention] + "</td>" +
        '<td><span class="meter"><i style="width:' + Math.round(s.confidence * 100) + '%"></i></span></td></tr>';
    }).join("");
    return '' +
      '<details class="card details">' +
        "<summary>くわしい記録を見る（どう判断したか）</summary>" +
        '<p class="small muted">Study Compass は正解数ではなく、各問題が見ているスキル・前提知識・ヒントの有無・追加確認の結果を組み合わせて判断しています。</p>' +
        '<div class="table-wrap"><table><thead><tr><th>問題</th><th>見たスキル</th><th>結果</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
        '<h3>理解のレベル</h3>' +
        '<div class="table-wrap"><table><thead><tr><th>スキル</th><th>基礎</th><th>標準</th><th>応用</th><th>定着</th><th>たしかさ</th></tr></thead><tbody>' + srows + "</tbody></table></div>" +
        '<p class="small muted">「たしかさ」は1回のチェックでは最大にしません。後日もう一度できたら「定着」に進みます（デモでは未実施）。</p>' +
      "</details>";
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
    var history = load(HISTORY_KEY) || [];
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
          (focus ? '<li><span>' + esc(focus.label) + "</span><strong>もう少し → 練習中（" + solved + "/" + plan.steps.length + " ステップ自力で正解）</strong></li>" : "") +
          '<li><span>定着チェック</span><strong>3日後にもう一度確認（デモでは予定の表示のみ）</strong></li>' +
          '<li><span>記録した回数</span><strong>' + history.length + " 回（この端末のみ）</strong></li>" +
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

  // ---------- 描画 ----------

  var lastScreenKey = "";
  var VIEWS = { home: viewHome, setup: viewSetup, check: viewCheck, bridge: viewBridge, result: viewResult, plan: viewPlan, lesson: viewLesson, reflect: viewReflect };

  function render() {
    var html;
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

  function recordAnswer(status) {
    var id = state.queue[state.idx];
    state.answers[id] = { status: status, hintUsed: !!state.hintOpen, at: new Date().toISOString() };
    state.idx += 1;
    state.hintOpen = false;
    message = "";
    draft = {};
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
      message = q.type === "pair" ? "両方の欄に答えを入れるか、「わからない」を選んでね。" : "答えを入力するか、「わからない」を選んでね。";
      render();
      return;
    }
    recordAnswer(L.check(q, v) ? "correct" : "incorrect");
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
    state.lesson.results[i] = L.check(p, v) ? "correct" : "tried";
    if (state.lesson.results[i] === "tried") draft = {};
    state.hintOpen = false;
    render();
  }

  function saveHistory(feeling) {
    var d = diagnosisAndPlan();
    var history = load(HISTORY_KEY) || [];
    history.push({
      date: new Date().toISOString(),
      unit: state.setup.unit,
      plan: d.plan.key,
      feeling: feeling,
      lesson_results: state.lesson.results,
      answer_history: state.answers,
      skill_state: d.d.skillState
    });
    save(HISTORY_KEY, history.slice(-30));
  }

  function restart() {
    state = freshState();
    state.screen = "setup";
    go("setup");
  }

  app.addEventListener("input", function (e) {
    var key = e.target.getAttribute && e.target.getAttribute("data-field");
    if (key) draft[key] = e.target.value;
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
        go("setup");
        break;
      case "start-check":
        var status = state.setup.status;
        state = freshState();
        state.setup.status = status;
        go("check");
        break;
      case "hint": state.hintOpen = true; render(); break;
      case "lesson-hint": state.hintOpen = true; render(); break;
      case "unknown": recordAnswer("unknown"); break;
      case "continue-check": go("check"); break;
      case "to-result": go("result"); break;
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
        saveHistory(state.feeling);
        render();
        break;
      case "chip":
        var input = app.querySelector('input[data-field="value"]');
        if (!input) break;
        var chip = el.getAttribute("data-chip").replace("−", "-");
        input.value = input.value + (chip === "y =" ? "y=" : chip);
        draft.value = input.value;
        input.focus();
        break;
    }
  });

  render();
})();
