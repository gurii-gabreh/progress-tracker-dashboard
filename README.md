# progress-tracker-dashboard

複数リポジトリの実装状況・進捗を一覧化する自立型トラッカーアプリ。

## 目標アーキテクチャ

- **スプレッドシート「実装進捗管理シート」が唯一の正本**
  https://docs.google.com/spreadsheets/d/1679CPPuWq4lciwe4BsJTfjJpiZKvKWogETwtauPThYw/edit
  - **依頼タスクタブ**: `Repo, Task, 優先度, ステータス, 依頼日, 備考`。常に未完了タスクのみが並ぶ。人がここにタスクを追加する
  - **完了タブ**: `Repo, Task, 優先度, 完了日, 備考, 実装ナレッジ, 問題点, 成果物`。タスク完了時に依頼タスクタブから「移動」してくる。実装内容・問題点・解決方法などのナレッジをここで管理する
  - **コメントタブ**: `Repo, Task, 発言者, 本文, 日時`。ダッシュボードのコメントスレッド機能の実体
- **読み取り**: Google Driveの`read_file_content`でRoutineが直接シートを読む
- **書き込み**: Google Sheets APIには直接書き込めないため、**GAS(Google Apps Script)をウェブアプリとしてデプロイ**し、そこへHTTP POSTすることで依頼タスクタブ⇄完了タブ間の移動・更新を行う
- **ダッシュボード**: `dashboard.html`。スプレッドシートの内容を都度取り込んで生成する「見やすい表示用のビュー」(二重管理にしない)
  - Claude Artifact: https://claude.ai/code/artifact/b395634a-ff68-44cb-a667-92c53448c992
  - GitHub Pages: https://gurii-gabreh.github.io/progress-tracker-dashboard/（mainにpushするたびGitHub Actionsで自動デプロイ）
- **ルームは1つに集約**: プラットフォーム制約上Routineを他セッションに紐付けて新規作成できないため、
  「リポジトリごとに専用の自動実行ルーム」は実現できず、全リポジトリの処理を単一のRoutine
  (session_01DDATKE77mbQxkj4HUZ91Gt)がまとめて行う。これは暫定措置ではなく、この制約が続く限りの
  恒久的な構成(下記「ルームマッピング」参照)

## ルームマッピング

自動実行(Routine)は `session_01DDATKE77mbQxkj4HUZ91Gt` に一本化(trig_01CxLtgC8JCMSCgbpeHq9TjA、平日9時JST)。
旧trig_01JC7QYoVtYZinJov5Eqw8jQは2026-07-30に誤って削除されてしまい、他セッションからは同じ形で
再作成できなかった(自己バインドしたセッションでしか再作成できないプラットフォーム制約のため)ため、
session_01DDATKE77mbQxkj4HUZ91Gt側で自己バインドのRoutineとして作り直した。
このセッション(session_01XXySCiFKeZdazYy97NxMim)は設計・手動作業用の会話で、自動実行のRoutineはもう持たない。

| Repo | 手動作業用ルーム | 自動実行(Routine)ルーム |
|---|---|---|
| progress-tracker-dashboard | このセッション | session_01DDATKE77mbQxkj4HUZ91Gt |
| kizashi(結/ゆい) | session_01EttsGp4ZSP11U5i8kkKPwA | session_01DDATKE77mbQxkj4HUZ91Gt |
| supermarket-price-tracker | session_01LeHQUz9gH8bU9uVNdJBBF5 | session_01DDATKE77mbQxkj4HUZ91Gt |
| gemini-monitor | (未作成) | session_01DDATKE77mbQxkj4HUZ91Gt |
| ai-research-radar | (専用ルームなし) | Routineでは処理しない(下記参照) |

※ Routineを別セッションに紐付けること自体はプラットフォーム制約で不可のため、「アプリごとに専用の自動実行ルーム」は実現していない。上記の手動作業用ルームは、問題が起きたタスクを人が直接引き継いで作業する時に使う。

