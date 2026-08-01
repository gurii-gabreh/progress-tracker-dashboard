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
- **ルームは原則1つに集約、ただし例外あり**: プラットフォーム制約上、コーディネート役のセッションから
  「他セッションに紐付けて」Routineを新規作成することはできない。そのため大半のリポジトリ
  (kizashi・gemini-monitor・progress-tracker-dashboard)は、単一のRoutine
  (session_01DDATKE77mbQxkj4HUZ91Gt)がまとめて処理する構成を継続する。ただし対象セッション自身が
  「自己バインド」でRoutineを作ることはこの制約の対象外のため、2026-08-01に`supermarket-price-tracker`
  のみ例外として専用会話(session_01LeHQUz9gH8bU9uVNdJBBF5)自身が自己バインドの専用Routineを
  作成し切り出した(下記「ルームマッピング」参照)

## ルームマッピング

kizashi・gemini-monitor・progress-tracker-dashboardの自動実行(Routine)は
`session_01DDATKE77mbQxkj4HUZ91Gt` に一本化(trig_01CxLtgC8JCMSCgbpeHq9TjA、平日9時JST)。
旧trig_01JC7QYoVtYZinJov5Eqw8jQは2026-07-30に誤って削除されてしまい、他セッションからは同じ形で
再作成できなかった(自己バインドしたセッションでしか再作成できないプラットフォーム制約のため)ため、
session_01DDATKE77mbQxkj4HUZ91Gt側で自己バインドのRoutineとして作り直した。
このセッション(session_01XXySCiFKeZdazYy97NxMim)は設計・手動作業用の会話で、自動実行のRoutineはもう持たない。

2026-08-01、`supermarket-price-tracker`のみ例外として切り出した。手動作業用ルームでもある
session_01LeHQUz9gH8bU9uVNdJBBF5自身が自己バインドの専用Routine(trig_01CokZ2wpUHJjvdaRnWzpuvk、
平日9時JST)を作成し、依頼タスクタブのRepo列が`supermarket-price-tracker`の行だけを専用に処理する。
共有Routine(session_01DDATKE77mbQxkj4HUZ91Gt)側のプロンプトには、`supermarket-price-tracker`を
処理対象から除外するよう別途依頼が必要(本README更新時点ではまだ未対応)。なお、このtriggerを作成した
組織設定ではRoutineにGoogle Driveコネクタを明示的に持たせるオプションが使えなかった
(`create_trigger`が"the connectors parameter is not available for this organization"を返した)ため、
自動実行時にGoogle Driveツールが使えない可能性がある。そのRoutineのプロンプト内に、その場合の
代替手順(CSVエクスポート経由での取得を試す→それも無理なら読めなかった旨を報告して終了する)を
明記している。

| Repo | 手動作業用ルーム | 自動実行(Routine)ルーム |
|---|---|---|
| progress-tracker-dashboard | このセッション | session_01DDATKE77mbQxkj4HUZ91Gt |
| kizashi(結/ゆい) | session_01EttsGp4ZSP11U5i8kkKPwA | session_01DDATKE77mbQxkj4HUZ91Gt |
| supermarket-price-tracker | session_01LeHQUz9gH8bU9uVNdJBBF5 | session_01LeHQUz9gH8bU9uVNdJBBF5(専用、trig_01CokZ2wpUHJjvdaRnWzpuvk) |
| gemini-monitor | (未作成) | session_01DDATKE77mbQxkj4HUZ91Gt |
| ai-research-radar | (専用ルームなし) | Routineでは処理しない(下記参照) |

※ 「他セッションに紐付けて」Routineを新規作成することはプラットフォーム制約で不可なため、コーディネート
役のセッションが代わりに各アプリ専用のRoutineを一括で作ることはできない。ただし対象セッション自身が
自己バインドで作ることは制約の対象外で、supermarket-price-trackerはこの方法で専用化した(上記参照)。
残りのアプリについても、各手動作業用ルームのセッション自身に依頼すれば同様に専用Routine化できる。

## 現在の状態

- GASウェブアプリ: デプロイ済み(`gas/Code.gs`。GitHubとは自動連携していないため、コード変更時は
  都度手動での再デプロイが必要。詳細は本README末尾の「引き継ぎ事項」参照)
- スプレッドシートの「依頼タスク」「完了」「コメント」タブ: GAS初回実行で自動作成済み
- `kizashi`専用の自動実行ルームは作成していない。上記「ルームマッピング」に書いた通り、コーディネート役の
  セッションから他セッション宛てにRoutineを新規作成できないプラットフォーム制約により、この構成
  (共有Routineが処理)を当面の運用として採用している
