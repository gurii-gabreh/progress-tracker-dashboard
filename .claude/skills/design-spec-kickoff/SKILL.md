---
name: design-spec-kickoff
description: Conduct the デザイン設計(design spec) interview for an existing app whose ④詳細設計 is already fully answered, via a voice/chat-triggered phrase. Triggered by claude-voice-bridge's fixed skill phrase "【デザイン設計相談】design-spec-kickoffスキルを呼び出して実行してください。". Like the other *-kickoff skills, this does NOT spin up a new session — it runs in whichever room it is invoked from, either as a direct standalone entry point or chained from detailed-design-kickoff finishing ④詳細設計 in the same room. Unlike other phases, this is NOT numbered (inserted between ④詳細設計 and ⑤テスト without a circled-number prefix, per explicit user instruction) and has no IPA共通フレーム2013 basis — it interviews data/requirements.json's designSpecChecklist items (grounded in general UI/UX design-system practice, Claude Design, and the project's own "🔤 UI要素名称集" namethatui.com reference) and writes the result into that app's requirements[].designSpec field.
---

# デザイン設計の立ち上げ(Design spec kickoff)

## これは何か

④詳細設計の全項目が入力済みのアプリについて、デザイン設計
(ダッシュボードの📱アプリ開発→📂開発アプリ一覧→🎨デザイン設計タブ)の聞き取りを進めるためのスキル
(2026-11-02追加、ユーザー指示「ある程度アプリが出来上がってから、詳細設計とテストの間にデザイン設計
(ボタン使用・UI関連のまとめ)を入れたい」)。

**番号について**: 他のフェーズ(①〜⑦)と違い、このフェーズには円数字の番号を付けない
(2026-11-02、ユーザー指示「番号入れなくていい」)。工程としては④詳細設計と⑤テストの間に
挿入されるが、⑤以降の番号はそのまま据え置く。

**情報源についての注意**: `data/requirements.json`の`designSpecChecklist.description`の通り、
IPA共通フレーム2013にはこのフェーズに対応する工程が無いため、他フェーズ(②③④⑤)ほどの一次情報源の
裏付けはない。一般的なUI/UXデザインシステムの実務慣行と、このプロジェクトで実際に使える手段
(Claude Design、App-Development-Infoの「🔤 UI要素名称集」namethatui.com参照)を踏まえて作成した
8項目(ユーザー承認済み、2026-11-01〜02)。

## 手順

1. **固定フレーズで起動する**(誤発火防止のため自然文からのAI自動判断はしない)。
   ```
   【デザイン設計相談】design-spec-kickoffスキルを呼び出して実行してください。
   ```
   ただし、detailed-design-kickoffの④詳細設計インタビューが完了した直後、ユーザーが「続けて
   デザイン設計も相談しますか？」という問いに「はい」と答えた場合は、この固定フレーズを経由せず
   同じルームでそのまま手順2以降に進んでよい(対象アプリは直前に確定したものを使うため選択は
   スキップ)。

2. **対象アプリを選択肢方式で聞く**。`data/requirements.json`の`requirements[]`のうち、
   `detailedDesign.answers`が`detailedDesignChecklist.items`全件分埋まっているアプリ
   (詳細設計完了済み)だけを候補として提示する。該当アプリの詳細設計がまだ未完了の場合は、先に
   detailed-design-kickoffで④詳細設計を済ませるよう案内し、ここで終了する。

3. **参考情報を読む**: 選択したアプリの`requirements[].detailedDesign.answers`(④詳細設計の回答、
   特に#5画面・帳票の詳細デザイン)、既存の`designSpec`(途中まで入力済みの場合がある)、
   App-Development-Infoの「🔤 UI要素名称集」(`materials/design-lesson7-3.html`)、対象リポジトリ
   自身の既存実装(CSS・コンポーネント構成)を確認する。

4. **`data/requirements.json`の`designSpecChecklist.items`を1つずつ順に確認する**
   (basic-design-kickoffと同じ聞き取りスタイルをrule23で踏襲)。空欄のまま次に進んでもよい。
   #4(UI要素名称の統一)の項目では、必要に応じて「🔤 UI要素名称集」から候補をいくつか提示し、
   ユーザーに選んでもらってよい(2026-11-01の相談「候補をサンプル図付きで提示して選んでもらう」
   の具体化)。

5. **記録する**: `data/requirements.json`の`requirements[]`から該当アプリのエントリを見つけ、
   `designSpec`フィールドを追加・更新する(`answers`は`{n, question, answer}`の配列として
   `designSpecChecklist.items`全件分格納、`status`は「対応中」または「完了」)。commit・push・
   mainへのマージまで行う(claude-core-rules.mdルール25)。対応するタスクを`data/tasks.json`へ
   起票する。この記録だけで、dashboard.htmlの🎨デザイン設計タブに自動で表示される。

6. **チェイン(続けて⑤テストも相談するか聞く)**: 手順5の記録が終わったら、ユーザーへ「続けて
   ⑤テストも相談しますか？」と尋ねる。
   - 「はい」→ 新しいセッションを作らず、同じルームのまま`test-kickoff`スキル
     (`.claude/skills/test-kickoff/SKILL.md`)の手順2以降を続けて実施する(対象アプリは今回
     確定したものを使うため選択はスキップ)。
   - 「いいえ」→ ここで終了してよい。

7. 意味のある設計判断があれば`data/concept-log.json`にも記録する(rule23)。
