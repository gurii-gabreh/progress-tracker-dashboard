---
name: new-app-kickoff
description: Kick off the planning phase for a brand-new app idea via a voice/chat-triggered phrase, as an automated alternate entry point into the EXISTING "🆕 新規相談"(new-consultation)flow that dashboard.html's copy-paste template already defines — not a separate/duplicate procedure. Triggered by claude-voice-bridge's fixed skill phrase "【新規アプリ構想】new-app-kickoffスキルを呼び出して実行してください。" (sent via the "🔧 スキル呼び出し文言" template button, though users can also type it directly). Reuses the same knowledge sources, interview style, userProfile.patterns check, and a/b/c/d classification as the dashboard button's prompt template; the only addition is automating room creation with create_session instead of manual copy-paste.
---

# 新規アプリ構想の立ち上げ(New app kickoff)

## これは何か

claude-voice-bridge側から音声・チャットの固定フレーズで、既存の「🆕 新規相談」フロー
(dashboard.htmlの依頼文テンプレート、`buildNewConsultationPromptText()`、2026-08-08追加、
README運用ルール31)を起動するための**自動化された別入口**(2026-09-25追加)。

**重要**: これは新規相談フローとは別の、新しい手順ではない。当初(2026-09-25)、この点を
確認せずに独自の手順(基本設定・調査ナレッジ・実績ナレッジの確認→リポジトリ無しの新規ルーム作成)
を設計してしまい、既存の「🆕 新規相談」フローとほぼ同じ目的の車輪の再発明になっていたことが
判明した(ユーザー指摘、CLAUDE.mdルール23違反)。このSKILL.mdはその後、中身を既存フローに
合わせて作り直したもの。**手順・確認するナレッジ・分類方法は、dashboard.htmlの
`buildNewConsultationPromptText()`が生成するテンプレートと同一にすること。** 将来どちらかを
変更する場合は、もう一方も必ず同時に更新して内容を一致させる(乖離を防ぐため)。

このスキルが追加する価値は1点だけ: 従来は「テンプレート文をコピーして手動で新しいチャットに
貼り付ける」必要があったが、`create_session`で新規ルームの作成そのものを自動化する。

## 手順

1. **固定フレーズで起動する**。claude-voice-bridgeのサイドパネル/モバイル版の「🔧 スキル呼び出し文言」に
   ある「新規アプリの構想を始める」ボタンから送信されるか、ユーザーが直接下記を入力する。
   ```
   【新規アプリ構想】new-app-kickoffスキルを呼び出して実行してください。
   ```
   誤発火防止のため、このスキルは固定フレーズでのみ起動する(自然文からのAI自動判断はしない)。

2. **`source_url`にprogress-tracker-dashboard自身
   (`https://github.com/gurii-gabreh/progress-tracker-dashboard`)を指定して`create_session`で
   新規ルームを作成する**。
   - 理由: ①progress-tracker-dashboardは`.claude/settings.json`の許可リストが既に整備済みで、
     承認待ちで止まりにくい。②手順3で確認するナレッジ(下記)がほぼ全てこのリポジトリ内にあり、
     コピー・二重管理が不要。
   - 新しく専用リポジトリを作る必要はない(構想が固まりコードを書き始める段階で初めて別途
     リポジトリを作成する。それはこのスキルの範囲外)。
   - タイトルは`<アプリ名(仮)または依頼内容の要約> 構想ルーム`のようにわかりやすくする。
   - 新規ルームはmanager-room(このセッション)とは別セッションになるため、「manager-room自身は
     構想の中身に踏み込まない」という役割分担は保たれる。

