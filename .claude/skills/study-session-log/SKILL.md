---
name: study-session-log
description: Record a self-study session the user reports (they studied topic X on date Y and pasted their own summary/notes) into progress-tracker-dashboard's permanent learning records. Use this whenever the user says they studied something and asks to "record it as usual" (いつものように記録して) or similar, especially for AIE-012〜020 (design patterns/SOLID/architecture/infra/security/AI-LLM/DB/testing) topics. Not for implementation-decision concept logging that happens automatically during coding work (that's data/policy.json POL-004) — this is specifically for the user's own study summaries.
---

# Recording a self-study session

## What this is for

The user periodically studies a topic on their own (outside of implementation
work) and pastes a summary of what they learned, asking for it to be recorded.
This must go into two places, not just chat — a summary that only exists in
the conversation is lost once the session ends.

## Steps

1. **Identify the matching AIE task** in `data/tasks.json` — the 6-field
   overview (architecture/server/security/ai-llm/db/testing) maps to
   AIE-012 through AIE-020. Match by topic keyword in the `task` field (e.g.
   "データベースの基礎を学ぶ" = AIE-019, "テストの基礎を身につける" = AIE-020).
   If genuinely unclear which task it maps to, ask — don't guess.

2. **Verify the content, don't just transcribe it.** Per CLAUDE.md rule 5,
   check the user's summary against your own knowledge and flag anything
   incorrect, incomplete, or outdated (e.g. superseded standards). Most of
   the time their understanding is fundamentally correct — say so plainly —
   but add corrections/nuance where warranted, and cite what the correction
   is based on. Don't rewrite their summary from scratch; review it.

3. **Append to `data/concept-log.json`** under the matching category
   (`categories[].key` — e.g. `db`, `testing`, `security`) as a new entry in
   that category's `items` array:
   ```json
   {
     "id": "CL-<next sequential number, 3-digit zero-padded>",
     "concept": "<short label for what was learned>",
     "context": "<date>、ユーザーがAIE-0XX(<task name>)に該当する学習として、<topic>の要点を自分の言葉でまとめた。",
     "note": "<review of their summary: what's accurate, any corrections/additions, organized by sub-topic>",
     "date": "<date>"
   }
   ```
   Find the next `CL-XXX` number by scanning all categories for the current
   max, not just the target category (IDs are global, not per-category).
   Also bump the top-level `updatedAt` field.

4. **Update the matching AIE task in `data/tasks.json`**:
   - Add an entry to its `checkHistory` array (create the array if it doesn't
     exist yet): `{"date": "<date>", "summary": "<one-line summary, mention
     the CL-XXX id it was recorded under>"}`.
   - Update `status` — typically `未着手` → `進行中` for a first study session
     on that topic (don't mark `完了` unless the user says the topic is done;
     these AIE tasks are usually open-ended, low-priority ongoing learning,
     not one-shot tasks).
   - Update `updated` to the session date.
   - Per CLAUDE.md's core rule, never leave `note`/`detail`/`checkHistory`
     blank after this — that's exactly the pattern that rule exists to
     prevent.

5. **Use a Python script via Bash for the actual JSON edits** (per CLAUDE.md
   rule 22) rather than Edit/Write directly — this is a multi-field, two-file
   update, not a one-line change.

6. **Commit and push both files together** with a message naming the topic
   and date. Report back to the user what was recorded and any corrections
   you made to their summary — don't just say "recorded."
