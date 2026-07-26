# progress-tracker-dashboard

複数リポジトリの実装状況・進捗を一覧化する自立型トラッカーアプリ。

## 構成

- **タスク入力**: Googleスプレッドシート「実装進捗管理シート」
  - 列: `Repo, Task, 優先度, ステータス, 最終更新日時, 備考`
  - https://docs.google.com/spreadsheets/d/1679CPPuWq4lciwe4BsJTfjJpiZKvKWogETwtauPThYw/edit
  - **人がタスクを追加する場所。** 現状のツールではRoutineからこのシートへの書き込みができないため、シートは「入力専用」として使う
- **ステータスの正本**: `data/tasks.json`（このリポジトリで管理。Routineがここを読み書きする）
- **ダッシュボード**: `dashboard.html`（`data/tasks.json` の内容を埋め込んだ静的ページ）
  - Claude Artifact: https://claude.ai/code/artifact/b395634a-ff68-44cb-a667-92c53448c992
  - GitHub Pages: https://gurii-gabreh.github.io/progress-tracker-dashboard/（mainにpushするたびGitHub Actionsで自動デプロイ）
- **自動実装**: Routine（定期実行）がスプレッドシートの新規タスクを取り込みつつ、`data/tasks.json` を見て優先度の高い未着手タスクから実装を進める

## タスクの種別

スプレッドシートの `Repo` 欄の値で自動的に分類される。

- **既知のリポジトリ名**（`kizashi` / `supermarket-price-tracker` / `progress-tracker-dashboard`）→ **コード実装タスク**。ブランチを切って実装し、PRを作成する
- **それ以外の文言**（例: `調査`, `資料作成`）→ **調査・資料作成タスク**。コードは書かず、調査結果や資料（pptx/pdf/docx等）を作成し、Googleドライブ等に保存してリンクを`output`に記録する。リポジトリへのPRは作らない

## 運用ルール

1. タスクはスプレッドシートの行に追加する（優先度・対象リポジトリ or 種別を明記）
2. Routineは平日定期実行で、スプレッドシートの新規タスクを `data/tasks.json` に取り込み、未着手タスクを優先度順に処理する
3. 実装中に問題が起きたタスクは「スキップ」にして備考に理由を記録し、次のタスクへ進む
4. コード実装タスクの変更はブランチを切ってコミットし、PRを作成する（直接mainへは反映しない）
5. 完了・スキップ後、`data/tasks.json` と `dashboard.html` を更新してコミット、Artifactも同じURLで再公開する

## 管理対象リポジトリ

- gurii-gabreh/kizashi
- gurii-gabreh/supermarket-price-tracker
- gurii-gabreh/progress-tracker-dashboard（本アプリ自身）
