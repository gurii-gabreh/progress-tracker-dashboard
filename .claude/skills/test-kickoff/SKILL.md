---
name: test-kickoff
description: Conduct the ⑤テスト(test) interview for an existing app whose デザイン設計(design spec, inserted between ④詳細設計 and ⑤テスト without a number) is already fully answered, via a voice/chat-triggered phrase. Triggered by claude-voice-bridge's fixed skill phrase "【テスト相談】test-kickoffスキルを呼び出して実行してください。". Like the other *-kickoff skills, this does NOT spin up a new session — it runs in whichever room it is invoked from, either as a direct standalone entry point or chained from design-spec-kickoff finishing デザイン設計 in the same room (2026-11-02 changed from detailed-design-kickoff, see note below). Interviews data/requirements.json's testChecklist items (grounded in IPA共通フレーム2013's 検証プロセス4.3・妥当性確認プロセス4.4・品質保証プロセス4.2・共同レビュープロセス4.5 and the 結合/適格性確認テストプロセス, found in the same <ガイダンス> PDF extract used for basicDesignChecklist) and writes the result into that app's requirements[].test field.
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

**チェイン元の変更について(2026-11-02)**: ④詳細設計と⑤テストの間に、番号なしの「デザイン設計」
フェーズが挿入された(ユーザー指示)。このため、このスキルの前提条件・チェイン元はdetailed-design-kickoff
(④詳細設計)ではなく、design-spec-kickoff(デザイン設計)の完了に変更した。デザイン設計自体の
前提条件が④詳細設計完了であるため、結果として④詳細設計完了も間接的に保証される。

## 手順

1. **固定フレーズで起動する**(誤発火防止のため自然文からのAI自動判断はしない)。
   ```
   【テスト相談】test-kickoffスキルを呼び出して実行してください。
   ```
   ただし、design-spec-kickoffのデザイン設計インタビューが完了した直後、ユーザーが「続けて
   ⑤テストも相談しますか？」という問いに「はい」と答えた場合は、この固定フレーズを経由せず
   同じルームでそのまま手順2以降に進んでよい(対象アプリは直前に確定したものを使うため選択は
   スキップ)。

2. **対象アプリを選択肢方式で聞く**。`data/requirements.json`の`requirements[]`のうち、
   `designSpec.answers`が`designSpecChecklist.items`全件分埋まっているアプリ
   (デザイン設計完了済み)だけを候補として提示する。該当アプリのデザイン設計がまだ未完了の場合は、
   先にdesign-spec-kickoffでデザイン設計を済ませるよう案内し、ここで終了する。

3. **参考情報を読む**: 選択したアプリの`requirements[].detailedDesign.answers`(④詳細設計の回答)・
   `requirements[].designSpec.answers`(デザイン設計の回答)、既存の`test`(途中まで入力済みの場合が
   ある)、対象リポジトリ自身の既存実装・既存テストコード(README・テストディレクトリ等)を確認する。

4. **`data/requirements.json`の`testChecklist.items`を1つずつ順に確認する**
   (basic-design-kickoff/detailed-design-kickoffと同じ聞き取りスタイルをrule23で踏襲)。
   空欄のまま次に進んでもよい。

5. **記録する**: `data/requirements.json`の`requirements[]`から該当アプリのエントリを見つけ、
   `test`フィールドを追加・更新する(`answers`は`{n, question, answer}`の配列として
   `testChecklist.items`全件分格納、`status`は「対応中」または「完了」)。commit・push・mainへの
   マージまで行う(claude-core-rules.mdルール25)。対応するタスクを`data/tasks.json`へ起票する。
   この記録だけで、dashboard.htmlの🧪テストタブに自動で表示される。

6. **具体的なテストケース・観点を提案する(2026-11-02追加、AI Lab基本設計相談時のユーザー指示)**。
   手順5で`testChecklist`の方針(何を・どう検証するか)が決まった直後に続けて、`testChecklist`の
   方針を具体的なテストケースへ落とし込む。
   - `progress-tracker-dashboard`の`data/test-patterns.json`(どのアプリからも参照できる、
     Playwrightテストの観点・パターンの蓄積)を確認し、今回のアプリで使い回せるパターンが
     あるかをチェックする。
   - 使い回せるパターンがあれば提案し、無ければAI側(Claude)が新しいテストケース・観点の案を
     積極的に出す(ユーザー指示「AI側で提案とテスト観点の案を出してほしい」)。
   - ユーザーと相談して具体的なテストケースを確定したら、`data/test-patterns.json`の
     `patterns`配列へ`{id, title, category, description, suggestedApproach, usedInApps: [{repo, addedAt}], addedAt}`
     形式で追記する(既存パターンを今回のアプリでも使った場合は、そのパターンの`usedInApps`に
     今回のアプリを追加する)。commit・push・mainへの反映まで行う。
   - 確定したテストケースの要約は、対象アプリの`requirements[].test`側にも残す(`testChecklist`の
     回答と合わせて見れるようにする)。

7. **チェイン(続けて⑥運用・保守も相談するか聞く、2026-10-25追加)**: 手順6の記録が終わったら、
   ユーザーへ「続けて⑥運用・保守も相談しますか？」と尋ねる。
   - 「はい」→ 新しいセッションを作らず、同じルームのまま`ops-kickoff`スキル
     (`.claude/skills/ops-kickoff/SKILL.md`)の手順2以降を続けて実施する(対象アプリは今回確定
     したものを使うため選択はスキップ)。
   - 「いいえ」→ ここで終了してよい。

8. 意味のある設計判断があれば`data/concept-log.json`にも記録する(rule23)。

## 設計時からのテスト容易性の検討(2026-11-02追加)

このスキル(⑤テスト)だけでテスト容易性を担保しようとしない。AI Lab基本設計相談での
ユーザー指摘「実装したけどテストできなければ意味がない」を踏まえ、`basicDesignChecklist`の
項目4・10、`detailedDesignChecklist`の項目7で、既にそのフェーズの段階からテスト可能な設計に
なっているかを確認しておくこと(新しいチェックリスト項目を追加するのではなく、既存項目の
運用を徹底する)。
