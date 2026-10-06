/*
 * Study Compass — 学習データの保存窓口（Phase 1）
 *
 * いまは端末のブラウザ（localStorage）だけに保存する。
 * 読み書きはすべてこのファイルを通すので、将来 Firebase / Supabase などへ移すときは
 * ここの load / persist を差し替えればよい（データの形は変えない）。
 *
 * 保存するもの（キー "study-compass/v2"）
 *   version, user_id（端末内で作る匿名ID。個人情報は持たない）, created_at,
 *   profile.school_progress（単元ごとの 習った / 学習中 / まだ）,
 *   answer_history[], sessions[], skill_state{}（履歴から計算した結果の控え）,
 *   debug.time_offset_days（動作確認用に日付を進める）
 */
(function (root) {
  var SC = (root.SC = root.SC || {});
  var E = SC.engine;

  var KEY = "study-compass/v2";
  var LEGACY_HISTORY_KEY = "study-compass-contest/history/v1";
  var LEGACY_STATE_KEY = "study-compass-contest/state/v1";

  var backend = {
    read: function (key) {
      try { var raw = root.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    },
    write: function (key, value) {
      try { root.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove: function (key) {
      try { root.localStorage.removeItem(key); } catch (e) { /* 消せなくても続ける */ }
    }
  };

  function randomId() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return "u-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function fresh() {
    return {
      version: 2,
      user_id: randomId(),
      created_at: new Date().toISOString(),
      profile: { school_progress: {} },
      answer_history: [],
      sessions: [],
      compass_check_history: [],
      explorations: [],
      plans: [],
      skill_state: {},
      debug: { time_offset_days: 0 }
    };
  }

  function valid(d) {
    return d && d.version === 2 && typeof d.user_id === "string" &&
      Array.isArray(d.answer_history) && Array.isArray(d.sessions) && d.profile;
  }

  // コンテスト版（v1）の記録を、1回のチェック＝1セッションとして履歴に移す。v1 のデータ自体は消さない。
  function migrateV1(d) {
    var old = backend.read(LEGACY_HISTORY_KEY);
    if (!Array.isArray(old) || !old.length) return d;
    var Q = SC.QUESTIONS;
    var FEELING = { good: "できた", soso: "もう少し", hard: "わからなかった" };
    old.forEach(function (entry) {
      if (!entry || typeof entry.answer_history !== "object") return;
      var feeling = FEELING[entry.feeling] || entry.feeling || null;
      var sid = "migrated_" + (entry.date || Math.random().toString(36).slice(2));
      var ids = [];
      Object.keys(entry.answer_history).forEach(function (qid) {
        var a = entry.answer_history[qid], q = Q[qid];
        if (!q || !a) return;
        var t = Date.parse(a.at || entry.date) || Date.now();
        var rec = E.makeAnswerRecord(q, { status: a.status, hintUsed: a.hintUsed }, { userId: d.user_id, sessionId: sid, context: "compass_check", now: t });
        rec.self_evaluation = feeling;
        d.answer_history.push(rec);
        ids.push(qid);
      });
      if (ids.length) {
        d.sessions.push({ id: sid, type: "compass_check", unit: entry.unit || "一次関数", started_at: entry.date, finished_at: entry.date,
          question_ids: ids, plan_key: entry.plan || null, self_evaluation: feeling, migrated_from: "v1" });
      }
    });
    return d;
  }

  var data = null;

  function load() {
    var d = backend.read(KEY);
    if (!valid(d)) {
      d = migrateV1(fresh());
      data = d;
      recompute();
      return data;
    }
    d.debug = d.debug || { time_offset_days: 0 };
    d.profile.school_progress = d.profile.school_progress || {};
    d.compass_check_history = d.compass_check_history || [];
    d.explorations = d.explorations || [];
    d.plans = d.plans || [];
    data = d;
    return data;
  }

  function persist() { backend.write(KEY, data); }

  function get() { return data || load(); }

  // 動作確認用に日付を進められるようにしている（?debug=1 のときだけ画面から操作できる）
  function now() {
    var off = (get().debug && get().debug.time_offset_days) || 0;
    return Date.now() + off * E.DAY;
  }

  // ---------- 学校のようす（profile.school） ----------
  // { current_unit, units: { 単元: { status, current_skill, skills } }, next_test: { date, units }, updated_at, snooze_date }
  // 以前の形（profile.current_unit・profile.school_progress = { 単元: done/learning/notyet }）も、同じ内容で書いておく
  var TO_OLD = { learned: "done", learning: "learning", not_learned: "notyet" };
  var FROM_OLD = { done: "learned", learning: "learning", notyet: "not_learned" };
  var UNIT_ORDER = E.SELECTABLE_UNITS; // 中2で学校が進む順（式の計算 → 連立方程式 → 一次関数）

  // 以前のデータから作る。答えていない単元は、いまの単元より前なら「習った」、後なら「まだ」
  function schoolFromOld(p) {
    var cur = p.current_unit || "一次関数", at = UNIT_ORDER.indexOf(cur), units = {};
    UNIT_ORDER.forEach(function (u, i) {
      var old = p.school_progress && p.school_progress[u];
      var status = old ? FROM_OLD[old] : i < at ? "learned" : i === at ? "learning" : "not_learned";
      units[u] = { status: status, current_skill: null };
    });
    return { current_unit: cur, units: units, next_test: null, updated_at: null, snooze_date: null };
  }
  function normalizeSchool(s) {
    UNIT_ORDER.forEach(function (u) {
      var x = s.units[u] = s.units[u] || { status: "not_learned", current_skill: null };
      x.skills = E.expandUnit(u, x.status, x.status === "learning" ? x.current_skill : null);
    });
    return s;
  }
  function school() {
    var p = get().profile;
    if (!p.school) { p.school = normalizeSchool(schoolFromOld(p)); persist(); }
    // あとから増えた単元（例：合同と証明）は、保存済みのデータに無いので「まだ」として足す
    else if (UNIT_ORDER.some(function (u) { return !p.school.units[u]; })) { normalizeSchool(p.school); persist(); }
    return p.school;
  }
  // 古い形にも書きもどす（既存の処理・以前のデータとの互換のため）
  function syncOld() {
    var p = get().profile, s = school();
    p.current_unit = s.current_unit;
    UNIT_ORDER.forEach(function (u) { p.school_progress[u] = TO_OLD[s.units[u].status]; });
  }
  // 学校のようすを更新する。unit：いまの単元、currentSkill：「どこまで進んだ？」で選んだスキル（なければ単元の中は分からない）
  // 前の単元は「習った」、後の単元は「まだ」に、ふつうは自動でそろえる（opts.keepOthers なら変えない）
  function setSchool(unit, currentSkill, opts) {
    opts = opts || {};
    var s = school(), at = UNIT_ORDER.indexOf(unit);
    s.current_unit = unit;
    UNIT_ORDER.forEach(function (u, i) {
      var x = s.units[u];
      if (u === unit) { x.status = opts.unitStatus || "learning"; x.current_skill = x.status === "learning" ? (currentSkill || null) : null; }
      else if (!opts.keepOthers) { x.status = i < at ? "learned" : "not_learned"; x.current_skill = null; }
    });
    if (opts.nextTest !== undefined) s.next_test = opts.nextTest;
    s.updated_at = new Date(now()).toISOString();
    s.snooze_date = null;
    normalizeSchool(s);
    syncOld();
    recompute();
    return s;
  }
  function setSchoolSnooze(dateKey) { school().snooze_date = dateKey; persist(); }
  function schoolSkillStatus(skill) { return E.schoolSkillStatus(skill, school()); }

  // 学校でいま学習中の単元
  function currentUnit() { return (get().profile.school && get().profile.school.current_unit) || get().profile.current_unit || "一次関数"; }
  function setCurrentUnit(unit) {
    var s = school();
    if (s.current_unit !== unit) setSchool(unit, null, { unitStatus: s.units[unit] ? s.units[unit].status === "learned" ? "learned" : "learning" : "learning" });
    else { get().profile.current_unit = unit; persist(); }
  }

  // 単元ごとの進み具合（以前の形：done / learning / notyet）
  function schoolProgress(unit) {
    var s = school(), u = s.units[unit || currentUnit()];
    if (u) return TO_OLD[u.status];
    return get().profile.school_progress[unit || currentUnit()] || "learning";
  }

  function recompute() {
    var d = get();
    d.skill_state = E.computeSkillStates(d.answer_history, {
      schoolProgressByUnit: d.profile.school_progress, currentUnit: currentUnit(), schoolProgress: schoolProgress(), school: school(), now: now() });
    persist();
    return d.skill_state;
  }

  // 初期設定の「習った／途中／まだ」から（単元の中のどこまでかは、あとで「学校のようす」で）
  function setSchoolProgress(unit, value) {
    var s = school(), keep = s.units[unit] && s.units[unit].status === FROM_OLD[value] ? s.units[unit].current_skill : null;
    get().profile.school_progress[unit] = value;
    setSchool(unit, keep, { unitStatus: FROM_OLD[value] || "learning" });
  }

  function startSession(type, unit) {
    var s = { id: E.makeId("ses", now()), type: type, unit: unit || currentUnit(), started_at: new Date(now()).toISOString(),
      finished_at: null, question_ids: [], plan_key: null, self_evaluation: null, skill_snapshot: null };
    get().sessions.push(s);
    persist();
    return s.id;
  }

  function session(id) {
    var list = get().sessions;
    for (var i = list.length - 1; i >= 0; i--) if (list[i].id === id) return list[i];
    return null;
  }

  function addAnswer(q, result, ctx) {
    var d = get();
    // 学校でまだ習っていないスキルの問題は「先取り」として記録する（まちがえても理解度に入れない）
    var r2 = {}; for (var k in result) r2[k] = result[k];
    if (schoolSkillStatus(q.skill) === "not_learned") r2.preview = true;
    var rec = E.makeAnswerRecord(q, r2, { userId: d.user_id, sessionId: ctx.sessionId, context: ctx.context, now: now() });
    d.answer_history.push(rec);
    var s = ctx.sessionId && session(ctx.sessionId);
    if (s && ctx.context !== "lesson" && s.question_ids.indexOf(q.id) === -1) s.question_ids.push(q.id);
    recompute();
    return rec;
  }

  // チェックが終わったときに一度だけ呼ぶ。確かさの控えを残して、次回との比較に使う
  function finishSession(id, info) {
    var s = session(id);
    if (!s || s.finished_at) return s;
    s.finished_at = new Date(now()).toISOString();
    s.plan_key = info.plan_key || null;
    s.focus_skill = info.focus_skill || null;
    s.suspected_root_causes = info.suspected_root_causes || [];
    s.skill_snapshot = E.snapshot(recompute());
    persist();
    return s;
  }

  // ふり返り（できた / もう少し / わからなかった）を、その回の回答すべてに書き込む
  function setSelfEvaluation(id, value) {
    var s = session(id);
    if (s) s.self_evaluation = value;
    get().answer_history.forEach(function (a) { if (a.session_id === id) a.self_evaluation = value; });
    persist();
  }

  // 前回までの確かさ（今回のチェックより前に終わったセッションの控え）
  function previousSnapshot(currentId) {
    var list = get().sessions;
    for (var i = list.length - 1; i >= 0; i--) {
      var s = list[i];
      if (s.id !== currentId && s.finished_at && s.skill_snapshot) return s.skill_snapshot;
    }
    return null;
  }

  function finishedSessions() {
    return get().sessions.filter(function (s) { return s.finished_at; });
  }
  // 終わったコンパスチェック（はじめてのチェック・定期チェック・テスト範囲チェック）。毎日の学習（daily）は数えない
  function finishedChecks() {
    return finishedSessions().filter(function (s) { return s.type !== "daily"; });
  }

  // 記録をすべて消す（v1 の記録も一緒に。消さないと次に開いたとき取り込み直してしまう）
  function reset() {
    backend.remove(KEY);
    backend.remove(LEGACY_HISTORY_KEY);
    backend.remove(LEGACY_STATE_KEY);
    data = fresh();
    persist();
    return data;
  }

  function addDays(n) {
    get().debug.time_offset_days = (get().debug.time_offset_days || 0) + n;
    recompute();
  }
  function resetDays() { get().debug.time_offset_days = 0; recompute(); }

  function exportJSON() { return JSON.stringify(get(), null, 2); }

  // ---------- 定期コンパスチェック（Phase 2） ----------
  // { id, session_id, date, questions[], skills[], skill_ids[], reasons{}, before{}, after{}, plan_key }
  function addCompassCheck(entry) {
    get().compass_check_history.push(entry);
    persist();
    return entry;
  }
  function compassHistory() { return get().compass_check_history; }
  function compassCheck(sessionId) {
    var list = get().compass_check_history;
    for (var i = list.length - 1; i >= 0; i--) if (list[i].session_id === sessionId) return list[i];
    return null;
  }
  // ---------- つまずきの原因さがし（Phase 4） ----------
  // 道すじ（js/rootcause.js の trail）に session_id と日付を付けて残す
  function addExploration(trail, sessionId) {
    var list = get().explorations;
    var rec = JSON.parse(JSON.stringify(trail));
    rec.session_id = sessionId || null;
    rec.date = new Date(now()).toISOString();
    for (var i = 0; i < list.length; i++) if (list[i].id === rec.id) { list[i] = rec; persist(); return rec; }
    list.push(rec);
    persist();
    return rec;
  }
  function explorations() { return get().explorations; }
  function explorationsFor(sessionId) { return get().explorations.filter(function (x) { return x.session_id === sessionId; }); }

  // ---------- 今日の学習（Phase 5） ----------
  // 設定：今日の時間の初期値と学習目標（毎回聞かず、初期値を保存しておく）
  function settings() {
    var s = get().profile.study_settings || {};
    return { minutes: s.minutes || 30, goal: s.goal || "daily_learning" };
  }
  function setSettings(patch) {
    var s = settings();
    for (var k in patch) s[k] = patch[k];
    get().profile.study_settings = s;
    persist();
    return s;
  }
  // 学校の進み具合（Phase 5 の形）。状況は初期設定の「習った／途中／まだ」から
  function schoolProgressInfo(unit) {
    unit = unit || currentUnit();
    return { grade: "中2", subject: "数学", current_unit: unit, school_status: schoolProgress(unit),
      by_unit: JSON.parse(JSON.stringify(get().profile.school_progress)),
      detail: JSON.parse(JSON.stringify(school())) }; // スキル単位の「習った／学習中／まだ」と次のテスト
  }
  // 作ったプランと、その結果（問題ごとの正誤・ふり返り）
  function addPlan(plan) {
    var rec = JSON.parse(JSON.stringify(plan));
    delete rec.debug;
    get().plans.push(rec);
    if (get().plans.length > 60) get().plans = get().plans.slice(-60);
    persist();
    return rec;
  }
  function updatePlan(id, patch) {
    var list = get().plans;
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].id === id) { for (var k in patch) list[i][k] = patch[k]; persist(); return list[i]; }
    }
    return null;
  }
  function plans() { return get().plans; }

  // ---------- テスト対策（Phase 6） ----------
  // { test_date: "YYYY-MM-DD", range_skills: [...], created_at, active }
  function testPrep() { var t = get().profile.test_prep; return t && t.active ? t : null; }
  function setTestPrep(t) {
    // result：テストが終わったあとに結果を入れる場所（いまはまだ使わない。あとで test_result として足せるように）
    get().profile.test_prep = { id: E.makeId("tst", now()), test_date: t.test_date, range_skills: t.range_skills.slice(), source: t.source || "test_mode",
      created_at: new Date(now()).toISOString(), active: true, result: null };
    persist();
    return get().profile.test_prep;
  }
  function endTestPrep() {
    var t = get().profile.test_prep;
    if (t) {
      t.active = false; t.ended_at = new Date(now()).toISOString();
      // 終わったテストは履歴に残す（あとでテスト結果 test_result を入れられるように）
      var p = get().profile;
      p.test_history = p.test_history || [];
      p.test_history.push(JSON.parse(JSON.stringify(t)));
      persist();
    }
  }

  // 「今日はあとで」。その日のあいだだけホームのお知らせを出さない
  function setSnooze(dateKey) { get().profile.compass_snooze_date = dateKey; persist(); }
  // 単元のはじめてのチェックをしたか（その単元の compass_check のセッションが終わっている）
  function unitCheckDone(unit) {
    return finishedSessions().some(function (s) { return s.type === "compass_check" && s.unit === unit; });
  }
  // 「新しい単元に進んだね」の案内を「今日はあとで」にした日（単元ごと）
  function setUnitCheckSnooze(unit, dateKey) { get().profile.unit_check_snooze = { unit: unit, date: dateKey }; persist(); }
  function unitCheckSnoozed(unit, dateKey) { var z = get().profile.unit_check_snooze; return !!z && z.unit === unit && z.date === dateKey; }
  function snoozeDate() { return get().profile.compass_snooze_date || null; }

  SC.store = {
    KEY: KEY, load: load, get: get, now: now, recompute: recompute,
    schoolProgress: schoolProgress, setSchoolProgress: setSchoolProgress, currentUnit: currentUnit, setCurrentUnit: setCurrentUnit,
    school: school, setSchool: setSchool, setSchoolSnooze: setSchoolSnooze, schoolSkillStatus: schoolSkillStatus,
    startSession: startSession, session: session, finishedChecks: finishedChecks, unitCheckDone: unitCheckDone, setUnitCheckSnooze: setUnitCheckSnooze, unitCheckSnoozed: unitCheckSnoozed, addAnswer: addAnswer, finishSession: finishSession,
    setSelfEvaluation: setSelfEvaluation, previousSnapshot: previousSnapshot, finishedSessions: finishedSessions,
    reset: reset, addDays: addDays, resetDays: resetDays, exportJSON: exportJSON,
    addCompassCheck: addCompassCheck, compassHistory: compassHistory, compassCheck: compassCheck,
    setSnooze: setSnooze, snoozeDate: snoozeDate,
    addExploration: addExploration, explorations: explorations, explorationsFor: explorationsFor,
    settings: settings, setSettings: setSettings, schoolProgressInfo: schoolProgressInfo,
    addPlan: addPlan, updatePlan: updatePlan, plans: plans,
    testPrep: testPrep, setTestPrep: setTestPrep, endTestPrep: endTestPrep,
    _backend: backend
  };
})(typeof window !== "undefined" ? window : globalThis);
