---
name: governance-config-sync
description: Add or change an operating rule for how manager-room/worker-room sessions behave (e.g. a new numbered rule in claude-core-rules.md, a change to consultation/confirmation style, an AI routing/orchestration policy). Use this whenever the user gives a new standing instruction about how Claude should behave across sessions/repos going forward, not a one-off task. Keeps claude-core-rules.md, the auto-synced CLAUDE.md copies, dashboard.html's "AI基本設定" tab, and this skill registry all consistent instead of updating just one of them.
---

# Updating governance rules (core rules + AI基本設定 tab + skill registry)

## Why this exists

New standing behavioral rules (e.g. "常にこの根拠を示せ", "次工程が見えているなら必ず確認しろ") have repeatedly been added in just one place and then found missing elsewhere — e.g. rule 20's 出典明記 addendum was added to `data/claude-core-rules.md` but never mirrored into `data/ai-config.json`'s `consultationFormat` section, so the dashboard's "🤖 AI基本設定" tab quietly fell out of sync with the actual rule text (caught and fixed 2026-09-06). This skill exists so a rule change always touches every place it needs to.

There are two parallel representations of the same operating rules, and both must move together:
- **`data/claude-core-rules.md`** — the numbered-rule source of truth (Japanese, terse, instruction-style). This is what CLAUDE.md files actually enforce.
- **`data/ai-config.json`** (`web.*` + `ai.*` sections) — the human/dashboard-facing explanation of the same rules, rendered as cards in dashboard.html's "🤖 AI基本設定" tab. `web.<key>` is the short bullet summary shown to the user; `ai.<key>` is the fuller version an AI session would read.

## Steps

1. **Decide: new numbered rule, or an extension of an existing one?** Check `data/claude-core-rules.md`'s numbered list (rules under "全チャットルーム共通の運用指示") for a rule that's already about the same topic — extend it (append a sentence with a `(YYYY-MM-DD追加、ユーザー指摘)` tag) rather than creating overlapping rules. Only add a new number when the trigger condition is genuinely different (e.g. rule 20 = *how* to frame a 相談; rule 21 = *when* a confirmation is required at all — related but distinct enough to be separate).

2. **Edit `data/claude-core-rules.md` only** — never hand-edit the individual repos' `CLAUDE.md` copies directly; they get overwritten by the sync workflow anyway (this file's own header says so). Commit to `main`.

3. **Push to `main`.** `.github/workflows/sync-claude-md.yml` triggers automatically on any push to `main` that touches `data/claude-core-rules.md`, and propagates the block to every managed repo's `CLAUDE.md` via `scripts/sync_claude_md.py`. No manual per-repo edits needed; a `workflow_dispatch` re-run is available if a push-triggered run needs retriggering.

4. **Mirror the same rule into `data/ai-config.json`.** Find (or create) the matching `web.<key>` / `ai.<key>` pair — check both, they're edited independently, it's easy to update one and forget the other. Add a new bullet/field rather than rewriting the whole section, and keep the same `(YYYY-MM-DD追加、ユーザー指摘)` provenance tag so a reader can trace it back to `claude-core-rules.md`.

5. **Check whether dashboard.html needs a change too.** The "🤖 AI基本設定" tab only renders `web.*` keys listed in the hardcoded `AI_CONFIG_SECTIONS` array in dashboard.html — a brand-new `web.<key>` (not just new bullets on an existing one) must be added to that array or it silently won't render. Extending an existing section's `points`/fields needs no dashboard.html change.

6. **If this rule change was itself the creation of a new skill**, add an entry to `ai-config.json`'s `ai.customSkills.registry` array (and a matching bullet in `web.customSkills.points`) per that section's own `note` field — this skill (`governance-config-sync`) itself should be registered there too.

7. **Commit and push** `data/claude-core-rules.md` + `data/ai-config.json` (+ `dashboard.html` if touched) together in one commit so the two representations never land out of sync with each other.

## Note

This skill is about *changing how sessions behave going forward* (rules, policy, routing). It is not for reflecting user-facing app *content* changes (that's the `sheet-memo-sync`-style skills, per-app) — those still require asking the user before pushing, per claude-core-rules.md rule 21, since they change a live app rather than internal governance.
