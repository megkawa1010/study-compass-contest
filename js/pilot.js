/* Study Compass — 実利用パイロットの記録（?debug=pilot）
 * 1〜2週間、実際に中学2年生が使ったようすを、日ごとにまとめる。
 * 自動で集めるもの：学校の進度・学習可能時間・提案した内容・実際に解いた内容・チェック
 * 保護者が書くもの：迷った画面・面倒な操作・「なぜこれをやるの？」・難しさ・診断や保護者画面の違和感
 * アプリの学習判断には使わない（記録と書き出しだけ）。
 */
(function (root) {
  "use strict";
  var SC = root.SC = root.SC || {};

  // 保護者が毎日書く欄（キーは書き出しにも使う）
  var NOTE_FIELDS = [
    { key: "confused", label: "子どもが迷った画面" },
    { key: "tedious", label: "面倒そうだった操作" },
    { key: "why", label: "「なぜこれをやるの？」と感じた箇所" },
    { key: "difficulty", label: "簡単すぎる／難しすぎる問題" },
    { key: "diagnosis", label: "診断結果への違和感" },
    { key: "parent", label: "保護者から見た違和感" },
    { key: "other", label: "そのほか（子どもの様子・続けやすさなど）" }
  ];
  // 見つけたことの分類。urgent はパイロット中にすぐ直す。それ以外は終わってからまとめて判断する
  var CATEGORIES = [
    { key: "cannot_learn", label: "学習できない", urgent: true },
    { key: "data_broken", label: "データが壊れる", urgent: true },
    { key: "wrong_question", label: "明らかに間違った問題", urgent: true },
    { key: "wrong_judgement", label: "学習判断が大きく誤る", urgent: true },
    { key: "wording", label: "表現", urgent: false },
    { key: "button", label: "ボタン名", urgent: false },
    { key: "length", label: "画面の長さ", urgent: false },
    { key: "time", label: "時間配分の小さな違和感", urgent: false },
    { key: "bank", label: "問題数不足", urgent: false },
    { key: "other", label: "その他", urgent: false }
  ];
  var CAT = {}; CATEGORIES.forEach(function (c) { CAT[c.key] = c; });
  var CHECK_JA = { compass_check: "コンパスチェック", periodic: "定期チェック", range_check: "テスト範囲チェック", unit_check: "単元のはじめてのチェック" };

  function dateKey(t) {
    var d = new Date(t);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function hm(t) { var d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }

  // data：store の記録全体。返り値：日付の新しい順の1日ごとの記録
  function days(data) {
    var by = {};
    function day(k) { return by[k] || (by[k] = { date: k, plans: [], checks: [], answers: [], memos: [] }); }
    (data.plans || []).forEach(function (p) {
      var t = p.started_at || p.created_at || p.completed_at;
      if (t) day(dateKey(t)).plans.push(p);
    });
    (data.sessions || []).forEach(function (s) {
      if (s.type !== "daily" && s.finished_at) day(dateKey(s.finished_at)).checks.push(s);
    });
    (data.answer_history || []).forEach(function (a) { if (a.answered_at) day(dateKey(a.answered_at)).answers.push(a); });
    var pilot = data.pilot || {};
    (pilot.memos || []).forEach(function (m) { day(m.date).memos.push(m); });
    Object.keys(pilot.notes || {}).forEach(function (k) { day(k); });
    var checkKind = {};
    (data.compass_check_history || []).forEach(function (c) { if (c.session_id) checkKind[c.session_id] = c.kind || c.type; });

    return Object.keys(by).sort().reverse().map(function (k) {
      var d = by[k];
      var done = d.plans.filter(function (p) { return p.completed_at; });
      var main = done[done.length - 1] || d.plans[d.plans.length - 1] || null;
      var ctx = (main && main.context) || {};
      var ans = d.answers;
      var times = ans.map(function (a) { return Date.parse(a.answered_at); }).sort();
      return {
        date: k,
        school: ctx.school_unit ? ctx.school_unit + (ctx.school_skill ? "（" + ctx.school_skill + "）" : "") : null,
        test_date: ctx.test_date || null,
        available_minutes: ctx.available_minutes || null,
        plan_starts: d.plans.length,
        proposed: main ? (main.sessions || []).map(function (s) {
          return { label: s.type_label || s.type, skill: s.skill_label || s.skill, minutes: s.minutes, questions: (s.questions || []).length };
        }) : [],
        proposed_minutes: main ? main.total_minutes || null : null,
        completed: !!(main && main.completed_at),
        done: main ? (main.sessions || []).map(function (s) {
          var r = main.results || {}, ids = s.questions || [];
          var answered = ids.filter(function (id) { return r[id] !== undefined; }).length;
          var correct = ids.filter(function (id) { return r[id] === "correct"; }).length;
          return { label: s.type_label || s.type, skill: s.skill_label || s.skill, answered: answered, correct: correct, total: ids.length };
        }) : [],
        feeling: main ? main.self_evaluation || null : null,
        checks: d.checks.map(function (s) {
          return { kind: CHECK_JA[checkKind[s.id]] || CHECK_JA[s.type] || s.type, unit: s.unit, questions: (s.question_ids || []).length, at: hm(s.finished_at) };
        }),
        answers: ans.length,
        wrong: ans.filter(function (a) { return !a.correct && !a.unknown_selected; }).length,
        unknown: ans.filter(function (a) { return a.unknown_selected; }).length,
        hints: ans.filter(function (a) { return a.hint_used; }).length,
        span: times.length ? hm(times[0]) + "〜" + hm(times[times.length - 1]) + "（" + Math.max(1, Math.round((times[times.length - 1] - times[0]) / 60000)) + "分）" : null,
        missed: ans.filter(function (a) { return !a.correct; }).map(function (a) { return a.question_id + (a.unknown_selected ? "（わからない）" : ""); }),
        memos: d.memos,
        note: (pilot.notes || {})[k] || {}
      };
    });
  }

  // 書き出し（Markdown）。パイロット後のまとめの材料にする
  function toMarkdown(data) {
    var pilot = data.pilot || {}, list = days(data), out = [];
    out.push("# Study Compass 実利用パイロット記録");
    out.push("");
    out.push("- 書き出し：" + new Date().toLocaleString("ja-JP"));
    if (pilot.started) out.push("- パイロット開始：" + pilot.started);
    out.push("- 記録した日数：" + list.length + "日（学習した日：" + list.filter(function (d) { return d.answers; }).length + "日）");
    out.push("");
    var issues = pilot.issues || [];
    out.push("## 見つけたこと（" + issues.length + "件）");
    ["urgent", "later"].forEach(function (g) {
      var xs = issues.filter(function (x) { return (CAT[x.category] || CAT.other).urgent === (g === "urgent"); });
      out.push("");
      out.push(g === "urgent" ? "### すぐ直す" : "### あとでまとめて判断");
      if (!xs.length) out.push("- なし");
      xs.forEach(function (x) { out.push("- [" + (x.status === "fixed" ? "直した" : x.status === "hold" ? "保留" : "未対応") + "] " + x.date + "｜" + (CAT[x.category] || CAT.other).label + "｜" + x.text); });
    });
    list.forEach(function (d) {
      out.push("");
      out.push("## " + d.date);
      out.push("- 学校の進度：" + (d.school || "（記録なし）") + (d.test_date ? "／次のテスト " + d.test_date : ""));
      out.push("- 学習可能時間：" + (d.available_minutes ? d.available_minutes + "分" : "（記録なし）"));
      out.push("- 提案：" + (d.proposed.length ? d.proposed.map(function (s) { return s.label + "「" + s.skill + "」" + s.minutes + "分・" + s.questions + "問"; }).join(" ／ ") + (d.proposed_minutes ? "（計" + d.proposed_minutes + "分）" : "") : "なし"));
      out.push("- 実際：" + (d.done.length ? (d.completed ? "完了" : "途中まで") + "｜" + d.done.map(function (s) { return "「" + s.skill + "」" + s.answered + "/" + s.total + "問（正解" + s.correct + "）"; }).join(" ／ ") : "今日の学習なし") + (d.plan_starts > 1 ? "（開始 " + d.plan_starts + " 回）" : ""));
      if (d.checks.length) out.push("- チェック：" + d.checks.map(function (c) { return c.kind + "（" + c.unit + "・" + c.questions + "問・" + c.at + "）"; }).join(" ／ "));
      out.push("- 回答：" + d.answers + "問（まちがい" + d.wrong + "・わからない" + d.unknown + "・ヒント" + d.hints + "）" + (d.span ? "｜" + d.span : "") + (d.feeling ? "｜ふり返り：" + d.feeling : ""));
      if (d.missed.length) out.push("- まちがえた問題：" + d.missed.join("、"));
      d.memos.forEach(function (m) { out.push("- メモ（" + m.time + "・" + m.screen + (m.question ? "・" + m.question : "") + "）：" + m.text); });
      NOTE_FIELDS.forEach(function (f) { if (d.note[f.key]) out.push("- " + f.label + "：" + d.note[f.key]); });
    });
    return out.join("\n") + "\n";
  }

  SC.pilot = { NOTE_FIELDS: NOTE_FIELDS, CATEGORIES: CATEGORIES, CAT: CAT, days: days, toMarkdown: toMarkdown, dateKey: dateKey };
})(typeof window !== "undefined" ? window : globalThis);
