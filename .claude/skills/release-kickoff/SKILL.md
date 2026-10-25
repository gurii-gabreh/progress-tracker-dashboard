---
name: release-kickoff
description: Conduct the ⑦リリース・移行(release & migration) interview for an existing app whose ⑥運用・保守 is already fully answered, via a voice/chat-triggered phrase. Triggered by claude-voice-bridge's fixed skill phrase "【リリース移行相談】release-kickoffスキルを呼び出して実行してください。". Like the other *-kickoff skills, this does NOT spin up a new session — it runs in whichever room it is invoked from, either as a direct standalone entry point or chained from ops-kickoff finishing ⑥運用・保守 in the same room. Interviews data/requirements.json's releaseChecklist items (grounded in IPA共通フレーム2013's 運用プロセス3.1の移行アクティビティ・システム導入プロセス2.3.7) and writes the result into that app's requirements[].release field.
---

# ⑦リリース・移行の立ち上げ(Release kickoff)

## これは何か

⑥運用・保守の全項目が入力済みのアプリについて、⑦リリース・移行
(ダッシュボードの📱アプリ開発→📂開発アプリ一覧→🚀リリース・移行タブ)の聞き取りを進めるための
スキル(2026-10-25追加)。

## 手順

1. **固定フレーズで起動する**(誤発火防止のため自然文からのAI自動判断はしない)。
   ```
   【リリース移行相談】release-kickoffスキルを呼び出して実行してください。
   ```
   ただし、ops-kickoffの⑥運用・保守インタビューが完了した直後、ユーザーが「続けて⑦リリース・
   移行も相談しますか？」という問いに「はい」と答えた場合は、この固定フレーズを経由せず同じ
   ルームでそのまま手順2以降に進んでよい(対象アプリは直前に確定したものを使うため選択は
   スキップ)。

2. **対象アプリを選択肢方式で聞く**。`data/requirements.json`の`requirements[]`のうち、
   `ops.answers`が`opsChecklist.items`全件分埋まっているアプリ(運用・保守完了済み)だけを候補として
   提示する。該当アプリの運用・保守がまだ未完了の場合は、先にops-kickoffで⑥運用・保守を済ませる
   よう案内し、ここで終了する。

3. **参考情報を読む**: 選択したアプリの`requirements[].ops.answers`(⑥運用・保守の回答)、既存の
   `release`(途中まで入力済みの場合がある)、対象リポジトリ自身の既存実装(README・デプロイ関連の
   記述・GitHub Actions等)を確認する。

4. **`data/requirements.json`の`releaseChecklist.items`を1つずつ順に確認する**(他の*-kickoffスキル
   と同じ聞き取りスタイルをrule23で踏襲)。空欄のまま次に進んでもよい。

5. **記録する**: `data/requirements.json`の`requirements[]`から該当アプリのエントリを見つけ、
   `release`フィールドを追加・更新する(`answers`は`{n, question, answer}`の配列として
   `releaseChecklist.items`全件分格納、`status`は「対応中」または「完了」)。commit・push・mainへの
   マージまで行う(claude-core-rules.mdルール25)。対応するタスクを`data/tasks.json`へ起票する。
   この記録だけで、dashboard.htmlの🚀リリース・移行タブに自動で表示される。

6. **チェイン**: 2026-10-25時点で⑦リリース・移行がチェーンの最終段のため、次段階への自動継続は
   行わない。さらに後続の工程が新設された場合は、ここに同様の「続けて◯◯も相談しますか？」という
   分岐を追加すること。

7. 意味のある設計判断があれば`data/concept-log.json`にも記録する(rule23)。
