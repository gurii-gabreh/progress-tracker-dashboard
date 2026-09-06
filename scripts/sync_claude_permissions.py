#!/usr/bin/env python3
"""Sync data/claude-permissions.json into every managed repository's
.claude/settings.json (permissions.allow), replacing the array wholesale.
Triggered by .github/workflows/sync-claude-permissions.yml whenever
data/claude-permissions.json changes. Mirrors scripts/sync_claude_md.py's
single-source-of-truth pattern: edit data/claude-permissions.json only,
never hand-edit a target repo's .claude/settings.json (it gets overwritten
on the next sync). Other top-level keys already present in a target repo's
settings.json (env, hooks, etc.) are preserved untouched.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

# repo full name -> {token_env, branch}. token_env holds the env var name for
# a token with contents:write on that repo; the workflow's own GITHUB_TOKEN
# only has write access to this repo itself, other repos need CROSS_REPO_PAT
# (same token used by scripts/sync_claude_md.py). branch defaults to "main"
# and only needs overriding for a repo whose default branch is something else
# (e.g. Text-Extraction, whose default is claude/app-creation-resources-eenb15
# -- discovered 2026-09-06 while rolling this out, see PTD-045).
# 2026-09-05/06: extended to all managed repositories (+Text-Extraction) at
# the user's request, to match sync_claude_md.py's TARGETS. Note: like
# sync_claude_md.py (which requires the CORE-RULES markers to already exist
# in a repo's CLAUDE.md), this script only UPDATES an existing
# .claude/settings.json -- it does not create one from scratch. A repo with
# no .claude/settings.json yet is skipped (logged, not a hard failure) until
# someone (asking Claude directly, same as the original CLAUDE.md rollout in
# PTD-039) adds a minimal starter file there.
TARGETS = {
    "gurii-gabreh/progress-tracker-dashboard": {"token_env": "GITHUB_TOKEN"},
    "gurii-gabreh/kizashi": {"token_env": "CROSS_REPO_PAT"},
    "gurii-gabreh/supermarket-price-tracker": {"token_env": "CROSS_REPO_PAT"},
    "gurii-gabreh/gemini-monitor": {"token_env": "CROSS_REPO_PAT"},
    "gurii-gabreh/ai-research-radar": {"token_env": "CROSS_REPO_PAT"},
    "gurii-gabreh/Knowledge-Dashboard": {"token_env": "CROSS_REPO_PAT", "branch": "claude/spreadsheet-list-dashboard-te7yvs"},
    "gurii-gabreh/study-app": {"token_env": "CROSS_REPO_PAT"},
    "gurii-gabreh/servicenow-sub-agent": {"token_env": "CROSS_REPO_PAT"},
    "gurii-gabreh/Text-Extraction": {"token_env": "CROSS_REPO_PAT", "branch": "claude/app-creation-resources-eenb15"},
}


def api(method, url, token, body=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, data=data) as res:
        return json.loads(res.read())


def flatten_entries(source):
    entries = []
    for cat in source["categories"]:
        entries.extend(cat["entries"])
    return entries


def sync_one(repo, token_env, branch, allow_list):
    token = os.environ.get(token_env)
    if not token:
        print(f"skip {repo}: {token_env} not set", file=sys.stderr)
        return False

    url = f"https://api.github.com/repos/{repo}/contents/.claude/settings.json"
    try:
        current = api("GET", url + f"?ref={branch}", token)
    except urllib.error.HTTPError as e:
        print(f"skip {repo}: GET failed ({e.code}) {e.read().decode()}", file=sys.stderr)
        return False

    content = base64.b64decode(current["content"]).decode("utf-8")
    try:
        settings = json.loads(content)
    except json.JSONDecodeError as e:
        print(f"skip {repo}: existing .claude/settings.json is not valid JSON ({e})", file=sys.stderr)
        return False

    settings.setdefault("permissions", {})["allow"] = allow_list
    new_content = json.dumps(settings, ensure_ascii=False, indent=2) + "\n"
    if new_content == content:
        print(f"{repo}: already up to date")
        return True

    body = {
        "message": "chore: sync .claude/settings.json permissions from data/claude-permissions.json [automated]",
        "content": base64.b64encode(new_content.encode("utf-8")).decode("ascii"),
        "sha": current["sha"],
        "branch": branch,
    }
    try:
        api("PUT", url, token, body)
    except urllib.error.HTTPError as e:
        print(f"FAILED {repo}: PUT failed ({e.code}) {e.read().decode()}", file=sys.stderr)
        return False
    print(f"{repo}: updated")
    return True


def main():
    with open("data/claude-permissions.json", encoding="utf-8") as f:
        source = json.load(f)
    allow_list = flatten_entries(source)

    ok = True
    for repo, cfg in TARGETS.items():
        if not sync_one(repo, cfg["token_env"], cfg.get("branch", "main"), allow_list):
            ok = False

    if not ok:
        print("one or more repos failed or were skipped; see log above", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
