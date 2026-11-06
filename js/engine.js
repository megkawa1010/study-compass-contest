/*
 * Study Compass — 学習履歴・理解度エンジン（Phase 1）
 *
 * 考え方
 * - 回答はすべて answer_history に1件ずつ残す（上書きしない）。
 * - skill_state は保存した値を足し引きせず、毎回 answer_history 全体から計算し直す。
 *   → 同じ履歴からは必ず同じ結果になり、あとで保存先を移しても履歴だけ運べばよい。
 * - 一度の結果で決めつけない：確かさ（confidence）には「どのレベルまでできたか」で上限をかけ、
 *   1回の回答で下がる幅も制限する。
 * - 画面を持たない純粋な関数だけを置く（Node からテストできる）。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});

  var DAY = 24 * 60 * 60 * 1000;

  // ---------- 学習地図（スキルと前提スキル） ----------
  // unit が「既習」のものは前の学年までの内容。「まだ習っていない」の影響を受けない。
  // unit：単元。grade：学年。「既習」は単元に分けていない前の学年の土台。
  var SKILLS = {
    // --- 中1 正負の数（中1の単元。中2の前提の確認には下の signed を使う） ---
    negMeaning:     { label: "正負の数の意味・大小", unit: "正負の数", grade: "中1", prerequisites: [] },
    negAddSub:      { label: "正負の数の加法・減法", unit: "正負の数", grade: "中1", prerequisites: ["negMeaning"] },
    negMulDiv:      { label: "正負の数の乗法・除法", unit: "正負の数", grade: "中1", prerequisites: ["negAddSub"] },
    negPower:       { label: "累乗・四則の計算", unit: "正負の数", grade: "中1", prerequisites: ["negMulDiv"] },
    negUse:         { label: "正負の数の利用", unit: "正負の数", grade: "中1", prerequisites: ["negAddSub"] },

    // --- 中1 文字と式 ---
    litExpr:        { label: "文字式の表し方", unit: "文字と式", grade: "中1", prerequisites: ["negMulDiv"] },
    litValue:       { label: "式の値",         unit: "文字と式", grade: "中1", prerequisites: ["litExpr", "negPower"] },
    litCalc:        { label: "一次式の計算",   unit: "文字と式", grade: "中1", prerequisites: ["litExpr", "negAddSub"] },
    litWord:        { label: "数量を文字で表す", unit: "文字と式", grade: "中1", prerequisites: ["litExpr"] },
    litRel:         { label: "関係を式で表す", unit: "文字と式", grade: "中1", prerequisites: ["litWord"] },

    signed:         { label: "正負の数",       unit: "既習",     grade: "中1", prerequisites: [] },
    algebra:        { label: "文字式への代入", unit: "既習",     grade: "中1", prerequisites: ["signed"] },
    // 同類項（文字1つ）は中1の文字式。一次方程式（両辺に x がある問題）の前提なので、中2の単元ではなく土台に置く
    likeTerms:      { label: "同類項をまとめる", unit: "既習",   grade: "中1", prerequisites: ["signed"] },
    // 数 × 多項式。中1の 3(x + 4) から、中2の 3(x − 2y) まで同じスキルとして扱う
    distrib:        { label: "分配法則",       unit: "既習",     grade: "中1", prerequisites: ["signed"] },
    proportion:     { label: "比例",           unit: "既習",     grade: "中1", prerequisites: ["algebra"] },
    coord:          { label: "座標",           unit: "既習",     grade: "中1", prerequisites: ["signed"] },
    // 一直線は180°・一回り360°・角の表し方（∠ABC）。図形の角の土台
    angleBasics:    { label: "角の基本",       unit: "既習",     grade: "中1", prerequisites: [] },
    // --- 中1 一次方程式 ---
    eqMeaning:      { label: "方程式の意味",   unit: "一次方程式", grade: "中1", prerequisites: ["algebra"] },
    eqProperty:     { label: "等式の性質",     unit: "一次方程式", grade: "中1", prerequisites: ["signed"] },
    // 両辺に x がある方程式では、移項のあと x の項をまとめる（同類項）
    transpose:      { label: "移項",           unit: "一次方程式", grade: "中1", prerequisites: ["signed", "algebra", "likeTerms"] },
    eqParen:        { label: "かっこのある方程式", unit: "一次方程式", grade: "中1", prerequisites: ["distrib", "transpose", "signed"] },
    eqFraction:     { label: "分数・小数の方程式", unit: "一次方程式", grade: "中1", prerequisites: ["eqProperty", "transpose"] },
    eqWord:         { label: "方程式の文章題", unit: "一次方程式", grade: "中1", prerequisites: ["eqMeaning", "algebra", "transpose"] },
    // --- 中2 式の計算 ---
    // 文字2つの同類項・かっこの前が − の多項式の減法。連立方程式で「式から式を引く」ときにそのまま使う
    polyAddSub:     { label: "多項式の加法・減法", unit: "式の計算", grade: "中2", prerequisites: ["likeTerms", "signed"] },
    polyMixed:      { label: "かっこを含む式の計算", unit: "式の計算", grade: "中2", prerequisites: ["distrib", "polyAddSub"] },
    // いまの地図では、ほかのスキルの前提にはならない（中3の展開・因数分解へつながる）
    monoMulDiv:     { label: "単項式の乗法・除法", unit: "式の計算", grade: "中2", prerequisites: ["signed"] },
    // 2x + y = 5 → y = −2x + 5。一次関数の式の形にする・代入法の準備に使う
    eqTransform:    { label: "等式の変形",     unit: "式の計算", grade: "中2", prerequisites: ["eqProperty", "transpose", "likeTerms"] },
    // --- 中2 連立方程式 ---
    // 2つの式から文字を1つ消して一次方程式にし（加減法・代入法）、あとは一次方程式として解く
    simMeaning:     { label: "連立方程式の意味", unit: "連立方程式", grade: "中2", prerequisites: ["eqMeaning", "algebra"] },
    // 式全体を何倍かする（両辺に同じ数をかける＝等式の性質、すべての項にかける＝分配法則と同じ考え）
    // 係数をそろえる → 分配法則 → 正負の数（等式の性質は「両辺に同じ数をかける」の確認）
    simCoef:        { label: "係数をそろえる", unit: "連立方程式", grade: "中2", prerequisites: ["distrib", "eqProperty"] },
    // 足す・引くで1文字を消す ＝ 式から式を引く（多項式の加法・減法）。消したあとは一次方程式（移項）。
    // 加減法 → 多項式の加法・減法 → 正負の数 の順にさかのぼると、
    // 「連立方程式特有の式全体の処理」「項どうしの加減」「符号そのもの」を分けられる
    simElim:        { label: "加減法",         unit: "連立方程式", grade: "中2", prerequisites: ["polyAddSub", "simCoef", "transpose"] },
    // 式を代入すると、かっこのある一次方程式になる（3x + 2(2x − 1) = 12 など）
    simSubst:       { label: "代入法",         unit: "連立方程式", grade: "中2", prerequisites: ["algebra", "eqParen", "transpose"] },
    // 2(x + y) − x = 8 → x + 2y = 8 は、文字2つのかっこの整理（かっこを含む式の計算）
    simParen:       { label: "かっこを含む連立方程式", unit: "連立方程式", grade: "中2", prerequisites: ["polyMixed", "simElim"] },
    simFraction:    { label: "小数・分数を含む連立方程式", unit: "連立方程式", grade: "中2", prerequisites: ["eqFraction", "simElim"] },
    simWord:        { label: "連立方程式の文章題", unit: "連立方程式", grade: "中2", prerequisites: ["simMeaning", "eqWord", "simElim"] },
    // --- 中2 一次関数 ---
    change:         { label: "変化量",         unit: "一次関数", grade: "中2", prerequisites: ["signed"] },
    // y から x を求めるには、方程式を解く（移項）
    substitution:   { label: "式への代入",     unit: "一次関数", grade: "中2", prerequisites: ["algebra", "transpose"] },
    rate:           { label: "変化の割合",     unit: "一次関数", grade: "中2", prerequisites: ["change"] },
    // 傾きは「変化の割合」そのもの。切片は比例 y = ax からの平行移動として理解する
    slopeIntercept: { label: "傾き・切片",     unit: "一次関数", grade: "中2", prerequisites: ["rate", "proportion"] },
    // 1点と傾きから切片を求めるときに、方程式を解く（移項）
    form:           { label: "グラフ・式",     unit: "一次関数", grade: "中2", prerequisites: ["slopeIntercept", "rate", "substitution", "coord", "transpose"] },
    // 一次関数と連立方程式のかけ橋：2直線の交点の座標 ＝ 2つの式を連立方程式として解いた解。
    // 教科書では一次関数の章で習う。グラフ側（グラフ・式・座標）にも、連立方程式側（加減法）にも戻れる
    simGraph:       { label: "2直線の交点",    unit: "一次関数", grade: "中2", bridge: "連立方程式", prerequisites: ["simElim", "form", "coord"] },
    // --- 中2 図形の角（平行線と角・多角形の角） ---
    // 図形のスキルは前提を2つに分けて持つ：
    //   concept（図形の性質側）… 角の関係そのもの。角度も根拠もまちがえたとき、ここから原因さがし
    //   calc（計算側）… 値を求める処理。根拠は合っているのに角度をまちがえたとき、ここだけ原因さがし
    // prerequisites は concept と calc を合わせたもの（地図・ROOT_ORDER の確認はこれを使う）。
    // 「根拠」は独立したスキルにしない。各スキルの reason 面として持つ（js/engine.js の aspectState）
    lineAngles:     { label: "対頂角・一直線の角", unit: "図形の角", grade: "中2", concept: ["angleBasics"], calc: [] },
    // x + (2x + 30) = 180 のように、角度を式で表して方程式を解く。学校の進み具合では「対頂角・一直線の角」と一緒に扱う
    angleEq:        { label: "角度を式で表す", unit: "図形の角", grade: "中2", follows: "lineAngles", concept: ["lineAngles"], calc: ["likeTerms", "transpose"] },
    // 同位角・錯角がどの位置の角か（平行でなくても名前は決まる）
    angleNames:     { label: "同位角・錯角",   unit: "図形の角", grade: "中2", concept: ["lineAngles"], calc: [] },
    // 平行なら同位角・錯角は等しい／同位角・錯角が等しければ平行
    parallelAngles: { label: "平行線と角",     unit: "図形の角", grade: "中2", concept: ["angleNames", "lineAngles"], calc: [] },
    // 内角の和180°（平行線を使って説明できる）
    triangleSum:    { label: "三角形の内角",   unit: "図形の角", grade: "中2", concept: ["parallelAngles", "angleBasics"], calc: [] },
    // 外角 ＝ となり合わない2つの内角の和
    exteriorAngle:  { label: "三角形の外角",   unit: "図形の角", grade: "中2", concept: ["triangleSum", "lineAngles"], calc: [] },
    // 補助線を引く・いくつかの性質を組み合わせる。学校の進み具合では「三角形の外角」と一緒に扱う
    angleCombo:     { label: "角の組み合わせ・補助線", unit: "図形の角", grade: "中2", follows: "exteriorAngle", concept: ["parallelAngles", "exteriorAngle"], calc: [] },
    // 180 ×（n − 2）。和から n を求めるときは、かっこのある方程式
    polygonInterior:{ label: "多角形の内角",   unit: "図形の角", grade: "中2", concept: ["triangleSum"], calc: ["eqParen"] },
    // 外角の和は360°（内角と外角で一直線）。正多角形の1つの外角から n を求めるときは等式の性質
    polygonExterior:{ label: "多角形の外角",   unit: "図形の角", grade: "中2", concept: ["polygonInterior", "lineAngles"], calc: ["eqProperty"] },
    // --- 中2 合同と証明（図形②） ---
    // 証明は1本の正誤にしない。行ごとに「役割」（仮定・図から使える事実・合同条件・合同から言えること）と
    // 「主張（claim）」「根拠（reason）」を持ち、最初に止まった行で診断する（js/proof.js）。どれも図形の性質側（concept）だけ
    // 合同な図形で、対応する頂点・辺・角を見つける（△ABC ≡ △DEF の順番）
    congCorr:       { label: "対応する辺・角", unit: "合同と証明", grade: "中2", school_label: "合同な図形まで", concept: ["angleBasics"], calc: [] },
    // 3つの等しさから、使える合同条件を選ぶ（2辺と「その間」の角か、など）
    congCond:       { label: "三角形の合同条件", unit: "合同と証明", grade: "中2", school_label: "合同条件まで", concept: ["congCorr"], calc: [] },
    // 証明に使える事実を、図から見つける（共通な辺・角、対頂角、平行線の錯角・同位角）。
    // 対頂角・錯角そのものの理解は図形①のスキル（直線の角・平行線と角）へさかのぼるが、地図の前提には固定で持たない：
    // 問題ごとの required_geometry_skills（その問題で実際に使った性質）だけを原因候補にする（js/proof.js）。
    // 学校の進み具合では「三角形の合同条件」と一緒に扱う
    proofFigureFacts: { label: "図から使えることを見つける", unit: "合同と証明", grade: "中2", follows: "congCond", concept: ["congCorr"], calc: [] },
    // 「〜ならば…」の仮定と結論を分ける。結論を仮定・事実として使わない
    proofHypConc:   { label: "仮定と結論",     unit: "合同と証明", grade: "中2", school_label: "仮定と結論まで", concept: [], calc: [] },
    // 合同を示したあと、対応する辺・角が等しいことを使う。学校の進み具合では「証明の組み立て」と一緒に扱う
    congUse:        { label: "合同から言えること", unit: "合同と証明", grade: "中2", follows: "proofBuild", concept: ["congCorr"], calc: [] },
    // 行をどの順番で組み立てるか（依存関係）
    proofBuild:     { label: "証明の組み立て", unit: "合同と証明", grade: "中2", school_label: "証明まで", concept: ["proofHypConc", "proofFigureFacts", "congCond", "congUse"], calc: [] },

    // --- 中2 三角形と四角形 ---
    // 図形の角（三角形の内角・平行線と角）と合同条件が土台
    isoProps:       { label: "二等辺三角形の性質", unit: "三角形と四角形", grade: "中2", prerequisites: ["triangleSum"] },
    isoCond:        { label: "二等辺三角形になる条件・逆", unit: "三角形と四角形", grade: "中2", prerequisites: ["isoProps"] },
    rightCong:      { label: "直角三角形の合同", unit: "三角形と四角形", grade: "中2", prerequisites: ["congCond"] },
    paraProps:      { label: "平行四辺形の性質", unit: "三角形と四角形", grade: "中2", prerequisites: ["parallelAngles"] },
    paraCond:       { label: "平行四辺形になる条件", unit: "三角形と四角形", grade: "中2", prerequisites: ["paraProps", "congCond"] },
    specialQuad:    { label: "特別な平行四辺形", unit: "三角形と四角形", grade: "中2", prerequisites: ["paraProps"] },
    areaEq:         { label: "平行線と面積",   unit: "三角形と四角形", grade: "中2", prerequisites: ["paraProps"] },

    // --- 中2 確率 ---
    // 数え上げ（場合の数）と確率の意味が土台。2つのさいころ・取り出す問題は「確率の求め方」と「場合の数」の両方を使う
    probMeaning:    { label: "確率の意味",     unit: "確率", grade: "中2", prerequisites: [] },
    probCount:      { label: "場合の数",       unit: "確率", grade: "中2", prerequisites: [] },
    probBasic:      { label: "確率の求め方",   unit: "確率", grade: "中2", prerequisites: ["probMeaning", "probCount"] },
    probTwo:        { label: "2つのさいころ・硬貨の確率", unit: "確率", grade: "中2", prerequisites: ["probBasic", "probCount"] },
    probDraw:       { label: "取り出す・くじの確率", unit: "確率", grade: "中2", prerequisites: ["probBasic", "probCount"] },
    probNot:        { label: "「〜でない」確率", unit: "確率", grade: "中2", prerequisites: ["probBasic"] },

    // --- 中2 データの活用 ---
    // 中央値（中1の内容）→ 四分位数 → 四分位範囲・箱ひげ図 → 比べる
    dataMedian:     { label: "中央値と範囲",   unit: "データの活用", grade: "中2", prerequisites: [] },
    dataQuartile:   { label: "四分位数",       unit: "データの活用", grade: "中2", prerequisites: ["dataMedian"] },
    dataIqr:        { label: "四分位範囲",     unit: "データの活用", grade: "中2", prerequisites: ["dataQuartile"] },
    dataBoxRead:    { label: "箱ひげ図を読む", unit: "データの活用", grade: "中2", prerequisites: ["dataQuartile"] },
    dataBoxMake:    { label: "データから箱ひげ図へ", unit: "データの活用", grade: "中2", prerequisites: ["dataQuartile", "dataBoxRead"] },
    dataCompare:    { label: "箱ひげ図で比べる", unit: "データの活用", grade: "中2", prerequisites: ["dataBoxRead", "dataIqr"] }
  };
  // 図形のスキルは concept ＋ calc を prerequisites にまとめる
  Object.keys(SKILLS).forEach(function (k) {
    var s = SKILLS[k];
    if (s.concept) s.prerequisites = s.concept.concat(s.calc || []);
  });
  // 前提を「図形の性質側（concept）」「計算側（calc）」に分けて返す。図形以外のスキルは全部 concept 扱い
  function prereqSide(skill, side) {
    var s = SKILLS[skill];
    if (!s) return [];
    if (!s.concept) return side === "calc" ? [] : s.prerequisites.slice();
    return (side === "calc" ? s.calc : s.concept).slice();
  }
  // 現在地画面で上から並べる順（土台 → 中1一次方程式 → 中2式の計算 → 中2連立方程式 → 中2一次関数）
  var SKILL_ORDER = ["negMeaning", "negAddSub", "negMulDiv", "negPower", "negUse", "litExpr", "litValue", "litCalc", "litWord", "litRel", "signed", "algebra", "likeTerms", "distrib", "proportion", "coord",
    "eqMeaning", "eqProperty", "transpose", "eqParen", "eqFraction", "eqWord",
    "polyAddSub", "polyMixed", "monoMulDiv", "eqTransform",
    "simMeaning", "simCoef", "simElim", "simSubst", "simParen", "simFraction", "simWord",
    "change", "substitution", "rate", "slopeIntercept", "form", "simGraph",
    "angleBasics", "lineAngles", "angleEq", "angleNames", "parallelAngles", "triangleSum", "exteriorAngle", "angleCombo", "polygonInterior", "polygonExterior",
    "congCorr", "congCond", "proofFigureFacts", "proofHypConc", "congUse", "proofBuild",
    "isoProps", "isoCond", "rightCong", "paraProps", "paraCond", "specialQuad", "areaEq",
    "probMeaning", "probCount", "probBasic", "probTwo", "probDraw", "probNot",
    "dataMedian", "dataQuartile", "dataIqr", "dataBoxRead", "dataBoxMake", "dataCompare"];
  // 前提に近い順（原因さがし・今日の学習・テスト対策で「根元から」並べるときに使う）
  var ROOT_ORDER = ["negMeaning", "negAddSub", "negMulDiv", "negPower", "negUse", "litExpr", "litValue", "litCalc", "litWord", "litRel", "signed", "algebra", "likeTerms", "distrib", "coord", "proportion", "angleBasics",
    "eqMeaning", "eqProperty", "transpose", "eqParen", "eqFraction", "eqWord",
    "polyAddSub", "polyMixed", "monoMulDiv", "eqTransform",
    "simMeaning", "simCoef", "simElim", "simSubst", "simParen", "simFraction", "simWord",
    "change", "substitution", "rate", "slopeIntercept", "form", "simGraph",
    "lineAngles", "angleEq", "angleNames", "parallelAngles", "triangleSum", "exteriorAngle", "angleCombo", "polygonInterior", "polygonExterior",
    "proofHypConc", "congCorr", "congCond", "proofFigureFacts", "congUse", "proofBuild",
    "isoProps", "isoCond", "rightCong", "paraProps", "paraCond", "specialQuad", "areaEq",
    "probMeaning", "probCount", "probBasic", "probTwo", "probDraw", "probNot",
    "dataMedian", "dataQuartile", "dataIqr", "dataBoxRead", "dataBoxMake", "dataCompare"];
  // 単元ごとのスキル（学校で「いま学習中」の単元を選ぶと、ここが今日の学習・テスト範囲の候補になる）
  var UNITS = {
    "式の計算": ["polyAddSub", "polyMixed", "monoMulDiv", "eqTransform"],
    "一次関数": ["change", "substitution", "rate", "slopeIntercept", "form", "simGraph"],
    "連立方程式": ["simMeaning", "simCoef", "simElim", "simSubst", "simParen", "simFraction", "simWord"],
    "正負の数": ["negMeaning", "negAddSub", "negMulDiv", "negPower", "negUse"],
    "文字と式": ["litExpr", "litValue", "litCalc", "litWord", "litRel"],
    "一次方程式": ["eqMeaning", "eqProperty", "transpose", "eqParen", "eqFraction", "eqWord"],
    // 教科書の順（対頂角 → 同位角・錯角 → 平行線 → 三角形 → 多角形）
    "図形の角": ["lineAngles", "angleEq", "angleNames", "parallelAngles", "triangleSum", "exteriorAngle", "angleCombo", "polygonInterior", "polygonExterior"],
    // 教科書の順（合同な図形 → 合同条件 → 仮定と結論 → 証明）
    "合同と証明": ["congCorr", "congCond", "proofFigureFacts", "proofHypConc", "proofBuild", "congUse"],
    "三角形と四角形": ["isoProps", "isoCond", "rightCong", "paraProps", "paraCond", "specialQuad", "areaEq"],
    "確率": ["probMeaning", "probCount", "probBasic", "probTwo", "probDraw", "probNot"],
    "データの活用": ["dataMedian", "dataQuartile", "dataIqr", "dataBoxRead", "dataBoxMake", "dataCompare"]
  };
  // 中2で選べる単元（学校の進む順）
  var SELECTABLE_UNITS = ["式の計算", "連立方程式", "一次関数", "図形の角", "合同と証明", "三角形と四角形", "確率", "データの活用"];
  // 学年ごとの単元。SELECTABLE_UNITS は「いま選んでいる学年」の単元で、setGrade で中身を入れかえる
  // （ほかのファイルが同じ配列を持っているので、配列そのものは取りかえない）。単元がまだない学年には変えない
  var GRADE_UNITS = { "中学1年": ["正負の数", "文字と式", "一次方程式"], "中学2年": SELECTABLE_UNITS.slice(), "中学3年": [] };
  var ALL_UNITS = GRADE_UNITS["中学1年"].concat(GRADE_UNITS["中学2年"], GRADE_UNITS["中学3年"]);
  var currentGrade = "中学2年";
  function setGrade(g) {
    if (!GRADE_UNITS[g] || !GRADE_UNITS[g].length) return currentGrade;
    SELECTABLE_UNITS.length = 0;
    GRADE_UNITS[g].forEach(function (u) { SELECTABLE_UNITS.push(u); });
    currentGrade = g;
    return g;
  }

  // ---------- 学校のようす（どこまで習ったか） ----------
  // school = { current_unit, units: { 単元: { status: "learned"|"learning"|"not_learned", current_skill, skills: { スキル: "learned"|"current"|"not_learned" } } },
  //            next_test: { date, units }, updated_at }
  // 子どもは「どこまで進んだ？」でスキルを1つ選ぶだけ。ここで単元のスキル全部の状態に広げる。
  // current_skill がない「学習中」の単元は、どこまでか分からないので、全部 current（未学習にはしない）。
  // follows を持つスキル（角度を式で表す・角の組み合わせ）は「どこまで」の選択肢に出さず、ついていくスキルと同じ状態にする
  function expandUnit(unit, status, currentSkill) {
    var all = UNITS[unit] || [], out = {};
    var list = schoolOptions(unit);
    if (currentSkill && SKILLS[currentSkill] && SKILLS[currentSkill].follows) currentSkill = SKILLS[currentSkill].follows;
    var at = currentSkill ? list.indexOf(currentSkill) : -1;
    list.forEach(function (k, i) {
      if (status === "learned") out[k] = "learned";
      else if (status === "not_learned") out[k] = "not_learned";
      else if (at === -1) out[k] = "current";
      else out[k] = i < at ? "learned" : i === at ? "current" : "not_learned";
    });
    all.forEach(function (k) { if (SKILLS[k].follows) out[k] = out[SKILLS[k].follows]; });
    var sorted = {};
    all.forEach(function (k) { sorted[k] = out[k]; });
    return sorted;
  }
  // 学校のようす「どこまで進んだ？」の選択肢
  function schoolOptions(unit) {
    return (UNITS[unit] || []).filter(function (k) { return !SKILLS[k].follows; });
  }
  // 選択肢の表示（合同と証明は「合同な図形まで／合同条件まで／仮定と結論まで／証明まで」）
  function schoolOptionLabel(k) { return SKILLS[k].school_label || SKILLS[k].label + "まで"; }
  // そのスキルが学校で「習った／いま学習中／まだ」か。学校のようすで管理していない単元（中1・土台）は null（＝習った扱い）
  function schoolSkillStatus(skill, school) {
    if (!school || !school.units || !SKILLS[skill]) return null;
    var u = school.units[SKILLS[skill].unit];
    if (!u) return null;
    if (u.skills && u.skills[skill]) return u.skills[skill];
    return expandUnit(SKILLS[skill].unit, u.status, u.current_skill)[skill] || null;
  }
  // 先取りしてよい「次の1スキル」：いまの単元で、学校で学習中のスキルのすぐ次（単元がまだ始まっていなければ最初のスキル）
  function nextPreviewSkill(school) {
    if (!school || !school.current_unit || !school.units) return null;
    var unit = school.current_unit, u = school.units[unit];
    if (!u || u.status === "learned") return null;
    var list = UNITS[unit] || [];
    for (var i = 0; i < list.length; i++) if (schoolSkillStatus(list[i], school) === "not_learned") return list[i];
    return null;
  }
  var LEVELS = ["basic", "standard", "application", "retention"];

  // ---------- 調整値（ここを変えると理解度の動き方が変わる） ----------
  var CONFIG = {
    ceiling: { none: 0.3, basic: 0.5, standard: 0.65, application: 0.8, retentionBonus: 0.12, retentionBonus2: 0.15, max: 0.95 },
    ema: { check: 0.35, lesson: 0.175 }, // 最近の結果をどれだけ重く見るか（練習はチェックの半分）
    prior: 0.5,                           // 何も分からないときの正答率の見込み
    startConfidence: 0.3,                 // 記録がないときの確かさ（= ceiling.none。「まだわからない」）
    minConfidence: 0.05,
    // 1回の回答で確かさが動く幅（「一度の結果で決めつけない」ため、小さく固定する）
    step: {
      up: { basic: 0.04, standard: 0.05, application: 0.06, retention: 0.08 },
      down: { normal: 0.05, retention: 0.10 }
    },
    lessonStepScale: 0.5,                 // 練習（lesson）はチェックの半分の幅
    maxDropPerAnswer: 0.10,               // 1回の回答で下がる最大幅（= step.down.retention）
    hintCeilingPenalty: 0.1,              // ヒントありでできたときに下げる上限の幅
    retentionDays: 3,                     // 最初に「できた」から何日後の正解を「定着」の確認とみなすか
    masteredConfidence: 0.85,             // 4レベルすべて pass ＋ この確かさ以上で「マスター」
    retainedMinDays: 2,                   // 「定着」には、数日後の自力正解がこの日数以上必要
    levelWindow: 3                        // レベルの判定に使う直近の回答数
  };

  // ---------- 回答1件を記録の形にする ----------
  var seq = 0;
  function makeId(prefix, now) {
    seq = (seq + 1) % 1e6;
    return prefix + "_" + now.toString(36) + "_" + seq.toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // q: 問題（skill / level / unit を持つ）、r: { status, hintUsed }、ctx: { userId, sessionId, context, now }
  function makeAnswerRecord(q, r, ctx) {
    return {
      id: makeId("ans", ctx.now),
      user_id: ctx.userId,
      session_id: ctx.sessionId || null,
      context: ctx.context || "compass_check", // "compass_check" | "lesson"
      question_id: q.id,
      unit: q.unit || "一次関数",
      skill: q.skill,
      level: q.level || "basic",
      evidence_level: q.evidence_level || null,
      correct: r.status === "correct",
      hint_used: !!r.hintUsed,
      unknown_selected: r.status === "unknown",
      // 学校でまだ習っていないスキルの問題（先取り）。まちがえても理解度の計算に入れない
      preview: !!r.preview,
      // 図形：角度の値（value）か根拠（reason）か。根拠の小問では選んだ選択肢と取り違えの種類も残す
      aspect: q.aspect || null,
      chosen: r.chosen || null,
      confusion: r.confusion || null,
      answered_at: new Date(ctx.now).toISOString(),
      self_evaluation: null
    };
  }

  // ---------- 理解度の計算 ----------

  // その回答が「どれだけできた」とみなせるか（ヒントありは半分）
  function credit(a) {
    if (!a.correct) return 0;
    return a.hint_used ? 0.5 : 1;
  }

  // 直近 levelWindow 件を新しいものほど重く見て、半分以上できていれば pass
  // strict（定着の判定）のときは、ヒントありの正解を「できた」に数えない
  function levelStatus(attempts, strict) {
    if (!attempts.length) return "not_checked";
    var recent = attempts.slice(-CONFIG.levelWindow);
    var sum = 0, weight = 0;
    for (var i = 0; i < recent.length; i++) {
      var w = i + 1; // 古い 1 … 新しい 3
      sum += (strict && recent[i].hint_used ? 0 : credit(recent[i])) * w;
      weight += w;
    }
    return sum / weight >= 0.5 ? "pass" : "needs_review";
  }

  // 上のレベルが「できた」で、その証拠が下のレベルの最後の回答より新しければ、下のレベルも「できた」とみなす。
  // （標準問題が自力で解けるなら、基礎もわかっている。古い基礎の×だけで「要確認」のまま残さない）
  function impliedLevels(levels, byLevel) {
    var order = ["basic", "standard", "application"];
    function lastT(list) { return list.length ? Date.parse(list[list.length - 1].answered_at) : -Infinity; }
    for (var i = order.length - 1; i > 0; i--) {
      var hi = order[i];
      if (levels[hi] !== "pass") continue;
      for (var j = i - 1; j >= 0; j--) {
        var lo = order[j];
        if (levels[lo] === "needs_review" && lastT(byLevel[hi]) > lastT(byLevel[lo])) levels[lo] = "pass";
      }
    }
  }

  // 上限 = どのレベルまでできたか ＋ 数日後もできたか（定着のぶん上乗せ）
  // 例：基礎 0.5 → 基礎＋定着 0.62、応用 0.8 → 応用＋定着 0.92（2回確認で 0.95）
  function ceilingFor(levels, retentionPasses) {
    var c = CONFIG.ceiling;
    var base = c.none;
    if (levels.application === "pass") base = c.application;
    else if (levels.standard === "pass") base = c.standard;
    else if (levels.basic === "pass") base = c.basic;
    if (levels.retention === "pass" && base > c.none) {
      base += retentionPasses >= 2 ? c.retentionBonus2 : c.retentionBonus;
    }
    return Math.min(base, c.max);
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // ひとつのスキルの履歴（古い順）から状態を作る
  function computeOne(skillId, attempts, opts) {
    // 先取り（学校でまだ習っていないときに解いた問題）のまちがいは、苦手の証拠にしない。
    // 確かさも下げない。できた先取りは、ふつうの記録として数える
    var previewMisses = attempts.filter(function (a) { return a.preview && !a.correct; }).length;
    attempts = attempts.filter(function (a) { return !(a.preview && !a.correct); });
    var byLevel = { basic: [], standard: [], application: [], retention: [] };
    var acc = CONFIG.prior;
    var conf = null;
    var firstPassAt = null;
    var retentionPasses = 0;
    var retentionDays = {};
    var levels = { basic: "not_checked", standard: "not_checked", application: "not_checked", retention: "not_checked" };
    var lastCheckIndex = -1;
    var lastCheckHinted = false;

    attempts.forEach(function (a, idx) {
      var t = Date.parse(a.answered_at);
      var isCheck = a.context !== "lesson";

      // この回答が「数日後の確認（定着の証拠）」にあたるか。firstPassAt を更新する前に判定する
      var retentionEvidence = isCheck && firstPassAt !== null && t - firstPassAt >= CONFIG.retentionDays * DAY;
      var accBefore = acc;

      if (isCheck) {
        lastCheckIndex = idx;
        // 定着用の問題（level: retention）も、ふだんは基礎・標準の証拠として数える。
        // 「定着」になるかどうかは、問題の種類ではなく日数で決める（下の firstPassAt の判定）
        var lv = a.level === "retention" ? (a.evidence_level || "basic") : a.level;
        byLevel[lv] && byLevel[lv].push(a);
        // 最初に「できた」と言えた日から retentionDays 以上たってからの回答は、定着の確認にもなる
        if (firstPassAt !== null && t - firstPassAt >= CONFIG.retentionDays * DAY) {
          byLevel.retention.push(a);
          // 定着の証拠は「ヒントなしで自力で正解」だけ。数えるのは日数（同じ日に何問解いても1回）
          if (a.correct && !a.hint_used) retentionDays[new Date(t).toISOString().slice(0, 10)] = true;
          retentionPasses = Object.keys(retentionDays).length;
        }
        LEVELS.forEach(function (lv) { levels[lv] = levelStatus(byLevel[lv], lv === "retention"); });
        impliedLevels(levels, byLevel);
        if (firstPassAt === null && (levels.basic === "pass" || levels.standard === "pass" || levels.application === "pass")) {
          firstPassAt = t;
        }
      }

      // 最近の正答率（練習はチェックの半分の重さ）
      var alpha = isCheck ? CONFIG.ema.check : CONFIG.ema.lesson;
      acc = acc * (1 - alpha) + credit(a) * alpha;

      // 確かさ（confidence）の更新：1回の回答で動く幅を小さく固定する。
      // - 目標値 target ＝「どのレベルまでできたか」の上限 と「これまでの正答率（新しいほど重い）」の小さい方。
      //   正解しても target より上には上がらない → 履歴が悪ければ1回の正解では上がりにくい。
      // - 上がる幅はレベルごとに決まった値まで（基礎 +0.04 / 標準 +0.05 / 応用 +0.06 / 数日後の確認 +0.08）。
      // - 下がる幅は通常 −0.05、数日後の確認 −0.10 まで。これまでの正答率が高いほど下げ幅は小さい。
      // - 練習（lesson）はチェックの半分の幅。ヒントありの正解は上がる幅も半分。
      if (isCheck) lastCheckHinted = a.correct && a.hint_used;
      var ceiling = ceilingFor(levels, retentionPasses) - (lastCheckHinted ? CONFIG.hintCeilingPenalty : 0);
      var target = Math.min(ceiling, 0.1 + acc * 0.9);
      var scale = isCheck ? 1 : CONFIG.lessonStepScale;
      if (conf === null) conf = CONFIG.startConfidence;
      if (a.correct) {
        var levelKey = a.level === "retention" ? (a.evidence_level || "basic") : a.level;
        var up = (retentionEvidence ? CONFIG.step.up.retention : (CONFIG.step.up[levelKey] || CONFIG.step.up.basic)) * scale;
        if (a.hint_used) up *= 0.5;
        conf = Math.min(conf + up, Math.max(conf, target));
      } else {
        var down = (retentionEvidence ? CONFIG.step.down.retention : CONFIG.step.down.normal) * scale;
        down *= 1 - 0.5 * accBefore; // これまでよくできていたスキルほど、1回の×では下げすぎない
        conf = conf - down;
      }
      // 上限（到達レベル）を超えていたら上限に向けて下げるが、1回に下げるのは通常の幅（0.05）まで
      if (conf > ceiling) conf = Math.max(ceiling, conf - CONFIG.step.down.normal);
      conf = Math.min(Math.max(conf, CONFIG.minConfidence), CONFIG.ceiling.max);
    });

    var correctCount = attempts.filter(function (a) { return a.correct; }).length;
    var last = attempts[attempts.length - 1];
    var lessonAfterCheck = attempts.slice(lastCheckIndex + 1).filter(function (a) { return a.context === "lesson"; });

    // 「定着」は1回の数日後正解では決めない：
    //   数日後の確認で自力正解した日が2日以上 ＋ 直近3回のチェックに誤答がない、とき
    var checks = attempts.filter(function (a) { return a.context !== "lesson"; });
    var recentErrors = checks.slice(-3).filter(function (a) { return !a.correct; }).length;
    var retainedOk = levels.retention === "pass" && retentionPasses >= CONFIG.retainedMinDays && recentErrors === 0;
    var status = learningStatus(skillId, levels, attempts.length, lessonAfterCheck, opts, retainedOk);
    // 4つのレベルすべてが pass で確かさも高ければ「マスター」。
    // ただし永久には固定しない（履歴から毎回計算し直すので、あとの不正解で下がりうる）
    if (status === "retained" && LEVELS.every(function (lv) { return levels[lv] === "pass"; }) &&
        conf !== null && conf >= CONFIG.masteredConfidence) {
      status = "mastered";
    }

    return {
      skill: SKILLS[skillId] ? SKILLS[skillId].label : skillId,
      skill_id: skillId,
      learning_status: status,
      basic: levels.basic,
      standard: levels.standard,
      application: levels.application,
      retention: levels.retention,
      confidence: conf === null ? 0 : round2(conf),
      attempt_count: attempts.length,
      correct_count: correctCount,
      retention_count: retentionPasses,   // 数日後の確認で自力正解した日数
      recent_check_errors: recentErrors,  // 直近3回のチェックの誤答数
      preview_misses: previewMisses,      // 先取りでまちがえた回数（理解度には入れない）
      school_status: schoolSkillStatus(skillId, opts.school) || "learned",
      suspected_root_causes: [],
      first_pass_at: firstPassAt === null ? null : new Date(firstPassAt).toISOString(),
      last_checked: last ? last.answered_at : null,
      next_action: null
    };
  }

  // 未学習 / 学習中 / 要確認 / 理解 / 活用 / 定着
  function learningStatus(skillId, levels, count, lessonAfterCheck, opts, retainedOk) {
    // 「まだ習っていない」は、学校の進み具合で「まだ」と答えた単元にだけ当てはめる。
    //   opts.schoolProgressByUnit：{ 単元: "done" | "learning" | "notyet" }（単元ごと）
    //   opts.schoolProgress：いまの単元（opts.currentUnit、既定：一次関数）の進み具合（以前の形）
    // 中1 一次方程式などは既習扱い。記録がなければ「まだ（not_checked）」で、苦手とは扱わない
    var unit = SKILLS[skillId] && SKILLS[skillId].unit;
    var byUnit = opts.schoolProgressByUnit || {};
    var progress = byUnit[unit] || (unit === (opts.currentUnit || "一次関数") ? opts.schoolProgress : null);
    var notYet = progress === "notyet";
    // 学校のようすで「どこまで」が分かっていれば、スキル単位で判断する（その先のスキルは未学習）
    var schoolSt = schoolSkillStatus(skillId, opts.school);
    if (schoolSt === "not_learned") notYet = true;
    else if (schoolSt === "learned" || schoolSt === "current") notYet = false;
    if (!count) return notYet ? "not_learned" : "not_checked";
    if (retainedOk) return "retained";
    if (levels.application === "pass") return "applying";
    if (levels.basic === "pass" || levels.standard === "pass") return "understood";
    // ここから下は「まだできていない」。まだ習っていない単元なら苦手扱いしない
    if (notYet) return "not_learned";
    // チェックのあとに練習して、そこで正解できていれば「学習中」
    if (lessonAfterCheck.some(function (a) { return a.correct; })) return "learning";
    if (levels.basic === "not_checked") return "learning"; // 練習だけで、まだチェックしていない
    return "needs_review";
  }

  var WEAK = { needs_review: true, learning: true };

  // 前提スキルをたどり、いちばん根元にある「まだ不安定なスキル」を原因候補にする
  function rootCauses(skillId, states, seen) {
    seen = seen || {};
    var out = [];
    (SKILLS[skillId] ? SKILLS[skillId].prerequisites : []).forEach(function (p) {
      if (seen[p]) return;
      seen[p] = true;
      var s = states[p];
      if (!s || !WEAK[s.learning_status]) return;
      var deeper = rootCauses(p, states, seen);
      out = out.concat(deeper.length ? deeper : [p]);
    });
    return out.filter(function (v, i) { return out.indexOf(v) === i; });
  }

  var NEXT_ACTION = {
    signed: "review_signed_numbers", algebra: "review_substitution", proportion: "review_proportion",
    coord: "review_coordinates", change: "review_change_amount", substitution: "review_substitution",
    rate: "review_rate_of_change", distrib: "review_distributive", eqMeaning: "review_equation_meaning", eqProperty: "review_equation_property",
    transpose: "review_transposition", eqParen: "review_paren_equation", eqFraction: "review_fraction_equation", eqWord: "review_equation_word", slopeIntercept: "review_slope_intercept", form: "practice_slope_to_equation",
    simMeaning: "review_simultaneous_meaning", simCoef: "review_align_coefficients", simElim: "review_elimination", simSubst: "review_substitution_method",
    likeTerms: "review_like_terms", polyAddSub: "review_polynomial_add_sub", polyMixed: "review_polynomial_paren", monoMulDiv: "review_monomial_mul_div", eqTransform: "review_equation_transform",
    simParen: "review_paren_simultaneous", simFraction: "review_fraction_simultaneous", simWord: "review_simultaneous_word", simGraph: "practice_intersection",
    angleBasics: "review_angle_basics", lineAngles: "review_vertical_straight_angles", angleEq: "review_angle_equation", angleNames: "review_angle_names",
    parallelAngles: "review_parallel_angles", triangleSum: "review_triangle_sum", exteriorAngle: "review_exterior_angle", angleCombo: "practice_angle_combination",
    polygonInterior: "review_polygon_interior", polygonExterior: "review_polygon_exterior",
    congCorr: "review_congruent_correspondence", congCond: "review_congruence_conditions", proofFigureFacts: "practice_proof_figure_facts",
    proofHypConc: "review_hypothesis_conclusion", congUse: "review_congruent_parts", proofBuild: "practice_proof_order",
    isoProps: "review_isosceles_properties", isoCond: "review_isosceles_conditions", rightCong: "review_right_triangle_congruence", paraProps: "review_parallelogram_properties", paraCond: "review_parallelogram_conditions", specialQuad: "review_special_parallelograms", areaEq: "review_parallel_area",
    litExpr: "review_literal_notation", litValue: "review_literal_value", litCalc: "review_linear_expressions", litWord: "review_literal_quantities", litRel: "review_literal_relations",
    negMeaning: "review_signed_meaning", negAddSub: "review_signed_add_sub", negMulDiv: "review_signed_mul_div", negPower: "review_signed_power", negUse: "review_signed_use",
    probMeaning: "review_probability_meaning", probCount: "review_counting", probBasic: "review_probability_basic", probTwo: "practice_probability_two", probDraw: "practice_probability_draw", probNot: "review_probability_complement",
    dataMedian: "review_median", dataQuartile: "review_quartiles", dataIqr: "review_interquartile_range", dataBoxRead: "review_box_plot_reading", dataBoxMake: "practice_box_plot_making", dataCompare: "practice_box_plot_comparison"
  };

  function nextAction(skillId, s, rootIds, now) {
    if (WEAK[s.learning_status]) {
      return rootIds.length ? NEXT_ACTION[rootIds[0]] : NEXT_ACTION[skillId];
    }
    if (s.learning_status === "understood" || s.learning_status === "applying") {
      if (s.first_pass_at && s.retention === "not_checked" && now - Date.parse(s.first_pass_at) >= CONFIG.retentionDays * DAY) {
        return "retention_check_due";
      }
      if (s.standard === "not_checked") return "try_standard";
      if (s.standard === "needs_review") return "practice_standard";
      if (s.application === "not_checked") return "try_application";
      return "wait_for_retention_check";
    }
    if (s.learning_status === "retained" || s.learning_status === "mastered") return "keep";
    return null;
  }

  // 応用問題の小問（question_id が "問題ID#小問ID"）は小問ごとに記録するが、
  // 理解度を計算するときは「1つの問題の中の、同じスキルの小問」を1回分にまとめる。
  // まとめた1回は、そのスキルの小問がすべて正解のときだけ正解（1問の中で×と○が混ざっても、できたことにしない）。
  function mergeSteps(sorted) {
    var out = [], groups = {};
    sorted.forEach(function (a) {
      var qid = String(a.question_id);
      var hash = qid.indexOf("#");
      if (hash === -1) { out.push(a); return; }
      // 図形の小問は、角度の値（value）と根拠（reason）を別の1回として数える
      var key = qid.slice(0, hash) + "|" + a.skill + "|" + (a.aspect || "") + "|" + (a.session_id || "") + "|" + a.context;
      var g = groups[key];
      if (g && Date.parse(a.answered_at) - Date.parse(g.answered_at) < 60 * 60 * 1000) {
        g.correct = g.correct && a.correct;
        g.hint_used = g.hint_used || a.hint_used;
        g.unknown_selected = g.unknown_selected || a.unknown_selected;
        // 後の小問でまちがえた根拠の取り違えも残す（まとめた1回の取り違えとして数える）
        if (!a.correct && a.confusion && !g.confusion) { g.confusion = a.confusion; g.chosen = a.chosen; }
        return;
      }
      g = groups[key] = {};
      for (var k in a) g[k] = a[k];
      g.question_id = qid.slice(0, hash);
      out.push(g);
    });
    return out;
  }

  // answer_history 全体から、全スキルの skill_state を作る
  // opts: { schoolProgress: "done" | "learning" | "notyet", now: ミリ秒 }
  function computeSkillStates(history, opts) {
    opts = opts || {};
    var now = opts.now || Date.now();
    var bySkill = {};
    mergeSteps(history.slice().sort(function (a, b) { return Date.parse(a.answered_at) - Date.parse(b.answered_at) || (a.question_id < b.question_id ? -1 : 1); }))
      .forEach(function (a) { (bySkill[a.skill] = bySkill[a.skill] || []).push(a); });

    var states = {};
    SKILL_ORDER.forEach(function (id) {
      var list = bySkill[id] || [];
      if (!SKILLS[id].concept) { states[id] = computeOne(id, list, opts); return; }
      // 図形のスキル：理解度（learning_status・confidence）は角度を求める力（value）で決め、
      // 理由の理解（reason）は別に持つ。最上位（マスター）だけは reason の安定も求める
      var st = computeOne(id, list.filter(function (a) { return a.aspect !== "reason"; }), opts);
      var asp = aspectState(id, list, opts);
      st.value = asp.value; st.reason = asp.reason; st.overall = asp.overall;
      // 先取りのまちがいは、根拠の問題（例：どの合同条件か）も数える
      st.preview_misses = list.filter(function (a) { return a.preview && !a.correct; }).length;
      st.learning_status = asp.overall.status === "not_checked" ? st.learning_status : asp.overall.status;
      states[id] = st;
    });
    SKILL_ORDER.forEach(function (id) {
      var s = states[id];
      var rootIds = WEAK[s.learning_status] ? rootCauses(id, states) : [];
      s.suspected_root_causes = rootIds.map(function (p) { return SKILLS[p].label; });
      s.next_action = nextAction(id, s, rootIds, now);
    });
    return states;
  }

  // ---------- 図形スキル：value（角度を求める力）と reason（理由の理解）を別々に育てる ----------
  // 回答は aspect: "value"（角度）／"claim"（証明の主張）／"reason"（根拠）。なければ value。reason の回答には chosen（選んだ根拠）と confusion（取り違えの種類）を持てる。
  // 根拠を聞いていない問題では reason の記録が無いので、reason は上がりも下がりもしない。
  function aspectState(skillId, attempts, opts) {
    // 主張（claim・証明）も値（value・角度）も、根拠でないものは同じ面として育てる
    var v = attempts.filter(function (a) { return a.aspect !== "reason"; });
    var r = attempts.filter(function (a) { return a.aspect === "reason"; });
    var vs = computeOne(skillId, v, opts), rs = computeOne(skillId, r, opts);
    var confusions = {};
    // 先取り（学校でまだ習っていない）でまちがえた根拠は、取り違えとして数えない
    r.forEach(function (a) { if (!a.correct && a.confusion && !a.preview) confusions[a.confusion] = (confusions[a.confusion] || 0) + 1; });
    var value = { status: vs.learning_status, confidence: vs.confidence, attempts: vs.attempt_count, correct: vs.correct_count };
    var reason = { status: rs.learning_status, confidence: rs.confidence, attempts: rs.attempt_count, correct: rs.correct_count, confusions: confusions };
    return { value: value, reason: reason, overall: overallOf(value, reason, SKILLS[skillId] && SKILLS[skillId].unit === "合同と証明") };
  }
  var REASON_STABLE = { understood: true, applying: true, retained: true, mastered: true };
  // 総合状態：value を土台にする。reason が未確認なだけでは value の retained を下げない。
  // ただし最上位（mastered）は reason が安定しているときだけ。reason が不安定なら retained どまりで、ひとことを付ける
  // proof：証明のスキル（value の面は「主張」）
  function overallOf(value, reason, proof) {
    var st = value.status, note = null, what = proof ? "主張を選ぶ力" : "角度を求める力";
    var reasonChecked = reason.attempts > 0;
    if (st === "mastered" && !REASON_STABLE[reason.status]) st = "retained";
    // 証明のスキルで、まだ根拠の問題（例：どの合同条件か）しか解いていないときは、根拠の状態をそのまま使う
    //（合同条件を選ぶこと自体がこのスキルの中身なので、「まだ確かめていない」にしない）
    if (proof && !value.attempts && reasonChecked) return { status: reason.status, note: "根拠を選ぶ問題で確かめた（主張はまだ確かめていない）", reason_practice: !REASON_STABLE[reason.status] };
    if (STATUS_RANK[value.status] >= STATUS_RANK.understood) {
      if (reasonChecked && !REASON_STABLE[reason.status]) note = what + "は" + STATUS_VIEW[value.status === "mastered" ? "retained" : value.status].label + "だが、理由の理解はまだ安定していない";
      else if (!reasonChecked) note = "理由はまだ確かめていない";
    } else if (reasonChecked && REASON_STABLE[reason.status] && value.attempts > 0) {
      note = proof ? "理由は分かっている。主張（何が等しいか）を確かめる" : "理由は分かっている。角度を求める計算を確かめる";
    }
    return { status: st, note: note, reason_practice: reasonChecked && !REASON_STABLE[reason.status] };
  }
  // 1問の結果（角度○×・根拠○×）から、原因さがしの入口を決める（4パターン）
  //   ○/○ → なし / ○/× → 原因さがしなし・reason 練習を今日の候補へ / ×/○ → 計算側 / ×/× → 図形の性質側
  function geometryRoute(valueOk, reasonOk) {
    if (valueOk && reasonOk !== false) return { trail: null, reason_practice: false };
    if (valueOk) return { trail: null, reason_practice: true };
    if (reasonOk) return { trail: "calc", reason_practice: false };
    return { trail: "concept", reason_practice: reasonOk === false };
  }

  // 画面用：学習状態の表示
  var STATUS_VIEW = {
    mastered:     { mark: "★", label: "マスター",   tone: "ok" },
    retained:     { mark: "◎", label: "定着",       tone: "ok" },
    applying:     { mark: "◎", label: "活用できる", tone: "ok" },
    understood:   { mark: "○", label: "理解",       tone: "ok" },
    learning:     { mark: "↗", label: "学習中",     tone: "learning" },
    needs_review: { mark: "△", label: "要確認",     tone: "warn" },
    not_learned:  { mark: "・", label: "未学習",     tone: "muted" },
    not_checked:  { mark: "−", label: "まだ",       tone: "muted" }
  };

  // 状態の「高さ」。前回と今回をくらべて、上がったか下がったかを判断するのに使う
  var STATUS_RANK = { not_checked: 0, not_learned: 0, needs_review: 1, learning: 2, understood: 3, applying: 4, retained: 5, mastered: 6 };

  // セッションの終わりに、確かさの控え（前回との比較用）を作る
  function snapshot(states) {
    var out = {};
    Object.keys(states).forEach(function (k) {
      out[k] = { confidence: states[k].confidence, learning_status: states[k].learning_status };
    });
    return out;
  }

  SC.engine = {
    SKILLS: SKILLS, SKILL_ORDER: SKILL_ORDER, ROOT_ORDER: ROOT_ORDER, UNITS: UNITS, SELECTABLE_UNITS: SELECTABLE_UNITS, LEVELS: LEVELS,
    GRADE_UNITS: GRADE_UNITS, ALL_UNITS: ALL_UNITS, setGrade: setGrade, grade: function () { return currentGrade; },
    expandUnit: expandUnit, schoolOptions: schoolOptions, schoolOptionLabel: schoolOptionLabel, prereqSide: prereqSide, schoolSkillStatus: schoolSkillStatus, nextPreviewSkill: nextPreviewSkill, CONFIG: CONFIG, STATUS_VIEW: STATUS_VIEW, STATUS_RANK: STATUS_RANK, DAY: DAY,
    makeId: makeId, makeAnswerRecord: makeAnswerRecord, computeSkillStates: computeSkillStates, snapshot: snapshot,
    aspectState: aspectState, overallOf: overallOf, geometryRoute: geometryRoute
  };
})(typeof window !== "undefined" ? window : globalThis);
