# progress-tracker-dashboard

複数リポジトリの実装状況・進捗を一覧化する自立型トラッカーアプリ。

## 構成

- **データストア**: Googleスプレッドシート「実装進捗管理シート」
  - 列: `Repo, Task, 優先度, ステータス, 最終更新日時, 備考`
  - https://docs.google.com/spreadsheets/d/1679CPPuWq4lciwe4BsJTfjJpiZKvKWogETwtauPThYw/edit
- **ダッシュボード**: `dashboard.html`（このリポジトリで管理し、Claude Artifactとして公開してスマホからも閲覧可能）
- **自動実装**: Routine（定期実行）がスプレッドシートのタスクを読み、優先度の高いものから実装を進める

## 運用ルール

1. タスクはスプレッドシートの `Tasks` 相当の行に追加する（優先度・対象リポジトリを明記）
2. Routineは平日定期実行で、未着手タスクを優先度順に処理する
3. 実装中に問題が起きたタスクは「スキップ」にして備考に理由を記録し、次のタスクへ進む
4. 変更はブランチを切ってコミットし、PRを作成する（直接mainへは反映しない）
5. 完了・スキップ後、スプレッドシートとこのダッシュボード(`dashboard.html`)を更新する

## 管理対象リポジトリ

- gurii-gabreh/kizashi
- gurii-gabreh/supermarket-price-tracker
- gurii-gabreh/progress-tracker-dashboard（本アプリ自身）
