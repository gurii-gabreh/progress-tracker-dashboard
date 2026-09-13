---
name: room-task-audit
description: Review the current conversation (this room) and report every unresolved item — an open question you asked that hasn't been answered, a task you started but haven't confirmed complete, or a pending decision. Triggered by claude-voice-bridge's "🔍 ルームタスク一覧を抽出" button, which sends a fixed phrase into the chat to invoke this skill (not by users typing it directly, though they can). Replaces the old regex/marker-based (【相談NNN】【処理開始NNN】) detection, which was unreliable because it depended on the assistant remembering to tag every message — this skill instead asks the assistant to judge the conversation directly, at the moment the user requests it, from the model's own genuine understanding of what happened. Output must be silent about anything already resolved and must follow the exact delimited format below so the extension can parse it.
---

# ルームタスク監査(Room task audit)

## これは何か

claude-voice-bridge(音声サイドパネル拡張機能)の「🔍 ルームタスク一覧を抽出」ボタンが、
このスキルを起動するための固定フレーズをチャット入力欄へ自動送信する。過去に使っていた
【相談NNN】【処理開始NNN】【処理完了NNN】マーカーの正規表現スキャン方式は、AI側が
毎回タグを付け忘れるため信頼できず廃止された(2026-09-13、ユーザー指摘)。代わりに、
呼び出された時点でAI自身が会話全体を読み返し、その場で「今何が未完了か」を判断する。

## 手順

1. **この会話(ルーム)を最初から読み返す**。タグの有無に頼らず、実際の内容で判断する。
   - あなたが尋ねたが、まだユーザーから明確な答えを得ていない質問・相談
   - あなたが着手すると言った、または着手したが、完了したと明言していない作業
   - ユーザーから依頼されたが、まだ対応していない/対応中の依頼
   - 既に回答済み・実装済み・ユーザーが解決済みと明言した項目は**含めない**(見つけたが
     解決済みと判断したものを、わざわざ「解決済みとして」列挙する必要もない。単に含めない)

2. **不明な場合は「不明」と判断せず、実際に読み返して確認する**。読み返しても本当に
   曖昧な場合(例: ユーザーが暗に了承したのか明示的に了承したのか際どい)は、その項目に
   `不確実: はい` を付けて報告する(黙って除外しない。CLAUDE.mdルール3「わからないことは
   わからないとはっきり言う」に基づく)。

3. **出力は必ず以下の形式のみ**。前後に挨拶や説明文を付けない(拡張機能が
   `[ROOM-TASK-AUDIT-START]`と`[ROOM-TASK-AUDIT-END]`の間だけをパースするため、
   それ以外の文章は無視される。多少前置きがあっても害はないが、делимiterの中身の
   書式だけは厳密に守ること)。

   ```
   [ROOM-TASK-AUDIT-START]
   1. 種別: 相談 | 内容: <15〜60文字程度の日本語要約> | 引用: "<元の文章から一字一句そのまま抜き出した15〜40文字程度の、会話中で一意なフレーズ>" | 不確実: いいえ
   2. 種別: 未完了作業 | 内容: <要約> | 引用: "<引用>" | 不確実: はい
   [ROOM-TASK-AUDIT-END]
   ```

   - `種別`は`相談`(ユーザーの判断待ち)か`未完了作業`(着手した/依頼された未完了作業)のいずれか。
   - `引用`は**あなたが今作文した要約ではなく、実際に会話中に存在する一字一句そのままの
     文字列**にすること(改行や連続する空白を含めない、1行に収まる短いフレーズ)。
     拡張機能側がページ内テキストをこの引用で検索し、該当箇所へスクロールするために使う。
     一意に検索できるよう、ありふれた短い言い回し(「はい」「わかりました」等)は避け、
     具体的な固有名詞・数字を含む15〜40文字程度を選ぶこと。
   - 未解決の項目が1件も無い場合は次の1行だけを出す:
     ```
     [ROOM-TASK-AUDIT-START]
     (未解決の項目はありません)
     [ROOM-TASK-AUDIT-END]
     ```

4. これは通常の会話ターンとして送受信される(claude-voice-bridgeが音声モードと同じ
   送信・応答待ちの仕組みを流用しているため)。追加のAPI課金は発生しない
   (通常のClaude Codeの利用量として消費されるだけ)。