- `supermarket-price-tracker`は2026-08-01、手動作業用ルーム(session_01LeHQUz9gH8bU9uVNdJBBF5)自身が
  自己バインドで専用Routine(trig_01CokZ2wpUHJjvdaRnWzpuvk)を作成し切り出した。共有Routine側を
  supermarket-price-tracker除外に更新する作業はまだ残っている(上記「ルームマッピング」参照)

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

**引き継ぎ事項(1〜4・6・8・9・10は対応済み、5・9・10はコード・プロンプトとも反映済みだがGAS再デプロイのみ人手待ち、
7は根本原因は未解決だが8の対応で実害は解消)**:
旧Routineが削除されていたため2026-07-30に
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
   → **コード・Routineプロンプトとも反映済み、GASエディタへの再デプロイのみ未対応**。以下2点は
   コードとしては`gas/Code.gs`に反映済みで、Routineプロンプト(trig_01CxLtgC8JCMSCgbpeHq9TjA)側
   の対応ルールも追加済みだが、Apps Scriptエディタへの再デプロイが済むまでは実際には効かない。
   - **appendRowが1000行以降に飛ぶ不具合の修正**: `setupValidation()`が依頼タスクタブのG2:G1000に
     チェックボックス(実値FALSE)を敷いているため、素朴な`appendRow()`は既存タスクの直下ではなく
     1000行目以降に新規タスクを追記してしまっていた(ダッシュボードから追加したタスクが「反映され
     ない」ように見えた原因)。`appendTaskRow()`を追加し、A列(Repo)の実データの直下に書き込むよう
     修正。あわせて、既に1000行目以降に紛れ込んでしまったデータをヘッダー直下に詰め直す修復用の
     `compactPendingSheet()`も追加した(**デプロイ後、Apps Scriptエディタでこの関数を選んで
     一度だけ手動実行する必要がある**。実データの詰め直しなので自動実行はしない設計)。
   - **完了タブに「問題点」列を追加**: `data/tasks.json`の各タスクに`issues`フィールド(実装中に
     発生した問題点・制約・未解決事項。`detail`の文章には埋め込まず分けて書く)を追加し、完了タブの
     列を`Repo, Task, 優先度, 完了日, 備考, 実装ナレッジ, 問題点, 成果物`(問題点を実装ナレッジと
     成果物の間に追加)に変更した。完了タブは現時点で空(ヘッダー行のみ)なので、`getOrCreateSheet()`
     に「データが1件も無い場合に限りヘッダー行を安全に上書きする」ロジックを追加し、次回のGAS実行時に
     自動でヘッダーが新しい列構成に更新される(既存データがあるタブには一切手を加えない設計)。
     Routineプロンプトにも、`detail`と`issues`を分けて書くルールと、`completeTasks`呼び出し時に
     `issues`も一緒に渡すルールを追加した(2026-07-31、update_triggerで反映済み)。
6. **ダッシュボードの「📝 記録を補足依頼」ボタンへのRoutine側対応を追加(2026-07-31)** →
   **反映済み**。ボタン自体(定型コメントを送信するだけ、GAS側の新規アクションは不要)は既に
   `dashboard.html`に実装済みだったが、Routineプロンプト側にこの定型文を検知した際の専用ロジックが
   無かった。追加した内容: コメント本文が定型文と完全一致する場合は通常の「追加指示」とは別扱いにし、
   `status`やタスク内容は変更せず、`data/tasks.json`側(`note`/`detail`/`issues`/`output`)と
   スプレッドシート側(完了タブ or 依頼タスクタブ)を突き合わせて、空欄・書き漏れがある項目だけを
   実際の対応内容を確認した上で埋める(既に記載済みの項目は上書き・重複登録しない)。完了済み
   タスクで内容を追記した場合は`completeTasks`を呼び直して完了タブにも反映する。埋める項目が
   無かった場合も「確認しましたが不足はありませんでした」と結果を返す。この動作は運用ルール8にも
   明記済み。