3. **新規ルームへ、以下の内容を`send_message`で伝える(`buildNewConsultationPromptText()`と
   同じ内容)**:
   1. まず下記を読み、関連する過去の実績・判断が無いか確認すること:
      - `data/ai-config.json`(AI基本設定)・`data/policy.json`(運用ポリシー)・`data/tasks.json`
        (過去の実装ナレッジ・issues)・`data/concept-log.json`(実装判断ログ)
      - `data/requirements.json`の`requirements`配列(過去の新規リポジトリ要件定義シート)と
        **`concerns`(陥りやすい問題の一覧。必ず確認すること)**
      - 参考として`gurii-gabreh/Knowledge-Dashboard`の`data/knowledge-index.json`
        (上記を横断集約した索引。ただし正本は常にprogress-tracker-dashboard側)
   2. **一度に全部聞かず、聞き取り形式(インタビュー形式)で、下記10項目を1つずつ順に確認する**
      (2026-09-25追加、ユーザー指示「確認する項目を統一したい」)。過去の実績・過去の要件定義
      シートで既に埋まる点は聞き直さない。**この段階では過去のトラブル事例との照合は行わず、
      まず10項目全ての回答を集め切ることを優先する**(2026-09-26変更、ユーザー指示「すべての
      項目確認してからでないと、また新たな懸念が出たりする」。1問ずつ照合すると、後の項目の
      回答で初めて見えてくる懸念を見落とすため)。
      1. アプリ名(仮)
      2. 目的・解決したい課題(何を・誰のために)
      3. きっかけ(なぜ今このアイデアが出てきたか)
      4. PC専用/iPhone専用/両対応(CLAUDE.mdルール8で必須確認とされている項目)
      5. 費用面での制約(ルール9「永久無料」が大前提。有料化が避けられない箇所の有無)
      6. 主要機能(MVP・最初に欲しい機能の一覧)
      7. 使うデータ(何を、どこに保存するか)
      8. 技術選定の希望・制約
      9. 優先度・着手時期の希望
      10. progress-tracker-dashboardでの管理要否(タスク一覧・ルームマッピングへの登録が必要か)
   3. **10項目全ての回答が揃ったら、そこで初めて、回答全体をまとめて下記と照合する**
      (2026-09-26変更、順序をユーザー指示により「10項目確認→懸念点チェック」の2段階へ)。
      該当する事例が見つかったら、黙って進めずその場で指摘し、あわせて代替案を提示する。
      - `data/requirements.json`の`concerns`(陥りやすい問題の一覧。`confirmedByUser: true`の
        もののみ。ユーザー自身の思考の癖だけでなく、CLAUDE.mdルールの追加経緯・README記載の
        繰り返し違反から来る、実装・進め方そのものの陥りやすいパターンも含む)
      - `data/tasks.json`の`issues`(過去の実装で実際に起きた問題点)
      - `data/concept-log.json`(過去の設計判断・回避パターン)
      - `gurii-gabreh/servicenow-sub-agent`の`data/research-items.json`
        (AI/開発関連の外部調査ナレッジ。research-knowledge-lookupスキル・CLAUDE.mdルール26参照。
        `curated: true`のものを優先し、無ければ未検証の生データである旨を明記する)
      - `data/requirements.json`の過去の`requirements`配列(同種のアプリを過去に検討していないか)
      該当する`concerns`の項目が見えたら、「これまでの傾向・経緯からすると、こういう間違い・
      進み方になりやすいです」と、根拠(`source`・`observedIn`)を添えて指摘する(事実に基づき、
      押し付けがましくならないように)。ユーザーが新たに「確かにそうだ」と認めた傾向があれば、
      本人の了承を得た上で`concerns`へ追記してよい(AI側が一方的に決めつけて追加しない)。
   4. 聞き取りの中で、この相談が次のどれに当たるかを判断する:
      - a. 新規リポジトリが必要な話 → 要件定義シートとしてまとめる対象
      - b. 既存リポジトリのタスクで済む話 → 通常のタスクとして起票すれば足りる
      - c. 調査・確認だけで完結する話 → 調べて回答すれば終わり
      - d. その場で回答すれば終わる軽微な相談 → 記録は不要
   5. 出力の出し分け:
      - a: 聞き取りが十分固まったらシートの下書きを提示し、確定を得てから
        progress-tracker-dashboardの`data/requirements.json`の`requirements`配列へ1件追加して
        commit・push(**ユーザー指示により、聞き取った内容は必ずJSONデータへ記録しナレッジ化する**)。
        `answers`←10項目それぞれの回答をそのまま`{n, question, answer}`の配列として格納する
        (2026-09-26変更。以前はbackground/goals/decisions等の複数フィールドへ合成していたが、
        画面がJSONをそのまま映すだけで済むよう、interviewChecklistの項目と1対1対応する形に
        変更した。対象外・未確定の話が出た場合は、該当するnの`answer`内に書き添える)。
        **`concernReview`←手順3で実際に浮かび上がった懸念を1件ずつ配列で
        記録する**(2026-09-26追加、ユーザー指示「懸念点については、相談した結果の最終的な
        回答も明記する仕様に」「相談途中に出てくる懸念は、全てJSON側に記録しナレッジとして
        使用できるように」)。`concerns`(既存の懸念点マスタ)と照合して該当したものは
        `{concernId, matchedBecause(なぜ該当したか), resolution(相談した結果、最終的にどう
        決着したか・どう回答したか)}`、`concerns`にまだ無い新規の懸念がその場で浮かび上がった
        場合も同様に`{concernId: null, description(浮かび上がった懸念の内容), resolution}`
        として**漏らさず記録する**(ユーザーが「確かにそうだ」と認め、他アプリにも当てはまる
        一般的な傾向だと判断できれば、`concerns`側へ新規追加してもよい)。`concerns`自体は
        一般化された問題の一覧、`concernReview`は「このアプリの相談で実際に出てきた懸念と、
        その解決内容」という個別記録)。
        あわせて対応するタスクを`data/tasks.json`へ起票する
      - b: `data/tasks.json`へ通常通り起票するだけでよい(要件定義シートは不要)
      - c・d: 記録不要。その場で調べて回答・相談に乗って終わってよい

4. **manager-room自身は構想の中身(要件定義・機能設計・技術選定など)に踏み込まない**。手順2〜3を
   終えたら、作成したセッションIDと新規ルームのタイトルをユーザーへ報告して完了とする。

5. **記録**: 実施した新規アプリ構想の立ち上げ(いつ・どのアプリ案・どのセッションID)を
   progress-tracker-dashboardの`data/concept-log.json`または`data/tasks.json`に記録する。
