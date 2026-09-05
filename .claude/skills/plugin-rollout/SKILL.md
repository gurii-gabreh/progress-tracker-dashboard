---
name: plugin-rollout
description: Roll out a Claude Code plugin (enabledPlugins entry, e.g. superpowers@claude-plugins-official or frontend-design@claude-plugins-official) to every repository this dashboard manages, by writing/merging .claude/settings.json in each repo and committing+pushing, so cloud/web Claude Code sessions on those repos pick the plugin up automatically at session start. Use this whenever the user says to "apply a skill/plugin everywhere," "add X to all repos' settings," or asks why a plugin they installed locally isn't available in a web session and wants it fixed at the project-settings level rather than per-machine.
---

# Rolling a plugin out to every managed repo

## Why this exists

A plugin installed at "user scope" via the local Claude Code CLI (`/plugin install X@marketplace`) writes to `~/.claude/settings.json` **on that one machine**. It does not carry over into "Claude Code on the web" / cloud sessions, which run in fresh, unrelated ephemeral containers — verified directly in this environment (no `~/.claude/plugins/` or `~/.claude/settings.json` exists here even after a local-machine user-scope install). The one thing that *does* travel with a cloud session is whatever's committed into the repo it clones. So to make a plugin available in cloud sessions, put it in that repo's own `.claude/settings.json` under `enabledPlugins`, and commit it.

## The repo list

This dashboard's known repos (from CLAUDE.md's project list, plus any repos actively being worked on in the current conversation):

kizashi, supermarket-price-tracker, gemini-monitor, ai-research-radar, usage-tracker, Knowledge-Dashboard, study-app, progress-tracker-dashboard, Task-WBS, servicenow-sub-agent, Text-Extraction

Before running this on "all repos," re-derive this list from CLAUDE.md rather than trusting this snapshot blindly — repos get added/retired. If a name 404s on GitHub, don't guess a fix — report it and skip it (this has happened before: `usage-tracker` did not resolve under this owner). Some repo names on GitHub differ in case from how they're referenced casually (e.g. `Text-Extraction` vs `text-extraction`, `Task-WBS` vs `task-wbs`, `Knowledge-Dashboard` vs `knowledge-dashboard`) — GitHub redirects on push so either case works, but note the canonical name in your report.

## Steps

1. **Attach every repo with push access.** `add_repo` first without `access` (or check if it's already cloned locally under `/home/user/<repo>`); if it comes back read-only ("read_available"), call `add_repo` again with `access: "push"` before you can commit.

2. **Clone any not already present** at `/home/user/<repo>` — one clone at a time, not in parallel (the git proxy caps concurrent ops per repo), generous timeout (large repos can take minutes through the proxy).

3. **Check each repo's actual current branch** (`git branch --show-current`) before pushing — don't assume `main`. Some repos in this project have had their GitHub default branch left pointed at a feature/claude-generated branch, or (in at least one case) a branch literally named `deprecate-<repo>`, which is worth flagging back to the user rather than silently treating as normal — it may mean the project is being sunset and this work is wasted on it.

4. **Merge, don't overwrite, each repo's `.claude/settings.json`.** Some repos already have one (e.g. a `permissions.allow` list from `fewer-permission-prompts`) — read it first, add/update the `enabledPlugins` key, write the merged object back. A small Python snippet doing this uniformly across every repo path in one pass is more reliable than editing each file by hand:

```python
import json, os
plugins_to_add = {"superpowers@claude-plugins-official": True}  # extend as needed
for repo in repo_list:
    path = f"/home/user/{repo}/.claude/settings.json"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = json.load(open(path)) if os.path.exists(path) else {}
    data.setdefault("enabledPlugins", {}).update(plugins_to_add)
    json.dump(data, open(path, "w"), indent=2, ensure_ascii=False)
```

5. **Commit and push each repo individually** — one commit per repo, same message is fine, e.g. "◯◯プラグインをenabledPluginsに追加". `git fetch origin <branch>` then push; if rejected as non-fast-forward, `git rebase origin/<branch>` and push again rather than force-pushing. Push to whatever branch that repo is actually on (step 3), using `git push -u origin HEAD` when it's not `main`.

6. **Report back**: which repos succeeded, which were skipped and why (not found, unusual default branch worth a second look, etc.), and remind the user that *already-running* sessions (this one included) won't pick up the new setting — only a fresh session start on that repo will. CLAUDE.md content is re-readable mid-session; a plugin's actual skills/hooks/MCP servers are not — they load once, at session start.

7. **Update `data/ai-config.json`** if this rollout adds a new plugin the "🛠 Skills / Superpower" section in the AI基本設定 tab doesn't yet mention, and check `data/ai-config.json`'s `web.customSkills` (or wherever the current-skills list lives — see the dashboard's own AI基本設定 tab for the live location) so the plugin/skill inventory shown there stays accurate.
