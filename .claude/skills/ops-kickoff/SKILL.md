---
name: ops-kickoff
description: Conduct the ⑥運用・保守(operations & maintenance) interview for an existing app whose ⑤テスト is already fully answered, via a voice/chat-triggered phrase. Triggered by claude-voice-bridge's fixed skill phrase "【運用保守相談】ops-kickoffスキルを呼び出して実行してください。". Like the other *-kickoff skills, this does NOT spin up a new session — it runs in whichever room it is invoked from, either as a direct standalone entry point or chained from test-kickoff finishing ⑤テスト in the same room. Interviews data/requirements.json's opsChecklist items (grounded in IPA共通フレーム2013's 運用プロセス3.1・保守プロセス2.6・廃棄プロセス3.2) and writes the result into that app's requirements[].ops field.
---

# ⑥運用・保守の立ち上げ(Ops kickoff)

## これは何か

⑤テストの全項目が入力済みのアプリについて、⑥運用・保守
(ダッシュボードの📱アプリ開発→📂開発アプリ一覧→🔧運用・保守タブ)の聞き取りを進めるためのスキル
(2026-10-25追加)。

## 手順

1. **固定フレーズで起動する**(誤発火防止のため自然文からのAI自動判断はしない)。
   ```
   【運用保守相談】ops-kickoffスキルを呼び出して実行してください。
   ```
   ただし、test-kickoffの⑤テストインタビューが完了した直後、ユーザーが「続けて⑥運用・保守も
   相談しますか？」という問いに「はい」と答えた場合は、この固定フレーズを経由せず同じルームで
   そのまま手順2以降に進んでよい(対象アプリは直前に確定したものを使うため選択はスキップ)。

2. **対象アプリを選択肢方式で聞く**。`data/requirements.json`の`requirements[]`のうち、
   `test.answers`が`testChecklist.items`全件分埋まっているアプリ(テスト完了済み)だけを候補として
   提示する。該当アプリのテストがまだ未完了の場合は、先にtest-kickoffで⑤テストを済ませるよう
   案内し、ここで終了する。

3. **参考情報を読む**: 選択したアプリの`requirements[].test.answers`(⑤テストの回答)、既存の
   `ops`(途中まで入力済みの場合がある)、対象リポジトリ自身の既存実装(README・運用関連の記述・
   監視/バックアップ設定等)を確認する。

4. **`data/requirements.json`の`opsChecklist.items`を1つずつ順に確認する**(他の*-kickoffスキルと
   同じ聞き取りスタイルをrule23で踏襲)。空欄のまま次に進んでもよい。

5. **記録する**: `data/requirements.json`の`requirements[]`から該当アプリのエントリを見つけ、
   `ops`フィールドを追加・更新する(`answers`は`{n, question, answer}`の配列として
   `opsChecklist.items`全件分格納、`status`は「対応中」または「完了」)。commit・push・mainへの
   マージまで行う(claude-core-rules.mdルール25)。対応するタスクを`data/tasks.json`へ起票する。
   この記録だけで、dashboard.htmlの🔧運用・保守タブに自動で表示される。

6. **チェイン(続けて⑦リリース・移行も相談するか聞く)**: 手順5の記録が終わったら、ユーザーへ
   「続けて⑦リリース・移行も相談しますか？」と尋ねる。
   - 「はい」→ 新しいセッションを作らず、同じルームのまま`release-kickoff`スキル
     (`.claude/skills/release-kickoff/SKILL.md`)の手順2以降を続けて実施する(対象アプリは今回
     確定したものを使うため選択はスキップ)。
   - 「いいえ」→ ここで終了してよい。

7. 意味のある設計判断があれば`data/concept-log.json`にも記録する(rule23)。
