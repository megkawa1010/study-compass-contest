/*
 * Study Compass — テスト対策モード（Phase 6）
 *
 * 日常学習と同じ学習データ（skill_state・answer_history）を使う。別のしくみは作らない。
 *   入力：テスト日 / テスト範囲（スキル）/ 1日の学習時間
 *   1. テスト範囲の「仕上がり」を skill_state から読む（◎ ○ △ ？）
 *   2. 残り日数から計画を作る
 *      - 範囲に最近確かめていないスキルがあれば、1日目は「テスト範囲チェック」
 *      - 不安定なスキルほど多くの日を割り当て、前提に近いスキルを先にする
 *      - テスト前日は「総仕上げ」（範囲を1問ずつひととおり）
 *   3. 今日の学習は、今日の予定スキルを中心に、範囲の中だけで組み立てる（js/planner.js のテストモード）
 * 画面を持たない純粋な関数だけを置く（Node からテストできる）。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});
  var E = SC.engine;

  var CONFIG = {
    RANGE_CHECK_STALE_DAYS: 7,   // 範囲のスキルを、これより前にしか確かめていなければ、1日目に範囲チェック
    RANGE_CHECK_MAX: 6,          // 範囲チェックの問題数の上限
    MAX_FOCUS_PER_DAY: 2         // 1日に中心にするスキルの数
  };
  var ROOT_ORDER = E.ROOT_ORDER; // 前提に近い順（js/engine.js で一元管理）
  var UNIT_SKILLS = ["change", "substitution", "rate", "slopeIntercept", "form"];

  function label(k) { return E.SKILLS[k] ? E.SKILLS[k].label : k; }
  function dayStart(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function dateKey(ms) {
    var d = new Date(ms);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function parseDate(key) { var p = String(key).split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])).getTime(); }

  // テストまであと何日（今日が0日目。テスト当日は0、前日は1）
  function daysLeft(testDate, now) {
    return Math.round((dayStart(parseDate(testDate)) - dayStart(now)) / E.DAY);
  }

  // ---------- 仕上がり ----------
  // mark：◎ 仕上がっている / ○ 基本はできている / △ まだ不安定 / ？ まだ確かめていない
  function readiness(states, range, now) {
    return range.map(function (k) {
      var s = states[k] || { attempt_count: 0, learning_status: "not_checked", confidence: 0 };
      var status = s.learning_status, mark, need;
      if (!s.attempt_count || status === "not_checked" || status === "not_learned") { mark = "？"; need = 2.5; }
      else if (status === "needs_review" || status === "learning") { mark = "△"; need = 3; }
      else if (status === "understood") { mark = "○"; need = s.standard === "pass" ? 1.5 : 2; }
      else { mark = "◎"; need = 0.5; }
      var stale = !s.last_checked || now - Date.parse(s.last_checked) > CONFIG.RANGE_CHECK_STALE_DAYS * E.DAY;
      return { skill: k, label: label(k), mark: mark, need: need, confidence: s.confidence || 0, status: status, stale: stale };
    });
  }

  // ---------- 残り日数から計画 ----------
  // test: { test_date, range_skills } / 返り値：{ days_left, days: [{ date, index, kind, skills, note }], readiness }
  function schedule(test, states, now, opts) {
    opts = opts || {};
    var range = (test.range_skills || []).slice().sort(function (a, b) { return ROOT_ORDER.indexOf(a) - ROOT_ORDER.indexOf(b); });
    var left = daysLeft(test.test_date, now);
    var ready = readiness(states, range, now);
    var out = { days_left: left, readiness: ready, days: [], log: [] };
    if (left <= 0) { out.log.push(left === 0 ? "テスト当日" : "テストは終わった"); return out; }

    var days = [];
    for (var i = 0; i < left; i++) days.push({ index: i, date: dateKey(dayStart(now) + i * E.DAY), kind: "focus", skills: [], note: "" });

    // テスト前日は総仕上げ（あと1日のときは、今日がその前日）
    if (left >= 1) {
      var last = days[days.length - 1];
      last.kind = "final_review"; last.skills = range.slice(); last.note = "範囲をひととおり、テストに出る形の問題で確かめる";
    }
    // 範囲に最近確かめていないスキルがあれば、1日目は範囲チェック（すでに今日やっていれば不要）
    var needCheck = ready.some(function (r) { return r.stale; }) && !opts.rangeCheckedToday;
    if (needCheck && left >= 2) {
      days[0].kind = "range_check";
      days[0].skills = ready.filter(function (r) { return r.stale; }).map(function (r) { return r.skill; });
      days[0].note = "まず範囲の今の力を確かめる（最近確かめていないスキル：" + days[0].skills.map(label).join("・") + "）";
      out.log.push("最近確かめていない範囲のスキルがあるので、1日目は範囲チェック");
    }

    // 残りの日に、必要度（△ > ？ > ○ > ◎）に比例してスキルを割り当てる。前提に近いスキルを先に
    var free = days.filter(function (d) { return d.kind === "focus"; });
    var slots = free.length * CONFIG.MAX_FOCUS_PER_DAY;
    var totalNeed = ready.reduce(function (s, r) { return s + r.need; }, 0) || 1;
    var alloc = ready.map(function (r) { return { skill: r.skill, n: Math.max(r.need >= 2 ? 1 : 0, Math.round(slots * r.need / totalNeed)), need: r.need }; });
    // 多すぎたら必要度の低いものから減らす
    var sum = function () { return alloc.reduce(function (s, a) { return s + a.n; }, 0); };
    while (sum() > slots) {
      var cand = alloc.filter(function (a) { return a.n > 0; }).sort(function (a, b) { return a.need - b.need || b.n - a.n; })[0];
      cand.n--;
    }
    // 順番：前提に近いスキルから。同じスキルは続けすぎない
    var queue = [];
    alloc.forEach(function (a) { for (var j = 0; j < a.n; j++) queue.push(a.skill); });
    queue.sort(function (a, b) { return ROOT_ORDER.indexOf(a) - ROOT_ORDER.indexOf(b); });
    free.forEach(function (d) {
      while (d.skills.length < CONFIG.MAX_FOCUS_PER_DAY && queue.length) {
        var idx = 0;
        while (idx < queue.length && d.skills.indexOf(queue[idx]) !== -1) idx++;
        if (idx >= queue.length) break;
        d.skills.push(queue.splice(idx, 1)[0]);
      }
      // 割り当てが足りない日は、仕上がりの低い順に復習
      if (!d.skills.length) d.skills = ready.slice().sort(function (a, b) { return b.need - a.need; }).slice(0, 1).map(function (r) { return r.skill; });
      d.note = d.skills.map(function (k) {
        var r = ready.filter(function (x) { return x.skill === k; })[0];
        return label(k) + "（" + r.mark + "）";
      }).join("・") + " を中心に";
    });
    out.days = days;
    out.log.push("必要度：" + ready.map(function (r) { return r.label + " " + r.mark + "=" + r.need; }).join("、") + "／割り当て " + alloc.map(function (a) { return label(a.skill) + "×" + a.n; }).join("、"));
    return out;
  }

  // ---------- テスト範囲チェック（範囲の各スキルを1問ずつ） ----------
  // input: { states, history, sessions, now, rng }
  function rangeCheck(input, skills) {
    var chosen = [], used = [];
    var list = skills.slice().sort(function (a, b) { return ROOT_ORDER.indexOf(a) - ROOT_ORDER.indexOf(b); }).slice(0, CONFIG.RANGE_CHECK_MAX);
    list.forEach(function (k) {
      var s = input.states[k];
      // テスト向けなので、基礎ができていれば標準の問題で確かめる
      var level = s && s.basic === "pass" && E.SKILLS[k].unit !== "既習" ? "standard" : "basic";
      var p = null;
      [level, level === "standard" ? "retention" : "retention", "basic"].some(function (lv) {
        var q = SC.bank.pick(k, lv, { history: input.history, exclude: used.concat(recent(input)), rng: input.rng });
        if (q) p = q;
        return !!q;
      });
      if (!p) p = SC.bank.pick(k, level, { history: input.history, exclude: used, rng: input.rng }) || SC.bank.pick(k, "basic", { history: input.history, exclude: used, rng: input.rng });
      if (!p) return;
      used.push(p.id);
      chosen.push({ skill: k, label: label(k), level: p.level, planned_level: level, question_id: p.id, reason: "テスト範囲チェック：「" + label(k) + "」の今の力を確かめる" });
    });
    return { chosen: chosen, questions: chosen.map(function (c) { return c.question_id; }) };
  }
  function recent(input) {
    return (input.history || []).filter(function (a) { return input.now - Date.parse(a.answered_at) < 3 * E.DAY; })
      .map(function (a) { return String(a.question_id).split("#")[0]; });
  }

  // 今日の予定（計画の0日目）
  function today(test, states, now, opts) {
    var sch = schedule(test, states, now, opts);
    return { schedule: sch, day: sch.days[0] || null };
  }

  SC.testprep = { CONFIG: CONFIG, UNIT_SKILLS: UNIT_SKILLS, daysLeft: daysLeft, readiness: readiness, schedule: schedule,
    rangeCheck: rangeCheck, today: today, dateKey: dateKey };
})(typeof window !== "undefined" ? window : globalThis);
