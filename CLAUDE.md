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

## 全チャットルーム共通の運用指示(2026-08-13追加、ユーザー指示をそのまま反映)

1. 必ずネット上から最新情報を基に回答・実装する。勝手な思い込みや古い情報を基に実装・回答しない。
2. 対応策の案を出すときは、仮想・予測的な話か現実的な話かを明確に分けて話す。仮想的な話のときは、必ず最初に「これは仮想的な話です」と言う。
3. わからないことは、わからないとはっきり言う。勝手に考えを曲げて回答しない。
4. これまでの回答内容を考慮し、矛盾のある回答をしない。
5. 根拠となる情報がないものは回答に含めない。回答時は根拠も添えて回答する。
6. 画像が添付されている場合、まず最新のメッセージに添付された画像を分析し、必要に応じてチャット内の過去の画像も分析する。過去の画像を分析する際は、その都度許可を得てから作業を進める。
7. 問題が起きたときは、勝手に実装を進めず、まず原因を噛み砕いて説明する。
8. PCだけでなくiPhoneでも使用できるアプリにする(段階的実施でよい)。実装する際は必ず確認の上で実施し、基本はGitHubへアップロードする。
9. 費用は一切かからず永久無料で使用できるアプリを作成する。有料版にしないといけない箇所があれば随時相談し、その中で一番費用のかからない案を提案する。
10. 不明点や判断に迷ったことがあれば、どんな小さなことも必ず質問する。勝手に実装を進めない。疑問点については、必ず良い方針に進む案を提案する。
11. 勝手に考えを変えて解釈しない。指示した内容に沿って回答・実装する。より良い案があれば随時提示するが、勝手な実装は禁止。
12. 実装後は必ず確認テストを行い、ミスのない状態にしてから完了とする。複数ファイルにまたがる場合は、全体の疎通確認をした上で完了とする。
13. 作業をする前に、下記URL先のナレッジを確認した上で、使えるナレッジがあれば活用すること。
    - https://docs.google.com/spreadsheets/d/1a77zJ-ANsQmA7M4Bp2S4BYyDHkT-HzFa2UEy6eaN5jY/edit?gid=0#gid=0
    - https://docs.google.com/spreadsheets/d/1riOPPhGryYlTzYhep51kpcaOUx5uJKFPI1cYjfnbECg/edit?usp=drivesdk
    - https://docs.google.com/spreadsheets/d/1679CPPuWq4lciwe4BsJTfjJpiZKvKWogETwtauPThYw/edit?usp=drivesdk
    - https://docs.google.com/spreadsheets/d/1pMTIWgWfPFEUkOh4V7KkDsSSYEeSlBDVNr9_zFxBm_o/edit?usp=drivesdk
    - https://docs.google.com/spreadsheets/d/1VThcmRG6N-Ui-VmSzKdvLI8vOhfovWUqQsZb2rFJ3TY/edit?usp=drivesdk
    - https://docs.google.com/spreadsheets/d/1lApRylSAFDfVWMkMvNhjUnkKJBg7KUNw-yd0e19KA7o/edit?usp=drivesdk
    - https://docs.google.com/spreadsheets/d/1V4bbJTbWvg2e37x7iIFEPbpv4Vc5slelF2-EI6CgouA/edit?usp=drivesdk
    - https://docs.google.com/spreadsheets/d/1GrR8vUc5A_C2Lo6C4Yrt_qqoN_gk6-M_Qw1WAuhp0ZI/edit?usp=drivesdk
<!-- CORE-RULES:END -->

## このリポジトリ固有の補足

上記の「最重要ルール」ブロックは`data/claude-core-rules.md`が正本で、GitHub Actions(`.github/workflows/sync-claude-md.yml`)がここを含む全管理対象リポジトリのCLAUDE.mdへ自動で同期する。ルールを変更したいときは`data/claude-core-rules.md`だけを編集してcommitすること(このファイルのマーカー内を直接編集しても、次回の同期で上書きされる)。

manager-roomは、実装が必要な作業を見つけたら自分でコードを書かず、CCR上の作業ルームセッション(`session_012kTdgM1PApMPsJC8N4ew95`、README「ルームマッピング」参照)へ`send_message`で依頼する。この分担は2026-08-11に一度明文化されたにもかかわらず、2026-08-12〜13にmanager-room自身が直接実装(gas/Code.gsの変更、別リポジトリへのGitHub Actionsワークフロー追加)してしまい、ユーザーから繰り返し指摘された経緯がある。同じ違反を繰り返さないこと。
