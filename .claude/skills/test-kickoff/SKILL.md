---
name: test-kickoff
description: Conduct the ⑤テスト(test) interview for an existing app whose ④詳細設計 is already fully answered, via a voice/chat-triggered phrase. Triggered by claude-voice-bridge's fixed skill phrase "【テスト相談】test-kickoffスキルを呼び出して実行してください。". Like the other *-kickoff skills, this does NOT spin up a new session — it runs in whichever room it is invoked from, either as a direct standalone entry point or chained from detailed-design-kickoff finishing ④詳細設計 in the same room. Interviews data/requirements.json's testChecklist items (grounded in IPA共通フレーム2013's 検証プロセス4.3・妥当性確認プロセス4.4・品質保証プロセス4.2・共同レビュープロセス4.5 and the 結合/適格性確認テストプロセス, found in the same <ガイダンス> PDF extract used for basicDesignChecklist) and writes the result into that app's requirements[].test field.
---

# ⑤テストの立ち上げ(Test kickoff)

## これは何か

④詳細設計の全項目が入力済みのアプリについて、⑤テスト
(ダッシュボードの📱アプリ開発→📂開発アプリ一覧→🧪テストタブ)の聞き取りを進めるためのスキル
(2026-10-25追加、ユーザー指示「次は、テストだな。これも、IPAの資料にある？」)。

**情報源についての注意(重要)**: `data/requirements.json`の`testChecklist.description`に詳しい
経緯があるが、④詳細設計チェックリスト作成時は、IPA公式PDF「第3部 共通フレームとガイダンス」
(基本設計チェックリスト作成時と同一文書)を**条項番号(2.3.6/2.4.6/2.4.7)だけで狭く検索し**、
2.4.4(ソフトウェア詳細設計プロセス)自体への本文が無いと判断していた。しかしユーザー指摘
「さっきの資料見てよ」を受けて改めて全ページを確認したところ、同じPDF内の「4.支援プロセス」
(4.2品質保証プロセス・4.3検証プロセス・4.4妥当性確認プロセス・4.5共同レビュープロセス)、
2.2節内のJIS X 0129-1(ISO/IEC 9126-1)品質特性引用、2.2.4.1節の具体的なテスト活動列挙などに、
④詳細設計のときより**多くの一次情報が見つかった**。このスキルを今後実行する際、またはこの種の
IPA公式資料から別フェーズのチェックリストを作る際は、**条項番号の完全一致検索だけに頼らず、
関連キーワード(品質・検証・妥当性確認・レビュー等)での全文横断確認を必ず行うこと**
(同じ見落としを繰り返さないための教訓として明記)。

## 手順

1. **固定フレーズで起動する**(誤発火防止のため自然文からのAI自動判断はしない)。
   ```
   【テスト相談】test-kickoffスキルを呼び出して実行してください。
   ```
   ただし、detailed-design-kickoffの④詳細設計インタビューが完了した直後、ユーザーが「続けて
   ⑤テストも相談しますか？」という問いに「はい」と答えた場合は、この固定フレーズを経由せず
   同じルームでそのまま手順2以降に進んでよい(対象アプリは直前に確定したものを使うため選択は
   スキップ)。

2. **対象アプリを選択肢方式で聞く**。`data/requirements.json`の`requirements[]`のうち、
   `detailedDesign.answers`が`detailedDesignChecklist.items`全件分埋まっているアプリ
   (詳細設計完了済み)だけを候補として提示する。該当アプリの詳細設計がまだ未完了の場合は、先に
   detailed-design-kickoffで④詳細設計を済ませるよう案内し、ここで終了する。

3. **参考情報を読む**: 選択したアプリの`requirements[].detailedDesign.answers`(④詳細設計の回答)、
   既存の`test`(途中まで入力済みの場合がある)、対象リポジトリ自身の既存実装・既存テストコード
   (README・テストディレクトリ等)を確認する。

4. **`data/requirements.json`の`testChecklist.items`を1つずつ順に確認する**
   (basic-design-kickoff/detailed-design-kickoffと同じ聞き取りスタイルをrule23で踏襲)。
   空欄のまま次に進んでもよい。

5. **記録する**: `data/requirements.json`の`requirements[]`から該当アプリのエントリを見つけ、
   `test`フィールドを追加・更新する(`answers`は`{n, question, answer}`の配列として
   `testChecklist.items`全件分格納、`status`は「対応中」または「完了」)。commit・push・mainへの
   マージまで行う(claude-core-rules.mdルール25)。対応するタスクを`data/tasks.json`へ起票する。
   この記録だけで、dashboard.htmlの🧪テストタブに自動で表示される。

6. **チェイン**: 2026-10-25時点で⑤テストがチェーンの最終段のため、次段階への自動継続は行わない。
   さらに後続の工程(例: リリース・運用関連のスキル)が新設された場合は、ここに同様の「続けて
   ◯◯も相談しますか？」という分岐を追加すること。

7. 意味のある設計判断があれば`data/concept-log.json`にも記録する(rule23)。
