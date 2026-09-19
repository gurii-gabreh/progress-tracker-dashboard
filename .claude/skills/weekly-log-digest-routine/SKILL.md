---
name: weekly-log-digest-routine
description: Set up a weekly Routine (Claude Code Remote scheduled trigger) that reads a repository's raw accumulated log (JSON data 1, populated by some other capture mechanism — a browser extension, webhook, cron script, etc.) and writes an AI-judged summary/digest (JSON data 2) back to the same repo. Use this whenever the user wants to replicate claude-voice-bridge's "①ローカル保存→②GitHub生ログ集約→③週次AI要約" pattern in another repository, or asks to "turn this into a skill so other repos can do the same" about a raw-log-to-digest Routine. This is specifically the ③ (judgment) stage — it assumes ①② (getting raw data into a JSON file in the target repo) already exist or are being built separately; this skill does not build the capture mechanism itself.
---

# 週次ログ要約Routine(Weekly log digest routine)

## これは何か

claude-voice-bridgeで実装した「①ローカル保存→②GitHub生ログ集約→③週次AIが判断してJSONへ要約」という3段構成のうち、**③(判断・要約の段)を、Claude Code RemoteのRoutine(スケジュール実行)として他のリポジトリでも再現するための手順**(2026-09-18、ユーザー指示「今作った週次Routineのような仕組みを、他のリポジトリでも作れるようにする手順をスキル化しろ」)。

③は、①②(何らかの手段で生データがリポジトリのJSONファイルへ溜まる仕組み。ブラウザ拡張・Webhook・cronスクリプト等、①②自体の実装方法は対象リポジトリごとに違ってよい)が既に存在することを前提とする。①②自体を作る手順はこのスキルの範囲外。

## なぜRoutineで、なぜfresh session方式か

- 「生ログを読んでAIが判断し要約する」という工程は、単純なスクリプトでは代替できない(判断・要約そのものがAIの仕事のため)。かといって別料金の外部API呼び出しにすると費用がかかる(CLAUDE.mdルール9「永久無料」に反する)ため、Claude Code RemoteのRoutineとして、通常のセッション利用量の枠内で動かす。
- この工程は「特定の会話を続ける」ものではなく「独立した定型処理(読む→判断する→書く)」なので、`create_trigger`は`create_new_session_on_fire: true`(毎回フレッシュなセッションで実行)を使う。CLAUDE.md定期確認のような「同じ会話を続けて自己点検する」ケース(自己bind)とは目的が異なる点に注意。

## 手順

1. **対象リポジトリと2つのJSONパスを確認する**: JSONデータ1(生ログ、例: `data/room-log.json`)とJSONデータ2(要約先、例: `data/weekly-digest.json`)。無ければ空の初期ファイル(`{"items": []}`や`{"digests": [], "lastProcessedTs": 0}`等、対象リポジトリの既存の命名・スキーマ慣習に合わせる)を用意する。

2. **頻度・曜日時刻を決め、cron式をUTCに変換する**(JST→UTCの変換、日付をまたぐ場合は曜日フィールドもずらすこと。`create_trigger`のcron_expression引数の説明を参照)。「週1回」なら例えば「日本時間日曜0時」= UTC土曜15時 = `0 15 * * 6`。

3. **`create_trigger`を呼ぶ**。`create_new_session_on_fire: true`、`persistent_session_id`は指定しない。promptには以下を明記する(claude-voice-bridge向けに作った実例をテンプレートとして使ってよい):
   - 対象リポジトリをclone/add_repoする
   - JSONデータ1を読む(ファイルが大きい場合は全件読み込まず、`ts`でフィルタしながら読む)
   - **対象entryの絞り込みは「直近N日」のような相対期間指定ではなく、JSONデータ2に持たせた`lastProcessedTs`(前回処理した時点のタイムスタンプ、初回は0)より新しいentryだけを対象にするカーソル方式にする**(2026-09-19、ユーザー指摘「メッセージの日時も取り込み、それ以降に更新があれば追加にすればいい」。相対期間指定だと、Routineの発火タイミングがズレた場合に取りこぼし・二重処理が起きうるため)。対象0件なら「対象データなし」の1件だけ書いて終了し、`lastProcessedTs`は更新しない
   - 何を拾うか(未解決の質問・完了が明言されていない作業・繰り返し出てくる関心事など)を具体的に指示する
   - 出力先(JSONデータ2)のスキーマを具体的に指定する(フィールド名・型。対象期間の記録に`periodFrom`/`periodTo`を含めること)
   - 処理完了時に`lastProcessedTs`を今回対象にしたentryの最大`ts`へ更新することを明記する
   - commit・push・(designated branchがあれば)mainへのマージまで完了させる(CLAUDE.mdルール25)
   - 完了報告は簡潔にする(詳細な説明は不要、と明記しておかないと長くなりがち)

4. **実装箇所の記録を対象リポジトリ自身にも残す**(CLAUDE.mdルール24)。JSONデータ1・2のファイル、または関連するREADME/コメントに、このRoutineの存在・trigger_id・頻度を明記する。

5. **progress-tracker-dashboardのtasks.json/concept-log.jsonにも記録する**(CLAUDE.mdの最重要ルール)。作成したtrigger_idを控えておくこと(後で`update_trigger`/`delete_trigger`する際に必要)。

## 既存の実例

claude-voice-bridgeの週次Routine(trig_01Gvk1AGN7sr5F7b9qJW8haD、`data/room-log.json`→`data/weekly-digest.json`、日本時間日曜0時)が最初の実装例。新しいリポジトリへ展開する際は、このRoutineのprompt文面を土台にして、対象リポジトリのファイルパス・スキーマに合わせて書き換えるのが早い。
