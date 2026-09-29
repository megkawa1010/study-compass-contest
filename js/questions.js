/*
 * Study Compass コンテスト版 — 問題データ
 * 中学2年 数学「一次関数」だけをモデルケースとして収録。
 * phase: basic（基礎）/ cause（原因確認）/ standard（標準）
 */
(function (root) {
  var SC = (root.SC = root.SC || {});

  SC.QUESTIONS = {
    // ---------- 基礎 ----------
    B1: {
      id: "B1", phase: "basic", skill: "coord", skillLabel: "座標",
      prerequisites: ["正負の数"],
      text: "点A(−2, 3) の x座標は？",
      type: "number", answer: -2,
      hint: "点(x, y) は、前の数が x座標、うしろの数が y座標だよ。",
      explain: "点(x, y) の前の数が x座標なので −2 です。",
      onMiss: ["C1"]
    },
    B2: {
      id: "B2", phase: "basic", skill: "proportion", skillLabel: "比例・代入",
      prerequisites: ["比例", "代入"],
      text: "y = 3x で、x = 2 のとき、y はいくつ？",
      type: "number", answer: 6,
      hint: "y = 3x の x に 2 を入れてみよう。3 × 2 は？",
      explain: "y = 3 × 2 = 6 です。",
      onMiss: ["C3", "C2"]
    },
    B3: {
      id: "B3", phase: "basic", skill: "substitution", skillLabel: "一次関数への代入",
      prerequisites: ["文字式", "代入"],
      text: "y = 2x + 1 で、x = 3 のとき、y はいくつ？",
      type: "number", answer: 7,
      hint: "x に 3 を入れると y = 2 × 3 + 1。かけ算を先に計算しよう。",
      explain: "y = 2 × 3 + 1 = 7 です。",
      onMiss: ["C2"]
    },
    B4: {
      id: "B4", phase: "basic", skill: "rate", skillLabel: "変化の割合",
      prerequisites: ["変化量", "わり算"],
      text: "x が 2 増えたとき、y が 6 増えました。変化の割合はいくつ？",
      type: "number", answer: 3,
      hint: "変化の割合 ＝ y の増加量 ÷ x の増加量",
      explain: "変化の割合 = y の増加量 ÷ x の増加量 = 6 ÷ 2 = 3 です。",
      onMiss: ["C4"]
    },
    B5: {
      id: "B5", phase: "basic", skill: "form", skillLabel: "傾き・切片",
      prerequisites: ["傾き", "切片"],
      text: "傾きが 2、切片が −1 の一次関数の式を答えなさい。",
      type: "linear", answer: { a: 2, b: -1 }, display: "y = 2x − 1",
      placeholder: "例：y = 3x + 2",
      hint: "一次関数は y = ax + b の形。a が傾き、b が切片だよ。",
      explain: "y = ax + b の a に傾き 2、b に切片 −1 を入れて、y = 2x − 1 です。",
      onMiss: ["C5"]
    },

    // ---------- 原因確認（必要なものだけ出す） ----------
    C1: {
      id: "C1", phase: "cause", skill: "signed", skillLabel: "正負の数",
      purpose: "座標でつまずいた原因が、正負の数にあるかを確かめます",
      text: "−3 + 5 を計算しなさい。",
      type: "number", answer: 2,
      hint: "数直線で −3 から右へ 5 つ進むと、どこに着く？"
    },
    C2: {
      id: "C2", phase: "cause", skill: "algebra", skillLabel: "文字式への代入",
      purpose: "一次関数の前に、文字式への代入で止まっていないかを確かめます",
      text: "a = −2 のとき、3a + 4 の値を求めなさい。",
      type: "number", answer: -2,
      hint: "負の数を入れるときは、かっこをつけて 3 × (−2) + 4。"
    },
    C3: {
      id: "C3", phase: "cause", skill: "proportionBase", skillLabel: "比例",
      purpose: "比例 y = ax の基本がつかめているかを確かめます",
      text: "y = ax で、x = 2、y = 6 のとき、a はいくつ？",
      type: "number", answer: 3,
      hint: "y = ax に x = 2、y = 6 を入れると 6 = a × 2。"
    },
    C4: {
      id: "C4", phase: "cause", skill: "change", skillLabel: "変化量（増加量）",
      purpose: "変化の割合の前に、増加量をとらえられているかを確かめます",
      text: "x が 1 から 4 に、y が 2 から 8 に増えました。x の増加量と y の増加量を答えなさい。",
      type: "pair",
      fields: [
        { key: "x_change", label: "x の増加量" },
        { key: "y_change", label: "y の増加量" }
      ],
      answer: { x_change: 3, y_change: 6 },
      hint: "増加量 ＝ あとの値 − はじめの値"
    },
    C5: {
      id: "C5", phase: "cause", skill: "slopeIntercept", skillLabel: "傾き・切片の読み取り",
      purpose: "傾きと切片そのものを読み取れているかを確かめます",
      text: "y = −3x + 4 の傾きと切片を答えなさい。",
      type: "pair",
      fields: [
        { key: "slope", label: "傾き" },
        { key: "intercept", label: "切片" }
      ],
      answer: { slope: -3, intercept: 4 },
      hint: "y = ax + b の形とくらべてみよう。a が傾き、b が切片。"
    },

    // ---------- 標準（基礎ができたスキルだけ） ----------
    S1: {
      id: "S1", phase: "standard", skill: "rate", skillLabel: "変化の割合（標準）",
      purpose: "変化の割合が、問題の形が変わっても使えるかを確かめます",
      text: "x が 2 から 5 まで増えたとき、y が 4 から 10 まで増えました。変化の割合を求めなさい。",
      type: "number", answer: 2,
      hint: "まず x の増加量と y の増加量を、それぞれ出してみよう。",
      explain: "x の増加量 5 − 2 = 3、y の増加量 10 − 4 = 6。6 ÷ 3 = 2 です。"
    },
    S2: {
      id: "S2", phase: "standard", skill: "form", skillLabel: "一次関数の式（標準）",
      purpose: "傾きと切片の知識を、点の情報と組み合わせて使えるかを確かめます",
      text: "傾きが −3 で、点(2, 5) を通る一次関数の式を求めなさい。",
      type: "linear", answer: { a: -3, b: 11 }, display: "y = −3x + 11",
      placeholder: "例：y = 3x + 2",
      hint: "y = −3x + b に x = 2、y = 5 を入れると、b が求められるよ。",
      explain: "5 = −3 × 2 + b より b = 11。式は y = −3x + 11 です。"
    }
  };

  SC.BASIC_ORDER = ["B1", "B2", "B3", "B4", "B5"];
})(typeof window !== "undefined" ? window : globalThis);
