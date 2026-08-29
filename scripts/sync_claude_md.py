#!/usr/bin/env python3
"""Sync data/claude-core-rules.md into every managed repository's CLAUDE.md,
replacing only the text between the CORE-RULES markers. Triggered by
.github/workflows/sync-claude-md.yml whenever data/claude-core-rules.md changes.
Each repo needs a CLAUDE.md that already contains the START/END markers once
(see README "CLAUDE.md" section) -- this script never creates the markers, only
replaces what's between them.
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request

START = (
    "<!-- CORE-RULES:START (auto-synced from "
    "progress-tracker-dashboard/data/claude-core-rules.md -- "
    "do not edit by hand, edit the source instead) -->"
)
END = "<!-- CORE-RULES:END -->"

# repo full name -> env var holding a token with contents:write on that repo.
# The workflow's own GITHUB_TOKEN only has write access to this repo itself;
# the other repos need CROSS_REPO_PAT (a fine-grained PAT set up by the user).
TARGETS = {
    "gurii-gabreh/progress-tracker-dashboard": "GITHUB_TOKEN",
    "gurii-gabreh/kizashi": "CROSS_REPO_PAT",
    "gurii-gabreh/supermarket-price-tracker": "CROSS_REPO_PAT",
    "gurii-gabreh/gemini-monitor": "CROSS_REPO_PAT",
    "gurii-gabreh/ai-research-radar": "CROSS_REPO_PAT",
    "gurii-gabreh/Knowledge-Dashboard": "CROSS_REPO_PAT",
    "gurii-gabreh/study-app": "CROSS_REPO_PAT",
    "gurii-gabreh/servicenow-sub-agent": "CROSS_REPO_PAT",
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


def sync_one(repo, token_env, core):
    token = os.environ.get(token_env)
    if not token:
        print(f"skip {repo}: {token_env} not set", file=sys.stderr)
        return False

    url = f"https://api.github.com/repos/{repo}/contents/CLAUDE.md"
    try:
        current = api("GET", url + "?ref=main", token)
    except urllib.error.HTTPError as e:
        print(f"skip {repo}: GET failed ({e.code}) {e.read().decode()}", file=sys.stderr)
        return False

    content = base64.b64decode(current["content"]).decode("utf-8")
    if START not in content or END not in content:
        print(f"skip {repo}: CORE-RULES markers not found in CLAUDE.md", file=sys.stderr)
        return False

    before = content.split(START)[0]
    after = content.split(END, 1)[1]
    new_content = f"{before}{START}\n{core}\n{END}{after}"
    if new_content == content:
        print(f"{repo}: already up to date")
        return True

    body = {
        "message": "chore: sync CLAUDE.md core rules from progress-tracker-dashboard [automated]",
        "content": base64.b64encode(new_content.encode("utf-8")).decode("ascii"),
        "sha": current["sha"],
        "branch": "main",
    }
    try:
        api("PUT", url, token, body)
    except urllib.error.HTTPError as e:
        print(f"FAILED {repo}: PUT failed ({e.code}) {e.read().decode()}", file=sys.stderr)
        return False
    print(f"{repo}: updated")
    return True


def main():
    with open("data/claude-core-rules.md", encoding="utf-8") as f:
        core = f.read().strip("\n")

    ok = True
    for repo, token_env in TARGETS.items():
        if not sync_one(repo, token_env, core):
            ok = False

    if not ok:
        print("one or more repos failed or were skipped; see log above", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
