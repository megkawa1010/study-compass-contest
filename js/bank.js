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
  // 補強：原因さがしの一番下（いろいろな単元から戻ってくる）なので、判定が安定するよう1つの計算に1つのポイントだけ
  function signedQ(id, level, text, answer, hint, explanation, extra) {
    var q = { id: id, skill: "signed", level: level, format: "expression", text: text, type: "number", answer: answer, hint: hint, explanation: explanation };
    for (var k in (extra || {})) q[k] = extra[k];
    add(q);
  }
  signedQ("signed-basic-3", "basic", "(−4) + (−7) を計算しなさい。", -11,
    "負の数どうしのたし算は、絶対値をたして − をつける。", "4 + 7 = 11 に − をつけて −11 です。");
  signedQ("signed-basic-4", "basic", "2 − 9 を計算しなさい。", -7,
    "0 をまたぐ。2 から 9 戻ると、0 をこえてマイナスへ。", "2 − 9 = −7 です。");
  signedQ("signed-basic-5", "basic", "5 − (−3) を計算しなさい。", 8,
    "負の数をひくのは、正の数をたすのと同じ。", "5 − (−3) = 5 + 3 = 8 です。");
  signedQ("signed-basic-6", "basic", "(−6) × (−3) を計算しなさい。", 18,
    "負 × 負 は 正。", "6 × 3 = 18、符号は ＋ なので 18 です。");
  signedQ("signed-basic-7", "basic", "(−24) ÷ 6 を計算しなさい。", -4,
    "負 ÷ 正 は 負。", "24 ÷ 6 = 4、符号は − なので −4 です。");
  add({ id: "signed-basic-8", skill: "signed", level: "basic", format: "expression",
    text: "(−2) × (−3) × (−5) の答えの符号は？",
    type: "choice", choices: [{ key: "a", label: "＋（正の数）" }, { key: "b", label: "−（負の数）" }], answer: "b",
    hint: "負の数を何個かけているか数える。",
    explanation: "負の数を3個（奇数個）かけるので、答えは負の数です（−30）。" });
  signedQ("signed-basic-9", "basic", "−3 より 5 小さい数は？", -8,
    "「小さい」は数直線の左へ。−3 − 5。", "−3 − 5 = −8 です。", { format: "word" });
  // 定着：見た目を変える（0 をはさむ式・どれが負になるか選ぶ・逆に求める）
  signedQ("signed-retention-3", "retention", "0 − (−9) + (−4) を計算しなさい。", 5,
    "0 − (−9) は +9。そこに −4 をたす。", "0 + 9 − 4 = 5 です。", { evidence_level: "basic" });
  add({ id: "signed-retention-4", skill: "signed", level: "retention", evidence_level: "basic", format: "expression",
    text: "次のうち、計算した答えが負の数になるのはどれ？",
    type: "choice", choices: [{ key: "a", label: "(−7) × (−2)" }, { key: "b", label: "(−12) ÷ 3" }, { key: "c", label: "(−5) − (−8)" }, { key: "d", label: "0 × (−9)" }], answer: "b",
    hint: "それぞれ符号だけ先に考える。0 は正でも負でもない。",
    explanation: "(−12) ÷ 3 = −4 で負。(−7) × (−2) = 14、(−5) − (−8) = 3、0 × (−9) = 0 です。" });
  signedQ("signed-retention-5", "retention", "ある数に −4 をかけたら 28 になりました。ある数は？", -7,
    "28 ÷ (−4) を計算する。", "28 ÷ (−4) = −7。たしかめると (−7) × (−4) = 28 です。", { evidence_level: "basic", format: "word" });

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
  // 補強：加減法の前提として必要な「式から式を引く」を、むずかしくしすぎずに確かめる
  poly("polyAddSub-basic-4", "polyAddSub", "basic", null, "(4x + 5) − (x + 2) を計算しましょう。", "3x+3",
    "かっこの前が − なので、2つ目のかっこは −x − 2 になる。", "4x + 5 − x − 2 をまとめると 3x + 3 です。");
  poly("polyAddSub-basic-5", "polyAddSub", "basic", null, "2x + 3y から 2x − y をひくと、どんな式になる？", "4y",
    "(2x + 3y) − (2x − y)。x は消える。3y − (−y) に注意。", "(2x + 3y) − (2x − y) = 2x + 3y − 2x + y = 4y。連立方程式の加減法で、式から式をひくときと同じ計算です。");
  add({ id: "polyAddSub-basic-6", skill: "polyAddSub", level: "basic", format: "expression",
    text: "(5a − 2b) − (3a + b) のかっこを外した式はどれ？",
    type: "choice", choices: [{ key: "a", label: "5a − 2b − 3a − b" }, { key: "b", label: "5a − 2b − 3a + b" }, { key: "c", label: "5a + 2b − 3a − b" }, { key: "d", label: "5a − 2b + 3a + b" }], answer: "a",
    hint: "− のついたかっこは、中の符号をすべて反対にする。前のかっこはそのまま。",
    explanation: "(3a + b) の前が − なので −3a − b。5a − 2b − 3a − b です（まとめると 2a − 3b）。" });
  poly("polyAddSub-standard-1", "polyAddSub", "standard", "polynomial-calc-07", "(5x − 3y) − (2x − y) を計算しましょう。", "3x-2y",
    "かっこの前が − のときは、かっこの中の符号がすべて反対になります。", "かっこを外すと 5x − 3y − 2x + y。まとめると 3x − 2y です。", { usage: "diagnosis" });
  poly("polyAddSub-standard-2", "polyAddSub", "standard", "polynomial-calc-08", "(4a − b) − (a − 3b) を計算しましょう。", "3a+2b",
    "2つ目のかっこの符号をすべて反対にして 4a − b − a + 3b。", "かっこを外すと 4a − b − a + 3b。まとめると 3a + 2b です。");
  // 定着：数日後でも自力で処理できるか。学習時の問題と見た目・数を変える（項の順番・負の式を引く・A − B・小数）
  poly("polyAddSub-retention-1", "polyAddSub", "retention", null, "−y + 6x − 8 + 9y − x + 11 を計算しましょう。", "5x+8y+3",
    "項の順番がばらばら。x の項・y の項・数の項に分けて集める。", "x の項は 6x − x = 5x、y の項は −y + 9y = 8y、数は −8 + 11 = 3。5x + 8y + 3 です。", { evidence_level: "basic" });
  poly("polyAddSub-retention-2", "polyAddSub", "retention", null, "(2m + 7n) − (−3m + 2n) を計算しましょう。", "5m+5n",
    "負の項を引くと、たし算になる。−(−3m) = +3m。", "2m + 7n + 3m − 2n をまとめると 5m + 5n です。", { evidence_level: "standard" });
  poly("polyAddSub-retention-3", "polyAddSub", "retention", null, "A = 9p − 4q、B = p − 8q のとき、A − B を計算しましょう。", "8p+4q",
    "A − B = (9p − 4q) − (p − 8q)。かっこをつけてから計算する。", "9p − 4q − p + 8q をまとめると 8p + 4q です。", { evidence_level: "standard" });
  poly("polyAddSub-retention-4", "polyAddSub", "retention", null, "−5x + 6y から −5x − 7y をひくと、どんな式になる？", "13y",
    "(−5x + 6y) − (−5x − 7y)。−5x − (−5x) = 0 で x が消える。", "−5x + 6y + 5x + 7y = 13y。加減法で x を消すときと同じ計算です。", { evidence_level: "basic" });
  poly("polyAddSub-retention-5", "polyAddSub", "retention", null, "(0.5x + 1.2y) − (0.3x − 0.4y) を計算しましょう。", "0.2x+1.6y",
    "小数でも同じ。2つ目のかっこの符号を反対にしてから、x と y に分けてまとめる。", "0.5x + 1.2y − 0.3x + 0.4y をまとめると 0.2x + 1.6y です。", { evidence_level: "standard" });

  // --- かっこを含む式の計算 ---
  poly("polyMixed-basic-1", "polyMixed", "basic", "polynomial-calc-09", "3(x − 2y) + 4y を計算しましょう。", "3x-2y",
    "まずかっこを開く：3 × x と 3 × (−2y)。", "かっこを開くと 3x − 6y + 4y。まとめると 3x − 2y です。");
  poly("polyMixed-basic-2", "polyMixed", "basic", "polynomial-calc-10", "2(3x + y) − 5x を計算しましょう。", "x+2y",
    "まずかっこを開く：2 × 3x と 2 × y。", "かっこを開くと 6x + 2y − 5x。まとめると x + 2y です。");
  poly("polyMixed-basic-3", "polyMixed", "basic", "polynomial-calc-11", "4(2a − b) − 3a を計算しましょう。", "5a-4b",
    "まずかっこを開く：4 × 2a と 4 × (−b)。", "かっこを開くと 8a − 4b − 3a。まとめると 5a − 4b です。");
  // 補強（基礎）：かっこを外す → 同類項をまとめる の1回だけ。見え方だけ変える
  poly("polyMixed-basic-4", "polyMixed", "basic", null, "2(x + 3) + 4x を計算しましょう。", "6x+6",
    "かっこを外すと 2x + 6。そのあと x の項をまとめる。", "2x + 6 + 4x をまとめると 6x + 6 です。");
  poly("polyMixed-basic-5", "polyMixed", "basic", null, "−3(x − 2) + 5x を計算しましょう。", "2x+6",
    "−3 × x と −3 × (−2)。負 × 負 は 正。", "−3x + 6 + 5x をまとめると 2x + 6 です。");
  poly("polyMixed-basic-6", "polyMixed", "basic", null, "7x − 2(x + 3y) を計算しましょう。", "5x-6y",
    "かっこの前が −2。−2 × x と −2 × 3y。", "7x − 2x − 6y をまとめると 5x − 6y です。");
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
    { prerequisite_skills: ["eqProperty", "transpose"], answer_display: "y = −3/2 x + 6" });
  solveY("eqTransform-standard-2", "standard", "4x − 2y = 6 を y について解きなさい。", 2, -3,
    "4x を移項すると −2y = −4x + 6。両辺を −2 でわると、全部の符号が変わる。", "−2y = −4x + 6 の両辺を −2 でわって y = 2x − 3 です。",
    { prerequisite_skills: ["eqProperty", "transpose", "signed"] });
  // 補強（基礎）：1回の操作だけ。両辺から同じ式をひく・両辺を同じ数でわる・両辺に同じ数をかける（どの操作かを選ぶ）
  add({ id: "eqTransform-basic-4", skill: "eqTransform", level: "basic", format: "expression",
    text: "x + y = 7 を y について解いた式はどれ？",
    type: "choice", choices: [{ key: "a", label: "y = 7 − x" }, { key: "b", label: "y = x − 7" }, { key: "c", label: "y = 7 + x" }, { key: "d", label: "y = −7 − x" }], answer: "a",
    prerequisite_skills: ["transpose"],
    hint: "両辺から x をひく。",
    explanation: "両辺から x をひくと y = 7 − x（y = −x + 7 と同じ）です。一次関数の式の形になります。" });
  solveY("eqTransform-basic-5", "basic", "3y = 6x + 9 を y について解きなさい。", 2, 3,
    "両辺を 3 でわる。右辺は 6x も 9 も、どちらも 3 でわる。", "両辺を 3 でわって y = 2x + 3 です。",
    { prerequisite_skills: ["eqProperty", "distrib"] });
  // 「どの操作をするか」だけを聞く（等式の性質の理解）。計算の正しさとは分けて記録する
  add({ id: "eqTransform-basic-6", skill: "eqTransform", level: "basic", format: "expression",
    text: "y/3 = x + 2 を y について解くには、どうすればよい？",
    type: "choice", choices: [{ key: "a", label: "両辺に 3 をかける" }, { key: "b", label: "両辺を 3 でわる" }, { key: "c", label: "両辺から 3 をひく" }, { key: "d", label: "両辺に x をたす" }], answer: "a",
    prerequisite_skills: ["eqProperty"],
    hint: "y が 3 でわられている。それをもとに戻す操作は？",
    explanation: "両辺に 3 をかけると y = 3(x + 2) = 3x + 6 になります。等式は、両辺に同じ数をかけても成り立ちます。" });
  // 補強（標準）：2〜3段階。整理する力（同類項・分配法則）と、等式の性質を使う力を分けて見る
  solveY("eqTransform-standard-3", "standard", "y + 2x = 3x − 4 を y について解きなさい。", 1, -4,
    "2x を右辺に移項してから、x の項をまとめる：y = 3x − 2x − 4。", "y = 3x − 2x − 4 = x − 4 です。",
    { prerequisite_skills: ["transpose", "likeTerms"], skills_used: ["eqTransform", "likeTerms"] });
  add({ id: "eqTransform-standard-4", skill: "eqTransform", level: "standard", format: "expression",
    text: "2(y − x) = 6 を、順に y について解きます。",
    type: "steps",
    steps: [
      { id: "s1", skill: "distrib", text: "左辺のかっこを外すと？", type: "poly", answer: "2y-2x", placeholder: "例：2y − 2x",
        hint: "2 × y と 2 × (−x)。", explanation: "2(y − x) = 2y − 2x です。" },
      { id: "s2", skill: "eqTransform", text: "2y − 2x = 6 で、y の項だけを左辺に残すと？", type: "choice",
        choices: [{ key: "a", label: "2y = 2x + 6" }, { key: "b", label: "2y = −2x + 6" }, { key: "c", label: "2y = 2x − 6" }, { key: "d", label: "y = 2x + 6" }],
        answer: "a", hint: "−2x を右辺に移すと +2x。", explanation: "−2x を右辺に移項して 2y = 2x + 6 です。" },
      { id: "s3", skill: "eqProperty", text: "両辺を 2 でわって、y = の形で答えなさい。", type: "linear", answer: { a: 1, b: 3 }, placeholder: "例：y = 2x + 1",
        hint: "2x も 6 も 2 でわる。", explanation: "y = x + 3 です。" }
    ],
    prerequisite_skills: ["distrib", "eqProperty", "transpose"], skills_used: ["eqTransform", "distrib", "eqProperty"],
    hint: "かっこを外す → y の項を残す → 両辺をわる。",
    explanation: "2y − 2x = 6 → 2y = 2x + 6 → y = x + 3 です。" });
  poly("eqTransform-standard-5", "eqTransform", "standard", null, "6x − 3y = 12 を x について解きなさい（x = の右側を答える）。", "0.5y+2",
    "−3y を右辺に移項して 6x = 3y + 12。両辺を 6 でわる。", "6x = 3y + 12 の両辺を 6 でわって x = y/2 + 2（1/2 y + 2）です。",
    { prerequisite_skills: ["eqProperty", "transpose", "signed"], placeholder: "例：x = y/2 + 1" });

  // --- 一次関数の側で、式を y = ax + b に直す必要がある問題（前提に「等式の変形」） ---
  // 傾き・切片／グラフ・式／2直線の交点 でまちがえたとき、式変形が原因候補なら等式の変形まで戻れる
  add({ id: "slopeIntercept-standard-6", skill: "slopeIntercept", level: "standard", format: "expression",
    text: "一次関数 6x + 3y = 9 のグラフの傾きと切片は？",
    type: "pair", fields: [{ key: "slope", label: "傾き" }, { key: "intercept", label: "切片" }], answer: { slope: -2, intercept: 3 },
    prerequisite_skills: ["eqTransform", "proportion"], skills_used: ["slopeIntercept", "eqTransform"],
    hint: "まず y について解いて、y = ax + b の形にする。",
    explanation: "3y = −6x + 9、y = −2x + 3。傾きは −2、切片は 3 です。" });
  add({ id: "form-standard-6", skill: "form", level: "standard", format: "expression",
    text: "直線 4x + y = 7 と傾きが同じで、点 (0, −2) を通る直線の式を求めなさい。",
    type: "linear", answer: { a: -4, b: -2 }, placeholder: "例：y = 2x + 1",
    prerequisite_skills: ["eqTransform", "slopeIntercept"], skills_used: ["form", "eqTransform", "slopeIntercept"],
    hint: "4x + y = 7 を y について解くと、傾きがわかる。(0, −2) は切片。",
    explanation: "4x + y = 7 は y = −4x + 7 なので傾きは −4。切片 −2 なので y = −4x − 2 です。" });
  add({ id: "simGraph-standard-3", skill: "simGraph", level: "standard", format: "expression",
    text: "2直線 x + y = 5 と 2x − y = 1 の交点を、それぞれの式を y = の形にしてから求めます。",
    type: "steps",
    steps: [
      { id: "s1", skill: "eqTransform", text: "2つの式を、それぞれ y について解くと？", type: "choice",
        choices: [{ key: "a", label: "y = −x + 5、y = 2x − 1" }, { key: "b", label: "y = x + 5、y = 2x − 1" }, { key: "c", label: "y = −x + 5、y = −2x + 1" }, { key: "d", label: "y = −x − 5、y = 2x + 1" }],
        answer: "a", hint: "1つ目は x を、2つ目は 2x を右辺へ。2つ目は両辺に −1 をかける。", explanation: "x + y = 5 → y = −x + 5、2x − y = 1 → −y = −2x + 1 → y = 2x − 1 です。" },
      { id: "s2", skill: "simGraph", text: "交点の座標は？", type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 2, y: 3 },
        hint: "−x + 5 = 2x − 1 を解く。", explanation: "−x + 5 = 2x − 1 → 3x = 6 → x = 2、y = 3。交点は (2, 3) です。" }
    ],
    lines: [[-1, 5], [2, -1]], prerequisite_skills: ["eqTransform", "simSubst"], skills_used: ["eqTransform", "simGraph"],
    hint: "y = の形にすると、グラフの傾きと切片も見えて、交点も求めやすい。",
    explanation: "y = −x + 5 と y = 2x − 1 の交点は (2, 3) です。" });
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
  // 実測にもとづく補強（scripts/audit-bank.js）
  // 「各スキル5問」を目標にせず、10日分の利用シミュレーションで不自然な再利用
  // （2日以内のくり返し・チェックで出せない）が出たスキルだけを、出た量に合わせて足す。
  // =====================================================================

  // --- 加減法：基礎（係数がそろっている。足す・引く・答えが負・y を消す／x を消す） ---
  sim("simElim-basic-5", "simElim", "basic", null, [[1, 1, 9], [1, -1, 3]], [6, 3],
    "そのまま足すと y が消える。", "足すと 2x = 12 なので x = 6。x + y = 9 に代入して y = 3 です。", { prerequisite_skills: ALIGNED });
  sim("simElim-basic-6", "simElim", "basic", null, [[3, 1, 11], [1, 1, 5]], [3, 2],
    "y の係数がどちらも 1。上から下を引く。", "引くと 2x = 6 なので x = 3。x + y = 5 に代入して y = 2 です。", { prerequisite_skills: ALIGNED });
  sim("simElim-basic-7", "simElim", "basic", null, [[2, 1, 1], [3, -1, 9]], [2, -3],
    "y の係数が +1 と −1。足すと y が消える。答えが負の数になることもある。", "足すと 5x = 10 なので x = 2。2x + y = 1 に代入して 4 + y = 1、y = −3 です。", { prerequisite_skills: ALIGNED });
  sim("simElim-basic-8", "simElim", "basic", null, [[2, 3, 12], [2, 1, 8]], [3, 2],
    "x の係数がどちらも 2。引くと x が消える。", "引くと 2y = 4 なので y = 2。2x + 2 = 8 から x = 3 です。", { prerequisite_skills: ALIGNED });

  // --- 代入法：基礎（「y = …」「x = …」をそのまま入れる）・標準（入れるとかっこができる） ---
  sim("simSubst-basic-3", "simSubst", "basic", null, [[-3, 1, 0], [2, 1, 10]], [2, 6],
    "下の式の y に 3x を入れる。", "2x + 3x = 10 → 5x = 10 → x = 2。y = 3 × 2 = 6 です。",
    { shown: ["y = 3x", "2x + y = 10"], prerequisite_skills: ["algebra", "transpose"] });
  sim("simSubst-basic-4", "simSubst", "basic", null, [[1, -1, 1], [1, 2, 7]], [3, 2],
    "下の式の x に (y + 1) を入れる。", "(y + 1) + 2y = 7 → 3y = 6 → y = 2。x = 3 です。",
    { shown: ["x = y + 1", "x + 2y = 7"], prerequisite_skills: ["algebra", "transpose"] });
  sim("simSubst-basic-5", "simSubst", "basic", null, [[1, 1, 4], [3, 1, 8]], [2, 2],
    "下の式の y に (−x + 4) を入れる。", "3x + (−x + 4) = 8 → 2x = 4 → x = 2。y = −2 + 4 = 2 です。",
    { shown: ["y = −x + 4", "3x + y = 8"], prerequisite_skills: ["algebra", "transpose", "signed"] });
  sim("simSubst-basic-6", "simSubst", "basic", null, [[-2, 1, -3], [1, 1, 6]], [3, 3],
    "下の式の y に (2x − 3) を入れる。", "x + 2x − 3 = 6 → 3x = 9 → x = 3。y = 6 − 3 = 3 です。",
    { shown: ["y = 2x − 3", "x + y = 6"], prerequisite_skills: ["algebra", "transpose"] });
  sim("simSubst-standard-3", "simSubst", "standard", null, [[-1, 1, -2], [3, -2, 7]], [3, 1],
    "下の式の y に (x − 2) をかっこごと入れる。−2(x − 2) に注意。", "3x − 2(x − 2) = 7 → 3x − 2x + 4 = 7 → x = 3。y = 1 です。",
    { shown: ["y = x − 2", "3x − 2y = 7"] });
  sim("simSubst-standard-4", "simSubst", "standard", null, [[1, -4, -1], [3, -7, 12]], [11, 3],
    "下の式の x に (4y − 1) をかっこごと入れる。", "3(4y − 1) − 7y = 12 → 12y − 3 − 7y = 12 → 5y = 15 → y = 3。x = 11 です。",
    { shown: ["x = 4y − 1", "3x − 7y = 12"] });
  sim("simSubst-standard-5", "simSubst", "standard", null, [[2, 1, 1], [4, -3, 17]], [2, -3],
    "下の式の y に (−2x + 1) を入れる。−3 × (−2x + 1) の符号に注意。", "4x − 3(−2x + 1) = 17 → 4x + 6x − 3 = 17 → 10x = 20 → x = 2。y = −3 です。",
    { shown: ["y = −2x + 1", "4x − 3y = 17"] });

  // --- かっこを含む連立方程式：基礎（かっこを外せばすぐ加減法）・標準（外したあと整理が要る） ---
  sim("simParen-basic-3", "simParen", "basic", null, [[3, -3, 6], [1, 1, 10]], [6, 4],
    "上の式は両辺を 3 でわると x − y = 2。", "x − y = 2 と x + y = 10 を足すと 2x = 12、x = 6。y = 4 です。",
    { shown: ["3(x − y) = 6", "x + y = 10"] });
  sim("simParen-basic-4", "simParen", "basic", null, [[1, 2, 8], [1, -1, 2]], [4, 2],
    "上の式のかっこを外すと x + 2y − 2 = 6、つまり x + 2y = 8。", "x + 2y = 8 から x − y = 2 を引くと 3y = 6、y = 2。x = 4 です。",
    { shown: ["x + 2(y − 1) = 6", "x − y = 2"] });
  sim("simParen-basic-5", "simParen", "basic", null, [[4, 4, 20], [1, -1, 3]], [4, 1],
    "上の式は両辺を 4 でわると x + y = 5。", "x + y = 5 と x − y = 3 を足すと 2x = 8、x = 4。y = 1 です。",
    { shown: ["4(x + y) = 20", "x − y = 3"] });
  sim("simParen-standard-2", "simParen", "standard", null, [[3, -1, 9], [2, 1, 11]], [4, 3],
    "上の式のかっこを外して整理すると 3x − y = 9。", "3x + 3 − y = 12 → 3x − y = 9。2x + y = 11 と足すと 5x = 20、x = 4。y = 3 です。",
    { shown: ["3(x + 1) − y = 12", "2x + y = 11"] });
  sim("simParen-standard-3", "simParen", "standard", null, [[1, 3, 13], [1, -1, 1]], [4, 3],
    "上の式は 2x + 2y − x + y = 13、つまり x + 3y = 13。", "x + 3y = 13 から x − y = 1 を引くと 4y = 12、y = 3。x = 4 です。",
    { shown: ["2(x + y) − (x − y) = 13", "x − y = 1"] });

  // --- かっこのある方程式（中1）：基礎（かっこを外して1回移項）・標準（外したあと両辺に x）・定着 ---
  eq("eqParen-basic-3", "eqParen", "basic", null, "方程式 4(x − 1) = 12 を解きましょう。", 4,
    "かっこを外すと 4x − 4 = 12。", "4x − 4 = 12 → 4x = 16 → x = 4 です。");
  eq("eqParen-basic-4", "eqParen", "basic", null, "方程式 5(x + 1) = 30 を解きましょう。", 5,
    "かっこを外すと 5x + 5 = 30。両辺を先に 5 でわってもよい。", "5x + 5 = 30 → 5x = 25 → x = 5 です。");
  eq("eqParen-basic-5", "eqParen", "basic", null, "方程式 −2(x + 3) = 4 を解きましょう。", -5,
    "−2 をかっこの中に配ると −2x − 6。", "−2x − 6 = 4 → −2x = 10 → x = −5 です。");
  eq("eqParen-basic-6", "eqParen", "basic", null, "方程式 3(2x − 1) = 15 を解きましょう。", 3,
    "かっこを外すと 6x − 3 = 15。", "6x − 3 = 15 → 6x = 18 → x = 3 です。");
  eq("eqParen-standard-3", "eqParen", "standard", null, "方程式 2(x + 4) = x + 11 を解きましょう。", 3,
    "かっこを外すと 2x + 8 = x + 11。x の項を左辺に集める。", "2x + 8 = x + 11 → 2x − x = 11 − 8 → x = 3 です。",
    { prerequisite_skills: ["distrib", "transpose", "likeTerms"] });
  eq("eqParen-standard-4", "eqParen", "standard", null, "方程式 3(x − 2) − (x + 4) = 0 を解きましょう。", 5,
    "−(x + 4) は −x − 4。", "3x − 6 − x − 4 = 0 → 2x − 10 = 0 → x = 5 です。",
    { prerequisite_skills: ["distrib", "likeTerms", "transpose"] });
  eq("eqParen-standard-5", "eqParen", "standard", null, "方程式 6 − 2(x − 1) = 2 を解きましょう。", 3,
    "−2(x − 1) は −2x + 2。", "6 − 2x + 2 = 2 → −2x = −6 → x = 3 です。");
  eq("eqParen-retention-2", "eqParen", "retention", null, "方程式 6(5 − x) = 18 を解きましょう。", 2,
    "かっこを外すと 30 − 6x = 18。", "30 − 6x = 18 → −6x = −12 → x = 2 です。", { evidence_level: "basic" });
  eq("eqParen-retention-3", "eqParen", "retention", null, "方程式 −(x − 9) = 4x − 1 を解きましょう。", 2,
    "−(x − 9) は −x + 9。", "−x + 9 = 4x − 1 → −5x = −10 → x = 2 です。", { evidence_level: "standard" });

  // --- かっこを含む式の計算：基礎（かっこの位置・− だけのかっこ）・標準（かっこ2つ）・定着（0問だったので新設） ---
  poly("polyMixed-basic-7", "polyMixed", "basic", null, "5(a + b) − 2a を計算しましょう。", "3a+5b",
    "かっこを外すと 5a + 5b。a の項をまとめる。", "5a + 5b − 2a をまとめると 3a + 5b です。");
  poly("polyMixed-basic-8", "polyMixed", "basic", null, "4y + 2(x − y) を計算しましょう。", "2x+2y",
    "かっこが後ろにあっても同じ。2(x − y) = 2x − 2y。", "4y + 2x − 2y をまとめると 2x + 2y です。");
  poly("polyMixed-basic-9", "polyMixed", "basic", null, "−(x − 4y) + 3x を計算しましょう。", "2x+4y",
    "−( ) は、中の符号をすべて反対にする：−x + 4y。", "−x + 4y + 3x をまとめると 2x + 4y です。");
  poly("polyMixed-standard-3", "polyMixed", "standard", null, "2(4x − 3y) − 5(x − y) を計算しましょう。", "3x-y",
    "8x − 6y と −5x + 5y に分けてから、まとめる。", "8x − 6y − 5x + 5y をまとめると 3x − y です。");
  poly("polyMixed-standard-4", "polyMixed", "standard", null, "−(2a − 5b) + 3(a − b) を計算しましょう。", "a+2b",
    "−(2a − 5b) = −2a + 5b、3(a − b) = 3a − 3b。", "−2a + 5b + 3a − 3b をまとめると a + 2b です。");
  poly("polyMixed-retention-1", "polyMixed", "retention", null, "9(m − 5n) − 8(m − 6n) を計算しましょう。", "m+3n",
    "2つのかっこをそれぞれ外す。−8 × (−6n) = +48n。", "9m − 45n − 8m + 48n をまとめると m + 3n です。", { evidence_level: "standard" });
  poly("polyMixed-retention-2", "polyMixed", "retention", null, "−7(2x − y) + 15x を計算しましょう。", "x+7y",
    "−7 × 2x と −7 × (−y)。", "−14x + 7y + 15x をまとめると x + 7y です。", { evidence_level: "basic" });
  poly("polyMixed-retention-3", "polyMixed", "retention", null, "8(p + q) − 6(p + 3q) を計算しましょう。", "2p-10q",
    "8p + 8q と −6p − 18q に分ける。", "8p + 8q − 6p − 18q をまとめると 2p − 10q です。", { evidence_level: "standard" });

  // --- 等式の性質（中1）：等式の変形の主前提になったので、ハブとして厚くする ---
  eq("eqProperty-basic-4", "eqProperty", "basic", null, "方程式 x/4 = 3 を解きましょう。", 12,
    "両辺に 4 をかける。", "両辺に 4 をかけて x = 12 です。");
  eq("eqProperty-basic-5", "eqProperty", "basic", null, "方程式 −x = 9 を解きましょう。", -9,
    "両辺に −1 をかける（両辺を −1 でわる）。", "両辺に −1 をかけて x = −9 です。", { prerequisite_skills: ["signed"] });
  eq("eqProperty-basic-6", "eqProperty", "basic", null, "方程式 8x = 4 を解きましょう。", 0.5,
    "両辺を 8 でわる。答えは分数や小数になる。", "x = 4 ÷ 8 = 1/2（0.5）です。", { answer_display: "1/2" });
  eq("eqProperty-basic-7", "eqProperty", "basic", null, "方程式 −5x = −35 を解きましょう。", 7,
    "両辺を −5 でわる。負 ÷ 負 は正。", "x = −35 ÷ (−5) = 7 です。", { prerequisite_skills: ["signed"] });
  eq("eqProperty-standard-1", "eqProperty", "standard", null, "方程式 (2/3)x = 8 を解きましょう。", 12,
    "両辺に 3/2 をかける（3 をかけて 2 でわる）。", "両辺に 3/2 をかけて x = 8 × 3/2 = 12 です。");
  eq("eqProperty-standard-2", "eqProperty", "standard", null, "方程式 0.5x = −3 を解きましょう。", -6,
    "両辺を 0.5 でわる（両辺に 2 をかける）。", "両辺に 2 をかけて x = −6 です。", { prerequisite_skills: ["signed"] });
  eq("eqProperty-retention-2", "eqProperty", "retention", null, "方程式 −6x = 42 を解きましょう。", -7,
    "両辺を −6 でわる。", "x = 42 ÷ (−6) = −7 です。", { evidence_level: "basic", prerequisite_skills: ["signed"] });
  eq("eqProperty-retention-3", "eqProperty", "retention", null, "方程式 x ÷ (−3) = 5 を解きましょう。", -15,
    "両辺に −3 をかける。", "x = 5 × (−3) = −15 です。", { evidence_level: "basic", prerequisite_skills: ["signed"] });

  // --- 2回目の試算で、レベル単位で足りなかったところ ---
  // 代入法：基礎・標準・応用（チェックの基礎が出せない／練習の標準が2日以内にくり返す）
  sim("simSubst-basic-7", "simSubst", "basic", null, [[-4, 1, 0], [3, 1, 14]], [2, 8],
    "下の式の y に 4x を入れる。", "3x + 4x = 14 → 7x = 14 → x = 2。y = 8 です。",
    { shown: ["y = 4x", "3x + y = 14"], prerequisite_skills: ["algebra", "transpose"] });
  sim("simSubst-basic-8", "simSubst", "basic", null, [[1, -2, 0], [1, 3, 15]], [6, 3],
    "下の式の x に 2y を入れる。", "2y + 3y = 15 → 5y = 15 → y = 3。x = 6 です。",
    { shown: ["x = 2y", "x + 3y = 15"], prerequisite_skills: ["algebra", "transpose"] });
  sim("simSubst-standard-6", "simSubst", "standard", null, [[-6, 1, -7], [4, -1, -1]], [4, 17],
    "下の式の y に (6x − 7) を入れる。−(6x − 7) の符号に注意。", "4x − (6x − 7) = −1 → 4x − 6x + 7 = −1 → −2x = −8 → x = 4。y = 17 です。",
    { shown: ["y = 6x − 7", "4x − y = −1"] });
  sim("simSubst-standard-7", "simSubst", "standard", null, [[1, 1, 8], [5, -1, 16]], [4, 4],
    "下の式の x に (−y + 8) を入れる。5 × (−y + 8) を先に計算。", "5(−y + 8) − y = 16 → −5y + 40 − y = 16 → −6y = −24 → y = 4。x = 4 です。",
    { shown: ["x = −y + 8", "5x − y = 16"] });
  add({ id: "simSubst-application-2", skill: "simSubst", level: "application", format: "expression",
    text: "連立方程式を、代入法で順に解きます。",
    figure: { type: "system", eqs: ["y = 6x − 1", "8x − 3y = −7"] }, system: [[-6, 1, -1], [8, -3, -7]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simSubst", text: "上の式を下の式に代入すると、どの式になる？", type: "choice",
        choices: [{ key: "a", label: "8x − 3(6x − 1) = −7" }, { key: "b", label: "8x − 18x − 1 = −7" }, { key: "c", label: "8x − 3(6x − 1) = 7" }, { key: "d", label: "8(6x − 1) − 3y = −7" }],
        answer: "a", hint: "y のところに (6x − 1) をかっこごと入れる。", explanation: "3y の y を (6x − 1) にかえて 8x − 3(6x − 1) = −7 です。" },
      { id: "s2", skill: "eqParen", text: "その方程式を解いて、x の値を求めると？", type: "number", answer: 1,
        hint: "−3(6x − 1) = −18x + 3。", explanation: "8x − 18x + 3 = −7 → −10x = −10 → x = 1 です。" },
      { id: "s3", skill: "algebra", text: "x = 1 を y = 6x − 1 に代入して、y の値を求めると？", type: "number", answer: 5,
        hint: "6 × 1 − 1。", explanation: "y = 6 − 1 = 5 です。" }
    ],
    prerequisite_skills: ["algebra", "eqParen", "transpose"], skills_used: ["simSubst", "eqParen", "algebra"],
    hint: "「y = …」の式を、もう1つの式の y に入れる。−3 をかける部分の符号に注意。",
    explanation: "代入して 8x − 3(6x − 1) = −7、x = 1。y = 5。答えは x = 1、y = 5 です。" });

  // 係数をそろえる：標準（チェックの標準が足りない）
  add({ id: "simCoef-standard-2", skill: "simCoef", level: "standard", format: "expression",
    text: "連立方程式 5x + 8y = 9、7x − 4y = 13 で y を消すには、どうする？",
    type: "choice", choices: [{ key: "a", label: "下の式を 2 倍して足す" }, { key: "b", label: "下の式を 2 倍して引く" }, { key: "c", label: "上の式を 2 倍して足す" }, { key: "d", label: "下の式を 4 倍して足す" }], answer: "a",
    hint: "y の係数は 8 と −4。−4 を何倍すると −8 になる？",
    explanation: "下を 2 倍すると 14x − 8y = 26。上の +8y と符号が反対なので、足すと y が消えます。" });

  // 小数・分数を含む連立方程式：基礎・標準（試算で、ほかを補強したあとに不足が見えた）
  add({ id: "simFraction-basic-3", skill: "simFraction", level: "basic", format: "expression",
    text: "式 0.4x + 0.3y = 2 の両辺を 10 倍した式はどれ？",
    type: "choice", choices: [{ key: "a", label: "4x + 3y = 20" }, { key: "b", label: "4x + 3y = 2" }, { key: "c", label: "4x + 0.3y = 20" }, { key: "d", label: "40x + 30y = 200" }], answer: "a",
    prerequisite_skills: ["eqFraction", "distrib"],
    hint: "左辺のすべての項と右辺に 10 をかける。",
    explanation: "0.4x × 10 = 4x、0.3y × 10 = 3y、2 × 10 = 20。4x + 3y = 20 です。" });
  sim("simFraction-basic-4", "simFraction", "basic", null, [[1 / 3, 1, 4], [1, -1, 4]], [6, 2],
    "上の式を 3 倍すると x + 3y = 12。", "x + 3y = 12 から x − y = 4 を引くと 4y = 8、y = 2。x = 6 です。",
    { shown: ["x/3 + y = 4", "x − y = 4"] });
  sim("simFraction-standard-2", "simFraction", "standard", null, [[0.5, -0.2, 1.1], [1, 1, 5]], [3, 2],
    "上の式を 10 倍すると 5x − 2y = 11。", "5x − 2y = 11 と、x + y = 5 を 2 倍した 2x + 2y = 10 を足すと 7x = 21、x = 3。y = 2 です。",
    { shown: ["0.5x − 0.2y = 1.1", "x + y = 5"] });
  sim("simFraction-standard-3", "simFraction", "standard", null, [[0.5, -1 / 3, 1], [1, 1, 7]], [4, 3],
    "上の式は分母 2 と 3 なので 6 倍する：3x − 2y = 6。", "3x − 2y = 6 と、x + y = 7 を 2 倍した 2x + 2y = 14 を足すと 5x = 20、x = 4。y = 3 です。",
    { shown: ["x/2 − y/3 = 1", "x + y = 7"] });
  add({ id: "simCoef-standard-3", skill: "simCoef", level: "standard", format: "expression",
    text: "連立方程式 6x + 5y = 8、4x − 3y = 18 で、x の係数を 12 にそろえるには、上の式を何倍すればよい？",
    type: "number", answer: 2,
    hint: "上の式の x の係数は 6。",
    explanation: "上の式を 2 倍すると 12x、下の式を 3 倍すると 12x になってそろいます。" });

  // 文字式への代入（中1の土台）：チェックの基礎・定着が足りない
  add({ id: "algebra-basic-3", skill: "algebra", level: "basic", format: "expression",
    text: "a = −2 のとき、3a + 7 の値は？", type: "number", answer: 1, prerequisite_skills: ["signed"],
    hint: "3 × (−2) + 7。", explanation: "3 × (−2) + 7 = −6 + 7 = 1 です。" });
  add({ id: "algebra-basic-4", skill: "algebra", level: "basic", format: "expression",
    text: "x = 3、y = −1 のとき、2x − 5y の値は？", type: "number", answer: 11, prerequisite_skills: ["signed"],
    hint: "−5y は −5 × (−1)。", explanation: "2 × 3 − 5 × (−1) = 6 + 5 = 11 です。" });
  add({ id: "algebra-retention-3", skill: "algebra", level: "retention", evidence_level: "basic", format: "expression",
    text: "x = −4 のとき、x² − 9x の値は？", type: "number", answer: 52, prerequisite_skills: ["signed"],
    hint: "x² は (−4) × (−4)。−9x は −9 × (−4)。", explanation: "16 + 36 = 52 です。" });
  add({ id: "algebra-retention-4", skill: "algebra", level: "retention", evidence_level: "basic", format: "expression",
    text: "a = 1/2 のとき、6a − 1 の値は？", type: "number", answer: 2,
    hint: "6 × 1/2 を先に。", explanation: "6 × 1/2 − 1 = 3 − 1 = 2 です。" });

  // 単項式の乗法・除法：標準・応用・定着（定着は0問だった）
  poly("monoMulDiv-standard-3", "monoMulDiv", "standard", null, "(−3a)² を計算しましょう。", "9a^2",
    "(−3a) × (−3a)。負 × 負 は正。", "(−3) × (−3) = 9、a × a = a² なので 9a² です。");
  add({ id: "monoMulDiv-application-2", skill: "monoMulDiv", level: "application", format: "expression",
    text: "12ab² ÷ (−3b) × 2a を、前から順に計算します。",
    type: "steps",
    steps: [
      { id: "s1", skill: "monoMulDiv", text: "まず 12ab² ÷ (−3b) を計算すると？", type: "poly", answer: "-4ab", placeholder: "例：−4ab",
        hint: "数は 12 ÷ (−3)、b は 1 個消える。", explanation: "12 ÷ (−3) = −4、b² ÷ b = b なので −4ab です。" },
      { id: "s2", skill: "monoMulDiv", text: "それに 2a をかけると？", type: "poly", answer: "-8a^2b", placeholder: "例：6x^2",
        hint: "数は −4 × 2、a は a × a。", explanation: "−4 × 2 = −8、a × a = a² なので −8a²b です。" }
    ],
    prerequisite_skills: ["signed"], skills_used: ["monoMulDiv"],
    hint: "かけ算とわり算がまざっているときは、前から順に。符号も先に決めておく。",
    explanation: "12ab² ÷ (−3b) = −4ab、それに 2a をかけて −8a²b です。" });
  poly("monoMulDiv-retention-1", "monoMulDiv", "retention", null, "−14xy ÷ 7y を計算しましょう。", "-2x",
    "数は −14 ÷ 7、y は消える。", "−14 ÷ 7 = −2、y が消えて −2x です。", { evidence_level: "basic" });
  poly("monoMulDiv-retention-2", "monoMulDiv", "retention", null, "6a × 5ab を計算しましょう。", "30a^2b",
    "数どうし、文字どうし。a × a = a²。", "6 × 5 = 30、a × a × b = a²b なので 30a²b です。", { evidence_level: "standard" });

  // 多項式の加法・減法：標準（チェックの標準が足りない）
  poly("polyAddSub-standard-3", "polyAddSub", "standard", null, "(3a + 2b − 4) − (a − 5b + 1) を計算しましょう。", "2a+7b-5",
    "3つの項すべての符号を反対にする：−a + 5b − 1。", "3a + 2b − 4 − a + 5b − 1 をまとめると 2a + 7b − 5 です。");
  poly("polyAddSub-standard-4", "polyAddSub", "standard", null, "(7x − 4y) − (−2x + 3y) を計算しましょう。", "9x-7y",
    "−(−2x) は +2x、−(+3y) は −3y。", "7x − 4y + 2x − 3y をまとめると 9x − 7y です。");

  // 移項：標準・定着（チェックで足りない）
  eq("transpose-standard-5", "transpose", "standard", null, "方程式 6x + 1 = 2x − 11 を解きましょう。", -3,
    "x の項は左辺、数の項は右辺へ。", "6x − 2x = −11 − 1 → 4x = −12 → x = −3 です。",
    { prerequisite_skills: ["signed", "likeTerms", "eqProperty"], skills_used: ["transpose", "likeTerms", "eqProperty"] });
  eq("transpose-retention-3", "transpose", "retention", null, "方程式 −2x + 9 = 1 を解きましょう。", 4,
    "+9 を右辺へ移項すると −2x = 1 − 9。", "−2x = −8 → x = 4 です。", { evidence_level: "basic", prerequisite_skills: ["signed", "algebra"] });

  // 連立方程式の文章題：基礎（式を立てる → 解く）
  add({ id: "simWord-basic-4", skill: "simWord", level: "basic", format: "word",
    text: "りんごとみかんを合わせて 10 個買います。みかんの個数は、りんごの個数の 4 倍です。りんごを x 個、みかんを y 個とします。",
    system: [[1, 1, 10], [-4, 1, 0]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simWord", text: "連立方程式を作るとどれ？", type: "choice",
        choices: [{ key: "a", label: "x + y = 10、y = 4x" }, { key: "b", label: "x + y = 10、x = 4y" }, { key: "c", label: "x + y = 4、y = 10x" }, { key: "d", label: "4x + y = 10、y = x" }],
        answer: "a", hint: "「みかんは、りんごの 4 倍」→ みかん ＝ 4 × りんご。", explanation: "個数の合計で x + y = 10、みかんはりんごの 4 倍なので y = 4x です。" },
      { id: "s2", skill: "simSubst", text: "連立方程式を解きなさい。", type: "pair",
        fields: [{ key: "x", label: "りんご x（個）" }, { key: "y", label: "みかん y（個）" }], answer: { x: 2, y: 8 },
        hint: "y = 4x を x + y = 10 に代入する。", explanation: "x + 4x = 10 → x = 2、y = 8 です。" }
    ],
    prerequisite_skills: ["simMeaning", "eqWord", "simSubst"], skills_used: ["simWord", "simSubst"],
    hint: "「合わせて」と「〜の何倍」で、式を1本ずつ。",
    explanation: "x + y = 10、y = 4x を解いて x = 2、y = 8 です。" });

  // 等式の変形：基礎・標準を1問ずつ
  solveY("eqTransform-basic-7", "basic", "x − y = 3 を y について解きなさい。", 1, -3,
    "x を右辺に移項すると −y = −x + 3。両辺に −1 をかける。", "−y = −x + 3 → y = x − 3 です。",
    { prerequisite_skills: ["eqProperty", "transpose"] });
  solveY("eqTransform-standard-6", "standard", "5x + 2y = 4x + 6 を y について解きなさい。", -0.5, 3,
    "x の項を右辺に集めると 2y = −x + 6。両辺を 2 でわる。", "2y = 4x − 5x + 6 = −x + 6 → y = −1/2 x + 3 です。",
    { prerequisite_skills: ["eqProperty", "transpose", "likeTerms"], answer_display: "y = −1/2 x + 3" });

  // --- 3回目の試算で残った不足 ---
  solveY("eqTransform-standard-7", "standard", "3(x + y) = 2x + 12 を y について解きなさい。", -1 / 3, 4,
    "かっこを外して 3x + 3y = 2x + 12。x の項を右辺に集めてから 3 でわる。", "3y = −x + 12 → y = −1/3 x + 4 です。",
    { prerequisite_skills: ["distrib", "eqProperty", "likeTerms"], answer_display: "y = −1/3 x + 4" });
  poly("eqTransform-standard-8", "eqTransform", "standard", null, "4x − y = 2x + 5 を x について解きなさい（x = の右側を答える）。", "0.5y+2.5",
    "x の項を左辺、y と数を右辺に集めると 2x = y + 5。", "2x = y + 5 → x = y/2 + 5/2 です。",
    { prerequisite_skills: ["eqProperty", "transpose", "likeTerms"], placeholder: "例：x = y/2 + 1" });
  add({ id: "eqTransform-application-2", skill: "eqTransform", level: "application", format: "expression",
    text: "連立方程式を、上の式を y について解いてから代入法で解きます。",
    figure: { type: "system", eqs: ["3x + y = 11", "2x − 3y = 0"] }, system: [[3, 1, 11], [2, -3, 0]],
    type: "steps",
    steps: [
      { id: "s1", skill: "eqTransform", text: "上の式を y について解くと？", type: "choice",
        choices: [{ key: "a", label: "y = −3x + 11" }, { key: "b", label: "y = 3x + 11" }, { key: "c", label: "y = −3x − 11" }, { key: "d", label: "y = 11 − x" }],
        answer: "a", hint: "3x を右辺に移項する。", explanation: "3x を移項して y = −3x + 11 です。" },
      { id: "s2", skill: "simSubst", text: "それを下の式に代入して、連立方程式を解きなさい。", type: "pair", fields: [{ key: "x", label: "x =" }, { key: "y", label: "y =" }], answer: { x: 3, y: 2 },
        hint: "2x − 3(−3x + 11) = 0。−3 × (−3x) = +9x。", explanation: "2x + 9x − 33 = 0 → 11x = 33 → x = 3、y = −9 + 11 = 2 です。" }
    ],
    prerequisite_skills: ["transpose", "simSubst"], skills_used: ["eqTransform", "simSubst"],
    hint: "等式の変形で「y = …」の形にしてから、代入法。",
    explanation: "上の式を y = −3x + 11 にして代入すると x = 3、y = 2 です。" });
  poly("polyMixed-basic-10", "polyMixed", "basic", null, "3(2a − b) + 4b を計算しましょう。", "6a+b",
    "かっこを外すと 6a − 3b。b の項をまとめる。", "6a − 3b + 4b をまとめると 6a + b です。");
  poly("polyMixed-basic-11", "polyMixed", "basic", null, "x − 3(x − 2y) を計算しましょう。", "-2x+6y",
    "かっこの前が −3。−3 × x と −3 × (−2y)。", "x − 3x + 6y をまとめると −2x + 6y です。");
  // 学校で学習中・なかなか安定せず毎日同じ基礎を練習するケースで、3日目から再利用が出ていたぶん
  poly("polyMixed-basic-12", "polyMixed", "basic", null, "4(x + 2y) − 3y を計算しましょう。", "4x+5y",
    "かっこを外すと 4x + 8y。y の項をまとめる。", "4x + 8y − 3y をまとめると 4x + 5y です。");
  poly("polyMixed-basic-13", "polyMixed", "basic", null, "−5(a − b) + 7a を計算しましょう。", "2a+5b",
    "−5 × a と −5 × (−b)。負 × 負 は正。", "−5a + 5b + 7a をまとめると 2a + 5b です。");
  poly("polyMixed-basic-14", "polyMixed", "basic", null, "3m + 2(m − 4n) を計算しましょう。", "5m-8n",
    "かっこが後ろ。2(m − 4n) = 2m − 8n。", "3m + 2m − 8n をまとめると 5m − 8n です。");
  poly("polyAddSub-basic-7", "polyAddSub", "basic", null, "(6x + y) + (−2x + 5y) を計算しましょう。", "4x+6y",
    "かっこの前が + なので、そのまま外す。6x と −2x、y と 5y。", "6x + y − 2x + 5y をまとめると 4x + 6y です。");
  add({ id: "simWord-basic-5", skill: "simWord", level: "basic", format: "word",
    text: "あるクラスは全部で 15 人です。男子は女子より 1 人多いです。男子を x 人、女子を y 人とします。",
    system: [[1, 1, 15], [1, -1, 1]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simWord", text: "連立方程式を作るとどれ？", type: "choice",
        choices: [{ key: "a", label: "x + y = 15、x − y = 1" }, { key: "b", label: "x + y = 15、y − x = 1" }, { key: "c", label: "x − y = 15、x + y = 1" }, { key: "d", label: "x + y = 1、x − y = 15" }],
        answer: "a", hint: "男子の方が多いので、男子 − 女子 = 1。", explanation: "人数の合計で x + y = 15、男子の方が 1 人多いので x − y = 1 です。" },
      { id: "s2", skill: "simElim", text: "連立方程式を解きなさい。", type: "pair",
        fields: [{ key: "x", label: "男子 x（人）" }, { key: "y", label: "女子 y（人）" }], answer: { x: 8, y: 7 },
        hint: "2つの式を足すと y が消える。", explanation: "足すと 2x = 16 なので x = 8、y = 7 です。" }
    ],
    prerequisite_skills: ["simMeaning", "eqWord", "simElim"], skills_used: ["simWord", "simElim"],
    hint: "「全部で」と「〜より多い」で、式を1本ずつ。",
    explanation: "x + y = 15、x − y = 1 を解いて x = 8、y = 7 です。" });
  add({ id: "monoMulDiv-application-3", skill: "monoMulDiv", level: "application", format: "expression",
    text: "(−2x)² × 3y ÷ 6x を、順に計算します。",
    type: "steps",
    steps: [
      { id: "s1", skill: "monoMulDiv", text: "まず (−2x)² を計算すると？", type: "poly", answer: "4x^2", placeholder: "例：6x^2",
        hint: "(−2x) × (−2x)。", explanation: "(−2) × (−2) = 4、x × x = x² なので 4x² です。" },
      { id: "s2", skill: "monoMulDiv", text: "それに 3y をかけて、6x でわると？", type: "poly", answer: "2xy", placeholder: "例：3xy",
        hint: "4x² × 3y = 12x²y。それを 6x でわる。", explanation: "12x²y ÷ 6x = 2xy です。" }
    ],
    prerequisite_skills: ["signed"], skills_used: ["monoMulDiv"],
    hint: "累乗（2乗）を先に計算してから、前から順にかけ算・わり算。",
    explanation: "(−2x)² = 4x²、4x² × 3y = 12x²y、12x²y ÷ 6x = 2xy です。" });

  // --- 今日の学習の時間配分を変えたあとの試算（学校の範囲に長めに時間を使う日）で、また足りなくなったところ ---
  poly("distrib-basic-6", "distrib", "basic", null, "−4(2x − 3) のかっこを外しなさい。", "-8x+12",
    "−4 × 2x と −4 × (−3)。", "−4(2x − 3) = −8x + 12 です。");
  poly("distrib-basic-7", "distrib", "basic", null, "5(a − 2b + 1) のかっこを外しなさい。", "5a-10b+5",
    "3つの項すべてに 5 をかける。", "5(a − 2b + 1) = 5a − 10b + 5 です。");
  add({ id: "simGraph-basic-6", skill: "simGraph", level: "basic", format: "graph",
    text: "グラフの2直線の交点R の座標を答えなさい。",
    figure: { type: "graph", x: [-2, 3, 1], y: [-4, 4, 1], lines: [line(3, -3), line(-1, 1)], points: [{ x: 1, y: 0, label: "R" }] },
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 1, y: 0 },
    lines: [[3, -3], [-1, 1]], prerequisite_skills: ["coord"], skills_used: ["simGraph", "coord"],
    hint: "交点は x 軸の上にある。x 軸の上の点は、y 座標が 0。",
    explanation: "交点R は x 軸の上の右に 1 の点なので (1, 0) です。" });
  add({ id: "simGraph-basic-7", skill: "simGraph", level: "basic", format: "expression",
    text: "連立方程式 x + y = 3、x − y = 1 の解を、グラフで表すとどこ？",
    type: "choice", choices: [{ key: "a", label: "2直線 x + y = 3、x − y = 1 の交点" }, { key: "b", label: "直線 x + y = 3 と y 軸の交点" }, { key: "c", label: "2直線の傾きが等しいところ" }, { key: "d", label: "原点" }], answer: "a",
    prerequisite_skills: ["simMeaning", "coord"], skills_used: ["simGraph", "simMeaning"],
    hint: "解は、2つの式の両方をみたす (x, y)。グラフでは、2本の直線の両方の上にある点。",
    explanation: "2つの式の両方をみたす点は、2直線の交点です。連立方程式の解 ＝ 交点の座標です。" });
  eq("eqProperty-standard-3", "eqProperty", "standard", null, "方程式 (3/4)x = −6 を解きましょう。", -8,
    "両辺に 4/3 をかける。", "x = −6 × 4/3 = −8 です。", { prerequisite_skills: ["signed"] });
  eq("eqProperty-standard-4", "eqProperty", "standard", null, "方程式 −0.2x = 1.4 を解きましょう。", -7,
    "両辺を −0.2 でわる（両辺に −5 をかける）。", "x = 1.4 ÷ (−0.2) = −7 です。", { prerequisite_skills: ["signed"] });
  add({ id: "substitution-standard-6", skill: "substitution", level: "standard", format: "expression",
    text: "一次関数 y = −2x + 5 で、y = −3 のときの x の値は？", type: "number", answer: 4,
    prerequisite_skills: ["algebra", "transpose"], skills_used: ["substitution", "transpose"],
    hint: "y に −3 を入れると −3 = −2x + 5。この方程式を解く。", explanation: "−3 = −2x + 5 → 2x = 8 → x = 4 です。" });
  add({ id: "substitution-standard-7", skill: "substitution", level: "standard", format: "expression",
    text: "一次関数 y = (1/2)x + 3 で、x = −4 のときの y の値は？", type: "number", answer: 1,
    prerequisite_skills: ["algebra", "signed"], skills_used: ["substitution", "algebra"],
    hint: "(1/2) × (−4) を先に計算する。", explanation: "y = −2 + 3 = 1 です。" });
  poly("likeTerms-retention-4", "likeTerms", "retention", null, "−b + 7b − 11b を計算しましょう。", "-5b",
    "係数どうし −1 + 7 − 11 を計算する。", "−1 + 7 − 11 = −5 なので −5b です。", { evidence_level: "basic" });
  add({ id: "simGraph-basic-8", skill: "simGraph", level: "basic", format: "graph",
    text: "グラフの2直線の交点S の座標を答えなさい。",
    figure: { type: "graph", x: [-4, 2, 1], y: [-1, 5, 1], lines: [line(1, 4), line(-1, 0)], points: [{ x: -2, y: 2, label: "S" }] },
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: -2, y: 2 },
    lines: [[1, 4], [-1, 0]], prerequisite_skills: ["coord", "signed"], skills_used: ["simGraph", "coord"],
    hint: "交点は原点から左にいくつ、上にいくつ？",
    explanation: "交点S は左に 2、上に 2 なので (−2, 2) です。" });
  add({ id: "simGraph-standard-4", skill: "simGraph", level: "standard", format: "expression",
    text: "2直線 y = 3x + 1 と y = x + 5 の交点の座標を、計算で求めなさい。",
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 2, y: 7 },
    lines: [[3, 1], [1, 5]], prerequisite_skills: ["simSubst", "transpose"], skills_used: ["simGraph", "simSubst"],
    hint: "y が同じなので 3x + 1 = x + 5。", explanation: "3x + 1 = x + 5 → 2x = 4 → x = 2。y = 7。交点は (2, 7) です。" });
  add({ id: "simGraph-standard-5", skill: "simGraph", level: "standard", format: "expression",
    text: "2直線 y = −x + 9 と y = 2x − 3 の交点の座標を、計算で求めなさい。",
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 4, y: 5 },
    lines: [[-1, 9], [2, -3]], prerequisite_skills: ["simSubst", "transpose"], skills_used: ["simGraph", "simSubst"],
    hint: "−x + 9 = 2x − 3 を解く。", explanation: "−x + 9 = 2x − 3 → −3x = −12 → x = 4。y = 5。交点は (4, 5) です。" });
  word("simWord-standard-3", "standard", null, "1冊120円のノートと1本60円のペンを合わせて7つ買ったら、代金は600円でした。ノートを x 冊、ペンを y 本として、それぞれの数を求めましょう。",
    [{ key: "x", label: "ノート x（冊）" }, { key: "y", label: "ペン y（本）" }], [[1, 1, 7], [120, 60, 600]], [3, 4],
    "個数の関係と、代金の関係で式を2つ作ります。", "x + y = 7、120x + 60y = 600。上を 60 倍した 60x + 60y = 420 を引くと 60x = 180 なので x = 3、y = 4 です。");
  add({ id: "simGraph-standard-6", skill: "simGraph", level: "standard", format: "graph",
    text: "直線ℓ：y = x + 2、直線m：y = −x + 5 です。グラフでは交点を正確に読みとれません。計算で交点の座標を求めなさい。",
    figure: { type: "graph", x: [-1, 5, 1], y: [-1, 6, 1], lines: [line(1, 2), line(-1, 5)] },
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 1.5, y: 3.5 },
    lines: [[1, 2], [-1, 5]], prerequisite_skills: ["simElim", "coord"], skills_used: ["simGraph", "simElim"],
    hint: "2つの式を足すと 2y = 7。分数や小数で答えてもよい。", explanation: "足すと 2y = 7 なので y = 7/2（3.5）。x = y − 2 = 3/2（1.5）。交点は (3/2, 7/2) です。" });
  add({ id: "simGraph-application-2", skill: "simGraph", level: "application", format: "graph",
    text: "グラフの直線ℓ と直線m の交点の座標を、順に求めます。",
    figure: { type: "graph", x: [-1, 5, 1], y: [-1, 5, 1], lines: [line(-1, 4), line(0.5, 1)], points: [{ x: 0, y: 4 }, { x: 4, y: 0 }, { x: 0, y: 1 }, { x: 4, y: 3 }] },
    type: "steps",
    steps: [
      { id: "s1", skill: "form", text: "グラフから読みとった、直線ℓ（右下がり）と直線m（右上がり）の式の組はどれ？", type: "choice",
        choices: [{ key: "a", label: "ℓ：y = −x + 4、m：y = (1/2)x + 1" }, { key: "b", label: "ℓ：y = −x + 4、m：y = 2x + 1" }, { key: "c", label: "ℓ：y = x + 4、m：y = (1/2)x + 1" }, { key: "d", label: "ℓ：y = −4x + 4、m：y = (1/2)x + 1" }],
        answer: "a", hint: "m は右に 2 進むと上に 1。傾きは 1/2。", explanation: "ℓ は (0, 4) を通り傾き −1、m は (0, 1) を通り傾き 1/2 です。" },
      { id: "s2", skill: "simElim", text: "2つの式を連立方程式として解くと、x の値は？", type: "number", answer: 2,
        hint: "−x + 4 = (1/2)x + 1。両辺を 2 倍すると分数が消える。", explanation: "−2x + 8 = x + 2 → −3x = −6 → x = 2 です。" },
      { id: "s3", skill: "simGraph", text: "交点の座標は？", type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 2, y: 2 },
        hint: "x = 2 を y = −x + 4 に代入する。", explanation: "y = −2 + 4 = 2。交点は (2, 2) です。" }
    ],
    lines: [[-1, 4], [0.5, 1]], prerequisite_skills: ["form", "simElim", "coord"], skills_used: ["form", "simElim", "simGraph"],
    hint: "グラフから式を読む → 連立方程式を解く → 交点の座標、の順に。",
    explanation: "ℓ：y = −x + 4、m：y = (1/2)x + 1。解くと x = 2、y = 2。交点は (2, 2) です。" });
  add({ id: "simGraph-basic-9", skill: "simGraph", level: "basic", format: "graph",
    text: "グラフの2直線の交点T の座標を答えなさい。",
    figure: { type: "graph", x: [-1, 4, 1], y: [-2, 6, 1], lines: [line(2, -1), line(-1, 5)], points: [{ x: 2, y: 3, label: "T" }] },
    type: "pair", fields: [{ key: "x", label: "x 座標" }, { key: "y", label: "y 座標" }], answer: { x: 2, y: 3 },
    lines: [[2, -1], [-1, 5]], prerequisite_skills: ["coord"], skills_used: ["simGraph", "coord"],
    hint: "交点から x 軸・y 軸へまっすぐ目もりを読む。", explanation: "交点T は右に 2、上に 3 なので (2, 3) です。" });
  add({ id: "simGraph-basic-10", skill: "simGraph", level: "basic", format: "expression",
    text: "2直線ℓ・m のグラフの交点の座標は (3, −1) です。ℓ と m の式を連立方程式として解くと、解は？",
    type: "pair", fields: [{ key: "x", label: "x =" }, { key: "y", label: "y =" }], answer: { x: 3, y: -1 },
    prerequisite_skills: ["simMeaning", "coord"], skills_used: ["simGraph", "simMeaning"],
    hint: "交点の座標 ＝ 連立方程式の解。", explanation: "交点 (3, −1) は2つの式の両方をみたすので、解は x = 3、y = −1 です。" });
  add({ id: "simWord-application-3", skill: "simWord", level: "application", format: "word",
    text: "りんご3個とみかん2個で540円、りんご1個とみかん4個で380円でした。りんご1個を x 円、みかん1個を y 円とします。",
    system: [[3, 2, 540], [1, 4, 380]],
    type: "steps",
    steps: [
      { id: "s1", skill: "simWord", text: "連立方程式を作るとどれ？", type: "choice",
        choices: [{ key: "a", label: "3x + 2y = 540、x + 4y = 380" }, { key: "b", label: "3x + 2y = 380、x + 4y = 540" }, { key: "c", label: "x + y = 540、x + y = 380" }, { key: "d", label: "2x + 3y = 540、4x + y = 380" }],
        answer: "a", hint: "りんごの個数 × x ＋ みかんの個数 × y ＝ 代金。", explanation: "1つ目の買い方から 3x + 2y = 540、2つ目から x + 4y = 380 です。" },
      { id: "s2", skill: "simElim", text: "連立方程式を解きなさい。", type: "pair",
        fields: [{ key: "x", label: "りんご x（円）" }, { key: "y", label: "みかん y（円）" }], answer: { x: 140, y: 60 },
        hint: "上の式を 2 倍して、下の式を引くと y が消える。", explanation: "6x + 4y = 1080 から x + 4y = 380 を引くと 5x = 700、x = 140。y = 60 です。" }
    ],
    prerequisite_skills: ["simMeaning", "eqWord", "simElim"], skills_used: ["simWord", "simElim"],
    hint: "2つの買い方それぞれで、式を1本ずつ。",
    explanation: "3x + 2y = 540、x + 4y = 380 を解いて x = 140、y = 60。りんご140円、みかん60円です。" });
  poly("distrib-basic-8", "distrib", "basic", null, "6(x − 4) のかっこを外しなさい。", "6x-24",
    "6 × x と 6 × (−4)。", "6(x − 4) = 6x − 24 です。");
  poly("distrib-basic-9", "distrib", "basic", null, "−3(−a + 2b) のかっこを外しなさい。", "3a-6b",
    "−3 × (−a) は +3a。", "−3(−a + 2b) = 3a − 6b です。");
  eq("transpose-standard-6", "transpose", "standard", null, "方程式 9 − 2x = x + 3 を解きましょう。", 2,
    "x の項を右辺に集めると考えやすい：9 − 3 = x + 2x。", "6 = 3x → x = 2 です。",
    { prerequisite_skills: ["signed", "likeTerms", "eqProperty"], skills_used: ["transpose", "likeTerms", "eqProperty"] });
  // 移項 標準（図形の角を学校の単元にしたあと、10日試算で不足が出たので補強）
  eq("transpose-standard-7", "transpose", "standard", null, "方程式 −3x − 4 = x + 8 を解きましょう。", -3,
    "x の項を左辺、数を右辺に集める：−3x − x = 8 + 4。", "−4x = 12 → x = −3 です。",
    { prerequisite_skills: ["signed", "likeTerms", "eqProperty"], skills_used: ["transpose", "likeTerms", "eqProperty"] });
  eq("transpose-standard-8", "transpose", "standard", null, "方程式 −x + 10 = 4x − 5 を解きましょう。", 3,
    "x の項を右辺に集めると、x の係数が正になる：10 + 5 = 4x + x。", "15 = 5x → x = 3 です。",
    { prerequisite_skills: ["signed", "likeTerms", "eqProperty"], skills_used: ["transpose", "likeTerms", "eqProperty"] });
  sim("simParen-basic-6", "simParen", "basic", null, [[5, -5, 10], [1, 1, 6]], [4, 2],
    "上の式は両辺を 5 でわると x − y = 2。", "x − y = 2 と x + y = 6 を足すと 2x = 8、x = 4。y = 2 です。",
    { shown: ["5(x − y) = 10", "x + y = 6"] });
  add({ id: "simFraction-basic-5", skill: "simFraction", level: "basic", format: "expression",
    text: "式 x/4 − y/2 = 1 の両辺を 4 倍して、分数をなくした式はどれ？",
    type: "choice", choices: [{ key: "a", label: "x − 2y = 4" }, { key: "b", label: "x − 2y = 1" }, { key: "c", label: "x − y/2 = 4" }, { key: "d", label: "4x − 2y = 4" }], answer: "a",
    prerequisite_skills: ["eqFraction", "distrib"],
    hint: "x/4 × 4 = x、y/2 × 4 = 2y、右辺も 4 倍。",
    explanation: "x/4 × 4 = x、y/2 × 4 = 2y、1 × 4 = 4。x − 2y = 4 です。" });
  poly("polyAddSub-retention-6", "polyAddSub", "retention", null, "(−3a + 8) − (5a − 2) を計算しましょう。", "-8a+10",
    "2つ目のかっこは −5a + 2 になる。", "−3a + 8 − 5a + 2 をまとめると −8a + 10 です。", { evidence_level: "standard" });
  solveY("eqTransform-standard-9", "standard", "2y − 6x = 8 を y について解きなさい。", 3, 4,
    "−6x を右辺に移項して 2y = 6x + 8。両辺を 2 でわる。", "2y = 6x + 8 → y = 3x + 4 です。",
    { prerequisite_skills: ["eqProperty", "transpose"] });

  // =====================================================================
  // 中2 図形の角（平行線と角・多角形の角）— 描画方式を固めるための代表図 6問
  //   図は js/geometry.js が figure（type: "geometry"）から描く。描いた角度は与えた角度・答えから 8° 以上ずらし、
  //   鋭角・鈍角の分類と、平行・一直線・直角はそのまま（tests/geometry.test.js で確かめる）。
  //   relation：答えを機械的に検算する論理関係。根拠を聞く小問は aspect: "reason"（理由の理解として別に記録）
  // =====================================================================
  function polar(c, deg, r) { var t = deg * Math.PI / 180; return [Math.round((c[0] + r * Math.cos(t)) * 10) / 10, Math.round((c[1] - r * Math.sin(t)) * 10) / 10]; }
  var REASON_JA = {
    vertical: "対頂角は等しい", straight: "一直線の角は180°", around: "1点のまわりの角は360°",
    corresponding: "平行線の同位角は等しい", alternate: "平行線の錯角は等しい", triangleSum: "三角形の内角の和は180°",
    exterior: "三角形の外角は、となり合わない2つの内角の和に等しい", polygonSum: "n角形の内角の和は 180° ×（n − 2）", exteriorSum: "多角形の外角の和は360°"
  };
  // 角度の値を答える小問（value 面）
  function angleStep(id, skill, text, answer, hint, explanation) {
    return { id: id, skill: skill, aspect: "value", text: text, type: "number", answer: answer, answer_display: answer + "°", placeholder: "例：65",
      hint: hint, explanation: explanation };
  }
  // 根拠を選ぶ小問（reason 面）。選択肢は1つだけ正しい（複数選択は使わない）
  function reasonStep(id, skill, answer, keys, explanation) {
    return { id: id, skill: skill, aspect: "reason", text: "そう言える理由はどれ？", type: "choice", answer: answer,
      choices: keys.map(function (k) { return { key: k, label: REASON_JA[k] }; }), hint: "x を求めるときに使った図形の性質はどれ？", explanation: explanation };
  }

  // ① 交わる2直線と対頂角
  (function () {
    var O = [160, 120];
    add({ id: "lineAngles-basic-1", skill: "lineAngles", level: "basic", format: "figure",
      text: "2つの直線が点Oで交わっています。x の大きさを求めなさい。",
      figure: { type: "geometry",
        points: { O: O, A: polar(O, 200, 125), B: polar(O, 20, 125), C: polar(O, 144, 105), D: polar(O, -36, 105) },
        lines: [{ id: "p", through: ["A", "B"], extend: 8 }, { id: "q", through: ["C", "D"], extend: 8 }],
        angles: [{ id: "g", at: "O", from: "C", to: "B", value: 112 }, { id: "x", at: "O", from: "A", to: "D", unknown: true }],
        highlight: [{ angle: "x" }] },
      relation: { type: "equalAngles", source: "g", target: "answer", answer: "s1" },
      type: "steps",
      steps: [
        angleStep("s1", "lineAngles", "x は何度？", 112, "x と 112° は、向かい合っている角。", "x は 112° の角と向かい合う対頂角なので 112° です。"),
        reasonStep("s2", "lineAngles", "vertical", ["vertical", "straight", "corresponding", "alternate"], "向かい合う角（対頂角）は等しくなります。")
      ],
      hint: "2本の直線が交わると、向かい合う角ができます。",
      explanation: "x と 112° は対頂角です。対頂角は等しいので x = 112° です。" });
  })();

  // ② 平行線と1本の横切る直線（同位角）
  (function () {
    var c = [140, 120];
    add({ id: "parallelAngles-basic-1", skill: "parallelAngles", level: "basic", format: "figure",
      text: "直線ℓとmは平行です。x の大きさを求めなさい。",
      figure: { type: "geometry",
        points: { L1: [20, 70], L2: [300, 70], M1: [20, 170], M2: [300, 170], T1: polar(c, 62, 112), T2: polar(c, 242, 112),
          P: { intersect: ["t", "l"] }, Q: { intersect: ["t", "m"] } },
        lines: [{ id: "l", through: ["L1", "L2"], label: "ℓ", extend: 0 }, { id: "m", through: ["M1", "M2"], label: "m", extend: 0 },
          { id: "t", through: ["T2", "T1"], extend: 0 }],
        labels: ["P", "Q"],
        parallel: [{ lines: ["l", "m"], marks: 1 }],
        angles: [{ id: "a", at: "P", from: "L2", to: "T1", value: 72 }, { id: "x", at: "Q", from: "M2", to: "T1", unknown: true }],
        highlight: [{ angle: "x" }] },
      relation: { type: "equalAngles", source: "a", target: "answer", answer: "s1" },
      type: "steps",
      steps: [
        angleStep("s1", "parallelAngles", "x は何度？", 72, "72° の角と x は、それぞれの交点で同じ位置にある。", "x は 72° の角の同位角です。ℓ // m なので x = 72° です。"),
        reasonStep("s2", "parallelAngles", "corresponding", ["corresponding", "alternate", "vertical", "straight"], "同じ位置にある角（同位角）です。ℓとmが平行なので等しくなります。")
      ],
      hint: "交点PとQで、同じ位置にある角をくらべよう。",
      explanation: "x と 72° は同位角です。平行線の同位角は等しいので x = 72° です。" });
  })();

  // ③ 三角形の内角
  (function () {
    var B = [40, 200], C = [230, 200];
    add({ id: "triangleSum-basic-1", skill: "triangleSum", level: "basic", format: "figure",
      text: "△ABCで、x の大きさを求めなさい。",
      figure: { type: "geometry",
        points: { B: B, C: C, Bd: polar(B, 65, 100), Cd: polar(C, 110, 100), A: { intersect: [["B", "Bd"], ["C", "Cd"]] } },
        polygons: [["A", "B", "C"]],
        labels: ["A", "B", "C"],
        angles: [{ id: "b", at: "B", from: "A", to: "C", value: 55 }, { id: "c", at: "C", from: "A", to: "B", value: 60 },
          { id: "x", at: "A", from: "B", to: "C", unknown: true }],
        highlight: [{ angle: "x" }] },
      relation: { type: "angleSum", values: ["b", "c", "answer"], total: 180, answer: "s1" },
      type: "steps",
      steps: [
        angleStep("s1", "triangleSum", "x は何度？", 65, "3つの角を合わせると何度？", "180 − (55 + 60) = 65 なので x = 65° です。"),
        reasonStep("s2", "triangleSum", "triangleSum", ["triangleSum", "exterior", "straight", "around"], "三角形の3つの内角の和は180°です。")
      ],
      hint: "三角形の3つの角の和を使おう。",
      explanation: "三角形の内角の和は180°なので、x = 180 − 55 − 60 = 65° です。" });
  })();

  // ④ 三角形の外角
  (function () {
    var B = [40, 190], C = [190, 190];
    add({ id: "exteriorAngle-basic-1", skill: "exteriorAngle", level: "basic", format: "figure",
      text: "△ABCの辺BCをCの方へのばし、その上に点Dをとりました。x の大きさを求めなさい。",
      figure: { type: "geometry",
        points: { B: B, C: C, D: [280, 190], Bd: polar(B, 60, 100), Cd: polar(C, 100, 100), A: { intersect: [["B", "Bd"], ["C", "Cd"]] } },
        polygons: [["A", "B", "C"]],
        segments: [["C", "D"]],
        labels: ["A", "B", "C", "D"],
        straight: [["B", "C", "D"]],
        angles: [{ id: "a", at: "A", from: "B", to: "C", value: 50 }, { id: "b", at: "B", from: "A", to: "C", value: 70 },
          { id: "x", at: "C", from: "A", to: "D", unknown: true }],
        highlight: [{ angle: "x" }] },
      relation: { type: "angleSum", values: ["a", "b"], total: "answer", answer: "s1" },
      type: "steps",
      steps: [
        angleStep("s1", "exteriorAngle", "x は何度？", 120, "x は、となり合わない2つの内角（∠A と ∠B）とどんな関係？", "50 + 70 = 120 なので x = 120° です。"),
        reasonStep("s2", "exteriorAngle", "exterior", ["exterior", "triangleSum", "straight", "corresponding"], "三角形の外角は、となり合わない2つの内角の和に等しくなります。")
      ],
      hint: "外角は、となり合わない2つの内角の和。",
      explanation: "x は△ABCの外角なので、となり合わない内角の和 50 + 70 = 120° です。" });
  })();

  // ⑤ 多角形（五角形の内角）
  add({ id: "polygonInterior-basic-1", skill: "polygonInterior", level: "basic", format: "figure",
    text: "五角形ABCDEで、x の大きさを求めなさい。",
    figure: { type: "geometry",
      points: { A: [60, 260], B: [210, 260], C: [251, 147.2], D: [151.6, 80.1], E: [31.1, 184.8] },
      polygons: [["A", "B", "C", "D", "E"]],
      angles: [{ id: "a", at: "A", from: "E", to: "B", value: 125 }, { id: "b", at: "B", from: "A", to: "C", value: 100 },
        { id: "c", at: "C", from: "B", to: "D", value: 120 }, { id: "d", at: "D", from: "C", to: "E", value: 95 },
        { id: "x", at: "E", from: "D", to: "A", unknown: true }],
      highlight: [{ angle: "x" }] },
    // 最後の relation の答えが、図の x
    relation: [{ type: "polygonInterior", n: 5, sum: "answer", answer: "s1" },
      { type: "angleSum", values: ["a", "b", "c", "d", "answer"], total: 540, answer: "s2" }],
    type: "steps",
    steps: [
      angleStep("s1", "polygonInterior", "五角形の内角の和は何度？", 540, "五角形は、1つの頂点から対角線を引くと三角形がいくつできる？", "180 × (5 − 2) = 540° です。"),
      angleStep("s2", "polygonInterior", "x は何度？", 100, "540 から、わかっている4つの角をひく。", "540 − (125 + 100 + 120 + 95) = 100 なので x = 100° です。")
    ],
    prerequisite_skills: ["triangleSum"],
    hint: "n角形の内角の和は 180° ×（n − 2）。",
    explanation: "五角形の内角の和は 180 × 3 = 540°。x = 540 − 440 = 100° です。" });

  // ⑥ x を含む角度（一直線の角を方程式で）
  (function () {
    var O = [160, 170];
    add({ id: "angleEq-standard-1", skill: "angleEq", level: "standard", format: "figure",
      text: "点A、O、Bは一直線上にあります。x の値を求めなさい。",
      figure: { type: "geometry",
        points: { O: O, A: [30, 170], B: [290, 170], C: polar(O, 58, 130) },
        lines: [{ id: "ab", through: ["A", "B"], extend: 8 }],
        segments: [["O", "C"]],
        straight: [["A", "O", "B"]],
        angles: [{ id: "e1", at: "O", from: "A", to: "C", expr: { a: 2, b: 10 } }, { id: "e2", at: "O", from: "C", to: "B", expr: { a: 1, b: 20 } }] },
      relation: { type: "angleSum", values: ["e1", "e2"], total: 180, answer: "s1" },
      type: "steps",
      steps: [
        { id: "s1", skill: "angleEq", aspect: "value", text: "x の値は？", type: "number", answer: 50, placeholder: "例：30",
          hint: "(2x + 10) + (x + 20) = 180 を解く。", explanation: "3x + 30 = 180 → 3x = 150 → x = 50 です。" },
        reasonStep("s2", "angleEq", "straight", ["straight", "vertical", "around", "triangleSum"], "2つの角を合わせると一直線（180°）になります。")
      ],
      hint: "2つの角を合わせると何度になる？",
      explanation: "(2x + 10) + (x + 20) = 180 より 3x = 150、x = 50 です。" });
  })();

  // =====================================================================
  // 中2 図形の角：本番の問題バンク
  //   図はすべて「描く角度」を本当の角度から 9° 以上ずらして作る（鋭角は 80° 以下・鈍角は 100° 以上で描き、分類を見た目でも保つ）。
  //   三角形・多角形・一直線に並ぶ角は、和を変えずにずらすので、描いた図そのものも図形として正しい
  //   （tests/geometry.test.js：描いた内角の和・対頂角・同位角・錯角・relation を図の上でも確かめる）。
  // =====================================================================
  REASON_JA.auxParallel = "平行な補助線を引くと、錯角が等しい";
  var GEO_SHIFTS = [12, -12, 10, -10, 14, -14, 16, -16, 18, -18, 20, -20];
  function r1(n) { return Math.round(n * 10) / 10; }
  function okDraw(truth, d) {
    if (truth === 90) return d === 90;
    return Math.abs(d - truth) >= 9 && (truth < 90 ? d >= 18 && d <= 80 : d >= 100 && d <= 160);
  }
  // 1つの角の描く大きさ
  function drawOne(truth, seed) {
    for (var i = 0; i < GEO_SHIFTS.length; i++) { var d = truth + GEO_SHIFTS[(i + (seed || 0)) % GEO_SHIFTS.length]; if (okDraw(truth, d)) return d; }
    throw new Error("描く角度が決まりません：" + truth);
  }
  // 和を変えずに、全部の角をずらす（三角形・多角形・一直線・1回転）
  function drawSum(truths, seed) {
    var n = truths.length, out = [];
    function dfs(i, acc) {
      if (i === n - 1) { var d = truths[i] - acc; if (okDraw(truths[i], d) && Math.abs(d - truths[i]) <= 30) { out[i] = d; return true; } return false; }
      if (truths[i] === 90) { out[i] = 90; return dfs(i + 1, acc); }
      for (var k = 0; k < GEO_SHIFTS.length; k++) {
        var s = GEO_SHIFTS[(k + (seed || 0) + i) % GEO_SHIFTS.length], d = truths[i] + s;
        if (!okDraw(truths[i], d)) continue;
        out[i] = d;
        if (dfs(i + 1, acc + s)) return true;
      }
      return false;
    }
    if (!dfs(0, 0)) throw new Error("描く角度が決まりません：" + truths.join(","));
    return out;
  }
  // 多角形の頂点：内角（描く大きさ）から、辺の長さがなるべくそろうように閉じる。size に収める。
  // はじめの n − 2 辺の長さを lens の 0.6〜1.4 倍でためし、最後の2辺は閉じるように決める
  function polyPoints(names, interiors, lens, rot, size) {
    var n = names.length, rad = Math.PI / 180;
    var heads = [rot || 0];
    for (var i = 1; i < n; i++) heads.push(heads[i - 1] + 180 - interiors[i]);
    var dir = heads.map(function (h) { return [Math.cos(h * rad), Math.sin(h * rad)]; });
    function close(L) {
      var p = [0, 0];
      for (var j = 0; j < n - 2; j++) p = [p[0] + L[j] * dir[j][0], p[1] + L[j] * dir[j][1]];
      var v1 = dir[n - 2], v2 = dir[n - 1], det = v1[0] * v2[1] - v1[1] * v2[0];
      return L.slice(0, n - 2).concat([(-p[0] * v2[1] + p[1] * v2[0]) / det, (-v1[0] * p[1] + v1[1] * p[0]) / det]);
    }
    var MULT = [1, 0.8, 1.2, 0.6, 1.4], best = null, bestR = Infinity;
    (function search(j, L) {
      if (j === n - 2) {
        var all = close(L), mn = Math.min.apply(null, all), mx = Math.max.apply(null, all);
        if (mn > 0 && mx / mn < bestR) { bestR = mx / mn; best = all; }
        return;
      }
      MULT.forEach(function (m) { search(j + 1, L.concat([lens[j] * m])); });
    })(0, []);
    if (!best || bestR > 3.5) throw new Error("多角形が閉じません：" + names.join(""));
    var pts = [[0, 0]], q = [0, 0];
    for (i = 0; i < n - 1; i++) { q = [q[0] + best[i] * dir[i][0], q[1] + best[i] * dir[i][1]]; pts.push(q); }
    var xs = pts.map(function (z) { return z[0]; }), ys = pts.map(function (z) { return z[1]; });
    var k = (size || 230) / Math.max(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys));
    var minX = Math.min.apply(null, xs), maxY = Math.max.apply(null, ys), out = {};
    names.forEach(function (nm, j) { out[nm] = [r1(40 + (pts[j][0] - minX) * k), r1(40 + (maxY - pts[j][1]) * k)]; });
    return out;
  }
  // 2つの角を同時にずらす。derive(d1, d2) は、そこから決まる角の [本当, 描く] の組。ok(d1, d2) はほかの条件（図の幅など）
  function drawTwo(t1, t2, derive, ok, seed) {
    for (var i = 0; i < GEO_SHIFTS.length; i++) for (var j = 0; j < GEO_SHIFTS.length; j++) {
      var d1 = t1 + GEO_SHIFTS[(i + (seed || 0)) % GEO_SHIFTS.length], d2 = t2 + GEO_SHIFTS[(j + (seed || 0)) % GEO_SHIFTS.length];
      if (!okDraw(t1, d1) || !okDraw(t2, d2)) continue;
      if (!derive(d1, d2).every(function (p) { return okDraw(p[0], p[1]); })) continue;
      if (ok && !ok(d1, d2)) continue;
      return [d1, d2];
    }
    throw new Error("描く角度が決まりません：" + t1 + "," + t2);
  }
  // 平行線にかかる三角形で、B・C が直線の範囲（x 25〜315）に入るか
  function hangOk(g, h) { var rad = Math.PI / 180; return 170 - 140 / Math.tan(g * rad) >= 30 && 170 + 140 / Math.tan(h * rad) <= 310; }
  function ang(id, at, from, to, extra) { var a = { id: id, at: at, from: from, to: to }; for (var k in extra) a[k] = extra[k]; return a; }
  function dirDeg(p, q) { return Math.atan2(-(q[1] - p[1]), q[0] - p[0]) * 180 / Math.PI; }
  // 平行線ℓ・m（tilt を付けると平行でない2直線）と、横切る直線 t。theta：ℓ の向きから t までの描く角
  function parFig(theta, o) {
    o = o || {};
    var phi = o.phi || 0, c = o.c || [170, 130], gap = o.gap || 100, half = o.half || 150;
    var cl = polar(c, phi + 90, gap / 2), cm = polar(c, phi - 90, gap / 2), mphi = phi + (o.tilt || 0);
    var reach = gap / 2 / Math.sin(theta * Math.PI / 180) + 38;
    var fig = { type: "geometry",
      points: { L1: polar(cl, phi + 180, half), L2: polar(cl, phi, half), M1: polar(cm, mphi + 180, half), M2: polar(cm, mphi, half),
        T1: polar(c, phi + theta, reach), T2: polar(c, phi + theta + 180, reach), P: { intersect: ["t", "l"] }, Q: { intersect: ["t", "m"] } },
      lines: [{ id: "l", through: ["L1", "L2"], label: "ℓ", extend: 0 }, { id: "m", through: ["M1", "M2"], label: "m", extend: 0 }, { id: "t", through: ["T2", "T1"], extend: 0 }],
      labels: o.noPoints ? [] : ["P", "Q"], angles: [] };
    if (!o.tilt) fig.parallel = [{ lines: ["l", "m"], marks: 1 }];
    return fig;
  }
  // 平行線の図の角：P または Q の、ur（右上）ul（左上）dl（左下）dr（右下）
  function quad(id, V, pos, extra) {
    var r = V === "P" ? "L2" : "M2", l = V === "P" ? "L1" : "M1";
    var ft = { ur: [r, "T1"], ul: ["T1", l], dl: [l, "T2"], dr: ["T2", r] }[pos];
    return ang(id, V, ft[0], ft[1], extra);
  }
  // 平行線の図で、その位置の角の本当の大きさ（ur・dl は theta、ul・dr は 180 − theta）
  function quadTruth(theta, pos) { return pos === "ur" || pos === "dl" ? theta : 180 - theta; }
  // 同位角・錯角の名前の図：8つの角に記号（a〜h、または labels）
  function namesFig(theta, o) {
    o = o || {};
    var fig = parFig(theta, { tilt: o.tilt == null ? 8 : o.tilt, phi: o.phi, half: o.half, noPoints: true });
    var L = o.labels || ["a", "b", "c", "d", "e", "f", "g", "h"], ids = ["a", "b", "c", "d", "e", "f", "g", "h"], pos = ["ur", "ul", "dl", "dr"];
    ids.forEach(function (id, i) { fig.angles.push(quad(id, i < 4 ? "P" : "Q", pos[i % 4], { label: L[i] })); });
    fig.note = false;
    return fig;
  }
  // 交わる2直線（点O）。a1：直線ABの向き、theta：∠BOC の描く大きさ
  function crossFig(a1, theta, o) {
    o = o || {};
    var O = o.O || [170, 120], R = o.r || 125;
    return { type: "geometry", points: { O: O, A: polar(O, a1 + 180, R), B: polar(O, a1, R), C: polar(O, a1 + theta, R * 0.85), D: polar(O, a1 + theta + 180, R * 0.85) },
      lines: [{ id: "p", through: ["A", "B"], extend: 8 }, { id: "q", through: ["C", "D"], extend: 8 }], angles: [] };
  }
  // 一直線AB上の点Oから出る半直線。rays：{ C: 向き, D: 向き }（右が 0°）
  function rayFig(rays) {
    var O = [170, 175], pts = { O: O, A: [35, 175], B: [305, 175] }, segs = [];
    Object.keys(rays).forEach(function (k) { pts[k] = polar(O, rays[k], 125); segs.push(["O", k]); });
    return { type: "geometry", points: pts, lines: [{ id: "ab", through: ["A", "B"], extend: 8 }], segments: segs, straight: [["A", "O", "B"]], angles: [] };
  }
  // 三角形ABC（B・C を底辺に、A が上）。angles：描く内角 { A, B, C }。rot：回転、ext：のばす辺 { D: ["B","C"] } など
  function triFig(d, o) {
    o = o || {};
    var pts = polyPoints(["B", "C", "A"], [d.B, d.C, d.A], [220], o.rot || 0, o.size || 210);
    var fig = { type: "geometry", points: pts, polygons: [["A", "B", "C"]], labels: ["A", "B", "C"], angles: [], segments: [], straight: [] };
    Object.keys(o.ext || {}).forEach(function (k) {
      var e = o.ext[k];
      fig.points[k] = { along: [e[0], e[1], o.extLen || 1.4] };
      fig.segments.push([e[1], k]); fig.labels.push(k); fig.straight.push([e[0], e[1], k]);
    });
    return fig;
  }
  // 多角形と、その外角（各頂点で、前の辺をのばす）
  function polyFig(names, drawnInteriors, lens, o) {
    o = o || {};
    var fig = { type: "geometry", points: polyPoints(names, drawnInteriors, lens, o.rot || 0, o.size || 220), polygons: [names], angles: [] };
    if (o.ext) {
      fig.segments = []; fig.labels = names.slice();
      names.forEach(function (v, i) {
        var prev = names[(i - 1 + names.length) % names.length], key = v.toLowerCase() + "x";
        fig.points[key] = { along: [prev, v, o.extLen || 1.35] };
        fig.segments.push([v, key]);
      });
    }
    return fig;
  }
  // 平行線の間で折れ曲がる線（くの字）：ℓ 上の P、m 上の Q、折れ曲がりの点 R。a・b：描く角（ℓ・m と線分のなす角）。left：左向きに折れる
  function zFig(a, b, o) {
    o = o || {};
    var left = !!o.left, Rx = left ? 100 : 240, rad = Math.PI / 180;
    var R = [Rx, 130], dxP = 70 / Math.tan(a * rad), dxQ = 70 / Math.tan(b * rad);
    var P = [r1(left ? Rx + dxP : Rx - dxP), 60], Q = [r1(left ? Rx + dxQ : Rx - dxQ), 200];
    var fig = { type: "geometry",
      points: { L1: [20, 60], L2: [320, 60], M1: [20, 200], M2: [320, 200], P: P, Q: Q, R: R },
      lines: [{ id: "l", through: ["L1", "L2"], label: "ℓ", extend: 0 }, { id: "m", through: ["M1", "M2"], label: "m", extend: 0 }],
      segments: [["P", "R"], ["Q", "R"]], parallel: [{ lines: ["l", "m"], marks: 1 }], labels: ["P", "Q", "R"], angles: [] };
    var side = left ? "L1" : "L2", mside = left ? "M1" : "M2";
    fig.angles.push(ang("a", "P", side, "R"), ang("b", "Q", mside, "R"), ang("r", "R", "P", "Q"));
    return fig;
  }
  // 平行線にかかる三角形：A は ℓ（上）の上、B・C は m（下）の上。g：ℓ と AB のなす角（左）、h：ℓ と AC のなす角（右）。flip で上下を入れかえる
  function hangFig(g, h, o) {
    o = o || {};
    var flip = !!o.flip, A = [170, flip ? 200 : 60], yb = flip ? 60 : 200;
    var fig = { type: "geometry",
      points: { L1: [20, A[1]], L2: [320, A[1]], M1: [20, yb], M2: [320, yb], A: A,
        Bd: polar(A, flip ? 180 - g : 180 + g, 100), Cd: polar(A, flip ? h : -h, 100),
        B: { intersect: [["A", "Bd"], "m"] }, C: { intersect: [["A", "Cd"], "m"] } },
      lines: [{ id: "l", through: ["L1", "L2"], label: "ℓ", extend: 0 }, { id: "m", through: ["M1", "M2"], label: "m", extend: 0 }],
      segments: [["A", "B"], ["A", "C"], ["B", "C"]], parallel: [{ lines: ["l", "m"], marks: 1 }], labels: ["A", "B", "C"], angles: [] };
    return fig;
  }
  function geo(q) {
    q.format = q.format || "figure";
    if (q.type === "number" && q.answer_display == null && !q.noDegree) q.answer_display = q.answer + "°";
    if (q.type === "number" && !q.placeholder) q.placeholder = "例：65";
    delete q.noDegree;
    add(q);
  }
  var THINK = "x を求めるときに使った図形の性質はどれ？";

  // ---------- 角の基本（中1の土台） ----------
  geo({ id: "angleBasics-basic-1", skill: "angleBasics", level: "basic", format: "word",
    text: "一直線の角（平角）は何度？", type: "number", answer: 180,
    hint: "半回転した角です。", explanation: "一直線の角は 180° です。" });
  geo({ id: "angleBasics-basic-2", skill: "angleBasics", level: "basic",
    text: "図の、印をつけた角の表し方として正しいものはどれ？",
    figure: { type: "geometry", points: { O: [60, 180], A: polar([60, 180], 52, 170), B: [270, 180] }, segments: [["O", "A"], ["O", "B"]],
      angles: [ang("o", "O", "B", "A", { label: "" })], note: false },
    type: "choice", answer: "aob",
    choices: [{ key: "aob", label: "∠AOB" }, { key: "oab", label: "∠OAB" }, { key: "abo", label: "∠ABO" }, { key: "oba", label: "∠OBA" }],
    hint: "頂点の文字を、真ん中に書きます。", explanation: "頂点は O なので、O を真ん中にして ∠AOB（∠BOA でもよい）と表します。" });
  geo({ id: "angleBasics-basic-3", skill: "angleBasics", level: "basic", format: "word",
    text: "1回転の角は何度？", type: "number", answer: 360,
    hint: "一直線（180°）の2つ分です。", explanation: "1回転の角は 360° です。" });
  (function () {
    var f = rayFig({ C: 90 });
    f.right = [{ at: "O", from: "A", to: "C" }];
    f.angles.push(ang("x", "O", "C", "B", { unknown: true }));
    geo({ id: "angleBasics-retention-1", skill: "angleBasics", level: "retention", evidence_level: "basic",
      text: "点A、O、Bは一直線上にあり、∠AOC は直角です。x は何度？", figure: f,
      relation: { type: "angleSum", values: [90, "answer"], total: 180 },
      type: "number", answer: 90, hint: "一直線は 180°。直角は 90°。", explanation: "180 − 90 = 90 なので x = 90° です。" });
  })();
  geo({ id: "angleBasics-retention-2", skill: "angleBasics", level: "retention", evidence_level: "basic", format: "word",
    text: "90° より大きく 180° より小さい角を何という？", type: "choice", answer: "obtuse",
    choices: [{ key: "acute", label: "鋭角" }, { key: "right", label: "直角" }, { key: "obtuse", label: "鈍角" }, { key: "straight", label: "平角" }],
    hint: "鋭い（するどい）角は 90° より小さい角。", explanation: "90° より大きく 180° より小さい角は鈍角です。" });

  // ---------- 対頂角・一直線の角 ----------
  (function () {
    var f = crossFig(15, drawOne(64));
    f.angles.push(ang("g", "O", "B", "C", { value: 64 }), ang("x", "O", "C", "A", { unknown: true }));
    f.highlight = [{ angle: "x" }];
    geo({ id: "lineAngles-basic-2", skill: "lineAngles", level: "basic", text: "2つの直線が点Oで交わっています。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["g", "answer"], total: 180, answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "lineAngles", "x は何度？", 116, "x と 64° を合わせると一直線。", "180 − 64 = 116 なので x = 116° です。"),
        reasonStep("s2", "lineAngles", "straight", ["straight", "vertical", "around", "corresponding"], "x と 64° を合わせると一直線（180°）です。")],
      hint: "となり合う2つの角を合わせると何度？", explanation: "x と 64° は合わせて一直線なので、x = 180 − 64 = 116° です。" });
  })();
  (function () {
    var d = drawOne(35), f = rayFig({ C: 180 - d });
    f.angles.push(ang("g", "O", "A", "C", { value: 35 }), ang("x", "O", "C", "B", { unknown: true }));
    geo({ id: "lineAngles-basic-3", skill: "lineAngles", level: "basic", text: "点A、O、Bは一直線上にあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["g", "answer"], total: 180 }, type: "number", answer: 145,
      hint: "一直線の角は 180°。", explanation: "180 − 35 = 145 なので x = 145° です。" });
  })();
  (function () {
    var d = drawSum([50, 70, 60]), f = rayFig({ C: 180 - d[0], D: d[2] });
    f.angles.push(ang("g1", "O", "A", "C", { value: 50 }), ang("x", "O", "C", "D", { unknown: true }), ang("g2", "O", "D", "B", { value: 60 }));
    geo({ id: "lineAngles-standard-1", skill: "lineAngles", level: "standard", text: "点A、O、Bは一直線上にあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["g1", "answer", "g2"], total: 180 }, type: "number", answer: 70,
      hint: "3つの角を合わせると一直線。", explanation: "50 + x + 60 = 180 なので x = 70° です。" });
  })();
  (function () {
    var f = crossFig(-10, drawOne(37, 1));
    f.angles.push(ang("g", "O", "B", "C", { value: 37 }), ang("y", "O", "A", "D", { label: "y", answer: "s1" }), ang("x", "O", "C", "A", { unknown: true }));
    geo({ id: "lineAngles-standard-2", skill: "lineAngles", level: "standard", text: "2つの直線が点Oで交わっています。y と x の大きさを求めなさい。", figure: f,
      relation: [{ type: "equalAngles", source: "g", target: "answer", answer: "s1" }, { type: "angleSum", values: ["g", "answer"], total: 180, answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "lineAngles", "y は何度？", 37, "y は 37° の角と向かい合っている。", "y は 37° の対頂角なので 37° です。"),
        reasonStep("s2r", "lineAngles", "vertical", ["vertical", "straight", "alternate", "around"], "y と 37° は対頂角なので等しくなります。"),
        angleStep("s2", "lineAngles", "x は何度？", 143, "x と 37° は合わせて一直線。", "180 − 37 = 143 なので x = 143° です。")],
      hint: "向かい合う角と、となり合う角を分けて考えよう。", explanation: "y は対頂角で 37°。x は 37° と合わせて一直線なので 143° です。" });
  })();
  (function () {
    var d = drawSum([105, 140, 115], 2), O = [170, 140], a0 = 80;
    var f = { type: "geometry", points: { O: O, A: polar(O, a0, 110), B: polar(O, a0 + d[0], 110), C: polar(O, a0 + d[0] + d[1], 110) },
      segments: [["O", "A"], ["O", "B"], ["O", "C"]], labels: [], angles: [ang("g1", "O", "A", "B", { value: 105 }), ang("g2", "O", "B", "C", { value: 140 }), ang("x", "O", "C", "A", { unknown: true })] };
    geo({ id: "lineAngles-retention-1", skill: "lineAngles", level: "retention", evidence_level: "basic", text: "1つの点のまわりに3つの角があります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["g1", "g2", "answer"], total: 360, answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "lineAngles", "x は何度？", 115, "3つの角を合わせると1回転。", "360 − (105 + 140) = 115 なので x = 115° です。"),
        reasonStep("s2", "lineAngles", "around", ["around", "straight", "vertical", "triangleSum"], "1点のまわりの角をすべて合わせると 360° です。")],
      hint: "1回転は 360°。", explanation: "1点のまわりの角は 360° なので、x = 360 − 245 = 115° です。" });
  })();
  (function () {
    var f = crossFig(68, drawOne(76), { O: [170, 140] });
    f.angles.push(ang("g", "O", "B", "C", { value: 76 }), ang("x", "O", "D", "A", { unknown: true }));
    geo({ id: "lineAngles-retention-2", skill: "lineAngles", level: "retention", evidence_level: "basic", text: "2つの直線が交わっています。x の大きさを求めなさい。", figure: f,
      relation: { type: "equalAngles", source: "g", target: "answer", answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "lineAngles", "x は何度？", 76, "x は 76° の角と向かい合っている。", "対頂角なので x = 76° です。"),
        reasonStep("s2", "lineAngles", "vertical", ["vertical", "straight", "corresponding", "exterior"], "向かい合う角（対頂角）は等しくなります。")],
      hint: "向かい合う角に注目。", explanation: "x と 76° は対頂角なので、x = 76° です。" });
  })();

  // ---------- 角度を式で表す ----------
  (function () {
    var d = drawSum([135, 45]), f = rayFig({ C: d[1] });
    f.angles.push(ang("e1", "O", "A", "C", { expr: { a: 3, b: 0 } }), ang("e2", "O", "C", "B", { expr: { a: 1, b: 0 } }));
    geo({ id: "angleEq-basic-1", skill: "angleEq", level: "basic", text: "点A、O、Bは一直線上にあります。x の値を求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["e1", "e2"], total: 180, answer: "s1" }, type: "steps",
      steps: [{ id: "s1", skill: "angleEq", aspect: "value", text: "x の値は？", type: "number", answer: 45, placeholder: "例：30",
        hint: "3x + x = 180 を解く。", explanation: "4x = 180 → x = 45 です。" },
        reasonStep("s2", "angleEq", "straight", ["straight", "vertical", "around", "triangleSum"], "2つの角を合わせると一直線（180°）です。")],
      hint: "2つの角を合わせると何度？", explanation: "3x + x = 180 より 4x = 180、x = 45 です。" });
  })();
  (function () {
    var f = crossFig(20, drawOne(70));
    f.angles.push(ang("g", "O", "B", "C", { value: 70 }), ang("e", "O", "A", "D", { expr: { a: 1, b: 18 } }));
    geo({ id: "angleEq-basic-2", skill: "angleEq", level: "basic", text: "2つの直線が交わっています。x の値を求めなさい。", figure: f,
      relation: { type: "equalAngles", source: "g", target: "e", answer: "s1" }, type: "steps",
      steps: [{ id: "s1", skill: "angleEq", aspect: "value", text: "x の値は？", type: "number", answer: 52, placeholder: "例：30",
        hint: "x + 18 = 70 を解く。", explanation: "x + 18 = 70 → x = 52 です。" },
        reasonStep("s2", "angleEq", "vertical", ["vertical", "straight", "corresponding", "around"], "(x + 18)° と 70° は対頂角なので等しくなります。")],
      hint: "向かい合う角は等しい。", explanation: "対頂角は等しいので x + 18 = 70、x = 52 です。" });
  })();
  (function () {
    var f = crossFig(-5, drawOne(80));
    f.angles.push(ang("e1", "O", "B", "C", { expr: { a: 2, b: -10 } }), ang("e2", "O", "A", "D", { expr: { a: 1, b: 35 } }));
    geo({ id: "angleEq-standard-2", skill: "angleEq", level: "standard", text: "2つの直線が交わっています。x の値と、その角の大きさを求めなさい。", figure: f,
      relation: [{ type: "equalAngles", source: "e1", target: "e2", answer: "s1" }, { type: "equalAngles", source: { of: "s1", a: 1, b: 35 }, target: "answer", answer: "s2" }],
      type: "steps",
      steps: [{ id: "s1", skill: "angleEq", aspect: "value", text: "x の値は？", type: "number", answer: 45, placeholder: "例：30",
        hint: "2x − 10 = x + 35 を解く。", explanation: "2x − x = 35 + 10 → x = 45 です。" },
        angleStep("s2", "angleEq", "(x + 35)° の角は何度？", 80, "x = 45 を代入。", "45 + 35 = 80° です。")],
      hint: "対頂角は等しいので、2つの式を = で結ぶ。", explanation: "2x − 10 = x + 35 より x = 45。角は 80° です。" });
  })();
  (function () {
    var d = drawSum([75, 35, 70], 1), f = triFig({ B: d[0], C: d[1], A: d[2] });
    f.angles.push(ang("e1", "A", "B", "C", { expr: { a: 2, b: 0 } }), ang("e2", "B", "A", "C", { expr: { a: 1, b: 40 } }), ang("e3", "C", "A", "B", { expr: { a: 1, b: 0 } }));
    geo({ id: "angleEq-standard-3", skill: "angleEq", level: "standard", text: "△ABCで、x の値を求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["e1", "e2", "e3"], total: 180, answer: "s1" }, type: "steps",
      steps: [{ id: "s1", skill: "angleEq", aspect: "value", text: "x の値は？", type: "number", answer: 35, placeholder: "例：30",
        hint: "2x + (x + 40) + x = 180 を解く。", explanation: "4x + 40 = 180 → 4x = 140 → x = 35 です。" },
        reasonStep("s2", "angleEq", "triangleSum", ["triangleSum", "exterior", "straight", "around"], "三角形の3つの内角の和は 180° です。")],
      hint: "3つの角を合わせると 180°。", explanation: "2x + (x + 40) + x = 180 より 4x = 140、x = 35 です。" });
  })();
  (function () {
    var th = drawOne(85), f = parFig(th);
    f.angles.push(quad("e1", "P", "ur", { expr: { a: 3, b: -20 } }), quad("e2", "Q", "ur", { expr: { a: 2, b: 15 } }));
    geo({ id: "angleEq-application-1", skill: "angleEq", level: "application", text: "直線ℓとmは平行です。", figure: f,
      relation: [{ type: "equalAngles", source: "e1", target: "e2", answer: "s1" }, { type: "equalAngles", source: { of: "s1", a: 3, b: -20 }, target: "answer", answer: "s2" }],
      type: "steps",
      steps: [{ id: "s1", skill: "angleEq", aspect: "value", text: "x の値は？", type: "number", answer: 35, placeholder: "例：30",
        hint: "同位角は等しいので 3x − 20 = 2x + 15。", explanation: "3x − 2x = 15 + 20 → x = 35 です。" },
        angleStep("s2", "angleEq", "(3x − 20)° の角は何度？", 85, "x = 35 を代入。", "3 × 35 − 20 = 85° です。"),
        reasonStep("s3", "parallelAngles", "corresponding", ["corresponding", "alternate", "vertical", "straight"], "同じ位置にある角（同位角）です。ℓ // m なので等しくなります。")],
      hint: "2つの角がどんな位置関係かを考えて、式を作る。", explanation: "同位角は等しいので 3x − 20 = 2x + 15、x = 35。角は 85° です。" });
  })();
  (function () {
    var d = drawSum([40, 80, 60], 3), f = rayFig({ C: 180 - d[0], D: d[2] });
    f.angles.push(ang("e1", "O", "A", "C", { expr: { a: 1, b: 0 } }), ang("e2", "O", "C", "D", { expr: { a: 2, b: 0 } }), ang("g", "O", "D", "B", { value: 60 }));
    geo({ id: "angleEq-retention-1", skill: "angleEq", level: "retention", evidence_level: "standard", text: "点A、O、Bは一直線上にあります。x の値を求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["e1", "e2", "g"], total: 180 }, type: "number", answer: 40, placeholder: "例：30", noDegree: true,
      hint: "x + 2x + 60 = 180 を解く。", explanation: "3x + 60 = 180 → 3x = 120 → x = 40 です。" });
  })();
  (function () {
    var d = drawSum([50, 100, 30], 2), f = triFig({ B: d[0], C: d[1], A: d[2] }, { ext: { D: ["B", "C"] } });
    f.angles.push(ang("e1", "A", "B", "C", { expr: { a: 1, b: 0 } }), ang("b", "B", "A", "C", { value: 50 }), ang("e2", "C", "A", "D", { expr: { a: 3, b: -10 } }));
    geo({ id: "angleEq-retention-2", skill: "angleEq", level: "retention", evidence_level: "standard", text: "△ABCの辺BCをのばした直線上に点Dがあります。x の値を求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["e1", "b"], total: "e2" }, type: "number", answer: 30, placeholder: "例：30", noDegree: true,
      hint: "外角 ＝ となり合わない2つの内角の和。", explanation: "3x − 10 = x + 50 より 2x = 60、x = 30 です。" });
  })();

  // ---------- 同位角・錯角（位置の名前） ----------
  function nameQ(id, level, text, fig, of, answer, keys, kind, hint, explanation, extra) {
    var L = {}; fig.angles.forEach(function (a) { L[a.id] = a.label; });
    var q = { id: id, skill: "angleNames", level: level, text: text, figure: fig, type: "choice", answer: answer,
      choices: keys.map(function (k) { return { key: k, label: "∠" + L[k] }; }), position: { of: of, kind: kind }, hint: hint, explanation: explanation };
    for (var k in extra) q[k] = extra[k];
    geo(q);
  }
  nameQ("angleNames-basic-1", "basic", "2つの直線に1本の直線が交わっています。∠a の同位角はどれ？", namesFig(64), "a", "e", ["e", "f", "g", "c"], "corresponding",
    "同位角は、それぞれの交点で「同じ位置」にある角。", "∠a は上の交点の右上。下の交点の右上は ∠e です。");
  nameQ("angleNames-basic-2", "basic", "2つの直線に1本の直線が交わっています。∠c の錯角はどれ？", namesFig(64), "c", "e", ["e", "g", "a", "f"], "alternate",
    "錯角は、2つの直線の内側で、横切る直線をはさんで反対側にある角。", "∠c は上の交点の左下（内側）。反対側の内側にあるのは下の交点の右上 ∠e です。");
  nameQ("angleNames-basic-3", "basic", "2つの直線に1本の直線が交わっています。∠d の同位角はどれ？", namesFig(58, { tilt: -7 }), "d", "h", ["h", "f", "b", "g"], "corresponding",
    "交点ごとに、同じ位置（右下なら右下）の角。", "∠d は上の交点の右下。下の交点の右下は ∠h です。");
  nameQ("angleNames-standard-1", "standard", "2つの直線に1本の直線が交わっています。∠f の錯角はどれ？", namesFig(58, { tilt: -7 }), "f", "d", ["d", "b", "h", "c"], "alternate",
    "∠f は下の交点の左上で、2つの直線の内側にある。", "∠f の反対側の内側にあるのは、上の交点の右下 ∠d です。");
  nameQ("angleNames-standard-2", "standard", "2つの直線に1本の直線が交わっています。∠b の対頂角はどれ？", namesFig(70, { tilt: 6 }), "b", "d", ["d", "a", "f", "c"], "vertical",
    "対頂角は、同じ交点で向かい合っている角。", "∠b と向かい合っているのは、同じ交点の ∠d です。");
  var KANA = ["ア", "イ", "ウ", "エ", "オ", "カ", "キ", "ク"];
  nameQ("angleNames-retention-1", "retention", "直線ℓ、m に、もう1本の直線が交わっています。∠ウ の同位角はどれ？", namesFig(60, { tilt: 7, phi: -18, labels: KANA }), "c", "g", ["g", "e", "a", "f"], "corresponding",
    "交点ごとに、同じ位置にある角をさがす。", "∠ウ は上の交点の左下。下の交点の左下は ∠キ です。", { evidence_level: "basic" });
  (function () {
    var f = namesFig(66, { tilt: -6, phi: 15, labels: KANA });
    geo({ id: "angleNames-retention-2", skill: "angleNames", level: "retention", evidence_level: "basic", text: "∠イ と ∠カ のような位置にある角どうしを、何という？", figure: f,
      type: "choice", answer: "corresponding", position: { of: "b", with: "f" },
      choices: [{ key: "corresponding", label: "同位角" }, { key: "alternate", label: "錯角" }, { key: "vertical", label: "対頂角" }, { key: "cointerior", label: "同側内角" }],
      hint: "2つの交点で、それぞれどの位置にある？", explanation: "∠イ も ∠カ も、それぞれの交点の左上。同じ位置なので同位角です。" });
  })();

  // ---------- 平行線と角 ----------
  function parQ(id, level, truthTheta, given, x, o) {
    o = o || {};
    var th = drawOne(truthTheta, o.seed), f = parFig(th, o.fig);
    var gv = quadTruth(truthTheta, given[1]), xv = quadTruth(truthTheta, x[1]);
    f.angles.push(quad("g", given[0], given[1], { value: gv }), quad("x", x[0], x[1], { unknown: true }));
    f.highlight = [{ angle: "x" }];
    var rel = gv === xv ? { type: "equalAngles", source: "g", target: "answer" } : { type: "angleSum", values: ["g", "answer"], total: 180 };
    var q = { id: id, skill: "parallelAngles", level: level, text: o.text || "直線ℓとmは平行です。x の大きさを求めなさい。", figure: f, relation: rel,
      hint: o.hint, explanation: o.explanation };
    if (o.reason) {
      rel.answer = "s1";
      q.type = "steps";
      q.steps = [angleStep("s1", "parallelAngles", "x は何度？", xv, o.hint, o.explanation), reasonStep("s2", "parallelAngles", o.reason, o.keys, o.reasonText)];
    } else { q.type = "number"; q.answer = xv; }
    for (var k in o.extra) q[k] = o.extra[k];
    geo(q);
  }
  parQ("parallelAngles-basic-2", "basic", 58, ["P", "dl"], ["Q", "ur"], { reason: "alternate", keys: ["alternate", "corresponding", "vertical", "straight"],
    hint: "58° の角と x は、2本の平行線の内側で、反対側にある。", explanation: "x は 58° の錯角です。ℓ // m なので x = 58° です。",
    reasonText: "内側で反対側にある角（錯角）です。ℓ // m なので等しくなります。" });
  parQ("parallelAngles-basic-3", "basic", 56, ["P", "ul"], ["Q", "ul"], { reason: "corresponding", keys: ["corresponding", "alternate", "straight", "vertical"],
    hint: "124° の角と x は、それぞれの交点で同じ位置。", explanation: "x は 124° の同位角なので x = 124° です。",
    reasonText: "同じ位置にある角（同位角）です。ℓ // m なので等しくなります。" });
  parQ("parallelAngles-standard-1", "standard", 113, ["P", "dr"], ["Q", "ur"], {
    hint: "67° の角の同位角を見つけて、x と合わせると一直線。", explanation: "67° の同位角は Q の右下。x と合わせて一直線なので x = 180 − 67 = 113° です。" });
  parQ("parallelAngles-standard-2", "standard", 49, ["P", "dr"], ["Q", "ul"], { reason: "alternate", keys: ["alternate", "corresponding", "vertical", "exterior"],
    hint: "131° の角と x は、内側で反対側にある。", explanation: "x は 131° の錯角なので x = 131° です。",
    reasonText: "内側で反対側にある角（錯角）です。ℓ // m なので等しくなります。" });
  parQ("parallelAngles-standard-3", "standard", 62, ["P", "ul"], ["Q", "dr"], {
    hint: "118° の対頂角を見つけてから、同位角を使う。", explanation: "118° の対頂角は P の右下で 118°。その同位角が x なので x = 118° です。" });
  (function () {
    var th = drawOne(47, 2), f = parFig(th);
    f.angles.push(quad("g", "Q", "ur", { value: 47 }), quad("y", "P", "dl", { label: "y", answer: "s1" }), quad("x", "P", "ul", { unknown: true }));
    f.highlight = [{ angle: "x" }];
    geo({ id: "parallelAngles-application-1", skill: "parallelAngles", level: "application", text: "直線ℓとmは平行です。", figure: f,
      relation: [{ type: "equalAngles", source: "g", target: "answer", answer: "s1" }, { type: "angleSum", values: ["y", "answer"], total: 180, answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "parallelAngles", "y は何度？", 47, "y と 47° は内側で反対側。", "y は 47° の錯角なので 47° です。"),
        reasonStep("s1r", "parallelAngles", "alternate", ["alternate", "corresponding", "vertical", "straight"], "y と 47° は錯角です。ℓ // m なので等しくなります。"),
        angleStep("s2", "parallelAngles", "x は何度？", 133, "x と y を合わせると一直線。", "180 − 47 = 133 なので x = 133° です。")],
      hint: "まず y、次に x。", explanation: "y は錯角で 47°。x は y と合わせて一直線なので 133° です。" });
  })();
  parQ("parallelAngles-retention-1", "retention", 66, ["P", "ur"], ["Q", "ur"], { fig: { phi: 25 }, reason: "corresponding", keys: ["corresponding", "alternate", "vertical", "straight"],
    hint: "交点 P と Q で同じ位置にある角。", explanation: "x は 66° の同位角なので x = 66° です。",
    reasonText: "同じ位置にある角（同位角）です。ℓ // m なので等しくなります。", extra: { evidence_level: "basic" } });
  parQ("parallelAngles-retention-2", "retention", 103, ["P", "dl"], ["Q", "ur"], { fig: { phi: 68, c: [170, 140] }, reason: "alternate", keys: ["alternate", "corresponding", "straight", "vertical"],
    hint: "2本の平行線の内側で、反対側にある角。", explanation: "x は 103° の錯角なので x = 103° です。",
    reasonText: "内側で反対側にある角（錯角）です。ℓ // m なので等しくなります。", extra: { evidence_level: "basic" } });

  // ---------- 三角形の内角 ----------
  (function () {
    var d = drawSum([90, 56, 34]), f = triFig({ B: d[0], C: d[1], A: d[2] });
    f.right = [{ at: "B", from: "A", to: "C" }];
    f.angles.push(ang("a", "A", "B", "C", { value: 34 }), ang("x", "C", "A", "B", { unknown: true }));
    geo({ id: "triangleSum-basic-2", skill: "triangleSum", level: "basic", text: "△ABCで、∠B は直角です。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: [90, "a", "answer"], total: 180 }, type: "number", answer: 56,
      hint: "直角は 90°。3つの角を合わせると 180°。", explanation: "180 − (90 + 34) = 56 なので x = 56° です。" });
  })();
  (function () {
    var d = drawSum([27, 35, 118], 1), f = triFig({ B: d[0], C: d[1], A: d[2] });
    f.angles.push(ang("a", "A", "B", "C", { value: 118 }), ang("b", "B", "A", "C", { value: 27 }), ang("x", "C", "A", "B", { unknown: true }));
    geo({ id: "triangleSum-basic-3", skill: "triangleSum", level: "basic", text: "△ABCで、x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b", "answer"], total: 180, answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "triangleSum", "x は何度？", 35, "180 から 118 と 27 をひく。", "180 − (118 + 27) = 35 なので x = 35° です。"),
        reasonStep("s2", "triangleSum", "triangleSum", ["triangleSum", "exterior", "straight", "around"], "三角形の3つの内角の和は 180° です。")],
      hint: "鈍角があっても、3つの角の和は 180°。", explanation: "x = 180 − 118 − 27 = 35° です。" });
  })();
  (function () {
    var f = triFig({ A: 34, B: 73, C: 73 });
    f.angles.push(ang("a", "A", "B", "C", { value: 52 }), ang("b", "B", "A", "C", { label: "" }), ang("x", "C", "A", "B", { unknown: true }));
    f.equalAngles = [{ angles: ["b", "x"], marks: 2 }];
    geo({ id: "triangleSum-standard-1", skill: "triangleSum", level: "standard", text: "△ABCで、∠B と ∠C は等しい大きさです。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "answer", "answer"], total: 180 }, type: "number", answer: 64,
      hint: "∠B と ∠C を合わせると 180 − 52。", explanation: "∠B + ∠C = 180 − 52 = 128。等しいので x = 128 ÷ 2 = 64° です。" });
  })();
  geo({ id: "triangleSum-standard-2", skill: "triangleSum", level: "standard", format: "word",
    text: "三角形の2つの角が 47° と 68° です。残りの角は何度？", relation: { type: "angleSum", values: [47, 68, "answer"], total: 180 },
    type: "number", answer: 65, hint: "3つの角を合わせると 180°。", explanation: "180 − (47 + 68) = 65° です。" });
  (function () {
    // B と C を底辺に。∠BAD・∠DAC に分かれる三角形
    var B = [30, 200], C = [300, 200];
    var f = { type: "geometry", points: { B: B, C: C, Bd: polar(B, 38, 100), Cd: polar(C, 180 - 67, 100), A: { intersect: [["B", "Bd"], ["C", "Cd"]] } },
      polygons: [["A", "B", "C"]], segments: [["A", "D"]], labels: ["A", "B", "C", "D"], straight: [["B", "D", "C"]], angles: [] };
    var A = (function () { var p = B, q = f.points.Bd, r = C, s = f.points.Cd;
      var d1 = [q[0] - p[0], q[1] - p[1]], d2 = [s[0] - r[0], s[1] - r[1]], den = d1[0] * d2[1] - d1[1] * d2[0];
      var t = ((r[0] - p[0]) * d2[1] - (r[1] - p[1]) * d2[0]) / den; return [p[0] + d1[0] * t, p[1] + d1[1] * t]; })();
    f.points.Ad = polar(A, dirDeg(A, B) + 23, 100);
    f.points.D = { intersect: [["B", "C"], ["A", "Ad"]] };
    f.angles.push(ang("b", "B", "A", "C", { value: 50 }), ang("bad", "A", "B", "D", { value: 35 }), ang("dac", "A", "D", "C", { value: 40 }),
      ang("y", "D", "A", "B", { label: "y", answer: "s1" }), ang("x", "C", "A", "B", { unknown: true }));
    geo({ id: "triangleSum-application-1", skill: "triangleSum", level: "application", text: "△ABCの辺BC上に点Dがあります。", figure: f,
      relation: [{ type: "angleSum", values: ["b", "bad", "answer"], total: 180, answer: "s1" }, { type: "angleSum", values: ["b", "bad", "dac", "answer"], total: 180, answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "triangleSum", "y（∠ADB）は何度？", 95, "△ABD の3つの角を合わせると 180°。", "180 − (50 + 35) = 95 なので y = 95° です。"),
        angleStep("s2", "triangleSum", "x（∠ACB）は何度？", 55, "△ABC で、∠A は 35 + 40 = 75°。", "180 − (50 + 75) = 55 なので x = 55° です。")],
      hint: "どの三角形の内角の和を使うかを決めよう。", explanation: "△ABD で y = 95°。△ABC で ∠A = 75° なので x = 55° です。" });
  })();
  (function () {
    var d = drawSum([97, 45, 38], 4), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 22 });
    f.angles.push(ang("a", "A", "B", "C", { value: 38 }), ang("b", "B", "A", "C", { value: 97 }), ang("x", "C", "A", "B", { unknown: true }));
    geo({ id: "triangleSum-retention-1", skill: "triangleSum", level: "retention", evidence_level: "basic", text: "三角形ABCで、x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b", "answer"], total: 180, answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "triangleSum", "x は何度？", 45, "3つの角を合わせると何度？", "180 − (38 + 97) = 45 なので x = 45° です。"),
        reasonStep("s2", "triangleSum", "triangleSum", ["triangleSum", "exterior", "around", "straight"], "三角形の3つの内角の和は 180° です。")],
      hint: "傾いていても、三角形の3つの角の和は 180°。", explanation: "x = 180 − 38 − 97 = 45° です。" });
  })();
  (function () {
    var d = drawSum([61, 90, 29]), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: -28 });
    f.right = [{ at: "C", from: "A", to: "B" }];
    f.angles.push(ang("a", "A", "B", "C", { value: 29 }), ang("x", "B", "A", "C", { unknown: true }));
    geo({ id: "triangleSum-retention-2", skill: "triangleSum", level: "retention", evidence_level: "basic", text: "直角三角形ABC（∠C ＝ 90°）で、x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", 90, "answer"], total: 180 }, type: "number", answer: 61,
      hint: "直角以外の2つの角を合わせると 90°。", explanation: "180 − (90 + 29) = 61 なので x = 61° です。" });
  })();

  // ---------- 三角形の外角 ----------
  (function () {
    var d = drawSum([75, 45, 60], 2), f = triFig({ B: d[0], C: d[1], A: d[2] }, { ext: { D: ["B", "C"] } });
    f.angles.push(ang("a", "A", "B", "C", { value: 60 }), ang("e", "C", "A", "D", { value: 135 }), ang("x", "B", "A", "C", { unknown: true }));
    geo({ id: "exteriorAngle-basic-2", skill: "exteriorAngle", level: "basic", text: "△ABCの辺BCをのばした直線上に点Dがあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "answer"], total: "e", answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "exteriorAngle", "x は何度？", 75, "外角 135° は、∠A と x の和。", "135 − 60 = 75 なので x = 75° です。"),
        reasonStep("s2", "exteriorAngle", "exterior", ["exterior", "triangleSum", "straight", "alternate"], "三角形の外角は、となり合わない2つの内角の和に等しくなります。")],
      hint: "外角 ＝ となり合わない2つの内角の和。", explanation: "60 + x = 135 なので x = 75° です。" });
  })();
  (function () {
    var d = drawSum([105, 31, 44], 1), f = triFig({ B: d[0], C: d[1], A: d[2] }, { ext: { E: ["C", "B"] } });
    f.angles.push(ang("a", "A", "B", "C", { value: 44 }), ang("c", "C", "A", "B", { value: 31 }), ang("x", "B", "A", "E", { unknown: true }));
    geo({ id: "exteriorAngle-basic-3", skill: "exteriorAngle", level: "basic", text: "△ABCの辺CBをBの方へのばし、点Eをとりました。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "c"], total: "answer", answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "exteriorAngle", "x は何度？", 75, "x は B の外角。となり合わない内角は ∠A と ∠C。", "44 + 31 = 75 なので x = 75° です。"),
        reasonStep("s2", "exteriorAngle", "exterior", ["exterior", "triangleSum", "vertical", "straight"], "三角形の外角は、となり合わない2つの内角の和に等しくなります。")],
      hint: "外角は、となり合わない2つの内角の和。", explanation: "x は ∠B の外角なので、44 + 31 = 75° です。" });
  })();
  (function () {
    var f = triFig({ A: 66, B: 66, C: 48 }, { ext: { D: ["B", "C"] } });
    f.angles.push(ang("x", "A", "B", "C", { unknown: true }), ang("b", "B", "A", "C", { label: "" }), ang("e", "C", "A", "D", { value: 108 }));
    f.equalAngles = [{ angles: ["x", "b"], marks: 2 }];
    geo({ id: "exteriorAngle-standard-1", skill: "exteriorAngle", level: "standard", text: "△ABCで、∠A と ∠B は等しい大きさです。点Dは辺BCをのばした直線上にあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["answer", "answer"], total: "e" }, type: "number", answer: 54,
      hint: "外角 108° は、∠A と ∠B の和。", explanation: "∠A + ∠B = 108。等しいので x = 108 ÷ 2 = 54° です。" });
  })();
  (function () {
    var d = drawSum([55, 54, 71], 3), f = triFig({ B: d[0], C: d[1], A: d[2] }, { ext: { D: ["B", "C"] } });
    f.angles.push(ang("e", "C", "A", "D", { value: 126 }), ang("x", "C", "B", "A", { unknown: true }));
    geo({ id: "exteriorAngle-standard-2", skill: "exteriorAngle", level: "standard", text: "△ABCの辺BCをのばした直線上に点Dがあります。x（∠ACB）の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["e", "answer"], total: 180 }, type: "number", answer: 54,
      hint: "外角と、となりの内角を合わせると一直線。", explanation: "126 + x = 180 なので x = 54° です。" });
  })();
  (function () {
    var d = drawSum([65, 67, 48], 5), f = triFig({ B: d[0], C: d[1], A: d[2] }, { ext: { D: ["B", "C"], E: ["C", "B"] }, size: 170, extLen: 1.35 });
    f.angles.push(ang("a", "A", "B", "C", { value: 48 }), ang("eb", "B", "A", "E", { value: 115 }), ang("y", "B", "A", "C", { label: "y", answer: "s1" }),
      ang("x", "C", "A", "D", { unknown: true }));
    geo({ id: "exteriorAngle-application-1", skill: "exteriorAngle", level: "application", text: "△ABCの辺BCを両側にのばし、点D、Eをとりました。", figure: f,
      relation: [{ type: "angleSum", values: ["eb", "answer"], total: 180, answer: "s1" }, { type: "angleSum", values: ["a", "y"], total: "answer", answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "exteriorAngle", "y（∠ABC）は何度？", 65, "115° と y を合わせると一直線。", "180 − 115 = 65 なので y = 65° です。"),
        angleStep("s2", "exteriorAngle", "x は何度？", 113, "x は C の外角。", "48 + 65 = 113 なので x = 113° です。"),
        reasonStep("s3", "exteriorAngle", "exterior", ["exterior", "triangleSum", "straight", "corresponding"], "x は外角なので、となり合わない2つの内角（∠A と y）の和です。")],
      hint: "まず y を出してから、外角の性質を使う。", explanation: "y = 180 − 115 = 65°。x = 48 + 65 = 113° です。" });
  })();
  (function () {
    var d = drawSum([36, 58, 86], 2), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 18, ext: { D: ["C", "A"] } });
    f.angles.push(ang("b", "B", "A", "C", { value: 36 }), ang("c", "C", "A", "B", { value: 58 }), ang("x", "A", "B", "D", { unknown: true }));
    geo({ id: "exteriorAngle-retention-1", skill: "exteriorAngle", level: "retention", evidence_level: "basic", text: "辺CAをAの方へのばした直線上に点Dがあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["b", "c"], total: "answer", answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "exteriorAngle", "x は何度？", 94, "x は A の外角。", "36 + 58 = 94 なので x = 94° です。"),
        reasonStep("s2", "exteriorAngle", "exterior", ["exterior", "triangleSum", "straight", "vertical"], "三角形の外角は、となり合わない2つの内角の和に等しくなります。")],
      hint: "どの頂点の外角かを見て、となり合わない内角を足す。", explanation: "x は A の外角なので、36 + 58 = 94° です。" });
  })();
  geo({ id: "exteriorAngle-retention-2", skill: "exteriorAngle", level: "retention", evidence_level: "basic", format: "word",
    text: "三角形の1つの外角が 140°、その外角ととなり合わない内角の1つが 85° です。となり合わないもう1つの内角は何度？",
    relation: { type: "angleSum", values: [85, "answer"], total: 140 }, type: "number", answer: 55,
    hint: "外角 ＝ となり合わない2つの内角の和。", explanation: "140 − 85 = 55° です。" });

  // ---------- 角の組み合わせ・補助線 ----------
  function zQ(id, level, a, b, o) {
    o = o || {};
    var d = drawTwo(a, b, function (d1, d2) { return [[a + b, d1 + d2]]; }, function (d1, d2) { return 70 / Math.tan(d1 * Math.PI / 180) < 200 && 70 / Math.tan(d2 * Math.PI / 180) < 200; }, o.seed);
    var f = zFig(d[0], d[1], { left: o.left });
    var A = f.angles;
    if (o.given === "r") { A[0].value = a; A[1].unknown = true; A[2].value = a + b; f.highlight = [{ angle: "b" }]; }
    else { A[0].value = a; A[1].value = b; A[2].unknown = true; f.highlight = [{ angle: "r" }]; }
    var rel = o.given === "r" ? { type: "angleSum", values: ["a", "answer"], total: "r" } : { type: "angleSum", values: ["a", "b"], total: "answer" };
    var xv = o.given === "r" ? b : a + b;
    var q = { id: id, skill: "angleCombo", level: level, text: o.text || "直線ℓとmは平行です。x の大きさを求めなさい。", figure: f, relation: rel, hint: o.hint, explanation: o.explanation };
    if (o.reason) {
      rel.answer = "s1"; q.type = "steps";
      q.steps = [angleStep("s1", "angleCombo", "x は何度？", xv, o.hint, o.explanation),
        reasonStep("s2", "angleCombo", "auxParallel", ["auxParallel", "triangleSum", "vertical", "straight"], "点Rを通って ℓ に平行な直線を引くと、x は2つの錯角に分かれます。")];
    } else { q.type = "number"; q.answer = xv; }
    for (var k in o.extra) q[k] = o.extra[k];
    geo(q);
  }
  zQ("angleCombo-basic-1", "basic", 35, 40, { reason: true, hint: "点Rを通って ℓ に平行な直線を引いてみよう。", explanation: "補助線で x は 35° と 40° の錯角に分かれるので、x = 75° です。" });
  zQ("angleCombo-basic-2", "basic", 52, 63, { seed: 1, hint: "R を通る平行線で、x を2つに分ける。", explanation: "x = 52 + 63 = 115° です。" });
  zQ("angleCombo-standard-1", "standard", 41, 57, { given: "r", seed: 3, hint: "R の角 98° は、41° と x の和。", explanation: "41 + x = 98 なので x = 57° です。" });
  (function () {
    var gh = drawTwo(50, 60, function (g, h) { return [[70, 180 - g - h]]; }, hangOk), f = hangFig(gh[0], gh[1]);
    f.angles.push(ang("g", "A", "L1", "B", { value: 50 }), ang("x", "A", "B", "C", { unknown: true }), ang("c", "C", "A", "B", { value: 60 }));
    f.highlight = [{ angle: "x" }];
    geo({ id: "angleCombo-standard-2", skill: "angleCombo", level: "standard", text: "直線ℓとmは平行で、点Aは ℓ 上、点B、Cは m 上にあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["g", "answer", "c"], total: 180 }, type: "number", answer: 70,
      hint: "50° の錯角は ∠ABC。あとは三角形の内角の和。", explanation: "∠ABC = 50°（錯角）。x = 180 − (50 + 60) = 70° です。" });
  })();
  (function () {
    var zd = drawTwo(34, 46, function (d1, d2) { return [[80, d1 + d2]]; }), f = zFig(zd[0], zd[1]);
    f.points.Pe = { along: ["R", "P", 1.55] };
    f.segments.push(["P", "Pe"]);
    f.angles[0].label = "y"; f.angles[0].answer = "s1";
    f.angles[1].value = 46; f.angles[2].unknown = true;
    f.angles.push(ang("g", "P", "L1", "Pe", { value: 34 }));
    f.highlight = [{ angle: "r" }];
    geo({ id: "angleCombo-application-1", skill: "angleCombo", level: "application", text: "直線ℓとmは平行です。線分RPを P の先までのばしました。", figure: f,
      relation: [{ type: "equalAngles", source: "g", target: "answer", answer: "s1" }, { type: "angleSum", values: ["a", "b"], total: "answer", answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "angleCombo", "y は何度？", 34, "y と 34° は向かい合っている。", "対頂角なので y = 34° です。"),
        angleStep("s2", "angleCombo", "x は何度？", 80, "R を通る平行線で x を分ける。", "x = 34 + 46 = 80° です。"),
        reasonStep("s3", "angleCombo", "auxParallel", ["auxParallel", "triangleSum", "exterior", "straight"], "点Rを通って ℓ に平行な直線を引くと、x は y と 46° の錯角に分かれます。")],
      hint: "まず y、次に補助線。", explanation: "y = 34°（対頂角）。補助線で x = 34 + 46 = 80° です。" });
  })();
  (function () {
    var gh = drawTwo(64, 49, function (g, h) { return [[67, 180 - g - h]]; }, hangOk, 3), f = hangFig(gh[0], gh[1]);
    f.angles.push(ang("g", "A", "L1", "B", { value: 64 }), ang("y", "B", "A", "C", { label: "y", answer: "s1" }), ang("c", "C", "A", "B", { value: 49 }),
      ang("x", "A", "B", "C", { unknown: true }));
    geo({ id: "angleCombo-application-2", skill: "angleCombo", level: "application", text: "直線ℓとmは平行で、点Aは ℓ 上、点B、Cは m 上にあります。", figure: f,
      relation: [{ type: "equalAngles", source: "g", target: "answer", answer: "s1" }, { type: "angleSum", values: ["y", "c", "answer"], total: 180, answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "angleCombo", "y（∠ABC）は何度？", 64, "64° の角と y は、平行線の錯角。", "錯角なので y = 64° です。"),
        reasonStep("s1r", "angleCombo", "alternate", ["alternate", "corresponding", "vertical", "exterior"], "y と 64° は錯角です。ℓ // m なので等しくなります。"),
        angleStep("s2", "angleCombo", "x（∠BAC）は何度？", 67, "△ABC の内角の和。", "180 − (64 + 49) = 67 なので x = 67° です。")],
      hint: "平行線の性質で y を出し、三角形で x を出す。", explanation: "y = 64°（錯角）。x = 180 − 64 − 49 = 67° です。" });
  })();
  zQ("angleCombo-retention-1", "retention", 27, 55, { left: true, seed: 2, reason: true, hint: "R を通って ℓ に平行な直線を引く。", explanation: "x = 27 + 55 = 82° です。", extra: { evidence_level: "standard" } });
  (function () {
    var gh = drawTwo(71, 44, function (g, h) { return [[65, 180 - g - h]]; }, hangOk, 4), f = hangFig(gh[0], gh[1], { flip: true });
    f.angles.push(ang("b", "B", "A", "C", { value: 71 }), ang("h", "A", "C", "L2", { value: 44 }), ang("x", "A", "B", "C", { unknown: true }));
    f.highlight = [{ angle: "x" }];
    geo({ id: "angleCombo-retention-2", skill: "angleCombo", level: "retention", evidence_level: "standard", text: "直線ℓとmは平行で、点Aは m 上、点B、Cは ℓ 上にあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["b", "answer", "h"], total: 180 }, type: "number", answer: 65,
      hint: "44° の錯角は ∠ACB。", explanation: "∠ACB = 44°（錯角）。x = 180 − (71 + 44) = 65° です。" });
  })();

  // ---------- 多角形の内角 ----------
  geo({ id: "polygonInterior-basic-2", skill: "polygonInterior", level: "basic", format: "word",
    text: "六角形の内角の和は何度？", relation: { type: "polygonInterior", n: 6, sum: "answer" }, type: "number", answer: 720,
    hint: "180° ×（n − 2）。", explanation: "180 × (6 − 2) = 720° です。" });
  (function () {
    var truths = [85, 110, 72, 93], d = drawSum(truths, 1), f = polyFig(["A", "B", "C", "D"], d, [200, 160]);
    f.angles.push(ang("a", "A", "D", "B", { value: 85 }), ang("b", "B", "A", "C", { value: 110 }), ang("c", "C", "B", "D", { value: 72 }), ang("x", "D", "C", "A", { unknown: true }));
    geo({ id: "polygonInterior-basic-3", skill: "polygonInterior", level: "basic", text: "四角形ABCDで、x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b", "c", "answer"], total: 360, answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "polygonInterior", "x は何度？", 93, "四角形の内角の和は 360°。", "360 − (85 + 110 + 72) = 93 なので x = 93° です。"),
        reasonStep("s2", "polygonInterior", "polygonSum", ["polygonSum", "exteriorSum", "triangleSum", "around"], "四角形の内角の和は 180° ×（4 − 2）＝ 360° です。")],
      hint: "四角形は、対角線で三角形2つに分けられる。", explanation: "内角の和は 360° なので x = 360 − 267 = 93° です。" });
  })();
  geo({ id: "polygonInterior-standard-1", skill: "polygonInterior", level: "standard", format: "word",
    text: "内角の和が 1260° の多角形は何角形？（数字で答えよう）", relation: { type: "polygonInterior", n: "answer", sum: 1260 },
    type: "number", answer: 9, answer_display: "九角形", placeholder: "例：7", prerequisite_skills: ["triangleSum", "eqParen"],
    hint: "180 ×（n − 2）＝ 1260 を解く。", explanation: "n − 2 = 7 なので n = 9。九角形です。" });
  geo({ id: "polygonInterior-standard-2", skill: "polygonInterior", level: "standard", format: "word",
    text: "正八角形の1つの内角は何度？", relation: { type: "polygonInterior", n: 8, sum: { a: 8, b: 0 } }, type: "number", answer: 135,
    hint: "内角の和を求めて、8 でわる。", explanation: "内角の和は 180 × 6 = 1080°。1080 ÷ 8 = 135° です。" });
  (function () {
    var truths = [130, 118, 125, 112, 140, 95], d = drawSum(truths, 2), f = polyFig(["A", "B", "C", "D", "E", "F"], d, [110, 100, 110, 100]);
    var ids = ["a", "b", "c", "d", "e"];
    ["A", "B", "C", "D", "E"].forEach(function (v, i, all) {
      f.angles.push(ang(ids[i], v, i === 0 ? "F" : all[i - 1], i === 4 ? "F" : all[i + 1], { value: truths[i] }));
    });
    f.angles.push(ang("x", "F", "E", "A", { unknown: true }));
    geo({ id: "polygonInterior-application-1", skill: "polygonInterior", level: "application", text: "六角形ABCDEFで、x の大きさを求めなさい。", figure: f,
      relation: [{ type: "polygonInterior", n: 6, sum: "answer", answer: "s1" }, { type: "angleSum", values: ["a", "b", "c", "d", "e", "answer"], total: 720, answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "polygonInterior", "六角形の内角の和は何度？", 720, "180° ×（6 − 2）。", "180 × 4 = 720° です。"),
        reasonStep("s1r", "polygonInterior", "polygonSum", ["polygonSum", "exteriorSum", "triangleSum", "around"], "n角形は三角形 n − 2 個に分けられるので、内角の和は 180° ×（n − 2）です。"),
        angleStep("s2", "polygonInterior", "x は何度？", 95, "720 から5つの角をひく。", "720 − 625 = 95 なので x = 95° です。")],
      hint: "まず内角の和、次に x。", explanation: "内角の和は 720°。x = 720 − (130 + 118 + 125 + 112 + 140) = 95° です。" });
  })();
  geo({ id: "polygonInterior-retention-1", skill: "polygonInterior", level: "retention", evidence_level: "basic", format: "word",
    text: "十角形の内角の和は何度？", relation: { type: "polygonInterior", n: 10, sum: "answer" }, type: "number", answer: 1440,
    hint: "1つの頂点から対角線を引くと、三角形はいくつ？", explanation: "180 × (10 − 2) = 1440° です。" });
  (function () {
    var truths = [102, 64, 121, 73], d = drawSum(truths, 3), f = polyFig(["A", "B", "C", "D"], d, [190, 170], { rot: 20 });
    f.angles.push(ang("a", "A", "D", "B", { value: 102 }), ang("b", "B", "A", "C", { value: 64 }), ang("c", "C", "B", "D", { value: 121 }), ang("x", "D", "C", "A", { unknown: true }));
    geo({ id: "polygonInterior-retention-2", skill: "polygonInterior", level: "retention", evidence_level: "basic", text: "四角形ABCDで、x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b", "c", "answer"], total: 360 }, type: "number", answer: 73,
      hint: "四角形の内角の和を使う。", explanation: "360 − (102 + 64 + 121) = 73° です。" });
  })();

  // ---------- 多角形の外角 ----------
  geo({ id: "polygonExterior-basic-1", skill: "polygonExterior", level: "basic", format: "word",
    text: "正五角形の1つの外角は何度？", relation: { type: "polygonExterior", n: 5, each: "answer" }, type: "number", answer: 72,
    hint: "外角の和は 360°。正五角形は5つとも同じ。", explanation: "360 ÷ 5 = 72° です。" });
  (function () {
    var ext = [75, 68, 80, 62, 75], d = drawSum(ext, 1), f = polyFig(["A", "B", "C", "D", "E"], d.map(function (e) { return 180 - e; }), [150, 120, 130], { ext: true });
    var ids = ["a", "b", "c", "d"], names = ["A", "B", "C", "D", "E"];
    names.forEach(function (v, i) {
      var next = names[(i + 1) % 5], key = v.toLowerCase() + "x";
      f.angles.push(ang(i < 4 ? ids[i] : "x", v, key, next, i < 4 ? { value: ext[i] } : { unknown: true }));
    });
    geo({ id: "polygonExterior-basic-2", skill: "polygonExterior", level: "basic", text: "五角形ABCDEの外角を図のように示しました。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b", "c", "d", "answer"], total: 360, answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "polygonExterior", "x は何度？", 75, "外角を全部合わせると何度？", "360 − (75 + 68 + 80 + 62) = 75 なので x = 75° です。"),
        reasonStep("s2", "polygonExterior", "exteriorSum", ["exteriorSum", "polygonSum", "triangleSum", "straight"], "多角形の外角の和は、何角形でも 360° です。")],
      hint: "多角形の外角の和は 360°。", explanation: "外角の和は 360° なので x = 360 − 285 = 75° です。" });
  })();
  geo({ id: "polygonExterior-standard-1", skill: "polygonExterior", level: "standard", format: "word",
    text: "1つの外角が 24° の正多角形は、正何角形？（数字で答えよう）", relation: { type: "polygonExterior", n: "answer", each: 24 },
    type: "number", answer: 15, answer_display: "正十五角形", placeholder: "例：7", prerequisite_skills: ["polygonInterior", "eqProperty"],
    hint: "24 × n ＝ 360 を解く。", explanation: "360 ÷ 24 = 15 なので、正十五角形です。" });
  geo({ id: "polygonExterior-standard-2", skill: "polygonExterior", level: "standard", format: "word",
    text: "正十二角形の1つの内角は何度？（外角を使って求めよう）", relation: { type: "polygonExterior", n: 12, each: { a: -1, b: 180 } },
    type: "number", answer: 150, hint: "1つの外角は 360 ÷ 12。内角は 180 からひく。", explanation: "外角は 360 ÷ 12 = 30°。内角は 180 − 30 = 150° です。" });
  (function () {
    var ext = [85, 95, 110, 70], d = drawSum(ext, 2), f = polyFig(["A", "B", "C", "D"], d.map(function (e) { return 180 - e; }), [170, 150], { ext: true, rot: -12 });
    var ids = ["a", "b", "c"], names = ["A", "B", "C", "D"];
    names.forEach(function (v, i) {
      var next = names[(i + 1) % 4], key = v.toLowerCase() + "x";
      f.angles.push(ang(i < 3 ? ids[i] : "x", v, key, next, i < 3 ? { value: ext[i] } : { unknown: true }));
    });
    geo({ id: "polygonExterior-retention-1", skill: "polygonExterior", level: "retention", evidence_level: "basic", text: "四角形ABCDの外角を図のように示しました。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b", "c", "answer"], total: 360 }, type: "number", answer: 70,
      hint: "四角形でも、外角の和は 360°。", explanation: "360 − (85 + 95 + 110) = 70° です。" });
  })();
  geo({ id: "polygonExterior-retention-2", skill: "polygonExterior", level: "retention", evidence_level: "basic", format: "word",
    text: "正六角形の1つの外角は何度？", relation: { type: "polygonExterior", n: 6, each: "answer" }, type: "number", answer: 60,
    hint: "360° を6等分。", explanation: "360 ÷ 6 = 60° です。" });

  // ---------- 補強：同位角・錯角（見た目を変える：横切る直線の傾き・2直線の向き・記号の並び） ----------
  //   記号の並びも図ごとに変えるので、「a はいつも右上」のような場所の暗記では解けない
  var PQ = ["s", "p", "q", "r", "w", "t", "u", "v"]; // 位置 a〜h に付ける記号（上の交点：右上 s・左上 p・左下 q・右下 r）
  nameQ("angleNames-basic-4", "basic", "2つの直線に1本の直線が交わっています。∠a の同位角はどれ？",
    namesFig(118, { tilt: 6, labels: ["b", "a", "d", "c", "f", "e", "h", "g"] }), "b", "f", ["f", "e", "h", "d"], "corresponding",
    "横切る直線が左に傾いていても、2つの交点で「同じ位置」にある角をさがす。", "∠a は上の交点の左上。下の交点の左上は ∠e です。");
  nameQ("angleNames-basic-5", "basic", "2つの直線に1本の直線が交わっています。∠d の錯角はどれ？",
    namesFig(65, { tilt: 5, phi: 80, half: 105 }), "d", "f", ["f", "h", "b", "e"], "alternate",
    "図を回して、2つの直線が横になるように見てみよう。錯角は2直線の内側で、横切る直線の反対側。", "∠d と ∠f は、2直線の内側で横切る直線をはさんで反対側にあるので錯角です。");
  nameQ("angleNames-basic-6", "basic", "2つの直線に1本の直線が交わっています。∠r の同位角はどれ？",
    namesFig(50, { tilt: -6, phi: -25, labels: PQ }), "d", "h", ["h", "f", "b", "g"], "corresponding",
    "記号の文字ではなく、交点での位置をくらべる。", "∠r と ∠v は、それぞれの交点で同じ位置にあるので同位角です。");
  nameQ("angleNames-standard-3", "standard", "2つの直線に1本の直線が交わっています。∠e の錯角はどれ？",
    namesFig(125, { tilt: 7, phi: 30 }), "e", "c", ["c", "a", "g", "d"], "alternate",
    "∠e は2直線の内側にある。反対側の内側の角をさがす。", "∠e と ∠c は、2直線の内側で横切る直線をはさんで反対側にあるので錯角です。");
  (function () {
    var f = namesFig(105, { tilt: -7, phi: -12, labels: PQ });
    geo({ id: "angleNames-standard-4", skill: "angleNames", level: "standard", text: "∠q と ∠w のような位置にある角どうしを、何という？", figure: f,
      type: "choice", answer: "alternate", position: { of: "c", with: "e" },
      choices: [{ key: "corresponding", label: "同位角" }, { key: "alternate", label: "錯角" }, { key: "vertical", label: "対頂角" }, { key: "cointerior", label: "同側内角" }],
      hint: "2つの角は、2直線の内側？外側？ 横切る直線の同じ側？反対側？", explanation: "∠q と ∠w は、2直線の内側で横切る直線をはさんで反対側にあるので錯角です。" });
  })();

  // ---------- 補強：角の組み合わせ（折れ曲がる向き・角の大きさを変える） ----------
  zQ("angleCombo-basic-3", "basic", 38, 29, { left: true, seed: 4, reason: true, hint: "点Rを通って ℓ に平行な直線を引くと、x が2つに分かれる。", explanation: "補助線で x は 38° と 29° の錯角に分かれるので、x = 67° です。" });
  zQ("angleCombo-basic-4", "basic", 24, 58, { seed: 6, hint: "R を通る平行線で、x を上と下に分ける。", explanation: "x = 24 + 58 = 82° です。" });

  // ---------- 補強：三角形の外角（外角の頂点・のばす向き・三角形の傾きを変える） ----------
  (function () {
    var d = drawSum([42, 75, 63], 3), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: -15, ext: { D: ["B", "C"] } });
    f.angles.push(ang("a", "A", "B", "C", { value: 63 }), ang("b", "B", "A", "C", { value: 42 }), ang("x", "C", "A", "D", { unknown: true }));
    geo({ id: "exteriorAngle-basic-4", skill: "exteriorAngle", level: "basic", text: "辺BCをCの方へのばした直線上に点Dがあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b"], total: "answer", answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "exteriorAngle", "x は何度？", 105, "x ととなり合わない内角は ∠A と ∠B。", "63 + 42 = 105 なので x = 105° です。"),
        reasonStep("s2", "exteriorAngle", "exterior", ["exterior", "triangleSum", "straight", "vertical"], "三角形の外角は、となり合わない2つの内角の和に等しくなります。")],
      hint: "外角 ＝ となり合わない2つの内角の和。", explanation: "x は C の外角なので、63 + 42 = 105° です。" });
  })();
  (function () {
    var d = drawSum([48, 67, 65], 5), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 12, ext: { D: ["B", "A"] } });
    f.angles.push(ang("b", "B", "A", "C", { value: 48 }), ang("c", "C", "A", "B", { value: 67 }), ang("x", "A", "C", "D", { unknown: true }));
    geo({ id: "exteriorAngle-basic-5", skill: "exteriorAngle", level: "basic", text: "辺BAをAの方へのばした直線上に点Dがあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["b", "c"], total: "answer" }, type: "number", answer: 115,
      hint: "x は A の外角。となり合わない内角はどれ？", explanation: "x ととなり合わない内角は ∠B と ∠C なので、48 + 67 = 115° です。" });
  })();
  (function () {
    var d = drawSum([52, 53, 75], 7), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: -8, ext: { E: ["C", "B"] } });
    f.angles.push(ang("e", "B", "A", "E", { value: 128 }), ang("c", "C", "A", "B", { value: 53 }), ang("x", "A", "B", "C", { unknown: true }));
    geo({ id: "exteriorAngle-standard-3", skill: "exteriorAngle", level: "standard", text: "辺CBをBの方へのばした直線上に点Eがあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["answer", "c"], total: "e", answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "exteriorAngle", "x は何度？", 75, "外角 128° は、x と 53° の和。", "128 − 53 = 75 なので x = 75° です。"),
        reasonStep("s2", "exteriorAngle", "exterior", ["exterior", "triangleSum", "alternate", "straight"], "外角 128° は、となり合わない2つの内角（x と ∠C）の和です。")],
      hint: "外角 ＝ となり合わない2つの内角の和。逆にひき算で求める。", explanation: "x + 53 = 128 なので x = 75° です。" });
  })();

  (function () {
    var d = drawSum([70, 55, 55], 9), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 10, ext: { D: ["B", "C"], E: ["C", "B"] }, size: 170, extLen: 1.35 });
    f.angles.push(ang("eb", "B", "A", "E", { value: 110 }), ang("ec", "C", "A", "D", { value: 125 }), ang("y", "B", "A", "C", { label: "y", answer: "s1" }),
      ang("x", "A", "B", "C", { unknown: true }));
    geo({ id: "exteriorAngle-application-2", skill: "exteriorAngle", level: "application", text: "△ABCの辺BCを両側にのばし、点D、Eをとりました。", figure: f,
      relation: [{ type: "angleSum", values: ["eb", "answer"], total: 180, answer: "s1" }, { type: "angleSum", values: ["answer", "y"], total: "ec", answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "exteriorAngle", "y（∠ABC）は何度？", 70, "110° と y を合わせると一直線。", "180 − 110 = 70 なので y = 70° です。"),
        angleStep("s2", "exteriorAngle", "x（∠BAC）は何度？", 55, "C の外角 125° は、x と y の和。", "125 − 70 = 55 なので x = 55° です。"),
        reasonStep("s3", "exteriorAngle", "exterior", ["exterior", "triangleSum", "straight", "alternate"], "C の外角 125° は、となり合わない2つの内角（x と y）の和です。")],
      hint: "まず B の内角、次に C の外角の性質。", explanation: "y = 180 − 110 = 70°。125 = x + 70 なので x = 55° です。" });
  })();

  // ---------- 補強：多角形の外角（図の多角形の形・頂点の数、内角から逆に求める） ----------
  function extFig(names, ext, lens, o, givenIds) {
    var d = drawSum(ext, o.seed || 0), f = polyFig(names, d.map(function (e) { return 180 - e; }), lens, { ext: true, rot: o.rot || 0, size: o.size });
    names.forEach(function (v, i) {
      var next = names[(i + 1) % names.length], key = v.toLowerCase() + "x", last = i === names.length - 1;
      f.angles.push(ang(last ? "x" : givenIds[i], v, key, next, last ? { unknown: true } : { value: ext[i] }));
    });
    return f;
  }
  (function () {
    var f = extFig(["A", "B", "C"], [130, 105, 125], [200], { seed: 2, rot: 8, size: 190 }, ["a", "b"]);
    geo({ id: "polygonExterior-basic-3", skill: "polygonExterior", level: "basic", text: "三角形ABCの外角を図のように示しました。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b", "answer"], total: 360 }, type: "number", answer: 125,
      hint: "三角形でも、外角を全部合わせると 360°。", explanation: "360 − (130 + 105) = 125 なので x = 125° です。" });
  })();
  geo({ id: "polygonExterior-standard-3", skill: "polygonExterior", level: "standard", format: "word",
    text: "1つの内角が 140° の正多角形は、正何角形？（数字で答えよう）", relation: { type: "polygonExterior", n: "answer", each: 40 },
    type: "number", answer: 9, answer_display: "正九角形", placeholder: "例：7", prerequisite_skills: ["polygonInterior", "eqProperty"],
    hint: "まず1つの外角（180 − 140）を出して、360 をわる。", explanation: "1つの外角は 180 − 140 = 40°。360 ÷ 40 = 9 なので正九角形です。" });
  (function () {
    var f = extFig(["A", "B", "C", "D", "E", "F"], [52, 61, 70, 48, 66, 63], [100, 95, 105, 95], { seed: 4, rot: -6, size: 200 }, ["a", "b", "c", "d", "e"]);
    geo({ id: "polygonExterior-standard-4", skill: "polygonExterior", level: "standard", text: "六角形ABCDEFの外角を図のように示しました。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b", "c", "d", "e", "answer"], total: 360, answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "polygonExterior", "x は何度？", 63, "六角形でも、外角の和は 360°。", "360 − (52 + 61 + 70 + 48 + 66) = 63 なので x = 63° です。"),
        reasonStep("s2", "polygonExterior", "exteriorSum", ["exteriorSum", "polygonSum", "around", "straight"], "多角形の外角の和は、何角形でも 360° です。")],
      hint: "頂点の数がふえても、外角の和は変わらない。", explanation: "外角の和は 360° なので x = 360 − 297 = 63° です。" });
  })();

  // ---------- 補強：角度を式で表す（対頂角・一直線・平行線の錯角で、式の形を変える） ----------
  (function () {
    var f = crossFig(35, drawOne(84), { O: [170, 125] });
    f.angles.push(ang("e", "O", "B", "C", { expr: { a: 2, b: 0 } }), ang("g", "O", "D", "A", { value: 84 }));
    geo({ id: "angleEq-basic-3", skill: "angleEq", level: "basic", text: "2つの直線が交わっています。x の値を求めなさい。", figure: f,
      relation: { type: "equalAngles", source: "e", target: "g", answer: "s1" }, type: "steps",
      steps: [{ id: "s1", skill: "angleEq", aspect: "value", text: "x の値は？", type: "number", answer: 42, placeholder: "例：30",
        hint: "2x = 84 を解く。", explanation: "2x = 84 → x = 42 です。" },
        reasonStep("s2", "angleEq", "vertical", ["vertical", "straight", "alternate", "around"], "2x° と 84° は対頂角なので等しくなります。")],
      hint: "向かい合う角は等しいので、式を = で結ぶ。", explanation: "対頂角は等しいので 2x = 84、x = 42 です。" });
  })();
  (function () {
    var d = drawSum([110, 70], 3), f = rayFig({ C: 180 - d[0] });
    f.angles.push(ang("e1", "O", "A", "C", { expr: { a: 1, b: 40 } }), ang("e2", "O", "C", "B", { expr: { a: 1, b: 0 } }));
    geo({ id: "angleEq-basic-4", skill: "angleEq", level: "basic", text: "点A、O、Bは一直線上にあります。x の値を求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["e1", "e2"], total: 180 }, type: "number", answer: 70, placeholder: "例：30", noDegree: true,
      hint: "(x + 40) + x = 180 を解く。", explanation: "2x + 40 = 180 → 2x = 140 → x = 70 です。" });
  })();
  (function () {
    var f = parFig(drawOne(65, 2), { phi: -15 });
    f.angles.push(quad("e1", "P", "dl", { expr: { a: 2, b: 5 } }), quad("e2", "Q", "ur", { expr: { a: 3, b: -25 } }));
    geo({ id: "angleEq-standard-4", skill: "angleEq", level: "standard", text: "直線ℓとmは平行です。x の値を求めなさい。", figure: f,
      relation: { type: "equalAngles", source: "e1", target: "e2", answer: "s1" }, type: "steps",
      steps: [{ id: "s1", skill: "angleEq", aspect: "value", text: "x の値は？", type: "number", answer: 30, placeholder: "例：30",
        hint: "錯角は等しいので 2x + 5 = 3x − 25。", explanation: "5 + 25 = 3x − 2x → x = 30 です。" },
        reasonStep("s2", "parallelAngles", "alternate", ["alternate", "corresponding", "vertical", "straight"], "2つの角は錯角です。ℓ // m なので等しくなります。")],
      hint: "2つの角の位置関係から、等しいか、合わせて 180° かを決める。", explanation: "錯角は等しいので 2x + 5 = 3x − 25、x = 30 です。" });
  })();

  // ---------- 補強：平行線と角 標準（2つの性質を組み合わせる・平行線の向きを変える） ----------
  parQ("parallelAngles-standard-4", "standard", 72, ["P", "dl"], ["Q", "ul"], { fig: { phi: 35 }, seed: 3,
    hint: "72° の錯角を見つけて、x と合わせると一直線になる。", explanation: "72° の錯角は Q の右上で 72°。x と合わせて一直線なので x = 180 − 72 = 108° です。" });
  parQ("parallelAngles-standard-5", "standard", 58, ["Q", "dr"], ["P", "ul"], { fig: { phi: 95, c: [170, 140] }, seed: 5,
    hint: "122° の対頂角を見つけてから、平行線の性質を使う。", explanation: "122° の対頂角は Q の左上で 122°。その同位角が x なので x = 122° です。" });

  // ---------- 補強：三角形の外角 標準（辺ABをのばす。外角から内角を逆に求める） ----------
  (function () {
    var d = drawSum([76, 61, 43], 2), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 14, ext: { D: ["A", "B"] } });
    f.angles.push(ang("e", "B", "C", "D", { value: 104 }), ang("c", "C", "A", "B", { value: 61 }), ang("x", "A", "B", "C", { unknown: true }));
    geo({ id: "exteriorAngle-standard-4", skill: "exteriorAngle", level: "standard", text: "辺ABをBの方へのばした直線上に点Dがあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["answer", "c"], total: "e" }, type: "number", answer: 43,
      hint: "104° は B の外角。となり合わない内角は x と ∠C。", explanation: "x + 61 = 104 なので x = 43° です。" });
  })();

  // ---------- 補強：三角形の外角 応用（三角形の中の点D：外角を2回使う） ----------
  (function () {
    // 描く角：∠A 76°・∠ABD 40°・∠ACD 37°（本当は 64°・30°・25°。y・x も 9° 以上ずれる）
    var B = [40, 220], C = [300, 220];
    var f = { type: "geometry",
      points: { B: B, C: C, Bd: polar(B, 58, 100), Cd: polar(C, 134, 100), A: { intersect: [["B", "Bd"], ["C", "Cd"]] },
        Bt: polar(B, 18, 100), Ct: polar(C, 171, 100), D: { intersect: [["B", "Bt"], ["C", "Ct"]] }, E: { intersect: [["B", "D"], ["A", "C"]] } },
      polygons: [["A", "B", "C"]], segments: [["B", "D"], ["C", "D"], { from: "D", to: "E", dashed: true }], labels: ["A", "B", "C", "D", "E"],
      straight: [["B", "D", "E"], ["A", "E", "C"]],
      angles: [ang("a", "A", "B", "C", { value: 64 }), ang("b", "B", "A", "D", { value: 30 }), ang("c", "C", "A", "D", { value: 25 }),
        ang("y", "E", "B", "C", { label: "y", answer: "s1" }), ang("x", "D", "B", "C", { unknown: true })] };
    geo({ id: "exteriorAngle-application-3", skill: "exteriorAngle", level: "application", text: "△ABCの内部に点Dがあります。BDをのばして、ACとの交点をEとします。", figure: f,
      relation: [{ type: "angleSum", values: ["a", "b"], total: "answer", answer: "s1" }, { type: "angleSum", values: ["y", "c"], total: "answer", answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "exteriorAngle", "y（∠BEC）は何度？", 94, "y は △ABE の外角。", "64 + 30 = 94 なので y = 94° です。"),
        angleStep("s2", "exteriorAngle", "x（∠BDC）は何度？", 119, "x は △DEC の外角。", "94 + 25 = 119 なので x = 119° です。"),
        reasonStep("s3", "exteriorAngle", "exterior", ["exterior", "triangleSum", "straight", "alternate"], "y も x も外角なので、となり合わない2つの内角の和です。")],
      hint: "補助線BEで三角形を2つ作り、外角の性質を2回使う。", explanation: "y = 64 + 30 = 94°（△ABE の外角）。x = 94 + 25 = 119°（△DEC の外角）です。" });
  })();

  // ---------- 補強：角の組み合わせ 基礎（くの字の大きさ・平行線にかかる三角形） ----------
  zQ("angleCombo-basic-5", "basic", 46, 31, { seed: 8, reason: true, hint: "R を通って ℓ に平行な直線を引くと、x は2つの錯角に分かれる。", explanation: "x = 46 + 31 = 77° です。" });
  (function () {
    var gh = drawTwo(62, 51, function (g, h) { return [[67, 180 - g - h]]; }, hangOk, 6), f = hangFig(gh[0], gh[1]);
    f.angles.push(ang("b", "B", "A", "C", { value: 62 }), ang("h", "A", "C", "L2", { value: 51 }), ang("x", "A", "B", "C", { unknown: true }));
    f.highlight = [{ angle: "x" }];
    geo({ id: "angleCombo-basic-6", skill: "angleCombo", level: "basic", text: "直線ℓとmは平行で、点Aは ℓ 上、点B、Cは m 上にあります。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["b", "answer", "h"], total: 180 }, type: "number", answer: 67,
      hint: "A のところで、ℓ の左側にできる角は ∠B の錯角。", explanation: "A の左側の角は 62°（錯角）。一直線なので x = 180 − (62 + 51) = 67° です。" });
  })();

  // ---------- 補強：三角形の内角 基礎（三角形の向き・直角の位置を変える） ----------
  (function () {
    var d = drawSum([71, 43, 66], 4), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 165 });
    f.angles.push(ang("b", "B", "A", "C", { value: 71 }), ang("c", "C", "A", "B", { value: 43 }), ang("x", "A", "B", "C", { unknown: true }));
    geo({ id: "triangleSum-basic-4", skill: "triangleSum", level: "basic", text: "三角形ABCで、x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["b", "c", "answer"], total: 180, answer: "s1" }, type: "steps",
      steps: [angleStep("s1", "triangleSum", "x は何度？", 66, "さかさまの三角形でも、3つの角を合わせると 180°。", "180 − (71 + 43) = 66 なので x = 66° です。"),
        reasonStep("s2", "triangleSum", "triangleSum", ["triangleSum", "exterior", "straight", "vertical"], "三角形の3つの内角の和は 180° です。")],
      hint: "三角形の向きが変わっても、内角の和は同じ。", explanation: "x = 180 − 71 − 43 = 66° です。" });
  })();
  (function () {
    var d = drawSum([37, 53, 90], 6), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 8 });
    f.right = [{ at: "A", from: "B", to: "C" }];
    f.angles.push(ang("b", "B", "A", "C", { value: 37 }), ang("x", "C", "A", "B", { unknown: true }));
    geo({ id: "triangleSum-basic-5", skill: "triangleSum", level: "basic", text: "△ABCで、∠A は直角です。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["b", 90, "answer"], total: 180 }, type: "number", answer: 53,
      hint: "直角の 90° と 37° を合わせて、180 からひく。", explanation: "180 − (90 + 37) = 53 なので x = 53° です。" });
  })();

  // ---------- 補強：多角形の内角 基礎（傾いた五角形） ----------
  (function () {
    var truths = [108, 96, 117, 124, 95], d = drawSum(truths, 5), f = polyFig(["A", "B", "C", "D", "E"], d, [120, 140, 110], { rot: 28, size: 210 });
    f.angles.push(ang("a", "A", "E", "B", { value: 108 }), ang("b", "B", "A", "C", { value: 96 }), ang("c", "C", "B", "D", { value: 117 }),
      ang("d", "D", "C", "E", { value: 124 }), ang("x", "E", "D", "A", { unknown: true }));
    geo({ id: "polygonInterior-basic-4", skill: "polygonInterior", level: "basic", text: "五角形ABCDEで、x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "b", "c", "d", "answer"], total: 540 }, type: "number", answer: 95,
      hint: "五角形の内角の和は 180° × 3。", explanation: "内角の和は 540°。540 − (108 + 96 + 117 + 124) = 95 なので x = 95° です。" });
  })();

  // ---------- 補強：多角形の内角 標準・三角形の内角 標準（ちょうちょ形） ----------
  geo({ id: "polygonInterior-standard-3", skill: "polygonInterior", level: "standard", format: "word",
    text: "正九角形の1つの内角は何度？", relation: { type: "polygonInterior", n: 9, sum: { a: 9, b: 0 } }, type: "number", answer: 140,
    hint: "内角の和を出して、9 でわる。", explanation: "内角の和は 180 × 7 = 1260°。1260 ÷ 9 = 140° です。" });
  // 補強（20分プランで学校のスキルを飛ばさなくなり、学習中の「多角形の内角」の標準を使う回数が増えたため）
  geo({ id: "polygonInterior-standard-4", skill: "polygonInterior", level: "standard", format: "word",
    text: "内角の和が 1440° の多角形は何角形？（数字で答えよう）", relation: { type: "polygonInterior", n: "answer", sum: 1440 },
    type: "number", answer: 10, answer_display: "十角形", placeholder: "例：7", prerequisite_skills: ["triangleSum", "eqParen"],
    hint: "180 ×（n − 2）＝ 1440 を解く。", explanation: "n − 2 = 8 なので n = 10。十角形です。" });
  geo({ id: "polygonInterior-standard-5", skill: "polygonInterior", level: "standard", format: "word",
    text: "正十二角形の1つの内角は何度？", relation: { type: "polygonInterior", n: 12, sum: { a: 12, b: 0 } }, type: "number", answer: 150,
    hint: "内角の和を出して、12 でわる。", explanation: "内角の和は 180 × 10 = 1800°。1800 ÷ 12 = 150° です。" });
  (function () {
    // AB と CD が点Oで交わる。描く角：∠AOC＝∠BOD 50°、∠A 67°・∠C 63°・∠B 74°・∠D 56°（本当は 55°・48°・62°・41°）
    var O = [170, 135], s = function (d) { return Math.sin(d * Math.PI / 180); };
    var f = { type: "geometry",
      points: { O: O, A: polar(O, 155, 150 * s(63)), C: polar(O, 205, 150 * s(67)), B: polar(O, -25, 130 * s(56)), D: polar(O, 25, 130 * s(74)) },
      segments: [["A", "B"], ["C", "D"], ["A", "C"], ["B", "D"]], straight: [["A", "O", "B"], ["C", "O", "D"]],
      angles: [ang("a", "A", "O", "C", { value: 55 }), ang("c", "C", "A", "O", { value: 48 }), ang("b", "B", "O", "D", { value: 62 }), ang("x", "D", "B", "O", { unknown: true })] };
    geo({ id: "triangleSum-standard-3", skill: "triangleSum", level: "standard", text: "線分ABとCDが点Oで交わっています。x の大きさを求めなさい。", figure: f,
      relation: { type: "angleSum", values: ["a", "c", { ref: "b", k: -1 }], total: "answer" }, type: "number", answer: 41,
      hint: "∠AOC と ∠BOD は対頂角。それぞれの三角形で、内角の和を使う。", explanation: "∠AOC = 180 − (55 + 48) = 77°。∠BOD も 77° なので、x = 180 − (77 + 62) = 41° です。" });
  })();

  // ---------- 補強：多角形の内角 応用（外角から内角を出して、内角の和へ） ----------
  (function () {
    var truths = [95, 80, 110, 75], d = drawSum(truths, 2), f = polyFig(["A", "B", "C", "D"], d, [190, 150], { rot: -10, size: 200 });
    f.points.E = { along: ["B", "C", 1.4] };
    f.segments = [["C", "E"]]; f.labels = ["A", "B", "C", "D", "E"]; f.straight = [["B", "C", "E"]];
    f.angles.push(ang("a", "A", "D", "B", { value: 95 }), ang("b", "B", "A", "C", { value: 80 }), ang("e", "C", "D", "E", { value: 70 }),
      ang("y", "C", "B", "D", { label: "y", answer: "s1" }), ang("x", "D", "C", "A", { unknown: true }));
    geo({ id: "polygonInterior-application-2", skill: "polygonInterior", level: "application", text: "四角形ABCDの辺BCをのばした直線上に点Eがあります。", figure: f,
      relation: [{ type: "angleSum", values: ["e", "answer"], total: 180, answer: "s1" }, { type: "angleSum", values: ["a", "b", "y", "answer"], total: 360, answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "polygonInterior", "y（∠BCD）は何度？", 110, "70° と y を合わせると一直線。", "180 − 70 = 110 なので y = 110° です。"),
        angleStep("s2", "polygonInterior", "x は何度？", 75, "四角形の内角の和は 360°。", "360 − (95 + 80 + 110) = 75 なので x = 75° です。"),
        reasonStep("s3", "polygonInterior", "polygonSum", ["polygonSum", "exteriorSum", "triangleSum", "around"], "四角形の内角の和は 180° ×（4 − 2）＝ 360° です。")],
      hint: "まず C の内角、次に四角形の内角の和。", explanation: "y = 180 − 70 = 110°。x = 360 − (95 + 80 + 110) = 75° です。" });
  })();

  // ---------- 補強：三角形の内角 応用（∠B・∠C の二等分線の交点） ----------
  (function () {
    // 描く角：∠A 44°・∠B 72°・∠C 64°（∠BPC は 90 + 44 ÷ 2 = 112° に描かれる。本当は ∠A 64°・∠BPC 122°）
    var B = [40, 220], C = [300, 220];
    var f = { type: "geometry",
      points: { B: B, C: C, Bd: polar(B, 72, 100), Cd: polar(C, 116, 100), A: { intersect: [["B", "Bd"], ["C", "Cd"]] },
        Bh: polar(B, 36, 100), Ch: polar(C, 148, 100), P: { intersect: [["B", "Bh"], ["C", "Ch"]] } },
      polygons: [["A", "B", "C"]], segments: [["B", "P"], ["C", "P"]], labels: ["A", "B", "C", "P"],
      angles: [ang("a", "A", "B", "C", { value: 64 }), ang("b1", "B", "A", "P", { label: "" }), ang("b2", "B", "P", "C", { label: "" }),
        ang("c1", "C", "P", "A", { label: "" }), ang("c2", "C", "B", "P", { label: "" }), ang("x", "P", "B", "C", { unknown: true })],
      equalAngles: [{ angles: ["b1", "b2"], marks: 1 }, { angles: ["c1", "c2"], marks: 2 }] };
    geo({ id: "triangleSum-application-2", skill: "triangleSum", level: "application", text: "△ABCで、∠B と ∠C の二等分線の交点を P とします。∠A = 64° です。", figure: f,
      relation: [{ type: "angleSum", values: ["a", "answer"], total: 180, answer: "s1" },
        { type: "equalAngles", source: { of: "s1", a: 0.5 }, target: "answer", answer: "s2" },
        { type: "angleSum", values: [{ of: "s2" }, "answer"], total: 180, answer: "s3" }],
      type: "steps",
      steps: [angleStep("s1", "triangleSum", "∠B と ∠C の和は何度？", 116, "△ABC の内角の和から ∠A をひく。", "180 − 64 = 116° です。"),
        angleStep("s2", "triangleSum", "∠PBC と ∠PCB の和は何度？", 58, "二等分線なので、それぞれ半分。", "116 ÷ 2 = 58° です。"),
        angleStep("s3", "triangleSum", "x（∠BPC）は何度？", 122, "△PBC の内角の和。", "180 − 58 = 122 なので x = 122° です。")],
      hint: "∠B、∠C の1つ1つはわからなくても、和ならわかる。", explanation: "∠B + ∠C = 116°。その半分が 58° なので、x = 180 − 58 = 122° です。" });
  })();

  // ---------- 補強：平行線と角 応用（傾いた平行線で、一直線 → 平行線の順に2段階） ----------
  (function () {
    var f = parFig(drawOne(52, 4), { phi: -30, c: [170, 135] });
    f.angles.push(quad("g", "P", "ul", { value: 128 }), quad("y", "P", "ur", { label: "y", answer: "s1" }), quad("x", "Q", "dl", { unknown: true }));
    f.highlight = [{ angle: "x" }];
    geo({ id: "parallelAngles-application-2", skill: "parallelAngles", level: "application", text: "直線ℓとmは平行です。", figure: f,
      relation: [{ type: "angleSum", values: ["g", "answer"], total: 180, answer: "s1" }, { type: "equalAngles", source: "y", target: "answer", answer: "s2" }],
      type: "steps",
      steps: [angleStep("s1", "parallelAngles", "y は何度？", 52, "128° と y を合わせると一直線。", "180 − 128 = 52 なので y = 52° です。"),
        reasonStep("s1r", "parallelAngles", "straight", ["straight", "vertical", "corresponding", "alternate"], "128° と y を合わせると一直線（180°）です。"),
        angleStep("s2", "parallelAngles", "x は何度？", 52, "y の対頂角を考えると、x と同じ位置の角になる。", "y の対頂角（P の左下）と x は同位角なので、x = 52° です。")],
      hint: "まず y、次に平行線の性質。", explanation: "y = 180 − 128 = 52°。y の対頂角と x は同位角なので x = 52° です。" });
  })();

  // ---------- 角度を式で表す：「どの式が成り立つ？」の小問（s0）を先に置く ----------
  //   s0（式を立てる：図形の関係を式にする）は side: "concept"、s1（x を求める）は side: "calc"。
  //   原因さがしは「最初に止まった小問」で入口を変える：s0 × → 図形の性質側／s0 ○・s1 × → 一次方程式（計算側）
  var EQUATION_STEP = {
    "angleEq-basic-1": [["3x + x = 90", "3x = x", "3x + x = 180", "3x + x = 360"], 2, "3x と x を合わせると一直線なので、3x + x = 180 です。"],
    "angleEq-basic-2": [["x + 18 = 70", "x + 18 + 70 = 180", "x + 18 + 70 = 360", "x + 18 = 90"], 0, "(x + 18)° と 70° は対頂角なので等しく、x + 18 = 70 です。"],
    "angleEq-standard-1": [["(2x + 10) + (x + 20) = 360", "(2x + 10) + (x + 20) = 180", "2x + 10 = x + 20", "(2x + 10) + (x + 20) = 90"], 1, "2つの角を合わせると一直線なので、(2x + 10) + (x + 20) = 180 です。"],
    "angleEq-standard-3": [["2x + (x + 40) = x", "2x + (x + 40) + x = 90", "2x + (x + 40) + x = 360", "2x + (x + 40) + x = 180"], 3, "三角形の内角の和は 180° なので、2x + (x + 40) + x = 180 です。"],
    "angleEq-standard-4": [["(2x + 5) + (3x − 25) = 180", "2x + 5 = 3x − 25", "(2x + 5) + (3x − 25) = 360", "2x + 5 + 3x − 25 = 90"], 1, "2つの角は錯角なので等しく、2x + 5 = 3x − 25 です。"],
    "angleEq-application-1": [["3x − 20 = 2x + 15", "(3x − 20) + (2x + 15) = 180", "(3x − 20) + (2x + 15) = 360", "3x − 20 = 180 − (2x + 15)"], 0, "2つの角は同位角なので等しく、3x − 20 = 2x + 15 です。"]
  };
  items.forEach(function (q) {
    var e = EQUATION_STEP[q.id];
    if (!e) return;
    var keys = ["a", "b", "c", "d"];
    q.steps.unshift({ id: "s0", skill: "angleEq", aspect: "value", side: "concept", text: "どの式が成り立つ？", type: "choice", answer: keys[e[1]],
      choices: e[0].map(function (t, i) { return { key: keys[i], label: t }; }),
      hint: "2つの角の関係（等しい？ 合わせて 180°？）を式にする。", explanation: e[2] });
    q.steps.forEach(function (st) { if (st.id === "s1") st.side = "calc"; });
  });

  // ---------- 根拠だけを確かめる短い問題（reason_only） ----------
  //   今日の学習の「根拠の確認」（5分）と、図形の性質に戻る勉強の「② 根拠を選ぶ」でだけ使う。
  //   角度は問題文で示し（x = 118° など）、計算はさせない。ふだんのチェック・練習の索引には入れない（js/bank.js の index）
  function reasonQ(id, skill, fig, text, answer, keys, relation, explanation) {
    geo({ id: id, skill: skill, level: "basic", reason_only: true, aspect: "reason", usage: "practice", text: text, figure: fig, relation: relation,
      type: "choice", answer: answer, choices: keys.map(function (k) { return { key: k, label: REASON_JA[k] }; }),
      hint: "x を求めるときに使う図形の性質を、ことばで選ぼう。", explanation: explanation });
  }
  (function () {
    var f = crossFig(25, drawOne(62, 3));
    f.angles.push(ang("g", "O", "B", "C", { value: 62 }), ang("x", "O", "D", "A", { value: 62, label: "x" }));
    f.highlight = [{ angle: "x" }];
    reasonQ("lineAngles-reason-1", "lineAngles", f, "2つの直線が交わっています。図で x = 62° です。そう言える理由はどれ？", "vertical", ["straight", "vertical", "corresponding", "alternate"],
      { type: "equalAngles", source: "g", target: "x" }, "x と 62° は向かい合う角（対頂角）なので等しくなります。");
  })();
  (function () {
    var d = drawOne(48, 2), f = rayFig({ C: 180 - d });
    f.angles.push(ang("g", "O", "A", "C", { value: 48 }), ang("x", "O", "C", "B", { value: 132, label: "x" }));
    f.highlight = [{ angle: "x" }];
    reasonQ("lineAngles-reason-2", "lineAngles", f, "点A、O、Bは一直線上にあります。x = 180° − 48° と求められる理由はどれ？", "straight", ["vertical", "around", "straight", "triangleSum"],
      { type: "angleSum", values: ["g", "x"], total: 180 }, "x と 48° を合わせると一直線（180°）だからです。");
  })();
  (function () {
    var d = drawSum([120, 130, 110], 4), O = [170, 140], a0 = 100;
    var f = { type: "geometry", points: { O: O, A: polar(O, a0, 110), B: polar(O, a0 + d[0], 110), C: polar(O, a0 + d[0] + d[1], 110) },
      segments: [["O", "A"], ["O", "B"], ["O", "C"]], labels: [],
      angles: [ang("g1", "O", "A", "B", { value: 120 }), ang("g2", "O", "B", "C", { value: 130 }), ang("x", "O", "C", "A", { value: 110, label: "x" })] };
    reasonQ("lineAngles-reason-3", "lineAngles", f, "x = 360° − (120° + 130°) と求められる理由はどれ？", "around", ["straight", "exteriorSum", "vertical", "around"],
      { type: "angleSum", values: ["g1", "g2", "x"], total: 360 }, "1点のまわりの角をすべて合わせると 360° だからです。");
  })();
  function parReason(id, truthTheta, given, x, o, answer, keys, text, explanation) {
    var f = parFig(drawOne(truthTheta, o.seed), o.fig);
    var gv = quadTruth(truthTheta, given[1]), xv = quadTruth(truthTheta, x[1]);
    f.angles.push(quad("g", given[0], given[1], { value: gv }), quad("x", x[0], x[1], { value: xv, label: "x" }));
    f.highlight = [{ angle: "x" }];
    reasonQ(id, "parallelAngles", f, text.replace("{x}", xv), answer, keys, { type: "equalAngles", source: "g", target: "x" }, explanation);
  }
  parReason("parallelAngles-reason-1", 64, ["P", "ur"], ["Q", "ur"], { fig: { phi: 10 }, seed: 1 }, "corresponding", ["alternate", "corresponding", "vertical", "straight"],
    "直線ℓとmは平行です。図で x = {x}° です。そう言える理由はどれ？", "x と 64° は、それぞれの交点で同じ位置にある角（同位角）です。ℓ // m なので等しくなります。");
  parReason("parallelAngles-reason-2", 57, ["P", "dl"], ["Q", "ur"], { fig: { phi: -20 }, seed: 2 }, "alternate", ["corresponding", "vertical", "alternate", "straight"],
    "直線ℓとmは平行です。図で x = {x}° です。そう言える理由はどれ？", "x と 57° は、2直線の内側で反対側にある角（錯角）です。ℓ // m なので等しくなります。");
  parReason("parallelAngles-reason-3", 62, ["P", "ul"], ["Q", "ul"], { fig: { phi: 40, c: [170, 140] }, seed: 4 }, "corresponding", ["corresponding", "alternate", "straight", "vertical"],
    "直線ℓとmは平行です。図で x = {x}° です。そう言える理由はどれ？", "x と 118° は同じ位置にある角（同位角）です。ℓ // m なので等しくなります。");
  parReason("parallelAngles-reason-4", 71, ["P", "dr"], ["Q", "ul"], { fig: { phi: 75, c: [170, 140], half: 120 }, seed: 5 }, "alternate", ["vertical", "alternate", "corresponding", "straight"],
    "直線ℓとmは平行です。図で x = {x}° です。そう言える理由はどれ？", "x と 109° は、2直線の内側で反対側にある角（錯角）です。ℓ // m なので等しくなります。");
  (function () {
    var d = drawSum([48, 77, 55], 6), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 6 });
    f.angles.push(ang("b", "B", "A", "C", { value: 48 }), ang("c", "C", "A", "B", { value: 77 }), ang("x", "A", "B", "C", { value: 55, label: "x" }));
    reasonQ("triangleSum-reason-1", "triangleSum", f, "x = 180° − (48° + 77°) と求められる理由はどれ？", "triangleSum", ["exterior", "triangleSum", "straight", "around"],
      { type: "angleSum", values: ["b", "c", "x"], total: 180 }, "三角形の3つの内角の和は 180° だからです。");
  })();
  (function () {
    var d = drawSum([66, 73, 41], 4), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: -6, ext: { D: ["B", "C"] } });
    f.angles.push(ang("a", "A", "B", "C", { value: 41 }), ang("b", "B", "A", "C", { value: 66 }), ang("x", "C", "A", "D", { value: 107, label: "x" }));
    reasonQ("exteriorAngle-reason-1", "exteriorAngle", f, "辺BCをのばした直線上に点Dがあります。x = 41° + 66° と求められる理由はどれ？", "exterior", ["triangleSum", "straight", "exterior", "alternate"],
      { type: "angleSum", values: ["a", "b"], total: "x" }, "三角形の外角は、となり合わない2つの内角の和に等しいからです。");
  })();
  (function () {
    var truths = [92, 105, 78, 85], d = drawSum(truths, 4), f = polyFig(["A", "B", "C", "D"], d, [180, 160], { rot: 6 });
    f.angles.push(ang("a", "A", "D", "B", { value: 92 }), ang("b", "B", "A", "C", { value: 105 }), ang("c", "C", "B", "D", { value: 78 }), ang("x", "D", "C", "A", { value: 85, label: "x" }));
    reasonQ("polygonInterior-reason-1", "polygonInterior", f, "四角形ABCDで、x = 360° − (92° + 105° + 78°) と求められる理由はどれ？", "polygonSum", ["exteriorSum", "triangleSum", "polygonSum", "around"],
      { type: "angleSum", values: ["a", "b", "c", "x"], total: 360 }, "四角形の内角の和は 180° ×（4 − 2）＝ 360° だからです。");
  })();
  (function () {
    var f = extFig(["A", "B", "C", "D", "E"], [70, 75, 60, 80, 75], [140, 125, 130], { seed: 6, rot: 4, size: 200 }, ["a", "b", "c", "d"]);
    f.angles[4].value = 75; f.angles[4].label = "x"; delete f.angles[4].unknown;
    reasonQ("polygonExterior-reason-1", "polygonExterior", f, "五角形の外角で、x = 360° − (70° + 75° + 60° + 80°) と求められる理由はどれ？", "exteriorSum", ["polygonSum", "exteriorSum", "around", "straight"],
      { type: "angleSum", values: ["a", "b", "c", "d", "x"], total: 360 }, "多角形の外角の和は、何角形でも 360° だからです。");
  })();
  (function () {
    var zd = drawTwo(33, 42, function (d1, d2) { return [[75, d1 + d2]]; }, null, 2), f = zFig(zd[0], zd[1]);
    f.angles[0].value = 33; f.angles[1].value = 42; f.angles[2].value = 75; f.angles[2].label = "x";
    f.highlight = [{ angle: "r" }];
    reasonQ("angleCombo-reason-1", "angleCombo", f, "直線ℓとmは平行です。x = 33° + 42° と求められる理由はどれ？", "auxParallel", ["triangleSum", "vertical", "auxParallel", "straight"],
      { type: "angleSum", values: ["a", "b"], total: "r" }, "点Rを通って ℓ に平行な直線を引くと、x は 33° と 42° の錯角に分かれるからです。");
  })();

  // ---------- 根拠だけの問題の補強（20分プランで理由の確認を残すようになり、問題不足で消える日があったため） ----------
  //   30日シナリオ（SEED 1〜8）で理由の確認の候補になった回数と「問題不足で消えた」日から、
  //   三角形の内角・角度を式で表す・三角形の外角 は6問、多角形の内角 5問、角の組み合わせ・多角形の外角 4問、同位角・錯角 3問、対頂角・一直線の角 4問。
  //   角度は問題文や図の印（式の形でも）で示し、計算はさせない。記録はそのスキルの reason だけ
  // 対頂角・一直線の角
  (function () {
    var f = crossFig(-15, drawOne(118, 5));
    f.angles.push(ang("g", "O", "B", "C", { value: 118 }), ang("x", "O", "C", "A", { value: 62, label: "x" }));
    f.highlight = [{ angle: "x" }];
    reasonQ("lineAngles-reason-4", "lineAngles", f, "2つの直線が交わっています。x = 180° − 118° と求められる理由はどれ？", "straight", ["vertical", "straight", "alternate", "around"],
      { type: "angleSum", values: ["g", "x"], total: 180 }, "x と 118° はとなり合っていて、合わせると一直線（180°）だからです。向かい合う角（対頂角）ではありません。");
  })();
  // 同位角・錯角（位置の名前から、どちらの性質を使うか）
  function nameReason(id, truthTheta, given, x, o, answer, keys, text, explanation) {
    var f = parFig(drawOne(truthTheta, o.seed), o.fig);
    var gv = quadTruth(truthTheta, given[1]), xv = quadTruth(truthTheta, x[1]);
    f.angles.push(quad("g", given[0], given[1], { value: gv }), quad("x", x[0], x[1], { value: xv, label: "x" }));
    f.highlight = [{ angle: "x" }];
    reasonQ(id, "angleNames", f, text.replace(/\{x\}/g, xv).replace(/\{g\}/g, gv), answer, keys, { type: "equalAngles", source: "g", target: "x" }, explanation.replace(/\{g\}/g, gv));
  }
  nameReason("angleNames-reason-1", 68, ["P", "ul"], ["Q", "ul"], { fig: { phi: 15 }, seed: 3 }, "corresponding", ["vertical", "alternate", "corresponding", "straight"],
    "直線ℓとmは平行です。x と {g}° の角の位置に注目すると、x = {g}° とわかります。使った性質はどれ？", "x と {g}° は、それぞれの交点で同じ位置（左上どうし）にある角＝同位角です。");
  nameReason("angleNames-reason-2", 52, ["P", "dr"], ["Q", "ul"], { fig: { phi: -10, half: 125 }, seed: 6 }, "alternate", ["alternate", "corresponding", "straight", "vertical"],
    "直線ℓとmは平行です。図の x と {g}° は等しくなります。そう言える理由はどれ？", "x と {g}° は、2直線ℓ・mの内側で、横切る直線の反対側にある角＝錯角です。");
  nameReason("angleNames-reason-3", 75, ["Q", "dl"], ["P", "dl"], { fig: { phi: -25, c: [170, 135] }, seed: 2 }, "corresponding", ["straight", "corresponding", "vertical", "alternate"],
    "直線ℓとmは平行です。下の交点の角 {g}° から、上の交点の x がわかります。使った性質はどれ？", "x と {g}° は、それぞれの交点で同じ位置（左下どうし）にある角＝同位角です。");
  // 三角形の内角
  function triReason(id, truths, xAt, o, text, keys, explanation) {
    var d = drawSum([truths.B, truths.C, truths.A], o.seed), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: o.rot || 0 });
    var def = { A: ["A", "B", "C"], B: ["B", "A", "C"], C: ["C", "A", "B"] }, ids = [];
    ["A", "B", "C"].forEach(function (v) {
      var id2 = v === xAt ? "x" : v.toLowerCase();
      ids.push(id2);
      f.angles.push(ang(id2, def[v][0], def[v][1], def[v][2], v === xAt ? { value: truths[v], label: "x" } : { value: truths[v] }));
    });
    f.highlight = [{ angle: "x" }];
    reasonQ(id, "triangleSum", f, text, "triangleSum", keys, { type: "angleSum", values: ids, total: 180 }, explanation);
  }
  triReason("triangleSum-reason-2", { B: 35, C: 95, A: 50 }, "B", { seed: 2, rot: -8 }, "△ABCで、x = 180° − (95° + 50°) と求められる理由はどれ？", ["straight", "exterior", "triangleSum", "polygonSum"],
    "三角形の3つの内角の和は 180° だからです。");
  triReason("triangleSum-reason-3", { B: 90, C: 34, A: 56 }, "A", { seed: 1, rot: 4 }, "∠B が直角の三角形ABCで、x = 90° − 34° と求められる理由はどれ？", ["exterior", "triangleSum", "vertical", "straight"],
    "3つの内角の和が 180° なので、直角（90°）以外の2つの角を合わせると 90° になるからです。");
  triReason("triangleSum-reason-4", { B: 70, C: 70, A: 40 }, "C", { seed: 3, rot: 0 }, "AB ＝ AC の二等辺三角形で、∠A ＝ 40° です。x = (180° − 40°) ÷ 2 と求められる理由はどれ？（底角が等しいことのほかに使う性質）", ["triangleSum", "around", "exterior", "straight"],
    "三角形の3つの内角の和は 180° なので、残りの 140° を等しい2つの底角で分けます。");
  triReason("triangleSum-reason-5", { B: 64, C: 48, A: 68 }, "A", { seed: 4, rot: 10 }, "△ABCで x を求めるのに、x = 180° − 64° − 48° という式を立てました。この式のもとになる性質はどれ？", ["polygonSum", "straight", "triangleSum", "exteriorSum"],
    "三角形の3つの内角の和は 180° です（多角形の 180° ×（n − 2）で n ＝ 3 としても同じですが、ここは三角形の内角の和）。");
  triReason("triangleSum-reason-6", { B: 27, C: 35, A: 118 }, "C", { seed: 5, rot: -4 }, "△ABCで、x = 180° − (118° + 27°) と求められる理由はどれ？", ["triangleSum", "exterior", "straight", "around"],
    "三角形の3つの内角の和は 180° だからです。");
  // 三角形の外角
  function extReason(id, truths, side, o, text, keys, explanation, given) {
    var d = drawSum([truths.B, truths.C, truths.A], o.seed), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: o.rot || 0, ext: { D: side } });
    var at = side[1], other = side[0], third = ["A", "B", "C"].filter(function (v) { return v !== at && v !== other; })[0];
    // 外角：のばした先 D と、のばしていない辺の頂点 third のあいだ
    var ext = 180 - truths[at];
    var def = { A: ["A", "B", "C"], B: ["B", "A", "C"], C: ["C", "A", "B"] };
    var g = given || "ext";
    if (g === "ext") {
      [other, third].forEach(function (v) { f.angles.push(ang(v.toLowerCase(), def[v][0], def[v][1], def[v][2], { value: truths[v] })); });
      f.angles.push(ang("x", at, third, "D", { value: ext, label: "x" }));
      f.highlight = [{ angle: "x" }];
      reasonQ(id, "exteriorAngle", f, text, "exterior", keys, { type: "angleSum", values: [other.toLowerCase(), third.toLowerCase()], total: "x" }, explanation);
    } else {
      // 外角と1つの内角がわかっていて、もう1つの内角 x を求める
      f.angles.push(ang("e", at, third, "D", { value: ext }), ang(g.toLowerCase(), def[g][0], def[g][1], def[g][2], { value: truths[g] }));
      var xv = g === other ? third : other;
      f.angles.push(ang("x", def[xv][0], def[xv][1], def[xv][2], { value: truths[xv], label: "x" }));
      f.highlight = [{ angle: "x" }];
      reasonQ(id, "exteriorAngle", f, text, "exterior", keys, { type: "angleSum", values: [g.toLowerCase(), "x"], total: "e" }, explanation);
    }
  }
  extReason("exteriorAngle-reason-2", { B: 52, C: 70, A: 58 }, ["B", "C"], { seed: 3, rot: 6 }, "辺BCをのばした直線上に点Dがあります。x = 52° + 58° と求められる理由はどれ？", ["straight", "exterior", "triangleSum", "vertical"],
    "三角形の外角は、となり合わない2つの内角の和に等しいからです。");
  extReason("exteriorAngle-reason-3", { B: 64, C: 46, A: 70 }, ["C", "B"], { seed: 2, rot: -6 }, "辺CBをBの方へのばした直線上に点Dがあります。x = 46° + 70° と求められる理由はどれ？", ["exterior", "triangleSum", "around", "straight"],
    "Bでの外角は、となり合わない2つの内角（∠C と ∠A）の和に等しいからです。");
  extReason("exteriorAngle-reason-4", { B: 48, C: 55, A: 77 }, ["B", "C"], { seed: 1, rot: 0 }, "辺BCをのばした直線上に点Dがあります。x = 125° − 48° と求められる理由はどれ？", ["triangleSum", "straight", "exterior", "alternate"],
    "外角 125° は、となり合わない2つの内角（48° と x）の和なので、x = 125° − 48° です。", "B");
  extReason("exteriorAngle-reason-5", { B: 40, C: 85, A: 55 }, ["A", "C"], { seed: 4, rot: 8 }, "辺ACをCの方へのばした直線上に点Dがあります。x = 40° + 55° と求められる理由はどれ？", ["exterior", "vertical", "triangleSum", "straight"],
    "Cでの外角は、となり合わない2つの内角（∠A と ∠B）の和に等しいからです。");
  extReason("exteriorAngle-reason-6", { B: 30, C: 115, A: 35 }, ["B", "C"], { seed: 5, rot: -10 }, "辺BCをのばした直線上に点Dがあります。x = 30° + 35° と求められる理由はどれ？", ["around", "triangleSum", "exterior", "straight"],
    "三角形の外角は、となり合わない2つの内角の和に等しいからです（∠C が鈍角でも同じ）。");
  // 角度を式で表す（どの性質を使って式を立てたか）
  (function () {
    var d = drawSum([105, 75], 3), f = rayFig({ C: d[1] });
    f.angles.push(ang("e1", "O", "A", "C", { value: 105, label: "(3x − 15)°" }), ang("e2", "O", "C", "B", { value: 75, label: "(x + 35)°" }));
    reasonQ("angleEq-reason-1", "angleEq", f, "点A、O、Bは一直線上にあります。(3x − 15) + (x + 35) = 180 という式を立てられる理由はどれ？", "straight", ["vertical", "straight", "around", "triangleSum"],
      { type: "angleSum", values: ["e1", "e2"], total: 180 }, "2つの角を合わせると一直線（180°）だからです。");
  })();
  (function () {
    var f = crossFig(30, drawOne(64, 2));
    f.angles.push(ang("e1", "O", "B", "C", { value: 64, label: "(2x + 4)°" }), ang("e2", "O", "A", "D", { value: 64, label: "(x + 34)°" }));
    reasonQ("angleEq-reason-2", "angleEq", f, "2つの直線が交わっています。2x + 4 = x + 34 という式を立てられる理由はどれ？", "vertical", ["straight", "vertical", "corresponding", "around"],
      { type: "equalAngles", source: "e1", target: "e2" }, "2つの角は向かい合う角（対頂角）なので等しいからです。");
  })();
  (function () {
    var d = drawSum([50, 70, 60], 2), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 6 });
    f.angles.push(ang("e1", "B", "A", "C", { value: 50, label: "x°" }), ang("e2", "C", "A", "B", { value: 70, label: "(x + 20)°" }), ang("e3", "A", "B", "C", { value: 60, label: "(x + 10)°" }));
    reasonQ("angleEq-reason-3", "angleEq", f, "△ABCで、x + (x + 20) + (x + 10) = 180 という式を立てられる理由はどれ？", "triangleSum", ["exterior", "triangleSum", "straight", "around"],
      { type: "angleSum", values: ["e1", "e2", "e3"], total: 180 }, "三角形の3つの内角の和は 180° だからです。");
  })();
  (function () {
    var d = drawSum([40, 115, 25], 4), f = triFig({ B: d[0], C: d[1], A: d[2] }, { rot: 6, ext: { D: ["B", "C"] } });
    f.angles.push(ang("a", "A", "B", "C", { value: 25, label: "x°" }), ang("b", "B", "A", "C", { value: 40 }), ang("e", "C", "A", "D", { value: 65, label: "(3x − 10)°" }));
    reasonQ("angleEq-reason-4", "angleEq", f, "辺BCをのばした直線上に点Dがあります。3x − 10 = x + 40 という式を立てられる理由はどれ？", "exterior", ["triangleSum", "straight", "exterior", "vertical"],
      { type: "angleSum", values: ["a", "b"], total: "e" }, "三角形の外角は、となり合わない2つの内角の和に等しいからです。");
  })();
  (function () {
    var f = crossFig(-20, drawOne(105, 1));
    f.angles.push(ang("e1", "O", "B", "C", { value: 105, label: "(2x + 5)°" }), ang("e2", "O", "C", "A", { value: 75, label: "(x + 25)°" }));
    reasonQ("angleEq-reason-5", "angleEq", f, "2つの直線が交わっています。(2x + 5) + (x + 25) = 180 という式を立てられる理由はどれ？", "straight", ["vertical", "around", "straight", "alternate"],
      { type: "angleSum", values: ["e1", "e2"], total: 180 }, "となり合う2つの角を合わせると一直線（180°）だからです。");
  })();
  (function () {
    var d = drawSum([70, 140, 150], 2), O = [170, 140], a0 = 60;
    var f = { type: "geometry", points: { O: O, A: polar(O, a0, 110), B: polar(O, a0 + d[0], 110), C: polar(O, a0 + d[0] + d[1], 110) },
      segments: [["O", "A"], ["O", "B"], ["O", "C"]], labels: [],
      angles: [ang("e1", "O", "A", "B", { value: 70, label: "x°" }), ang("e2", "O", "B", "C", { value: 140, label: "2x°" }), ang("g", "O", "C", "A", { value: 150 })] };
    reasonQ("angleEq-reason-6", "angleEq", f, "x + 2x + 150 = 360 という式を立てられる理由はどれ？", "around", ["straight", "around", "polygonSum", "vertical"],
      { type: "angleSum", values: ["e1", "e2", "g"], total: 360 }, "1点のまわりの角をすべて合わせると 360° だからです。");
  })();
  // 多角形の内角
  function polyReason(id, names, truths, lens, o, text, keys, explanation) {
    var d = drawSum(truths, o.seed), f = polyFig(names, d, lens, { rot: o.rot || 0, size: o.size });
    var n = names.length, ids = [];
    names.forEach(function (v, i) {
      var last = i === n - 1, id2 = last ? "x" : v.toLowerCase();
      ids.push(id2);
      f.angles.push(ang(id2, v, names[(i - 1 + n) % n], names[(i + 1) % n], last ? { value: truths[i], label: "x" } : { value: truths[i] }));
    });
    f.highlight = [{ angle: "x" }];
    reasonQ(id, "polygonInterior", f, text, "polygonSum", keys, { type: "angleSum", values: ids, total: 180 * (n - 2) }, explanation);
  }
  polyReason("polygonInterior-reason-2", ["A", "B", "C", "D", "E"], [80, 130, 120, 100, 110], [130, 120, 130], { seed: 2, rot: -6 },
    "五角形ABCDEで、x = 540° − (80° + 130° + 120° + 100°) と求められる理由はどれ？", ["exteriorSum", "polygonSum", "triangleSum", "around"],
    "五角形の内角の和は 180° ×（5 − 2）＝ 540° だからです。");
  polyReason("polygonInterior-reason-3", ["A", "B", "C", "D", "E", "F"], [118, 125, 112, 130, 115, 120], [110, 100, 110, 100], { seed: 3, rot: 4 },
    "六角形ABCDEFで、x = 720° − (118° + 125° + 112° + 130° + 115°) と求められる理由はどれ？", ["polygonSum", "around", "exteriorSum", "straight"],
    "六角形の内角の和は 180° ×（6 − 2）＝ 720° だからです。");
  polyReason("polygonInterior-reason-4", ["A", "B", "C", "D"], [90, 110, 85, 75], [170, 150], { seed: 1, rot: 0 },
    "四角形ABCDで ∠A は直角です。x = 360° − (90° + 110° + 85°) と求められる理由はどれ？", ["triangleSum", "exteriorSum", "around", "polygonSum"],
    "四角形の内角の和は 180° ×（4 − 2）＝ 360° だからです（1点のまわりの 360° とは別の理由）。");
  polyReason("polygonInterior-reason-5", ["A", "B", "C", "D", "E", "F"], [120, 120, 120, 120, 120, 120], [100, 100, 100, 100], { seed: 5, rot: 0 },
    "正六角形で、1つの内角 x を x = 720° ÷ 6 と求めました。720° はどの性質から出てきた？", ["around", "polygonSum", "exteriorSum", "triangleSum"],
    "六角形の内角の和が 180° ×（6 − 2）＝ 720° で、正六角形は6つの角が等しいからです。");
  // 多角形の外角
  function extPolyReason(id, names, ext, lens, o, text, keys, explanation) {
    var given = names.slice(0, names.length - 1).map(function (v) { return v.toLowerCase(); });
    var f = extFig(names, ext, lens, o, given);
    var xi = f.angles.length - 1;
    f.angles[xi].value = ext[ext.length - 1]; f.angles[xi].label = "x"; delete f.angles[xi].unknown;
    reasonQ(id, "polygonExterior", f, text, "exteriorSum", keys, { type: "angleSum", values: given.concat(["x"]), total: 360 }, explanation);
  }
  extPolyReason("polygonExterior-reason-2", ["A", "B", "C", "D"], [95, 80, 100, 85], [170, 150], { seed: 2, rot: -4, size: 200 },
    "四角形ABCDの外角で、x = 360° − (95° + 80° + 100°) と求められる理由はどれ？", ["exteriorSum", "polygonSum", "straight", "around"],
    "多角形の外角の和は、何角形でも 360° だからです。");
  extPolyReason("polygonExterior-reason-3", ["A", "B", "C", "D", "E", "F"], [55, 65, 58, 50, 70, 62], [100, 95, 105, 95], { seed: 3, rot: 6, size: 200 },
    "六角形の外角で、x = 360° − (55° + 65° + 58° + 50° + 70°) と求められる理由はどれ？", ["polygonSum", "around", "exteriorSum", "triangleSum"],
    "多角形の外角の和は、何角形でも 360° だからです。");
  extPolyReason("polygonExterior-reason-4", ["A", "B", "C", "D", "E", "F"], [60, 60, 60, 60, 60, 60], [100, 100, 100, 100], { seed: 1, rot: 0, size: 200 },
    "正六角形で、1つの外角 x を x = 360° ÷ 6 と求めました。360° はどの性質から出てきた？", ["straight", "exteriorSum", "polygonSum", "around"],
    "多角形の外角の和は 360° で、正六角形は6つの外角が等しいからです。");
  // 角の組み合わせ・補助線
  function auxReason(id, a, b, o, text, keys, explanation) {
    var zd = drawTwo(a, b, function (d1, d2) { return [[a + b, d1 + d2]]; }, null, o.seed), f = zFig(zd[0], zd[1], { left: !!o.left });
    f.angles[0].value = a; f.angles[1].value = b; f.angles[2].value = a + b; f.angles[2].label = "x";
    f.highlight = [{ angle: "r" }];
    reasonQ(id, "angleCombo", f, text, "auxParallel", keys, { type: "angleSum", values: ["a", "b"], total: "r" }, explanation);
  }
  auxReason("angleCombo-reason-2", 28, 50, { seed: 3, left: true }, "直線ℓとmは平行です。x = 28° + 50° と求められる理由はどれ？", ["vertical", "auxParallel", "triangleSum", "straight"],
    "点Rを通って ℓ に平行な直線を引くと、x は 28° と 50° の錯角に分かれるからです。");
  auxReason("angleCombo-reason-3", 45, 37, { seed: 4 }, "直線ℓとmは平行です。折れ曲がった点Rの角 x を、x = 45° + 37° と求めました。この式を立てるときに考えたことはどれ？", ["auxParallel", "exterior", "vertical", "triangleSum"],
    "Rを通る、ℓ に平行な補助線を引くと、x が錯角2つ（45° と 37°）に分かれます。");
  auxReason("angleCombo-reason-4", 52, 31, { seed: 1, left: true }, "直線ℓとmは平行です。x = 52° + 31° と求められる理由はどれ？", ["straight", "triangleSum", "alternate", "auxParallel"],
    "点Rを通って ℓ に平行な直線を引くと、錯角が2つできて、x はその和になるからです（錯角だけでは x 全体は出ません）。");

  // =====================================================================
  // 中2 合同と証明（図形②）：代表的な証明 6題（穴うめ）＋並べかえ 3題＋1段階だけの短い問題 6題
  //   証明の検証・並べかえの採点・診断の入口は js/proof.js。図は合同な三角形を本当に合同に描く（答えは測ることではなく論理で決まる）
  //   穴うめの選択肢は kind を持つ：correct / corr_shift（対応のずれ）/ misread（図の読み取り）/ goal_used（まだ示していない結論の側を使った）/ SSA など
  // =====================================================================
  var PR_REASON = { hypothesis: "仮定", common: "共通", vertical: "対頂角は等しい", alternate: "平行線の錯角は等しい", corresponding: "平行線の同位角は等しい",
    congruent_parts: "合同な図形の対応する辺（角）は等しい", SSS: "3組の辺がそれぞれ等しい", SAS: "2組の辺とその間の角がそれぞれ等しい",
    ASA: "1組の辺とその両端の角がそれぞれ等しい", SSA: "2組の辺と1組の角がそれぞれ等しい" };
  var PR_SKILL = { hyp_fact: "proofHypConc", figure_fact: "proofFigureFacts", condition: "congCond", use: "congUse" };
  function peq(a, b) { return { eq: [a, b] }; }
  function pcong(a, b) { return { cong: [a, b] }; }
  function pClaim(c) { return c.cong ? "△" + c.cong[0] + " ≡ △" + c.cong[1] : c.eq[0] + " ＝ " + c.eq[1]; }
  // 穴うめの証明。blanks：[{ line, part: "claim"|"reason", choices: [[key, label, kind], ...] }]（正解は kind "correct"）
  function proofFill(id, level, def, fig, text, blanks, hint, explanation) {
    var byId = {};
    def.lines.forEach(function (l) { byId[l.id] = l; });
    var steps = blanks.map(function (b, i) {
      var l = byId[b.line], ans = b.choices.filter(function (c) { return c[2] === "correct"; })[0][0];
      // 何をまちがえたか（aspect）は、穴の種類そのまま：主張の穴は claim、根拠の穴は reason（合同条件の行の「どの条件か」も reason）。
      // どこを学び直すか（diagnostic_target）は js/proof.js が別に決める
      var aspect = b.part === "reason" ? "reason" : "claim";
      return { id: b.line + (b.part === "claim" ? "c" : "r"), line: b.line, part: b.part, role: l.role, skill: PR_SKILL[l.role], aspect: aspect, type: "choice", answer: ans,
        text: "［" + (i + 1) + "］に入るのは？（" + (b.part === "claim" ? "何が等しい・合同か" : l.role === "condition" ? "合同条件" : "根拠") + "）",
        choices: b.choices.map(function (c) { return { key: c[0], label: c[1], kind: c[2] }; }),
        hint: b.part === "claim" ? "図の印と、この行の役割（" + { hyp_fact: "仮定", figure_fact: "図から使える事実", condition: "合同", use: "合同から言えること" }[l.role] + "）から考える。" : "この行は、どうしてそう言える？",
        explanation: pClaim(l.claim) + "（" + PR_REASON[l.reason] + "）" };
    });
    // 証明の紙：行ごとに、穴（［1］…）を入れて表示する
    var sheet = def.lines.map(function (l) {
      var c = blanks.map(function (b, i) { return b.line === l.id && b.part === "claim" ? "［" + (i + 1) + "］" : null; }).filter(Boolean)[0];
      var r = blanks.map(function (b, i) { return b.line === l.id && b.part === "reason" ? "［" + (i + 1) + "］" : null; }).filter(Boolean)[0];
      // 合同から言えることの行は「合同な図形の対応する辺（角）は等しいので、AC ＝ DB」。根拠が穴のときだけ（［n］）を付ける
      if (l.role === "use") return (r ? "合同な図形の［" + r.slice(1, -1) + "］ので、" : "合同な図形の対応する辺（角）は等しいので、") + (c || pClaim(l.claim));
      return (c || pClaim(l.claim)) + "（" + (r || PR_REASON[l.reason]) + "）";
    });
    geo({ id: id, skill: "proofBuild", level: level, text: text, figure: fig, proof: def, proof_sheet: [def.intro].concat(sheet), type: "steps", steps: steps, hint: hint, explanation: explanation });
  }
  // 並べかえ：カードを順にタップ。採点は依存関係（js/proof.js の orderCheck）
  function proofOrder(id, def, fig, text, cardOrder, hint, explanation, level) {
    var byId = {};
    def.lines.forEach(function (l) { byId[l.id] = l; });
    geo({ id: id, skill: "proofBuild", level: level || "standard", aspect: "claim", text: text, figure: fig, proof: def, type: "order",
      cards: cardOrder.map(function (k) { var l = byId[k]; return { key: k, label: l.role === "use" ? "合同な図形の対応する辺（角）は等しいので、" + pClaim(l.claim) : pClaim(l.claim) + "（" + PR_REASON[l.reason] + "）" }; }),
      answer: def.lines.map(function (l) { return l.id; }), hint: hint, explanation: explanation });
  }
  function seg2(a, b) { return [a, b]; }

  // ---------- P1：共通な辺（2組の辺とその間の角） ----------
  var P1 = { intro: "△ABC と △DCB において、",
    hyp: [peq("AB", "DC"), peq("∠ABC", "∠DCB")], goal: peq("AC", "DB"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("AB", "DC"), reason: "hypothesis" },
      { id: "L2", role: "hyp_fact", claim: peq("∠ABC", "∠DCB"), reason: "hypothesis" },
      { id: "L3", role: "figure_fact", claim: peq("BC", "CB"), reason: "common" },
      { id: "L4", role: "condition", claim: pcong("ABC", "DCB"), reason: "SAS", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("AC", "DB"), reason: "congruent_parts", depends_on: ["L4"] }] };
  function figP1() {
    return { type: "geometry", points: { A: [95, 70], B: [60, 210], C: [270, 210], D: [235, 70] },
      segments: [["A", "B"], ["A", "C"], ["D", "B"], ["D", "C"], ["B", "C"]],
      equalSides: [{ segments: [seg2("A", "B"), seg2("D", "C")], marks: 1 }],
      angles: [ang("b", "B", "A", "C", { label: "" }), ang("c", "C", "D", "B", { label: "" })], equalAngles: [{ angles: ["b", "c"], marks: 1 }] };
  }
  proofFill("proof-sas-common-1", "standard", P1, figP1(), "図で AB ＝ DC、∠ABC ＝ ∠DCB です。AC ＝ DB を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L1", part: "reason", choices: [["hypothesis", "仮定", "correct"], ["common", "共通", "misread"], ["congruent_parts", "合同な図形の対応する辺（角）は等しい", "goal_used"]] },
    { line: "L3", part: "claim", choices: [["bc", "BC ＝ CB", "correct"], ["ab", "AB ＝ DB", "misread"], ["ac", "AC ＝ DB", "goal_used"]] },
    { line: "L3", part: "reason", choices: [["common", "共通", "correct"], ["hypothesis", "仮定", "misread"], ["vertical", "対頂角は等しい", "misread"]] },
    { line: "L4", part: "reason", choices: [["SAS", PR_REASON.SAS, "correct"], ["SSS", PR_REASON.SSS, "SSS"], ["ASA", PR_REASON.ASA, "ASA"], ["SSA", PR_REASON.SSA + "（合同とはいえない）", "SSA"]] },
    { line: "L5", part: "claim", choices: [["acdb", "AC ＝ DB", "correct"], ["acdc", "AC ＝ DC", "corr_shift"], ["abdb", "AB ＝ DB", "misread"]] }
  ], "BC は2つの三角形の両方にある辺。", "AB ＝ DC（仮定）、∠ABC ＝ ∠DCB（仮定）、BC ＝ CB（共通）。2組の辺とその間の角がそれぞれ等しいので △ABC ≡ △DCB。対応する辺なので AC ＝ DB です。");
  proofOrder("proof-order-sas-common-1", P1, figP1(), "図で AB ＝ DC、∠ABC ＝ ∠DCB です。AC ＝ DB を証明します。証明の行を、正しい順番にタップしよう。",
    ["L4", "L3", "L5", "L1", "L2"], "先に3つの等しいことをそろえてから、合同を言う。", "3つの等しいこと（順番は自由）→ △ABC ≡ △DCB → AC ＝ DB の順です。");

  // ---------- P2：対頂角（2組の辺とその間の角） ----------
  var P2 = { intro: "△AOC と △BOD において、",
    hyp: [peq("AO", "BO"), peq("CO", "DO")], goal: peq("AC", "BD"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("AO", "BO"), reason: "hypothesis" },
      { id: "L2", role: "hyp_fact", claim: peq("CO", "DO"), reason: "hypothesis" },
      { id: "L3", role: "figure_fact", claim: peq("∠AOC", "∠BOD"), reason: "vertical" },
      { id: "L4", role: "condition", claim: pcong("AOC", "BOD"), reason: "SAS", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("AC", "BD"), reason: "congruent_parts", depends_on: ["L4"] }] };
  function figP2() {
    return { type: "geometry", points: { A: [70, 60], O: [170, 140], B: [270, 220], C: [80, 210], D: [260, 70] },
      segments: [["A", "B"], ["C", "D"], ["A", "C"], ["B", "D"]],
      equalSides: [{ segments: [seg2("A", "O"), seg2("B", "O")], marks: 1 }, { segments: [seg2("C", "O"), seg2("D", "O")], marks: 2 }] };
  }
  proofFill("proof-sas-vertical-1", "standard", P2, figP2(), "線分ABとCDが点Oで交わり、AO ＝ BO、CO ＝ DO です。AC ＝ BD を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L2", part: "claim", choices: [["codo", "CO ＝ DO", "correct"], ["acbd", "AC ＝ BD", "goal_used"], ["aodo", "AO ＝ DO", "misread"]] },
    { line: "L3", part: "claim", choices: [["aocbod", "∠AOC ＝ ∠BOD", "correct"], ["aoccob", "∠AOC ＝ ∠COB", "misread"], ["oacobd", "∠OAC ＝ ∠OBD", "goal_used"]] },
    { line: "L3", part: "reason", choices: [["vertical", "対頂角は等しい", "correct"], ["alternate", "平行線の錯角は等しい", "misread"], ["common", "共通", "misread"]] },
    { line: "L4", part: "claim", choices: [["aocbod", "△AOC ≡ △BOD", "correct"], ["aocdob", "△AOC ≡ △DOB", "corr_shift"], ["aocobd", "△AOC ≡ △OBD", "corr_shift"]] },
    { line: "L4", part: "reason", choices: [["SAS", PR_REASON.SAS, "correct"], ["ASA", PR_REASON.ASA, "ASA"], ["SSS", PR_REASON.SSS, "SSS"]] }
  ], "O で向かい合っている角に注目。", "AO ＝ BO（仮定）、CO ＝ DO（仮定）、∠AOC ＝ ∠BOD（対頂角）。2組の辺とその間の角がそれぞれ等しいので △AOC ≡ △BOD、AC ＝ BD です。");

  // ---------- P3：平行線の錯角と対頂角（1組の辺とその両端の角） ----------
  var P3 = { intro: "△ABO と △DCO において、",
    hyp: [{ parallel: ["AB", "CD"] }, peq("AO", "DO")], goal: peq("BO", "CO"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("AO", "DO"), reason: "hypothesis" },
      { id: "L2", role: "figure_fact", claim: peq("∠BAO", "∠CDO"), reason: "alternate" },
      { id: "L3", role: "figure_fact", claim: peq("∠AOB", "∠DOC"), reason: "vertical" },
      { id: "L4", role: "condition", claim: pcong("ABO", "DCO"), reason: "ASA", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("BO", "CO"), reason: "congruent_parts", depends_on: ["L4"] }] };
  function figP3() {
    return { type: "geometry", points: { A: [60, 60], B: [210, 60], D: [270, 220], C: [120, 220], O: [165, 140] },
      lines: [{ id: "ab", through: ["A", "B"], extend: 0 }, { id: "cd", through: ["C", "D"], extend: 0 }],
      segments: [["A", "D"], ["B", "C"]], parallel: [{ lines: ["ab", "cd"], marks: 1, at: 0.6 }],
      equalSides: [{ segments: [seg2("A", "O"), seg2("D", "O")], marks: 1 }] };
  }
  proofFill("proof-asa-parallel-1", "standard", P3, figP3(), "AB // CD、AO ＝ DO です。BO ＝ CO を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L2", part: "claim", choices: [["bacdo", "∠BAO ＝ ∠CDO", "correct"], ["baoaob", "∠BAO ＝ ∠AOB", "misread"], ["bacdc", "∠BAO ＝ ∠DCO", "corr_shift"]] },
    { line: "L2", part: "reason", choices: [["alternate", "平行線の錯角は等しい", "correct"], ["corresponding", "平行線の同位角は等しい", "misread"], ["vertical", "対頂角は等しい", "misread"]] },
    { line: "L3", part: "reason", choices: [["vertical", "対頂角は等しい", "correct"], ["alternate", "平行線の錯角は等しい", "misread"], ["hypothesis", "仮定", "misread"]] },
    { line: "L4", part: "reason", choices: [["ASA", PR_REASON.ASA, "correct"], ["SAS", PR_REASON.SAS, "SAS"], ["SSS", PR_REASON.SSS, "SSS"]] },
    { line: "L5", part: "claim", choices: [["boco", "BO ＝ CO", "correct"], ["bodo", "BO ＝ DO", "corr_shift"], ["abcd", "AB ＝ DO", "misread"]] }
  ], "平行線 AB、CD と、横切る直線 AD でできる角。", "AO ＝ DO（仮定）、∠BAO ＝ ∠CDO（錯角）、∠AOB ＝ ∠DOC（対頂角）。1組の辺とその両端の角がそれぞれ等しいので △ABO ≡ △DCO、BO ＝ CO です。");
  proofOrder("proof-order-asa-parallel-1", P3, figP3(), "AB // CD、AO ＝ DO です。BO ＝ CO を証明します。証明の行を、正しい順番にタップしよう。",
    ["L5", "L2", "L4", "L1", "L3"], "合同を言うのは、3つの等しいことがそろってから。", "等しいこと3つ（順番は自由）→ △ABO ≡ △DCO → BO ＝ CO です。");

  // ---------- P4：3組の辺（たこ形） ----------
  var P4 = { intro: "△ABC と △ADC において、",
    hyp: [peq("AB", "AD"), peq("CB", "CD")], goal: peq("∠BAC", "∠DAC"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("AB", "AD"), reason: "hypothesis" },
      { id: "L2", role: "hyp_fact", claim: peq("CB", "CD"), reason: "hypothesis" },
      { id: "L3", role: "figure_fact", claim: peq("AC", "AC"), reason: "common" },
      { id: "L4", role: "condition", claim: pcong("ABC", "ADC"), reason: "SSS", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("∠BAC", "∠DAC"), reason: "congruent_parts", depends_on: ["L4"] }] };
  function figP4() {
    return { type: "geometry", points: { A: [160, 40], B: [70, 150], C: [160, 240], D: [250, 150] },
      segments: [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"], ["A", "C"]],
      equalSides: [{ segments: [seg2("A", "B"), seg2("A", "D")], marks: 1 }, { segments: [seg2("C", "B"), seg2("C", "D")], marks: 2 }] };
  }
  proofFill("proof-sss-1", "standard", P4, figP4(), "AB ＝ AD、CB ＝ CD です。∠BAC ＝ ∠DAC を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L2", part: "reason", choices: [["hypothesis", "仮定", "correct"], ["common", "共通", "misread"], ["vertical", "対頂角は等しい", "misread"]] },
    { line: "L3", part: "claim", choices: [["acac", "AC ＝ AC", "correct"], ["bdbd", "BD ＝ BD", "misread"], ["abcd", "AB ＝ CD", "corr_shift"]] },
    { line: "L4", part: "reason", choices: [["SSS", PR_REASON.SSS, "correct"], ["SAS", PR_REASON.SAS, "SAS"], ["ASA", PR_REASON.ASA, "ASA"]] },
    { line: "L5", part: "claim", choices: [["badac", "∠BAC ＝ ∠DAC", "correct"], ["bcadca", "∠BAC ＝ ∠DCA", "corr_shift"], ["abcadc", "∠ABC ＝ ∠BAC", "misread"]] },
    { line: "L5", part: "reason", choices: [["congruent_parts", "合同な図形の対応する辺（角）は等しい", "correct"], ["hypothesis", "仮定", "goal_used"], ["common", "共通", "misread"]] }
  ], "AC は2つの三角形の両方にある辺。", "AB ＝ AD、CB ＝ CD（仮定）、AC ＝ AC（共通）。3組の辺がそれぞれ等しいので △ABC ≡ △ADC、∠BAC ＝ ∠DAC です。");
  proofOrder("proof-order-sss-1", P4, figP4(), "AB ＝ AD、CB ＝ CD です。∠BAC ＝ ∠DAC を証明します。証明の行を、正しい順番にタップしよう。",
    ["L3", "L5", "L1", "L4", "L2"], "結論（対応する角が等しい）は、合同を言ったあと。", "等しいこと3つ（順番は自由）→ △ABC ≡ △ADC → ∠BAC ＝ ∠DAC です。");

  // ---------- P5：共通な辺と両端の角（1組の辺とその両端の角） ----------
  var P5 = { intro: "△ABD と △CBD において、",
    hyp: [peq("∠ABD", "∠CBD"), peq("∠ADB", "∠CDB")], goal: peq("AB", "CB"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("∠ABD", "∠CBD"), reason: "hypothesis" },
      { id: "L2", role: "hyp_fact", claim: peq("∠ADB", "∠CDB"), reason: "hypothesis" },
      { id: "L3", role: "figure_fact", claim: peq("BD", "BD"), reason: "common" },
      { id: "L4", role: "condition", claim: pcong("ABD", "CBD"), reason: "ASA", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("AB", "CB"), reason: "congruent_parts", depends_on: ["L4"] }] };
  proofFill("proof-asa-common-1", "standard", P5, { type: "geometry", points: { B: [70, 140], D: [270, 140], A: [170, 50], C: [170, 230] },
      segments: [["A", "B"], ["A", "D"], ["C", "B"], ["C", "D"], ["B", "D"]],
      angles: [ang("b1", "B", "A", "D", { label: "" }), ang("b2", "B", "D", "C", { label: "" }), ang("d1", "D", "B", "A", { label: "" }), ang("d2", "D", "C", "B", { label: "" })],
      equalAngles: [{ angles: ["b1", "b2"], marks: 1 }, { angles: ["d1", "d2"], marks: 2 }] },
    "∠ABD ＝ ∠CBD、∠ADB ＝ ∠CDB です。AB ＝ CB を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L1", part: "claim", choices: [["abdcbd", "∠ABD ＝ ∠CBD", "correct"], ["abcb", "AB ＝ CB", "goal_used"], ["abdadb", "∠ABD ＝ ∠ADB", "misread"]] },
    { line: "L3", part: "reason", choices: [["common", "共通", "correct"], ["hypothesis", "仮定", "misread"], ["vertical", "対頂角は等しい", "misread"]] },
    { line: "L4", part: "reason", choices: [["ASA", PR_REASON.ASA, "correct"], ["SAS", PR_REASON.SAS, "SAS"], ["SSA", PR_REASON.SSA + "（合同とはいえない）", "SSA"]] },
    { line: "L5", part: "claim", choices: [["abcb", "AB ＝ CB", "correct"], ["abcd", "AB ＝ CD", "corr_shift"], ["adab", "AD ＝ AB", "misread"]] }
  ], "BD は2つの三角形の両方にある辺。その両端の角が等しい。", "∠ABD ＝ ∠CBD、∠ADB ＝ ∠CDB（仮定）、BD ＝ BD（共通）。1組の辺とその両端の角がそれぞれ等しいので △ABD ≡ △CBD、AB ＝ CB です。");

  // ---------- P6：共通な角（2組の辺とその間の角） ----------
  var P6 = { intro: "△ABE と △ACD において、",
    hyp: [peq("AB", "AC"), peq("AE", "AD")], goal: peq("BE", "CD"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("AB", "AC"), reason: "hypothesis" },
      { id: "L2", role: "hyp_fact", claim: peq("AE", "AD"), reason: "hypothesis" },
      { id: "L3", role: "figure_fact", claim: peq("∠BAE", "∠CAD"), reason: "common" },
      { id: "L4", role: "condition", claim: pcong("ABE", "ACD"), reason: "SAS", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("BE", "CD"), reason: "congruent_parts", depends_on: ["L4"] }] };
  proofFill("proof-sas-angle-1", "standard", P6, { type: "geometry",
      points: { A: [160, 40], B: [70, 220], C: [250, 220], D: { along: ["A", "B", 0.55] }, E: { along: ["A", "C", 0.55] } },
      segments: [["A", "B"], ["A", "C"], ["B", "E"], ["C", "D"]], labels: ["A", "B", "C", "D", "E"],
      equalSides: [{ segments: [seg2("A", "B"), seg2("A", "C")], marks: 1 }, { segments: [seg2("A", "E"), seg2("A", "D")], marks: 2 }] },
    "点Dは辺AB上、点Eは辺AC上にあり、AB ＝ AC、AE ＝ AD です。BE ＝ CD を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L3", part: "claim", choices: [["baecad", "∠BAE ＝ ∠CAD", "correct"], ["abeacd", "∠ABE ＝ ∠ACD", "goal_used"], ["baebad", "∠BAE ＝ ∠BAD", "misread"]] },
    { line: "L3", part: "reason", choices: [["common", "共通", "correct"], ["vertical", "対頂角は等しい", "misread"], ["hypothesis", "仮定", "misread"]] },
    { line: "L4", part: "claim", choices: [["abeacd", "△ABE ≡ △ACD", "correct"], ["abeadc", "△ABE ≡ △ADC", "corr_shift"], ["abecad", "△ABE ≡ △CAD", "corr_shift"]] },
    { line: "L5", part: "claim", choices: [["becd", "BE ＝ CD", "correct"], ["bead", "BE ＝ AD", "corr_shift"], ["bdce", "BD ＝ CE", "misread"]] }
  ], "∠A は2つの三角形の両方にある角。", "AB ＝ AC、AE ＝ AD（仮定）、∠BAE ＝ ∠CAD（共通）。2組の辺とその間の角がそれぞれ等しいので △ABE ≡ △ACD、BE ＝ CD です。");

  // ---------- 1段階だけの短い問題（どの段階で止まるかを1つずつ） ----------
  function stageQ(q) { q.proof_stage = true; q.format = q.format || "word"; geo(q); }
  stageQ({ id: "proofHypConc-basic-1", skill: "proofHypConc", level: "basic",
    text: "「AB ＝ DC、∠ABC ＝ ∠DCB ならば、AC ＝ DB」の結論はどれ？", type: "choice", answer: "acdb",
    choices: [{ key: "abdc", label: "AB ＝ DC", kind: "conclusion_as_hypothesis" }, { key: "abcdcb", label: "∠ABC ＝ ∠DCB", kind: "conclusion_as_hypothesis" }, { key: "acdb", label: "AC ＝ DB", kind: "correct" }],
    hint: "「ならば」の前が仮定、後が結論。", explanation: "「ならば」のあとの AC ＝ DB が結論です。AB ＝ DC と ∠ABC ＝ ∠DCB は仮定です。" });
  stageQ({ id: "congCorr-basic-1", skill: "congCorr", level: "basic",
    text: "△ABC ≡ △DEF のとき、辺 BC に対応する辺はどれ？", type: "choice", answer: "ef",
    choices: [{ key: "de", label: "DE", kind: "corr_shift" }, { key: "ef", label: "EF", kind: "correct" }, { key: "df", label: "DF", kind: "corr_shift" }],
    hint: "≡ の記号の前後で、同じ位置にある頂点どうしが対応する。", explanation: "B と E、C と F が対応するので、BC に対応するのは EF です。" });
  stageQ({ id: "congCond-basic-1", skill: "congCond", level: "basic", aspect: "reason",
    text: "△ABC と △DEF で、AB ＝ DE、BC ＝ EF、∠B ＝ ∠E のとき、使える合同条件はどれ？", type: "choice", answer: "SAS",
    choices: [{ key: "SSS", label: PR_REASON.SSS, kind: "SSS" }, { key: "SAS", label: PR_REASON.SAS, kind: "correct" }, { key: "ASA", label: PR_REASON.ASA, kind: "ASA" }],
    hint: "等しい角は、等しい2辺の間にある？", explanation: "∠B は辺 AB と BC の間の角なので、2組の辺とその間の角がそれぞれ等しい、です。" });
  stageQ({ id: "congCond-basic-2", skill: "congCond", level: "basic",
    text: "△ABC と △DEF で、AB ＝ DE、AC ＝ DF、∠B ＝ ∠E のとき、合同といえる？", type: "choice", answer: "no",
    choices: [{ key: "SAS", label: "いえる（2組の辺とその間の角）", kind: "SSA" }, { key: "no", label: "いえない（角が2辺の間にない）", kind: "correct" }],
    hint: "∠B は辺 AB と AC の間の角？", explanation: "∠B は AB と AC の間の角ではありません（間の角は ∠A）。この3つだけでは合同とはいえません。" });
  // 対応だけで答えられるので「対応する辺・角」の問題として扱う（合同から言えることの独立した測定は下の3問）
  stageQ({ id: "congCorr-basic-2", skill: "congCorr", level: "basic",
    text: "△ABC ≡ △DEF がわかっています。∠C と等しい角はどれ？", type: "choice", answer: "f",
    choices: [{ key: "e", label: "∠E", kind: "corr_shift" }, { key: "f", label: "∠F", kind: "correct" }, { key: "d", label: "∠D", kind: "corr_shift" }],
    hint: "合同な図形の対応する角は等しい。C に対応する頂点は？", explanation: "C と F が対応するので、∠C ＝ ∠F です。" });
  // ---------- 合同から言えること（⑤）：「合同を示したあとだから、対応する辺・角の等しさを結論に使える」を測る ----------
  //   対応する辺・角（②）は「どれとどれが対応するか」。こちらは「いつ・何のために使えるか」
  stageQ({ id: "congUse-basic-1", skill: "congUse", level: "basic", aspect: "reason", format: "figure", figure: figP1(),
    text: "△ABC ≡ △DCB を示しました。このあと AC ＝ DB と言うときの理由はどれ？", type: "choice", answer: "congruent_parts",
    choices: [{ key: "hypothesis", label: "仮定", kind: "use_confused" }, { key: "congruent_parts", label: "合同な図形の対応する辺（角）は等しい", kind: "correct" },
      { key: "common", label: "共通", kind: "use_confused" }],
    hint: "AC ＝ DB は、はじめから分かっていたこと？", explanation: "AC ＝ DB は仮定ではありません。△ABC ≡ △DCB を示したので、合同な図形の対応する辺は等しい、が理由です。" });
  stageQ({ id: "congUse-basic-2", skill: "congUse", level: "basic", format: "figure", figure: figP1(),
    text: "AB ＝ DC、∠ABC ＝ ∠DCB が分かっています。まだ △ABC ≡ △DCB を示していないとき、「対応する辺は等しいので AC ＝ DB」と書いてよい？", type: "choice", answer: "no",
    choices: [{ key: "yes", label: "書いてよい（AC と DB は対応する辺だから）", kind: "use_before_cong" }, { key: "no", label: "まだ書けない（先に合同を示す）", kind: "correct" }],
    hint: "「対応する辺は等しい」は、何が分かったあとに使える？", explanation: "対応する辺が等しいと言えるのは、合同を示したあとです。先に △ABC ≡ △DCB を示します。" });
  stageQ({ id: "congUse-basic-3", skill: "congUse", level: "basic", format: "figure", figure: figP2(),
    text: "△AOC ≡ △BOD を示しました。合同から、新しく言えることはどれ？", type: "choice", answer: "acbd",
    choices: [{ key: "aobo", label: "AO ＝ BO", kind: "already_known" }, { key: "acbd", label: "AC ＝ BD", kind: "correct" }, { key: "acbo", label: "AC ＝ BO", kind: "corr_shift" }],
    hint: "AO ＝ BO は、合同を示す前から分かっていた。", explanation: "AO ＝ BO は仮定です。合同から新しく言えるのは、対応する辺 AC ＝ BD です。" });
  stageQ({ id: "proofFigureFacts-basic-1", skill: "proofFigureFacts", level: "basic", format: "figure", basis: "vertical", required_geometry_skills: ["lineAngles"],
    text: "線分ABとCDが点Oで交わっています。△AOC と △BOD の証明に使える、等しい角を見つけよう。", figure: figP2(), type: "steps",
    steps: [{ id: "s1", skill: "proofFigureFacts", aspect: "claim", type: "choice", answer: "aocbod", text: "等しい角はどれ？",
        choices: [{ key: "aocbod", label: "∠AOC ＝ ∠BOD", kind: "correct" }, { key: "aoccob", label: "∠AOC ＝ ∠COB", kind: "misread" }, { key: "oacobd", label: "∠OAC ＝ ∠OBD", kind: "goal_used" }],
        hint: "O で向かい合う角。", explanation: "∠AOC と ∠BOD は O で向かい合う角です。" },
      { id: "s2", skill: "proofFigureFacts", aspect: "reason", type: "choice", answer: "vertical", text: "そう言える理由は？",
        choices: [{ key: "vertical", label: "対頂角は等しい" }, { key: "common", label: "共通" }, { key: "alternate", label: "平行線の錯角は等しい" }],
        hint: "向かい合う角。", explanation: "対頂角は等しいので ∠AOC ＝ ∠BOD です。" }],
    hint: "証明では、仮定のほかに「図からわかる等しいこと」も使う。", explanation: "∠AOC ＝ ∠BOD（対頂角は等しい）を、証明に使えます。" });

  // =====================================================================
  // 合同と証明：本番の問題バンク（代表の6題・1段階の短い問題に加えて）
  //   1段階の問題は、どの証明のどの行を問うか（src）・対応（corr）・合同条件（cond）・仮定と結論（hc）のどれかで
  //   自動検算する（js/proof.js の verifyStage）。根拠だけの問題（reason_only）は reason だけを記録する
  // =====================================================================
  var BASIS_GEO = { vertical: "lineAngles", alternate: "parallelAngles", corresponding: "parallelAngles" };
  function cq(key, a, b, kind) { return { key: key, label: a + " ＝ " + b, kind: kind, claim: peq(a, b) }; }
  function cg(key, a, b, kind) { return { key: key, label: "△" + a + " ≡ △" + b, kind: kind, claim: pcong(a, b) }; }
  function rc(key, kind) { return { key: key, label: PR_REASON[key], kind: kind }; }
  // 正解がいつも同じ位置にならないように、選択肢を回す（id から決まる）
  function mix(list, id) {
    var n = 0;
    for (var i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
    var k = n % list.length;
    return list.slice(k).concat(list.slice(0, k));
  }
  // 1段階の問題が、どの証明のどの行を問うか。図から使える事実の行なら、その根拠から basis と required_geometry_skills を決める
  function fromLine(q, def, lineId) {
    var l = def.lines.filter(function (x) { return x.id === lineId; })[0];
    q.src = { proof: def, line: lineId };
    if (l.role === "figure_fact") { q.basis = l.reason; q.required_geometry_skills = BASIS_GEO[l.reason] ? [BASIS_GEO[l.reason]] : []; }
    return q;
  }
  // 行の主張と根拠を2つの小問で（主張 → そう言える理由）。約4割の「根拠つき」はこの形と穴うめ証明
  function lineQ(id, skill, level, def, lineId, fig, text, claimAsk, claims, reasons, hint, explanation, extra) {
    var l = def.lines.filter(function (x) { return x.id === lineId; })[0];
    var q = { id: id, skill: skill, level: level, format: "figure", figure: fig, text: text, type: "steps",
      steps: [{ id: "s1", skill: skill, aspect: "claim", part: "claim", type: "choice", answer: claims[0].key, text: claimAsk, choices: mix(claims, id),
          hint: hint, explanation: pClaim(l.claim) + " です。" },
        { id: "s2", skill: skill, aspect: "reason", part: "reason", type: "choice", answer: reasons[0].key, text: "そう言える理由は？", choices: mix(reasons, id + "r"),
          hint: "この等しさは、仮定・図・合同のどこから？", explanation: PR_REASON[l.reason] + " からです。" }],
      hint: hint, explanation: explanation };
    for (var k in extra) q[k] = extra[k];
    stageQ(fromLine(q, def, lineId));
  }
  // 1つの選択だけの問題
  function oneQ(q) { q.choices = mix(q.choices, q.id); q.answer = q.answer || q.choices.filter(function (c) { return c.kind === "correct"; })[0].key; stageQ(q); }
  // 根拠だけを確かめる短い問題（reason_only）。今日の学習の「理由を確認」と、戻る勉強の「② 根拠を選ぶ」でだけ使う。
  //   主張は問題文で示す（新しく測らない）。記録は、このスキルの reason だけ
  function proofReasonQ(id, skill, fig, text, answer, keys, explanation, src) {
    var q = { id: id, skill: skill, level: "basic", reason_only: true, aspect: "reason", usage: "practice", text: text, type: "choice", answer: answer,
      choices: mix(keys.map(function (k) { return { key: k, label: PR_REASON[k] }; }), id), hint: "どうしてそう言えるか、ことばで選ぼう。", explanation: explanation };
    if (fig) { q.format = "figure"; q.figure = fig; }
    if (src && src.cond) q.cond = src.cond;
    else if (src) fromLine(q, src[0], src[1]);
    stageQ(q);
  }

  // ---------- P7：中点と平行線の錯角（1組の辺とその両端の角） ----------
  var P7 = { intro: "△AMC と △BMD において、",
    hyp: [{ parallel: ["AC", "DB"] }, peq("AM", "BM")], goal: peq("AC", "BD"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("AM", "BM"), reason: "hypothesis" },
      { id: "L2", role: "figure_fact", claim: peq("∠MAC", "∠MBD"), reason: "alternate" },
      { id: "L3", role: "figure_fact", claim: peq("∠AMC", "∠BMD"), reason: "vertical" },
      { id: "L4", role: "condition", claim: pcong("AMC", "BMD"), reason: "ASA", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("AC", "BD"), reason: "congruent_parts", depends_on: ["L4"] }] };
  function figP7() {
    return { type: "geometry", points: { A: [60, 60], C: [60, 220], D: [270, 60], B: [270, 220], M: [165, 140] },
      lines: [{ id: "ac", through: ["A", "C"], extend: 0 }, { id: "db", through: ["D", "B"], extend: 0 }],
      segments: [["A", "B"], ["C", "D"]], parallel: [{ lines: ["ac", "db"], marks: 1, at: 0.5 }],
      equalSides: [{ segments: [seg2("A", "M"), seg2("B", "M")], marks: 1 }] };
  }
  // ---------- P8：二等分線（2組の辺とその間の角）。P8c は合同までの4行 ----------
  var P8 = { intro: "△ABD と △ACD において、",
    hyp: [peq("AB", "AC"), peq("∠BAD", "∠CAD")], goal: peq("BD", "CD"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("AB", "AC"), reason: "hypothesis" },
      { id: "L2", role: "hyp_fact", claim: peq("∠BAD", "∠CAD"), reason: "hypothesis" },
      { id: "L3", role: "figure_fact", claim: peq("AD", "AD"), reason: "common" },
      { id: "L4", role: "condition", claim: pcong("ABD", "ACD"), reason: "SAS", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("BD", "CD"), reason: "congruent_parts", depends_on: ["L4"] }] };
  var P8c = { intro: P8.intro, hyp: P8.hyp, goal: pcong("ABD", "ACD"), lines: P8.lines.slice(0, 4) };
  function figP8() {
    return { type: "geometry", points: { A: [160, 40], B: [70, 230], C: [250, 230], D: [160, 230] },
      segments: [["A", "B"], ["A", "C"], ["B", "C"], ["A", "D"]],
      angles: [ang("a1", "A", "B", "D", { label: "" }), ang("a2", "A", "C", "D", { label: "" })],
      equalSides: [{ segments: [seg2("A", "B"), seg2("A", "C")], marks: 1 }], equalAngles: [{ angles: ["a1", "a2"], marks: 1 }] };
  }
  // ---------- P9：平行線の同位角を2組（1組の辺とその両端の角） ----------
  var P9 = { intro: "△ABC と △DCE において、",
    hyp: [{ parallel: ["AB", "DC"] }, { parallel: ["AC", "DE"] }, peq("BC", "CE")], goal: peq("AC", "DE"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("BC", "CE"), reason: "hypothesis" },
      { id: "L2", role: "figure_fact", claim: peq("∠ABC", "∠DCE"), reason: "corresponding" },
      { id: "L3", role: "figure_fact", claim: peq("∠ACB", "∠DEC"), reason: "corresponding" },
      { id: "L4", role: "condition", claim: pcong("ABC", "DCE"), reason: "ASA", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("AC", "DE"), reason: "congruent_parts", depends_on: ["L4"] }] };
  function figP9() {
    return { type: "geometry", points: { B: [40, 220], C: [160, 220], E: [280, 220], A: [100, 80], D: [220, 80] },
      lines: [{ id: "ab", through: ["A", "B"], extend: 0 }, { id: "dc", through: ["D", "C"], extend: 0 }, { id: "ac", through: ["A", "C"], extend: 0 }, { id: "de", through: ["D", "E"], extend: 0 }],
      segments: [["B", "E"]], parallel: [{ lines: ["ab", "dc"], marks: 1, at: 0.45 }, { lines: ["ac", "de"], marks: 2, at: 0.55 }],
      equalSides: [{ segments: [seg2("B", "C"), seg2("C", "E")], marks: 1 }] };
  }
  // ---------- P10：四角形の対角線（3組の辺） ----------
  var P10 = { intro: "△ABD と △CDB において、",
    hyp: [peq("AB", "CD"), peq("AD", "CB")], goal: peq("∠BAD", "∠DCB"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("AB", "CD"), reason: "hypothesis" },
      { id: "L2", role: "hyp_fact", claim: peq("AD", "CB"), reason: "hypothesis" },
      { id: "L3", role: "figure_fact", claim: peq("BD", "DB"), reason: "common" },
      { id: "L4", role: "condition", claim: pcong("ABD", "CDB"), reason: "SSS", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("∠BAD", "∠DCB"), reason: "congruent_parts", depends_on: ["L4"] }] };
  function figP10() {
    return { type: "geometry", points: { A: [100, 60], D: [280, 60], B: [40, 220], C: [220, 220] },
      segments: [["A", "B"], ["B", "C"], ["C", "D"], ["D", "A"], ["B", "D"]],
      equalSides: [{ segments: [seg2("A", "B"), seg2("C", "D")], marks: 1 }, { segments: [seg2("A", "D"), seg2("C", "B")], marks: 2 }] };
  }
  // ---------- P11：対頂角と仮定の角（1組の辺とその両端の角） ----------
  var P11 = { intro: "△AOC と △BOD において、",
    hyp: [peq("AO", "BO"), peq("∠OAC", "∠OBD")], goal: peq("CO", "DO"),
    lines: [{ id: "L1", role: "hyp_fact", claim: peq("AO", "BO"), reason: "hypothesis" },
      { id: "L2", role: "hyp_fact", claim: peq("∠OAC", "∠OBD"), reason: "hypothesis" },
      { id: "L3", role: "figure_fact", claim: peq("∠AOC", "∠BOD"), reason: "vertical" },
      { id: "L4", role: "condition", claim: pcong("AOC", "BOD"), reason: "ASA", depends_on: ["L1", "L2", "L3"] },
      { id: "L5", role: "use", claim: peq("CO", "DO"), reason: "congruent_parts", depends_on: ["L4"] }] };
  function figP11() {
    var f = figP2();
    f.equalSides = [{ segments: [seg2("A", "O"), seg2("B", "O")], marks: 1 }];
    f.angles = [ang("a", "A", "O", "C", { label: "" }), ang("b", "B", "O", "D", { label: "" })];
    f.equalAngles = [{ angles: ["a", "b"], marks: 1 }];
    return f;
  }
  // 代表の証明の図（1段階の問題でも同じ図を使う）
  function figP5() {
    return { type: "geometry", points: { B: [70, 140], D: [270, 140], A: [170, 50], C: [170, 230] },
      segments: [["A", "B"], ["A", "D"], ["C", "B"], ["C", "D"], ["B", "D"]],
      angles: [ang("b1", "B", "A", "D", { label: "" }), ang("b2", "B", "D", "C", { label: "" }), ang("d1", "D", "B", "A", { label: "" }), ang("d2", "D", "C", "B", { label: "" })],
      equalAngles: [{ angles: ["b1", "b2"], marks: 1 }, { angles: ["d1", "d2"], marks: 2 }] };
  }
  function figP6() {
    return { type: "geometry", points: { A: [160, 40], B: [70, 220], C: [250, 220], D: { along: ["A", "B", 0.55] }, E: { along: ["A", "C", 0.55] } },
      segments: [["A", "B"], ["A", "C"], ["B", "E"], ["C", "D"]], labels: ["A", "B", "C", "D", "E"],
      equalSides: [{ segments: [seg2("A", "B"), seg2("A", "C")], marks: 1 }, { segments: [seg2("A", "E"), seg2("A", "D")], marks: 2 }] };
  }

  // ---------- 穴うめ証明・並べかえ（証明の組み立て） ----------
  proofFill("proof-basic-sas-bisector-1", "basic", P8c, figP8(), "AB ＝ AC、∠BAD ＝ ∠CAD です。△ABD ≡ △ACD を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L3", part: "claim", choices: [["adad", "AD ＝ AD", "correct"], ["bdcd", "BD ＝ CD", "goal_used"], ["abad", "AB ＝ AD", "misread"]] },
    { line: "L3", part: "reason", choices: [["common", "共通", "correct"], ["hypothesis", "仮定", "misread"], ["vertical", "対頂角は等しい", "misread"]] },
    { line: "L4", part: "reason", choices: [["SAS", PR_REASON.SAS, "correct"], ["SSS", PR_REASON.SSS, "SSS"], ["ASA", PR_REASON.ASA, "ASA"]] }
  ], "AD は2つの三角形の両方にある辺。", "AB ＝ AC（仮定）、∠BAD ＝ ∠CAD（仮定）、AD ＝ AD（共通）。2組の辺とその間の角がそれぞれ等しいので △ABD ≡ △ACD です。");
  proofOrder("proof-order-basic-sas-bisector-1", P8c, figP8(), "AB ＝ AC、∠BAD ＝ ∠CAD です。△ABD ≡ △ACD を証明します。証明の行を、正しい順番にタップしよう（4行）。",
    ["L4", "L3", "L1", "L2"], "合同を言うのは、3つの等しいことがそろってから。", "等しいこと3つ（順番は自由）→ △ABD ≡ △ACD の順です。", "basic");
  proofFill("proof-asa-corresponding-1", "application", P9, figP9(), "点B、C、Eは一直線上にあり、AB // DC、AC // DE、BC ＝ CE です。AC ＝ DE を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L2", part: "claim", choices: [["abcdce", "∠ABC ＝ ∠DCE", "correct"], ["abcdec", "∠ABC ＝ ∠DEC", "corr_shift"], ["abcacb", "∠ABC ＝ ∠ACB", "misread"]] },
    { line: "L2", part: "reason", choices: [["corresponding", "平行線の同位角は等しい", "correct"], ["alternate", "平行線の錯角は等しい", "misread"], ["vertical", "対頂角は等しい", "misread"]] },
    { line: "L3", part: "reason", choices: [["corresponding", "平行線の同位角は等しい", "correct"], ["alternate", "平行線の錯角は等しい", "misread"], ["hypothesis", "仮定", "misread"]] },
    { line: "L4", part: "claim", choices: [["abcdce", "△ABC ≡ △DCE", "correct"], ["abcdec", "△ABC ≡ △DEC", "corr_shift"], ["abccde", "△ABC ≡ △CDE", "corr_shift"]] },
    { line: "L4", part: "reason", choices: [["ASA", PR_REASON.ASA, "correct"], ["SAS", PR_REASON.SAS, "SAS"], ["SSA", PR_REASON.SSA + "（合同とはいえない）", "SSA"]] },
    { line: "L5", part: "claim", choices: [["acde", "AC ＝ DE", "correct"], ["acdc", "AC ＝ DC", "corr_shift"], ["abde", "AB ＝ DE", "misread"]] }
  ], "平行線と、一直線 BE でできる同じ位置の角。", "BC ＝ CE（仮定）、∠ABC ＝ ∠DCE（AB // DC の同位角）、∠ACB ＝ ∠DEC（AC // DE の同位角）。1組の辺とその両端の角がそれぞれ等しいので △ABC ≡ △DCE、AC ＝ DE です。");
  proofOrder("proof-order-asa-corresponding-1", P9, figP9(), "点B、C、Eは一直線上にあり、AB // DC、AC // DE、BC ＝ CE です。AC ＝ DE を証明します。証明の行を、正しい順番にタップしよう。",
    ["L4", "L2", "L5", "L3", "L1"], "結論（AC ＝ DE）は合同のあと。合同は3つの等しいことのあと。", "等しいこと3つ（順番は自由）→ △ABC ≡ △DCE → AC ＝ DE です。");
  proofFill("proof-asa-alternate-2", "application", P7, figP7(), "AC // DB、点Mは線分ABの中点で、線分CDも点Mを通ります。AC ＝ BD を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L1", part: "claim", choices: [["ambm", "AM ＝ BM", "correct"], ["acbd", "AC ＝ BD", "goal_used"], ["cmdm", "CM ＝ DM", "misread"]] },
    { line: "L2", part: "reason", choices: [["alternate", "平行線の錯角は等しい", "correct"], ["corresponding", "平行線の同位角は等しい", "misread"], ["vertical", "対頂角は等しい", "misread"]] },
    { line: "L3", part: "claim", choices: [["amcbmd", "∠AMC ＝ ∠BMD", "correct"], ["amcamd", "∠AMC ＝ ∠AMD", "misread"], ["mcamdb", "∠MCA ＝ ∠MDB", "goal_used"]] },
    { line: "L4", part: "reason", choices: [["ASA", PR_REASON.ASA, "correct"], ["SAS", PR_REASON.SAS, "SAS"], ["SSS", PR_REASON.SSS, "SSS"]] },
    { line: "L5", part: "reason", choices: [["congruent_parts", "合同な図形の対応する辺（角）は等しい", "correct"], ["hypothesis", "仮定", "goal_used"], ["alternate", "平行線の錯角は等しい", "misread"]] }
  ], "中点なので AM ＝ BM。平行線 AC、DB と、横切る直線 AB でできる角。", "AM ＝ BM（仮定）、∠MAC ＝ ∠MBD（錯角）、∠AMC ＝ ∠BMD（対頂角）。1組の辺とその両端の角がそれぞれ等しいので △AMC ≡ △BMD、AC ＝ BD です。");
  proofFill("proof-sas-bisector-1", "retention", P8, figP8(), "点Dは辺BC上にあり、AB ＝ AC、∠BAD ＝ ∠CAD です。BD ＝ CD を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L2", part: "reason", choices: [["hypothesis", "仮定", "correct"], ["common", "共通", "misread"], ["congruent_parts", "合同な図形の対応する辺（角）は等しい", "goal_used"]] },
    { line: "L3", part: "claim", choices: [["adad", "AD ＝ AD", "correct"], ["bdcd", "BD ＝ CD", "goal_used"], ["bcbc", "BC ＝ BC", "misread"]] },
    { line: "L4", part: "reason", choices: [["SAS", PR_REASON.SAS, "correct"], ["SSA", PR_REASON.SSA + "（合同とはいえない）", "SSA"], ["ASA", PR_REASON.ASA, "ASA"]] },
    { line: "L5", part: "claim", choices: [["bdcd", "BD ＝ CD", "correct"], ["bdad", "BD ＝ AD", "corr_shift"], ["abcd", "AB ＝ CD", "misread"]] }
  ], "AD は2つの三角形の両方にある辺。", "AB ＝ AC（仮定）、∠BAD ＝ ∠CAD（仮定）、AD ＝ AD（共通）。2組の辺とその間の角がそれぞれ等しいので △ABD ≡ △ACD、BD ＝ CD です。");
  proofFill("proof-sss-quad-1", "retention", P10, figP10(), "四角形ABCDで、AB ＝ CD、AD ＝ CB です。∠BAD ＝ ∠DCB を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L3", part: "claim", choices: [["bddb", "BD ＝ DB", "correct"], ["acca", "AC ＝ CA", "misread"], ["abad", "AB ＝ AD", "misread"]] },
    { line: "L3", part: "reason", choices: [["common", "共通", "correct"], ["hypothesis", "仮定", "misread"], ["congruent_parts", "合同な図形の対応する辺（角）は等しい", "goal_used"]] },
    { line: "L4", part: "claim", choices: [["abdcdb", "△ABD ≡ △CDB", "correct"], ["abdcbd", "△ABD ≡ △CBD", "corr_shift"], ["abddcb", "△ABD ≡ △DCB", "corr_shift"]] },
    { line: "L4", part: "reason", choices: [["SSS", PR_REASON.SSS, "correct"], ["SAS", PR_REASON.SAS, "SAS"], ["ASA", PR_REASON.ASA, "ASA"]] },
    { line: "L5", part: "claim", choices: [["baddcb", "∠BAD ＝ ∠DCB", "correct"], ["badcdb", "∠BAD ＝ ∠CDB", "corr_shift"], ["abdcdb", "∠ABD ＝ ∠CDB", "misread"]] }
  ], "対角線 BD は2つの三角形の両方にある辺。", "AB ＝ CD、AD ＝ CB（仮定）、BD ＝ DB（共通）。3組の辺がそれぞれ等しいので △ABD ≡ △CDB、∠BAD ＝ ∠DCB です。");
  proofFill("proof-asa-vertical-2", "retention", P11, figP11(), "線分ABとCDが点Oで交わり、AO ＝ BO、∠OAC ＝ ∠OBD です。CO ＝ DO を証明します。［ ］にあてはまるものを選ぼう。", [
    { line: "L2", part: "claim", choices: [["oacobd", "∠OAC ＝ ∠OBD", "correct"], ["aocbod", "∠AOC ＝ ∠BOD", "misread"], ["ocaodb", "∠OCA ＝ ∠ODB", "goal_used"]] },
    { line: "L3", part: "reason", choices: [["vertical", "対頂角は等しい", "correct"], ["alternate", "平行線の錯角は等しい", "misread"], ["hypothesis", "仮定", "misread"]] },
    { line: "L4", part: "reason", choices: [["ASA", PR_REASON.ASA, "correct"], ["SAS", PR_REASON.SAS, "SAS"], ["SSA", PR_REASON.SSA + "（合同とはいえない）", "SSA"]] },
    { line: "L5", part: "claim", choices: [["codo", "CO ＝ DO", "correct"], ["cobo", "CO ＝ BO", "corr_shift"], ["aobo", "AO ＝ BO", "misread"]] }
  ], "O で向かい合う角。辺 AO の両端の角が等しい。", "AO ＝ BO（仮定）、∠OAC ＝ ∠OBD（仮定）、∠AOC ＝ ∠BOD（対頂角）。1組の辺とその両端の角がそれぞれ等しいので △AOC ≡ △BOD、CO ＝ DO です。");

  // ---------- 仮定と結論 ----------
  oneQ({ id: "proofHypConc-basic-2", skill: "proofHypConc", level: "basic", hc: { hyp: [peq("AO", "BO"), peq("CO", "DO")], goal: peq("AC", "BD"), ask: "hyp" },
    text: "「AO ＝ BO、CO ＝ DO ならば、AC ＝ BD」の仮定はどれ？", type: "choice",
    choices: [{ key: "both", label: "AO ＝ BO と CO ＝ DO", kind: "correct", claims: [peq("AO", "BO"), peq("CO", "DO")] },
      { key: "goal", label: "AC ＝ BD", kind: "conclusion_as_hypothesis", claims: [peq("AC", "BD")] },
      { key: "mixed", label: "AO ＝ BO と AC ＝ BD", kind: "conclusion_as_hypothesis", claims: [peq("AO", "BO"), peq("AC", "BD")] }],
    hint: "「ならば」の前が仮定。", explanation: "「ならば」の前の AO ＝ BO と CO ＝ DO が仮定です。AC ＝ BD は結論です。" });
  oneQ({ id: "proofHypConc-basic-3", skill: "proofHypConc", level: "basic", hc: { hyp: [peq("AB", "AC")], goal: peq("∠B", "∠C"), ask: "goal" },
    text: "「△ABC で、AB ＝ AC ならば、∠B ＝ ∠C」の結論はどれ？", type: "choice",
    choices: [cq("bc", "∠B", "∠C", "correct"), cq("abac", "AB", "AC", "conclusion_as_hypothesis"), cq("abbc", "AB", "BC", "misread")],
    hint: "「ならば」の後が結論。", explanation: "「ならば」の後の ∠B ＝ ∠C が結論です。AB ＝ AC は仮定です。" });
  oneQ({ id: "proofHypConc-basic-4", skill: "proofHypConc", level: "basic", format: "figure", figure: figP8(), hc: { hyp: P8.hyp, goal: P8.goal, ask: "hyp_one" },
    text: "AB ＝ AC、∠BAD ＝ ∠CAD のとき、BD ＝ CD を証明します。仮定として書いてよいものはどれ？", type: "choice",
    choices: [cq("abac", "AB", "AC", "correct"), cq("bdcd", "BD", "CD", "conclusion_as_hypothesis"), cq("adad", "AD", "AD", "misread")],
    hint: "問題文で「わかっている」と書かれていること。", explanation: "AB ＝ AC は問題文で与えられた仮定です。BD ＝ CD はこれから示す結論、AD ＝ AD は図からわかること（共通）です。" });
  lineQ("proofHypConc-standard-1", "proofHypConc", "standard", P7, "L1", figP7(), "AC // DB、点Mは線分ABの中点です。AC ＝ BD を証明します。",
    "仮定から書ける、辺の等しさはどれ？", [cq("ambm", "AM", "BM", "correct"), cq("acbd", "AC", "BD", "conclusion_as_hypothesis"), cq("cmdm", "CM", "DM", "misread")],
    [rc("hypothesis", "correct"), rc("common", "misread"), rc("vertical", "misread")], "「中点」から言えること。", "M が AB の中点なので AM ＝ BM（仮定）です。AC ＝ BD は結論なので、まだ使えません。");
  oneQ({ id: "proofHypConc-standard-2", skill: "proofHypConc", level: "standard", format: "figure", figure: figP10(), hc: { hyp: P10.hyp, goal: P10.goal, ask: "goal" },
    text: "四角形ABCDで、AB ＝ CD、AD ＝ CB ならば、∠BAD ＝ ∠DCB です。この結論はどれ？", type: "choice",
    choices: [cq("baddcb", "∠BAD", "∠DCB", "correct"), cq("abcd", "AB", "CD", "conclusion_as_hypothesis"), cq("bddb", "BD", "DB", "misread")],
    hint: "証明したいこと。", explanation: "結論は ∠BAD ＝ ∠DCB です。AB ＝ CD・AD ＝ CB は仮定、BD ＝ DB は図からわかること（共通）です。" });
  stageQ({ id: "proofHypConc-application-1", skill: "proofHypConc", level: "application", format: "figure", figure: figP1(), hc: { hyp: P1.hyp, goal: P1.goal, ask: "goal" },
    text: "AB ＝ DC、∠ABC ＝ ∠DCB のとき、AC ＝ DB を証明しています。", type: "steps",
    steps: [{ id: "s1", skill: "proofHypConc", aspect: "claim", type: "choice", answer: "acdb", text: "証明の途中で、根拠として使ってはいけないものはどれ？",
        choices: mix([cq("acdb", "AC", "DB", "correct"), cq("abdc", "AB", "DC", "misread"), cq("bccb", "BC", "CB", "misread")], "hc-app-1"),
        hint: "まだ示していないことは使えない。", explanation: "AC ＝ DB はこれから示す結論なので、途中の根拠には使えません。" },
      { id: "s2", skill: "proofHypConc", aspect: "reason", part: "reason", type: "choice", answer: "hypothesis", text: "AB ＝ DC は、証明の中で何として書ける？",
        choices: mix([rc("hypothesis", "correct"), rc("common", "misread"), rc("congruent_parts", "goal_used")], "hc-app-1r"),
        hint: "問題文で与えられている。", explanation: "AB ＝ DC は問題文で与えられているので、仮定です。" }],
    hint: "仮定・図からわかること・結論を分ける。", explanation: "AB ＝ DC は仮定、BC ＝ CB は共通なので使えます。AC ＝ DB は結論なので、合同を示したあとに言います。" });
  oneQ({ id: "proofHypConc-retention-1", skill: "proofHypConc", level: "retention", hc: { hyp: P3.hyp, goal: P3.goal, ask: "goal" },
    text: "「AB // CD、AO ＝ DO ならば、BO ＝ CO」の結論はどれ？", type: "choice",
    choices: [cq("boco", "BO", "CO", "correct"), cq("aodo", "AO", "DO", "conclusion_as_hypothesis"), { key: "par", label: "AB // CD", kind: "conclusion_as_hypothesis", claim: { parallel: ["AB", "CD"] } }],
    hint: "「ならば」の後。", explanation: "結論は BO ＝ CO です。AB // CD と AO ＝ DO は仮定です。" });
  lineQ("proofHypConc-retention-2", "proofHypConc", "retention", P11, "L2", figP11(), "線分ABとCDが点Oで交わり、AO ＝ BO、∠OAC ＝ ∠OBD です。CO ＝ DO を証明します。",
    "仮定から書ける、角の等しさはどれ？", [cq("oacobd", "∠OAC", "∠OBD", "correct"), cq("aocbod", "∠AOC", "∠BOD", "misread"), cq("ocaodb", "∠OCA", "∠ODB", "conclusion_as_hypothesis")],
    [rc("hypothesis", "correct"), rc("vertical", "misread"), rc("common", "misread")], "問題文で与えられた角。", "∠OAC ＝ ∠OBD は問題文で与えられた仮定です（∠AOC ＝ ∠BOD は対頂角で、図からわかること）。");

  // ---------- 対応する辺・角 ----------
  oneQ({ id: "congCorr-basic-3", skill: "congCorr", level: "basic", corr: { cong: ["PQR", "XYZ"], of: "∠PQR" },
    text: "△PQR ≡ △XYZ のとき、∠Q と等しい角はどれ？", type: "choice",
    choices: [{ key: "y", label: "∠Y", name: "∠XYZ", kind: "correct" }, { key: "x", label: "∠X", name: "∠YXZ", kind: "corr_shift" }, { key: "z", label: "∠Z", name: "∠XZY", kind: "corr_shift" }],
    hint: "≡ の前後で、同じ位置の頂点。", explanation: "Q と Y が対応するので、∠Q ＝ ∠Y です。" });
  oneQ({ id: "congCorr-basic-4", skill: "congCorr", level: "basic", corr: { cong: ["ABC", "DEF"], of: "AC" },
    text: "△ABC ≡ △DEF のとき、辺 AC に対応する辺はどれ？", type: "choice",
    choices: [{ key: "df", label: "DF", name: "DF", kind: "correct" }, { key: "de", label: "DE", name: "DE", kind: "corr_shift" }, { key: "ef", label: "EF", name: "EF", kind: "corr_shift" }],
    hint: "A と D、C と F が対応する。", explanation: "A と D、C と F が対応するので、AC に対応するのは DF です。" });
  oneQ({ id: "congCorr-standard-1", skill: "congCorr", level: "standard", format: "figure", figure: figP1(), corr: { cong: ["ABC", "DCB"], of: "AB" },
    text: "図で △ABC ≡ △DCB です。辺 AB に対応する辺はどれ？", type: "choice",
    choices: [{ key: "dc", label: "DC", name: "DC", kind: "correct" }, { key: "db", label: "DB", name: "DB", kind: "corr_shift" }, { key: "cb", label: "CB", name: "CB", kind: "corr_shift" }],
    hint: "△ABC ≡ △DCB の順に、A→D、B→C、C→B。", explanation: "A と D、B と C が対応するので、AB に対応するのは DC です。" });
  oneQ({ id: "congCorr-standard-2", skill: "congCorr", level: "standard", format: "figure", figure: figP2(), corr: { cong: ["AOC", "BOD"], of: "∠OCA" },
    text: "図で △AOC ≡ △BOD です。∠OCA と等しい角はどれ？", type: "choice",
    choices: [{ key: "odb", label: "∠ODB", name: "∠ODB", kind: "correct" }, { key: "obd", label: "∠OBD", name: "∠OBD", kind: "corr_shift" }, { key: "bod", label: "∠BOD", name: "∠BOD", kind: "corr_shift" }],
    hint: "C に対応する頂点は？", explanation: "C と D が対応するので、∠OCA ＝ ∠ODB です。" });
  oneQ({ id: "congCorr-standard-3", skill: "congCorr", level: "standard", format: "figure", figure: figP10(), corr: { cong: ["ABD", "CDB"], of: "AD" },
    text: "図で △ABD ≡ △CDB です。辺 AD に対応する辺はどれ？", type: "choice",
    choices: [{ key: "cb", label: "CB", name: "CB", kind: "correct" }, { key: "cd", label: "CD", name: "CD", kind: "corr_shift" }, { key: "db", label: "DB", name: "DB", kind: "corr_shift" }],
    hint: "A→C、B→D、D→B。", explanation: "A と C、D と B が対応するので、AD に対応するのは CB です。" });
  stageQ(fromLine({ id: "congCorr-application-1", skill: "congCorr", level: "application", format: "figure", figure: figP1(),
    text: "図の印から、△ABC と △DCB は合同です。", type: "steps",
    steps: [{ id: "s1", skill: "congCorr", aspect: "claim", part: "claim", type: "choice", answer: "abcdcb", text: "対応する頂点の順に正しく書いたものはどれ？",
        choices: mix([cg("abcdcb", "ABC", "DCB", "correct"), cg("abcbcd", "ABC", "BCD", "corr_shift"), cg("abccdb", "ABC", "CDB", "corr_shift")], "corr-app-1"),
        hint: "印のついた辺・角どうしが対応する。", explanation: "A と D、B と C、C と B が対応するので、△ABC ≡ △DCB です。" },
      { id: "s2", skill: "congCond", aspect: "reason", part: "reason", type: "choice", answer: "SAS", text: "そう言える合同条件はどれ？",
        choices: mix([rc("SAS", "correct"), rc("SSS", "SSS"), rc("ASA", "ASA")], "corr-app-1r"),
        hint: "AB ＝ DC、∠ABC ＝ ∠DCB、BC ＝ CB。", explanation: "∠ABC は辺 AB と BC の間の角なので、2組の辺とその間の角がそれぞれ等しい、です。" }],
    hint: "印のついた辺・角どうしが対応する。", explanation: "AB ＝ DC、∠ABC ＝ ∠DCB、BC ＝ CB（共通）。2組の辺とその間の角がそれぞれ等しいので △ABC ≡ △DCB です。" }, P1, "L4"));
  oneQ({ id: "congCorr-retention-1", skill: "congCorr", level: "retention", corr: { cong: ["LMN", "PQR"], of: "MN" },
    text: "△LMN ≡ △PQR のとき、辺 MN に対応する辺はどれ？", type: "choice",
    choices: [{ key: "qr", label: "QR", name: "QR", kind: "correct" }, { key: "pq", label: "PQ", name: "PQ", kind: "corr_shift" }, { key: "pr", label: "PR", name: "PR", kind: "corr_shift" }],
    hint: "M と Q、N と R が対応する。", explanation: "M と Q、N と R が対応するので、MN に対応するのは QR です。" });
  oneQ({ id: "congCorr-retention-2", skill: "congCorr", level: "retention", format: "figure", figure: figP8(), corr: { cong: ["ABD", "ACD"], of: "∠ADB" },
    text: "図で △ABD ≡ △ACD です。∠ADB と等しい角はどれ？", type: "choice",
    choices: [{ key: "adc", label: "∠ADC", name: "∠ADC", kind: "correct" }, { key: "acd", label: "∠ACD", name: "∠ACD", kind: "corr_shift" }, { key: "cad", label: "∠CAD", name: "∠CAD", kind: "corr_shift" }],
    hint: "D は D に対応する。", explanation: "A→A、B→C、D→D なので、∠ADB ＝ ∠ADC です。" });

  // ---------- 三角形の合同条件 ----------
  var ABC_DEF = ["ABC", "DEF"];
  oneQ({ id: "congCond-basic-3", skill: "congCond", level: "basic", aspect: "reason", cond: { cong: ABC_DEF, eqs: [["AB", "DE"], ["BC", "EF"], ["CA", "FD"]] },
    text: "△ABC と △DEF で、AB ＝ DE、BC ＝ EF、CA ＝ FD のとき、使える合同条件はどれ？", type: "choice",
    choices: [rc("SSS", "correct"), rc("SAS", "SAS"), rc("ASA", "ASA")], hint: "等しいのは辺だけ？", explanation: "3組の辺がそれぞれ等しい、です。" });
  oneQ({ id: "congCond-basic-4", skill: "congCond", level: "basic", aspect: "reason", cond: { cong: ABC_DEF, eqs: [["BC", "EF"], ["∠ABC", "∠DEF"], ["∠ACB", "∠DFE"]] },
    text: "△ABC と △DEF で、BC ＝ EF、∠B ＝ ∠E、∠C ＝ ∠F のとき、使える合同条件はどれ？", type: "choice",
    choices: [rc("ASA", "correct"), rc("SAS", "SAS"), rc("SSS", "SSS")], hint: "等しい角は、等しい辺の両端にある？", explanation: "∠B と ∠C は辺 BC の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。" });
  oneQ({ id: "congCond-basic-5", skill: "congCond", level: "basic", aspect: "reason", cond: { cong: ABC_DEF, eqs: [["AB", "DE"], ["∠BAC", "∠EDF"], ["AC", "DF"]] },
    text: "△ABC と △DEF で、AB ＝ DE、∠A ＝ ∠D、AC ＝ DF のとき、使える合同条件はどれ？", type: "choice",
    choices: [rc("SAS", "correct"), rc("ASA", "ASA"), rc("SSS", "SSS")], hint: "∠A は辺 AB と AC の間の角？", explanation: "∠A は AB と AC の間の角なので、2組の辺とその間の角がそれぞれ等しい、です。" });
  oneQ(fromLine({ id: "congCond-standard-1", skill: "congCond", level: "standard", aspect: "reason", part: "reason", format: "figure", figure: figP7(),
    text: "△AMC と △BMD で、AM ＝ BM、∠MAC ＝ ∠MBD、∠AMC ＝ ∠BMD です。使える合同条件はどれ？", type: "choice",
    choices: [rc("ASA", "correct"), rc("SAS", "SAS"), rc("SSA", "SSA")], hint: "等しい2つの角は、辺 AM の両端？", explanation: "∠MAC と ∠AMC は辺 AM の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。" }, P7, "L4"));
  oneQ(fromLine({ id: "congCond-standard-2", skill: "congCond", level: "standard", aspect: "reason", part: "reason", format: "figure", figure: figP10(),
    text: "△ABD と △CDB で、AB ＝ CD、AD ＝ CB、BD ＝ DB です。使える合同条件はどれ？", type: "choice",
    choices: [rc("SSS", "correct"), rc("SAS", "SAS"), rc("ASA", "ASA")], hint: "等しいのは辺？角？", explanation: "3組の辺がそれぞれ等しい、です。" }, P10, "L4"));
  oneQ({ id: "congCond-standard-3", skill: "congCond", level: "standard", cond: { cong: ABC_DEF, eqs: [["AB", "DE"], ["BC", "EF"], ["∠BAC", "∠EDF"]] },
    text: "△ABC と △DEF で、AB ＝ DE、BC ＝ EF、∠A ＝ ∠D のとき、合同といえる？", type: "choice", answer: "no",
    choices: [{ key: "SAS", label: "いえる（2組の辺とその間の角）", kind: "SSA" }, { key: "no", label: "いえない（角が2辺の間にない）", kind: "correct" }],
    hint: "辺 AB と BC の間の角は？", explanation: "AB と BC の間の角は ∠B です。∠A は間の角ではないので、この3つだけでは合同とはいえません。" });
  oneQ({ id: "congCond-standard-4", skill: "congCond", level: "standard", cond: { cong: ABC_DEF, eqs: [["AB", "DE"], ["∠ABC", "∠DEF"]], need: "SAS" },
    text: "△ABC と △DEF で、AB ＝ DE、∠B ＝ ∠E です。あと1つ何がわかれば「2組の辺とその間の角」で合同といえる？", type: "choice",
    choices: [{ key: "bcef", label: "BC ＝ EF", kind: "correct", eq: ["BC", "EF"] }, { key: "acdf", label: "AC ＝ DF", kind: "SSA", eq: ["AC", "DF"] }, { key: "bcde", label: "BC ＝ DE", kind: "corr_shift", eq: ["BC", "DE"] }],
    hint: "∠B をはさむ2辺は？", explanation: "∠B をはさむのは AB と BC。BC ＝ EF がわかれば、2組の辺とその間の角がそれぞれ等しくなります。" });
  stageQ(fromLine({ id: "congCond-application-1", skill: "congCond", level: "application", format: "figure", figure: figP11(),
    text: "図で、AO ＝ BO、∠OAC ＝ ∠OBD です（O で向かい合う角も使えます）。", type: "steps",
    steps: [{ id: "s1", skill: "congCond", aspect: "claim", part: "claim", type: "choice", answer: "aocbod", text: "△AOC と合同な三角形を、対応の順に書くと？",
        choices: mix([cg("aocbod", "AOC", "BOD", "correct"), cg("aocdob", "AOC", "DOB", "corr_shift"), cg("aocobd", "AOC", "OBD", "corr_shift")], "cond-app-1"),
        hint: "A と等しい角をもつ頂点は？", explanation: "A と B、O と O、C と D が対応するので、△AOC ≡ △BOD です。" },
      { id: "s2", skill: "congCond", aspect: "reason", part: "reason", type: "choice", answer: "ASA", text: "使う合同条件はどれ？",
        choices: mix([rc("ASA", "correct"), rc("SAS", "SAS"), rc("SSA", "SSA")], "cond-app-1r"),
        hint: "等しい角は辺 AO の両端？", explanation: "∠OAC と ∠AOC（対頂角で ∠BOD と等しい）は辺 AO の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。" }],
    hint: "O で向かい合う角も等しい。", explanation: "AO ＝ BO、∠OAC ＝ ∠OBD（仮定）、∠AOC ＝ ∠BOD（対頂角）。1組の辺とその両端の角がそれぞれ等しいので △AOC ≡ △BOD です。" }, P11, "L4"));
  oneQ({ id: "congCond-retention-1", skill: "congCond", level: "retention", aspect: "reason", cond: { cong: ABC_DEF, eqs: [["AC", "DF"], ["∠ACB", "∠DFE"], ["BC", "EF"]] },
    text: "△ABC と △DEF で、AC ＝ DF、∠C ＝ ∠F、BC ＝ EF のとき、使える合同条件はどれ？", type: "choice",
    choices: [rc("SAS", "correct"), rc("SSS", "SSS"), rc("ASA", "ASA"), rc("SSA", "SSA")], hint: "∠C は辺 AC と BC の間？", explanation: "∠C は AC と BC の間の角なので、2組の辺とその間の角がそれぞれ等しい、です。" });
  oneQ({ id: "congCond-retention-2", skill: "congCond", level: "retention", aspect: "reason", cond: { cong: ABC_DEF, eqs: [["AB", "DE"], ["∠BAC", "∠EDF"], ["∠ABC", "∠DEF"]] },
    text: "△ABC と △DEF で、AB ＝ DE、∠A ＝ ∠D、∠B ＝ ∠E のとき、使える合同条件はどれ？", type: "choice",
    choices: [rc("ASA", "correct"), rc("SAS", "SAS"), rc("SSA", "SSA")], hint: "∠A と ∠B は辺 AB の両端？", explanation: "∠A と ∠B は辺 AB の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。" });

  // ---------- 合同から言えること ----------
  oneQ(fromLine({ id: "congUse-basic-4", skill: "congUse", level: "basic", aspect: "reason", part: "reason", format: "figure", figure: figP5(),
    text: "△ABD ≡ △CBD を示しました。このあと AB ＝ CB と言える理由はどれ？", type: "choice",
    choices: [rc("congruent_parts", "correct"), rc("hypothesis", "use_confused"), rc("common", "use_confused")],
    hint: "AB ＝ CB は、はじめから分かっていたこと？", explanation: "AB ＝ CB は仮定ではありません。△ABD ≡ △CBD を示したので、合同な図形の対応する辺は等しい、が理由です。" }, P5, "L5"));
  oneQ({ id: "congUse-standard-1", skill: "congUse", level: "standard", format: "figure", figure: figP8(), manual_check: "主張はどれも BD ＝ CD。書き方（根拠と順番）だけを問う",
    text: "△ABD ≡ △ACD を示しました。次に書く行として正しいものはどれ？", type: "choice",
    choices: [{ key: "use", label: "合同な図形の対応する辺は等しいので、BD ＝ CD", kind: "correct" }, { key: "hyp", label: "仮定より、BD ＝ CD", kind: "use_confused" },
      { key: "back", label: "BD ＝ CD なので、△ABD ≡ △ACD", kind: "use_before_cong" }],
    hint: "合同を示したあとに言えることは？", explanation: "合同を示したあとは、合同な図形の対応する辺は等しいので BD ＝ CD、と書きます。BD ＝ CD は仮定ではありません。" });
  oneQ(fromLine({ id: "congUse-standard-2", skill: "congUse", level: "standard", part: "claim", format: "figure", figure: figP7(),
    text: "△AMC ≡ △BMD を示しました。合同から、新しく言えることはどれ？", type: "choice",
    choices: [cq("acbd", "AC", "BD", "correct"), cq("ambm", "AM", "BM", "already_known"), cq("acbm", "AC", "BM", "corr_shift")],
    hint: "AM ＝ BM は、合同を示す前から分かっていた。", explanation: "AM ＝ BM は仮定です。合同から新しく言えるのは、対応する辺 AC ＝ BD です。" }, P7, "L5"));
  stageQ(fromLine({ id: "congUse-application-1", skill: "congUse", level: "application", format: "figure", figure: figP9(),
    text: "点B、C、Eは一直線上にあり、AB // DC、AC // DE、BC ＝ CE です。△ABC ≡ △DCE を示しました。", type: "steps",
    steps: [{ id: "s1", skill: "congUse", aspect: "claim", part: "claim", type: "choice", answer: "bacdce", text: "合同から新しく言える角の等しさはどれ？",
        choices: mix([cq("bacdce", "∠BAC", "∠CDE", "correct"), cq("abcdce", "∠ABC", "∠DCE", "already_known"), cq("bacdec", "∠BAC", "∠DEC", "corr_shift")], "use-app-1"),
        hint: "∠ABC ＝ ∠DCE は、合同を示すときにもう使った。", explanation: "新しく言えるのは、対応する角 ∠BAC ＝ ∠CDE です。" },
      { id: "s2", skill: "congUse", aspect: "reason", part: "reason", type: "choice", answer: "congruent_parts", text: "そう言える理由は？",
        choices: mix([rc("congruent_parts", "correct"), rc("corresponding", "use_confused"), rc("hypothesis", "use_confused")], "use-app-1r"),
        hint: "平行線の角ではなく、合同から。", explanation: "合同を示したので、合同な図形の対応する角は等しい、が理由です。" }],
    hint: "合同を示す前から分かっていたことと、合同から新しく言えることを分ける。", explanation: "∠ABC ＝ ∠DCE（同位角）は合同を示す前から分かっていました。合同から新しく言えるのは ∠BAC ＝ ∠CDE（合同な図形の対応する角は等しい）です。" }, P9, "L5"));
  oneQ(fromLine({ id: "congUse-retention-1", skill: "congUse", level: "retention", part: "claim", format: "figure", figure: figP11(),
    text: "△AOC ≡ △BOD を示しました。合同から、新しく言えることはどれ？", type: "choice",
    choices: [cq("codo", "CO", "DO", "correct"), cq("aobo", "AO", "BO", "already_known"), cq("cobo", "CO", "BO", "corr_shift")],
    hint: "AO ＝ BO は仮定。", explanation: "AO ＝ BO は仮定です。合同から新しく言えるのは、対応する辺 CO ＝ DO です。" }, P11, "L5"));
  oneQ(fromLine({ id: "congUse-retention-2", skill: "congUse", level: "retention", aspect: "reason", part: "reason", format: "figure", figure: figP4(),
    text: "△ABC ≡ △ADC を示しました。このあと ∠BAC ＝ ∠DAC と言える理由はどれ？", type: "choice",
    choices: [rc("congruent_parts", "correct"), rc("hypothesis", "use_confused"), rc("SSS", "use_confused")],
    hint: "∠BAC ＝ ∠DAC は、問題文にあった？", explanation: "∠BAC ＝ ∠DAC は仮定ではありません。合同を示したので、合同な図形の対応する角は等しい、が理由です。" }, P4, "L5"));

  // ---------- 図から使えることを見つける（主張 → 根拠の2小問） ----------
  lineQ("proofFigureFacts-basic-2", "proofFigureFacts", "basic", P1, "L3", figP1(), "△ABC と △DCB の証明に使える、図からわかる等しいことを見つけよう。",
    "2つの三角形の両方にある辺はどれ？", [cq("bccb", "BC", "CB", "correct"), cq("abdc", "AB", "DC", "misread"), cq("acdb", "AC", "DB", "goal_used")],
    [rc("common", "correct"), rc("hypothesis", "misread"), rc("vertical", "misread")], "2つの三角形が重なっている辺。", "BC は △ABC にも △DCB にもある辺なので、BC ＝ CB（共通）です。");
  lineQ("proofFigureFacts-basic-3", "proofFigureFacts", "basic", P3, "L2", figP3(), "AB // CD です。△ABO と △DCO の証明に使える、図からわかる等しい角を見つけよう。",
    "平行線から言える、等しい角はどれ？", [cq("bacdo", "∠BAO", "∠CDO", "correct"), cq("baodco", "∠BAO", "∠DCO", "corr_shift"), cq("baoaob", "∠BAO", "∠AOB", "misread")],
    [rc("alternate", "correct"), rc("corresponding", "misread"), rc("vertical", "misread")], "平行線 AB、CD と、横切る直線 AD。", "∠BAO と ∠CDO は、平行線の錯角なので等しくなります。");
  lineQ("proofFigureFacts-basic-4", "proofFigureFacts", "basic", P6, "L3", figP6(), "点Dは辺AB上、点Eは辺AC上にあります。△ABE と △ACD の証明に使える、図からわかる等しいことを見つけよう。",
    "2つの三角形の両方にある角はどれ？", [cq("baecad", "∠BAE", "∠CAD", "correct"), cq("abeacd", "∠ABE", "∠ACD", "goal_used"), cq("baebad", "∠BAE", "∠BAD", "misread")],
    [rc("common", "correct"), rc("vertical", "misread"), rc("hypothesis", "misread")], "頂点 A の角は、どちらの三角形にもある。", "∠BAE と ∠CAD は同じ ∠A なので、∠BAE ＝ ∠CAD（共通）です。");
  lineQ("proofFigureFacts-standard-1", "proofFigureFacts", "standard", P7, "L2", figP7(), "AC // DB です。△AMC と △BMD の証明に使える、図からわかる等しい角を見つけよう。",
    "平行線から言える、等しい角はどれ？", [cq("macmbd", "∠MAC", "∠MBD", "correct"), cq("macmdb", "∠MAC", "∠MDB", "corr_shift"), cq("macamc", "∠MAC", "∠AMC", "misread")],
    [rc("alternate", "correct"), rc("corresponding", "misread"), rc("vertical", "misread")], "平行線 AC、DB と、横切る直線 AB。", "∠MAC と ∠MBD は、平行線の錯角なので等しくなります。");
  lineQ("proofFigureFacts-standard-2", "proofFigureFacts", "standard", P9, "L2", figP9(), "点B、C、Eは一直線上にあり、AB // DC です。△ABC と △DCE の証明に使える、図からわかる等しい角を見つけよう。",
    "AB // DC から言える、等しい角はどれ？", [cq("abcdce", "∠ABC", "∠DCE", "correct"), cq("abcdec", "∠ABC", "∠DEC", "corr_shift"), cq("abcacb", "∠ABC", "∠ACB", "misread")],
    [rc("corresponding", "correct"), rc("alternate", "misread"), rc("vertical", "misread")], "平行線 AB、DC と、横切る直線 BE。同じ位置の角。", "∠ABC と ∠DCE は、平行線の同位角なので等しくなります。");
  lineQ("proofFigureFacts-standard-3", "proofFigureFacts", "standard", P8, "L3", figP8(), "△ABD と △ACD の証明に使える、図からわかる等しいことを見つけよう。",
    "2つの三角形の両方にある辺はどれ？", [cq("adad", "AD", "AD", "correct"), cq("abac", "AB", "AC", "misread"), cq("bdcd", "BD", "CD", "goal_used")],
    [rc("common", "correct"), rc("hypothesis", "misread"), rc("congruent_parts", "misread")], "2つの三角形の境目の辺。", "AD は △ABD にも △ACD にもある辺なので、AD ＝ AD（共通）です。");
  lineQ("proofFigureFacts-standard-4", "proofFigureFacts", "standard", P11, "L3", figP11(), "線分ABとCDが点Oで交わっています。△AOC と △BOD の証明に使える、図からわかる等しい角を見つけよう。",
    "O のまわりで、等しい角はどれ？", [cq("aocbod", "∠AOC", "∠BOD", "correct"), cq("aocaod", "∠AOC", "∠AOD", "misread"), cq("ocaodb", "∠OCA", "∠ODB", "goal_used")],
    [rc("vertical", "correct"), rc("alternate", "misread"), rc("common", "misread")], "O で向かい合う角。", "∠AOC と ∠BOD は向かい合う角（対頂角）なので等しくなります。");
  lineQ("proofFigureFacts-application-1", "proofFigureFacts", "application", P9, "L3", figP9(), "点B、C、Eは一直線上にあり、AC // DE です。△ABC と △DCE の証明に使える、図からわかる等しい角を見つけよう。",
    "∠ACB と等しい角はどれ？", [cq("acbdec", "∠ACB", "∠DEC", "correct"), cq("acbdce", "∠ACB", "∠DCE", "misread"), cq("acbcde", "∠ACB", "∠CDE", "corr_shift")],
    [rc("corresponding", "correct"), rc("alternate", "misread"), rc("vertical", "misread")], "平行線 AC、DE と、横切る直線 BE。", "∠ACB と ∠DEC は、平行線の同位角なので等しくなります。");
  lineQ("proofFigureFacts-retention-1", "proofFigureFacts", "retention", P10, "L3", figP10(), "四角形ABCDに対角線BDをひきました。△ABD と △CDB の証明に使える、図からわかる等しいことを見つけよう。",
    "どちらの三角形にもふくまれる辺はどれ？", [cq("bddb", "BD", "DB", "correct"), cq("abcd", "AB", "CD", "misread"), cq("baddcb", "∠BAD", "∠DCB", "goal_used")],
    [rc("common", "correct"), rc("hypothesis", "misread"), rc("congruent_parts", "misread")], "対角線は、どちらの三角形にもある。", "BD は △ABD にも △CDB にもある辺なので、BD ＝ DB（共通）です。");
  lineQ("proofFigureFacts-retention-2", "proofFigureFacts", "retention", P7, "L3", figP7(), "線分ABとCDが点Mで交わっています。△AMC と △BMD の証明に使える、図からわかる等しい角を見つけよう。",
    "M のまわりで、等しい角はどれ？", [cq("amcbmd", "∠AMC", "∠BMD", "correct"), cq("amcamd", "∠AMC", "∠AMD", "misread"), cq("mcamdb", "∠MCA", "∠MDB", "goal_used")],
    [rc("vertical", "correct"), rc("alternate", "misread"), rc("common", "misread")], "M で向かい合う角。", "∠AMC と ∠BMD は向かい合う角（対頂角）なので等しくなります。");

  // ---------- 根拠だけを確かめる短い問題（証明・reason_only） ----------
  //   主張は問題文で示す。選んだ根拠と取り違え（例：SSS_for_SAS）だけを記録する（このスキルの reason の面だけが動く）
  proofReasonQ("congCond-reason-1", "congCond", null, "△ABC と △DEF で、AB ＝ DE、∠B ＝ ∠E、BC ＝ EF です。△ABC ≡ △DEF と言える合同条件はどれ？", "SAS", ["SAS", "SSS", "ASA", "SSA"],
    "∠B は辺 AB と BC の間の角なので、2組の辺とその間の角がそれぞれ等しい、です。", { cond: { cong: ["ABC", "DEF"], eqs: [["AB", "DE"], ["∠ABC", "∠DEF"], ["BC", "EF"]] } });
  proofReasonQ("congCond-reason-2", "congCond", figP10(), "△ABD と △CDB で、AB ＝ CD、AD ＝ CB、BD ＝ DB です。△ABD ≡ △CDB と言える合同条件はどれ？", "SSS", ["SSS", "SAS", "ASA"],
    "等しいのは3組の辺なので、3組の辺がそれぞれ等しい、です。", [P10, "L4"]);
  proofReasonQ("congCond-reason-3", "congCond", figP7(), "△AMC と △BMD で、AM ＝ BM、∠MAC ＝ ∠MBD、∠AMC ＝ ∠BMD です。△AMC ≡ △BMD と言える合同条件はどれ？", "ASA", ["ASA", "SAS", "SSS", "SSA"],
    "∠MAC と ∠AMC は辺 AM の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。", [P7, "L4"]);
  proofReasonQ("congCond-reason-4", "congCond", figP8(), "△ABD と △ACD で、AB ＝ AC、∠BAD ＝ ∠CAD、AD ＝ AD です。△ABD ≡ △ACD と言える合同条件はどれ？", "SAS", ["SAS", "ASA", "SSA", "SSS"],
    "∠BAD は辺 AB と AD の間の角なので、2組の辺とその間の角がそれぞれ等しい、です。", [P8, "L4"]);
  proofReasonQ("congCond-reason-5", "congCond", figP5(), "△ABD と △CBD で、∠ABD ＝ ∠CBD、∠ADB ＝ ∠CDB、BD ＝ BD です。△ABD ≡ △CBD と言える合同条件はどれ？", "ASA", ["ASA", "SAS", "SSS", "SSA"],
    "∠ABD と ∠ADB は辺 BD の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。", [P5, "L4"]);
  proofReasonQ("congCond-reason-6", "congCond", null, "△PQR と △STU で、PQ ＝ ST、QR ＝ TU、RP ＝ US です。△PQR ≡ △STU と言える合同条件はどれ？", "SSS", ["SSS", "SAS", "ASA"],
    "3組の辺がそれぞれ等しい、です。", { cond: { cong: ["PQR", "STU"], eqs: [["PQ", "ST"], ["QR", "TU"], ["RP", "US"]] } });
  proofReasonQ("proofFigureFacts-reason-1", "proofFigureFacts", figP8(), "△ABD と △ACD で、AD ＝ AD と言える理由はどれ？", "common", ["common", "hypothesis", "vertical"],
    "AD は2つの三角形の両方にある辺なので、共通です。", [P8, "L3"]);
  proofReasonQ("proofFigureFacts-reason-2", "proofFigureFacts", figP11(), "図で ∠AOC ＝ ∠BOD と言える理由はどれ？", "vertical", ["vertical", "alternate", "common", "hypothesis"],
    "O で向かい合う角なので、対頂角は等しい、です。", [P11, "L3"]);
  proofReasonQ("proofFigureFacts-reason-3", "proofFigureFacts", figP7(), "AC // DB です。図で ∠MAC ＝ ∠MBD と言える理由はどれ？", "alternate", ["alternate", "corresponding", "vertical"],
    "平行線 AC、DB と直線 AB でできる錯角なので等しい、です。", [P7, "L2"]);
  proofReasonQ("proofFigureFacts-reason-4", "proofFigureFacts", figP9(), "点B、C、Eは一直線上にあり、AB // DC です。図で ∠ABC ＝ ∠DCE と言える理由はどれ？", "corresponding", ["corresponding", "alternate", "vertical"],
    "平行線 AB、DC と直線 BE でできる、同じ位置の角（同位角）なので等しい、です。", [P9, "L2"]);
  proofReasonQ("proofFigureFacts-reason-5", "proofFigureFacts", figP6(), "点Dは辺AB上、点Eは辺AC上にあります。∠BAE ＝ ∠CAD と言える理由はどれ？", "common", ["common", "vertical", "hypothesis"],
    "∠BAE と ∠CAD は同じ ∠A なので、共通です。", [P6, "L3"]);
  proofReasonQ("proofFigureFacts-reason-6", "proofFigureFacts", figP3(), "AB // CD です。図で ∠AOB ＝ ∠DOC と言える理由はどれ？", "vertical", ["vertical", "alternate", "hypothesis"],
    "O で向かい合う角なので、対頂角は等しい、です（平行線を使わなくても言えます）。", [P3, "L3"]);
  proofReasonQ("proofFigureFacts-reason-7", "proofFigureFacts", figP3(), "AB // CD です。図で ∠BAO ＝ ∠CDO と言える理由はどれ？", "alternate", ["alternate", "corresponding", "vertical", "common"],
    "平行線 AB、CD と直線 AD でできる錯角なので等しい、です。", [P3, "L2"]);
  proofReasonQ("proofHypConc-reason-1", "proofHypConc", figP8(), "AB ＝ AC、∠BAD ＝ ∠CAD のとき BD ＝ CD を証明します。証明の中で AB ＝ AC と書ける理由はどれ？", "hypothesis", ["hypothesis", "common", "congruent_parts"],
    "AB ＝ AC は問題文で与えられているので、仮定です。", [P8, "L1"]);
  proofReasonQ("proofHypConc-reason-2", "proofHypConc", figP4(), "AB ＝ AD、CB ＝ CD のとき ∠BAC ＝ ∠DAC を証明します。証明の中で CB ＝ CD と書ける理由はどれ？", "hypothesis", ["hypothesis", "common", "vertical"],
    "CB ＝ CD は問題文で与えられているので、仮定です。", [P4, "L2"]);
  proofReasonQ("proofHypConc-reason-3", "proofHypConc", figP1(), "AB ＝ DC、∠ABC ＝ ∠DCB のとき AC ＝ DB を証明します。証明の中で ∠ABC ＝ ∠DCB と書ける理由はどれ？", "hypothesis", ["hypothesis", "congruent_parts", "common"],
    "∠ABC ＝ ∠DCB は問題文で与えられているので、仮定です。", [P1, "L2"]);
  proofReasonQ("congUse-reason-1", "congUse", figP2(), "△AOC ≡ △BOD を示しました。AC ＝ BD と言える理由はどれ？", "congruent_parts", ["congruent_parts", "hypothesis", "vertical"],
    "合同を示したので、合同な図形の対応する辺は等しい、です。", [P2, "L5"]);
  proofReasonQ("congUse-reason-2", "congUse", figP7(), "△AMC ≡ △BMD を示しました。AC ＝ BD と言える理由はどれ？", "congruent_parts", ["congruent_parts", "hypothesis", "common"],
    "合同を示したので、合同な図形の対応する辺は等しい、です。", [P7, "L5"]);
  proofReasonQ("congUse-reason-3", "congUse", figP10(), "△ABD ≡ △CDB を示しました。∠BAD ＝ ∠DCB と言える理由はどれ？", "congruent_parts", ["congruent_parts", "hypothesis", "SSS"],
    "合同を示したので、合同な図形の対応する角は等しい、です。", [P10, "L5"]);

  // ---------- 補強（10日試算で不足したところだけ） ----------
  //   合同から言えること・対応する辺・角・仮定と結論・合同条件の基礎／標準、根拠だけの問題（各スキル8問前後）
  oneQ({ id: "congUse-basic-5", skill: "congUse", level: "basic", aspect: "reason", use: { cong: ["ABC", "DEF"], eq: ["AB", "DE"] },
    text: "△ABC ≡ △DEF を示しました。このあと AB ＝ DE と書くときの理由はどれ？", type: "choice",
    choices: [rc("congruent_parts", "correct"), rc("hypothesis", "use_confused"), rc("SAS", "use_confused")],
    hint: "合同を示したあとに、何が言える？", explanation: "合同を示したので、合同な図形の対応する辺は等しい、が理由です。" });
  oneQ(fromLine({ id: "congUse-basic-6", skill: "congUse", level: "basic", part: "claim", format: "figure", figure: figP8(),
    text: "△ABD ≡ △ACD を示しました。合同から、新しく言えることはどれ？", type: "choice",
    choices: [cq("bdcd", "BD", "CD", "correct"), cq("abac", "AB", "AC", "already_known"), cq("bdad", "BD", "AD", "corr_shift")],
    hint: "AB ＝ AC は仮定。", explanation: "AB ＝ AC は仮定です。合同から新しく言えるのは、対応する辺 BD ＝ CD です。" }, P8, "L5"));
  oneQ({ id: "congUse-basic-7", skill: "congUse", level: "basic", format: "figure", figure: figP10(), manual_check: "合同を示す前に書いてよいか（はい・いいえ）を問う",
    text: "AB ＝ CD、AD ＝ CB が分かっています。まだ △ABD ≡ △CDB を示していないとき、「対応する角は等しいので ∠BAD ＝ ∠DCB」と書いてよい？", type: "choice", answer: "no",
    choices: [{ key: "yes", label: "書いてよい（対応する角だから）", kind: "use_before_cong" }, { key: "no", label: "まだ書けない（先に合同を示す）", kind: "correct" }],
    hint: "対応する角が等しいと言えるのは、いつ？", explanation: "対応する角が等しいと言えるのは、合同を示したあとです。先に △ABD ≡ △CDB を示します。" });
  oneQ(fromLine({ id: "congUse-standard-3", skill: "congUse", level: "standard", part: "claim", format: "figure", figure: figP5(),
    text: "△ABD ≡ △CBD を示しました。合同から、新しく言えることはどれ？", type: "choice",
    choices: [cq("adcd", "AD", "CD", "correct"), cq("bdbd", "BD", "BD", "already_known"), cq("adcb", "AD", "CB", "corr_shift")],
    hint: "BD ＝ BD は、合同を示すときにもう使った。", explanation: "BD ＝ BD（共通）は合同を示す前から分かっていました。新しく言えるのは、対応する辺 AD ＝ CD です。" }, P5, "L5"));
  oneQ(fromLine({ id: "congUse-standard-4", skill: "congUse", level: "standard", part: "claim", format: "figure", figure: figP6(),
    text: "点Dは辺AB上、点Eは辺AC上にあります。△ABE ≡ △ACD を示しました。合同から新しく言える角の等しさはどれ？", type: "choice",
    choices: [cq("abeacd", "∠ABE", "∠ACD", "correct"), cq("baecad", "∠BAE", "∠CAD", "already_known"), cq("abeadc", "∠ABE", "∠ADC", "corr_shift")],
    hint: "∠BAE ＝ ∠CAD（共通）は、合同を示すときにもう使った。", explanation: "新しく言えるのは、対応する角 ∠ABE ＝ ∠ACD です。" }, P6, "L5"));
  lineQ("congUse-standard-5", "congUse", "standard", P3, "L5", figP3(), "AB // CD、AO ＝ DO です。△ABO ≡ △DCO を示しました。",
    "合同から、新しく言えることはどれ？", [cq("boco", "BO", "CO", "correct"), cq("aodo", "AO", "DO", "already_known"), cq("bodo", "BO", "DO", "corr_shift")],
    [rc("congruent_parts", "correct"), rc("alternate", "use_confused"), rc("hypothesis", "use_confused")], "AO ＝ DO は仮定。", "合同から新しく言えるのは BO ＝ CO（合同な図形の対応する辺は等しい）です。");
  oneQ({ id: "congCorr-basic-5", skill: "congCorr", level: "basic", corr: { cong: ["ABC", "DEF"], of: "C" },
    text: "△ABC ≡ △DEF のとき、頂点 C に対応する頂点はどれ？", type: "choice",
    choices: [{ key: "f", label: "F", name: "F", kind: "correct" }, { key: "d", label: "D", name: "D", kind: "corr_shift" }, { key: "e", label: "E", name: "E", kind: "corr_shift" }],
    hint: "≡ の前後で、3番目どうし。", explanation: "≡ の前後で同じ位置の頂点が対応するので、C に対応するのは F です。" });
  oneQ({ id: "congCorr-basic-6", skill: "congCorr", level: "basic", corr: { cong: ["ABC", "PQR"], of: "∠BAC" },
    text: "△ABC ≡ △PQR のとき、∠A と等しい角はどれ？", type: "choice",
    choices: [{ key: "p", label: "∠P", name: "∠QPR", kind: "correct" }, { key: "q", label: "∠Q", name: "∠PQR", kind: "corr_shift" }, { key: "r", label: "∠R", name: "∠PRQ", kind: "corr_shift" }],
    hint: "A と同じ位置の頂点は？", explanation: "A と P が対応するので、∠A ＝ ∠P です。" });
  oneQ({ id: "congCorr-basic-7", skill: "congCorr", level: "basic", corr: { cong: ["ABC", "DEF"], of: "AB" },
    text: "△ABC ≡ △DEF のとき、辺 AB に対応する辺はどれ？", type: "choice",
    choices: [{ key: "de", label: "DE", name: "DE", kind: "correct" }, { key: "ef", label: "EF", name: "EF", kind: "corr_shift" }, { key: "df", label: "DF", name: "DF", kind: "corr_shift" }],
    hint: "A と D、B と E が対応する。", explanation: "A と D、B と E が対応するので、AB に対応するのは DE です。" });
  oneQ({ id: "congCorr-standard-4", skill: "congCorr", level: "standard", format: "figure", figure: figP6(), corr: { cong: ["ABE", "ACD"], of: "BE" },
    text: "図で △ABE ≡ △ACD です。辺 BE に対応する辺はどれ？", type: "choice",
    choices: [{ key: "cd", label: "CD", name: "CD", kind: "correct" }, { key: "ad", label: "AD", name: "AD", kind: "corr_shift" }, { key: "ac", label: "AC", name: "AC", kind: "corr_shift" }],
    hint: "A→A、B→C、E→D。", explanation: "B と C、E と D が対応するので、BE に対応するのは CD です。" });
  oneQ({ id: "congCorr-standard-5", skill: "congCorr", level: "standard", format: "figure", figure: figP9(), corr: { cong: ["ABC", "DCE"], of: "AB" },
    text: "図で △ABC ≡ △DCE です。辺 AB に対応する辺はどれ？", type: "choice",
    choices: [{ key: "dc", label: "DC", name: "DC", kind: "correct" }, { key: "de", label: "DE", name: "DE", kind: "corr_shift" }, { key: "ce", label: "CE", name: "CE", kind: "corr_shift" }],
    hint: "A→D、B→C、C→E。", explanation: "A と D、B と C が対応するので、AB に対応するのは DC です。" });
  oneQ({ id: "congCorr-standard-6", skill: "congCorr", level: "standard", format: "figure", figure: figP5(), corr: { cong: ["ABD", "CBD"], of: "∠BAD" },
    text: "図で △ABD ≡ △CBD です。∠BAD と等しい角はどれ？", type: "choice",
    choices: [{ key: "bcd", label: "∠BCD", name: "∠BCD", kind: "correct" }, { key: "cbd", label: "∠CBD", name: "∠CBD", kind: "corr_shift" }, { key: "cdb", label: "∠CDB", name: "∠CDB", kind: "corr_shift" }],
    hint: "A に対応する頂点は？", explanation: "A と C が対応するので、∠BAD ＝ ∠BCD です。" });
  oneQ({ id: "proofHypConc-basic-5", skill: "proofHypConc", level: "basic", hc: { hyp: P4.hyp, goal: P4.goal, ask: "hyp" },
    text: "「AB ＝ AD、CB ＝ CD ならば、∠BAC ＝ ∠DAC」の仮定はどれ？", type: "choice",
    choices: [{ key: "both", label: "AB ＝ AD と CB ＝ CD", kind: "correct", claims: [peq("AB", "AD"), peq("CB", "CD")] },
      { key: "goal", label: "∠BAC ＝ ∠DAC", kind: "conclusion_as_hypothesis", claims: [peq("∠BAC", "∠DAC")] },
      { key: "mixed", label: "CB ＝ CD と ∠BAC ＝ ∠DAC", kind: "conclusion_as_hypothesis", claims: [peq("CB", "CD"), peq("∠BAC", "∠DAC")] }],
    hint: "「ならば」の前。", explanation: "「ならば」の前の AB ＝ AD と CB ＝ CD が仮定です。" });
  oneQ({ id: "proofHypConc-basic-6", skill: "proofHypConc", level: "basic", hc: { hyp: P5.hyp, goal: P5.goal, ask: "goal" },
    text: "「∠ABD ＝ ∠CBD、∠ADB ＝ ∠CDB ならば、AB ＝ CB」の結論はどれ？", type: "choice",
    choices: [cq("abcb", "AB", "CB", "correct"), cq("abdcbd", "∠ABD", "∠CBD", "conclusion_as_hypothesis"), cq("bdbd", "BD", "BD", "misread")],
    hint: "「ならば」の後。", explanation: "結論は AB ＝ CB です。∠ABD ＝ ∠CBD と ∠ADB ＝ ∠CDB は仮定です。" });
  stageQ({ id: "proofHypConc-standard-3", skill: "proofHypConc", level: "standard", format: "figure", figure: figP9(), hc: { hyp: P9.hyp, goal: P9.goal, ask: "hyp_one" },
    text: "点B、C、Eは一直線上にあり、AB // DC、AC // DE、BC ＝ CE です。AC ＝ DE を証明します。", type: "steps",
    steps: [{ id: "s1", skill: "proofHypConc", aspect: "claim", type: "choice", answer: "par", text: "仮定にあるものはどれ？",
        choices: mix([{ key: "par", label: "AB // DC", kind: "correct", claim: { parallel: ["AB", "DC"] } }, cq("acde", "AC", "DE", "conclusion_as_hypothesis"), cq("abcdce", "∠ABC", "∠DCE", "misread")], "hc-std-3"),
        hint: "問題文に書かれていること。", explanation: "AB // DC は問題文で与えられた仮定です。" },
      { id: "s2", skill: "proofHypConc", aspect: "reason", part: "reason", type: "choice", answer: "hypothesis", text: "AB // DC は、証明の中で何として使える？",
        choices: mix([rc("hypothesis", "correct"), rc("corresponding", "misread"), rc("congruent_parts", "goal_used")], "hc-std-3r"),
        hint: "問題文で与えられている。", explanation: "AB // DC は仮定です（同位角が等しいと言うときに使います）。" }],
    hint: "仮定・図からわかること・結論を分ける。", explanation: "AB // DC・AC // DE・BC ＝ CE が仮定、AC ＝ DE が結論、∠ABC ＝ ∠DCE は仮定から言える図の事実です。" });
  oneQ({ id: "proofHypConc-standard-4", skill: "proofHypConc", level: "standard", format: "figure", figure: figP2(), hc: { hyp: P2.hyp, goal: P2.goal, ask: "goal" },
    text: "AO ＝ BO、CO ＝ DO のとき AC ＝ BD を証明します。合同を示す前に、根拠として使えないものはどれ？", type: "choice",
    choices: [cq("acbd", "AC", "BD", "correct"), cq("aobo", "AO", "BO", "misread"), cq("aocbod", "∠AOC", "∠BOD", "misread")],
    hint: "まだ示していないこと。", explanation: "AC ＝ BD は結論なので、合同を示す前には使えません。AO ＝ BO は仮定、∠AOC ＝ ∠BOD は対頂角なので使えます。" });
  oneQ({ id: "congCond-basic-6", skill: "congCond", level: "basic", aspect: "reason", cond: { cong: ABC_DEF, eqs: [["AC", "DF"], ["∠BAC", "∠EDF"], ["∠ACB", "∠DFE"]] },
    text: "△ABC と △DEF で、AC ＝ DF、∠A ＝ ∠D、∠C ＝ ∠F のとき、使える合同条件はどれ？", type: "choice",
    choices: [rc("ASA", "correct"), rc("SAS", "SAS"), rc("SSA", "SSA")], hint: "∠A と ∠C は辺 AC の両端？", explanation: "∠A と ∠C は辺 AC の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。" });
  oneQ({ id: "congCond-basic-7", skill: "congCond", level: "basic", aspect: "reason", cond: { cong: ABC_DEF, eqs: [["AB", "DE"], ["BC", "EF"], ["AC", "DF"]] },
    text: "△ABC と △DEF で、AB ＝ DE、BC ＝ EF、AC ＝ DF のとき、使える合同条件はどれ？", type: "choice",
    choices: [rc("SSS", "correct"), rc("ASA", "ASA"), rc("SAS", "SAS")], hint: "角は出てくる？", explanation: "3組の辺がそれぞれ等しい、です。" });
  lineQ("proofFigureFacts-standard-5", "proofFigureFacts", "standard", P5, "L3", figP5(), "∠ABD ＝ ∠CBD、∠ADB ＝ ∠CDB です。△ABD と △CBD の証明に使える、図からわかる等しいことを見つけよう。",
    "2つの三角形が重なっている辺はどれ？", [cq("bdbd", "BD", "BD", "correct"), cq("abcb", "AB", "CB", "goal_used"), cq("abdcbd", "∠ABD", "∠CBD", "misread")],
    [rc("common", "correct"), rc("hypothesis", "misread"), rc("vertical", "misread")], "BD は、どちらの三角形にもある。", "BD は △ABD にも △CBD にもある辺なので、BD ＝ BD（共通）です。");

  lineQ("proofFigureFacts-standard-6", "proofFigureFacts", "standard", P4, "L3", figP4(), "AB ＝ AD、CB ＝ CD です。△ABC と △ADC の証明に使える、図からわかる等しいことを見つけよう。",
    "2つの三角形が共有している辺はどれ？", [cq("acac", "AC", "AC", "correct"), cq("bdbd", "BD", "BD", "misread"), cq("badac", "∠BAC", "∠DAC", "goal_used")],
    [rc("common", "correct"), rc("hypothesis", "misread"), rc("vertical", "misread")], "AC は、どちらの三角形の辺にもなっている。", "AC は △ABC にも △ADC にもある辺なので、AC ＝ AC（共通）です。");
  lineQ("proofFigureFacts-standard-7", "proofFigureFacts", "standard", P3, "L3", figP3(), "AB // CD、AO ＝ DO です。△ABO と △DCO の証明に使える、O のまわりの等しい角を見つけよう。",
    "O で向かい合う、等しい角はどれ？", [cq("aobdoc", "∠AOB", "∠DOC", "correct"), cq("aobaoc", "∠AOB", "∠AOC", "misread"), cq("oabocd", "∠OAB", "∠OCD", "misread")],
    [rc("vertical", "correct"), rc("alternate", "misread"), rc("hypothesis", "misread")], "直線 AD と BC が O で交わっている。", "∠AOB と ∠DOC は O で向かい合う角（対頂角）なので等しくなります。");

  lineQ("congCond-application-2", "congCond", "application", P9, "L4", figP9(), "点B、C、Eは一直線上にあり、AB // DC、AC // DE、BC ＝ CE です。同位角から ∠ABC ＝ ∠DCE、∠ACB ＝ ∠DEC も分かりました。",
    "△ABC と合同な三角形を、対応の順に書くと？", [cg("abcdce", "ABC", "DCE", "correct"), cg("abcdec", "ABC", "DEC", "corr_shift"), cg("abccde", "ABC", "CDE", "corr_shift")],
    [rc("ASA", "correct"), rc("SAS", "SAS"), rc("SSA", "SSA")], "B と C、C と E が対応する（BC ＝ CE）。", "A→D、B→C、C→E なので △ABC ≡ △DCE。∠ABC と ∠ACB は辺 BC の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。");

  proofReasonQ("proofHypConc-reason-4", "proofHypConc", figP2(), "AO ＝ BO、CO ＝ DO のとき AC ＝ BD を証明します。証明の中で AO ＝ BO と書ける理由はどれ？", "hypothesis", ["hypothesis", "vertical", "congruent_parts"],
    "AO ＝ BO は問題文で与えられているので、仮定です。", [P2, "L1"]);
  proofReasonQ("proofHypConc-reason-5", "proofHypConc", figP7(), "AC // DB、M は線分ABの中点です。証明の中で AM ＝ BM と書ける理由はどれ？", "hypothesis", ["hypothesis", "common", "congruent_parts"],
    "M が中点であることは問題文で与えられているので、AM ＝ BM は仮定です。", [P7, "L1"]);
  proofReasonQ("proofHypConc-reason-6", "proofHypConc", figP5(), "∠ABD ＝ ∠CBD、∠ADB ＝ ∠CDB のとき AB ＝ CB を証明します。証明の中で ∠ADB ＝ ∠CDB と書ける理由はどれ？", "hypothesis", ["hypothesis", "common", "vertical"],
    "∠ADB ＝ ∠CDB は問題文で与えられているので、仮定です。", [P5, "L2"]);
  proofReasonQ("proofHypConc-reason-7", "proofHypConc", figP11(), "AO ＝ BO、∠OAC ＝ ∠OBD のとき CO ＝ DO を証明します。証明の中で ∠OAC ＝ ∠OBD と書ける理由はどれ？", "hypothesis", ["hypothesis", "vertical", "alternate"],
    "∠OAC ＝ ∠OBD は問題文で与えられているので、仮定です。", [P11, "L2"]);
  proofReasonQ("proofHypConc-reason-8", "proofHypConc", figP6(), "AB ＝ AC、AE ＝ AD のとき BE ＝ CD を証明します。証明の中で AE ＝ AD と書ける理由はどれ？", "hypothesis", ["hypothesis", "common", "congruent_parts"],
    "AE ＝ AD は問題文で与えられているので、仮定です。", [P6, "L2"]);
  proofReasonQ("congUse-reason-4", "congUse", figP8(), "△ABD ≡ △ACD を示しました。BD ＝ CD と言える理由はどれ？", "congruent_parts", ["congruent_parts", "hypothesis", "common"],
    "合同を示したので、合同な図形の対応する辺は等しい、です。", [P8, "L5"]);
  proofReasonQ("congUse-reason-5", "congUse", figP11(), "△AOC ≡ △BOD を示しました。CO ＝ DO と言える理由はどれ？", "congruent_parts", ["congruent_parts", "vertical", "hypothesis"],
    "合同を示したので、合同な図形の対応する辺は等しい、です。", [P11, "L5"]);
  proofReasonQ("congUse-reason-6", "congUse", figP9(), "△ABC ≡ △DCE を示しました。AC ＝ DE と言える理由はどれ？", "congruent_parts", ["congruent_parts", "corresponding", "hypothesis"],
    "合同を示したので、合同な図形の対応する辺は等しい、です。平行線の性質は、合同を示すときに使いました。", [P9, "L5"]);
  proofReasonQ("congUse-reason-7", "congUse", figP1(), "△ABC ≡ △DCB を示しました。AC ＝ DB と言える理由はどれ？", "congruent_parts", ["congruent_parts", "common", "SAS"],
    "合同を示したので、合同な図形の対応する辺は等しい、です（SAS は合同を示すときの理由）。", [P1, "L5"]);
  proofReasonQ("congUse-reason-8", "congUse", figP6(), "△ABE ≡ △ACD を示しました。BE ＝ CD と言える理由はどれ？", "congruent_parts", ["congruent_parts", "hypothesis", "common"],
    "合同を示したので、合同な図形の対応する辺は等しい、です。", [P6, "L5"]);
  proofReasonQ("congCond-reason-7", "congCond", figP9(), "△ABC と △DCE で、BC ＝ CE、∠ABC ＝ ∠DCE、∠ACB ＝ ∠DEC です。△ABC ≡ △DCE と言える合同条件はどれ？", "ASA", ["ASA", "SAS", "SSS"],
    "∠ABC と ∠ACB は辺 BC の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。", [P9, "L4"]);
  proofReasonQ("congCond-reason-8", "congCond", figP4(), "△ABC と △ADC で、AB ＝ AD、CB ＝ CD、AC ＝ AC です。△ABC ≡ △ADC と言える合同条件はどれ？", "SSS", ["SSS", "SAS", "ASA"],
    "3組の辺がそれぞれ等しい、です。", [P4, "L4"]);
  proofReasonQ("congCond-reason-9", "congCond", figP2(), "△AOC と △BOD で、AO ＝ BO、CO ＝ DO、∠AOC ＝ ∠BOD です。△AOC ≡ △BOD と言える合同条件はどれ？", "SAS", ["SAS", "ASA", "SSA"],
    "∠AOC は辺 AO と CO の間の角なので、2組の辺とその間の角がそれぞれ等しい、です。", [P2, "L4"]);
  proofReasonQ("proofFigureFacts-reason-8", "proofFigureFacts", figP9(), "点B、C、Eは一直線上にあり、AC // DE です。図で ∠ACB ＝ ∠DEC と言える理由はどれ？", "corresponding", ["corresponding", "alternate", "vertical"],
    "平行線 AC、DE と直線 BE でできる、同じ位置の角（同位角）なので等しい、です。", [P9, "L3"]);
  proofReasonQ("proofFigureFacts-reason-9", "proofFigureFacts", figP10(), "四角形ABCDに対角線BDをひきました。△ABD と △CDB で BD ＝ DB と言える理由はどれ？", "common", ["common", "hypothesis", "congruent_parts"],
    "BD は2つの三角形の両方にある辺なので、共通です。", [P10, "L3"]);
  proofReasonQ("proofFigureFacts-reason-10", "proofFigureFacts", figP2(), "線分ABとCDが点Oで交わっています。∠AOC ＝ ∠BOD と言える理由はどれ？", "vertical", ["vertical", "corresponding", "common"],
    "O で向かい合う角なので、対頂角は等しい、です。", [P2, "L3"]);

  // 補強2回目：合同条件・仮定と結論の標準、対応の応用（主張と根拠の2小問）、根拠だけの問題
  lineQ("congCond-standard-5", "congCond", "standard", P6, "L4", figP6(), "点Dは辺AB上、点Eは辺AC上にあり、AB ＝ AC、AE ＝ AD です。∠A は共通です。",
    "△ABE と合同な三角形を、対応の順に書くと？", [cg("abeacd", "ABE", "ACD", "correct"), cg("abeadc", "ABE", "ADC", "corr_shift"), cg("abecad", "ABE", "CAD", "corr_shift")],
    [rc("SAS", "correct"), rc("ASA", "ASA"), rc("SSA", "SSA")], "B と等しい辺の端は C、E と等しい辺の端は D。", "A→A、B→C、E→D なので △ABE ≡ △ACD。∠A は AB と AE の間の角なので、2組の辺とその間の角がそれぞれ等しい、です。");
  lineQ("congCond-standard-6", "congCond", "standard", P3, "L4", figP3(), "AB // CD、AO ＝ DO です。∠BAO ＝ ∠CDO（錯角）、∠AOB ＝ ∠DOC（対頂角）も分かりました。",
    "△ABO と合同な三角形を、対応の順に書くと？", [cg("abodco", "ABO", "DCO", "correct"), cg("abodoc", "ABO", "DOC", "corr_shift"), cg("abocdo", "ABO", "CDO", "corr_shift")],
    [rc("ASA", "correct"), rc("SAS", "SAS"), rc("SSS", "SSS")], "A と D、O と O が対応する。", "A→D、B→C、O→O なので △ABO ≡ △DCO。∠BAO と ∠AOB は辺 AO の両端の角なので、1組の辺とその両端の角がそれぞれ等しい、です。");
  lineQ("proofHypConc-standard-5", "proofHypConc", "standard", P6, "L1", figP6(), "点Dは辺AB上、点Eは辺AC上にあり、AB ＝ AC、AE ＝ AD です。BE ＝ CD を証明します。",
    "仮定から書ける、辺の等しさはどれ？", [cq("abac", "AB", "AC", "correct"), cq("becd", "BE", "CD", "conclusion_as_hypothesis"), cq("bdce", "BD", "CE", "misread")],
    [rc("hypothesis", "correct"), rc("common", "misread"), rc("congruent_parts", "goal_used")], "問題文で与えられた辺。", "AB ＝ AC は問題文で与えられた仮定です。BE ＝ CD は結論なので、まだ使えません。");
  stageQ(fromLine({ id: "congCorr-application-2", skill: "congCorr", level: "application", format: "figure", figure: figP10(),
    text: "四角形ABCDで AB ＝ CD、AD ＝ CB です。対角線BDで分けた2つの三角形は合同です。", type: "steps",
    steps: [{ id: "s1", skill: "congCorr", aspect: "claim", part: "claim", type: "choice", answer: "abdcdb", text: "対応する頂点の順に正しく書いたものはどれ？",
        choices: mix([cg("abdcdb", "ABD", "CDB", "correct"), cg("abdcbd", "ABD", "CBD", "corr_shift"), cg("abddcb", "ABD", "DCB", "corr_shift")], "corr-app-2"),
        hint: "AB と等しいのは CD、AD と等しいのは CB。", explanation: "A と C、B と D、D と B が対応するので、△ABD ≡ △CDB です。" },
      { id: "s2", skill: "congCond", aspect: "reason", part: "reason", type: "choice", answer: "SSS", text: "そう言える合同条件はどれ？",
        choices: mix([rc("SSS", "correct"), rc("SAS", "SAS"), rc("ASA", "ASA")], "corr-app-2r"),
        hint: "BD は共通。", explanation: "AB ＝ CD、AD ＝ CB、BD ＝ DB で、3組の辺がそれぞれ等しい、です。" }],
    hint: "等しい辺どうしの端が対応する。", explanation: "AB ＝ CD、AD ＝ CB（仮定）、BD ＝ DB（共通）。3組の辺がそれぞれ等しいので △ABD ≡ △CDB です。" }, P10, "L4"));
  proofReasonQ("proofHypConc-reason-9", "proofHypConc", figP3(), "AB // CD、AO ＝ DO のとき BO ＝ CO を証明します。証明の中で AO ＝ DO と書ける理由はどれ？", "hypothesis", ["hypothesis", "vertical", "alternate"],
    "AO ＝ DO は問題文で与えられているので、仮定です。", [P3, "L1"]);
  proofReasonQ("proofHypConc-reason-10", "proofHypConc", figP10(), "AB ＝ CD、AD ＝ CB のとき ∠BAD ＝ ∠DCB を証明します。証明の中で AD ＝ CB と書ける理由はどれ？", "hypothesis", ["hypothesis", "common", "congruent_parts"],
    "AD ＝ CB は問題文で与えられているので、仮定です。", [P10, "L2"]);
  proofReasonQ("congUse-reason-9", "congUse", figP3(), "AB // CD です。△ABO ≡ △DCO を示しました。BO ＝ CO と言える理由はどれ？", "congruent_parts", ["congruent_parts", "alternate", "vertical"],
    "合同を示したので、合同な図形の対応する辺は等しい、です。錯角・対頂角は合同を示すときに使いました。", [P3, "L5"]);
  proofReasonQ("congUse-reason-10", "congUse", figP5(), "△ABD ≡ △CBD を示しました。AB ＝ CB と言える理由はどれ？", "congruent_parts", ["congruent_parts", "common", "ASA"],
    "合同を示したので、合同な図形の対応する辺は等しい、です（ASA は合同を示すときの理由）。", [P5, "L5"]);

  // 前からある1段階の問題にも、自動検算の手がかり（src / corr / cond / hc）を付ける
  (function () {
    var byId = {};
    items.forEach(function (q) { byId[q.id] = q; });
    var claimsOf = function (q, map) { q.choices.forEach(function (c) { if (map[c.key]) c.claim = map[c.key]; }); };
    var h = byId["proofHypConc-basic-1"];
    h.hc = { hyp: P1.hyp, goal: P1.goal, ask: "goal" };
    claimsOf(h, { abdc: peq("AB", "DC"), abcdcb: peq("∠ABC", "∠DCB"), acdb: peq("AC", "DB") });
    var c1 = byId["congCorr-basic-1"];
    c1.corr = { cong: ["ABC", "DEF"], of: "BC" };
    c1.choices.forEach(function (c) { c.name = c.key.toUpperCase(); });
    var c2 = byId["congCorr-basic-2"];
    c2.corr = { cong: ["ABC", "DEF"], of: "∠BCA" };
    c2.choices.forEach(function (c) { c.name = { d: "∠EDF", e: "∠DEF", f: "∠EFD" }[c.key]; });
    byId["congCond-basic-1"].cond = { cong: ABC_DEF, eqs: [["AB", "DE"], ["BC", "EF"], ["∠ABC", "∠DEF"]] };
    byId["congCond-basic-2"].cond = { cong: ABC_DEF, eqs: [["AB", "DE"], ["AC", "DF"], ["∠ABC", "∠DEF"]] };
    fromLine(byId["congUse-basic-1"], P1, "L5").part = "reason";
    byId["congUse-basic-2"].manual_check = "合同を示す前に書いてよいか（はい・いいえ）を問う";
    var u3 = fromLine(byId["congUse-basic-3"], P2, "L5");
    u3.part = "claim";
    claimsOf(u3, { aobo: peq("AO", "BO"), acbd: peq("AC", "BD"), acbo: peq("AC", "BO") });
    var f1 = fromLine(byId["proofFigureFacts-basic-1"], P2, "L3");
    f1.steps[0].part = "claim"; f1.steps[1].part = "reason";
    claimsOf(f1.steps[0], { aocbod: peq("∠AOC", "∠BOD"), aoccob: peq("∠AOC", "∠COB"), oacobd: peq("∠OAC", "∠OBD") });
  })();
  // 合同と証明の定着の問題：穴うめ証明は標準、1段階の問題は基礎の力を確かめる
  items.forEach(function (q) {
    if (q.level === "retention" && !q.evidence_level && ["proofHypConc", "congCorr", "congCond", "proofFigureFacts", "congUse", "proofBuild"].indexOf(q.skill) !== -1) q.evidence_level = q.proof ? "standard" : "basic";
  });
  // 合同と証明のはじめてのチェック（5問）：仮定と結論・対応・図から使える事実・合同条件・合同から言えること
  items.forEach(function (q) {
    if (["proofHypConc-basic-1", "congCorr-basic-1", "proofFigureFacts-basic-2", "congCond-basic-1", "congUse-basic-3"].indexOf(q.id) !== -1) q.usage = "diagnosis";
  });

  // はじめてのチェック（5問）：角の性質・平行線・三角形・外角・角度の方程式
  items.forEach(function (q) {
    if (["lineAngles-basic-1", "angleEq-standard-1", "parallelAngles-basic-1", "triangleSum-basic-1", "exteriorAngle-basic-1"].indexOf(q.id) !== -1) q.usage = "diagnosis";
  });

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
    // 図形のスキルは、前提を「図形の性質側（concept）」と「計算側（calc）」に分けて持つ。
    // 計算側の前提（同類項・移項・かっこのある方程式など）は、実際に方程式を解く問題にだけ付ける（角度を式で表す、または問題に書いたもの）
    var geoSk = !!sk.concept;
    q.prerequisite_skills = q.prerequisite_skills || (geoSk ? sk.concept.concat(q.skill === "angleEq" ? sk.calc : [])
      : sk.prerequisites.filter(function (p) { return p !== "transpose" || E.SKILLS[q.skill].unit === "一次方程式"; }));
    if (geoSk) {
      var isGeoP = function (p) { return !!E.SKILLS[p].concept || p === "angleBasics"; };
      q.concept_prerequisites = q.concept_prerequisites || q.prerequisite_skills.filter(isGeoP);
      q.calculation_prerequisites = q.calculation_prerequisites || q.prerequisite_skills.filter(function (p) { return !isGeoP(p); });
    }
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
    if (q.reason_only) return; // 根拠だけの短い問題は、今日の学習の「根拠の確認」でだけ使う（チェック・ふだんの練習には出さない）
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
