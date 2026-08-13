# progress-tracker-dashboard

複数リポジトリ(kizashi・supermarket-price-tracker・gemini-monitor・ai-research-radar・usage-tracker・Knowledge-Dashboard・study-app等)の実装状況・進捗を一覧化する自立型トラッカーアプリ。このファイルはセッション開始時に自動で読み込まれるため、ここに書いた内容は必ず目に入る。

<!-- CORE-RULES:START (auto-synced from progress-tracker-dashboard/data/claude-core-rules.md -- do not edit by hand, edit the source instead) -->
## 最重要ルール(このファイルに直接記載。fetch不要で必ず読める)

- このリポジトリは `gurii-gabreh/progress-tracker-dashboard` が進捗・実装ナレッジを一元管理する対象の1つ
- **manager-room(状況把握・優先度判断・振り分けのみ)とworker-room(実装担当)の役割分担がある。このセッションで実装作業をしているなら、それはworker-room役**
- 実装したタスクの`detail`(実装ナレッジ)・`note`・`checkHistory`を、progress-tracker-dashboardの`data/tasks.json`側で空欄のまま完了させない
- 意味のある実装判断(設計パターン・DB設計・セキュリティ対応・AI/LLM関連・テスト方針など)があれば、progress-tracker-dashboardの`data/concept-log.json`にも記録する(2026-08-13、自動同期の書き込み権限確認のための軽微な更新)

## より詳しいルール(下記URLを実際にWebFetch等で取得すること。リンクを貼るだけでは中身は読み込まれない)

- https://raw.githubusercontent.com/gurii-gabreh/progress-tracker-dashboard/main/README.md
- https://raw.githubusercontent.com/gurii-gabreh/progress-tracker-dashboard/main/data/policy.json
- https://raw.githubusercontent.com/gurii-gabreh/progress-tracker-dashboard/main/data/ai-config.json
<!-- CORE-RULES:END -->

## このリポジトリ固有の補足

上記の「最重要ルール」ブロックは`data/claude-core-rules.md`が正本で、GitHub Actions(`.github/workflows/sync-claude-md.yml`)がここを含む全管理対象リポジトリのCLAUDE.mdへ自動で同期する。ルールを変更したいときは`data/claude-core-rules.md`だけを編集してcommitすること(このファイルのマーカー内を直接編集しても、次回の同期で上書きされる)。

manager-roomは、実装が必要な作業を見つけたら自分でコードを書かず、CCR上の作業ルームセッション(`session_012kTdgM1PApMPsJC8N4ew95`、README「ルームマッピング」参照)へ`send_message`で依頼する。この分担は2026-08-11に一度明文化されたにもかかわらず、2026-08-12〜13にmanager-room自身が直接実装(gas/Code.gsの変更、別リポジトリへのGitHub Actionsワークフロー追加)してしまい、ユーザーから繰り返し指摘された経緯がある。同じ違反を繰り返さないこと。
