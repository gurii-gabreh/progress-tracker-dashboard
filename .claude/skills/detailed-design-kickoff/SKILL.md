---
name: detailed-design-kickoff
description: Conduct the ④詳細設計(detailed design) interview for an existing app whose ②基本設計 is already fully answered, via a voice/chat-triggered phrase. Triggered by claude-voice-bridge's fixed skill phrase "【詳細設計相談】detailed-design-kickoffスキルを呼び出して実行してください。". Like basic-design-kickoff and functional-requirements-kickoff, this does NOT spin up a new session — it runs in whichever room it is invoked from, either as a direct standalone entry point or chained from functional-requirements-kickoff finishing ③機能要件 in the same room. Interviews data/requirements.json's detailedDesignChecklist items (IPA共通フレーム2013のソフトウェア詳細設計プロセス2.4.4相当, built from secondary sources + analogy with basicDesignChecklist since the official <ガイダンス> PDF extract had no text for 2.4.4 itself) and writes the result into that app's requirements[].detailedDesign field.
---

# ④詳細設計の立ち上げ(Detailed design kickoff)

## これは何か

②基本設計の全項目が入力済みのアプリについて、④詳細設計
(ダッシュボードの📱アプリ開発→📂開発アプリ一覧→🧩詳細設計タブ)の聞き取りを進めるためのスキル
(2026-10-25追加、ユーザー指示「次は、詳細設計の方にうつって、こちらもIPAの仕様書に沿った
内容にしたい」)。

**情報源についての注意**: `data/requirements.json`の`detailedDesignChecklist.description`に
詳しい経緯があるが、IPA公式PDF「第3部 共通フレームとガイダンス」(基本設計チェックリスト作成時と
同一文書)は`<ガイダンス>`部分のみの抽出であり、2.4.4(ソフトウェア詳細設計プロセス)自体への
ガイダンス本文が含まれていなかった。そのため`detailedDesignChecklist`の8項目は、
(a)同PDFで確認できた断片情報、(b)複数の二次情報源、(c)`basicDesignChecklist`(2.3.3/2.4.3相当)の
11項目をユニットレベルまで詳細化した類推、の組み合わせによる暫定案である(ユーザー承認済み、
2026-10-25「とりあえず取れで作って」)。より正確な一次情報(有償書籍『共通フレーム2013』本体等)が
見つかった場合は、聞き取りの前後でこのチェックリスト自体の更新を検討すること。

## 手順

1. **固定フレーズで起動する**(誤発火防止のため自然文からのAI自動判断はしない)。
   ```
   【詳細設計相談】detailed-design-kickoffスキルを呼び出して実行してください。
   ```
   ただし、functional-requirements-kickoffの③機能要件インタビューが完了した直後、ユーザーが
   「続けて④詳細設計も相談しますか？」という問いに「はい」と答えた場合は、この固定フレーズを
   経由せず同じルームでそのまま手順2以降に進んでよい(対象アプリは直前に確定したものを使うため
   選択はスキップ)。

2. **対象アプリを選択肢方式で聞く**。`data/requirements.json`の`requirements[]`のうち、
   `basicDesign.answers`が`basicDesignChecklist.items`全件分埋まっているアプリ(基本設計完了済み)
   だけを候補として提示する(③機能要件の完了は前提条件としない。dashboard.html側の
   `devDocsIsBasicDesignComplete()`と同じ判定基準)。該当アプリの基本設計がまだ未完了の場合は、
   先にbasic-design-kickoffで②基本設計を済ませるよう案内し、ここで終了する。

3. **参考情報を読む**: 選択したアプリの`requirements[].basicDesign.answers`(②基本設計の回答、
   特に#5ソフトウェア構造・#6外部インタフェース・#7内部インタフェース・#8データベース最上位設計・
   #9画面UI設計方針・#10結合テスト要件・#11方式設計評価基準)、既存の`detailedDesign`(途中まで
   入力済みの場合がある)、対象リポジトリ自身の既存実装(README・ソースコード)を確認する。

4. **`data/requirements.json`の`detailedDesignChecklist.items`を1つずつ順に確認する**
   (basic-design-kickoffと同じ聞き取りスタイルをrule23で踏襲)。空欄のまま次に進んでもよい。

5. **記録する**: `data/requirements.json`の`requirements[]`から該当アプリのエントリを見つけ、
   `detailedDesign`フィールドを追加・更新する(`answers`は`{n, question, answer}`の配列として
   `detailedDesignChecklist.items`全件分格納、`status`は「対応中」または「完了」)。commit・push・
   mainへのマージまで行う(claude-core-rules.mdルール25)。対応するタスクを`data/tasks.json`へ
   起票する。この記録だけで、dashboard.htmlの🧩詳細設計タブに自動で表示される。

6. **チェイン**: 2026-10-25時点で④詳細設計がチェーンの最終段のため、次段階への自動継続は行わない。
   さらに後続の工程(例: 構築・テスト関連のスキル)が新設された場合は、ここに同様の「続けて◯◯も
   相談しますか？」という分岐を追加すること。

7. 意味のある設計判断があれば`data/concept-log.json`にも記録する(rule23)。
