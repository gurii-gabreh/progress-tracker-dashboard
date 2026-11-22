# AGENTS.md — AI向けの入口(Codex・ChatGPT・Gemini・Claudeなど共通)

このリポジトリ `gurii-gabreh/progress-tracker-dashboard` は、ユーザーが開発している全アプリ(GitHub `gurii-gabreh` 配下の各リポジトリ)の
**内容・開発経緯・最新状態・課題・運用ルールを一元管理する正本**です。どのAIも、まずこのファイルを読み、下の地図に沿って必要なファイルを確認してから回答・作業してください。

- 作成: 2026-11-22(ユーザー指示「会話しながらAIとやり取りさせる方面にしたい。GitHubの中身を見ればすべて分かるようにしたい」)
- 運用ルールの正本は `data/claude-core-rules.md`(ルール34が「どの情報をどこに書くか」)。このファイルはその要約と案内です。食い違いがあれば `data/claude-core-rules.md` を優先してください。

## 1. 情報の地図(どこを見れば何が分かるか)

| 知りたいこと | 見る場所 |
|---|---|
| アプリの概要・使い方 | 各アプリのリポジトリの `README.md` |
| 管理しているアプリ(リポジトリ)の一覧 | `data/tasks.json` の `knownRepos` と、各タスクの `repo` |
| 開発の経緯・最新の状態・課題・残課題 | `data/tasks.json`(タスクごとの `status`・`detail`・`note`・`checkHistory`・`nextAction`・`issues`)。課題は各タスクの `issues` に一本化する(2026-11-22決定、移行作業中) |
| 何を変えたか(作業の履歴) | 各リポジトリのコミット履歴(コミットメッセージに経緯と確認結果を書く運用) |
| 要件定義〜設計(アプリごと) | `data/requirements.json` の `requirements` 配列(各工程の回答)。聞き取り項目は `interviewChecklist`(要件定義)・`basicDesignChecklist`ほか各工程の `*Checklist` |
| 陥りやすい失敗・過去の懸念 | `data/requirements.json` の `concerns`(`confirmedByUser: true` のもの) |
| 設計判断・教訓 | `data/concept-log.json` |
| 日々の相談・決定事項(時系列) | `data/manager-room-log.json`(引き継ぎ用の正本) |
| 自動処理(定期実行)・外部の設定の置き場 | `data/ai-config.json` の 🔄ルーティン関連(`web.routineLoopReview` ほか)。鍵やパスワードの**値は書かれていない**(名前と置き場所のみ) |
| AI/開発の調査ナレッジ | `gurii-gabreh/servicenow-sub-agent` の `data/research-items.json` |
| 運用ルール全文 | `data/claude-core-rules.md`(全リポジトリの `CLAUDE.md` に自動配布される正本) |

## 2. 会話でやり取りするときの基本ルール(要約)

1. 根拠のある最新情報だけで答える。確認できないことは「確認できない」と言い、推測で埋めない。
2. 仮の話(予測)と現実の話を分ける。仮の話は最初に「これは仮想的な話です」と言う。
3. 分からないこと・迷うことは、勝手に進めず質問する。質問は1回に1つずつ。
4. 費用がかからない方法を優先する。有料になる場合は必ず相談する。
5. 実装・変更の前に、上の地図で過去の経緯・課題・設計判断を確認し、使った/使わなかった理由を述べる。
6. 鍵・パスワード・APIキーは扱わない(ユーザー本人が入力する)。リポジトリに書かない。
7. 回答は日本語で、専門用語は噛み砕いて説明する。

## 3. 新しいアプリの要件定義を頼まれたら

手順の正本は dashboard.html の「🆕 新規相談」(`buildNewConsultationPromptText()`)と `.claude/skills/new-app-kickoff/SKILL.md`。要点:

1. 上の地図のうち `data/tasks.json`・`data/concept-log.json`・`data/requirements.json`(`requirements` と `concerns` の両方)を読み、関連する過去の実績・判断を確認する。
2. `data/requirements.json` の `interviewChecklist` の項目(現在18項目)を、**1問ずつ順番に**聞く。既に分かっている項目は聞き直さない。
3. 全項目の回答が揃ってから、`concerns`・`tasks.json` の課題・`concept-log.json` と照らし合わせ、当てはまる過去の失敗があれば根拠を添えて指摘し、代替案を出す。
4. 新しいリポジトリが必要な話なら、市場分析7ステップ(`marketAnalysisFramework`)の下書きも作る。
5. 結果は `requirements` の1件と同じ形(`answers` は `{n, question, answer}` の配列)で提示する。**Claude以外のAIはリポジトリに直接書き込まず、結果を会話で返す**(記録はClaudeが確認してから行う。重要な判断は別のAIで二重確認する運用)。

## 4. 記録のタイミング

- 作業中の記録は、計画(Claude Codeのタスク一覧)に材料を残し、毎晩の定期処理が `data/tasks.json` などへまとめて書く(ルール14の4)。
- 実装そのものはその場でコミットし、`main` に反映する。READMEや自動処理の台帳は、実装と同じコミットで更新する。
