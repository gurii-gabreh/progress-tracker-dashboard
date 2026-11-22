# data/inbox — Claude以外のAIが書いてよい唯一の場所

- 作成: 2026-11-22(ユーザー承認「この形で反映(推奨)」。経緯: ChatGPTと音声で要件定義の聞き取りをし、その結果をClaude Code(マネージャールーム)へ渡して実装するため)
- ルールの正本: `data/claude-core-rules.md` のルール34

## 使い方

1. ChatGPT/Codexは、聞き取りの結果を `data/inbox/YYYY-MM-DD-<アプリ名の英字>.json` として保存する(形式は `_template.json`)。
2. **このフォルダ以外のファイルは書き換えない**(`tasks.json`・`requirements.json`などの正本はClaudeだけが更新する)。
3. 保存したら、聞き取りの最後に「Claude Codeのマネージャールームへの実装引き継ぎプロンプト」を出力する(ルール34)。
4. Claude Codeは、引き継ぎプロンプトを貼られたとき、または毎晩0:05の定期処理で、`status` が「取り込み待ち」のファイルを読み、内容を確認して `requirements.json`・`tasks.json` に登録し、`status` を「取り込み済み」に変える。足りない点はユーザーに質問する。**実装はユーザーの確認後に始める。**

## status の値

| 値 | 意味 |
|---|---|
| 取り込み待ち | 保存直後。Claudeがまだ読んでいない |
| 確認中 | Claudeが読み、ユーザーに質問している |
| 取り込み済み | requirements.json・tasks.json に登録済み(`importedTo` に登録先を書く) |