## 現在の状態

- GASウェブアプリ: デプロイ済み(`gas/Code.gs`。GitHubとは自動連携していないため、コード変更時は
  都度手動での再デプロイが必要。詳細は本README末尾の「引き継ぎ事項」参照)
- スプレッドシートの「依頼タスク」「完了」「コメント」タブ: GAS初回実行で自動作成済み
- `kizashi`・`supermarket-price-tracker`専用の自動実行ルームは作成していない。上記「ルームマッピング」
  に書いた通り、プラットフォーム制約によりRoutineを他セッションに紐付けて新規作成できないため、
  この構成(単一Routineが全リポジトリを処理)を恒久的な運用として採用している(移行予定はない)

## タスクの種別

スプレッドシートの `Repo` 欄の値で自動的に分類される。

- **既知のリポジトリ名**（`kizashi` / `supermarket-price-tracker` / `gemini-monitor` / `progress-tracker-dashboard`）→ **コード実装タスク**。ブランチを切って実装し、PRを作成する
- **`ai-research-radar`** → **このRoutineでは処理しない**。`gurii-gabreh/ai-research-radar`リポジトリの`gas/Code.gs`(スプレッドシートにバインドしたGoogle Apps Script)がGemini APIで1日1回自動調査し、依頼タスクタブのステータスも直接更新する専用の仕組みがあるため、`data/tasks.json`にも取り込まず完全に無視する(重複処理を避けるため)
- **それ以外の文言**（例: `調査`, `資料作成`）→ **調査・資料作成タスク**。コードは書かず、調査結果や資料（pptx/pdf/docx等）を作成し、Googleドライブ等に保存してリンクを`成果物`に記録する。リポジトリへのPRは作らない

## 運用ルール

1. タスクは依頼タスクタブに追加する（優先度・対象リポジトリ or 種別を明記）
2. Routineは平日定期実行で、依頼タスクタブの未着手タスクを優先度順に処理する(「スキップ」は自動再試行せず、人が介入するまで対象外)
3. 実装中に問題が起きたタスクは「スキップ」にして備考に理由を記録し、依頼タスクタブに残したまま次のタスクへ進む(そのリポジトリ専用ルームで人が指示すれば再開できる)
4. コード実装タスクの変更はブランチを切ってコミットし、PRを作成する（直接mainへは反映しない）
5. 完了したタスクはGAS(`completeTasks`アクション)経由で依頼タスクタブから削除し、実装ナレッジ付きで
   完了タブへ移動する。この際`data/tasks.json`の`detail`(実装ナレッジ)・`issues`(問題点)・`note`(備考)・
   `output`(成果物)がそのまま完了タブの同名列に書き込まれるため、`detail`は「完了しました」のような
   一言で済ませず、何を・なぜ・どう実装したかを、後で人が完了タブだけ読んでも経緯が分かる粒度で書く。
   実装中に発生した問題点・制約・未解決事項は`detail`の文章に埋め込まず、`issues`に分けて書く
   (完了タブの「問題点」列にそのまま反映される)。ここで手を抜くと、スプレッドシート側にはナレッジが
   実質何も残らないことになる
6. `dashboard.html`もスプレッドシートの最新内容から再生成してコミット、Artifact/GitHub Pagesにも反映する
7. タスクを完了とする際、人による手動設定(APIキーの登録、外部サービスの権限・設定変更、GASの再デプロイなど)が
   別途必要な場合は、`data/tasks.json`の該当タスクに`manualSetup`フィールドで具体的に何をすべきか明記する。
   `detail`(実装ナレッジ)に書くだけでは埋もれてしまうため、`manualSetup`があるタスクはダッシュボード上で
   ⚠バッジ付きで常に(detailを開かなくても)表示される。手動設定が不要なら`manualSetup`は付けない