7. **【重要・新規判明】Routine実行環境からGAS Webアプリ(script.google.com)へのアウトバウンド
   通信自体がブロックされている** → **人の対応待ち(Routineの操作範囲外)**。2026-08-01、ユーザーから
   「スプレッドシートの依頼タスクが更新されていない」との指摘を受けて調査したところ、以下が判明した。
   - スプレッドシートの依頼タスクタブを直接確認すると、完了しているはずの`gemini-monitor`の行が
     まだ「未着手」のまま残っており、完了タブ・コメントタブも空だった。これは上記5・(1〜4含む)の
     GAS再デプロイが未対応であることに加え、**この環境がそもそもscript.google.comに到達できない**
     ことが原因と判明した。`curl`・`WebFetch`とも`script.google.com`へのアクセスが`403`
     (プロキシのCONNECTトンネル拒否、`/__agentproxy/status`で"policy denial"と確認)で即座に
     失敗する。プロキシ自身の案内文には「拒否されたホストへの再試行や回避はせず報告すること」と
     明記されているため、こちら側で回避策を試みることはできない。
   - 重要なのは、**GASを再デプロイしても、この環境からの書き込み(`addComment`・`completeTasks`)
     は解決しない**という点。原因の階層が異なる(1: GAS未デプロイ = アプリケーション層、
     2: ネットワークポリシー = インフラ層)。対応にはRoutine実行環境(`env_01DvV1ut5eXRsEYqLMC7hb1j`)
     のアウトバウンド許可リストに`script.google.com`を追加してもらう必要があり、これは環境設定の
     変更であってRoutine自身の操作範囲外
   - 一方、ダッシュボード(`dashboard.html`)からのGAS呼び出しはユーザーのブラウザから直接行われる
     ため、この制約を受けない。実際、`supermarket-price-tracker`向けの新規タスク行は
     ダッシュボードの「＋ 新規タスク」経由(`newTasks`)で正しくシートに追加されていた
   - 併せて、直前のRoutine実行(2026-07-31)がコメント確認・完了タブ同期まわりの調査に時間を
     使い切り、本来の手順3(依頼タスクタブからの新規タスク取り込み)まで到達しないまま終わって
     いたことも判明した。上記`supermarket-price-tracker`の新規タスクは2026-08-01に手動で
     `data/tasks.json`へ遅れて取り込んだ
   - `progress-tracker-dashboard`に「GAS Webアプリへの書き込みがこの環境から到達不可」タスクを
     追加し、`スキップ`(人の対応待ち)として記録した。`gemini-monitor`の該当タスクにも、
     スプレッドシート側の行が未反映のままである旨と、人が直接編集しても問題ない旨を追記した
   - Routineプロンプト側にも、GAS呼び出し失敗時に「ネットワークポリシーによる遮断」と
     「アプリケーション層のエラー(未デプロイ等)」を区別して診断するルールを追加した(誤って
     "再デプロイしてください"とだけ案内してしまうことを防ぐため)。あわせて、GAS呼び出しが
     失敗しても手順3(スプレッドシートの新規タスク取り込み。Google Drive経由でGASとは無関係)
     以降は必ず継続するよう明記した(2026-08-01、update_triggerで反映済み)

8. **項目7への根本対応: GAS側からGitHubへ取りに行く「プル型」同期に切り替え** →
   **コード・Routineプロンプトとも反映済み、GASエディタでの保存+トリガー設定のみ人手待ち**。
   claude.ai/codeの環境設定でRoutine実行環境(`env_01DvV1ut5eXRsEYqLMC7hb1j`)のネットワーク
   アクセスを「Custom」にして`script.google.com`を許可リストへ追加する対応を試みたが、
   設定ダイアログが開けないなどの理由で完了できなかった。そこで書き込みの向きを逆転させる方針に
   転換した。`gas/Code.gs`には元々`syncFromGithub()`という、GitHubの`raw.githubusercontent.com`
   から`data/tasks.json`を取得して完了タスクを依頼タスクタブ→完了タブへ移動する関数が存在していた
   (これを起動する時間主導トリガーが一度も設定されておらず実質死んでいた)。この関数を拡張し、
   完了タスクの移動に加えて、各タスクの`comments`配列内の`author: "routine"`コメントのうち
   コメントタブにまだ無いものだけを追記する処理を追加した(repo+task+author+text+atの完全一致で
   重複判定)。この関数はGASの時間主導トリガーから呼ばれ、**Google側のインフラが自発的にGitHubへ
   取りに行く**形になるため、Routine実行環境からscript.google.comへ到達できるかどうかに一切
   依存しなくなる。Routineプロンプト側は、(a) 引き続き`completeTasks`/`addComment`のPOSTを
   試みるが失敗しても`data/tasks.json`への正しい書き込み・コミット・pushさえしておけば実害は
   無い(次回のトリガー実行で自動的に追いつく)ことを明記し、(b) `?action=list`のGET自体が
   失敗する場合はGoogle Driveの`read_file_content`でスプレッドシート全体(依頼タスク・コメント・
   完了の全タブ)を直接読めば同じ情報が得られることを明記した(こちらもDrive API経由でGASを
   介さないため、ネットワーク制約の影響を受けない)。
   `progress-tracker-dashboard`の該当タスク(旧「GAS Webアプリへの書き込みがこの環境から到達不可」)
   は、実害が解消したことを踏まえてstatusを`完了`に更新した。

