/*
 * Study Compass コンテスト版 — 採点・分岐・診断・学習プラン
 * 画面から切り離した純粋な関数だけを置く（Node からもテストできる）。
 * 診断はルールベース。外部AIは使っていない。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});

  // ---------- 答えの読み取り（表記ゆれを吸収） ----------

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[−–—ー‐－―]/g, "-")
      .replace(/[×＊]/g, "*")
      .replace(/\s+/g, "");
  }

  // "3" / "-2" / "1.5" / "3/2" / "-1/2" を数にする。単位（GB・円・分など）は最後に付いていてもよい
  function parseNumber(value) {
    // 角度の「°」「度」、先頭の「x =」も外して読む（x = 65° → 65）
    var s = normalize(value).replace(/^[a-z]=/, "").replace(/(gb|ギガ|個|です|。|円|分|時間|本|℃|°|度|角形|点|冊|回|人|番目|kg|cm|km|m|l|g|%)+$/g, "").replace(/^正/, "");
    return toNumber(s);
  }
  function toNumber(s) {
    s = s.replace(/^\((.*)\)$/, "$1");
    var frac = s.match(/^([+-]?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (frac) return Number(frac[2]) === 0 ? null : Number(frac[1]) / Number(frac[2]);
    if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;
    return Number(s);
  }
  function same(a, b) { return typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-9; }

  // "y=2x-1" / "2x-1" / "y=-1+2x" / "y=1/2x+3" / "y=x/2+3" / "y=(1/2)x" / "y=0.5x" などを {a, b} にする。読めなければ null。
  function parseLinear(value) {
    var s = normalize(value).replace(/\*/g, "");
    s = s.replace(/^y=/, "");
    if (!s || s.indexOf("=") !== -1 || /[^0-9x+\-./()]/.test(s)) return null;
    var terms = s.match(/[+-]?[^+-]+/g);
    if (!terms) return null;
    var a = 0, b = 0, hasX = false;
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      var sign = t.charAt(0) === "-" ? -1 : 1;
      var body = t.replace(/^[+-]/, "");
      var m = body.match(/^\(?([0-9./]*)\)?x(?:\/(\d+(?:\.\d+)?))?$/);
      if (m) {
        var c = m[1] === "" ? 1 : toNumber(m[1]);
        if (c === null) return null;
        if (m[2]) c = c / Number(m[2]);
        a += sign * c; hasX = true;
      } else {
        var k = toNumber(body);
        if (k === null) return null;
        b += sign * k;
      }
    }
    return hasX ? { a: a, b: b } : null;
  }

  // 文字式（多項式）を { 項の文字: 係数 } にする。読めなければ null。
  // "7x+2y" / "2y+7x" / "-10xy" / "-10yx" / "6x^2" / "6x²" / "12x^3y" / "x=-2y+6"（先頭の「文字=」は外す）/ "y/2+2" / "1/2y+2"
  // 項の文字は、文字ごとの次数を並べた名前（x²y → "x2y1"）。同じ項はまとめて、係数 0 の項は消す。
  function parsePoly(value) {
    // ² ³ は NFKC で ただの 2 3 になってしまうので、正規化の前に ^2 ^3 にする
    var s = normalize(String(value == null ? "" : value).replace(/²/g, "^2").replace(/³/g, "^3")).replace(/\*/g, "");
    s = s.replace(/^[a-z]=/, "");
    if (!s || s.indexOf("=") !== -1 || /[^0-9a-z+\-./^()]/.test(s)) return null;
    s = s.replace(/^\((.*)\)$/, "$1");
    var terms = s.match(/[+-]?[^+-]+/g);
    if (!terms || terms.join("") !== s) return null; // 「2x+」のように符号だけ残っているものは読まない
    var out = {};
    for (var i = 0; i < terms.length; i++) {
      // 係数は 3 / 0.5 / 1/2 のほか、文字のあとの「/2」（y/2 = 1/2 y）も読む
      var m = terms[i].match(/^([+-]?)(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)?((?:[a-z](?:\^\d+)?)*)(?:\/(\d+(?:\.\d+)?))?$/);
      if (!m || (!m[2] && !m[3]) || (m[4] && !m[3])) return null;
      var c = m[2] ? toNumber(m[2]) : 1;
      if (c === null) return null;
      if (m[4]) { if (Number(m[4]) === 0) return null; c = c / Number(m[4]); }
      if (m[1] === "-") c = -c;
      var deg = {};
      (m[3].match(/[a-z](?:\^\d+)?/g) || []).forEach(function (f) { deg[f[0]] = (deg[f[0]] || 0) + (f.length > 1 ? Number(f.slice(2)) : 1); });
      var key = Object.keys(deg).sort().map(function (v) { return v + deg[v]; }).join("") || "1";
      out[key] = (out[key] || 0) + c;
    }
    Object.keys(out).forEach(function (k) { if (Math.abs(out[k]) < 1e-9) delete out[k]; });
    return out;
  }
  // 画面に出す形："-10xy" → "−10xy"、"6x^2" → "6x²"、"7x+2y" → "7x + 2y"
  function polyText(s) {
    return String(s).replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/([^\s=])([+-])/g, "$1 $2 ").replace(/-/g, "−");
  }
  function samePoly(a, b) {
    if (!a || !b) return false;
    var ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    return ka.join() === kb.join() && ka.every(function (k) { return same(a[k], b[k]); });
  }

  // 分数の答え。「3分の1」も 1/3 と読む
  function fractionText(value) {
    return normalize(value).replace(/^(\d+)分の(\d+)$/, "$2/$1");
  }
  // 答えの形について、採点の前に声をかける内容（なければ null）。約分は、まちがいにせずに直してもらう
  function answerNote(q, value) {
    if (q.type === "steps") {
      for (var i = 0; i < q.steps.length; i++) { var n = answerNote(q.steps[i], value && value[q.steps[i].id]); if (n) return n; }
      return null;
    }
    if (q.type !== "fraction") return null;
    var m = fractionText(value).match(/^(\d+)\/(\d+)$/);
    if (!m || Number(m[2]) === 0) return null;
    var a = Number(m[1]), b = Number(m[2]);
    while (b) { var t = a % b; a = b; b = t; }
    return a > 1 ? "約分できるよ。いちばん簡単な分数にしてから答えてね。" : null;
  }

  function isBlank(q, value) {
    if (q.type === "pair") {
      return q.fields.some(function (f) { return normalize(value && value[f.key]) === ""; });
    }
    if (q.type === "steps") {
      return q.steps.some(function (st) { return isBlank(st, value && value[st.id]); });
    }
    if (q.type === "order") return !Array.isArray(value) || value.length < q.cards.length;
    return normalize(value) === "";
  }

  // 正誤判定。pair は両方そろって正解。steps は全部の小問が正解で正解。
  function check(q, value) {
    if (q.type === "number") return same(parseNumber(value), q.answer);
    if (q.type === "fraction") return same(toNumber(fractionText(value)), toNumber(String(q.answer)));
    if (q.type === "linear") {
      var p = parseLinear(value);
      return !!p && same(p.a, q.answer.a) && same(p.b, q.answer.b);
    }
    if (q.type === "pair") {
      return q.fields.every(function (f) {
        return same(parseNumber(value && value[f.key]), q.answer[f.key]);
      });
    }
    if (q.type === "choice") return normalize(value) === normalize(q.answer);
    if (q.type === "poly") return samePoly(parsePoly(value), parsePoly(q.answer));
    if (q.type === "steps") return checkSteps(q, value).every(function (r) { return r.correct; });
    // 並べかえ（証明の組み立て）：見本と同じ順番かではなく、依存関係（depends_on）を壊していないか
    if (q.type === "order") return SC.proof ? SC.proof.orderCheck(q, value).ok : JSON.stringify(value) === JSON.stringify(q.answer);
    return false;
  }

  // 応用問題：小問ごとに採点する。values = { 小問id: 答え }
  function checkSteps(q, values) {
    return q.steps.map(function (st) {
      var v = values ? values[st.id] : undefined;
      var r = { id: st.id, skill: st.skill, answered: !isBlank(st, v), correct: check(st, v) };
      // 図形：角度の値（value）か根拠（reason）か。根拠の小問は、選んだ選択肢も残す
      if (st.aspect) r.aspect = st.aspect;
      // 選択肢の小問は、選んだ答えを残す（根拠の取り違え・証明の選択肢の種類（kind）の診断に使う）
      if (st.type === "choice" || st.aspect === "reason") r.chosen = v == null ? null : v;
      return r;
    });
  }

  // どの小問で止まったか。最初につまずいた小問のスキルを「原因の候補」として返す（断定はしない）
  function analyzeSteps(q, results) {
    var miss = null;
    for (var i = 0; i < results.length; i++) {
      if (!results[i].correct) { miss = results[i]; break; }
    }
    return {
      solved: results.filter(function (r) { return r.correct; }).length,
      total: results.length,
      first_miss_step: miss ? miss.id : null,
      suspected_skill: miss ? miss.skill : null
    };
  }

  // ---------- 分岐：基礎の結果から、次に出す問題を選ぶ ----------

  function status(answers, id) { return answers[id] ? answers[id].status : null; }
  function ok(answers, id) { return status(answers, id) === "correct"; }
  function miss(answers, id) {
    var s = status(answers, id);
    return s === "incorrect" || s === "unknown";
  }

  // 返り値: [{ id, reason }]。全員に全部は出さない。
  function followUps(answers) {
    var Q = SC.QUESTIONS, list = [], seen = {};
    function add(id, reason, from) {
      if (seen[id]) return;
      seen[id] = true;
      list.push({ id: id, reason: reason, from: from || null });
    }
    SC.BASIC_ORDER.forEach(function (bid) {
      if (!miss(answers, bid)) return;
      var q = Q[bid];
      q.onMiss.forEach(function (cid) {
        // B2 で止まったときの C2 は、B3 も止まったときだけ出す（B3 側で追加される）
        if (bid === "B2" && cid === "C2") return;
        add(cid, "「" + q.skillLabel + "」の問題から → " + Q[cid].purpose, bid);
      });
    });
    // 基礎ができたスキルは、形を変えた標準問題で確かめる
    if (ok(answers, "B4")) add("S1", "「変化の割合」の基礎ができていたので → 形を変えた問題に挑戦");
    if (ok(answers, "B5")) add("S2", "「傾き・切片」の基礎ができていたので → 形を変えた問題に挑戦");
    return list;
  }

  // ---------- 診断 ----------

  var ROUTE = [
    { key: "coord", label: "座標" },
    { key: "proportion", label: "比例" },
    { key: "substitution", label: "式への代入" },
    { key: "rate", label: "変化の割合" },
    { key: "form", label: "グラフ・式" }
  ];

  var STATUS_LABEL = { ok: "できている", unstable: "もう少し確認したい", checking: "確認中" };

  function confidenceFor(answers, basicId, standardId) {
    var a = answers[basicId];
    if (!a) return 0.1;
    var c;
    if (a.status === "correct") c = a.hintUsed ? 0.4 : 0.55;
    else if (a.status === "unknown") c = 0.15;
    else c = 0.2;
    if (standardId && answers[standardId]) {
      c += answers[standardId].status === "correct" ? 0.2 : -0.05;
    }
    // 1回のチェックだけでは最大値にしない
    return Math.round(Math.max(0.05, Math.min(0.8, c)) * 100) / 100;
  }

  function levelOf(answers, id) {
    if (!answers[id]) return "not_checked";
    return answers[id].status === "correct" ? "pass" : "unstable";
  }

  function diagnose(answers) {
    var s = {};
    var hint = function (id) { return answers[id] && answers[id].hintUsed && ok(answers, id); };

    // 座標
    if (ok(answers, "B1")) {
      s.coord = { status: "ok", note: "点の座標を読み取れています" };
    } else if (miss(answers, "C1")) {
      s.coord = { status: "unstable", roots: ["正負の数"], plan: "signed",
        note: "座標そのものより、正負の数の計算でつまずいている可能性があります" };
    } else {
      s.coord = { status: "unstable", plan: "coord",
        note: "正負の数は大丈夫そう。点(x, y)の読み方をもう一度確認しよう" };
    }

    // 比例
    if (ok(answers, "B2")) {
      s.proportion = { status: "ok", note: "y = ax の形で計算できています" };
    } else if (ok(answers, "C3")) {
      s.proportion = { status: "checking",
        note: "比例の考え方はつかめていそう。計算の場面でもう少し様子を見ます" };
    } else {
      s.proportion = { status: "unstable", roots: ["比例"], plan: "proportion",
        note: "比例 y = ax のしくみが、まだ少し不安定そうです" };
    }

    // 式への代入
    if (ok(answers, "B3")) {
      s.substitution = { status: "ok", note: "一次関数の式に数を入れて計算できています" };
    } else if (miss(answers, "C2")) {
      s.substitution = { status: "unstable", roots: ["文字式への代入"], plan: "substitution",
        note: "一次関数の前に、文字式への代入を確認する必要がありそうです" };
    } else {
      s.substitution = { status: "unstable", plan: "substitution",
        note: "文字式への代入はできています。一次関数の式の中で計算するところを確認しよう" };
    }

    // 変化の割合
    if (ok(answers, "B4")) {
      if (ok(answers, "S1")) {
        s.rate = { status: "ok", note: "基礎だけでなく、形が変わっても使えています" };
      } else if (miss(answers, "S1")) {
        s.rate = { status: "ok", standardShaky: true,
          note: "基本は理解できていますが、問題の形が変わると少し不安定なようです" };
      } else {
        s.rate = { status: "ok", note: "基本の求め方ができています" };
      }
    } else if (miss(answers, "C4")) {
      s.rate = { status: "unstable", roots: ["変化量（増加量）"], plan: "change",
        note: "「変化の割合」そのものより、x と y の増加量をとらえるところでつまずいている可能性があります" };
    } else {
      s.rate = { status: "unstable", plan: "rate",
        note: "増加量はとらえられています。増加量から変化の割合を出すところを確認しよう" };
    }

    // グラフ・式（傾き・切片 → 式）
    if (ok(answers, "B5")) {
      if (ok(answers, "S2")) {
        s.form = { status: "ok", note: "傾きと切片を、点の情報と組み合わせて使えています" };
      } else if (miss(answers, "S2")) {
        s.form = { status: "ok", standardShaky: true,
          note: "基本は理解できていますが、問題の形が変わると少し不安定なようです" };
      } else {
        s.form = { status: "ok", note: "傾きと切片から式を作れています" };
      }
    } else if (s.rate.status === "unstable") {
      s.form = { status: "checking",
        note: ok(answers, "C5")
          ? "傾き・切片の読み取りはできています。変化の割合を確認してから、もう一度見ます"
          : "変化の割合を確認してから、もう一度見ます" };
    } else if (ok(answers, "C5")) {
      s.form = { status: "unstable", plan: "connect",
        note: "傾きと切片は理解できています。それを一次関数の式につなげるところを練習するとよさそう" };
    } else {
      s.form = { status: "unstable", roots: ["傾き・切片"], plan: "slope",
        note: "傾きと切片の見分け方が、まだ少し不安定そうです" };
    }

    // ヒントを使って正解したものは、表示を控えめにする
    [["coord", "B1"], ["proportion", "B2"], ["substitution", "B3"], ["rate", "B4"], ["form", "B5"]]
      .forEach(function (p) { if (hint(p[1])) s[p[0]].withHint = true; });

    var skills = ROUTE.map(function (r) {
      var x = s[r.key];
      return {
        key: r.key, label: r.label, status: x.status, statusLabel: STATUS_LABEL[x.status],
        note: x.note, roots: x.roots || [], plan: x.plan || null,
        withHint: !!x.withHint, standardShaky: !!x.standardShaky
      };
    });

    // 前提から順に見て、最初の「もう少し」を今日越えるところにする
    var focusSkill = skills.filter(function (k) { return k.status === "unstable"; })[0] || null;
    var planKey;
    if (focusSkill) planKey = focusSkill.plan;
    else if (miss(answers, "S1") || miss(answers, "S2")) planKey = "standard";
    else planKey = "challenge";

    // 原因確認で「できた」ことも、できているところとして拾う
    var foundOk = [];
    if (ok(answers, "C1")) foundOk.push("正負の数");
    if (ok(answers, "C2")) foundOk.push("文字式への代入");
    if (ok(answers, "C3")) foundOk.push("比例の基本");
    if (ok(answers, "C4")) foundOk.push("増加量");
    if (ok(answers, "C5")) foundOk.push("傾き・切片の読み取り");

    return {
      skills: skills,
      focusSkill: focusSkill,
      planKey: planKey,
      foundOk: foundOk,
      discovery: discoveryText(planKey, skills, foundOk),
      skillState: skillState(answers, skills, planKey)
    };
  }

  function discoveryText(planKey, skills, foundOk) {
    var t = {
      change: "一次関数全部が苦手なのではなく、「変化の割合」の手前にある「x と y の増加量をとらえるところ」が、まだ少し不安定そうです。今日はここを確認すると、グラフや式の問題も理解しやすくなりそうです。",
      rate: "一次関数全部が苦手なのではなく、「変化の割合」の理解がまだ少し不安定そうです。増加量はとらえられているので、そこから割合を出すところを確認すると、グラフや式の問題も理解しやすくなりそうです。",
      signed: "座標の問題でつまずいたのは、座標そのものより「正負の数の計算」が原因の可能性があります。ここを先に確認すると、一次関数の問題全体が進めやすくなりそうです。",
      coord: "正負の数は大丈夫そうです。点(x, y)の読み方をもう一度確認すると、グラフの問題に入りやすくなりそうです。",
      proportion: "一次関数のもとになる「比例 y = ax」の理解が、まだ少し不安定そうです。ここを確認すると、一次関数の式が読みやすくなりそうです。",
      substitution: foundOk.indexOf("文字式への代入") !== -1
        ? "文字式への代入はできています。一次関数の式の中で計算するところを確認すると、式の問題が進めやすくなりそうです。"
        : "一次関数そのものより、その前の「文字式への代入」でつまずいている可能性があります。ここを確認すると、一次関数の計算がぐっと楽になりそうです。",
      connect: "傾きと切片はちゃんと理解できています。あと一歩、それを「一次関数の式」につなげるところを練習すると、グラフと式が結びつきそうです。",
      slope: "変化の割合は使えています。傾きと切片の見分け方を確認すると、式やグラフの問題に進みやすくなりそうです。",
      standard: "基礎はしっかりできています。問題の形が変わると少し不安定なところがあるので、今日は「形が変わっても使える」ことを目指しましょう。",
      challenge: "基礎だけでなく、形が変わっても使えています。次は、知識を組み合わせて文章題に挑戦してみましょう。"
    }[planKey];
    return t + "\n1回のチェックだけで決めつけず、これからの学習結果もあわせて現在地を更新していきます。";
  }

  var NEXT_ACTION = {
    signed: "review_signed_numbers", coord: "review_coordinates", proportion: "review_proportion",
    substitution: "review_substitution", change: "review_change_amount", rate: "review_rate_of_change",
    slope: "review_slope_intercept", connect: "practice_slope_to_equation",
    standard: "practice_standard_problems", challenge: "try_application_problem"
  };

  // 仕様書 16章のデータモデル。スキルごとに 基礎/標準/応用/定着 を分けて持つ。
  function skillState(answers, skills, planKey) {
    var map = {
      coord: ["B1", null], proportion: ["B2", null], substitution: ["B3", null],
      rate: ["B4", "S1"], form: ["B5", "S2"]
    };
    return skills.map(function (k) {
      var m = map[k.key];
      return {
        skill: k.label,
        basic: levelOf(answers, m[0]),
        standard: m[1] ? levelOf(answers, m[1]) : "not_checked",
        application: "not_checked",
        retention: "not_checked",
        confidence: confidenceFor(answers, m[0], m[1]),
        suspected_root_causes: k.roots,
        next_action: k.plan === planKey || (!k.plan && k.status !== "ok") ? NEXT_ACTION[planKey] : null
      };
    });
  }

  // ---------- 今日の学習（25分） ----------

  var Q = function (id) { return SC.QUESTIONS[id]; };
  function retry(id, title) {
    var q = Q(id);
    return {
      min: 10, title: title || "チェックの問題に再挑戦",
      body: ["コンパスチェックで止まった問題に、もう一度挑戦します。ここまでの2ステップを思い出しながら解いてみよう。"],
      practice: { id: q.id, skill: q.skill, level: q.level, unit: q.unit, evidence_level: q.evidence_level,
        text: q.text, type: q.type, answer: q.answer, fields: q.fields, placeholder: q.placeholder,
        figure: q.figure, choices: q.choices, steps: q.steps,
        hint: q.hint, explain: q.explain || (q.display ? "答え：" + q.display : "答え：" + fmt(q)) }
    };
  }
  function fmt(q) {
    if (q.type === "pair") return q.fields.map(function (f) { return f.label + " " + q.answer[f.key]; }).join("、");
    if (q.type === "poly") return polyText(q.answer);
    return String(q.answer).replace("-", "−");
  }

  var PLANS = {
    change: {
      cross: "変化の割合を使えるようになる",
      beyond: "グラフと式をつなげる",
      steps: [
        { min: 5, title: "増加量を確認",
          body: ["増加量は「どれだけ増えたか」。あとの値 − はじめの値 で求めます。"],
          example: "x が 1 → 4 なら、x の増加量は 4 − 1 ＝ 3",
          practice: { text: "x が 3 から 7 に増えました。x の増加量は？", type: "number", answer: 4,
            hint: "あとの値 − はじめの値 ＝ 7 − 3", explain: "7 − 3 ＝ 4。増加量は 4 です。" } },
        { min: 10, title: "変化の割合の基礎",
          body: ["変化の割合 ＝ y の増加量 ÷ x の増加量。", "「x が 1 増えると、y がいくつ増えるか」を表しています。"],
          example: "x が 3 増えて y が 6 増えたら、6 ÷ 3 ＝ 2",
          practice: { text: "x が 2 増えたとき、y が 8 増えました。変化の割合は？", type: "number", answer: 4,
            hint: "y の増加量 ÷ x の増加量 ＝ 8 ÷ 2", explain: "8 ÷ 2 ＝ 4。変化の割合は 4 です。" } },
        null // 再挑戦（B4）
      ],
      retryId: "B4", retryTitle: "一次関数の問題に再挑戦"
    },
    rate: {
      cross: "変化の割合を使えるようになる",
      beyond: "グラフと式をつなげる",
      steps: [
        { min: 5, title: "増加量をおさらい",
          body: ["増加量はもうとらえられています。念のため、1問だけおさらい。"],
          example: "y が 2 → 8 なら、y の増加量は 8 − 2 ＝ 6",
          practice: { text: "y が 5 から 11 に増えました。y の増加量は？", type: "number", answer: 6,
            hint: "11 − 5", explain: "11 − 5 ＝ 6 です。" } },
        { min: 10, title: "増加量から変化の割合へ",
          body: ["変化の割合 ＝ y の増加量 ÷ x の増加量。", "わる順番は「y ÷ x」。逆にしないのがポイントです。"],
          example: "x が 3 増えて y が 6 増えたら、6 ÷ 3 ＝ 2",
          practice: { text: "x が 4 増えたとき、y が 12 増えました。変化の割合は？", type: "number", answer: 3,
            hint: "12 ÷ 4", explain: "12 ÷ 4 ＝ 3。変化の割合は 3 です。" } },
        null
      ],
      retryId: "B4", retryTitle: "一次関数の問題に再挑戦"
    },
    signed: {
      cross: "正負の数の計算を越える",
      beyond: "座標とグラフを読めるようになる",
      steps: [
        { min: 5, title: "数直線で考える",
          body: ["たし算は数直線の右へ、ひき算は左へ進むと考えます。"],
          example: "−3 + 5 は、−3 から右へ 5 → 2",
          practice: { text: "−4 + 6 を計算しなさい。", type: "number", answer: 2,
            hint: "−4 から右へ 6 つ進むと？", explain: "−4 から右へ 6 進んで 2 です。" } },
        { min: 10, title: "負の数をふくむ計算",
          body: ["答えがマイナスになることもあります。数直線で 0 をまたぐイメージを持とう。"],
          example: "2 − 5 は、2 から左へ 5 → −3",
          practice: { text: "1 − 4 を計算しなさい。", type: "number", answer: -3,
            hint: "1 から左へ 4 つ進むと？", explain: "1 から左へ 4 進んで −3 です。" } },
        null
      ],
      retryId: "B1", retryTitle: "座標の問題に再挑戦"
    },
    coord: {
      cross: "座標を正しく読めるようになる",
      beyond: "グラフと式をつなげる",
      steps: [
        { min: 5, title: "(x, y) の順番",
          body: ["点(x, y) は、前が x座標（横）、うしろが y座標（たて）。"],
          example: "点(4, −2) の x座標は 4、y座標は −2",
          practice: { text: "点P(5, −1) の x座標は？", type: "number", answer: 5,
            hint: "前の数が x座標", explain: "前の数なので 5 です。" } },
        { min: 10, title: "y座標も読んでみる",
          body: ["うしろの数が y座標。マイナスがついていても、そのまま読みます。"],
          example: "点(−1, 3) の y座標は 3",
          practice: { text: "点Q(−3, −6) の y座標は？", type: "number", answer: -6,
            hint: "うしろの数が y座標", explain: "うしろの数なので −6 です。" } },
        null
      ],
      retryId: "B1", retryTitle: "座標の問題に再挑戦"
    },
    proportion: {
      cross: "比例 y = ax のしくみをつかむ",
      beyond: "一次関数の式を読めるようになる",
      steps: [
        { min: 5, title: "y = ax に数を入れる",
          body: ["比例は y = ax。x に数を入れると y が決まります。"],
          example: "y = 2x で x = 5 なら、y = 2 × 5 ＝ 10",
          practice: { text: "y = 4x で、x = 3 のとき、y はいくつ？", type: "number", answer: 12,
            hint: "4 × 3", explain: "4 × 3 ＝ 12 です。" } },
        { min: 10, title: "a を求める",
          body: ["x と y がわかれば、a ＝ y ÷ x で求められます。"],
          example: "x = 2、y = 8 なら、a ＝ 8 ÷ 2 ＝ 4",
          practice: { text: "y = ax で、x = 3、y = 12 のとき、a はいくつ？", type: "number", answer: 4,
            hint: "12 ÷ 3", explain: "12 ÷ 3 ＝ 4 です。" } },
        null
      ],
      retryId: "B2", retryTitle: "比例の問題に再挑戦"
    },
    substitution: {
      cross: "文字式に数を入れられるようになる",
      beyond: "一次関数の式を使いこなす",
      steps: [
        { min: 5, title: "かっこをつけて代入",
          body: ["負の数を入れるときは、かっこをつけるとミスが減ります。"],
          example: "x = −2 のとき 3x は、3 × (−2) ＝ −6",
          practice: { text: "x = −3 のとき、2x の値は？", type: "number", answer: -6,
            hint: "2 × (−3)", explain: "2 × (−3) ＝ −6 です。" } },
        { min: 10, title: "かけ算を先に",
          body: ["「○x + △」の形は、かけ算を先に計算してから、たし算をします。"],
          example: "x = 2 のとき 3x + 1 は、3 × 2 + 1 ＝ 7",
          practice: { text: "x = −1 のとき、4x + 5 の値は？", type: "number", answer: 1,
            hint: "4 × (−1) + 5", explain: "4 × (−1) + 5 ＝ −4 + 5 ＝ 1 です。" } },
        null
      ],
      retryId: "B3", retryTitle: "一次関数の問題に再挑戦"
    },
    slope: {
      cross: "傾きと切片を見分けられるようになる",
      beyond: "グラフと式をつなげる",
      steps: [
        { min: 5, title: "傾きは x の前の数",
          body: ["y = ax + b の a が「傾き」。x についている数です。"],
          example: "y = 3x + 2 の傾きは 3",
          practice: { text: "y = 5x − 2 の傾きは？", type: "number", answer: 5,
            hint: "x の前の数", explain: "x の前の数なので 5 です。" } },
        { min: 10, title: "切片はうしろの数",
          body: ["y = ax + b の b が「切片」。グラフが y軸と交わるところです。符号もいっしょに読みます。"],
          example: "y = 3x − 4 の切片は −4",
          practice: { text: "y = −x + 3 の切片は？", type: "number", answer: 3,
            hint: "うしろの数（符号もいっしょに）", explain: "うしろの数なので 3 です。" } },
        null
      ],
      retryId: "B5", retryTitle: "式の問題に再挑戦"
    },
    connect: {
      cross: "傾きと切片を式につなげる",
      beyond: "グラフと式をつなげる",
      steps: [
        { min: 5, title: "形をおさらい",
          body: ["一次関数は y = ax + b。a に傾き、b に切片を入れれば式になります。"],
          example: "傾き 4、切片 1 → y = 4x + 1",
          practice: { text: "y = 4x + 1 の切片は？", type: "number", answer: 1,
            hint: "うしろの数", explain: "うしろの数なので 1 です。" } },
        { min: 10, title: "式を組み立てる",
          body: ["傾きを x の前に、切片をうしろに。切片がマイナスなら「− ○」と書きます。"],
          example: "傾き 2、切片 −5 → y = 2x − 5",
          practice: { text: "傾きが 3、切片が 2 の一次関数の式は？", type: "linear", answer: { a: 3, b: 2 },
            placeholder: "例：y = 4x + 1",
            hint: "y = ax + b の a に 3、b に 2", explain: "答え：y = 3x + 2" } },
        null
      ],
      retryId: "B5", retryTitle: "式の問題に再挑戦"
    },
    standard: {
      cross: "形が変わっても使えるようになる",
      beyond: "知識を組み合わせて使う",
      steps: [
        { min: 5, title: "2つの値から変化の割合",
          body: ["「○から△まで」と書かれていたら、まず増加量を出します。"],
          example: "x が 1→3、y が 2→8 なら (8−2) ÷ (3−1) ＝ 3",
          practice: { text: "x が 1 から 4、y が 3 から 12 まで増えました。変化の割合は？", type: "number", answer: 3,
            hint: "(12 − 3) ÷ (4 − 1)", explain: "9 ÷ 3 ＝ 3 です。" } },
        { min: 10, title: "点を通る式",
          body: ["傾きがわかっていれば、通る点を入れて切片 b を求めます。"],
          example: "傾き 2、点(1, 5) → 5 ＝ 2 × 1 + b → b ＝ 3",
          practice: { text: "傾きが 2 で、点(1, 5) を通る一次関数の式は？", type: "linear", answer: { a: 2, b: 3 },
            placeholder: "例：y = 4x + 1",
            hint: "5 ＝ 2 × 1 + b から b を出そう", explain: "答え：y = 2x + 3" } },
        null
      ]
    },
    challenge: {
      cross: "知識を組み合わせて使う",
      beyond: "文章題を式で解けるようになる",
      steps: [
        { min: 5, title: "Aプランの式をつくる",
          body: ["Aプランは基本料金 500円、1GB ごとに 200円。", "x GB 使ったときの料金を y 円として、式にしてみよう。"],
          example: "「1つ○円」は x の前、「最初にかかる分」はうしろに来ます",
          practice: { text: "Aプランの料金 y を x の式で表しなさい。", type: "linear", answer: { a: 200, b: 500 },
            placeholder: "例：y = 100x + 300",
            hint: "1GB ごとに 200円 → 200x、基本料金 → + 500", explain: "答え：y = 200x + 500" } },
        { min: 10, title: "Bプランの式をつくる",
          body: ["Bプランは基本料金 900円、1GB ごとに 100円。"],
          example: "同じように、1GB あたりの料金が x の前に来ます",
          practice: { text: "Bプランの料金 y を x の式で表しなさい。", type: "linear", answer: { a: 100, b: 900 },
            placeholder: "例：y = 100x + 300",
            hint: "100x + 900", explain: "答え：y = 100x + 900" } },
        { min: 10, title: "料金が同じになるのは？",
          body: ["2つの式を「＝」でつなぐと方程式になります。", "200x + 500 ＝ 100x + 900"],
          example: "x の項を左、数を右に集めて解こう",
          practice: { text: "何GB 使うと、AプランとBプランの料金が同じになる？（数字で答えよう）", type: "number", answer: 4,
            hint: "100x ＝ 400", explain: "200x + 500 ＝ 100x + 900 → 100x ＝ 400 → x ＝ 4。4GB です。" } }
      ]
    }
  };

  // 練習問題が確かめるスキルとレベル（履歴に残すため）。再挑戦ステップは元の問題の情報を使う
  var PRACTICE_META = {
    change: [["change", "basic"], ["rate", "basic"]],
    rate: [["change", "basic"], ["rate", "basic"]],
    signed: [["signed", "basic"], ["signed", "basic"]],
    coord: [["coord", "basic"], ["coord", "basic"]],
    proportion: [["proportion", "basic"], ["proportion", "basic"]],
    substitution: [["algebra", "basic"], ["substitution", "basic"]],
    slope: [["slopeIntercept", "basic"], ["slopeIntercept", "basic"]],
    connect: [["slopeIntercept", "basic"], ["form", "basic"]],
    standard: [["rate", "standard"], ["form", "standard"]],
    challenge: [["form", "application"], ["form", "application"], ["form", "application"]]
  };

  // 今日の学習（自動生成）で、パートのはじめに出す「ミニ解説」。固定プランの説明文をそのまま使う
  var INTRO_OF = {
    basic: { signed: ["signed", 0], coord: ["coord", 0], proportion: ["proportion", 0], algebra: ["substitution", 0],
      change: ["change", 0], substitution: ["substitution", 1], rate: ["change", 1], slopeIntercept: ["slope", 0], form: ["connect", 1] },
    standard: { rate: ["standard", 0], form: ["standard", 1], slopeIntercept: ["slope", 1], change: ["change", 0] },
    application: { form: ["challenge", 0] }
  };
  function lessonIntro(skill, level) {
    var ref = (INTRO_OF[level] || {})[skill];
    if (!ref) return null;
    var st = PLANS[ref[0]].steps[ref[1]];
    return st ? { title: st.title, body: st.body.slice(), example: st.example || null } : null;
  }
  function planCross(skill) {
    var key = { signed: "signed", coord: "coord", proportion: "proportion", algebra: "substitution", change: "change",
      substitution: "substitution", rate: "rate", slopeIntercept: "slope", form: "connect" }[skill];
    return key ? PLANS[key].cross : null;
  }

  function buildPlan(diagnosis, answers) {
    var key = diagnosis.planKey;
    var base = PLANS[key];
    var steps = base.steps.map(function (st, i) {
      if (st) {
        var m = PRACTICE_META[key][i];
        st.practice.id = "L-" + key + "-" + (i + 1);
        st.practice.skill = m[0];
        st.practice.level = m[1];
        st.practice.unit = "一次関数";
        return st;
      }
      // 標準プランは、標準で止まった問題に再挑戦（両方なら式のほう）
      if (key === "standard") return retry(miss(answers, "S2") ? "S2" : "S1", "標準問題に再挑戦");
      return retry(base.retryId, base.retryTitle);
    });
    return { key: key, cross: base.cross, beyond: base.beyond, steps: steps, why: whyText(diagnosis) };
  }

  function whyText(d) {
    var okLabels = d.skills.filter(function (k) { return k.status === "ok"; }).map(function (k) { return k.label; });
    var head = okLabels.length ? okLabels.join("・") + "はできています。" : "";
    var body = {
      change: "変化の割合でつまずきが見られ、追加の確認から、その手前の「増加量」に原因がありそうだとわかりました。増加量 → 変化の割合 の順に確認すると、グラフや一次関数の式の理解につながります。",
      rate: "変化の割合でつまずきが見られました。増加量はとらえられているので、そこから割合を出すところを確認すると、グラフや一次関数の式の理解につながります。",
      signed: "座標の問題の原因として、正負の数の計算が見つかりました。ここを先に越えると、座標やグラフの問題がぐっと楽になります。",
      coord: "座標の読み取りでつまずきが見られました。グラフを読むための土台なので、先に確認しておきます。",
      proportion: "一次関数のもとになる比例でつまずきが見られました。比例がわかると、一次関数の式も読みやすくなります。",
      substitution: "式に数を入れる計算でつまずきが見られました。一次関数のほとんどの問題で使う力なので、先に確認しておきます。",
      slope: "傾きと切片の読み取りでつまずきが見られました。ここがわかると、式からグラフが想像できるようになります。",
      connect: "傾きと切片そのものは読み取れていました。あとはそれを式として書くところを練習すると、グラフと式がつながります。",
      standard: "基礎はできていますが、問題の形が変わると少し不安定でした。形を変えた問題で、使える力にしていきます。",
      challenge: "基礎も標準もできていました。次は、学んだことを組み合わせて文章題に使ってみます。"
    }[d.planKey];
    return head + body;
  }

  SC.logic = {
    normalize: normalize, parseNumber: parseNumber, parseLinear: parseLinear, parsePoly: parsePoly, polyText: polyText,
    isBlank: isBlank, answerNote: answerNote, check: check, checkSteps: checkSteps, analyzeSteps: analyzeSteps, followUps: followUps, retryStep: retry, lessonIntro: lessonIntro, planCross: planCross,
    diagnose: diagnose, buildPlan: buildPlan, ROUTE: ROUTE
  };
})(typeof window !== "undefined" ? window : globalThis);
