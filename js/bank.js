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
 * - format: expression（数式）/ table（表）/ graph（グラフ）/ word（文章）/ numberline（数直線）
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
    answer: { slope: -2, intercept: 5 }, prerequisite_skills: ["proportion", "algebra"], skills_used: ["slopeIntercept", "algebra"],
    hint: "2x を右へ移すと、符号が変わる。",
    explanation: "y = −2x + 5 なので、傾きは −2、切片は 5 です。" });
  add({ id: "slopeIntercept-standard-3", skill: "slopeIntercept", level: "standard", format: "expression",
    text: "次の一次関数のうち、x が増えると y が減るものはどれ？",
    type: "choice",
    choices: [{ key: "a", label: "y = 3x − 5" }, { key: "b", label: "y = −2x + 4" }, { key: "c", label: "y = (1/2)x − 1" }, { key: "d", label: "y = 5 + x" }],
    answer: "b",
    hint: "傾き（x の前の数）がプラスなら右上がり、マイナスなら右下がり。",
    explanation: "傾きがマイナスなのは y = −2x + 4 だけ。x が増えると y は減ります。" });

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
  // 共通の情報を足して、問題一覧に登録する
  // =====================================================================
  var E = SC.engine;
  var FORMAT_OF_CORE = { B1: "expression", B2: "expression", B3: "expression", B4: "word", B5: "expression",
    C1: "expression", C2: "expression", C3: "expression", C4: "word", C5: "expression", S1: "word", S2: "expression" };

  items.forEach(function (q) {
    var sk = E.SKILLS[q.skill];
    q.grade = "中学2年";
    q.subject = "数学";
    q.unit = "一次関数";
    q.origin = "bank";
    q.skillLabel = sk.label;
    q.prerequisite_skills = q.prerequisite_skills || sk.prerequisites.slice();
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
