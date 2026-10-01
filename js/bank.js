/*
 * Study Compass — 問題バンク（中2数学「一次関数」）
 *
 * 目的：同じ問題のくり返しによる「覚えて正解」を避け、
 *       ひとつのスキルを、形式（数式・表・グラフ・文章）の違う複数の問題から判断する。
 *
 * - 既存の B1〜B5 / C1〜C5 / S1・S2（js/questions.js）はそのまま残し、ここでは追加分だけを持つ。
 *   ID は「スキル-レベル-番号」の形で、既存 ID とは重ならない。
 * - level: basic / standard / application / retention
 *   retention の問題は evidence_level（basic / standard）を持つ。
 *   定着になるかどうかは問題の種類ではなく「最初にできた日から何日たったか」で決める（js/engine.js）。
 * - format: expression（数式）/ table（表）/ graph（グラフ）/ word（文章）/ numberline（数直線）/ coordinate（座標・グラフ上の点）
 * - type: number / linear（一次関数の式）/ pair（2つの答え）/ choice（選択）/ steps（小問に分かれた応用）
 * - steps の各小問は skill を持つ。どの小問で止まったかで、原因のスキルを推定できる。
 * - 図（figure）は画像ではなくデータ。js/figures.js が描く。
 *
 * 問題の追加のしかた（問題が足りなくなったスキルから順に）
 *   1. 該当スキルの区切りの中に add({ ... }) を1つ足す。id は「スキル-レベル-番号」で重ならないように。
 *   2. skill / level / format / text / type / answer / hint / explanation は必須。
 *      retention なら evidence_level、応用なら steps（小問ごとに skill）を付ける。
 *   3. node --test tests/*.test.js を実行する（正解判定・図と答えの整合・定着問題の重複を自動で確認）。
 *   索引・ランダム選択・?debug=bank の一覧・不足数の表示は、自動で新しい問題を含む。
 *   目安の問題数は下の TARGETS。?debug=bank に「あと何問」が出る。
 *
 * 用途タグ（usage）… 同じ問題が「診断」と「練習」の両方で何度も出すぎないようにするための目印
 *   diagnosis … 診断用（最初のコンパスチェックの B1〜S2 など）。練習には原則まわさない
 *   practice  … 練習用（今日の学習で優先して使う）
 *   retention … 定着の確認用（数日後に別の形で確かめる）
 *   multi_use … どれに使ってもよい（いまの追加問題の既定値）
 *   ※ 項目名を "purpose" にしないのは、原因確認問題の説明文（画面に出す purpose）と名前がぶつかるため。
 *   分類し直すときは、add({ ..., usage: "practice" }) のように書くだけでよい。
 */
