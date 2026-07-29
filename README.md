# progress-tracker-dashboard

複数リポジトリの実装状況・進捗を一覧化する自立型トラッカーアプリ。

## 目標アーキテクチャ

- **スプレッドシート「実装進捗管理シート」が唯一の正本**
  https://docs.google.com/spreadsheets/d/1679CPPuWq4lciwe4BsJTfjJpiZKvKWogETwtauPThYw/edit
  - **依頼タスクタブ**: `Repo, Task, 優先度, ステータス, 依頼日, 備考`。常に未完了タスクのみが並ぶ。人がここにタスクを追加する
  - **完了タブ**: `Repo, Task, 優先度, 完了日, 備考, 実装ナレッジ, 成果物`。タスク完了時に依頼タスクタブから「移動」してくる。実装内容・問題点・解決方法などのナレッジをここで管理する
  - **ルーム設定タブ**: `Repo, ルームURL, 備考`。どのリポジトリの処理をどのClaude Codeセッション(ルーム)で行うかのマッピング
- **読み取り**: Google Driveの`read_file_content`でRoutineが直接シートを読む
- **書き込み**: Google Sheets APIには直接書き込めないため、**GAS(Google Apps Script)をウェブアプリとしてデプロイ**し、そこへHTTP POSTすることで依頼タスクタブ⇄完了タブ間の移動・更新を行う
- **ダッシュボード**: `dashboard.html`。スプレッドシートの内容を都度取り込んで生成する「見やすい表示用のビュー」(二重管理にしない)
  - Claude Artifact: https://claude.ai/code/artifact/b395634a-ff68-44cb-a667-92c53448c992
  - GitHub Pages: https://gurii-gabreh.github.io/progress-tracker-dashboard/（mainにpushするたびGitHub Actionsで自動デプロイ）
- **ルームの分離**: リポジトリごとに専用のClaude Codeセッション(ルーム)でRoutineを実行する。問題が起きたタスクはそのリポジトリ専用ルームに表示され、そこで直接指示して解決する

## ルームマッピング(ルーム設定タブと同じ内容をここにも記録)

自動実行(Routine)は `session_01DDATKE77mbQxkj4HUZ91Gt` に一本化(trig_01JC7QYoVtYZinJov5Eqw8jQ、平日9時JST)。
このセッション(session_01XXySCiFKeZdazYy97NxMim)は設計・手動作業用の会話で、自動実行のRoutineはもう持たない。

| Repo | 手動作業用ルーム | 自動実行(Routine)ルーム |
|---|---|---|
| progress-tracker-dashboard | このセッション | session_01DDATKE77mbQxkj4HUZ91Gt |
| kizashi(結/ゆい) | session_01EttsGp4ZSP11U5i8kkKPwA | session_01DDATKE77mbQxkj4HUZ91Gt |
| supermarket-price-tracker | session_01LeHQUz9gH8bU9uVNdJBBF5 | session_01DDATKE77mbQxkj4HUZ91Gt |
| ai-research-radar | (専用ルームなし) | Routineでは処理しない(下記参照) |

※ Routineを別セッションに紐付けること自体はプラットフォーム制約で不可のため、「アプリごとに専用の自動実行ルーム」は実現していない。上記の手動作業用ルームは、問題が起きたタスクを人が直接引き継いで作業する時に使う。

## 現在の状態(暫定)

以下が揃うまでの間は、**このセッションが全リポジトリ分をまとめて処理する暫定運用**を継続する。

- [ ] GASウェブアプリのデプロイ・URL共有
- [ ] `kizashi`用ルームの作成・URL共有
- [ ] `supermarket-price-tracker`用ルームの作成・URL共有
- [ ] スプレッドシートに「依頼タスク」「完了」「ルーム設定」タブを反映(GAS初回実行で自動作成される)

揃い次第、以下に移行する。
1. 今のRoutineを`progress-tracker-dashboard`専用に絞り込む
2. `kizashi`・`supermarket-price-tracker`用に、それぞれ専用ルームへ紐付けたRoutineを新規作成する
3. 全RoutineがGAS経由でスプレッドシートを直接読み書きする方式に切り替え、`data/tasks.json`は表示用キャッシュに格下げする

## タスクの種別

スプレッドシートの `Repo` 欄の値で自動的に分類される。

- **既知のリポジトリ名**（`kizashi` / `supermarket-price-tracker` / `progress-tracker-dashboard`）→ **コード実装タスク**。ブランチを切って実装し、PRを作成する
- **`ai-research-radar`** → **このRoutineでは処理しない**。`gurii-gabreh/ai-research-radar`リポジトリの`gas/Code.gs`(スプレッドシートにバインドしたGoogle Apps Script)がGemini APIで1日1回自動調査し、依頼タスクタブのステータスも直接更新する専用の仕組みがあるため、`data/tasks.json`にも取り込まず完全に無視する(重複処理を避けるため)
- **それ以外の文言**（例: `調査`, `資料作成`）→ **調査・資料作成タスク**。コードは書かず、調査結果や資料（pptx/pdf/docx等）を作成し、Googleドライブ等に保存してリンクを`成果物`に記録する。リポジトリへのPRは作らない

## 運用ルール

1. タスクは依頼タスクタブに追加する（優先度・対象リポジトリ or 種別を明記）
2. Routineは平日定期実行で、依頼タスクタブの未着手タスクを優先度順に処理する(「スキップ」は自動再試行せず、人が介入するまで対象外)
3. 実装中に問題が起きたタスクは「スキップ」にして備考に理由を記録し、依頼タスクタブに残したまま次のタスクへ進む(そのリポジトリ専用ルームで人が指示すれば再開できる)
4. コード実装タスクの変更はブランチを切ってコミットし、PRを作成する（直接mainへは反映しない）
5. 完了したタスクはGAS経由で依頼タスクタブから削除し、実装ナレッジ付きで完了タブへ移動する
6. `dashboard.html`もスプレッドシートの最新内容から再生成してコミット、Artifact/GitHub Pagesにも反映する

## 管理対象リポジトリ

- gurii-gabreh/kizashi
- gurii-gabreh/supermarket-price-tracker
- gurii-gabreh/progress-tracker-dashboard（本アプリ自身）

## AI調査(Gemini)の別系統について

`ai-research-radar`は本Routineの管理対象**外**。キーワードを依頼タスクタブに
`Repo=ai-research-radar, Task=<キーワード>`として追加すると、Gemini APIを使った
Google Apps Scriptが1日1回自動で調査し、「AI技術情報・活用事例 収集ログ」シートに結果を追記、
依頼タスクタブのステータスも直接「完了」に更新する。詳細は
https://github.com/gurii-gabreh/ai-research-radar のREADME参照。

**引き継ぎ事項**: 自動実行Routine(`trig_01JC7QYoVtYZinJov5Eqw8jQ`, session_01DDATKE77mbQxkj4HUZ91Gt)の
プロンプトは、この変更に合わせて「管理対象リポジトリ」から`gemini-monitor`を削除し、
「タスクの種別判定」に`ai-research-radar`を無視するルールを追加する必要があるが、
このセッションはそのRoutineの所有セッションではないため`update_trigger`で直接編集できなかった。
該当セッション側で本READMEの内容に合わせてプロンプトを更新すること。
