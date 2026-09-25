---
name: new-app-kickoff
description: Kick off the planning phase for a brand-new app idea. Triggered by claude-voice-bridge's fixed skill phrase "【新規アプリ構想】new-app-kickoffスキルを呼び出して実行してください。" (sent via the "🔧 スキル呼び出し文言" template button, though users can also type it directly). Before doing anything else, reviews this project's own settings (CLAUDE.md/claude-core-rules.md), researched knowledge (concept-log.json), and past track-record knowledge (tasks.json's completed detail/issues) so the new idea isn't designed in a vacuum. Then creates a brand-new, repo-less Claude Code Remote session dedicated to that one app and hands the actual idea-fleshing-out (要件・機能・技術選定などの構想) off to that new room — this skill (running in manager-room) does not design the app itself, per CLAUDE.mdルール18の作業分担方針.
---

# 新規アプリ構想の立ち上げ(New app kickoff)

## これは何か

ユーザーから「新しいアプリを作りたい」のような依頼があった時に、manager-room(このセッション)が
自分でいきなり要件定義・機能設計を始めるのではなく、①既存のナレッジを踏まえた上で、②専用の新規ルームを
立ち上げ、③実際の構想(要件・機能・技術選定など)はそのルームに任せる、という手順を固定化したもの
(2026-09-25追加、ユーザー指示)。CLAUDE.mdルール18「manager-roomは実装が必要な作業を見つけたら
自分でコードを書かず作業ルームへ依頼する」の考え方を、コーディング以前の"構想"フェーズにも広げたもの。

## 手順

1. **固定フレーズで起動する**。claude-voice-bridgeのサイドパネル/モバイル版の「🔧 スキル呼び出し文言」に
   ある「新規アプリの構想を始める」ボタンから送信されるか、ユーザーが直接下記を入力する。
   ```
   【新規アプリ構想】new-app-kickoffスキルを呼び出して実行してください。
   ```
   誤発火防止のため、このスキルは固定フレーズでのみ起動する(自然文からのAI自動判断はしない)。

2. **既存ナレッジを確認する(構想を始める前に必ず)**。何も見ずに新しいアイデアを一から考えるのではなく、
   下記を実際に読んでから臨む(CLAUDE.mdルール13・23の考え方に基づく)。
   - **基本設定**: `data/claude-core-rules.md`(CLAUDE.mdの正本、全リポジトリ共通の運用ルール。
     特にルール9「永久無料」・ルール8「PC/iPhone両対応の確認」・ルール22(実装規模での書き込み方式使い分け)等、
     新規アプリの設計方針に直接影響するルールがある)
   - **調査したナレッジ**: `data/concept-log.json`(過去の実装判断ログ。設計パターン・DB設計・
     セキュリティ対応・AI/LLM関連・テスト方針など、他アプリで既に検証済みの知見を再利用できないか確認する)
   - **今までの実績ナレッジ**: `data/tasks.json`(過去に完了したタスクの`detail`(実装ナレッジ)・
     `issues`(問題点)。類似のアプリ・機能を過去に作っていないか、その際どんな問題にぶつかったかを確認する)
   - 上記に加え、依頼された新規アプリのジャンル次第では`data/policy.json`(全体方針)や、関連しそうな
     既存アプリの実装(例: 似た機能を持つ既存リポジトリのREADME)も確認する

3. **専用の新規ルーム(CCRセッション)を作成する**。`create_session`を使う。
   - **リポジトリには紐付けない(`source_url`を指定しない)**。この段階ではまだGitHubリポジトリが
     存在しない構想フェーズのため、素のプレーンな会話セッションとして作成する(2026-09-25、ユーザー確認
     済み)。リポジトリが必要になるのは構想が固まりコードを書き始める段階からで、それはこのスキルの
     範囲外(実装フェーズになったら別途リポジトリを作成し、README「ルームマッピング」表へ追記する)。
   - タイトルは`<アプリ名(仮)または依頼内容の要約> 構想ルーム`のようにわかりやすくする。

4. **手順2で集めたナレッジの要点を、新規ルームへ`send_message`で引き継ぐ**。丸ごと転記するのではなく、
   今回のアプリ案に関連しそうな要点(適用できそうな過去の設計判断・気をつけるべき過去の問題点・
   絶対に守るべき基本ルールの要約)に絞って渡す。あわせて「ここでこのアプリの構想(要件・機能・
   技術選定など)を練ってください」と、構想フェーズの担当がこの新規ルームであることを明示する。

5. **manager-room自身は構想の中身(要件定義・機能設計・技術選定など)に踏み込まない**。手順3〜4を
   終えたら、作成したセッションIDと新規ルームのタイトルをユーザーへ報告して完了とする(CLAUDE.mdの
   「manager-roomは振り分けのみ」という役割分担を踏襲。過去にmanager-room自身が直接実装してしまい
   繰り返し指摘された経緯があるため、構想フェーズでも同じ違反を起こさないよう注意する)。

6. **記録**: 実施した新規アプリ構想の立ち上げ(いつ・どのアプリ案・どのセッションID)を
   progress-tracker-dashboardの`data/concept-log.json`または`data/tasks.json`に記録する
   (CLAUDE.mdの最重要ルール)。