(function (root) {
  var SC = (root.SC = root.SC || {});

  var items = [];
  function add(q) { items.push(q); }
  function line(a, b, extra) { var l = { a: a, b: b }; for (var k in extra) l[k] = extra[k]; return l; }

  // =====================================================================
  // 変化量（change）  既存：C4（基礎）
  // =====================================================================
  add({ id: "change-basic-1", skill: "change", level: "basic", format: "table",
    text: "下の表は一次関数の x と y の関係です。x が 1 から 4 まで増えたとき、y の増加量はいくつ？",
    figure: { type: "table", rows: [{ label: "x", values: [1, 2, 3, 4, 5] }, { label: "y", values: [3, 5, 7, 9, 11] }] },
    type: "number", answer: 6,
    hint: "x = 1 のときの y と、x = 4 のときの y を表から読んで、あとの値 − はじめの値。",
    explanation: "x = 1 のとき y = 3、x = 4 のとき y = 9。増加量は 9 − 3 = 6 です。" });
  add({ id: "change-basic-2", skill: "change", level: "basic", format: "word",
    text: "朝6時の気温は 12℃、昼12時の気温は 21℃ でした。6時から12時までの気温の増加量は何℃？",
    type: "number", answer: 9,
    hint: "あとの気温 − はじめの気温",
    explanation: "21 − 12 = 9。気温は 9℃ 増えました。" });
  add({ id: "change-basic-3", skill: "change", level: "basic", format: "expression",
    text: "x の値が 2 から 7 になりました。x の増加量はいくつ？",
    type: "number", answer: 5,
    hint: "増加量 ＝ あとの値 − はじめの値",
    explanation: "7 − 2 = 5 です。" });
  add({ id: "change-basic-4", skill: "change", level: "basic", format: "expression",
    text: "y の値が −3 から 4 になりました。y の増加量はいくつ？",
    type: "number", answer: 7, prerequisite_skills: ["signed"], skills_used: ["change", "signed"],
    hint: "4 − (−3)。マイナスをひくと、たし算になる。",
    explanation: "4 − (−3) = 4 + 3 = 7 です。" });
  add({ id: "change-basic-5", skill: "change", level: "basic", format: "expression",
    text: "x の値が 5 から 2 になりました。x の増加量はいくつ？（減ったときはマイナスで答えよう）",
    type: "number", answer: -3, prerequisite_skills: ["signed"], skills_used: ["change", "signed"],
    hint: "あとの値 − はじめの値 ＝ 2 − 5",
    explanation: "2 − 5 = −3。3 減ったので、増加量は −3 です。" });

  add({ id: "change-standard-1", skill: "change", level: "standard", format: "expression",
    text: "y の値が 8 から 2 に変わりました。y の増加量はいくつ？（減ったときはマイナスで答えよう）",
    type: "number", answer: -6, prerequisite_skills: ["signed"], skills_used: ["change", "signed"],
    hint: "増加量 ＝ あとの値 − はじめの値。2 − 8 を計算しよう。",
    explanation: "2 − 8 = −6。減ったときの増加量はマイナスになります。" });
  add({ id: "change-standard-2", skill: "change", level: "standard", format: "graph",
    text: "グラフの直線上の点A から点B まで進むとき、x の増加量と y の増加量を答えなさい。",
    figure: { type: "graph", x: [-4, 5, 1], y: [-4, 6, 1], lines: [line(2, -1)],
      points: [{ x: -1, y: -3, label: "A" }, { x: 3, y: 5, label: "B" }] },
    type: "pair", fields: [{ key: "x_change", label: "x の増加量" }, { key: "y_change", label: "y の増加量" }],
    answer: { x_change: 4, y_change: 8 }, prerequisite_skills: ["coord", "signed"], skills_used: ["change", "coord"],
    hint: "まず点A と点B の座標をグラフから読もう。",
    explanation: "A(−1, −3)、B(3, 5)。x の増加量は 3 − (−1) = 4、y の増加量は 5 − (−3) = 8 です。" });
  add({ id: "change-standard-3", skill: "change", level: "standard", format: "table",
    text: "下の表の一次関数で、x が −2 から 4 まで増えたとき、y の増加量はいくつ？",
    figure: { type: "table", rows: [{ label: "x", values: [-2, 0, 2, 4, 6] }, { label: "y", values: [10, 7, 4, 1, -2] }] },
    type: "number", answer: -9, prerequisite_skills: ["signed"], skills_used: ["change", "signed"],
    hint: "x = −2 のときと x = 4 のときの y を読もう。となりどうしではないので注意。",
    explanation: "x = −2 のとき y = 10、x = 4 のとき y = 1。1 − 10 = −9 です。" });
  add({ id: "change-standard-4", skill: "change", level: "standard", format: "word",
    text: "水そうの水の量を調べました。午前9時に 35L、午前9時20分に 50L、午前9時45分には 20L でした。9時20分から9時45分までの、水の量の増加量は何L？",
    type: "number", answer: -30, prerequisite_skills: ["signed"], skills_used: ["change", "signed"],
    hint: "使うのは「9時20分」と「9時45分」の2つだけ。はじめの値とあとの値はどれ？",
    explanation: "9時20分（はじめ）は 50L、9時45分（あと）は 20L。20 − 50 = −30L です。" });
  add({ id: "change-standard-5", skill: "change", level: "standard", format: "expression",
    text: "2点 A(−4, 9)、B(2, −3) があります。A から B まで進むとき、x の増加量と y の増加量を答えなさい。",
    type: "pair", fields: [{ key: "x_change", label: "x の増加量" }, { key: "y_change", label: "y の増加量" }],
    answer: { x_change: 6, y_change: -12 }, prerequisite_skills: ["signed", "coord"], skills_used: ["change", "signed", "coord"],
    hint: "x どうし、y どうしで「B の値 − A の値」。",
    explanation: "x の増加量は 2 − (−4) = 6、y の増加量は −3 − 9 = −12 です。" });

  add({ id: "change-application-1", skill: "change", level: "application", format: "word",
    text: "水そうに一定の割合で水を入れています。入れ始めてから 3 分後の水の量は 14L、7 分後は 30L でした。",
    type: "steps",
    steps: [
      { id: "s1", skill: "change", text: "3 分後から 7 分後までの、時間（x）の増加量は何分？", type: "number", answer: 4,
        hint: "7 − 3", explanation: "7 − 3 = 4 分です。" },
      { id: "s2", skill: "change", text: "同じ間の、水の量（y）の増加量は何L？", type: "number", answer: 16,
        hint: "30 − 14", explanation: "30 − 14 = 16L です。" },
      { id: "s3", skill: "rate", text: "1 分あたりに増えた水の量は何L？", type: "number", answer: 4,
        hint: "y の増加量 ÷ x の増加量", explanation: "16 ÷ 4 = 4L。これが変化の割合です。" }
    ],
    skills_used: ["change", "rate"],
    hint: "「時間の増加量」「水の量の増加量」を順に出してから、1分あたりを考えよう。",
    explanation: "時間の増加量 4 分、水の量の増加量 16L なので、1 分あたり 16 ÷ 4 = 4L 増えています。" });
  add({ id: "change-application-2", skill: "change", level: "application", format: "word",
    text: "ろうそくに火をつけました。火をつけて 2 分後の長さは 17cm、6 分後の長さは 11cm でした。",
    type: "steps",
    steps: [
      { id: "s1", skill: "change", text: "2 分後から 6 分後までの、時間の増加量は何分？", type: "number", answer: 4,
        hint: "6 − 2", explanation: "6 − 2 = 4 分です。" },
      { id: "s2", skill: "change", text: "同じ間の、長さの増加量は何cm？（減ったときはマイナス）", type: "number", answer: -6,
        hint: "11 − 17", explanation: "11 − 17 = −6cm。6cm 短くなりました。" },
      { id: "s3", skill: "rate", text: "1 分あたり何cm ずつ短くなっている？", type: "number", answer: 1.5, answer_display: "1.5（3/2）",
        hint: "6 ÷ 4", explanation: "6 ÷ 4 = 1.5cm（3/2cm）ずつ短くなっています。" }
    ],
    prerequisite_skills: ["signed"], skills_used: ["change", "rate", "signed"],
    hint: "減っていく場面では、増加量がマイナスになります。",
    explanation: "時間は 4 分、長さは −6cm 変化。1 分あたり 1.5cm ずつ短くなっています。" });

  add({ id: "change-retention-1", skill: "change", level: "retention", evidence_level: "basic", format: "word",
    text: "ゆうさんの貯金は、4 月には 2300 円、9 月には 5800 円でした。4 月から 9 月までの貯金の増加量は何円？",
    type: "number", answer: 3500,
    hint: "9 月の金額 − 4 月の金額",
    explanation: "5800 − 2300 = 3500 円です。" });
  add({ id: "change-retention-2", skill: "change", level: "retention", evidence_level: "standard", format: "table",
    text: "下の表の一次関数で、x が −3 から 3 まで増えたとき、x の増加量と y の増加量を答えなさい。",
    figure: { type: "table", rows: [{ label: "x", values: [-3, -1, 1, 3] }, { label: "y", values: [-5, -1, 3, 7] }] },
    type: "pair", fields: [{ key: "x_change", label: "x の増加量" }, { key: "y_change", label: "y の増加量" }],
    answer: { x_change: 6, y_change: 12 }, prerequisite_skills: ["signed"], skills_used: ["change", "signed"],
    hint: "マイナスをひくときは、かっこをつけて計算しよう。3 − (−3)。",
    explanation: "x の増加量は 3 − (−3) = 6、y の増加量は 7 − (−5) = 12 です。" });
  add({ id: "change-retention-3", skill: "change", level: "retention", evidence_level: "basic", format: "numberline",
    text: "数直線上の点が、P の位置から Q の位置まで動きました。位置の増加量はいくつ？",
    figure: { type: "numberline", from: -6, to: 6, marks: [{ x: -5, label: "P" }, { x: 3, label: "Q" }] },
    type: "number", answer: 8, prerequisite_skills: ["signed"], skills_used: ["change", "signed"],
    hint: "Q の数 − P の数",
    explanation: "P は −5、Q は 3。3 − (−5) = 8 です。" });
  add({ id: "change-retention-4", skill: "change", level: "retention", evidence_level: "basic", format: "word",
    text: "午後1時の気温は 18℃、午後7時には 11℃ でした。1時から7時までの気温の増加量は何℃？",
    type: "number", answer: -7, prerequisite_skills: ["signed"], skills_used: ["change", "signed"],
    hint: "あとの気温 − はじめの気温。下がったときはマイナス。",
    explanation: "11 − 18 = −7℃ です。" });
  add({ id: "change-retention-5", skill: "change", level: "retention", evidence_level: "standard", format: "coordinate",
    text: "点 A(5, −4) から点 B(−1, 8) まで動きました。x の増加量と y の増加量を答えなさい。",
    type: "pair", fields: [{ key: "x_change", label: "x の増加量" }, { key: "y_change", label: "y の増加量" }],
    answer: { x_change: -6, y_change: 12 }, prerequisite_skills: ["signed", "coord"], skills_used: ["change", "signed", "coord"],
    hint: "x どうし、y どうしで「B − A」。x は減っている。",
    explanation: "x の増加量は −1 − 5 = −6、y の増加量は 8 − (−4) = 12 です。" });

  // =====================================================================
  // 式への代入（substitution）  既存：B3（基礎）
  // =====================================================================
  add({ id: "substitution-basic-1", skill: "substitution", level: "basic", format: "expression",
    text: "y = −2x + 5 で、x = −3 のとき、y はいくつ？",
    type: "number", answer: 11, prerequisite_skills: ["algebra", "signed"], skills_used: ["substitution", "signed"],
    hint: "かっこをつけて代入：y = −2 × (−3) + 5",
    explanation: "−2 × (−3) = 6、6 + 5 = 11 です。" });
  add({ id: "substitution-basic-2", skill: "substitution", level: "basic", format: "table",
    text: "一次関数 y = 3x − 4 について、下の表の ? にあてはまる数は？",
    figure: { type: "table", rows: [{ label: "x", values: [0, 1, 2, 3] }, { label: "y", values: [-4, -1, null, 5] }] },
    type: "number", answer: 2,
    hint: "? の上にある x の値を、式に入れてみよう。",
    explanation: "x = 2 を代入して y = 3 × 2 − 4 = 2 です。" });
  add({ id: "substitution-basic-3", skill: "substitution", level: "basic", format: "coordinate",
    text: "一次関数 y = 2x − 3 のグラフ上に、x 座標が 4 の点があります。この点の y 座標は？",
    type: "number", answer: 5, prerequisite_skills: ["algebra", "coord"], skills_used: ["substitution", "coord"],
    hint: "グラフ上の点は、式を満たす。x に 4 を入れてみよう。",
    explanation: "y = 2 × 4 − 3 = 5。点の座標は (4, 5) です。" });
  add({ id: "substitution-basic-4", skill: "substitution", level: "basic", format: "graph",
    text: "グラフの直線は y = (1/2)x + 1 です。点A の x 座標は 4 です。点A の y 座標を、式に代入して求めなさい。",
    figure: { type: "graph", x: [-2, 6, 1], y: [-1, 5, 1], lines: [line(0.5, 1)], points: [{ x: 4, y: 3, label: "A" }] },
    type: "number", answer: 3, prerequisite_skills: ["algebra"], skills_used: ["substitution"],
    hint: "(1/2) × 4 は、4 の半分。",
    explanation: "y = (1/2) × 4 + 1 = 2 + 1 = 3 です。グラフの点A の高さとも合っています。" });
  add({ id: "substitution-basic-5", skill: "substitution", level: "basic", format: "word",
    text: "毎月 500 円ずつ貯金します。最初に 2000 円あるとき、x か月後の貯金額 y 円は y = 500x + 2000 です。3 か月後の貯金額は何円？",
    type: "number", answer: 3500,
    hint: "x に 3 を入れる。",
    explanation: "500 × 3 + 2000 = 1500 + 2000 = 3500 円です。" });

  add({ id: "substitution-standard-1", skill: "substitution", level: "standard", format: "expression",
    text: "y = 4x − 3 で、y = 13 のとき、x はいくつ？",
    type: "number", answer: 4, skills_used: ["substitution", "algebra"],
    hint: "y に 13 を入れると 13 = 4x − 3。この方程式を解こう。",
    explanation: "13 = 4x − 3 → 4x = 16 → x = 4 です。" });
  add({ id: "substitution-standard-2", skill: "substitution", level: "standard", format: "expression",
    text: "一次関数 y = −x + 2 のグラフ上にある点はどれ？",
    type: "choice",
    choices: [{ key: "a", label: "(3, −1)" }, { key: "b", label: "(−2, 0)" }, { key: "c", label: "(1, 3)" }, { key: "d", label: "(0, −2)" }],
    answer: "a", prerequisite_skills: ["algebra", "coord"], skills_used: ["substitution", "coord"],
    hint: "点の x を式に入れて、y が点の y と同じになるか確かめよう。",
    explanation: "x = 3 を入れると y = −3 + 2 = −1。(3, −1) だけが式を満たします。" });
  add({ id: "substitution-standard-3", skill: "substitution", level: "standard", format: "expression",
    text: "y = (1/2)x + 3 で、x = −4 のとき、y はいくつ？",
    type: "number", answer: 1, prerequisite_skills: ["algebra", "signed"], skills_used: ["substitution", "signed"],
    hint: "(1/2) × (−4) は、−4 の半分。",
    explanation: "(1/2) × (−4) = −2、−2 + 3 = 1 です。" });
  add({ id: "substitution-standard-4", skill: "substitution", level: "standard", format: "coordinate",
    text: "一次関数 y = 3x + 2 のグラフ上に、y 座標が −7 の点があります。この点の x 座標は？",
    type: "number", answer: -3, prerequisite_skills: ["algebra", "signed", "coord"], skills_used: ["substitution", "algebra", "signed"],
    hint: "y に −7 を入れると −7 = 3x + 2。この方程式を解こう。",
    explanation: "−7 = 3x + 2 → 3x = −9 → x = −3。点は (−3, −7) です。" });
  add({ id: "substitution-standard-5", skill: "substitution", level: "standard", format: "word",
    text: "水そうの水をぬいています。x 分後の水の量 y L は y = −4x + 60 で表されます。水の量が 20L になるのは何分後？",
    type: "number", answer: 10, prerequisite_skills: ["algebra", "signed"], skills_used: ["substitution", "algebra"],
    hint: "20 = −4x + 60 を解こう。",
    explanation: "20 = −4x + 60 → −4x = −40 → x = 10 分後です。" });

  add({ id: "substitution-application-1", skill: "substitution", level: "application", format: "word",
    text: "ある電話プランの料金 y 円は、通話時間 x 分を使って y = 20x + 800 と表されます。",
    type: "steps",
    steps: [
      { id: "s1", skill: "substitution", text: "通話時間が 15 分のときの料金は何円？", type: "number", answer: 1100,
        hint: "x に 15 を入れる", explanation: "20 × 15 + 800 = 1100 円です。" },
      { id: "s2", skill: "substitution", text: "料金が 1400 円だったとき、通話時間は何分？", type: "number", answer: 30,
        hint: "1400 = 20x + 800 を解く", explanation: "20x = 600 → x = 30 分です。" }
    ],
    skills_used: ["substitution", "algebra"],
    hint: "「x を入れて y を出す」と「y から x をもとめる」の2つの使い方があります。",
    explanation: "15 分なら 1100 円。1400 円なら 20x + 800 = 1400 より 30 分です。" });
  add({ id: "substitution-application-2", skill: "substitution", level: "application", format: "word",
    text: "気温は、地上から 1km 高くなるごとに 6℃ 下がるとします。地上の気温が 20℃ のとき、高さ x km の気温を y℃ とします。",
    type: "steps",
    steps: [
      { id: "s1", skill: "form", text: "y を x の式で表しなさい。", type: "linear", answer: { a: -6, b: 20 }, placeholder: "例：y = 3x + 2",
        hint: "1km ごとに 6℃ 下がる → x の前は −6。地上（x = 0）で 20℃。", explanation: "y = −6x + 20 です。" },
      { id: "s2", skill: "substitution", text: "高さ 2.5km の気温は何℃？", type: "number", answer: 5,
        hint: "x = 2.5 を代入", explanation: "−6 × 2.5 + 20 = −15 + 20 = 5℃ です。" },
      { id: "s3", skill: "substitution", text: "気温が −4℃ になるのは、高さ何km？", type: "number", answer: 4,
        hint: "−4 = −6x + 20 を解く", explanation: "−6x = −24 → x = 4km です。" }
    ],
    prerequisite_skills: ["algebra", "signed"], skills_used: ["form", "substitution", "signed"],
    hint: "まず式を作り、その式に数を入れたり、方程式として解いたりします。",
    explanation: "y = −6x + 20。2.5km では 5℃、−4℃ になるのは 4km です。" });

  add({ id: "substitution-retention-1", skill: "substitution", level: "retention", evidence_level: "basic", format: "word",
    text: "1 本 120 円のペンを x 本と、300 円のノートを 1 冊買うときの代金 y 円は、y = 120x + 300 です。ペンを 6 本買うと、代金は何円？",
    type: "number", answer: 1020,
    hint: "x に 6 を入れる",
    explanation: "120 × 6 + 300 = 720 + 300 = 1020 円です。" });
  add({ id: "substitution-retention-2", skill: "substitution", level: "retention", evidence_level: "basic", format: "table",
    text: "一次関数 y = −3x + 1 の表です。2 つの ? にあてはまる数を答えなさい。",
    figure: { type: "table", rows: [{ label: "x", values: [-2, 0, 2, 4] }, { label: "y", values: [null, 1, -5, null] }] },
    type: "pair", fields: [{ key: "left", label: "x = −2 のとき" }, { key: "right", label: "x = 4 のとき" }],
    answer: { left: 7, right: -11 }, prerequisite_skills: ["algebra", "signed"], skills_used: ["substitution", "signed"],
    hint: "−3 × (−2) と −3 × 4 を、かっこをつけて計算しよう。",
    explanation: "x = −2 のとき −3 × (−2) + 1 = 7、x = 4 のとき −3 × 4 + 1 = −11 です。" });
  add({ id: "substitution-retention-3", skill: "substitution", level: "retention", evidence_level: "basic", format: "coordinate",
    text: "点 (−2, 9) は、一次関数 y = −4x + 1 のグラフ上にありますか？",
    type: "choice", choices: [{ key: "a", label: "グラフ上にある" }, { key: "b", label: "グラフ上にない" }],
    answer: "a", prerequisite_skills: ["algebra", "signed", "coord"], skills_used: ["substitution", "signed"],
    hint: "x = −2 を式に入れて、y が 9 になるか確かめよう。",
    explanation: "y = −4 × (−2) + 1 = 9。式を満たすので、グラフ上にあります。" });
  add({ id: "substitution-retention-4", skill: "substitution", level: "retention", evidence_level: "standard", format: "word",
    text: "工作で使うひもの長さ y cm は、作る飾りの数 x に対して y = 7x + 15 です。ひもが 71cm のとき、飾りはいくつ？",
    type: "number", answer: 8, skills_used: ["substitution", "algebra"],
    hint: "71 = 7x + 15 を解こう。",
    explanation: "7x = 71 − 15 = 56 → x = 8 です。" });
  add({ id: "substitution-retention-5", skill: "substitution", level: "retention", evidence_level: "basic", format: "expression",
    text: "y = 0.4x − 2 で、x = 15 のとき、y はいくつ？",
    type: "number", answer: 4,
    hint: "0.4 × 15 を先に計算。",
    explanation: "0.4 × 15 = 6、6 − 2 = 4 です。" });

  // =====================================================================
  // 変化の割合（rate）  既存：B4（基礎）・S1（標準）
  // =====================================================================
  add({ id: "rate-basic-1", skill: "rate", level: "basic", format: "expression",
    text: "一次関数 y = 4x − 1 の変化の割合はいくつ？",
    type: "number", answer: 4, prerequisite_skills: ["change", "slopeIntercept"], skills_used: ["rate", "slopeIntercept"],
    hint: "一次関数 y = ax + b では、変化の割合はいつも a。",
    explanation: "y = ax + b の変化の割合は a なので 4 です。" });
  add({ id: "rate-basic-2", skill: "rate", level: "basic", format: "table",
    text: "下の表は一次関数の x と y の関係です。変化の割合はいくつ？",
    figure: { type: "table", rows: [{ label: "x", values: [0, 1, 2, 3] }, { label: "y", values: [2, 5, 8, 11] }] },
    type: "number", answer: 3,
    hint: "x が 1 増えると、y はいくつ増えている？",
    explanation: "x が 1 増えるごとに y は 3 増えるので、変化の割合は 3 です。" });
  add({ id: "rate-basic-3", skill: "rate", level: "basic", format: "expression",
    text: "x が 4 増えたとき、y は 8 減りました（y の増加量は −8）。変化の割合はいくつ？",
    type: "number", answer: -2, prerequisite_skills: ["change", "signed"], skills_used: ["rate", "signed"],
    hint: "y の増加量 ÷ x の増加量 ＝ (−8) ÷ 4",
    explanation: "(−8) ÷ 4 = −2 です。y が減るときは、変化の割合がマイナスになります。" });
  add({ id: "rate-basic-4", skill: "rate", level: "basic", format: "expression",
    text: "x の増加量が −2、y の増加量が 6 でした。変化の割合はいくつ？",
    type: "number", answer: -3, prerequisite_skills: ["change", "signed"], skills_used: ["rate", "signed"],
    hint: "6 ÷ (−2)。わる数がマイナスでも、式は同じ。",
    explanation: "6 ÷ (−2) = −3 です。" });
  add({ id: "rate-basic-5", skill: "rate", level: "basic", format: "word",
    text: "水そうに水を入れると、5 分間で水の量が 15L 増えました。1 分あたりに増えた水の量（変化の割合）は何L？",
    type: "number", answer: 3,
    hint: "時間が x、水の量が y。15 ÷ 5",
    explanation: "15 ÷ 5 = 3。1 分あたり 3L 増えています。" });

  add({ id: "rate-standard-1", skill: "rate", level: "standard", format: "expression",
    text: "一次関数のグラフが、2 点 (−1, 4)、(3, −4) を通ります。変化の割合はいくつ？",
    type: "number", answer: -2, prerequisite_skills: ["change", "signed"], skills_used: ["rate", "change", "signed"],
    hint: "(y の増加量) ÷ (x の増加量)。どちらもマイナスに気をつけて。",
    explanation: "y の増加量 −4 − 4 = −8、x の増加量 3 − (−1) = 4。−8 ÷ 4 = −2 です。" });
  add({ id: "rate-standard-2", skill: "rate", level: "standard", format: "graph",
    text: "グラフの直線は一次関数です。変化の割合を答えなさい。（分数でも小数でもよい）",
    figure: { type: "graph", x: [-3, 4, 1], y: [-5, 5, 1], lines: [line(1.5, -1)],
      points: [{ x: 0, y: -1 }, { x: 2, y: 2 }] },
    type: "number", answer: 1.5, answer_display: "3/2（1.5）", prerequisite_skills: ["change", "coord"], skills_used: ["rate", "change", "coord"],
    hint: "グラフ上の2つの点（●）の座標を読んで、x と y がそれぞれいくつ増えたか数えよう。",
    explanation: "(0, −1) から (2, 2) まで、x は 2、y は 3 増えています。3 ÷ 2 = 3/2（1.5）です。" });
  add({ id: "rate-standard-3", skill: "rate", level: "standard", format: "table",
    text: "下の表の一次関数で、x が −1 から 5 まで増えたときの変化の割合を求めなさい。",
    figure: { type: "table", rows: [{ label: "x", values: [-1, 1, 3, 5] }, { label: "y", values: [10, 4, -2, -8] }] },
    type: "number", answer: -3, prerequisite_skills: ["change", "signed"], skills_used: ["rate", "change", "signed"],
    hint: "まず x の増加量と y の増加量を、表から自分で計算しよう。",
    explanation: "x の増加量 5 − (−1) = 6、y の増加量 −8 − 10 = −18。−18 ÷ 6 = −3 です。" });
  add({ id: "rate-standard-4", skill: "rate", level: "standard", format: "word",
    text: "自転車で走った記録です。出発して 4 分後には家から 1000m、10 分後には家から 2800m の地点にいました。4 分後から 10 分後までの変化の割合（1 分あたりに進んだ道のり）を求めなさい。",
    type: "number", answer: 300, prerequisite_skills: ["change"], skills_used: ["rate", "change"],
    hint: "時間の増加量と道のりの増加量を、それぞれ文章から取り出そう。",
    explanation: "時間の増加量は 10 − 4 = 6 分、道のりの増加量は 2800 − 1000 = 1800m。1800 ÷ 6 = 300 です。" });

  add({ id: "rate-application-1", skill: "rate", level: "application", format: "graph",
    text: "ひなさんは家から図書館まで一定の速さで歩きました。グラフは、出発してからの時間 x 分と、家からの道のり y m の関係です。",
    figure: { type: "graph", x: [0, 16, 2], y: [0, 1000, 200], xLabel: "x（分）", yLabel: "y（m）",
      lines: [line(60, 0, { from: 0, to: 15 })],
      points: [{ x: 5, y: 300, label: "P", coords: true }, { x: 15, y: 900, label: "Q", coords: true }] },
    type: "steps",
    steps: [
      { id: "s1", skill: "change", text: "点P から点Q まで、y（道のり）の増加量は何m？", type: "number", answer: 600,
        hint: "900 − 300", explanation: "900 − 300 = 600m です。" },
      { id: "s2", skill: "rate", text: "点P から点Q までの変化の割合は？", type: "number", answer: 60,
        hint: "600 ÷ (15 − 5)", explanation: "600 ÷ 10 = 60 です。" },
      { id: "s3", skill: "rate", text: "この変化の割合は、何を表している？", type: "choice",
        choices: [{ key: "a", label: "1 分間に進んだ道のり（分速）" }, { key: "b", label: "家から図書館までの道のり" },
          { key: "c", label: "図書館に着くまでの時間" }, { key: "d", label: "出発した時刻" }],
        answer: "a", hint: "「x が 1 増えると y がいくつ増えるか」を、この場面の言葉で言うと？",
        explanation: "x（分）が 1 増えるごとに y（m）が 60 増える＝分速 60m を表しています。" }
    ],
    prerequisite_skills: ["change", "coord"], skills_used: ["change", "rate", "coord"],
    hint: "グラフの点から増加量を出し、変化の割合がこの場面で何を意味するかを考えよう。",
    explanation: "道のりの増加量 600m、時間の増加量 10 分で、変化の割合 60 は分速 60m を表します。" });
  add({ id: "rate-application-2", skill: "rate", level: "application", format: "table",
    text: "やかんの水を温めます。温め始めてから x 分後の水温 y℃ は、下の表のようになりました（一次関数とみなします）。",
    figure: { type: "table", rows: [{ label: "x（分）", values: [0, 2, 4, 6] }, { label: "y（℃）", values: [18, 30, 42, 54] }] },
    type: "steps",
    steps: [
      { id: "s1", skill: "rate", text: "変化の割合（1 分あたりに上がる温度）はいくつ？", type: "number", answer: 6,
        hint: "x が 2 増えると y は 12 増える", explanation: "12 ÷ 2 = 6。1 分に 6℃ ずつ上がります。" },
      { id: "s2", skill: "form", text: "y を x の式で表しなさい。", type: "linear", answer: { a: 6, b: 18 }, placeholder: "例：y = 3x + 2",
        hint: "x = 0 のときの y が切片", explanation: "y = 6x + 18 です。" },
      { id: "s3", skill: "substitution", text: "水温が 90℃ になるのは何分後？", type: "number", answer: 12,
        hint: "90 = 6x + 18 を解く", explanation: "6x = 72 → x = 12 分後です。" }
    ],
    skills_used: ["rate", "form", "substitution"],
    hint: "表から変化の割合と、x = 0 のときの値を読み取ろう。",
    explanation: "変化の割合 6、切片 18 で y = 6x + 18。90℃ になるのは 12 分後です。" });

  add({ id: "rate-retention-1", skill: "rate", level: "retention", evidence_level: "basic", format: "table",
    text: "プールの水をぬいています。ぬき始めてから x 分後の水の深さ y cm は下の表のとおりです。変化の割合はいくつ？",
    figure: { type: "table", rows: [{ label: "x（分）", values: [0, 10, 20, 30] }, { label: "y（cm）", values: [120, 100, 80, 60] }] },
    type: "number", answer: -2, prerequisite_skills: ["change", "signed"], skills_used: ["rate", "change", "signed"],
    hint: "x が 10 増えると、y はいくつ変わる？（減ったらマイナス）",
    explanation: "x が 10 増えると y は −20。−20 ÷ 10 = −2 です。" });
  add({ id: "rate-retention-2", skill: "rate", level: "retention", evidence_level: "standard", format: "graph",
    text: "グラフの直線の変化の割合を答えなさい。（分数で答えよう）",
    figure: { type: "graph", x: [-4, 5, 1], y: [-2, 5, 1], lines: [line(-1 / 3, 2)],
      points: [{ x: -3, y: 3 }, { x: 3, y: 1 }] },
    type: "number", answer: -1 / 3, answer_display: "−1/3", prerequisite_skills: ["change", "coord", "signed"], skills_used: ["rate", "change", "coord"],
    hint: "2 つの●の座標を読もう。右へ進むと、上がる？下がる？",
    explanation: "(−3, 3) から (3, 1) まで、x は 6 増え、y は 2 減っています。−2 ÷ 6 = −1/3 です。" });
  add({ id: "rate-retention-3", skill: "rate", level: "retention", evidence_level: "standard", format: "expression",
    text: "一次関数 y = −5x + 8 で、x が 3 から 7 まで増えると、y の増加量はいくつ？",
    type: "number", answer: -20, prerequisite_skills: ["change", "signed"], skills_used: ["rate", "change", "signed"],
    hint: "変化の割合は −5。y の増加量 ＝ 変化の割合 × x の増加量。",
    explanation: "x の増加量は 4。−5 × 4 = −20 です。" });
  add({ id: "rate-retention-4", skill: "rate", level: "retention", evidence_level: "basic", format: "word",
    text: "ろうそくが 8 分間で 12cm 短くなりました。時間 x 分と長さ y cm の変化の割合はいくつ？（短くなるのでマイナス）",
    type: "number", answer: -1.5, answer_display: "−1.5（−3/2）", prerequisite_skills: ["change", "signed"], skills_used: ["rate", "signed"],
    hint: "y の増加量は −12、x の増加量は 8。",
    explanation: "(−12) ÷ 8 = −1.5 です。1 分に 1.5cm ずつ短くなっています。" });
  add({ id: "rate-retention-5", skill: "rate", level: "retention", evidence_level: "standard", format: "coordinate",
    text: "2点 (−4, −1)、(2, 11) を通る直線の変化の割合は？",
    type: "number", answer: 2, prerequisite_skills: ["change", "signed", "coord"], skills_used: ["rate", "change", "signed"],
    hint: "(y の増加量) ÷ (x の増加量)。マイナスをひくときに注意。",
    explanation: "y の増加量 11 − (−1) = 12、x の増加量 2 − (−4) = 6。12 ÷ 6 = 2 です。" });

  // =====================================================================
  // 傾き・切片（slopeIntercept）  既存：C5（基礎）
  // =====================================================================
  add({ id: "slopeIntercept-basic-1", skill: "slopeIntercept", level: "basic", format: "expression",
    text: "一次関数 y = −x + 7 の傾きと切片を答えなさい。",
    type: "pair", fields: [{ key: "slope", label: "傾き" }, { key: "intercept", label: "切片" }],
    answer: { slope: -1, intercept: 7 },
    hint: "x の前に数が書いていないときは、1（マイナスなら −1）がかくれています。",
    explanation: "−x は −1 × x のこと。傾きは −1、切片は 7 です。" });
  add({ id: "slopeIntercept-basic-2", skill: "slopeIntercept", level: "basic", format: "graph",
    text: "グラフの直線の切片はいくつ？",
    figure: { type: "graph", x: [-2, 4, 1], y: [-5, 5, 1], lines: [line(2, -3)] },
    type: "number", answer: -3, prerequisite_skills: ["proportion", "coord"], skills_used: ["slopeIntercept", "coord"],
    hint: "切片は、直線が y 軸と交わるところの y の値。",
    explanation: "直線は y 軸と (0, −3) で交わるので、切片は −3 です。" });
  add({ id: "slopeIntercept-basic-3", skill: "slopeIntercept", level: "basic", format: "table",
    text: "下の表は一次関数の x と y の関係です。切片はいくつ？",
    figure: { type: "table", rows: [{ label: "x", values: [-2, -1, 0, 1] }, { label: "y", values: [-7, -4, -1, 2] }] },
    type: "number", answer: -1,
    hint: "切片は、x = 0 のときの y の値。",
    explanation: "x = 0 のとき y = −1 なので、切片は −1 です。" });
  add({ id: "slopeIntercept-basic-4", skill: "slopeIntercept", level: "basic", format: "graph",
    text: "グラフの直線の傾きはいくつ？",
    figure: { type: "graph", x: [-2, 3, 1], y: [-5, 5, 1], lines: [line(-3, 2)], points: [{ x: 0, y: 2 }, { x: 1, y: -1 }] },
    type: "number", answer: -3, prerequisite_skills: ["proportion", "coord"], skills_used: ["slopeIntercept", "coord"],
    hint: "●から右に 1 進むと、上下にいくつ動く？ 下がるならマイナス。",
    explanation: "右に 1 進むと 3 下がるので、傾きは −3 です。" });
  add({ id: "slopeIntercept-basic-5", skill: "slopeIntercept", level: "basic", format: "word",
    text: "x が 1 増えると y が 3 増え、x = 0 のとき y = −4 になる一次関数があります。傾きと切片を答えなさい。",
    type: "pair", fields: [{ key: "slope", label: "傾き" }, { key: "intercept", label: "切片" }],
    answer: { slope: 3, intercept: -4 },
    hint: "x が 1 増えたときの y の増え方が傾き、x = 0 のときの y が切片。",
    explanation: "傾きは 3、切片は −4 です（式は y = 3x − 4）。" });

  add({ id: "slopeIntercept-standard-1", skill: "slopeIntercept", level: "standard", format: "graph",
    text: "グラフの直線の傾きはいくつ？（分数で答えよう）",
    figure: { type: "graph", x: [-4, 4, 1], y: [-3, 5, 1], lines: [line(2 / 3, 1)],
      points: [{ x: -3, y: -1 }, { x: 0, y: 1 }, { x: 3, y: 3 }] },
    type: "number", answer: 2 / 3, answer_display: "2/3", prerequisite_skills: ["proportion", "coord", "change"], skills_used: ["slopeIntercept", "change", "coord"],
    hint: "●から●へ、右に何マス・上に何マス進んでいるか数えよう。傾き ＝ 上 ÷ 右。",
    explanation: "右に 3 進むと上に 2 進むので、傾きは 2/3 です。" });
  add({ id: "slopeIntercept-standard-2", skill: "slopeIntercept", level: "standard", format: "expression",
    text: "2x + y = 5 を y = ax + b の形になおしたとき、傾きと切片はいくつ？",
    type: "pair", fields: [{ key: "slope", label: "傾き" }, { key: "intercept", label: "切片" }],
    answer: { slope: -2, intercept: 5 }, prerequisite_skills: ["proportion", "eqTransform"], skills_used: ["slopeIntercept", "eqTransform"],
    hint: "2x を右へ移すと、符号が変わる。",
    explanation: "y = −2x + 5 なので、傾きは −2、切片は 5 です。" });
  add({ id: "slopeIntercept-standard-3", skill: "slopeIntercept", level: "standard", format: "expression",
    text: "次の一次関数のうち、x が増えると y が減るものはどれ？",
    type: "choice",
    choices: [{ key: "a", label: "y = 3x − 5" }, { key: "b", label: "y = −2x + 4" }, { key: "c", label: "y = (1/2)x − 1" }, { key: "d", label: "y = 5 + x" }],
    answer: "b",
    hint: "傾き（x の前の数）がプラスなら右上がり、マイナスなら右下がり。",
    explanation: "傾きがマイナスなのは y = −2x + 4 だけ。x が増えると y は減ります。" });
  add({ id: "slopeIntercept-standard-4", skill: "slopeIntercept", level: "standard", format: "expression",
    text: "一次関数 y = 6 − 2x の傾きと切片を答えなさい。",
    type: "pair", fields: [{ key: "slope", label: "傾き" }, { key: "intercept", label: "切片" }],
    answer: { slope: -2, intercept: 6 },
    hint: "y = ax + b の順番に並べかえてみよう。x の項が後ろにあっても、x についている数が傾き。",
    explanation: "y = −2x + 6 と同じなので、傾きは −2、切片は 6 です。" });
  add({ id: "slopeIntercept-standard-5", skill: "slopeIntercept", level: "standard", format: "coordinate",
    text: "2点 (0, 5)、(2, −1) を通る直線の傾きと切片を答えなさい。",
    type: "pair", fields: [{ key: "slope", label: "傾き" }, { key: "intercept", label: "切片" }],
    answer: { slope: -3, intercept: 5 }, prerequisite_skills: ["rate", "coord"], skills_used: ["slopeIntercept", "rate", "coord"],
    hint: "x = 0 の点がそのまま切片。傾きは (y の増加量) ÷ (x の増加量)。",
    explanation: "(0, 5) から切片は 5。傾きは (−1 − 5) ÷ (2 − 0) = −6 ÷ 2 = −3 です。" });

  add({ id: "slopeIntercept-application-1", skill: "slopeIntercept", level: "application", format: "word",
    text: "ある駐車場の料金は、はじめに 300 円、そのあと 1 時間ごとに 200 円かかります。とめた時間を x 時間、料金を y 円とします。",
    type: "steps",
    steps: [
      { id: "s1", skill: "slopeIntercept", text: "y = ax + b と表すとき、a（傾き）にあたる数は？", type: "number", answer: 200,
        hint: "1 時間ごとに増える金額", explanation: "1 時間ごとに 200 円増えるので a = 200 です。" },
      { id: "s2", skill: "slopeIntercept", text: "b（切片）にあたる数は？", type: "number", answer: 300,
        hint: "x = 0 のときにかかる金額", explanation: "はじめにかかる 300 円が b です。" },
      { id: "s3", skill: "form", text: "y を x の式で表しなさい。", type: "linear", answer: { a: 200, b: 300 }, placeholder: "例：y = 100x + 50",
        hint: "a と b を y = ax + b に入れる", explanation: "y = 200x + 300 です。" },
      { id: "s4", skill: "substitution", text: "料金が 1500 円のとき、とめた時間は何時間？", type: "number", answer: 6,
        hint: "1500 = 200x + 300 を解く", explanation: "200x = 1200 → x = 6 時間です。" }
    ],
    skills_used: ["slopeIntercept", "form", "substitution"],
    hint: "「はじめにかかる分」が切片、「1 時間ごとに増える分」が傾き。",
    explanation: "傾き 200、切片 300 で y = 200x + 300。1500 円なら 6 時間です。" });
  add({ id: "slopeIntercept-application-2", skill: "slopeIntercept", level: "application", format: "word",
    text: "充電 100% のスマートフォンを使うと、1 時間に 8% ずつ充電が減るとします。使った時間を x 時間、残りの充電を y % とします。",
    type: "steps",
    steps: [
      { id: "s1", skill: "slopeIntercept", text: "y = ax + b の a（傾き）は？", type: "number", answer: -8,
        hint: "1 時間ごとに「減る」ので符号に注意", explanation: "1 時間に 8 ずつ減るので a = −8 です。" },
      { id: "s2", skill: "slopeIntercept", text: "b（切片）は？", type: "number", answer: 100,
        hint: "使い始め（x = 0）の充電", explanation: "使い始めは 100% なので b = 100 です。" },
      { id: "s3", skill: "substitution", text: "残りの充電が 20% になるのは何時間後？", type: "number", answer: 10,
        hint: "20 = −8x + 100 を解く", explanation: "−8x = −80 → x = 10 時間後です。" }
    ],
    prerequisite_skills: ["proportion", "signed"], skills_used: ["slopeIntercept", "substitution", "signed"],
    hint: "減っていく場面では、傾きがマイナスになります。",
    explanation: "y = −8x + 100。20% になるのは 10 時間後です。" });

  add({ id: "slopeIntercept-retention-1", skill: "slopeIntercept", level: "retention", evidence_level: "standard", format: "word",
    text: "ばねに x g のおもりをつけたときの、ばねの長さ y cm は y = 0.2x + 15 と表されます。おもりをつけていないときの長さ（切片）と、1g あたりにのびる長さ（傾き）を答えなさい。",
    type: "pair", fields: [{ key: "intercept", label: "切片（cm）" }, { key: "slope", label: "傾き（cm）" }],
    answer: { intercept: 15, slope: 0.2 },
    hint: "x = 0（おもりなし）のときの長さが切片。答えの順番にも注意。",
    explanation: "切片は 15cm、傾きは 0.2cm です。" });
  add({ id: "slopeIntercept-retention-2", skill: "slopeIntercept", level: "retention", evidence_level: "basic", format: "graph",
    text: "グラフの直線の傾きと切片を答えなさい。",
    figure: { type: "graph", x: [-2, 3, 1], y: [-5, 5, 1], lines: [line(3, -2)],
      points: [{ x: 0, y: -2 }, { x: 1, y: 1 }] },
    type: "pair", fields: [{ key: "slope", label: "傾き" }, { key: "intercept", label: "切片" }],
    answer: { slope: 3, intercept: -2 }, prerequisite_skills: ["proportion", "coord"], skills_used: ["slopeIntercept", "coord"],
    hint: "y 軸と交わる点で切片、そこから右に 1 進むと上にいくつ？で傾き。",
    explanation: "y 軸と (0, −2) で交わり、右に 1 進むと上に 3。傾き 3、切片 −2 です。" });
  add({ id: "slopeIntercept-retention-3", skill: "slopeIntercept", level: "retention", evidence_level: "standard", format: "table",
    text: "下の表は一次関数の x と y の関係です。傾きと切片を答えなさい。",
    figure: { type: "table", rows: [{ label: "x", values: [0, 3, 6] }, { label: "y", values: [7, 1, -5] }] },
    type: "pair", fields: [{ key: "slope", label: "傾き" }, { key: "intercept", label: "切片" }],
    answer: { slope: -2, intercept: 7 }, prerequisite_skills: ["rate"], skills_used: ["slopeIntercept", "rate"],
    hint: "x = 0 のときの y が切片。x が 3 増えると y はいくつ変わる？",
    explanation: "x = 0 のとき y = 7 なので切片は 7。x が 3 増えると y は 6 減るので、傾きは −6 ÷ 3 = −2 です。" });
  add({ id: "slopeIntercept-retention-4", skill: "slopeIntercept", level: "retention", evidence_level: "basic", format: "expression",
    text: "切片が −4 で、右下がりの直線の式はどれ？",
    type: "choice",
    choices: [{ key: "a", label: "y = 4x − 1" }, { key: "b", label: "y = −x − 4" }, { key: "c", label: "y = −4x + 1" }, { key: "d", label: "y = x + 4" }],
    answer: "b",
    hint: "切片はうしろの数、右下がりは傾きがマイナス。",
    explanation: "切片が −4 なのは y = −x − 4。傾き −1 なので右下がりです。" });
  add({ id: "slopeIntercept-retention-5", skill: "slopeIntercept", level: "retention", evidence_level: "basic", format: "word",
    text: "ある駐輪場の料金は、はじめに 400 円かかり、そのあと 1 時間ごとに 60 円ずつ増えます。とめた時間を x 時間、料金を y 円として y = ax + b と表すとき、a（傾き）と b（切片）を答えなさい。",
    type: "pair", fields: [{ key: "slope", label: "a（傾き）" }, { key: "intercept", label: "b（切片）" }],
    answer: { slope: 60, intercept: 400 },
    hint: "1 時間ごとに増える分が傾き、はじめにかかる分が切片。",
    explanation: "a = 60、b = 400。式は y = 60x + 400 です。" });

  // =====================================================================
  // グラフ・式（form）  既存：B5（基礎）・S2（標準）
  // =====================================================================
  add({ id: "form-basic-1", skill: "form", level: "basic", format: "graph",
    text: "グラフの直線の式を求めなさい。",
    figure: { type: "graph", x: [-2, 5, 1], y: [-2, 5, 1], lines: [line(-1, 3)],
      points: [{ x: 0, y: 3 }, { x: 3, y: 0 }] },
    type: "linear", answer: { a: -1, b: 3 }, placeholder: "例：y = 2x + 1",
    prerequisite_skills: ["slopeIntercept", "coord"], skills_used: ["form", "slopeIntercept", "coord"],
    hint: "切片は y 軸と交わるところ。傾きは、右に 1 進むと上下にいくつ動くか。",
    explanation: "切片は 3、右に 1 進むと 1 下がるので傾きは −1。y = −x + 3 です。" });
  add({ id: "form-basic-2", skill: "form", level: "basic", format: "table",
    text: "下の表は一次関数の x と y の関係です。y を x の式で表しなさい。",
    figure: { type: "table", rows: [{ label: "x", values: [0, 1, 2, 3] }, { label: "y", values: [-2, 2, 6, 10] }] },
    type: "linear", answer: { a: 4, b: -2 }, placeholder: "例：y = 2x + 1",
    prerequisite_skills: ["rate", "slopeIntercept"], skills_used: ["form", "rate"],
    hint: "x が 1 増えると y はいくつ増える？ x = 0 のときの y は？",
    explanation: "変化の割合は 4、x = 0 のとき y = −2 なので y = 4x − 2 です。" });
  add({ id: "form-basic-3", skill: "form", level: "basic", format: "expression",
    text: "傾きが −3、切片が 4 の一次関数の式を答えなさい。",
    type: "linear", answer: { a: -3, b: 4 }, placeholder: "例：y = 2x + 1",
    hint: "y = ax + b の a に傾き、b に切片を入れる。",
    explanation: "y = −3x + 4 です。" });
  add({ id: "form-basic-4", skill: "form", level: "basic", format: "coordinate",
    text: "傾きが 2 で、点 (0, −5) を通る直線の式を答えなさい。",
    type: "linear", answer: { a: 2, b: -5 }, placeholder: "例：y = 2x + 1",
    prerequisite_skills: ["slopeIntercept", "coord"], skills_used: ["form", "slopeIntercept", "coord"],
    hint: "x 座標が 0 の点の y 座標が、そのまま切片。",
    explanation: "(0, −5) を通るので切片は −5。y = 2x − 5 です。" });
  add({ id: "form-basic-5", skill: "form", level: "basic", format: "word",
    text: "はじめに 10L の水が入った水そうに、1 分に 4L ずつ水を入れます。x 分後の水の量を y L として、y を x の式で表しなさい。",
    type: "linear", answer: { a: 4, b: 10 }, placeholder: "例：y = 2x + 1",
    hint: "1 分あたりに増える量が x の前、はじめの量がうしろ。",
    explanation: "y = 4x + 10 です。" });

  add({ id: "form-standard-1", skill: "form", level: "standard", format: "expression",
    text: "2 点 (−1, 1)、(2, 7) を通る直線の式を求めなさい。",
    type: "linear", answer: { a: 2, b: 3 }, placeholder: "例：y = 2x + 1",
    prerequisite_skills: ["rate", "substitution"], skills_used: ["form", "rate", "substitution"],
    hint: "まず変化の割合（傾き）を出し、どちらかの点を代入して切片を求めよう。",
    explanation: "傾きは (7 − 1) ÷ (2 − (−1)) = 2。7 = 2 × 2 + b より b = 3。y = 2x + 3 です。" });
  add({ id: "form-standard-2", skill: "form", level: "standard", format: "graph",
    text: "グラフの直線の式を求めなさい。",
    figure: { type: "graph", x: [-4, 6, 1], y: [-5, 3, 1], lines: [line(0.5, -2)],
      points: [{ x: 0, y: -2 }, { x: 4, y: 0 }] },
    type: "linear", answer: { a: 0.5, b: -2 }, answer_display: "y = (1/2)x − 2", placeholder: "例：y = (1/3)x + 1",
    prerequisite_skills: ["slopeIntercept", "rate", "coord"], skills_used: ["form", "slopeIntercept", "rate", "coord"],
    hint: "●から●へ、右に何マス・上に何マス？ 傾きが分数になることもあります。",
    explanation: "右に 4 進むと上に 2 なので傾きは 1/2、切片は −2。y = (1/2)x − 2 です。" });
  add({ id: "form-standard-3", skill: "form", level: "standard", format: "table",
    text: "下の表は一次関数の x と y の関係です。y を x の式で表しなさい。（表に x = 0 はありません）",
    figure: { type: "table", rows: [{ label: "x", values: [1, 3, 5] }, { label: "y", values: [5, 11, 17] }] },
    type: "linear", answer: { a: 3, b: 2 }, placeholder: "例：y = 2x + 1",
    prerequisite_skills: ["rate", "substitution"], skills_used: ["form", "rate", "substitution"],
    hint: "まず変化の割合を出し、x = 1 のときの値を使って切片を求めよう。",
    explanation: "x が 2 増えると y は 6 増えるので傾きは 3。5 = 3 × 1 + b より b = 2。y = 3x + 2 です。" });
  add({ id: "form-standard-4", skill: "form", level: "standard", format: "graph",
    text: "グラフの直線の式を求めなさい。（y 軸との交わり方にも注意）",
    figure: { type: "graph", x: [-3, 5, 1], y: [-1, 5, 1], lines: [line(-0.5, 3)], points: [{ x: -2, y: 4 }, { x: 4, y: 1 }] },
    type: "linear", answer: { a: -0.5, b: 3 }, answer_display: "y = −(1/2)x + 3", placeholder: "例：y = (1/3)x + 1",
    prerequisite_skills: ["slopeIntercept", "rate", "coord"], skills_used: ["form", "slopeIntercept", "rate", "coord"],
    hint: "●から●へ、右に何マス・下に何マス？ 切片は y 軸と交わるところ。",
    explanation: "右に 6 進むと 3 下がるので傾きは −1/2。y 軸とは (0, 3) で交わる。y = −(1/2)x + 3 です。" });

  add({ id: "form-standard-5", skill: "form", level: "standard", format: "graph",
    text: "グラフは一次関数の一部です（y 軸は図の外にあります）。直線の式を求めなさい。",
    figure: { type: "graph", x: [1, 6, 1], y: [-1, 9, 1], lines: [line(2, -3)], points: [{ x: 2, y: 1, label: "A", coords: true }, { x: 5, y: 7, label: "B", coords: true }] },
    type: "linear", answer: { a: 2, b: -3 }, placeholder: "例：y = 3x + 1",
    prerequisite_skills: ["rate", "coord", "transpose"], skills_used: ["form", "rate", "coord", "transpose"],
    hint: "切片はグラフから読めないので、傾きを出してから、点A を y = ax + b に代入して b を求めよう（方程式を解く）。",
    explanation: "傾きは (7 − 1) ÷ (5 − 2) = 2。1 = 2 × 2 + b → b = −3。y = 2x − 3 です。" });
  add({ id: "form-application-1", skill: "form", level: "application", format: "word",
    text: "動画配信サービスの料金です。Aプランは月額 800 円で、1 本見るごとに 100 円。Bプランは月額 1400 円で、1 本見るごとに 40 円。1 か月に x 本見たときの料金を y 円とします。",
    type: "steps",
    steps: [
      { id: "s1", skill: "form", text: "Aプランの料金を式で表しなさい。", type: "linear", answer: { a: 100, b: 800 }, placeholder: "例：y = 50x + 300",
        hint: "1 本ごとの料金が x の前、月額がうしろ", explanation: "y = 100x + 800 です。" },
      { id: "s2", skill: "form", text: "Bプランの料金を式で表しなさい。", type: "linear", answer: { a: 40, b: 1400 }, placeholder: "例：y = 50x + 300",
        hint: "同じように考えよう", explanation: "y = 40x + 1400 です。" },
      { id: "s3", skill: "substitution", text: "2 つのプランの料金が同じになるのは何本見たとき？", type: "number", answer: 10,
        hint: "100x + 800 = 40x + 1400 を解く", explanation: "60x = 600 → x = 10 本です。" },
      { id: "s4", skill: "form", text: "1 か月に 15 本見るなら、安いのはどちら？", type: "choice",
        choices: [{ key: "a", label: "Aプラン" }, { key: "b", label: "Bプラン" }, { key: "c", label: "同じ" }],
        answer: "b", hint: "x = 15 をそれぞれの式に入れてくらべよう",
        explanation: "A は 100 × 15 + 800 = 2300 円、B は 40 × 15 + 1400 = 2000 円。Bプランが安いです。" }
    ],
    skills_used: ["form", "substitution"],
    hint: "2 つの式を作り、「＝」でつなぐと同じ料金になる本数がわかります。",
    explanation: "A: y = 100x + 800、B: y = 40x + 1400。10 本で同じ料金、15 本なら B が安い。" });
  add({ id: "form-application-2", skill: "form", level: "application", format: "word",
    text: "長さ 18cm の線香に火をつけると、1 分に 0.6cm ずつ短くなります。火をつけてから x 分後の線香の長さを y cm とします。",
    type: "steps",
    steps: [
      { id: "s1", skill: "form", text: "y を x の式で表しなさい。", type: "linear", answer: { a: -0.6, b: 18 }, placeholder: "例：y = −2x + 10",
        hint: "短くなる → 傾きはマイナス。はじめの長さが切片。", explanation: "y = −0.6x + 18 です。" },
      { id: "s2", skill: "substitution", text: "10 分後の長さは何cm？", type: "number", answer: 12,
        hint: "x = 10 を代入", explanation: "−0.6 × 10 + 18 = 12cm です。" },
      { id: "s3", skill: "substitution", text: "燃えつきる（y = 0 になる）のは何分後？", type: "number", answer: 30,
        hint: "0 = −0.6x + 18 を解く", explanation: "0.6x = 18 → x = 30 分後です。" }
    ],
    prerequisite_skills: ["slopeIntercept", "signed"], skills_used: ["form", "substitution", "signed"],
    hint: "減っていく量も、一次関数で表せます。",
    explanation: "y = −0.6x + 18。10 分後は 12cm、30 分後に燃えつきます。" });

  add({ id: "form-retention-1", skill: "form", level: "retention", evidence_level: "basic", format: "word",
    text: "水が 8L 入った容器に、毎分 2.5L ずつ水を入れます。x 分後の水の量を y L とするとき、y を x の式で表しなさい。",
    type: "linear", answer: { a: 2.5, b: 8 }, placeholder: "例：y = 2x + 1",
    hint: "毎分ふえる量が x の前、はじめに入っている量がうしろ。",
    explanation: "y = 2.5x + 8 です。" });
  add({ id: "form-retention-2", skill: "form", level: "retention", evidence_level: "standard", format: "table",
    text: "ある一次関数について x と y の値を調べたら、下の表のようになりました。この一次関数の式を求めなさい。",
    figure: { type: "table", rows: [{ label: "x", values: [2, 4, 6, 8] }, { label: "y", values: [1, -3, -7, -11] }] },
    type: "linear", answer: { a: -2, b: 5 }, placeholder: "例：y = 2x + 1",
    prerequisite_skills: ["rate", "substitution", "signed"], skills_used: ["form", "rate", "substitution"],
    hint: "表に x = 0 がないので、変化の割合を出してから、1 組の x, y を代入して切片を求めよう。",
    explanation: "x が 2 増えると y は 4 減るので傾きは −2。1 = −2 × 2 + b より b = 5。y = −2x + 5 です。" });
  add({ id: "form-retention-3", skill: "form", level: "retention", evidence_level: "standard", format: "coordinate",
    text: "2点 (−1, −7)、(3, 5) を通る直線の式を求めなさい。",
    type: "linear", answer: { a: 3, b: -4 }, placeholder: "例：y = 2x + 1",
    prerequisite_skills: ["rate", "substitution", "signed"], skills_used: ["form", "rate", "substitution"],
    hint: "傾きを出してから、どちらかの点を代入して切片を求めよう。",
    explanation: "傾きは (5 − (−7)) ÷ (3 − (−1)) = 12 ÷ 4 = 3。5 = 3 × 3 + b より b = −4。y = 3x − 4 です。" });
  add({ id: "form-retention-4", skill: "form", level: "retention", evidence_level: "basic", format: "graph",
    text: "グラフの直線の式を答えなさい。",
    figure: { type: "graph", x: [-1, 3, 1], y: [-5, 5, 1], lines: [line(-4, 2)], points: [{ x: 0, y: 2 }, { x: 1, y: -2 }] },
    type: "linear", answer: { a: -4, b: 2 }, placeholder: "例：y = 2x + 1",
    prerequisite_skills: ["slopeIntercept", "coord"], skills_used: ["form", "slopeIntercept", "coord"],
    hint: "y 軸と交わるところが切片。右に 1 進むと、上下にいくつ？",
    explanation: "切片は 2、右に 1 進むと 4 下がるので傾きは −4。y = −4x + 2 です。" });
  add({ id: "form-retention-5", skill: "form", level: "retention", evidence_level: "basic", format: "word",
    text: "24L 入ったタンクから、1 分に 1.5L ずつ水を出します。x 分後の水の量を y L として、y を x の式で表しなさい。",
    type: "linear", answer: { a: -1.5, b: 24 }, placeholder: "例：y = −2x + 10",
    prerequisite_skills: ["slopeIntercept", "signed"], skills_used: ["form", "slopeIntercept"],
    hint: "減っていく量は、傾きがマイナス。はじめの量が切片。",
    explanation: "y = −1.5x + 24 です。" });

  // =====================================================================
  // 既習：正負の数（signed）  既存：C1
  // =====================================================================
  add({ id: "signed-basic-1", skill: "signed", level: "basic", format: "numberline",
    text: "数直線の点A から、右へ 6 進んだ点が表す数は？",
    figure: { type: "numberline", from: -6, to: 6, marks: [{ x: -4, label: "A" }] },
    type: "number", answer: 2,
    hint: "点A の数を読んで、そこから右へ 6。",
    explanation: "点A は −4。−4 + 6 = 2 です。" });
  add({ id: "signed-basic-2", skill: "signed", level: "basic", format: "expression",
    text: "(−3) × 4 − (−5) を計算しなさい。",
    type: "number", answer: -7,
    hint: "かけ算が先。−(−5) は +5。",
    explanation: "(−3) × 4 = −12、−12 + 5 = −7 です。" });
  add({ id: "signed-retention-1", skill: "signed", level: "retention", evidence_level: "basic", format: "word",
    text: "ある日の最低気温は −6℃、最高気温は 4℃ でした。最高気温と最低気温の差は何℃？",
    type: "number", answer: 10,
    hint: "4 − (−6)",
    explanation: "4 − (−6) = 10℃ です。" });
  add({ id: "signed-retention-2", skill: "signed", level: "retention", evidence_level: "basic", format: "expression",
    text: "−2 − 7 + 3 を計算しなさい。",
    type: "number", answer: -6,
    hint: "左から順に。−2 − 7 はいくつ？",
    explanation: "−2 − 7 = −9、−9 + 3 = −6 です。" });

  // =====================================================================
  // 既習：文字式への代入（algebra）  既存：C2
  // =====================================================================
  add({ id: "algebra-basic-1", skill: "algebra", level: "basic", format: "expression",
    text: "x = 4 のとき、5 − 2x の値は？",
    type: "number", answer: -3,
    hint: "2x は 2 × 4",
    explanation: "5 − 2 × 4 = 5 − 8 = −3 です。" });
  add({ id: "algebra-basic-2", skill: "algebra", level: "basic", format: "table",
    text: "式 3x + 2 の値を表にまとめました。? にあてはまる数は？",
    figure: { type: "table", rows: [{ label: "x", values: [-1, 0, 2] }, { label: "3x + 2", values: [null, 2, 8] }] },
    type: "number", answer: -1,
    hint: "x = −1 を、かっこをつけて代入。",
    explanation: "3 × (−1) + 2 = −1 です。" });
  add({ id: "algebra-retention-1", skill: "algebra", level: "retention", evidence_level: "basic", format: "word",
    text: "1 個 a 円のりんごを 3 個と、150 円のかごを 1 つ買うときの代金は (3a + 150) 円です。a = 120 のとき、代金は何円？",
    type: "number", answer: 510,
    hint: "3 × 120 + 150",
    explanation: "360 + 150 = 510 円です。" });
  add({ id: "algebra-retention-2", skill: "algebra", level: "retention", evidence_level: "basic", format: "expression",
    text: "a = −4、b = 7 のとき、−a + 6b の値は？",
    type: "number", answer: 46, prerequisite_skills: ["signed"], skills_used: ["algebra", "signed"],
    hint: "−a は −(−4)。6b は 6 × 7。",
    explanation: "−(−4) = 4、6 × 7 = 42。4 + 42 = 46 です。" });

  // =====================================================================
  // 既習：比例（proportion）  既存：B2・C3
  // =====================================================================
  add({ id: "proportion-basic-1", skill: "proportion", level: "basic", format: "table",
    text: "y は x に比例しています。表の ? にあてはまる数は？",
    figure: { type: "table", rows: [{ label: "x", values: [1, 2, 3, 4] }, { label: "y", values: [-3, -6, -9, null] }] },
    type: "number", answer: -12,
    hint: "y = ax の a を、表の 1 組から求めよう。",
    explanation: "y = −3x なので、x = 4 のとき y = −12 です。" });
  add({ id: "proportion-retention-1", skill: "proportion", level: "retention", evidence_level: "basic", format: "word",
    text: "針金 5m の重さは 150g です。重さが長さに比例するとき、針金 8m の重さは何g？",
    type: "number", answer: 240,
    hint: "1m あたりの重さを先に出そう。",
    explanation: "1m あたり 150 ÷ 5 = 30g。30 × 8 = 240g です。" });
  add({ id: "proportion-retention-2", skill: "proportion", level: "retention", evidence_level: "basic", format: "graph",
    text: "グラフは比例 y = ax のグラフです。a の値は？",
    figure: { type: "graph", x: [-3, 3, 1], y: [-5, 5, 1], lines: [line(-2, 0)], points: [{ x: 1, y: -2 }] },
    type: "number", answer: -2, prerequisite_skills: ["algebra", "coord"], skills_used: ["proportion", "coord"],
    hint: "●の座標を読んで、y = ax に入れてみよう。",
    explanation: "(1, −2) を通るので −2 = a × 1、a = −2 です。" });

  // =====================================================================
  // 既習：座標（coord）  既存：B1
  // =====================================================================
  add({ id: "coord-basic-1", skill: "coord", level: "basic", format: "graph",
    text: "グラフの点A の座標を答えなさい。",
    figure: { type: "graph", x: [-5, 5, 1], y: [-5, 5, 1], points: [{ x: 3, y: -2, label: "A" }] },
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }],
    answer: { x: 3, y: -2 },
    hint: "原点から、右（左）にいくつ、上（下）にいくつ？",
    explanation: "右に 3、下に 2 なので A(3, −2) です。" });
  add({ id: "coord-basic-2", skill: "coord", level: "basic", format: "expression",
    text: "点 (−4, 1) があるのは、x 軸と y 軸で分けた 4 つの部分のどこ？",
    type: "choice",
    choices: [{ key: "a", label: "右上" }, { key: "b", label: "左上" }, { key: "c", label: "左下" }, { key: "d", label: "右下" }],
    answer: "b", prerequisite_skills: ["signed"],
    hint: "x がマイナスなら左、y がプラスなら上。",
    explanation: "x = −4（左）、y = 1（上）なので左上です。" });
  add({ id: "coord-retention-1", skill: "coord", level: "retention", evidence_level: "basic", format: "word",
    text: "点P(2, 5) を、左へ 6 だけ動かした点の座標を答えなさい。",
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }],
    answer: { x: -4, y: 5 }, skills_used: ["coord", "signed"],
    hint: "左へ動くと x が小さくなる。y は変わらない。",
    explanation: "x は 2 − 6 = −4、y はそのまま 5。(−4, 5) です。" });
  add({ id: "coord-retention-2", skill: "coord", level: "retention", evidence_level: "basic", format: "graph",
    text: "グラフの点C の座標を答えなさい。",
    figure: { type: "graph", x: [-4, 4, 1], y: [-4, 4, 1], points: [{ x: 0, y: -3, label: "C" }] },
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }],
    answer: { x: 0, y: -3 },
    hint: "y 軸の上にある点は、x 座標が 0。",
    explanation: "y 軸上で、下に 3 なので C(0, −3) です。" });

  // =====================================================================
  // 中1 一次方程式
  // study-compass-app の「一次方程式 基本チェック」20問（math-jh1-linear-equations-core-v1）を
  // スキルとレベルに分けて再利用（source に元の ID）。足りないスキルは新しく作った。
  // =====================================================================
  function eq(id, skill, level, src, text, answer, hint, explanation, extra) {
    var q = { id: id, skill: skill, level: level, format: /[人本円歳時速km枚]/.test(text) ? "word" : "expression",
      text: text, type: "number", answer: answer, hint: hint, explanation: explanation };
    if (src) q.source = "study-compass-app:" + src;
    for (var k in (extra || {})) q[k] = extra[k];
    add(q);
  }

  // --- 方程式の意味（新規） ---
  add({ id: "eqMeaning-basic-1", skill: "eqMeaning", level: "basic", format: "expression",
    text: "x = 3 は、方程式 2x + 1 = 7 の解ですか？",
    type: "choice", choices: [{ key: "a", label: "解である" }, { key: "b", label: "解ではない" }], answer: "a",
    hint: "x に 3 を入れて、左辺と右辺が等しくなるか確かめよう。",
    explanation: "2 × 3 + 1 = 7 で、右辺の 7 と等しいので、x = 3 は解です。" });
  add({ id: "eqMeaning-basic-2", skill: "eqMeaning", level: "basic", format: "expression",
    text: "次のうち、方程式 x − 4 = 2 の解はどれ？",
    type: "choice", choices: [{ key: "a", label: "x = 2" }, { key: "b", label: "x = 6" }, { key: "c", label: "x = −2" }, { key: "d", label: "x = 8" }], answer: "b",
    hint: "それぞれ x に入れて、x − 4 が 2 になるものをさがそう。",
    explanation: "6 − 4 = 2 なので、x = 6 が解です。" });
  add({ id: "eqMeaning-basic-3", skill: "eqMeaning", level: "basic", format: "expression",
    text: "方程式 3x − 5 = 10 で、左辺に x = 5 を代入すると、左辺の値はいくつ？",
    type: "number", answer: 10, prerequisite_skills: ["algebra"],
    hint: "3 × 5 − 5 を計算しよう。",
    explanation: "3 × 5 − 5 = 10。右辺と等しいので、x = 5 はこの方程式の解です。" });
  add({ id: "eqMeaning-retention-1", skill: "eqMeaning", level: "retention", evidence_level: "basic", format: "expression",
    text: "−2、0、2 のうち、方程式 9 − x = 11 の解はどれ？",
    type: "choice", choices: [{ key: "a", label: "−2" }, { key: "b", label: "0" }, { key: "c", label: "2" }], answer: "a", prerequisite_skills: ["algebra", "signed"],
    hint: "x に −2 を入れると 9 − (−2)。",
    explanation: "9 − (−2) = 11 なので、x = −2 が解です。" });

  // --- 等式の性質（係数を外す） ---
  eq("eqProperty-basic-1", "eqProperty", "basic", "linear-eq-03", "方程式 3x = 15 を解きましょう。", 5,
    "両辺を 3 で割ります。", "両辺を3で割ると x = 15 ÷ 3 = 5 です。");
  eq("eqProperty-basic-2", "eqProperty", "basic", null, "方程式 −4x = 28 を解きましょう。", -7,
    "両辺を −4 で割ります。符号に注意。", "両辺を −4 で割ると x = 28 ÷ (−4) = −7 です。", { prerequisite_skills: ["signed"] });
  eq("eqProperty-basic-3", "eqProperty", "basic", null, "方程式 6x = −18 を解きましょう。", -3,
    "両辺を 6 で割ります。", "x = −18 ÷ 6 = −3 です。", { prerequisite_skills: ["signed"] });
  eq("eqProperty-retention-1", "eqProperty", "retention", null, "方程式 −9x = −54 を解きましょう。", 6,
    "両辺を −9 で割ると、マイナスどうしでプラスになる。", "x = −54 ÷ (−9) = 6 です。", { evidence_level: "basic", prerequisite_skills: ["signed"] });

  // --- 移項 ---
  eq("transpose-basic-1", "transpose", "basic", "linear-eq-01", "方程式 x + 5 = 12 を解きましょう。", 7,
    "左辺の +5 を、符号を変えて右辺に移します。", "+5を右辺に移項すると x = 12 − 5 = 7 です。", { prerequisite_skills: ["signed", "algebra"] });
  eq("transpose-basic-2", "transpose", "basic", "linear-eq-02", "方程式 x − 4 = 9 を解きましょう。", 13,
    "左辺の −4 を、符号を変えて右辺に移します。", "−4を右辺に移項すると x = 9 + 4 = 13 です。", { prerequisite_skills: ["signed", "algebra"] });
  eq("transpose-basic-3", "transpose", "basic", "linear-eq-04", "方程式 2x + 3 = 11 を解きましょう。", 4,
    "+3 を右辺に移項 → 2x = 8 → 両辺を 2 で割る。", "+3を移項すると 2x = 8。両辺を2で割ると x = 4 です。",
    { prerequisite_skills: ["signed", "algebra", "eqProperty"], skills_used: ["transpose", "eqProperty"] });
  eq("transpose-basic-4", "transpose", "basic", "linear-eq-05", "方程式 5x − 7 = 18 を解きましょう。", 5,
    "−7 を右辺に移項 → 5x = 25 → 両辺を 5 で割る。", "−7を移項すると 5x = 25。両辺を5で割ると x = 5 です。",
    { prerequisite_skills: ["signed", "algebra", "eqProperty"], skills_used: ["transpose", "eqProperty"] });
  eq("transpose-standard-1", "transpose", "standard", "linear-eq-06", "方程式 4x + 9 = 1 を解きましょう。", -2,
    "+9 を右辺に移項すると、右辺は負の数になります。", "+9を移項すると 4x = 1 − 9 = −8。両辺を4で割ると x = −2 です。",
    { prerequisite_skills: ["signed", "eqProperty"], skills_used: ["transpose", "eqProperty", "signed"] });
  eq("transpose-standard-2", "transpose", "standard", "linear-eq-07", "方程式 −2x + 5 = 11 を解きましょう。", -3,
    "+5 を右辺に移項 → −2x = 6 → 両辺を −2 で割る。", "+5を移項すると −2x = 6。両辺を−2で割ると x = −3 です。",
    { prerequisite_skills: ["signed", "eqProperty"], skills_used: ["transpose", "eqProperty", "signed"] });
  eq("transpose-standard-3", "transpose", "standard", "linear-eq-15", "方程式 2x + 5 = 3x − 1 を解きましょう。", 6,
    "x の項を左辺に、数の項を右辺にまとめて移項します。", "移項すると 2x − 3x = −1 − 5、つまり −x = −6 なので x = 6 です。",
    { prerequisite_skills: ["signed", "likeTerms", "eqProperty"], skills_used: ["transpose", "likeTerms", "eqProperty", "signed"] });
  eq("transpose-standard-4", "transpose", "standard", "linear-eq-16", "方程式 5x − 3 = 2x + 12 を解きましょう。", 5,
    "x の項を左辺に、数の項を右辺にまとめます。", "移項すると 5x − 2x = 12 + 3、つまり 3x = 15 なので x = 5 です。",
    { prerequisite_skills: ["signed", "likeTerms", "eqProperty"], skills_used: ["transpose", "likeTerms", "eqProperty"] });
  eq("transpose-retention-1", "transpose", "retention", null, "方程式 8 − x = 3 を解きましょう。", 5,
    "x の項を右辺に、数を左辺に移すと考えやすい。", "8 − 3 = x なので x = 5 です。",
    { evidence_level: "basic", prerequisite_skills: ["signed", "algebra"] });
  eq("transpose-retention-2", "transpose", "retention", null, "方程式 7x − 4 = 3x + 20 を解きましょう。", 6,
    "x の項は左辺、数の項は右辺へ。", "7x − 3x = 20 + 4 → 4x = 24 → x = 6 です。",
    { evidence_level: "standard", prerequisite_skills: ["signed", "likeTerms", "eqProperty"], skills_used: ["transpose", "likeTerms", "eqProperty"] });

  // --- 分配法則（かっこを外す・中1 文字式。新規） ---
  function dist(id, level, text, a, b, hint, explanation, extra) {
    var q = { id: id, skill: "distrib", level: level, format: "expression", text: text, type: "linear", answer: { a: a, b: b },
      placeholder: "例：2x + 6", hint: hint, explanation: explanation };
    for (var k in (extra || {})) q[k] = extra[k];
    add(q);
  }
  dist("distrib-basic-1", "basic", "3(x + 4) のかっこを外しなさい。", 3, 12, "3 × x と 3 × 4。", "3(x + 4) = 3x + 12 です。");
  dist("distrib-basic-2", "basic", "−2(x − 5) のかっこを外しなさい。", -2, 10, "−2 × x と −2 × (−5)。符号に注意。", "−2(x − 5) = −2x + 10 です。");
  dist("distrib-basic-3", "basic", "4(2x − 1) のかっこを外しなさい。", 8, -4, "4 × 2x と 4 × (−1)。", "4(2x − 1) = 8x − 4 です。");
  dist("distrib-retention-1", "retention", "−(3x − 6) のかっこを外しなさい。", -3, 6, "−(…) は、中の符号を全部反対にする。", "−(3x − 6) = −3x + 6 です。", { evidence_level: "basic" });

  // --- かっこのある方程式 ---
  eq("eqParen-basic-1", "eqParen", "basic", "linear-eq-08", "方程式 3(x + 2) = 21 を解きましょう。", 5,
    "まずかっこを開きます。3 × x と 3 × 2。", "かっこを開くと 3x + 6 = 21。+6を移項して 3x = 15、両辺を3で割ると x = 5 です。");
  eq("eqParen-basic-2", "eqParen", "basic", "linear-eq-09", "方程式 2(x − 3) = 10 を解きましょう。", 8,
    "かっこを開きます。2 × x と 2 × (−3)。", "かっこを開くと 2x − 6 = 10。−6を移項して 2x = 16、両辺を2で割ると x = 8 です。");
  eq("eqParen-standard-1", "eqParen", "standard", "linear-eq-10", "方程式 4(x + 1) − 2x = 14 を解きましょう。", 5,
    "かっこを開いて 4x + 4 − 2x = 14 の形に。同じ x の項をまとめる。", "4x + 4 − 2x = 14 → 2x + 4 = 14 → 2x = 10 → x = 5 です。");
  eq("eqParen-standard-2", "eqParen", "standard", null, "方程式 −2(x − 4) = 6 を解きましょう。", 1,
    "−2 をかっこの中に配ると、−2x + 8。", "−2x + 8 = 6 → −2x = −2 → x = 1 です。", { prerequisite_skills: ["distrib", "transpose", "signed"] });
  eq("eqParen-retention-1", "eqParen", "retention", null, "方程式 5(x − 1) = 3x + 7 を解きましょう。", 6,
    "かっこを開いてから、x の項と数の項に分けて移項。", "5x − 5 = 3x + 7 → 2x = 12 → x = 6 です。", { evidence_level: "standard" });

  // --- 分数・小数の方程式 ---
  eq("eqFraction-basic-1", "eqFraction", "basic", "linear-eq-11", "方程式 x/2 + 3 = 7 を解きましょう。", 8,
    "+3 を右辺に移項 → x/2 = 4 → 両辺に 2 をかける。", "+3を移項すると x/2 = 4。両辺に2をかけると x = 8 です。");
  eq("eqFraction-basic-2", "eqFraction", "basic", "linear-eq-12", "方程式 x/4 − 1 = 2 を解きましょう。", 12,
    "−1 を右辺に移項 → x/4 = 3 → 両辺に 4 をかける。", "−1を移項すると x/4 = 3。両辺に4をかけると x = 12 です。");
  eq("eqFraction-standard-1", "eqFraction", "standard", "linear-eq-13", "方程式 0.3x + 1 = 2.5 を解きましょう。", 5,
    "+1 を移項 → 0.3x = 1.5。両辺を 10 倍すると考えやすい。", "0.3x = 1.5。両辺を10倍すると 3x = 15、x = 5 です。");
  eq("eqFraction-standard-2", "eqFraction", "standard", "linear-eq-14", "方程式 0.5x − 2 = 3 を解きましょう。", 10,
    "−2 を移項 → 0.5x = 5 → 両辺を 2 倍。", "0.5x = 5。両辺を2倍すると x = 10 です。");
  eq("eqFraction-retention-1", "eqFraction", "retention", null, "方程式 x/5 + 4 = 6 を解きましょう。", 10,
    "+4 を移項して、x/5 = 2。", "x/5 = 2 → 両辺に5をかけて x = 10 です。", { evidence_level: "basic" });
  eq("eqFraction-retention-2", "eqFraction", "retention", null, "方程式 0.4x + 1.2 = 2 を解きましょう。", 2,
    "+1.2 を移項して 0.4x = 0.8。", "0.4x = 0.8 → 両辺を10倍して 4x = 8 → x = 2 です。", { evidence_level: "standard" });

  // --- 方程式の文章題 ---
  add({ id: "eqWord-basic-1", skill: "eqWord", level: "basic", format: "word",
    text: "ある数 x に 7 を足すと 15 になります。x はいくつ？",
    type: "number", answer: 8,
    hint: "x + 7 = 15 という方程式になる。",
    explanation: "x + 7 = 15 → x = 8 です。" });
  eq("eqWord-standard-1", "eqWord", "standard", "linear-eq-17", "1本80円のペンをx本と、50円の消しゴムを1個買ったら、合計610円でした。ペンは何本買いましたか。", 7,
    "ペン代と消しゴム代を足すと合計になる式：80x + 50 = 610", "80x + 50 = 610 → 80x = 560 → x = 7（本）です。");
  eq("eqWord-standard-2", "eqWord", "standard", "linear-eq-19", "時速60kmで走る車がx時間走った後、さらに30km進んで、合計150km進みました。xを求めましょう。", 2,
    "時速60kmでx時間なら 60x km。60x + 30 = 150", "60x + 30 = 150 → 60x = 120 → x = 2（時間）です。");
  add({ id: "eqWord-application-1", skill: "eqWord", level: "application", format: "word", source: "study-compass-app:linear-eq-18",
    text: "現在の年齢を x 歳とすると、5 年後の年齢を 3 倍した数は 54 になります。",
    type: "steps",
    steps: [
      { id: "s1", skill: "eqWord", text: "この文を方程式にすると、どれ？", type: "choice",
        choices: [{ key: "a", label: "3(x + 5) = 54" }, { key: "b", label: "3x + 5 = 54" }, { key: "c", label: "x + 5 × 3 = 54" }, { key: "d", label: "3(x − 5) = 54" }],
        answer: "a", hint: "5年後の年齢は x + 5。それを3倍する。", explanation: "5年後は x + 5、その3倍なので 3(x + 5) = 54 です。" },
      { id: "s2", skill: "eqParen", text: "方程式を解いて、現在の年齢を求めなさい。", type: "number", answer: 13,
        hint: "かっこを開くと 3x + 15 = 54。", explanation: "3x + 15 = 54 → 3x = 39 → x = 13（歳）です。" }
    ],
    prerequisite_skills: ["eqMeaning", "algebra", "eqParen"], skills_used: ["eqWord", "eqParen"],
    hint: "「何を x にしたか」と「どれとどれが等しいか」を考えて式を作る。",
    explanation: "3(x + 5) = 54 を解いて x = 13。現在 13 歳です。" });
  add({ id: "eqWord-application-2", skill: "eqWord", level: "application", format: "word", source: "study-compass-app:linear-eq-20",
    text: "折り紙を x 人に 4 枚ずつ配ると 3 枚余ります。同じ折り紙を 5 枚ずつ配ると 2 枚足りません。",
    type: "steps",
    steps: [
      { id: "s1", skill: "eqWord", text: "折り紙の総数が等しいことから、方程式を作るとどれ？", type: "choice",
        choices: [{ key: "a", label: "4x + 3 = 5x − 2" }, { key: "b", label: "4x − 3 = 5x + 2" }, { key: "c", label: "4x + 3 = 5x + 2" }, { key: "d", label: "4(x + 3) = 5(x − 2)" }],
        answer: "a", hint: "余る → 配った数より多い（＋）、足りない → 配りたい数より少ない（−）。", explanation: "総数は 4x + 3 とも 5x − 2 とも表せるので、4x + 3 = 5x − 2 です。" },
      { id: "s2", skill: "transpose", text: "方程式を解いて、人数を求めなさい。", type: "number", answer: 5,
        hint: "x の項を右辺、数の項を左辺に集めると 3 + 2 = 5x − 4x。", explanation: "3 + 2 = 5x − 4x → x = 5（人）です。" }
    ],
    prerequisite_skills: ["eqMeaning", "algebra", "transpose"], skills_used: ["eqWord", "transpose"],
    hint: "配り方がちがっても、折り紙の総数は同じ。",
    explanation: "4x + 3 = 5x − 2 を解いて x = 5。人数は 5 人です。" });
  add({ id: "eqWord-retention-1", skill: "eqWord", level: "retention", evidence_level: "standard", format: "word",
    text: "1 個 x 円のパンを 4 個と、200 円のジュースを 1 本買ったら、代金は 680 円でした。パン 1 個の値段は何円？",
    type: "number", answer: 120,
    hint: "4x + 200 = 680 という方程式になる。",
    explanation: "4x + 200 = 680 → 4x = 480 → x = 120（円）です。" });

  // =====================================================================
  // 中2 式の計算（＋ 中1の土台「同類項をまとめる」と、分配法則の文字2つ）
  // study-compass-app の「式の計算 基本チェック」18問（math-jh2-polynomial-calculation）を
  // スキルとレベルに分けて再利用（source に元の ID）。
  // 足したのは、旧アプリになかった 等式の変形・同類項の定着・文字2つの分配法則・整理してから代入 だけ。
  // 答えの形 poly：7x + 2y、−10xy、6x^2 などの文字式（js/logic.js の parsePoly。項の順番・書き方の違いは同じ式とみなす）
  // =====================================================================
  function poly(id, skill, level, src, text, answer, hint, explanation, extra) {
    var q = { id: id, skill: skill, level: level, format: "expression", text: text, type: "poly", answer: answer,
      placeholder: /\^/.test(answer) ? "例：6x^2（2乗は ^2）" : "例：7x + 2y", hint: hint, explanation: explanation };
    if (src) q.source = "study-compass-app:" + src;
    for (var k in (extra || {})) q[k] = extra[k];
    add(q);
  }

  // --- 同類項をまとめる（中1の土台） ---
  poly("likeTerms-basic-1", "likeTerms", "basic", "polynomial-calc-01", "3x + 2x を計算しましょう。", "5x",
    "x の前の数（係数）どうしを足します。", "係数どうしを足すと 3x + 2x = 5x です。");
  poly("likeTerms-basic-2", "likeTerms", "basic", "polynomial-calc-02", "4y − 6y を計算しましょう。", "-2y",
    "y の前の数どうしを引きます。4 − 6 は負の数。", "係数どうしを計算すると 4y − 6y = −2y です。");
  poly("likeTerms-basic-3", "likeTerms", "basic", "polynomial-calc-03", "7a − 3a + a を計算しましょう。", "5a",
    "a は 1a と同じ。7 − 3 + 1 を計算します。", "係数をまとめると 7a − 3a + a = 5a です。");
  add({ id: "likeTerms-basic-4", skill: "likeTerms", level: "basic", format: "expression",
    text: "式 2x − 5y + 3 で、y の係数はいくつ？",
    type: "number", answer: -5,
    hint: "項に分けると 2x、−5y、+3。y の項の数の部分が係数。",
    explanation: "項は 2x、−5y、3 の3つ。y の係数は −5 です（符号もふくめる）。" });
  poly("likeTerms-retention-1", "likeTerms", "retention", null, "−4a + 9 + 6a − 2 を計算しましょう。", "2a+7",
    "a の項どうし、数の項どうしをそれぞれまとめる。", "a の項は −4a + 6a = 2a、数の項は 9 − 2 = 7。2a + 7 です。", { evidence_level: "basic" });
  add({ id: "likeTerms-retention-2", skill: "likeTerms", level: "retention", evidence_level: "basic", format: "expression",
    text: "次のうち、7x と同類項なのはどれ？",
    type: "choice", choices: [{ key: "a", label: "−2x" }, { key: "b", label: "7y" }, { key: "c", label: "7" }, { key: "d", label: "x²" }], answer: "a",
    hint: "文字の部分（と次数）が同じ項が同類項。数の部分は関係ない。",
    explanation: "−2x は文字の部分が x で 7x と同じなので同類項です。7y は文字がちがい、x² は次数がちがいます。" });
  poly("likeTerms-retention-3", "likeTerms", "retention", null, "0.5x + 1.2x − x を計算しましょう。", "0.7x",
    "係数どうし 0.5 + 1.2 − 1 を計算する。", "0.5 + 1.2 − 1 = 0.7 なので 0.7x です。", { evidence_level: "basic" });

  // --- 分配法則（文字2つ） ---
  poly("distrib-basic-4", "distrib", "basic", null, "3(x − 2y) のかっこを外しなさい。", "3x-6y",
    "3 × x と 3 × (−2y)。", "3(x − 2y) = 3x − 6y です。");
  poly("distrib-basic-5", "distrib", "basic", null, "−2(a + 4b) のかっこを外しなさい。", "-2a-8b",
    "−2 × a と −2 × 4b。マイナスをかけると符号が変わる。", "−2(a + 4b) = −2a − 8b です。");
  poly("distrib-retention-2", "distrib", "retention", null, "−(5a − b + 4) のかっこを外しなさい。", "-5a+b-4",
    "−(…) は、中のすべての項の符号を反対にする。3つとも。", "−(5a − b + 4) = −5a + b − 4 です。", { evidence_level: "basic" });

  // --- 多項式の加法・減法 ---
  poly("polyAddSub-basic-1", "polyAddSub", "basic", "polynomial-calc-04", "2x + 3y + 5x − y を計算しましょう。", "7x+2y",
    "x の項どうし、y の項どうしをそれぞれまとめます。", "x の項は 2x + 5x = 7x、y の項は 3y − y = 2y。7x + 2y です。", { usage: "diagnosis" });
  poly("polyAddSub-basic-2", "polyAddSub", "basic", "polynomial-calc-05", "6a − 2b − a + 5b を計算しましょう。", "5a+3b",
    "a は 6 − 1、b は −2 + 5 を計算します。", "a の項は 6a − a = 5a、b の項は −2b + 5b = 3b。5a + 3b です。");
  poly("polyAddSub-basic-3", "polyAddSub", "basic", "polynomial-calc-06", "(3x + 4y) + (2x − y) を計算しましょう。", "5x+3y",
    "かっこの前が + のときは、そのままかっこを外せます。", "かっこを外すと 3x + 4y + 2x − y。まとめると 5x + 3y です。");
  poly("polyAddSub-standard-1", "polyAddSub", "standard", "polynomial-calc-07", "(5x − 3y) − (2x − y) を計算しましょう。", "3x-2y",
    "かっこの前が − のときは、かっこの中の符号がすべて反対になります。", "かっこを外すと 5x − 3y − 2x + y。まとめると 3x − 2y です。", { usage: "diagnosis" });
  poly("polyAddSub-standard-2", "polyAddSub", "standard", "polynomial-calc-08", "(4a − b) − (a − 3b) を計算しましょう。", "3a+2b",
    "2つ目のかっこの符号をすべて反対にして 4a − b − a + 3b。", "かっこを外すと 4a − b − a + 3b。まとめると 3a + 2b です。");

  // --- かっこを含む式の計算 ---
  poly("polyMixed-basic-1", "polyMixed", "basic", "polynomial-calc-09", "3(x − 2y) + 4y を計算しましょう。", "3x-2y",
    "まずかっこを開く：3 × x と 3 × (−2y)。", "かっこを開くと 3x − 6y + 4y。まとめると 3x − 2y です。");
  poly("polyMixed-basic-2", "polyMixed", "basic", "polynomial-calc-10", "2(3x + y) − 5x を計算しましょう。", "x+2y",
    "まずかっこを開く：2 × 3x と 2 × y。", "かっこを開くと 6x + 2y − 5x。まとめると x + 2y です。");
  poly("polyMixed-basic-3", "polyMixed", "basic", "polynomial-calc-11", "4(2a − b) − 3a を計算しましょう。", "5a-4b",
    "まずかっこを開く：4 × 2a と 4 × (−b)。", "かっこを開くと 8a − 4b − 3a。まとめると 5a − 4b です。");
  poly("polyMixed-standard-1", "polyMixed", "standard", "polynomial-calc-12", "5(x − y) − 2(x − 3y) を計算しましょう。", "3x+y",
    "2つのかっこを先に開く：5x − 5y と −2x + 6y。", "かっこを開くと 5x − 5y − 2x + 6y。まとめると 3x + y です。", { usage: "diagnosis" });
  poly("polyMixed-standard-2", "polyMixed", "standard", "polynomial-calc-13", "3(2x − y) − (x − 4y) を計算しましょう。", "5x+y",
    "1つ目は 6x − 3y。2つ目はかっこの前が − なので −x + 4y。", "かっこを開くと 6x − 3y − x + 4y。まとめると 5x + y です。");
  // 整理してから代入（式の値）。代入そのものは既存の「文字式への代入」を使う
  function simplifyThenSubst(id, text, simplified, value, s1hint, s1expl, s2text, s2hint, s2expl, explanation) {
    add({ id: id, skill: "polyMixed", level: "application", format: "expression", text: text, type: "steps",
      steps: [
        { id: "s1", skill: "polyMixed", text: "まず式を簡単にすると？", type: "poly", answer: simplified, placeholder: "例：7x + 2y", hint: s1hint, explanation: s1expl },
        { id: "s2", skill: "algebra", text: s2text, type: "number", answer: value, hint: s2hint, explanation: s2expl }
      ],
      prerequisite_skills: ["distrib", "polyAddSub", "algebra"], skills_used: ["polyMixed", "algebra"],
      hint: "そのまま代入するより、先に式を簡単にすると計算がらく。", explanation: explanation });
  }
  simplifyThenSubst("polyMixed-application-1", "x = 2、y = −3 のとき、3(x + 2y) − (x + 4y) の値を求めます。", "2x+2y", -2,
    "3x + 6y − x − 4y をまとめる。", "3x + 6y − x − 4y = 2x + 2y です。",
    "x = 2、y = −3 を代入すると、値はいくつ？", "2 × 2 + 2 × (−3)。", "4 − 6 = −2 です。",
    "式を簡単にすると 2x + 2y。x = 2、y = −3 を代入して 4 − 6 = −2 です。");
  simplifyThenSubst("polyMixed-application-2", "a = −1、b = 4 のとき、2(3a − b) − (4a − 3b) の値を求めます。", "2a+b", 2,
    "6a − 2b − 4a + 3b をまとめる。", "6a − 2b − 4a + 3b = 2a + b です。",
    "a = −1、b = 4 を代入すると、値はいくつ？", "2 × (−1) + 4。", "−2 + 4 = 2 です。",
    "式を簡単にすると 2a + b。a = −1、b = 4 を代入して −2 + 4 = 2 です。");

  // --- 単項式の乗法・除法 ---
  poly("monoMulDiv-basic-1", "monoMulDiv", "basic", "polynomial-calc-14", "3x × 4y を計算しましょう。", "12xy",
    "数どうし、文字どうしをそれぞれかけます。", "数どうしで 3 × 4 = 12、文字は x と y を並べて 12xy です。");
  poly("monoMulDiv-basic-2", "monoMulDiv", "basic", "polynomial-calc-15", "(−2x) × 5y を計算しましょう。", "-10xy",
    "負の数 × 正の数は負の数。", "数どうしで −2 × 5 = −10、文字は x と y を並べて −10xy です。", { usage: "diagnosis" });
  poly("monoMulDiv-standard-1", "monoMulDiv", "standard", "polynomial-calc-16", "2x × 3x を計算しましょう。", "6x^2",
    "同じ文字どうしのかけ算は 2 乗になります。入力は 6x^2。", "数どうしで 2 × 3 = 6、文字は x × x = x² なので 6x² です。");
  poly("monoMulDiv-standard-2", "monoMulDiv", "standard", "polynomial-calc-17", "8x²y ÷ 4xy を計算しましょう。", "2x",
    "わり算は分数の形にして、共通な部分を約分すると考えやすい。", "数どうしで 8 ÷ 4 = 2、文字は y が消えて x が1個残るので 2x です。");
  add({ id: "monoMulDiv-application-1", skill: "monoMulDiv", level: "application", format: "expression", source: "study-compass-app:polynomial-calc-18",
    text: "6x²y × 2x ÷ 4xy を、前から順に計算します。",
    type: "steps",
    steps: [
      { id: "s1", skill: "monoMulDiv", text: "まず 6x²y × 2x を計算すると？", type: "poly", answer: "12x^3y", placeholder: "例：6x^2（3乗は ^3）",
        hint: "数は 6 × 2、x は x² × x で 3 乗。", explanation: "6 × 2 = 12、x² × x = x³ なので 12x³y です。" },
      { id: "s2", skill: "monoMulDiv", text: "それを 4xy でわると？", type: "poly", answer: "3x^2", placeholder: "例：6x^2",
        hint: "数は 12 ÷ 4、x は 1 個、y は 1 個消える。", explanation: "12 ÷ 4 = 3、x³ ÷ x = x²、y は消えて 3x² です。" }
    ],
    prerequisite_skills: ["signed"], skills_used: ["monoMulDiv"],
    hint: "かけ算とわり算がまざっているときは、前から順に。",
    explanation: "先にかけ算をすると 12x³y。それを 4xy でわると 3x² です。" });

  // --- 等式の変形（旧アプリになし。新規） ---
  function solveY(id, level, text, a, b, hint, explanation, extra) {
    var q = { id: id, skill: "eqTransform", level: level, format: "expression", text: text, type: "linear", answer: { a: a, b: b },
      placeholder: "例：y = −2x + 5", hint: hint, explanation: explanation };
    for (var k in (extra || {})) q[k] = extra[k];
    add(q);
  }
  solveY("eqTransform-basic-1", "basic", "2x + y = 5 を y について解きなさい。", -2, 5,
    "2x を右辺に移項する。符号が変わる。", "2x を移項して y = −2x + 5 です。", { usage: "diagnosis", prerequisite_skills: ["transpose"] });
  poly("eqTransform-basic-2", "eqTransform", "basic", null, "x + 3y = 9 を x について解きなさい（x = の右側を答える）。", "-3y+9",
    "3y を右辺に移項する。", "3y を移項して x = −3y + 9 です。", { prerequisite_skills: ["transpose"], placeholder: "例：x = −2y + 6" });
  solveY("eqTransform-basic-3", "basic", "y − 4x = 1 を y について解きなさい。", 4, 1,
    "−4x を右辺に移項すると +4x。", "−4x を移項して y = 4x + 1 です。", { prerequisite_skills: ["transpose", "signed"] });
  solveY("eqTransform-standard-1", "standard", "3x + 2y = 12 を y について解きなさい。", -1.5, 6,
    "3x を移項すると 2y = −3x + 12。そのあと両辺を 2 でわる。", "2y = −3x + 12 の両辺を 2 でわって y = −3/2 x + 6 です。",
    { prerequisite_skills: ["transpose", "eqProperty"], answer_display: "y = −3/2 x + 6" });
  solveY("eqTransform-standard-2", "standard", "4x − 2y = 6 を y について解きなさい。", 2, -3,
    "4x を移項すると −2y = −4x + 6。両辺を −2 でわると、全部の符号が変わる。", "−2y = −4x + 6 の両辺を −2 でわって y = 2x − 3 です。",
    { prerequisite_skills: ["transpose", "eqProperty", "signed"] });
  add({ id: "eqTransform-application-1", skill: "eqTransform", level: "application", format: "expression",
    text: "連立方程式を、上の式を y について解いてから代入法で解きます。",
    figure: { type: "system", eqs: ["2x + y = 7", "3x − 2y = 0"] }, system: [[2, 1, 7], [3, -2, 0]],
    type: "steps",
    steps: [
      { id: "s1", skill: "eqTransform", text: "上の式を y について解くと？", type: "choice",
        choices: [{ key: "a", label: "y = −2x + 7" }, { key: "b", label: "y = 2x + 7" }, { key: "c", label: "y = −2x − 7" }, { key: "d", label: "y = 7 − x" }],
        answer: "a", hint: "2x を右辺に移項する。", explanation: "2x を移項して y = −2x + 7 です。" },
      { id: "s2", skill: "simSubst", text: "それを下の式に代入して、連立方程式を解きなさい。", type: "pair", fields: [{ key: "x", label: "x =" }, { key: "y", label: "y =" }], answer: { x: 2, y: 3 },
        hint: "3x − 2(−2x + 7) = 0。かっこの前の −2 に注意。", explanation: "3x + 4x − 14 = 0 → 7x = 14 → x = 2、y = −4 + 7 = 3 です。" }
    ],
    prerequisite_skills: ["transpose", "simSubst"], skills_used: ["eqTransform", "simSubst"],
    hint: "「y = …」の形になっていない式も、等式の変形で代入法が使える形にできる。",
    explanation: "上の式を y = −2x + 7 にして代入すると x = 2、y = 3 です。" });
  add({ id: "eqTransform-retention-1", skill: "eqTransform", level: "retention", evidence_level: "basic", format: "expression",
    text: "x − 8y = 5 を x について解いた式はどれ？",
    type: "choice", choices: [{ key: "a", label: "x = 8y + 5" }, { key: "b", label: "x = −8y + 5" }, { key: "c", label: "x = 8y − 5" }, { key: "d", label: "x = 5 − 8y" }], answer: "a",
    prerequisite_skills: ["transpose", "signed"],
    hint: "−8y を右辺に移項すると +8y。",
    explanation: "−8y を移項して x = 8y + 5 です。" });
  solveY("eqTransform-retention-2", "retention", "10x + 5y = 15 を y について解きなさい。", -2, 3,
    "10x を移項して 5y = −10x + 15。両辺を 5 でわる。", "5y = −10x + 15 → y = −2x + 3 です。",
    { evidence_level: "standard", prerequisite_skills: ["transpose", "eqProperty"] });

  // =====================================================================
  // 中2 連立方程式
  // study-compass-app の「連立方程式 基本チェック」25問（math-jh2-simultaneous-equations）を
  // スキルとレベルに分けて再利用（source に元の ID）。
  // 加減法・代入法の一部は、途中の工程（係数をそろえる → 1文字を消す → 一次方程式を解く）を
  // 小問に分けて、どこで止まったかを記録できるようにした。
  // system：検算用に「ax + by = c」の形に直した2つの式（tests/bank.test.js で答えを確かめる）
  // =====================================================================
  var XY = [{ key: "x", label: "x =" }, { key: "y", label: "y =" }];
  function coefText(c, v, first) {
    if (c === 0) return "";
    var abs = Math.abs(c);
    var body = (abs === 1 ? "" : String(abs)) + v;
    if (first) return (c < 0 ? "−" : "") + body;
    return (c < 0 ? " − " : " + ") + body;
  }
  function eqText(e) {
    return coefText(e[0], "x", true) + coefText(e[1], "y", e[0] === 0) + " = " + (e[2] < 0 ? "−" + -e[2] : e[2]);
  }
  // 連立方程式を解く問題。shown：画面に出す式（省略時は system から作る）
  function sim(id, skill, level, src, system, ans, hint, explanation, extra) {
    extra = extra || {};
    var shown = extra.shown || system.map(eqText);
    var q = { id: id, skill: skill, level: level, format: "expression",
      text: "次の連立方程式を解きましょう。", figure: { type: "system", eqs: shown },
      type: "pair", fields: XY, answer: { x: ans[0], y: ans[1] }, system: system, hint: hint, explanation: explanation };
    if (src) q.source = "study-compass-app:" + src;
    for (var k in extra) if (k !== "shown") q[k] = extra[k];
    add(q);
  }
  // 加減法 → 多項式の加法・減法 → 正負の数。正負の数は「多項式の加法・減法」の前提としてたどる
  var ALIGNED = ["polyAddSub", "transpose"];                 // 係数がそろっていて、足す・引くだけで消せる
  var NEEDS_COEF = ["simCoef", "polyAddSub", "transpose"];   // 式を何倍かしてから消す

  // --- 連立方程式の意味（新規） ---
  add({ id: "simMeaning-basic-1", skill: "simMeaning", level: "basic", format: "expression",
    text: "x = 2、y = 1 は、連立方程式 x + y = 3、x − y = 1 の解ですか？",
    type: "choice", choices: [{ key: "a", label: "解である" }, { key: "b", label: "解ではない" }], answer: "a",
    hint: "x と y の値を、2つの式の両方に入れてみよう。",
    explanation: "2 + 1 = 3、2 − 1 = 1 で、2つの式の両方が成り立つので解です。" });
  add({ id: "simMeaning-basic-2", skill: "simMeaning", level: "basic", format: "expression", usage: "diagnosis",
    text: "次のうち、連立方程式 x + y = 5、2x − y = 1 の解はどれ？",
    type: "choice", choices: [{ key: "a", label: "x = 2、y = 3" }, { key: "b", label: "x = 3、y = 2" }, { key: "c", label: "x = 1、y = 4" }, { key: "d", label: "x = 4、y = 1" }], answer: "a",
    hint: "1つ目の式だけでなく、2つ目の式にも合うものをさがそう。",
    explanation: "x = 2、y = 3 なら 2 + 3 = 5、4 − 3 = 1 で両方が成り立ちます。x = 3、y = 2 は2つ目の式が 6 − 2 = 4 になり、成り立ちません。" });
  add({ id: "simMeaning-basic-3", skill: "simMeaning", level: "basic", format: "expression",
    text: "2x + y = 7 で、x = 2 のときの y の値はいくつ？",
    type: "number", answer: 3, prerequisite_skills: ["algebra", "transpose"],
    hint: "x に 2 を入れると 4 + y = 7。",
    explanation: "4 + y = 7 なので y = 3。x = 2、y = 3 はこの式の解の1つです（解はほかにもたくさんある）。" });
  add({ id: "simMeaning-retention-1", skill: "simMeaning", level: "retention", evidence_level: "basic", format: "expression",
    text: "x = 4、y = −2 は、連立方程式 3x + y = 10、x − y = 7 の解ですか？",
    type: "choice", choices: [{ key: "a", label: "解である" }, { key: "b", label: "解ではない" }], answer: "b", prerequisite_skills: ["algebra", "signed"],
    hint: "2つ目の式にも入れてみよう。4 − (−2) は？",
    explanation: "1つ目は 12 − 2 = 10 で成り立ちますが、2つ目は 4 − (−2) = 6 で 7 になりません。両方が成り立たないので解ではありません。" });

  // --- 係数をそろえる（式を何倍かする工程だけ。新規） ---
  add({ id: "simCoef-basic-1", skill: "simCoef", level: "basic", format: "expression",
    text: "式 3x − y = 3 の両辺を 3 倍した式はどれ？",
    type: "choice", choices: [{ key: "a", label: "9x − 3y = 9" }, { key: "b", label: "9x − 3y = 3" }, { key: "c", label: "9x − y = 9" }, { key: "d", label: "3x − 3y = 9" }], answer: "a",
    hint: "左辺のすべての項と、右辺の両方に 3 をかける。",
    explanation: "3x × 3 = 9x、−y × 3 = −3y、右辺も 3 × 3 = 9。9x − 3y = 9 です。右辺にかけ忘れやすいので注意。" });
  add({ id: "simCoef-basic-2", skill: "simCoef", level: "basic", format: "expression",
    text: "連立方程式 2x + 3y = 13、3x − y = 3 で、y の係数の絶対値を 3 にそろえるには、下の式を何倍すればよい？",
    type: "number", answer: 3,
    hint: "下の式の y の係数は −1。何倍すると −3 になる？",
    explanation: "下の式を 3 倍すると 9x − 3y = 9。上の式の +3y と足せば y が消えます。" });
  add({ id: "simCoef-basic-3", skill: "simCoef", level: "basic", format: "expression",
    text: "連立方程式 2x + 3y = 19、3x + 2y = 16 で、x の係数をそろえるにはどうする？",
    type: "choice", choices: [{ key: "a", label: "上の式を 3 倍、下の式を 2 倍する" }, { key: "b", label: "上の式を 2 倍、下の式を 3 倍する" }, { key: "c", label: "上の式だけを 3 倍する" }, { key: "d", label: "下の式だけを 2 倍する" }], answer: "a",
    hint: "x の係数 2 と 3 を、どちらも 6 にするには？",
    explanation: "上を 3 倍すると 6x、下を 2 倍すると 6x。どちらも 6x になってそろいます。" });
  add({ id: "simCoef-standard-1", skill: "simCoef", level: "standard", format: "expression",
    text: "式 x + 2y = 5 の両辺を −2 倍した式はどれ？",
    type: "choice", choices: [{ key: "a", label: "−2x − 4y = −10" }, { key: "b", label: "−2x − 4y = 10" }, { key: "c", label: "−2x + 2y = −10" }, { key: "d", label: "−2x − 4y = 5" }], answer: "a",
    prerequisite_skills: ["eqProperty", "distrib", "signed"],
    hint: "すべての項と右辺に −2 をかける。符号が全部反対になる。",
    explanation: "x × (−2) = −2x、2y × (−2) = −4y、5 × (−2) = −10。−2x − 4y = −10 です。" });
  add({ id: "simCoef-retention-1", skill: "simCoef", level: "retention", evidence_level: "standard", format: "expression",
    text: "連立方程式 4x + 5y = 17、3x − 2y = 7 で y を消すには、どうする？",
    type: "choice", choices: [{ key: "a", label: "上を 2 倍、下を 5 倍して足す" }, { key: "b", label: "上を 2 倍、下を 5 倍して引く" }, { key: "c", label: "上を 5 倍、下を 2 倍して足す" }, { key: "d", label: "上を 4 倍、下を 3 倍して足す" }], answer: "a",
    hint: "y の係数 5 と −2 の絶対値を 10 にそろえる。そのあと、符号がちがうなら足す。",
    explanation: "上を 2 倍で +10y、下を 5 倍で −10y。符号が反対なので、足すと y が消えます。" });

  // --- 加減法 ---
  sim("simElim-basic-1", "simElim", "basic", "simultaneous-eq-01", [[1, 1, 7], [1, -1, 1]], [4, 3],
    "2つの式をそのまま足すと、y が消えます。", "2つの式を足すと 2x = 8 なので x = 4。x + y = 7 に代入すると y = 3 です。", { prerequisite_skills: ALIGNED });
  sim("simElim-basic-2", "simElim", "basic", "simultaneous-eq-02", [[2, 1, 8], [1, -1, 1]], [3, 2],
    "2つの式を足すと、y が消えます。", "2つの式を足すと 3x = 9 なので x = 3。x − y = 1 に代入すると y = 2 です。", { prerequisite_skills: ALIGNED });
  sim("simElim-basic-3", "simElim", "basic", "simultaneous-eq-06", [[2, 1, 9], [1, 1, 5]], [4, 1],
    "y の係数がどちらも 1 なので、上の式から下の式を引いてみよう。", "上の式から下の式を引くと x = 4。x + y = 5 に代入して y = 1 です。", { prerequisite_skills: ALIGNED });
  sim("simElim-standard-1", "simElim", "standard", "simultaneous-eq-07", [[3, 2, 12], [3, -1, 3]], [2, 3],
    "x の係数がどちらも 3 なので、引くと x が消えます。2y − (−y) に注意。", "上の式から下の式を引くと 2y − (−y) = 3y、12 − 3 = 9 なので 3y = 9、y = 3。3x − y = 3 に代入して x = 2 です。", { prerequisite_skills: ALIGNED });
  sim("simElim-standard-2", "simElim", "standard", "simultaneous-eq-12", [[1, 1, 1], [1, -1, 5]], [3, -2],
    "2つの式を足すと y が消えます。答えが負の数になることもあります。", "足すと 2x = 6 なので x = 3。x + y = 1 に代入すると y = −2 です。", { prerequisite_skills: ALIGNED });
  sim("simElim-basic-4", "simElim", "basic", "simultaneous-eq-03", [[3, 2, 16], [1, 1, 6]], [4, 2],
    "下の式を 2 倍すると 2x + 2y = 12 です。", "x + y = 6 を 2 倍して 2x + 2y = 12。3x + 2y = 16 から引くと x = 4、代入して y = 2 です。", { prerequisite_skills: NEEDS_COEF });
  sim("simElim-standard-3", "simElim", "standard", "simultaneous-eq-08", [[1, 3, 10], [2, 1, 10]], [4, 2],
    "上の式を 2 倍すると、x の係数がそろいます。", "上の式を 2 倍して 2x + 6y = 20。下の式を引くと 5y = 10 なので y = 2、代入して x = 4 です。", { prerequisite_skills: NEEDS_COEF });
  sim("simElim-standard-4", "simElim", "standard", "simultaneous-eq-04", [[2, 3, 13], [3, -1, 3]], [2, 3],
    "下の式を 3 倍すると、y の係数をそろえられます。", "3x − y = 3 を 3 倍して 9x − 3y = 9。上の式と足すと 11x = 22 なので x = 2、代入して y = 3 です。",
    { prerequisite_skills: NEEDS_COEF, usage: "diagnosis" });
  // 途中の工程を見る：引くときの符号 → 一次方程式 → 代入して残りを求める
  add({ id: "simElim-standard-5", skill: "simElim", level: "standard", format: "expression", usage: "diagnosis",
    text: "連立方程式を、加減法で順に解きます。",
    figure: { type: "system", eqs: ["2x + 3y = 7", "2x − y = 3"] }, system: [[2, 3, 7], [2, -1, 3]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simElim", text: "上の式から下の式を引くと、どの式になる？", type: "choice",
        choices: [{ key: "a", label: "4y = 4" }, { key: "b", label: "2y = 4" }, { key: "c", label: "4y = 10" }, { key: "d", label: "2y = 10" }],
        answer: "a", hint: "3y − (−y) は 3y + y。", explanation: "3y − (−y) = 4y、7 − 3 = 4 なので 4y = 4。引く式の −y の符号に注意します。" },
      { id: "s2", skill: "eqProperty", text: "y の値は？", type: "number", answer: 1,
        hint: "4y = 4 の両辺を 4 で割る。", explanation: "y = 4 ÷ 4 = 1 です。" },
      { id: "s3", skill: "transpose", text: "y = 1 を 2x + 3y = 7 に代入して、x の値を求めると？", type: "number", answer: 2,
        hint: "2x + 3 = 7。+3 を右辺に移項する。", explanation: "2x + 3 = 7 → 2x = 4 → x = 2 です。" }
    ],
    prerequisite_skills: ALIGNED, skills_used: ["simElim", "eqProperty", "transpose"],
    hint: "x の係数がどちらも 2 なので、引くと x が消える。",
    explanation: "引くと 4y = 4 で y = 1、代入して x = 2。答えは x = 2、y = 1 です。" });
  sim("simElim-standard-6", "simElim", "standard", "simultaneous-eq-13", [[2, -3, 13], [1, 2, -4]], [2, -3],
    "下の式を 2 倍すると、x の係数がそろいます。", "下を 2 倍して 2x + 4y = −8。上の式から引くと −7y = 21 なので y = −3、代入して x = 2 です。", { prerequisite_skills: NEEDS_COEF });
  // 両方の式を何倍かする問題（旧09・旧22）は、「そろえた2つの式」と「解く」に分ける
  function bothScaled(id, src, system, ans, choices, hint, explanation, s1hint, s1expl, s2hint, s2expl) {
    add({ id: id, skill: "simElim", level: "application", format: "expression", source: "study-compass-app:" + src,
      text: "連立方程式を、加減法で解きます。", figure: { type: "system", eqs: system.map(eqText) }, system: system,
      type: "steps",
      steps: [
        { id: "s1", skill: "simCoef", text: "どちらの式も何倍かして係数をそろえます。そろえた2つの式はどれ？", type: "choice",
          choices: choices, answer: "a", hint: s1hint, explanation: s1expl },
        { id: "s2", skill: "simElim", text: "連立方程式を解きなさい。", type: "pair", fields: XY, answer: { x: ans[0], y: ans[1] },
          hint: s2hint, explanation: s2expl }
      ],
      prerequisite_skills: NEEDS_COEF, skills_used: ["simCoef", "simElim"], hint: hint, explanation: explanation });
  }
  bothScaled("simElim-application-1", "simultaneous-eq-09", [[2, 3, 19], [3, 2, 16]], [2, 5],
    [{ key: "a", label: "6x + 9y = 57、6x + 4y = 32" }, { key: "b", label: "6x + 9y = 19、6x + 4y = 16" }, { key: "c", label: "6x + 6y = 57、6x + 6y = 32" }, { key: "d", label: "6x + 9y = 57、6x + 4y = 16" }],
    "どちらの式も何倍かしないと係数がそろいません。", "上を 3 倍して 6x + 9y = 57、下を 2 倍して 6x + 4y = 32。引くと 5y = 25 なので y = 5、代入して x = 2 です。",
    "上を 3 倍、下を 2 倍すると x の係数が 6 でそろう。右辺にもかける。", "上を 3 倍して 6x + 9y = 57、下を 2 倍して 6x + 4y = 32 です。",
    "6x + 9y = 57 から 6x + 4y = 32 を引く。", "引くと 5y = 25 なので y = 5、代入して x = 2 です。");
  bothScaled("simElim-application-2", "simultaneous-eq-22", [[4, 5, 17], [3, -2, 7]], [3, 1],
    [{ key: "a", label: "8x + 10y = 34、15x − 10y = 35" }, { key: "b", label: "8x + 10y = 17、15x − 10y = 7" }, { key: "c", label: "8x + 10y = 34、15x + 10y = 35" }, { key: "d", label: "20x + 25y = 85、6x − 4y = 14" }],
    "y の係数をそろえるには、上を 2 倍、下を 5 倍します。", "上を 2 倍して 8x + 10y = 34、下を 5 倍して 15x − 10y = 35。足すと 23x = 69 なので x = 3、代入して y = 1 です。",
    "y の係数 5 と −2 の絶対値を 10 にそろえる。符号はそのまま。", "上を 2 倍して 8x + 10y = 34、下を 5 倍して 15x − 10y = 35 です。",
    "符号が反対なので、足すと y が消える。", "足すと 23x = 69 なので x = 3、代入して y = 1 です。");
  // 途中の工程を見る：係数をそろえる → 引く → 代入
  add({ id: "simElim-application-3", skill: "simElim", level: "application", format: "expression",
    text: "連立方程式を、加減法で順に解きます。",
    figure: { type: "system", eqs: ["2x + 3y = 12", "x + y = 5"] }, system: [[2, 3, 12], [1, 1, 5]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simCoef", text: "x の係数をそろえるために、下の式を 2 倍した式は？", type: "choice",
        choices: [{ key: "a", label: "2x + 2y = 10" }, { key: "b", label: "2x + 2y = 5" }, { key: "c", label: "2x + y = 10" }, { key: "d", label: "x + y = 10" }],
        answer: "a", hint: "右辺の 5 にも 2 をかける。", explanation: "x + y = 5 の両辺を 2 倍して 2x + 2y = 10 です。" },
      { id: "s2", skill: "simElim", text: "上の式から、2 倍した式を引くと？", type: "choice",
        choices: [{ key: "a", label: "y = 2" }, { key: "b", label: "5y = 22" }, { key: "c", label: "y = 22" }, { key: "d", label: "−y = 2" }],
        answer: "a", hint: "3y − 2y、12 − 10。", explanation: "(2x + 3y) − (2x + 2y) = y、12 − 10 = 2 なので y = 2 です。" },
      { id: "s3", skill: "transpose", text: "y = 2 を x + y = 5 に代入して、x の値を求めると？", type: "number", answer: 3,
        hint: "x + 2 = 5。", explanation: "x + 2 = 5 → x = 3 です。" }
    ],
    prerequisite_skills: NEEDS_COEF, skills_used: ["simCoef", "simElim", "transpose"],
    hint: "まず、どちらかの文字の係数をそろえる。",
    explanation: "下を 2 倍して引くと y = 2、代入して x = 3。答えは x = 3、y = 2 です。" });
  sim("simElim-standard-7", "simElim", "standard", "simultaneous-eq-23", [[5, 3, 21], [2, -1, 4]], [3, 2],
    "下の式を 3 倍すると、y の係数がそろいます。", "下を 3 倍して 6x − 3y = 12。上の式と足すと 11x = 33 なので x = 3、代入して y = 2 です。", { prerequisite_skills: NEEDS_COEF });
  sim("simElim-retention-1", "simElim", "retention", null, [[6, 1, 20], [8, -3, 18]], [3, 2],
    "上の式を 3 倍すると、y の係数の絶対値がそろいます。", "上を 3 倍して 18x + 3y = 60。下の式と足すと 26x = 78 なので x = 3、代入して y = 2 です。", { evidence_level: "standard", prerequisite_skills: NEEDS_COEF });
  sim("simElim-standard-8", "simElim", "standard", "simultaneous-eq-25", [[3, -2, 8], [1, 4, 12]], [4, 2],
    "上の式を 2 倍すると、y の係数の絶対値がそろいます。", "上を 2 倍して 6x − 4y = 16。x + 4y = 12 と足すと 7x = 28 なので x = 4、代入して y = 2 です。", { prerequisite_skills: NEEDS_COEF });
  sim("simElim-retention-2", "simElim", "retention", null, [[9, 2, -6], [6, 1, -6]], [-2, 6],
    "下の式を 2 倍すると、y の係数がそろいます。右辺の −6 も 2 倍する。", "下を 2 倍して 12x + 2y = −12。上の式から引くと −3x = 6 なので x = −2。6x + y = −6 に代入して y = 6 です。", { evidence_level: "standard", prerequisite_skills: NEEDS_COEF });
  sim("simElim-retention-3", "simElim", "retention", null, [[1, 6, 22], [1, -6, -2]], [10, 2],
    "そのまま足すと y が消えます。", "足すと 2x = 20 なので x = 10。x + 6y = 22 に代入して 6y = 12、y = 2 です。", { evidence_level: "basic", prerequisite_skills: ALIGNED });

  // --- 代入法 ---
  sim("simSubst-basic-1", "simSubst", "basic", "simultaneous-eq-10", [[-1, 1, 2], [3, 1, 14]], [3, 5],
    "上の式は y が「y = …」の形。下の式の y にそのまま入れられます。", "y = x + 2 を下の式に代入すると 3x + x + 2 = 14。4x = 12 なので x = 3、y = 5 です。",
    { shown: ["y = x + 2", "3x + y = 14"], prerequisite_skills: ["algebra", "transpose"], usage: "diagnosis" });
  sim("simSubst-basic-2", "simSubst", "basic", null, [[-2, 1, 0], [1, 1, 9]], [3, 6],
    "下の式の y に 2x を入れると x + 2x = 9。", "x + 2x = 9 → 3x = 9 → x = 3。y = 2 × 3 = 6 です。",
    { shown: ["y = 2x", "x + y = 9"], prerequisite_skills: ["algebra", "transpose"] });
  sim("simSubst-standard-1", "simSubst", "standard", "simultaneous-eq-11", [[1, -2, -1], [2, 3, 12]], [3, 2],
    "上の式は x が「x = …」の形。下の式の x に入れるとき、かっこをつける。", "x = 2y − 1 を代入すると 2(2y − 1) + 3y = 12、4y − 2 + 3y = 12。7y = 14 なので y = 2、x = 3 です。",
    { shown: ["x = 2y − 1", "2x + 3y = 12"] });
  sim("simSubst-standard-2", "simSubst", "standard", null, [[1, -3, -2], [2, -1, 6]], [4, 2],
    "下の式の x に (3y − 2) を入れる。2 をかけるのを忘れずに。", "2(3y − 2) − y = 6 → 6y − 4 − y = 6 → 5y = 10 → y = 2。x = 3 × 2 − 2 = 4 です。",
    { shown: ["x = 3y − 2", "2x − y = 6"] });
  // 途中の工程を見る：代入した式（かっこ） → かっこのある方程式 → 残りの文字
  add({ id: "simSubst-application-1", skill: "simSubst", level: "application", format: "expression",
    text: "連立方程式を、代入法で順に解きます。",
    figure: { type: "system", eqs: ["y = 2x − 1", "3x + 2y = 12"] }, system: [[-2, 1, -1], [3, 2, 12]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simSubst", text: "上の式を下の式に代入すると、どの式になる？", type: "choice",
        choices: [{ key: "a", label: "3x + 2(2x − 1) = 12" }, { key: "b", label: "3x + 2x − 1 = 12" }, { key: "c", label: "3(2x − 1) + 2y = 12" }, { key: "d", label: "3x + 4x − 1 = 12" }],
        answer: "a", hint: "y のところに (2x − 1) をかっこごと入れる。", explanation: "2y の y を (2x − 1) にかえて 3x + 2(2x − 1) = 12 です。" },
      { id: "s2", skill: "eqParen", text: "その方程式を解いて、x の値を求めると？", type: "number", answer: 2,
        hint: "かっこを外すと 3x + 4x − 2 = 12。", explanation: "3x + 4x − 2 = 12 → 7x = 14 → x = 2 です。" },
      { id: "s3", skill: "algebra", text: "x = 2 を y = 2x − 1 に代入して、y の値を求めると？", type: "number", answer: 3,
        hint: "2 × 2 − 1。", explanation: "y = 4 − 1 = 3 です。" }
    ],
    prerequisite_skills: ["algebra", "eqParen", "transpose"], skills_used: ["simSubst", "eqParen", "algebra"],
    hint: "「y = …」の式を、もう1つの式の y に入れる。",
    explanation: "代入して 3x + 2(2x − 1) = 12、x = 2。y = 3。答えは x = 2、y = 3 です。" });
  sim("simSubst-retention-1", "simSubst", "retention", null, [[-6, 1, -11], [4, 1, 9]], [2, 1],
    "下の式の y に (6x − 11) を入れる。", "4x + 6x − 11 = 9 → 10x = 20 → x = 2。y = 6 × 2 − 11 = 1 です。",
    { shown: ["y = 6x − 11", "4x + y = 9"], evidence_level: "basic", prerequisite_skills: ["algebra", "transpose"] });

  // --- かっこを含む連立方程式 ---
  sim("simParen-basic-1", "simParen", "basic", "simultaneous-eq-14", [[2, 2, 16], [1, -1, 2]], [5, 3],
    "まず上の式のかっこを外して整理しよう。", "上の式のかっこを外すと 2x + 2y = 16、両辺を 2 で割って x + y = 8。x − y = 2 と足すと 2x = 10 なので x = 5、y = 3 です。",
    { shown: ["2(x + y) = 16", "x − y = 2"] });
  sim("simParen-basic-2", "simParen", "basic", null, [[3, 3, 15], [1, -1, 1]], [3, 2],
    "上の式は両辺を 3 で割ると x + y = 5。", "x + y = 5 と x − y = 1 を足すと 2x = 6、x = 3。y = 2 です。",
    { shown: ["3(x + y) = 15", "x − y = 1"] });
  sim("simParen-standard-1", "simParen", "standard", "simultaneous-eq-15", [[3, 1, 14], [1, 1, 6]], [4, 2],
    "上の式のかっこを外して、x と y の形に整理します。", "かっこを外すと 3x − 3 + y = 11、整理して 3x + y = 14。x + y = 6 を引くと 2x = 8 なので x = 4、y = 2 です。",
    { shown: ["3(x − 1) + y = 11", "x + y = 6"] });
  sim("simParen-retention-1", "simParen", "retention", null, [[1, 2, 8], [1, -1, -1]], [2, 3],
    "上の式を整理すると 2x + 2y − x = 8、つまり x + 2y = 8。", "x + 2y = 8 から x − y = −1 を引くと 3y = 9、y = 3。x = 2 です。",
    { shown: ["2(x + y) − x = 8", "x − y = −1"], evidence_level: "standard" });

  // --- 小数・分数を含む連立方程式 ---
  add({ id: "simFraction-basic-1", skill: "simFraction", level: "basic", format: "expression",
    text: "式 x/2 + y = 4 の両辺を 2 倍して、分数をなくした式はどれ？",
    type: "choice", choices: [{ key: "a", label: "x + 2y = 8" }, { key: "b", label: "x + 2y = 4" }, { key: "c", label: "x + y = 8" }, { key: "d", label: "2x + 2y = 8" }], answer: "a",
    prerequisite_skills: ["eqFraction", "distrib"],
    hint: "x/2 × 2 = x。y にも、右辺にも 2 をかける。",
    explanation: "x/2 × 2 = x、y × 2 = 2y、4 × 2 = 8。x + 2y = 8 です。" });
  sim("simFraction-basic-2", "simFraction", "basic", "simultaneous-eq-16", [[0.5, 1, 5], [1, 1, 7]], [4, 3],
    "分数があるときは、両辺を同じ数倍して分数をなくします。", "上の式を 2 倍して x + 2y = 10。x + y = 7 を引くと y = 3、代入して x = 4 です。",
    { shown: ["x/2 + y = 5", "x + y = 7"] });
  sim("simFraction-standard-1", "simFraction", "standard", "simultaneous-eq-17", [[0.2, 0.3, 1.3], [1, 1, 5]], [2, 3],
    "小数があるときは、両辺を 10 倍して整数にすると計算しやすくなります。", "上の式を 10 倍して 2x + 3y = 13。x + y = 5 を 2 倍した 2x + 2y = 10 を引くと y = 3、代入して x = 2 です。",
    { shown: ["0.2x + 0.3y = 1.3", "x + y = 5"] });
  sim("simFraction-retention-1", "simFraction", "retention", null, [[1 / 6, 1 / 8, 2], [1, 1, 14]], [6, 8],
    "上の式は、分母 6 と 8 の両方で割れる 24 をかける。", "上を 24 倍して 4x + 3y = 48。x + y = 14 を 3 倍した 3x + 3y = 42 を引くと x = 6、y = 8 です。",
    { shown: ["x/6 + y/8 = 2", "x + y = 14"], evidence_level: "standard" });

  // --- 連立方程式の文章題 ---
  function word(id, level, src, text, fields, system, ans, hint, explanation, extra) {
    var q = { id: id, skill: "simWord", level: level, format: "word", text: text, type: "pair", fields: fields,
      answer: { x: ans[0], y: ans[1] }, system: system, hint: hint, explanation: explanation };
    if (src) q.source = "study-compass-app:" + src;
    for (var k in (extra || {})) q[k] = extra[k];
    add(q);
  }
  word("simWord-basic-1", "basic", "simultaneous-eq-21", "大きい数と小さい数があります。2つの数の和は 23、差は 7 です。大きい数を x、小さい数を y として、それぞれを求めましょう。",
    [{ key: "x", label: "大きい数 x" }, { key: "y", label: "小さい数 y" }], [[1, 1, 23], [1, -1, 7]], [15, 8],
    "和と差から、そのまま式を2本作れます：x + y = 23、x − y = 7", "x + y = 23、x − y = 7。2つを足すと 2x = 30 なので x = 15、代入して y = 8 です。", { usage: "diagnosis" });
  word("simWord-standard-1", "standard", "simultaneous-eq-18", "1個150円のりんごと1個90円のみかんを合わせて8個買ったところ、代金は900円でした。りんごを x 個、みかんを y 個として、それぞれの個数を求めましょう。",
    [{ key: "x", label: "りんご x（個）" }, { key: "y", label: "みかん y（個）" }], [[1, 1, 8], [150, 90, 900]], [3, 5],
    "個数の関係と、代金の関係で式を2つ作ります。", "個数から x + y = 8、代金から 150x + 90y = 900。上を 90 倍した 90x + 90y = 720 を引くと 60x = 180 なので x = 3、y = 5 です。");
  word("simWord-standard-2", "standard", "simultaneous-eq-19", "ある施設に大人と子どもが合わせて12人入場し、入場料の合計は4600円でした。大人1人500円、子ども1人300円のとき、大人を x 人、子どもを y 人として、それぞれの人数を求めましょう。",
    [{ key: "x", label: "大人 x（人）" }, { key: "y", label: "子ども y（人）" }], [[1, 1, 12], [500, 300, 4600]], [5, 7],
    "人数の関係と、入場料の関係で式を2つ作ります。", "人数から x + y = 12、入場料から 500x + 300y = 4600。上を 300 倍した 300x + 300y = 3600 を引くと 200x = 1000 なので x = 5、y = 7 です。");
  // 文章題は「式を立てる」と「解く」を小問に分ける（立式で止まったのか、解く途中で止まったのか）
  add({ id: "simWord-application-1", skill: "simWord", level: "application", format: "word", source: "study-compass-app:simultaneous-eq-05",
    text: "120円のノートと80円のペンを合わせて10個買い、代金は960円でした。ノートを x 個、ペンを y 個とします。",
    system: [[1, 1, 10], [120, 80, 960]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simWord", text: "個数と代金の関係から、連立方程式を作るとどれ？", type: "choice",
        choices: [{ key: "a", label: "x + y = 10、120x + 80y = 960" }, { key: "b", label: "x + y = 960、120x + 80y = 10" }, { key: "c", label: "x + y = 10、80x + 120y = 960" }, { key: "d", label: "x − y = 10、120x + 80y = 960" }],
        answer: "a", hint: "個数の合計と、代金の合計で1本ずつ。", explanation: "個数から x + y = 10、代金から 120x + 80y = 960 です。" },
      { id: "s2", skill: "simElim", text: "連立方程式を解いて、それぞれの個数を求めなさい。", type: "pair",
        fields: [{ key: "x", label: "ノート x（個）" }, { key: "y", label: "ペン y（個）" }], answer: { x: 4, y: 6 },
        hint: "代金の式を 40 で割ると 3x + 2y = 24。x + y = 10 を 2 倍して引く。", explanation: "3x + 2y = 24 から 2x + 2y = 20 を引くと x = 4、y = 6 です。" }
    ],
    prerequisite_skills: ["simMeaning", "eqWord", "simElim"], skills_used: ["simWord", "simElim"],
    hint: "まず「何と何が等しいか」を2つ見つけて、式を2本作る。",
    explanation: "x + y = 10、120x + 80y = 960 を解いて x = 4、y = 6。ノート 4 個、ペン 6 本です。" });
  add({ id: "simWord-application-2", skill: "simWord", level: "application", format: "word", source: "study-compass-app:simultaneous-eq-20",
    text: "ある人が時速4kmで歩いた時間を x 時間、時速8kmで走った時間を y 時間とします。合わせて2時間で12km進みました。",
    system: [[1, 1, 2], [4, 8, 12]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simWord", text: "時間と道のりの関係から、連立方程式を作るとどれ？", type: "choice",
        choices: [{ key: "a", label: "x + y = 2、4x + 8y = 12" }, { key: "b", label: "x + y = 12、4x + 8y = 2" }, { key: "c", label: "x + y = 2、8x + 4y = 12" }, { key: "d", label: "4x + y = 2、x + 8y = 12" }],
        answer: "a", hint: "道のり ＝ 速さ × 時間。", explanation: "時間から x + y = 2、道のりから 4x + 8y = 12 です。" },
      { id: "s2", skill: "simElim", text: "連立方程式を解いて、それぞれの時間を求めなさい。", type: "pair",
        fields: [{ key: "x", label: "歩いた x（時間）" }, { key: "y", label: "走った y（時間）" }], answer: { x: 1, y: 1 },
        hint: "上の式を 4 倍して引く。", explanation: "4x + 4y = 8 を引くと 4y = 4 なので y = 1、x = 1 です。" }
    ],
    prerequisite_skills: ["simMeaning", "eqWord", "simElim"], skills_used: ["simWord", "simElim"],
    hint: "時間の合計と、道のりの合計で式を2本作る。",
    explanation: "x + y = 2、4x + 8y = 12 を解いて x = 1、y = 1。歩いた時間も走った時間も1時間です。" });
  word("simWord-retention-1", "retention", "simultaneous-eq-24", "ある店で品物Aと品物Bを合わせて30個仕入れました。Aは1個200円、Bは1個350円で、仕入れの合計は8250円でした。Aを x 個、Bを y 個として、それぞれの個数を求めましょう。",
    [{ key: "x", label: "A x（個）" }, { key: "y", label: "B y（個）" }], [[1, 1, 30], [200, 350, 8250]], [15, 15],
    "個数の関係と、仕入れ額の関係で式を2つ作ります。", "個数から x + y = 30、金額から 200x + 350y = 8250。上を 200 倍した 200x + 200y = 6000 を引くと 150y = 2250 なので y = 15、x = 15 です。",
    { evidence_level: "standard" });

  // --- 2直線の交点（一次関数と連立方程式のかけ橋。新規） ---
  add({ id: "simGraph-basic-1", skill: "simGraph", level: "basic", format: "graph",
    text: "グラフの2直線の交点P の座標を答えなさい。",
    figure: { type: "graph", x: [-1, 4, 1], y: [-1, 6, 1], lines: [line(1, 2), line(-2, 5)], points: [{ x: 1, y: 3, label: "P" }] },
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 1, y: 3 },
    lines: [[1, 2], [-2, 5]], prerequisite_skills: ["coord"], skills_used: ["simGraph", "coord"],
    hint: "2本の直線が交わっている点を、x 軸と y 軸の目もりで読む。",
    explanation: "交点P は右に 1、上に 3 なので (1, 3) です。この座標は、2直線の式 y = x + 2、y = −2x + 5 の両方をみたします。" });
  add({ id: "simGraph-basic-2", skill: "simGraph", level: "basic", format: "expression",
    text: "2直線 y = x + 1 と y = −x + 5 の交点の座標は、次のどれと同じ？",
    type: "choice", choices: [{ key: "a", label: "連立方程式 y = x + 1、y = −x + 5 の解" }, { key: "b", label: "y = x + 1 の切片" }, { key: "c", label: "2本の直線の傾きの和" }, { key: "d", label: "x + 1 = 0 の解" }], answer: "a",
    prerequisite_skills: ["simMeaning", "coord"], skills_used: ["simGraph", "simMeaning"],
    hint: "交点は、どちらの直線の上にもある点。",
    explanation: "交点は2本の直線の両方の上にある点なので、その座標は2つの式を両方みたす ＝ 連立方程式の解です。" });
  add({ id: "simGraph-standard-1", skill: "simGraph", level: "standard", format: "expression",
    text: "2直線 y = 2x − 1 と y = −x + 5 の交点の座標を、計算で求めなさい。",
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 2, y: 3 },
    lines: [[2, -1], [-1, 5]], prerequisite_skills: ["simSubst", "transpose"], skills_used: ["simGraph", "simSubst", "transpose"],
    hint: "2つの式を連立方程式として解く。y が同じなので 2x − 1 = −x + 5。",
    explanation: "2x − 1 = −x + 5 → 3x = 6 → x = 2。y = 2 × 2 − 1 = 3。交点は (2, 3) です。" });
  add({ id: "simGraph-standard-2", skill: "simGraph", level: "standard", format: "graph",
    text: "直線ℓ：y = x + 1、直線m：y = −x + 4 です。グラフでは交点の座標を正確に読みとれません。2つの式を連立方程式として解いて、交点の座標を求めなさい。",
    figure: { type: "graph", x: [-1, 5, 1], y: [-1, 5, 1], lines: [line(1, 1), line(-1, 4)] },
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 1.5, y: 2.5 },
    lines: [[1, 1], [-1, 4]], prerequisite_skills: ["simElim", "coord"], skills_used: ["simGraph", "simElim"],
    hint: "2つの式を足すと x が消える：2y = 5。分数や小数で答えてもよい。",
    explanation: "足すと 2y = 5 なので y = 5/2（2.5）。x = y − 1 = 3/2（1.5）。交点は (3/2, 5/2) です。" });
  // グラフ → 式 → 連立方程式 → 交点（どこで止まったかで、グラフ側／連立方程式側のどちらに戻るかが分かる）
  add({ id: "simGraph-application-1", skill: "simGraph", level: "application", format: "graph",
    text: "グラフの直線ℓ と直線m の交点の座標を、順に求めます。",
    figure: { type: "graph", x: [-2, 4, 1], y: [-2, 4, 1], lines: [line(1, -1), line(-1, 2)], points: [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 2 }, { x: 2, y: 0 }] },
    type: "steps",
    steps: [
      { id: "s1", skill: "form", text: "グラフから読みとった、直線ℓ（右上がり）と直線m（右下がり）の式の組はどれ？", type: "choice",
        choices: [{ key: "a", label: "ℓ：y = x − 1、m：y = −x + 2" }, { key: "b", label: "ℓ：y = x + 1、m：y = −x + 2" }, { key: "c", label: "ℓ：y = −x − 1、m：y = x + 2" }, { key: "d", label: "ℓ：y = x − 1、m：y = −2x + 2" }],
        answer: "a", hint: "切片（y 軸と交わる点）と、右に1進むと上下にいくつ動くかを読む。", explanation: "ℓ は (0, −1) を通り傾き 1 で y = x − 1、m は (0, 2) を通り傾き −1 で y = −x + 2 です。" },
      { id: "s2", skill: "simElim", text: "2つの式を連立方程式として解くと、x の値は？", type: "number", answer: 1.5,
        hint: "x − 1 = −x + 2。分数や小数で答えてもよい。", explanation: "x − 1 = −x + 2 → 2x = 3 → x = 3/2（1.5）です。" },
      { id: "s3", skill: "simGraph", text: "交点の座標は？", type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 1.5, y: 0.5 },
        hint: "x = 3/2 を y = x − 1 に代入する。", explanation: "y = 3/2 − 1 = 1/2。交点は (3/2, 1/2) です。" }
    ],
    lines: [[1, -1], [-1, 2]], prerequisite_skills: ["form", "simElim", "coord"], skills_used: ["form", "simElim", "simGraph"],
    hint: "グラフから式を読む → 連立方程式を解く → 交点の座標、の順に。",
    explanation: "ℓ：y = x − 1、m：y = −x + 2。連立方程式を解いて x = 3/2、y = 1/2。交点は (3/2, 1/2) です。" });
  add({ id: "simGraph-retention-1", skill: "simGraph", level: "retention", evidence_level: "standard", format: "expression",
    text: "2直線 y = 6x − 9 と y = x + 11 の交点の座標を求めなさい。",
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 4, y: 15 },
    lines: [[6, -9], [1, 11]], prerequisite_skills: ["simSubst"], skills_used: ["simGraph", "simSubst"],
    hint: "6x − 9 = x + 11 を解く。",
    explanation: "6x − 9 = x + 11 → 5x = 20 → x = 4。y = 4 + 11 = 15。交点は (4, 15) です。" });

  // =====================================================================
  // 連立方程式の補強（実際に不足が出たところ）
  //   2直線の交点の基礎・各スキルの定着・文章題の基礎・連立方程式の意味の標準
  //   定着は、数字だけ変えた問題にならないよう、形（選ぶ・表・整理だけ・立式だけ・逆に求める）を変えた
  // =====================================================================
  var XYC = [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }];

  // --- 2直線の交点：基礎（グラフで読む → 連立方程式の解として答える／連立方程式の解 → 交点） ---
  add({ id: "simGraph-basic-3", skill: "simGraph", level: "basic", format: "graph",
    text: "グラフの2直線の交点Q の座標を答えなさい。",
    figure: { type: "graph", x: [-4, 2, 1], y: [-3, 4, 1], lines: [line(1, 3), line(-1, -1)], points: [{ x: -2, y: 1, label: "Q" }] },
    type: "pair", fields: XYC, answer: { x: -2, y: 1 },
    lines: [[1, 3], [-1, -1]], prerequisite_skills: ["coord", "signed"], skills_used: ["simGraph", "coord"],
    hint: "交点は原点から左にいくつ、上にいくつ？ 左は x がマイナス。",
    explanation: "交点Q は左に 2、上に 1 なので (−2, 1) です。" });
  add({ id: "simGraph-basic-4", skill: "simGraph", level: "basic", format: "graph",
    text: "直線ℓ：y = x − 1 と直線m：y = −2x + 5 のグラフです。交点P の座標は (2, 1) と読めます。では、連立方程式 y = x − 1、y = −2x + 5 の解は？",
    figure: { type: "graph", x: [-1, 4, 1], y: [-2, 5, 1], lines: [line(1, -1), line(-2, 5)], points: [{ x: 2, y: 1, label: "P", coords: true }] },
    type: "pair", fields: XY, answer: { x: 2, y: 1 },
    lines: [[1, -1], [-2, 5]], prerequisite_skills: ["simMeaning", "coord"], skills_used: ["simGraph", "simMeaning"],
    hint: "交点は、2本の直線の両方の上にある点。",
    explanation: "交点の座標 (2, 1) は2つの式の両方をみたすので、連立方程式の解は x = 2、y = 1 です。計算しなくてもグラフから読めます。" });
  add({ id: "simGraph-basic-5", skill: "simGraph", level: "basic", format: "expression",
    text: "連立方程式 x + y = 4、x − y = 2 の解は x = 3、y = 1 です。この2つの式を変形した2直線 y = −x + 4 と y = x − 2 の交点の座標は？",
    type: "pair", fields: XYC, answer: { x: 3, y: 1 },
    lines: [[-1, 4], [1, -2]], prerequisite_skills: ["simMeaning", "coord"], skills_used: ["simGraph", "simMeaning"],
    hint: "連立方程式の解 ＝ 2直線の交点の座標。",
    explanation: "連立方程式の解 x = 3、y = 1 が、そのまま交点の座標 (3, 1) です。" });

  // --- 2直線の交点：定着 ---
  add({ id: "simGraph-retention-2", skill: "simGraph", level: "retention", evidence_level: "basic", format: "expression",
    text: "2直線 y = 6x + 7 と y = −x + 14 の交点の x 座標を求めるには、どの方程式を解けばよい？",
    type: "choice", choices: [{ key: "a", label: "6x + 7 = −x + 14" }, { key: "b", label: "6x + 7 = 0" }, { key: "c", label: "−x + 14 = 0" }, { key: "d", label: "6x + 7 + (−x + 14) = 0" }], answer: "a",
    prerequisite_skills: ["simMeaning", "simSubst"], skills_used: ["simGraph", "simSubst"],
    hint: "交点では、2つの直線の y が同じになる。",
    explanation: "交点では y が等しいので 6x + 7 = −x + 14。これを解くと x = 1 です。「= 0」は x 軸との交点を求める式です。" });
  add({ id: "simGraph-retention-3", skill: "simGraph", level: "retention", evidence_level: "standard", format: "expression",
    text: "2直線 y = ax + 1 と y = −x + 19 の交点の x 座標が 6 のとき、a の値は？",
    type: "number", answer: 2,
    prerequisite_skills: ["simMeaning", "transpose"], skills_used: ["simGraph", "transpose"],
    hint: "まず、わかっている方の直線 y = −x + 19 で、交点の y 座標を求める。",
    explanation: "x = 6 のとき y = −6 + 19 = 13。交点 (6, 13) は y = ax + 1 の上にもあるので 13 = 6a + 1、a = 2 です。" });

  // --- 連立方程式の意味：標準（「2つの式を同時にみたす」を使う） ---
  add({ id: "simMeaning-standard-1", skill: "simMeaning", level: "standard", format: "expression",
    text: "次の4つの組のうち、x + y = 6 と 2x − y = 3 の両方を同時にみたすのはどれ？",
    type: "choice", choices: [{ key: "a", label: "x = 1、y = 5" }, { key: "b", label: "x = 3、y = 3" }, { key: "c", label: "x = 2、y = 1" }, { key: "d", label: "x = 4、y = 2" }], answer: "b",
    prerequisite_skills: ["algebra", "eqMeaning"],
    hint: "1つの式だけに合う組もまざっている。両方に入れて確かめよう。",
    explanation: "x = 3、y = 3 は 3 + 3 = 6、6 − 3 = 3 で両方をみたします。(1, 5) と (4, 2) は1つ目だけ、(2, 1) は2つ目だけをみたします。" });
  add({ id: "simMeaning-standard-2", skill: "simMeaning", level: "standard", format: "expression",
    text: "x = 3、y = b は、連立方程式 2x + y = 8、ax − y = 4 の解です。a の値は？",
    type: "number", answer: 2,
    prerequisite_skills: ["algebra", "transpose"], skills_used: ["simMeaning", "transpose"],
    hint: "解は両方の式をみたす。まず1つ目の式に x = 3 を入れて b を求める。",
    explanation: "1つ目の式から 6 + b = 8、b = 2。x = 3、y = 2 を2つ目の式に入れると 3a − 2 = 4、a = 2 です。" });
  add({ id: "simMeaning-standard-3", skill: "simMeaning", level: "standard", format: "expression",
    text: "連立方程式 ax + by = 7、bx + ay = 8 の解が x = 2、y = 1 のとき、a と b の値を求めなさい。",
    type: "pair", fields: [{ key: "a", label: "a =" }, { key: "b", label: "b =" }], answer: { a: 2, b: 3 },
    prerequisite_skills: ["algebra", "simElim"], skills_used: ["simMeaning", "simElim"],
    hint: "解を2つの式に入れると、a と b の連立方程式になる：2a + b = 7、2b + a = 8。",
    explanation: "x = 2、y = 1 を入れると 2a + b = 7、a + 2b = 8。これを解いて a = 2、b = 3 です。" });

  // --- 連立方程式の意味：定着 ---
  add({ id: "simMeaning-retention-2", skill: "simMeaning", level: "retention", evidence_level: "basic", format: "word",
    text: "2つの数 x、y は、和が 20、差が 6 です（x の方が大きい）。この2つの条件を両方みたす組はどれ？",
    type: "choice", choices: [{ key: "a", label: "x = 13、y = 7" }, { key: "b", label: "x = 12、y = 8" }, { key: "c", label: "x = 16、y = 10" }, { key: "d", label: "x = 11、y = 9" }], answer: "a",
    prerequisite_skills: ["algebra"],
    hint: "和が 20 になる組と、差が 6 になる組の、両方にあてはまるもの。",
    explanation: "13 + 7 = 20、13 − 7 = 6 で両方をみたします。(16, 10) は差だけ、(12, 8) と (11, 9) は和だけです。" });
  add({ id: "simMeaning-retention-3", skill: "simMeaning", level: "retention", evidence_level: "standard", format: "table",
    text: "表は、x + y = 15 をみたす組と、x − y = 3 をみたす組です。両方の式を同時にみたす組を答えなさい。",
    figure: { type: "table", rows: [{ label: "x", values: [6, 7, 8, 9, 10] }, { label: "x + y = 15 の y", values: [9, 8, 7, 6, 5] }, { label: "x − y = 3 の y", values: [3, 4, 5, 6, 7] }] },
    type: "pair", fields: XY, answer: { x: 9, y: 6 }, system: [[1, 1, 15], [1, -1, 3]],
    prerequisite_skills: ["algebra", "eqMeaning"],
    hint: "同じ x のところで、2つの式の y がそろう列をさがす。",
    explanation: "x = 9 のとき、どちらの式でも y = 6。だから x = 9、y = 6 が連立方程式の解です。" });

  // --- 係数をそろえる：定着 ---
  add({ id: "simCoef-retention-2", skill: "simCoef", level: "retention", evidence_level: "basic", format: "expression",
    text: "連立方程式 7x + 3y = 1、2x − 6y = 8 で y を消すには、どうする？",
    type: "choice", choices: [{ key: "a", label: "上の式を 2 倍して足す" }, { key: "b", label: "上の式を 2 倍して引く" }, { key: "c", label: "下の式を 2 倍して足す" }, { key: "d", label: "下の式を 3 倍して足す" }], answer: "a",
    hint: "y の係数は 3 と −6。上の式だけ何倍かすればそろう。",
    explanation: "上を 2 倍すると 14x + 6y = 2。下の −6y と符号が反対なので、足すと y が消えます。" });
  add({ id: "simCoef-retention-3", skill: "simCoef", level: "retention", evidence_level: "standard", format: "expression",
    text: "式 −3x + 4y = −2 の両辺を −2 倍した式はどれ？",
    type: "choice", choices: [{ key: "a", label: "6x − 8y = 4" }, { key: "b", label: "6x − 8y = −4" }, { key: "c", label: "6x + 8y = 4" }, { key: "d", label: "−6x + 8y = 4" }], answer: "a",
    prerequisite_skills: ["eqProperty", "distrib", "signed"],
    hint: "マイナスをかけると、すべての項の符号が反対になる。右辺も。",
    explanation: "−3x × (−2) = 6x、4y × (−2) = −8y、−2 × (−2) = 4。6x − 8y = 4 です。" });

  // --- 代入法：定着 ---
  sim("simSubst-retention-2", "simSubst", "retention", null, [[1, 2, 5], [3, 4, 11]], [1, 2],
    "下の式の x に (5 − 2y) をかっこごと入れる。", "3(5 − 2y) + 4y = 11 → 15 − 6y + 4y = 11 → −2y = −4 → y = 2。x = 5 − 4 = 1 です。",
    { shown: ["x = 5 − 2y", "3x + 4y = 11"], evidence_level: "standard" });
  add({ id: "simSubst-retention-3", skill: "simSubst", level: "retention", evidence_level: "basic", format: "expression",
    text: "連立方程式 y = 4x、x + y = 15 を代入法で解きます。最初にできる一次方程式はどれ？",
    type: "choice", choices: [{ key: "a", label: "x + 4x = 15" }, { key: "b", label: "4x + y = 15" }, { key: "c", label: "x + 4 = 15" }, { key: "d", label: "y + 4x = 15" }], answer: "a",
    prerequisite_skills: ["algebra"],
    hint: "x + y = 15 の y を、4x に置きかえる。",
    explanation: "y に 4x を入れて x + 4x = 15。5x = 15 なので x = 3、y = 12 です。" });

  // --- かっこを含む連立方程式：定着 ---
  add({ id: "simParen-retention-2", skill: "simParen", level: "retention", evidence_level: "basic", format: "expression",
    text: "式 4(x − y) + 3y = 9 を整理すると、どの式になる？",
    type: "choice", choices: [{ key: "a", label: "4x − y = 9" }, { key: "b", label: "4x − 7y = 9" }, { key: "c", label: "4x + 7y = 9" }, { key: "d", label: "4x − y = 36" }], answer: "a",
    prerequisite_skills: ["polyMixed", "distrib"],
    hint: "4(x − y) = 4x − 4y。そのあと −4y + 3y をまとめる。",
    explanation: "4x − 4y + 3y = 9 なので 4x − y = 9 です。" });
  sim("simParen-retention-3", "simParen", "retention", null, [[3, -2, 11], [1, 1, 7]], [5, 2],
    "上の式のかっこを外すと 5x − 2x − 2y = 11、整理して 3x − 2y = 11。", "3x − 2y = 11 と、x + y = 7 を 2 倍した 2x + 2y = 14 を足すと 5x = 25、x = 5。y = 2 です。",
    { shown: ["5x − 2(x + y) = 11", "x + y = 7"], evidence_level: "standard" });

  // --- 小数・分数を含む連立方程式：定着 ---
  add({ id: "simFraction-retention-2", skill: "simFraction", level: "retention", evidence_level: "basic", format: "expression",
    text: "式 0.3x − 0.5y = 1.1 の両辺を 10 倍した式はどれ？",
    type: "choice", choices: [{ key: "a", label: "3x − 5y = 11" }, { key: "b", label: "3x − 5y = 1.1" }, { key: "c", label: "3x − 0.5y = 11" }, { key: "d", label: "30x − 50y = 110" }], answer: "a",
    prerequisite_skills: ["eqFraction", "distrib"],
    hint: "左辺のすべての項と右辺に 10 をかける。",
    explanation: "0.3x × 10 = 3x、0.5y × 10 = 5y、1.1 × 10 = 11。3x − 5y = 11 です。" });
  sim("simFraction-retention-3", "simFraction", "retention", null, [[0.1, 0.4, 1.4], [1, -1, 4]], [6, 2],
    "上の式を 10 倍すると x + 4y = 14。", "x + 4y = 14 から x − y = 4 を引くと 5y = 10、y = 2。x = 6 です。",
    { shown: ["0.1x + 0.4y = 1.4", "x − y = 4"], evidence_level: "standard" });

  // --- 連立方程式の文章題：基礎（「式を立てる」と「解く」を小問に分ける） ---
  add({ id: "simWord-basic-2", skill: "simWord", level: "basic", format: "word",
    text: "大人と子どもが合わせて 7 人います。子どもは大人より 3 人多いです。大人を x 人、子どもを y 人とします。",
    system: [[1, 1, 7], [-1, 1, 3]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simWord", text: "連立方程式を作るとどれ？", type: "choice",
        choices: [{ key: "a", label: "x + y = 7、y − x = 3" }, { key: "b", label: "x + y = 7、x − y = 3" }, { key: "c", label: "x + y = 3、y − x = 7" }, { key: "d", label: "x − y = 7、x + y = 3" }],
        answer: "a", hint: "子どもの方が多いので、子ども − 大人 = 3。", explanation: "人数の合計で x + y = 7、子どもの方が 3 人多いので y − x = 3 です。" },
      { id: "s2", skill: "simElim", text: "連立方程式を解きなさい。", type: "pair",
        fields: [{ key: "x", label: "大人 x（人）" }, { key: "y", label: "子ども y（人）" }], answer: { x: 2, y: 5 },
        hint: "2つの式を足すと x が消える：2y = 10。", explanation: "足すと 2y = 10 なので y = 5、x = 2 です。" }
    ],
    prerequisite_skills: ["simMeaning", "eqWord", "simElim"], skills_used: ["simWord", "simElim"],
    hint: "「合わせて」と「〜より多い」で、式を1本ずつ。",
    explanation: "x + y = 7、y − x = 3 を解いて x = 2、y = 5。大人 2 人、子ども 5 人です。" });
  add({ id: "simWord-basic-3", skill: "simWord", level: "basic", format: "word",
    text: "2つの数があります。和は 14 で、大きい数は小さい数の 2 倍より 2 大きいです。大きい数を x、小さい数を y とします。",
    system: [[1, 1, 14], [1, -2, 2]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simWord", text: "連立方程式を作るとどれ？", type: "choice",
        choices: [{ key: "a", label: "x + y = 14、x = 2y + 2" }, { key: "b", label: "x + y = 14、y = 2x + 2" }, { key: "c", label: "x − y = 14、x = 2y + 2" }, { key: "d", label: "x + y = 14、x = 2(y + 2)" }],
        answer: "a", hint: "「小さい数の 2 倍」は 2y、「それより 2 大きい」は +2。", explanation: "和から x + y = 14、大きい数は 2y + 2 なので x = 2y + 2 です。" },
      { id: "s2", skill: "simSubst", text: "連立方程式を解きなさい。", type: "pair",
        fields: [{ key: "x", label: "大きい数 x" }, { key: "y", label: "小さい数 y" }], answer: { x: 10, y: 4 },
        hint: "x = 2y + 2 を、x + y = 14 の x に入れる。", explanation: "(2y + 2) + y = 14 → 3y = 12 → y = 4、x = 10 です。" }
    ],
    prerequisite_skills: ["simMeaning", "eqWord", "simSubst"], skills_used: ["simWord", "simSubst"],
    hint: "「x = …」の形の式が作れたら、代入法で解ける。",
    explanation: "x + y = 14、x = 2y + 2 を解いて x = 10、y = 4 です。" });

  // --- 連立方程式の文章題：定着（立式だけ／ちがう場面） ---
  add({ id: "simWord-retention-2", skill: "simWord", level: "retention", evidence_level: "basic", format: "word",
    text: "鉛筆 x 本と消しゴム y 個を、合わせて 9 個買います。鉛筆は消しゴムより 3 多いです。連立方程式はどれ？",
    type: "choice", choices: [{ key: "a", label: "x + y = 9、x − y = 3" }, { key: "b", label: "x + y = 9、x + 3 = y" }, { key: "c", label: "x − y = 9、x + y = 3" }, { key: "d", label: "x + y = 3、x − y = 9" }], answer: "a",
    prerequisite_skills: ["simMeaning", "eqWord"],
    hint: "鉛筆の方が多いので、鉛筆 − 消しゴム = 3。",
    explanation: "個数の合計で x + y = 9、鉛筆の方が 3 多いので x − y = 3（x = y + 3 でもよい）です。" });
  word("simWord-retention-3", "retention", null, "長方形の縦を x cm、横を y cm とします。周りの長さは 26 cm で、横は縦より 3 cm 長いです。縦と横の長さを求めなさい。",
    [{ key: "x", label: "縦 x（cm）" }, { key: "y", label: "横 y（cm）" }], [[2, 2, 26], [-1, 1, 3]], [5, 8],
    "周りの長さは (縦 + 横) × 2。2x + 2y = 26 と y = x + 3。", "2x + 2y = 26 から x + y = 13。y = x + 3 を代入して 2x + 3 = 13、x = 5、y = 8 です。",
    { evidence_level: "standard" });

  // =====================================================================
  // 共通の情報を足して、問題一覧に登録する
  // =====================================================================
  var E = SC.engine;
  var FORMAT_OF_CORE = { B1: "expression", B2: "expression", B3: "expression", B4: "word", B5: "expression",
    C1: "expression", C2: "expression", C3: "expression", C4: "word", C5: "expression", S1: "word", S2: "expression" };

  items.forEach(function (q) {
    var sk = E.SKILLS[q.skill];
    q.grade = "中学2年";
    q.subject = "数学";
    // 記録に残す単元。前の学年の土台（既習）は、いま学んでいる一次関数の中で使うものとして扱う
    q.unit = sk.unit === "既習" ? "一次関数" : sk.unit;
    q.origin = "bank";
    q.skillLabel = sk.label;
    // 前提を書いていない問題は、スキル地図の前提を使う。ただし「移項」（方程式を解く）は、
    // 実際に解く問題（下の SOLVES_EQUATION）にだけ付ける
    q.prerequisite_skills = q.prerequisite_skills || sk.prerequisites.filter(function (p) { return p !== "transpose" || E.SKILLS[q.skill].unit === "一次方程式"; });
    q.skills_used = q.skills_used || [q.skill];
    q.on_incorrect = q.on_incorrect || [];
    q.on_correct = q.on_correct || [];
    q.explain = q.explanation; // 学習画面の「考え方」表示で使う名前
    // 用途タグ（usage）。いまは既定値で、あとから問題ごとに書きかえられる
    q.usage = q.usage || (q.level === "retention" ? "retention" : "multi_use");
    (q.steps || []).forEach(function (st) { st.explain = st.explanation; st.level = q.level; st.unit = q.unit; });
    if (q.type === "steps") {
      q.answer = {};
      q.steps.forEach(function (st) { q.answer[st.id] = st.answer; });
    }
    SC.QUESTIONS[q.id] = q;
  });
  // 解く途中で方程式（移項）が必要な問題には、前提に「移項」を足す。
  // （1点と傾きから切片を求める・y から x を求める・2x + y = 5 を変形する など）
  // こうしておくと、まちがえたときに原因さがしが中1の一次方程式までさかのぼれる。
  var SOLVES_EQUATION = ["S2", "form-standard-1", "form-standard-3", "form-retention-2", "form-retention-3",
    "substitution-standard-1", "substitution-standard-4", "substitution-standard-5", "substitution-retention-4",
    "substitution-application-1", "substitution-application-2",
    "form-application-1", "form-application-2", "rate-application-2", "slopeIntercept-application-1", "slopeIntercept-application-2"];
  SOLVES_EQUATION.forEach(function (id) {
    var q = SC.QUESTIONS[id];
    if (!q) return;
    if (q.prerequisite_skills.indexOf("transpose") === -1) q.prerequisite_skills = q.prerequisite_skills.concat("transpose");
    if (q.skills_used.indexOf("transpose") === -1) q.skills_used = q.skills_used.concat("transpose");
  });

  Object.keys(FORMAT_OF_CORE).forEach(function (id) {
    var q = SC.QUESTIONS[id];
    q.origin = "core";
    q.usage = q.usage || "diagnosis"; // 最初のコンパスチェックで全員が見る問題。練習にはなるべく回さない
    q.format = q.format || FORMAT_OF_CORE[id];
    q.hint = q.hint || "";
  });

  // =====================================================================
  // スキル × レベルの索引と、ランダムに選ぶ仕組み
  // =====================================================================
  var LEVELS = ["basic", "standard", "application", "retention"];
  var index = {};
  E.SKILL_ORDER.forEach(function (s) { index[s] = { basic: [], standard: [], application: [], retention: [] }; });
  Object.keys(SC.QUESTIONS).forEach(function (id) {
    var q = SC.QUESTIONS[id];
    if (index[q.skill] && index[q.skill][q.level]) index[q.skill][q.level].push(id);
  });

  // 乱数を固定できるようにする（テストで同じ結果を出すため）
  function seeded(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // スキルとレベルを指定して1問えらぶ。
  // opts.history: answer_history（最近解いた問題を避ける）
  // opts.exclude: 今回すでに出した問題ID
  // opts.rng: 0〜1 を返す関数（省略時 Math.random）
  // opts.usage: 用途タグで絞る（例：["practice", "multi_use"]）。省略時は絞らない
  // 選び方：まだ解いていない問題を最優先 → なければ、最後に解いてから一番時間がたっている問題。
  //         同じ優先度の中からはランダム。
  function pick(skill, level, opts) {
    opts = opts || {};
    var rng = opts.rng || Math.random;
    var pool = (index[skill] && index[skill][level] || []).filter(function (id) {
      if (opts.usage && opts.usage.indexOf(SC.QUESTIONS[id].usage) === -1) return false;
      return !(opts.exclude && opts.exclude.indexOf(id) !== -1);
    });
    if (!pool.length) return null;
    var lastSeen = {};
    (opts.history || []).forEach(function (a) {
      var t = Date.parse(a.answered_at);
      if (!lastSeen[a.question_id] || t > lastSeen[a.question_id]) lastSeen[a.question_id] = t;
    });
    var unseen = pool.filter(function (id) { return !lastSeen[id]; });
    var candidates;
    if (unseen.length) candidates = unseen;
    else {
      var oldest = Math.min.apply(null, pool.map(function (id) { return lastSeen[id]; }));
      candidates = pool.filter(function (id) { return lastSeen[id] === oldest; });
    }
    return SC.QUESTIONS[candidates[Math.floor(rng() * candidates.length)]];
  }

  function pickMany(skill, level, n, opts) {
    opts = opts || {};
    var out = [], exclude = (opts.exclude || []).slice();
    for (var i = 0; i < n; i++) {
      var q = pick(skill, level, { history: opts.history, exclude: exclude, rng: opts.rng });
      if (!q) break;
      out.push(q);
      exclude.push(q.id);
    }
    return out;
  }

  // 将来の目安の問題数。問題が足りなくなったスキルから、ここに近づくよう順に追加する。
  // （既習スキルは基礎と定着だけを持つ）
  var TARGETS = {
    unit: { basic: 5, standard: 5, application: 3, retention: 5 },
    base: { basic: 5, standard: 0, application: 0, retention: 5 }
  };

  // スキル×レベルごとの「目安まであと何問」。多い順に並べて返す（追加する順番の参考）
  function shortage() {
    var out = [];
    Object.keys(index).forEach(function (s) {
      var target = E.SKILLS[s].unit === "既習" ? TARGETS.base : TARGETS.unit;
      LEVELS.forEach(function (lv) {
        var have = index[s][lv].length, need = target[lv] - have;
        if (need > 0) out.push({ skill: s, label: E.SKILLS[s].label, level: lv, have: have, target: target[lv], need: need });
      });
    });
    return out.sort(function (a, b) { return b.need - a.need; });
  }

  function count() {
    var out = {};
    Object.keys(index).forEach(function (s) {
      out[s] = {};
      LEVELS.forEach(function (lv) { out[s][lv] = index[s][lv].length; });
    });
    return out;
  }

  SC.bank = { LEVELS: LEVELS, TARGETS: TARGETS, index: index, ids: items.map(function (q) { return q.id; }), pick: pick, pickMany: pickMany, count: count, shortage: shortage, seeded: seeded };
})(typeof window !== "undefined" ? window : globalThis);