8. 各タスクにはダッシュボード上で簡易チャットスレッド(`comments`フィールド)が付けられる。人がエラー報告・
   追加指示・完了報告などをタスク単位で書き込める。Routineは実行のたびに、前回処理より後に追加された
   `author: "user"`のコメントがないか全タスク(完了済みタスクも含む)を確認し、あれば次のように対応する。
   - 「デプロイ完了」「対応しました」等、`manualSetup`で依頼した作業の完了報告であれば、`manualSetup`を
     削除し、必要ならタスク(またはサブタスク)の`status`を`完了`に更新する
   - コメントがダッシュボードの「📝 記録を補足依頼」ボタンによる定型文(記録の空欄を埋めてほしい、という
     趣旨)の場合は、`status`もタスクの中身も変更しない。`data/tasks.json`の`note`/`detail`/`issues`/
     `output`と、スプレッドシート側(完了タブ、まだ未完了なら依頼タスクタブ)の対応する列を`?action=list`
     で突き合わせ、どちらか一方にしか無い情報や、実際の対応内容(PRの差分・作成した成果物など)と比べて
     空欄になっている項目があれば、実際に確認した上で埋める。**既に具体的な記載がある項目は上書き・
     重複登録しない**(空欄の項目だけを埋め、両者の内容を一致させる)。完了済みタスクで内容を追記した
     場合は`completeTasks`を呼び直して完了タブにも反映する
   - それ以外(追加の指示・修正依頼・エラー報告など)であれば、その内容を汲んで作業し直す。対象タスクの
     `status`を`未着手`または`進行中`に戻し、対応が必要であることを`note`に記録する
   - いずれの場合も、対応した内容を`author: "routine"`のコメントとして同じ`comments`配列に追記し、
     人に何をしたか分かるようにする(「完了しました」の一言で済ませず、具体的に。記録補足依頼で
     埋める項目が無かった場合も「確認しましたが不足はありませんでした」のように結果を返す)

## 管理対象リポジトリ

- gurii-gabreh/kizashi
- gurii-gabreh/supermarket-price-tracker
- gurii-gabreh/gemini-monitor
- gurii-gabreh/progress-tracker-dashboard（本アプリ自身）

## AI調査(Gemini)の別系統について

`ai-research-radar`は本Routineの管理対象**外**。キーワードを依頼タスクタブに
`Repo=ai-research-radar, Task=<キーワード>`として追加すると、Gemini APIを使った
Google Apps Scriptが1日1回自動で調査し、「AI技術情報・活用事例 収集ログ」シートに結果を追記、
依頼タスクタブのステータスも直接「完了」に更新する。詳細は
https://github.com/gurii-gabreh/ai-research-radar のREADME参照。

**引き継ぎ事項(1〜4すべて対応済み)**: 旧Routineが削除されていたため2026-07-30に
session_01DDATKE77mbQxkj4HUZ91Gt宛てで`trig_01CxLtgC8JCMSCgbpeHq9TjA`として再作成した。
1. 「タスクの種別判定」に`ai-research-radar`を無視する(取り込まない)ルールを追加 → **反映済み**
   (`gemini-monitor`は既存の別プロジェクト(測定系)なのでそのまま維持)
2. タスク完了時に人の手動設定が別途必要な場合、`data/tasks.json`の該当タスクに`manualSetup`
   フィールドで具体的に何をすべきか明記するルールを追加 → **反映済み**(上記「運用ルール」7を参照)
3. 各実行のたびに、全タスクの`comments`配列に新しい`author: "user"`コメントが無いか確認し、
   あれば内容に応じて対応(manualSetup解消 or タスク再オープン)した上で`author: "routine"`の
   返信コメントを追記するルールを追加する(運用ルール8) → **反映済み**(2026-07-30)。
   GAS本体(`gas/Code.gs`)に`doPost`の`addComment`アクション(「コメント」タブへの追記、
   無ければ作成)と、`listTasks()`(`?action=list`)のレスポンスへの`comments`配列追加を実装した。
   ダッシュボード側は元々`addComment`のPOST送信と`comments`配列のマージ処理まで実装済みだった
   ため、これで書き込み・読み取りの両方が揃った。Routineプロンプト側にも「GAS連携(コメント確認・
   完了タブ同期)」の手順を追加し、毎回`?action=list`で`comments`を取得して`data/tasks.json`の
   各タスクノードの`comments`配列と突き合わせ(既読管理は「そのタスクに、ユーザーコメントより
   `at`が新しい`author: routine`の返信が既にあるか」で判定)、未対応の`author: user`コメントが
   あればmanualSetup解消 or タスク再オープンを行った上で`author: routine`の返信を「コメント」
   タブと`data/tasks.json`の両方に追記するようにした。
