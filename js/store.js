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

  function schoolProgress(unit) { return get().profile.school_progress[unit || "一次関数"] || "learning"; }

  function recompute() {
    var d = get();
    d.skill_state = E.computeSkillStates(d.answer_history, { schoolProgress: schoolProgress("一次関数"), now: now() });
    persist();
    return d.skill_state;
  }

  function setSchoolProgress(unit, value) {
    get().profile.school_progress[unit] = value;
    recompute();
  }

  function startSession(type, unit) {
    var s = { id: E.makeId("ses", now()), type: type, unit: unit || "一次関数", started_at: new Date(now()).toISOString(),
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
    var rec = E.makeAnswerRecord(q, result, { userId: d.user_id, sessionId: ctx.sessionId, context: ctx.context, now: now() });
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

  // 「今日はあとで」。その日のあいだだけホームのお知らせを出さない
  function setSnooze(dateKey) { get().profile.compass_snooze_date = dateKey; persist(); }
  function snoozeDate() { return get().profile.compass_snooze_date || null; }

  SC.store = {
    KEY: KEY, load: load, get: get, now: now, recompute: recompute,
    schoolProgress: schoolProgress, setSchoolProgress: setSchoolProgress,
    startSession: startSession, session: session, addAnswer: addAnswer, finishSession: finishSession,
    setSelfEvaluation: setSelfEvaluation, previousSnapshot: previousSnapshot, finishedSessions: finishedSessions,
    reset: reset, addDays: addDays, resetDays: resetDays, exportJSON: exportJSON,
    addCompassCheck: addCompassCheck, compassHistory: compassHistory, compassCheck: compassCheck,
    setSnooze: setSnooze, snoozeDate: snoozeDate,
    addExploration: addExploration, explorations: explorations, explorationsFor: explorationsFor,
    _backend: backend
  };
})(typeof window !== "undefined" ? window : globalThis);
