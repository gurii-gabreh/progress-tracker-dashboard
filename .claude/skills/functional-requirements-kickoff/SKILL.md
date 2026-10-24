---
name: functional-requirements-kickoff
description: Conduct the ③機能要件(functional requirements) interview for an existing app whose ②基本設計 is already fully answered, via a voice/chat-triggered phrase. Triggered by claude-voice-bridge's fixed skill phrase "【機能要件相談】functional-requirements-kickoffスキルを呼び出して実行してください。". Like basic-design-kickoff, this does NOT spin up a new session — it runs in whichever room it is invoked from, either as a direct standalone entry point or chained from basic-design-kickoff finishing ②基本設計 in the same room. Confirms the extracted content already available from ①要件定義/②基本設計 (使用システム/セキュリティ/認証方法/使用ケース起点の機能/データ構造), then interviews only the items not covered elsewhere (functionalRequirementsChecklist, e.g. 通知機能の有無), and writes the result into that app's requirements[].functionalRequirements field.
---

# ③機能要件の立ち上げ(Functional requirements kickoff)

## これは何か

既に②基本設計の全項目が入力済みのアプリについて、③機能要件
(ダッシュボードの📱アプリ開発→📂開発アプリ一覧→📐機能要件タブ)の聞き取りを進めるためのスキル
(2026-10-25追加、ユーザー指示「基本設計まで入力が完了したら、機能要件側のビューにも表示する
ようにして」「要件定義、基本設計で聞いていない内容は機能要件として確認するようにして」)。

**重要**: 機能要件タブに表示する項目のうち、①要件定義・②基本設計の回答から**抜粋できる項目**
(使用システム=基本設計#1、セキュリティ=要件定義#11、認証方法=要件定義#12、
使用ケースから見える必要な機能=要件定義#17、データ構造=基本設計#8)は、このスキルでは
**聞き直さない**。`data/requirements.json`の`functionalRequirementsChecklist.items`
(現時点では「通知機能の有無」1件のみ)に定義された、①②のどちらにも該当項目が無い内容だけを
このスキルで新規に確認する。新しい機能要件の論点が見つかった場合は、ここに追加するのではなく
`functionalRequirementsChecklist.items`自体に項目を追加する(rule23: 既存の仕組みの拡張を優先)。

**basic-design-kickoffとの関係**: new-app-kickoff(①)→basic-design-kickoff(②)→
functional-requirements-kickoff(③)という継続チェーンの最終段。basic-design-kickoffと同じく
`create_session`は使わず、呼ばれたルームでそのまま実行する。

## 手順

1. **固定フレーズで起動する**(誤発火防止のため自然文からのAI自動判断はしない)。
   ```
   【機能要件相談】functional-requirements-kickoffスキルを呼び出して実行してください。
   ```
   ただし、basic-design-kickoffの②基本設計インタビューが完了した直後、ユーザーが「続けて
   ③機能要件も相談しますか？」という問いに「はい」と答えた場合は、この固定フレーズを経由せず
   同じルームでそのまま手順2以降に進んでよい(対象アプリは直前に確定したものを使うため選択は
   スキップ)。

2. **対象アプリを選択肢方式で聞く**。`data/requirements.json`の`requirements[]`のうち、
   `basicDesign.answers`が`basicDesignChecklist.items`全件分埋まっているアプリ(基本設計完了済み)
   だけを候補として提示する。該当アプリの基本設計がまだ未完了の場合は、先にbasic-design-kickoffで
   ②基本設計を済ませるよう案内し、ここで終了する。

3. **抜粋項目を提示する**。選択したアプリの`requirements[].answers`(n=11セキュリティ・
   n=12認証方法・n=17使用ケース)と`basicDesign.answers`(n=1システム全体構成・n=8データ構造)を
   読み、「①②から抜粋した内容」としてユーザーへ提示・確認する(間違いがあれば、このタイミングで
   要件定義・基本設計側を修正してよい。機能要件側のフィールドには重複して書き込まない)。

4. **`functionalRequirementsChecklist.items`を1つずつ確認する**(2026-10-25時点では
   「通知機能の有無」1項目のみだが、今後項目が増えても動的に読むため書き換え不要)。

5. **記録する**: `data/requirements.json`の`requirements[]`から該当アプリのエントリを見つけ、
   `functionalRequirements`フィールドを追加・更新する(`answers`は`{n, question, answer}`の配列、
   `status`は「対応中」または「完了」)。commit・push・mainへのマージまで行う
   (claude-core-rules.mdルール25)。対応するタスクを`data/tasks.json`へ起票する。この記録だけで、
   dashboard.htmlの📐機能要件タブに自動で表示される。

6. **チェイン**: 2026-10-25時点で③機能要件がチェーンの最終段のため、次段階(④詳細設計)への
   自動継続は行わない。④詳細設計のスキルが新設された場合は、ここに同様の「続けて④詳細設計も
   相談しますか？」という分岐を追加すること。

7. 意味のある設計判断があれば`data/concept-log.json`にも記録する(rule23)。
