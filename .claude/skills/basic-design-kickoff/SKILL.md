---
name: basic-design-kickoff
description: Conduct the ②基本設計(basic design) interview for an existing app whose ①要件定義 is already recorded, via a voice/chat-triggered phrase. Triggered by claude-voice-bridge's fixed skill phrase "【基本設計相談】basic-design-kickoffスキルを呼び出して実行してください。". Unlike new-app-kickoff, this skill does NOT spin up a new session (create_session) — it runs the interview directly in whichever room it is invoked from, because it is meant to continue naturally either as a direct standalone entry point or as a continuation chained from new-app-kickoff finishing ①要件定義 in the same room. Asks which existing app via a selection list, interviews progress-tracker-dashboard's data/requirements.json basicDesignChecklist items one by one, writes the result into that app's requirements[].basicDesign field, and at the end offers to continue into ③機能要件 (functional-requirements-kickoff) in the same room.
---

# ②基本設計の立ち上げ(Basic design kickoff)

## これは何か

既に①要件定義(`data/requirements.json`の`requirements[]`に1件エントリがある)が済んでいる
アプリについて、②基本設計(`basicDesignChecklist`、IPA共通フレーム2013のシステム方式設計
プロセス2.3.3/ソフトウェア方式設計プロセス2.4.3に相当)の聞き取りを進めるためのスキル
(2026-10-25追加、ユーザー指示「要件定義したつづきをそうだんしたいため、対象のアプリを
選択肢方式で聞き、回答内容はそのアプリの基本設計部に明記するようにして」)。

**new-app-kickoffとの違い**: new-app-kickoffは`create_session`で専用の新規ルームを作成し、
manager-room自身は中身に踏み込まない設計だが、このスキルは**現在のルームでそのまま実行する**
(新しいセッションを作らない)。これは、①要件定義の直後に続けて②基本設計へ進みたい、という
ユーザーの意図(2026-10-25「続けてやりたいけど一気にはできない」)に合わせたもので、
new-app-kickoffが①を終えたその場のルームから②へ自然に継続できるようにするための設計。

## 手順

1. **固定フレーズで起動する**(誤発火防止のため、自然文からのAI自動判断はしない)。
   ```
   【基本設計相談】basic-design-kickoffスキルを呼び出して実行してください。
   ```
   ただし、new-app-kickoffの①要件定義インタビューが完了した直後、ユーザーが「続けて②基本設計も
   相談しますか？」という問いに「はい」と答えた場合は、この固定フレーズを経由せず、同じルームで
   そのまま本スキルの手順2以降に進んでよい(対象アプリは直前に確定したものを使うため、手順2の
   選択はスキップしてよい)。

2. **対象アプリを選択肢方式で聞く**。`gurii-gabreh/progress-tracker-dashboard`の
   `data/requirements.json`の`requirements[]`を読み、`repo`/`title`/`status`の一覧を選択肢として
   提示し、ユーザーに選んでもらう(自由記述で聞くとリポジトリ名の表記ゆれが起きるため選択肢方式を
   必須とする、2026-10-25ユーザー指示)。該当アプリの要件定義がまだ無い場合は、先に
   new-app-kickoffで①要件定義を済ませるよう案内し、ここで終了する。

3. **参考情報を読む**: 選択したアプリの`requirements[].answers`(①要件定義の回答)、既存の
   `basicDesign`(途中まで入力済みの場合がある)、`data/concept-log.json`・
   `data/policy.json`・対象リポジトリ自身の既存実装(README・ソースコード)を確認する。

4. **`data/requirements.json`の`basicDesignChecklist.items`を1つずつ順に確認する**
   (new-app-kickoffの①要件定義と同じ聞き取りスタイルをrule23で踏襲)。項目数・内容が変わっても
   このSKILL.mdを書き換える必要が無いよう、都度動的に読む。空欄のまま次のアプリ起票・開発着手に
   進んでもよい。

5. **記録する**: `data/requirements.json`の`requirements[]`から該当アプリのエントリを見つけ、
   `basicDesign`フィールドを追加・更新する(`answers`は`{n, question, answer}`の配列として
   `basicDesignChecklist.items`全件分格納、`status`は「対応中」または「完了」、`note`に
   経緯を一言記録)。commit・push・mainへのマージまで行う(claude-core-rules.mdルール25)。
   対応するタスクを`data/tasks.json`へ起票する。この記録だけで、progress-tracker-dashboardの
   📄開発資料タブ→📱アプリ開発→📂開発アプリ一覧→🏗基本設計に自動で表示される。

6. **意味のある設計判断(アーキテクチャ・DB設計・セキュリティ対応など)があれば、
   `data/concept-log.json`にも記録する**(claude-core-rules.mdルール記載の運用、rule23の
   2026-10-05 SECI追記にも基づき、関連する過去エントリを先に確認した上で記録する)。

7. **チェイン(続けて③機能要件も相談するか聞く)**: 手順5の記録が終わったら、ユーザーへ
   「続けて③機能要件も相談しますか？」と尋ねる(2026-10-25追加、ユーザー指示)。
   - 「はい」→ 新しいセッションを作らず、同じルームのまま`functional-requirements-kickoff`
     スキルの手順2以降を続けて実施する(対象アプリは今回確定したものを使うため選択はスキップ)。
     ただし②基本設計の全項目(`basicDesignChecklist.items`全件)が未回答のまま残っている場合は、
     機能要件タブ側の抜粋表示条件(②の全項目入力完了が前提、dashboard.htmlの
     `devDocsIsBasicDesignComplete()`参照)を満たさない旨を一言伝えた上で、それでも続けるか
     確認する。
   - 「いいえ」→ ここで終了してよい。

8. **manager-room(このルームが元々manager-roomの場合)自身は実装作業(コード変更)を行わない**
   という原則は、この聞き取り・JSON記録作業には適用されない(基本設計の聞き取り結果を
   `data/requirements.json`へ記録する行為は「構想・設計の聞き取り」であり、README「ルーム
   マッピング」が禁じる「実装作業の直接実施」とは別物)。
