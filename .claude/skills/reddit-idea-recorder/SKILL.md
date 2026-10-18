---
name: reddit-idea-recorder
description: Record app-idea/case-study content the user manually pastes from Reddit (or similar sites) into data/app-idea-research.json, as title+summary+URL entries sorted into existing categories, with URL-based dedup against everything already recorded. Use this whenever the user pastes raw Reddit thread text (e.g. r/ClaudeAI "Show us what you've created with Claude" threads) and asks to record/summarize it.
---

# Reddit事例集(app-idea-research.json)への記録

## これは何か・なぜ手動貼り付けなのか

🔍調査資料タブの📱Reddit事例集(`data/app-idea-research.json`)は、r/ClaudeAIなどの「Claudeで作った作品を見せて」系スレッドから、今後のアプリ開発のアイデア・着眼点を集める目的のナレッジベース。

**Redditは自動取得しない。** 2026-10-18、ユーザーとの相談で、Claude.ai/Codex/ブラウザ自動操作/ServiceNowパイプラインなど、どの手段を使ってもReddit側のToS(automated queries禁止)に抵触する可能性があるという結論(CL-034の「ツールを問わず自動アクセスは避ける」原則と同じ)に達し、**ユーザーが自分でブラウザを開いて閲覧し、その内容をここに直接貼り付ける**運用に統一した。このスキルは、貼り付けられた生テキストを記録フォーマットへ変換する側だけを担当する。

## 手順

1. **ユーザーが貼り付けたテキストから、個別の事例(1人のコメント=1事例が基本)を抽出する。** 以下は除外する。
   - 広告(`•広告`表示のあるスポンサー投稿、CodeRabbitAI/NTE/ITHappyStudiosのような無関係な宣伝)
   - URLが無く中身も具体性がない投稿(例:「すごいウェブサイトを作った」だけで何も分からないもの)
   - センシティブなデータを含むため共有不可と書かれている投稿(URLが提示されていない)

2. **各事例を `title`(名称)・`description`(1〜2文の日本語要約、原文の誇張や広告的文言は削ぎ落として機能面を要約)・`url`(本人が示したリンク)に変換する。**

3. **既存5カテゴリのいずれかに分類する**(新カテゴリを増やす前に必ずこの5つに当てはまるか検討すること、増やす場合はユーザーに確認):
   - ① アプリ(日常の困りごと解決)
   - ② 開発者向けメタツール
   - ③ ゲーム・エンタメ
   - ④ 奇妙で素晴らしいもの(ニッチな個人用ツール)
   - ⑤ 市民ハッキング(Civic Hacking)

4. **URL重複チェックを必ず行う。** `data/app-idea-research.json`の全カテゴリの既存`items[].url`を集めた`set()`を作り、新規項目の`url`がそこに含まれていれば**スキップする**(スレッドが違っても同じ作品が何度も紹介されることがあるため)。1件でもスキップした場合は、何件スキップ・何件追加したかを必ずユーザーへ報告する(CLAUDE.mdルール22の精神に基づき、ログだけ出して終わらせず要点を伝える)。

5. **`sources`配列に、このスレッド自体のエントリを1件追記する**(`title`に投稿タイトル・経過期間・コメント数程度の説明、`url`にスレッドURL。URLが分からない貼り付けの場合は`url`を省略し、`title`にその旨を明記)。

6. **実装は必ずPythonスクリプトをBash経由で実行する**(CLAUDE.mdルール22、データ量が多いため)。直接Edit/Writeで全文を書き換えない。スクリプトは`existing_urls`との照合→追加→`sources`追記→`updatedAt`更新→保存、の順で書く(過去バッチと同じパターン、`/tmp/.../scratchpad/append_idea_research_batch*.py`に実例が残っている)。

7. **コミットメッセージに、処理したスレッドURL・追加件数・重複除外件数を明記する**(CLAUDE.mdルール24、リポジトリ自身に経緯を残す)。

8. **progress-tracker-dashboardのdesignated branch運用に従う**(ルール25): 作業ブランチにコミット→push→main側でpull→`merge --no-ff`→push→作業ブランチに戻る、までが1回の記録作業の完了条件。マージを都度求める必要はない(ユーザーが既にこの運用を承認済み)。

## 既知の制約・注意点

- 貼り付けテキストにはReddit UIのナビゲーション文言・広告・関連投稿一覧なども混在する。これらは記録対象ではない。
- 同じスレッドが「URL不明」で過去に記録された後、同じスレッドの正しいURLが後から判明することがある(2026-10-18、1uxlehkスレッドで実際に発生)。この場合、内容の大部分が重複としてスキップされるのは想定どおりの正常動作であり、バグではない。
- このスキルは「貼り付けられた内容を記録する」までが担当範囲。Redditへのアクセス・検索・ブラウジング自体をAI側で行うことは含まない(むしろ明確に禁止)。
