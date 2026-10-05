#!/bin/bash
# 2026-10-05追加(ユーザー相談: SECI化・結合の見落とし防止)。
# Edit/Writeツール使用直前(PreToolUse)に発火し、concept-log.jsonの確認・
# 活かした/活かさなかった理由の明記を機械的にリマインドする。
cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"[SECI結合リマインダー] 実装・編集の前に、data/concept-log.jsonの関連エントリを確認してください。関連する過去のナレッジを活かした場合はなぜ活かしたか、活かさなかった場合はなぜ活かさなかったかを、回答に明記してください。(claude-core-rules.mdルール23関連、2026-10-05追加)"}}
EOF