9. **項目8のsyncFromGithubを即時実行できる「⏩ 今すぐ同期」ボタンを追加** →
   **コード反映済み、GASエディタでの貼り付け保存+再デプロイ+トリガー設定が人手待ち**。
   ユーザーから「関数syncFromGithubを呼び出すボタンを作れば問題ないよね?」と要望があり、
   時間主導トリガー(最短でも1時間おき)を待たずに手動で即時同期できるようにした。
   `gas/Code.gs`の`doPost`に`{token, syncNow: true}`アクションを追加し、呼ばれたら
   `syncFromGithub()`を1回同期実行して結果(`movedToDone`/`addedComments`の件数)をJSONで
   返すようにした(`syncFromGithub()`自体もこれに合わせて戻り値を返すよう変更)。
   `dashboard.html`のヘッダーに「⏩ 今すぐ同期」ボタンを追加し、押すとGASへPOSTした後に
   既存の`refreshFromSheet(true)`で一覧を再取得して画面に反映する。
   manualSetupとして以下3点が残っている: (1) 最新の`gas/Code.gs`をApps Scriptエディタに
   貼り付けて保存する。(2) 今回は`doPost`自体を変更した(項目8の`syncFromGithub`単体追加とは
   異なり、保存だけでは反映されない)ため、デプロイ→デプロイを管理→既存のウェブアプリ
   デプロイの鉛筆アイコン→バージョンを「新しいバージョン」にして「デプロイ」を押す、という
   **ウェブアプリの再デプロイが必要**。これをしないと「⏩ 今すぐ同期」ボタンが古い`doPost`の
   ままで反応しない。(3) まだの場合はエディタの「トリガー」メニューから、`syncFromGithub`関数を
   時間主導トリガー(例: 1時間おき)として一度だけ登録する。この3点が完了すれば、Routineの
   ネットワーク制約とは無関係に、依頼タスクタブ⇄完了タブの移動・コメント返信が自動的に
   追いつくのに加え、ダッシュボードからいつでも即座に同じ処理を手動実行できるようになる。

10. **依頼タスクタブが完了後も更新されない不具合の修正+完了タブの問題点欄の充実+実装ナレッジの箇条書き化** →
    **コード・データとも反映済み、GASエディタでの貼り付け保存+再デプロイが人手待ち**。
    ユーザーから4点の指摘があり、原因調査の上で対応した。
    - **依頼タスクが完了後も消えない**: Google Driveで実際のスプレッドシートを直接確認したところ、
      `依頼タスク`タブのタスク名(人が手入力)と`data/tasks.json`のタスク名(Routineが書き起こし)とで
      「〜」(波ダッシュ)と「~」(半角チルダ)、全角「１」と半角「1」の表記が食い違っており、
      `findRow`/`removeRow`のrepo+task完全一致比較が常に失敗して行が削除されずに残っていたことが判明した。
      `gas/Code.gs`に`normalizeKey()`(NFKC正規化+チルダ表記統一)を追加し、`findRow`の比較をこれ経由に変更。
    - **未完了タスクの処理履歴が備考欄から分からない**: `syncFromGithub()`に、まだ完了していないタスクに
      ついても依頼タスクタブの該当行を探し、ステータスを最新化した上で備考欄へ`[日付] 内容`の形式で
      履歴を改行追記する処理を追加した(上書きではなく積み増し)。
    - **完了タブの問題点欄が空**: これはコード側のバグではなく、`data/tasks.json`の`issues`フィールドに
      実際には内容が入力されていなかったことが原因。ネットワーク制約による未検証事項や実測待ちの項目など、
      各タスクの既知の問題点を`issues`に書き起こして反映した。
    - **完了タブのヘッダー列順**: `["Repo", "Task", "優先度", "完了日", "備考", "実装ナレッジ", "問題点", "成果物"]`
      で、`gas/Code.gs`の`getOrCreateSheet`呼び出しと一致しており問題は無い。
    - **実装ナレッジが読みにくい**: `data/tasks.json`の`detail`フィールドを、1つの長い段落から
      「・」始まりの箇条書き(改行区切り)に書き直した。スプレッドシート・ダッシュボード側とも
      `white-space: pre-wrap`相当の折り返しで改行がそのまま表示されるため、両方で読みやすくなる。

    `findRow`/`removeRow`はdoPostの`newTasks`/`markUrgent`/`completeTasks`/`syncNow`からも呼ばれる
    共通関数のため、この変更を反映するには保存だけでなく**ウェブアプリの再デプロイが必要**。