4. **依頼タスクタブ⇄完了タブ間の移動が実際には行われていない** → **反映済み**(2026-07-30)。
   GAS本体に`completeTasks`アクション(`{ token, completeTasks: [{ repo, task, completedDate,
   note, detail, output }] }`)を追加した。依頼タスクタブから該当行(repo+task一致)を削除し、
   完了タブに優先度・完了日・備考・実装ナレッジ・成果物を付けて追記する(既に完了タブに同じ
   repo+taskの行があれば上書き更新)。Routineプロンプト側にも、(a)タスクを`完了`にする際は
   必ず`completeTasks`を呼ぶルールと、(b)毎回の実行で`data/tasks.json`上`完了`だが完了タブに
   未反映のタスクが無いか確認し、あれば`completeTasks`で埋め合わせるルール(過去にこの仕組みが
   無かった時期に完了した`gemini-monitor`行などのバックフィルを兼ねる)を追加した。

いずれもGAS本体側の変更(`gas/Code.gs`)を含むため、**「タスクごとの簡易チャットスレッド機能
(コメント)」タスクのmanualSetupにある手動デプロイが完了するまでは、`addComment`・`completeTasks`
とも実際には動作しない**。デプロイ後の初回Routine実行で、コメント同期と完了タブへのバックフィル
(`gemini-monitor`行の移動などを含む)が自動的に走る想定。

5. **`gas/Code.gs`にさらに2件、手動デプロイが必要な変更を加えた(2026-07-31、本セッションで対応)**
   → **未デプロイ**。以下2点はコードとしては`gas/Code.gs`に反映済みだが、Apps Scriptエディタへの
   再デプロイが済むまでは効かない。
   - **appendRowが1000行以降に飛ぶ不具合の修正**: `setupValidation()`が依頼タスクタブのG2:G1000に
     チェックボックス(実値FALSE)を敷いているため、素朴な`appendRow()`は既存タスクの直下ではなく
     1000行目以降に新規タスクを追記してしまっていた(ダッシュボードから追加したタスクが「反映され
     ない」ように見えた原因)。`appendTaskRow()`を追加し、A列(Repo)の実データの直下に書き込むよう
     修正。あわせて、既に1000行目以降に紛れ込んでしまったデータをヘッダー直下に詰め直す修復用の
     `compactPendingSheet()`も追加した(デプロイ後、Apps Scriptエディタでこの関数を選んで一度だけ
     手動実行する必要がある)。
   - **完了タブに「問題点」列を追加**: `data/tasks.json`の各タスクに`issues`フィールド(実装中に
     発生した問題点・制約・未解決事項。`detail`の文章には埋め込まず分けて書く)を追加し、完了タブの
     列を`Repo, Task, 優先度, 完了日, 備考, 実装ナレッジ, 問題点, 成果物`(問題点を実装ナレッジと
     成果物の間に追加)に変更した。完了タブは現時点で空(ヘッダー行のみ)なので、`getOrCreateSheet()`
     に「データが1件も無い場合に限りヘッダー行を安全に上書きする」ロジックを追加し、次回のGAS実行時に
     自動でヘッダーが新しい列構成に更新される(既存データがあるタブには一切手を加えない設計)。
     Routineプロンプト側にも、`detail`と`issues`を分けて書くルールの反映が必要。
