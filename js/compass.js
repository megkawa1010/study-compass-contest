/*
 * Study Compass — 定期コンパスチェック（Phase 2）
 *
 * 学習履歴と skill_state を見て、
 *   1. 「今、再確認した方がよいスキル」を選ぶ（発生条件 × 優先度）
 *   2. スキルの状態に合ったレベルの問題を、問題バンクから前回とは違う問題で選ぶ
 *   3. チェック前後の変化を読み取り、コメントと「今日の学習」の方針を作る
 * 画面を持たない純粋な関数だけを置く（Node からテストできる）。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});
  var E = SC.engine;

  // ---------- 調整値（あとから変えられるように、ここにまとめる） ----------
  var CONFIG = {
    COMPASS_CHECK_DAYS: 3,          // 条件A：そのスキルを最後にチェックしてから何日たったら再確認するか
    COMPASS_CHECK_MIN_ATTEMPTS: 5,  // 条件B：前回のチェック後、何問練習したら再確認するか
    MIN_QUESTIONS: 3,               // 1回のチェックの問題数（目安の下限）
    MAX_QUESTIONS: 5,               // 1回のチェックの問題数（上限）
    MAX_PER_SKILL: 2,               // 1スキルあたりの最大問題数
    RECENT_EXCLUDE_CHECKS: 3,       // 直近何回のチェックで出た問題を避けるか
    RECENT_EXCLUDE_DAYS: 7,         // 何日以内に解いた問題を避けるか
    LOW_CONFIDENCE: 0.65,           // 優先度1：これより確かさが低いスキル
    LONG_GAP_DAYS: 14,              // 優先度4：定着していても、この日数以上あいたら確かめ直す
    RECENT_ERROR_WINDOW: 4,         // 優先度5：直近何回の回答を見るか
    RECENT_ERROR_MIN: 2             // 優先度5：そのうち何回まちがえていたら「誤答が増えている」とみなすか
  };

  var PRIORITY_TEXT = {
    0: "前回の原因さがしの続き",
    1: "確かさがまだ低い",
    2: "標準・応用に「要確認」がある",
    3: "一度できたが、定着をまだ確かめていない",
    4: "定着していたが、前回の確認から時間がたった",
    5: "最近まちがいが増えている",
    6: "学校で習ったが、まだ一度も確かめていない"
  };
  var LEVEL_REASON = {
    basic: "基礎がまだ不安定なので、基礎の問題で確かめる",
    standard: "基礎はできているので、形を変えた標準問題で確かめる",
    application: "標準までできているので、応用問題で確かめる",
    retention: "応用までできているので、前とは違う問題で定着を確かめる"
  };
  var LEVEL_JA = { basic: "基礎", standard: "標準", application: "応用", retention: "定着" };
  // その問題がないときに、代わりに探すレベル
  var FALLBACK = {
    basic: ["basic", "retention", "standard"],
    standard: ["standard", "retention", "basic", "application"],
    application: ["application", "standard", "retention"],
    retention: ["retention", "standard", "application", "basic"]
  };

  function baseId(qid) { return String(qid).split("#")[0]; }
  function t(a) { return Date.parse(a.answered_at); }
  function days(ms) { return Math.floor(ms / E.DAY); }

  // アプリ内の日付（ローカル時刻）を "YYYY-MM-DD" にする。「今日はあとで」の判定に使う
  function dateKey(now) {
    var d = new Date(now);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // ---------- スキルごとの「最近の動き」 ----------
  function activity(skill, history) {
    var mine = history.filter(function (a) { return a.skill === skill; }).sort(function (a, b) { return t(a) - t(b); });
    var checks = mine.filter(function (a) { return a.context !== "lesson"; });
    var lastCheckAt = checks.length ? t(checks[checks.length - 1]) : null;
    var lessonSince = mine.filter(function (a) { return a.context === "lesson" && (lastCheckAt === null || t(a) > lastCheckAt); }).length;
    var recent = mine.slice(-CONFIG.RECENT_ERROR_WINDOW);
    return {
      lastCheckAt: lastCheckAt,
      lessonSince: lessonSince,
      recentErrors: recent.filter(function (a) { return !a.correct; }).length,
      lastWrong: recent.length ? !recent[recent.length - 1].correct : false,
      everIds: mine.map(function (a) { return baseId(a.question_id); })
    };
  }

  // 条件A・B（どちらかを満たしたら候補）
  function dueOf(s, act, now) {
    if (!s || !s.attempt_count || s.learning_status === "not_learned") return null;
    var daysSince = act.lastCheckAt === null ? null : (now - act.lastCheckAt) / E.DAY;
    return {
      byDays: daysSince !== null && daysSince >= CONFIG.COMPASS_CHECK_DAYS,
      daysSince: daysSince === null ? null : Math.floor(daysSince * 10) / 10,
      byAttempts: act.lessonSince >= CONFIG.COMPASS_CHECK_MIN_ATTEMPTS,
      lessonSince: act.lessonSince
    };
  }

  // 優先度1〜5（あてはまるものすべて）
  function reasonsOf(s, act, due) {
    var r = [];
    if (s.confidence < CONFIG.LOW_CONFIDENCE) r.push(1);
    if (s.standard === "needs_review" || s.application === "needs_review") r.push(2);
    if ((s.basic === "pass" || s.standard === "pass") && s.retention === "not_checked") r.push(3);
    if ((s.learning_status === "retained" || s.learning_status === "mastered") && due.daysSince !== null && due.daysSince >= CONFIG.LONG_GAP_DAYS) r.push(4);
    if (act.recentErrors >= CONFIG.RECENT_ERROR_MIN && act.lastWrong) r.push(5);
    return r.map(function (p) { return { p: p, text: PRIORITY_TEXT[p] }; });
  }

  // skill_state から出題レベルを決める
  // （既習スキルは基礎と定着の問題だけを持つので、基礎ができていれば定着の問題で確かめる）
  // （問題バンクにそのレベルの問題が1問もないスキルは、そのレベルを飛ばす。例：移項に応用の問題はない）
  function levelOf(s, skill) {
    function has(lv) { return !SC.bank || !SC.bank.index[skill] || SC.bank.index[skill][lv].length > 0; }
    if (s.basic !== "pass") return "basic";
    if (E.SKILLS[skill] && E.SKILLS[skill].unit === "既習") return "retention";
    if (s.standard !== "pass" && has("standard")) return "standard";
    if (s.application !== "pass" && has("application")) return "application";
    return "retention";
  }

  // 問題が足りないときに、除外条件を段階的にゆるめる順番。
  // どの段階でも「今回すでに出した問題」「前回のチェックの問題」「3日以内に解いた問題」は出さない
  // （同じ問題が短期間に続かないことを、問題数より優先する）。
  var RELAX_STAGES = [
    { stage: 0, checks: CONFIG.RECENT_EXCLUDE_CHECKS, days: CONFIG.RECENT_EXCLUDE_DAYS, everForRetention: true, label: "通常" },
    { stage: 1, checks: CONFIG.RECENT_EXCLUDE_CHECKS, days: CONFIG.RECENT_EXCLUDE_DAYS, everForRetention: false, label: "定着の確認でも、以前に解いた問題を許可" },
    { stage: 2, checks: 2, days: 5, everForRetention: false, label: "除外を「直近2回・5日以内」にゆるめた" },
    { stage: 3, checks: 1, days: 3, everForRetention: false, label: "除外を「前回のチェック・3日以内」までゆるめた" }
  ];

  // 避ける問題：直近 checks 回のチェックで出た問題 ＋ days 日以内に解いた問題
  function exclusions(history, sessions, now, checks, days) {
    checks = checks === undefined ? CONFIG.RECENT_EXCLUDE_CHECKS : checks;
    days = days === undefined ? CONFIG.RECENT_EXCLUDE_DAYS : days;
    var out = {};
    var finished = (sessions || []).filter(function (s) { return s.finished_at; })
      .sort(function (a, b) { return Date.parse(b.finished_at) - Date.parse(a.finished_at); })
      .slice(0, checks);
    var recentSessionIds = {};
    var why = "直近" + checks + "回のチェックで出題";
    finished.forEach(function (s) { recentSessionIds[s.id] = true; (s.question_ids || []).forEach(function (q) { out[baseId(q)] = why; }); });
    history.forEach(function (a) {
      var id = baseId(a.question_id);
      if (a.session_id && recentSessionIds[a.session_id] && a.context !== "lesson") out[id] = out[id] || why;
      if (now - t(a) < days * E.DAY) out[id] = out[id] || days + "日以内に解いた";
    });
    return out;
  }

  // ---------- 1回分のチェックを組み立てる ----------
  // input: { states, history, sessions, now, rng }
  function buildCheck(input) {
    var states = input.states, history = input.history || [], now = input.now;
    var rng = input.rng || Math.random;
    var excluded = exclusions(history, input.sessions, now);
    var stageExcl = RELAX_STAGES.map(function (st) { return Object.keys(exclusions(history, input.sessions, now, st.checks, st.days)); });
    var everAnswered = {};
    history.forEach(function (a) { everAnswered[baseId(a.question_id)] = true; });
    var shortage = [];

    var candidates = [], maintenance = [], notDue = [], unmeasured = [];
    var curUnit = input.school && input.school.current_unit, unitAt = E.SELECTABLE_UNITS.indexOf(curUnit);
    var recentUnits = unitAt === -1 ? [] : E.SELECTABLE_UNITS.slice(Math.max(0, unitAt - 1), unitAt + 1);
    E.SKILL_ORDER.forEach(function (skill, order) {
      var s = states[skill];
      var act = activity(skill, history);
      var due = dueOf(s, act, now);
      var entry = { skill: skill, label: E.SKILLS[skill].label, order: order, confidence: s ? s.confidence : 0,
        status: s ? s.learning_status : "not_checked", due: due, reasons: [], priority: null };
      // 学校でまだ習っていないスキルは、定期チェックに出さない（未学習は苦手ではない）
      if (E.schoolSkillStatus(skill, input.school) === "not_learned") { entry.why_not = "学校でまだ習っていない"; notDue.push(entry); return; }
      if (!due) {
        var never = (!s || !s.attempt_count) && !(s && s.reason && s.reason.attempts);
        var schoolSt = E.schoolSkillStatus(skill, input.school);
        // まだ一度もチェックしていない人（記録なし）には出さない：まず、はじめてのチェックから
        if (never && history.length && (schoolSt === "learned" || schoolSt === "current") && recentUnits.indexOf(E.SKILLS[skill].unit) !== -1) {
          entry.reasons = [{ p: 6, text: PRIORITY_TEXT[6] }];
          entry.priority = 6; entry.level = "basic"; entry.levelReason = "まだ記録がないので、基礎の問題で確かめる";
          entry.retentionPurpose = false; entry.everIds = act.everIds;
          unmeasured.push(entry);
          return;
        }
        entry.why_not = s && s.learning_status === "not_learned" ? "未学習" : "まだ記録がない"; notDue.push(entry); return;
      }
      if (!due.byDays && !due.byAttempts) {
        entry.why_not = "前回の確認から" + CONFIG.COMPASS_CHECK_DAYS + "日たっておらず、練習も" + CONFIG.COMPASS_CHECK_MIN_ATTEMPTS + "問未満";
        notDue.push(entry);
        return;
      }
      entry.reasons = reasonsOf(s, act, due);
      entry.level = levelOf(s, skill);
      entry.levelReason = entry.level === "retention" && E.SKILLS[skill].unit === "既習"
        ? "前の学年までの内容で基礎はできているので、前とは違う問題で定着を確かめる"
        : LEVEL_REASON[entry.level];
      // 定着を確かめる目的なら、そのスキルで一度でも解いた問題は出さない
      var firstPass = s.first_pass_at ? Date.parse(s.first_pass_at) : null;
      entry.retentionPurpose = (firstPass !== null && now - firstPass >= E.CONFIG.retentionDays * E.DAY && s.retention !== "pass") ||
        entry.reasons.some(function (r) { return r.p === 4; }) || entry.level === "retention";
      entry.everIds = act.everIds;
      if (entry.reasons.length) {
        entry.priority = Math.min.apply(null, entry.reasons.map(function (r) { return r.p; }));
        candidates.push(entry);
      } else {
        maintenance.push(entry);
      }
    });
    // 前回の原因さがしで確かめきれなかった前提スキルは、発生条件に関係なく最優先で確かめる
    pendingFromExplorations(input.explorations, history, now).forEach(function (p) {
      if (E.schoolSkillStatus(p.skill, input.school) === "not_learned") return;
      var s = states[p.skill];
      var existing = candidates.filter(function (c) { return c.skill === p.skill; })[0];
      var reason = { p: 0, text: PRIORITY_TEXT[0] + "（「" + E.SKILLS[p.from].label + "」の前提）" };
      if (existing) { existing.reasons.unshift(reason); existing.priority = 0; return; }
      [maintenance, notDue].forEach(function (list) {
        for (var i = list.length - 1; i >= 0; i--) if (list[i].skill === p.skill) list.splice(i, 1);
      });
      var level = s && s.attempt_count ? levelOf(s, p.skill) : "basic";
      candidates.push({ skill: p.skill, label: E.SKILLS[p.skill].label, order: E.SKILL_ORDER.indexOf(p.skill),
        confidence: s ? s.confidence : 0, status: s ? s.learning_status : "not_checked", due: null,
        reasons: [reason], priority: 0, level: level, levelReason: "前回確かめきれなかった前提なので、" + LEVEL_JA[level] + "の問題で確かめる",
        retentionPurpose: false, everIds: activity(p.skill, history).everIds });
    });
    candidates.sort(function (a, b) { return a.priority - b.priority || a.confidence - b.confidence || a.order - b.order; });
    maintenance.sort(function (a, b) { return a.confidence - b.confidence || a.order - b.order; });

    var chosen = [], used = [];
    function countFor(skill) { return chosen.filter(function (c) { return c.skill === skill; }).length; }
    // 1問えらぶ。段階（除外のゆるさ）を外側、レベルを内側にまわす：
    // 「同じ問題をくり返す」より「同じスキルの別レベルの未出題問題」を先に使うため。
    function pickFor(c) {
      if (chosen.length >= CONFIG.MAX_QUESTIONS || countFor(c.skill) >= CONFIG.MAX_PER_SKILL) return false;
      var q = null, stage = null;
      var levels = FALLBACK[c.level];
      for (var s = 0; s < RELAX_STAGES.length && !q; s++) {
        var st = RELAX_STAGES[s];
        var ex = stageExcl[s].concat(used, c.retentionPurpose && st.everForRetention ? c.everIds : []);
        for (var i = 0; i < levels.length && !q; i++) {
          q = SC.bank.pick(c.skill, levels[i], { history: history, exclude: ex, rng: rng });
          if (q) stage = st;
        }
      }
      if (!q) {
        shortage.push({ skill: c.skill, label: c.label, level: c.level, result: "skipped", note: "除外を最後の段階までゆるめても出せる問題がなかったので、今回は出題しない" });
        return false;
      }
      var reused = !!everAnswered[q.id];
      if (stage.stage > 0) shortage.push({ skill: c.skill, label: c.label, level: c.level, result: reused ? "reused" : "relaxed", question_id: q.id, stage: stage.stage, note: stage.label });
      used.push(q.id);
      chosen.push({
        skill: c.skill, label: c.label, level: q.level, planned_level: c.level, question_id: q.id,
        reason: (c.reasons.length ? c.reasons.map(function (r) { return r.text; }).join("・") : "定期の確認") + "／" + c.levelReason +
          (q.level !== c.level ? "（" + LEVEL_JA[c.level] + "の問題が残っていないため、" + LEVEL_JA[q.level] + "の問題で代用）" : "") +
          (stage.stage > 0 ? "（問題不足のため" + (reused ? "再利用" : "条件を緩和") + "：" + stage.label + "）" : ""),
        relax_stage: stage.stage,
        reused: reused && stage.stage > 0
      });
      return true;
    }

    // 1巡目：優先度の高いスキルから1問ずつ。
    // 学校で習ったのに一度も確かめていないスキル（いまの単元と、ひとつ前の単元・1回2つまで）は、
    // 原因さがしの続きのすぐあとに入れる（後ろに回すと、問題数の上限で毎回あふれて、いつまでも測れない）
    var urgent = candidates.filter(function (c) { return c.priority === 0; }), rest = candidates.filter(function (c) { return c.priority > 0; });
    urgent.forEach(function (c) { pickFor(c); });
    unmeasured.sort(function (a, b) { return a.order - b.order; }).slice(0, 2).forEach(function (c) { if (pickFor(c)) candidates.push(c); });
    rest.forEach(function (c) { pickFor(c); });
    // 2巡目：確かさが低い・誤答が増えているスキルに2問目
    candidates.forEach(function (c) {
      if (c.reasons.some(function (r) { return r.p === 1 || r.p === 5; })) pickFor(c);
    });
    // 3問に満たなければ、条件は満たしているが優先度のないスキルを1問ずつ
    if (chosen.length < CONFIG.MIN_QUESTIONS) maintenance.forEach(function (c) { if (chosen.length < CONFIG.MIN_QUESTIONS) pickFor(c); });
    // それでも足りなければ、候補スキルに2問目
    if (chosen.length < CONFIG.MIN_QUESTIONS) candidates.forEach(function (c) { if (chosen.length < CONFIG.MIN_QUESTIONS) pickFor(c); });

    return {
      now: now,
      candidates: candidates, maintenance: maintenance, notDue: notDue, unmeasured: unmeasured,
      excluded: Object.keys(excluded).map(function (id) { return { id: id, why: excluded[id] }; }),
      shortage: shortage,
      chosen: chosen,
      questions: chosen.map(function (c) { return c.question_id; })
    };
  }

  // 原因さがしの続き：直近14日の道すじで確かめきれなかった前提のうち、そのあとまだチェックしていないもの
  function pendingFromExplorations(explorations, history, now) {
    var out = [], seen = {};
    (explorations || []).forEach(function (x) {
      var c = x.conclusion;
      if (!c || (!(c.pending_skills || []).length && !(c.pending_findings || []).length)) return;
      var at = Date.parse(x.date);
      if (now - at > 14 * E.DAY) return;
      // 「次回」のチェックに回す：原因さがしをした当日は、続きのチェックを出さない（同じ日に何度もチェックさせない）
      if (dateKey(at) === dateKey(now)) return;
      var skills = (c.pending_skills || []).concat((c.pending_findings || []).map(function (f) { return f.diagnostic_target; }).filter(Boolean));
      skills.forEach(function (skill) {
        if (seen[skill]) return;
        var checkedSince = history.some(function (a) { return a.skill === skill && a.context !== "lesson" && t(a) > at; });
        if (checkedSince) return;
        seen[skill] = true;
        out.push({ skill: skill, from: x.frontier || x.symptom.skill });
      });
    });
    return out;
  }

  // 原因さがし用に、前提スキルの問題を1問えらぶ（基礎から。足りなければ段階的に除外をゆるめる）
  function pickProbe(input, skill, used) {
    var history = input.history || [];
    var everAnswered = {};
    history.forEach(function (a) { everAnswered[baseId(a.question_id)] = true; });
    for (var s = 0; s < RELAX_STAGES.length; s++) {
      var st = RELAX_STAGES[s];
      var ex = Object.keys(exclusions(history, input.sessions, input.now, st.checks, st.days)).concat(used || []);
      var levels = ["basic", "retention", "standard"];
      for (var i = 0; i < levels.length; i++) {
        var q = SC.bank.pick(skill, levels[i], { history: history, exclude: ex, rng: input.rng || Math.random });
        if (q) return { question_id: q.id, relax_stage: st.stage, reused: st.stage > 0 && !!everAnswered[q.id] };
      }
    }
    return null;
  }

  // 単元のはじめてのコンパスチェック（一次関数は B1〜B5。それ以外の単元は、問題バンクの診断用の問題）。
  // まちがえたら、定期チェックと同じしくみで原因さがし（追加は最初のチェックの上限まで）をする
  // school：学校のようす。学校でまだ習っていないスキルの問題は出さない（未学習は苦手ではない）
  // 問題数は原則3〜5問。いまの単元の「複数のスキル」から現在地を見るのが目的：
  //   1. 習ったスキル（学習中をふくむ）から1問ずつ。診断用の問題があるスキルを先に、なければ基礎の問題
  //   2. 5問をこえるときは、学校でいま学習中のスキルを残して、前提に近い順
  //   3. 3問に満たないとき（学校が単元を始めたばかり）は、学習中のスキル → 習ったスキルの順に2問目（基礎・別の問題）
  //   習ったスキルが1つ・2つしかなければ、未学習の問題は足さない
  var UNIT_CHECK = { MIN: 3, MAX: 5 };
  function unitCheck(unit, school) {
    var debug = { unit: unit, candidates: [], excluded: [], final_count: 0 };
    var cands = [];
    (E.UNITS[unit] || []).forEach(function (k) {
      var st = E.schoolSkillStatus(k, school);
      if (st === "not_learned") { debug.excluded.push({ skill: k, why: "学校でまだ習っていない" }); return; }
      var pool = Object.keys(SC.QUESTIONS).map(function (id) { return SC.QUESTIONS[id]; })
        .filter(function (q) { return q.origin === "bank" && q.skill === k && !q.reason_only; });
      var diag = pool.filter(function (q) { return q.usage === "diagnosis"; }).sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      var basic = pool.filter(function (q) { return q.usage !== "diagnosis" && q.level === "basic"; }).sort(function (a, b) { return a.id < b.id ? -1 : 1; });
      if (!diag.length && !basic.length) { debug.excluded.push({ skill: k, why: "問題バンクに診断用・基礎の問題がない" }); return; }
      cands.push({ skill: k, school: st || "learned", first: (diag[0] || basic[0]).id, diag: !!diag.length, moreDiag: diag.slice(1).map(function (q) { return q.id; }), second: basic.map(function (q) { return q.id; }) });
    });
    debug.candidates = cands.map(function (c) { return { skill: c.skill, school: c.school, diagnosis: c.diag }; });
    var rank = function (c) { return E.ROOT_ORDER.indexOf(c.skill); };
    // 診断用の問題（単元ごとに作ったセット）を先に、5問まで。学校でいま学習中のスキル → 前提に近い順。
    // 診断用の問題がないスキルは、残りの枠に基礎の問題で1問ずつ
    var order = function (a, b) { return (a.school === "current" ? 0 : 1) - (b.school === "current" ? 0 : 1) || rank(a) - rank(b); };
    var items = [], picked = [];
    cands.filter(function (c) { return c.diag; }).sort(order).forEach(function (c) {
      [c.first].concat(c.moreDiag).forEach(function (id, i) {
        if (items.length >= UNIT_CHECK.MAX) return;
        items.push({ skill: c.skill, question_id: id, second: false });
        if (i === 0) picked.push(c);
      });
    });
    cands.filter(function (c) { return !c.diag; }).sort(order).forEach(function (c) {
      if (items.length >= UNIT_CHECK.MAX) return;
      items.push({ skill: c.skill, question_id: c.first, second: false });
      picked.push(c);
    });
    cands.forEach(function (c) { if (picked.indexOf(c) === -1) debug.excluded.push({ skill: c.skill, why: "問題数の上限（" + UNIT_CHECK.MAX + "問）。診断用の問題・学習中のスキル・前提に近いスキルを先に出す" }); });
    // 3問に満たないとき：学習中のスキルから2問目（同じ問題はくり返さない）
    var extra = picked.slice().sort(function (a, b) { return (a.school === "current" ? 0 : 1) - (b.school === "current" ? 0 : 1) || rank(a) - rank(b); });
    for (var round = 0; items.length < UNIT_CHECK.MIN && round < 2; round++) {
      extra.forEach(function (c) {
        if (items.length >= UNIT_CHECK.MIN) return;
        var used = items.map(function (x) { return x.question_id; });
        var id = c.second.filter(function (x) { return used.indexOf(x) === -1; })[0];
        if (id) items.push({ skill: c.skill, question_id: id, second: true });
      });
    }
    items.sort(function (a, b) { return E.ROOT_ORDER.indexOf(a.skill) - E.ROOT_ORDER.indexOf(b.skill) || (a.second ? 1 : 0) - (b.second ? 1 : 0); });
    var chosen = items.map(function (x) {
      var q = SC.QUESTIONS[x.question_id];
      return { skill: x.skill, label: E.SKILLS[x.skill].label, level: q.level, planned_level: q.level, question_id: x.question_id,
        reason: "「" + unit + "」のはじめてのチェック：「" + E.SKILLS[x.skill].label + "」の今の力を確かめる" + (x.second ? "（学校が単元を始めたばかりなので、もう1問）" : "") };
    });
    debug.selected = chosen.map(function (c) { return c.question_id; });
    debug.final_count = chosen.length;
    return { chosen: chosen, questions: chosen.map(function (c) { return c.question_id; }), unit: unit, debug: debug };
  }

  // ホームに出すお知らせ。「今日はあとで」を選んだ日は出さない
  function notice(input) {
    var check = buildCheck(input);
    var snoozed = input.snoozeDate === dateKey(input.now);
    return {
      show: check.chosen.length > 0 && !snoozed,
      snoozed: snoozed,
      count: check.chosen.length,
      skills: check.chosen.map(function (c) { return c.label; }).filter(function (v, i, a) { return a.indexOf(v) === i; }),
      check: check
    };
  }

  // ---------- 結果の読み取り ----------
  function pickState(s) {
    return { learning_status: s.learning_status, confidence: s.confidence, basic: s.basic, standard: s.standard,
      application: s.application, retention: s.retention,
      // 図形：角度（value）と根拠（reason）の状態のひとこと（例：角度を求める力は理解だが、理由の理解はまだ安定していない）
      geo_note: s.overall && s.overall.note && s.reason && s.reason.attempts ? s.overall.note : null };
  }
  function snapshotSkills(states, skills) {
    var out = {};
    skills.forEach(function (k) { out[k] = pickState(states[k]); });
    return out;
  }

  // before / after から、スキルごとの変化とコメントを作る
  function compare(before, after, skills) {
    var items = skills.map(function (k) {
      var b = before[k], a = after[k];
      var rb = E.STATUS_RANK[b.learning_status] || 0, ra = E.STATUS_RANK[a.learning_status] || 0;
      var diff = Math.round((a.confidence - b.confidence) * 100) / 100;
      var change;
      // 前回の記録がない（はじめて確かめた）スキルは、上がった・越えたとは言わない
      if (b.learning_status === "not_checked" || b.learning_status === "not_learned") change = "first";
      else if (ra > rb) change = "up";
      else if (ra < rb) change = "down";
      else if (diff >= 0.05) change = "up";
      else if (diff <= -0.05) change = "down";
      else change = ra >= 3 ? "same_good" : "same_weak";
      return { skill: k, label: E.SKILLS[k].label, before: b, after: a, diff: diff, change: change, crossed: change !== "first" && ra > rb && ra >= 3 };
    });
    var lines = items.map(function (i) { return line(i) + (i.after.geo_note ? "（" + i.after.geo_note + "）" : ""); });
    function line(i) {
      if (i.change === "first") {
        return (E.STATUS_RANK[i.after.learning_status] || 0) >= 3 ? i.label + "は、今回はじめて確かめました。いまの段階は「" + E.STATUS_VIEW[i.after.learning_status].label + "」です。"
          : i.label + "は、今回はじめて確かめました。もう少し確認するとよさそうです。";
      }
      if (i.change === "up") return i.label + "は前回より安定してきました。";
      if (i.change === "same_good") return i.label + "は変わらず安定しています。";
      if (i.change === "same_weak") return i.label + "は、もう少し確認するとよさそうです。";
      return i.label + "は今回少し不安定でした。1回の結果なので、次のチェックでもう一度確かめます。";
    }
    return { items: items, comment: lines.join("\n"), crossed: items.filter(function (i) { return i.crossed; }) };
  }

  // ---------- 今日の学習の方針（skill_state から） ----------
  // 根本（前提）に近いスキルから順に見て、最初の「まだ不安定」なスキルを今日の中心にする
  var PLAN_ORDER = ["signed", "algebra", "coord", "proportion", "change", "substitution", "rate", "slopeIntercept", "form"];
  function planFromStates(states) {
    function weak(k) { var s = states[k]; return !!s && (s.learning_status === "needs_review" || s.learning_status === "learning"); }
    return planFromWeak(weak, states);
  }

  // 「戻る場所」（原因さがしの結論）から今日の学習の種類を決める
  var PLAN_OF_SKILL = {
    signed: "signed", algebra: "substitution", coord: "coord", proportion: "proportion", change: "change",
    substitution: "substitution", rate: "rate", slopeIntercept: "slope", form: "connect"
  };
  function planForSkill(skill) { return PLAN_OF_SKILL[skill] || null; }

  function planFromWeak(weak, states) {
    for (var i = 0; i < PLAN_ORDER.length; i++) {
      var k = PLAN_ORDER[i];
      if (!weak(k)) continue;
      var key = {
        signed: "signed", algebra: "substitution", coord: "coord", proportion: "proportion", change: "change",
        substitution: "substitution", rate: weak("change") ? "change" : "rate",
        slopeIntercept: "slope", form: weak("slopeIntercept") ? "slope" : "connect"
      }[k];
      return { planKey: key, focus: k };
    }
    // 基礎が安定したら、いきなり応用ではなく、まず標準（形を変えた問題）へ。
    // 標準プランは「変化の割合」と「グラフ・式」の標準問題なので、そのどちらかを中心にする
    var STANDARD_FOCUS = ["form", "rate", "slopeIntercept", "substitution", "change"];
    for (var j = 0; j < STANDARD_FOCUS.length; j++) {
      var s = states[STANDARD_FOCUS[j]];
      if (s && s.attempt_count && s.standard !== "pass") {
        return { planKey: "standard", focus: STANDARD_FOCUS[j] === "form" || STANDARD_FOCUS[j] === "rate" ? STANDARD_FOCUS[j] : "form" };
      }
    }
    return { planKey: "challenge", focus: null };
  }

  function planWhy(result, plan) {
    var ups = result.items.filter(function (i) { return i.change === "up"; }).map(function (i) { return i.label; });
    var focusLabel = plan.focus ? E.SKILLS[plan.focus].label : null;
    var focusChecked = result.items.filter(function (i) { return i.skill === plan.focus; })[0];
    var head = ups.length ? "今回のチェックで、" + ups.join("・") + "は前回より安定してきました。" : "";
    if (!focusLabel) return head + "大きなつまずきは見つからなかったので、今日は知識を組み合わせる問題に挑戦します。";
    if (focusChecked && focusChecked.change !== "up") return head + focusLabel + "はまだ少し不安定そうなので、今日はここをもう一度確認します。";
    return head + "今日は次の段階として、「" + focusLabel + "」を中心に練習します。";
  }

  SC.compass = {
    CONFIG: CONFIG, PRIORITY_TEXT: PRIORITY_TEXT, RELAX_STAGES: RELAX_STAGES, dateKey: dateKey, baseId: baseId, exclusions: exclusions,
    pickProbe: pickProbe, pendingFromExplorations: pendingFromExplorations, unitCheck: unitCheck, UNIT_CHECK: UNIT_CHECK,
    buildCheck: buildCheck, notice: notice, snapshotSkills: snapshotSkills, compare: compare,
    planFromStates: planFromStates, planForSkill: planForSkill, planWhy: planWhy
  };
})(typeof window !== "undefined" ? window : globalThis);
