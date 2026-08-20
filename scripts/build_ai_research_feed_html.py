#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
data/ai-research-feed.json から、Artifactとして公開するHTML一覧ページを生成する。

使い方:
    python3 scripts/build_ai_research_feed_html.py [出力パス]
    (出力パス省略時は ./signal-log.html)

生成したファイルは Artifact ツールで同じURL(既存があれば url パラメータ指定)へ
publishする。日次Routineがdata/ai-research-feed.jsonへ追記した後、毎回このHTMLを
再生成して再公開する運用を想定している。
"""
import json
import sys
import os
from collections import OrderedDict
from html import escape

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "..", "data", "ai-research-feed.json")


def group_by_date(entries):
    by_date = OrderedDict()
    for e in sorted(entries, key=lambda x: x.get("date", ""), reverse=True):
        by_date.setdefault(e.get("date", "?"), []).append(e)
    return by_date


def domain_of(url):
    try:
        from urllib.parse import urlparse
        d = urlparse(url).netloc
        return d.replace("www.", "")
    except Exception:
        return url


PAGE_TEMPLATE = """<title>Signal Log</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {{
    --bg: #f4f6f8;
    --surface: #ffffff;
    --surface-2: #eef1f4;
    --ink: #12151c;
    --ink-muted: #5b6270;
    --ink-faint: #8991a0;
    --accent: #0e7c8c;
    --accent-ink: #ffffff;
    --line: #dde2e8;
    --shadow: 0 1px 2px rgba(18,21,28,0.04), 0 4px 12px rgba(18,21,28,0.04);
    --cat-0-bg: #fbeed9; --cat-0-fg: #8a5a12;
    --cat-1-bg: #fbe3de; --cat-1-fg: #a1432c;
    --cat-2-bg: #e7e3f7; --cat-2-fg: #5a4dab;
    --cat-3-bg: #e1eee0; --cat-3-fg: #3e6b3d;
    --cat-4-bg: #dfe8f5; --cat-4-fg: #2f5588;
    --cat-5-bg: #f6e1ea; --cat-5-fg: #97365f;
  }}
  @media (prefers-color-scheme: dark) {{
    :root:not([data-theme="light"]) {{
      --bg: #0b0d12;
      --surface: #12161d;
      --surface-2: #171c25;
      --ink: #e7eaf0;
      --ink-muted: #9098a8;
      --ink-faint: #6b7180;
      --accent: #4bd6dc;
      --accent-ink: #04262a;
      --line: #232833;
      --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.25);
      --cat-0-bg: #3a2c10; --cat-0-fg: #e6b866;
      --cat-1-bg: #3a2019; --cat-1-fg: #e69683;
      --cat-2-bg: #241f3d; --cat-2-fg: #b3a6ec;
      --cat-3-bg: #1c2c1c; --cat-3-fg: #92c98f;
      --cat-4-bg: #1a2740; --cat-4-fg: #93b6e6;
      --cat-5-bg: #341827; --cat-5-fg: #e08bb0;
    }}
  }}
  :root[data-theme="dark"] {{
    --bg: #0b0d12;
    --surface: #12161d;
    --surface-2: #171c25;
    --ink: #e7eaf0;
    --ink-muted: #9098a8;
    --ink-faint: #6b7180;
    --accent: #4bd6dc;
    --accent-ink: #04262a;
    --line: #232833;
    --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.25);
    --cat-0-bg: #3a2c10; --cat-0-fg: #e6b866;
    --cat-1-bg: #3a2019; --cat-1-fg: #e69683;
    --cat-2-bg: #241f3d; --cat-2-fg: #b3a6ec;
    --cat-3-bg: #1c2c1c; --cat-3-fg: #92c98f;
    --cat-4-bg: #1a2740; --cat-4-fg: #93b6e6;
    --cat-5-bg: #341827; --cat-5-fg: #e08bb0;
  }}

  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: "Public Sans", -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif;
    -webkit-font-smoothing: antialiased;
  }}
  .wrap {{
    max-width: 760px;
    margin: 0 auto;
    padding: 48px 20px 96px;
  }}
  header.top {{
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-bottom: 36px;
  }}
  .eyebrow {{
    font-family: "IBM Plex Mono", monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
  }}
  h1 {{
    font-family: "Fraunces", Georgia, serif;
    font-optical-sizing: auto;
    font-weight: 600;
    font-size: clamp(32px, 5vw, 44px);
    line-height: 1.05;
    margin: 0;
    text-wrap: balance;
  }}
  .sub {{
    font-size: 15px;
    color: var(--ink-muted);
    max-width: 60ch;
    line-height: 1.55;
    margin: 0;
  }}
  .stats {{
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 4px;
  }}
  .stat {{
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 10px 14px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 92px;
  }}
  .stat .n {{
    font-family: "IBM Plex Mono", monospace;
    font-variant-numeric: tabular-nums;
    font-size: 20px;
    font-weight: 500;
    color: var(--ink);
  }}
  .stat .l {{
    font-size: 11px;
    color: var(--ink-faint);
    letter-spacing: 0.03em;
  }}

  .filters {{
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 28px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--line);
  }}
  .chip {{
    font-family: "Public Sans", sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink-muted);
    cursor: pointer;
    transition: transform 0.12s ease, border-color 0.12s ease;
  }}
  .chip:hover {{ border-color: var(--accent); color: var(--ink); }}
  .chip.active {{
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
  }}
  .chip .count {{
    font-family: "IBM Plex Mono", monospace;
    opacity: 0.7;
    margin-left: 4px;
  }}

  .day-group {{ margin-bottom: 40px; }}
  .day-label {{
    font-family: "IBM Plex Mono", monospace;
    font-size: 13px;
    color: var(--ink-faint);
    letter-spacing: 0.02em;
    margin-bottom: 14px;
    display: flex;
    align-items: baseline;
    gap: 10px;
  }}
  .day-label::after {{
    content: "";
    flex: 1;
    border-bottom: 1px solid var(--line);
  }}

  .entries {{ display: flex; flex-direction: column; gap: 14px; }}
  .entry {{
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 18px 20px;
    box-shadow: var(--shadow);
  }}
  .entry .cat {{
    display: inline-block;
    font-family: "IBM Plex Mono", monospace;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.02em;
    padding: 3px 9px;
    border-radius: 6px;
    margin-bottom: 10px;
  }}
  .entry h2 {{
    font-family: "Fraunces", Georgia, serif;
    font-weight: 600;
    font-size: 18px;
    line-height: 1.3;
    margin: 0 0 8px;
    text-wrap: balance;
  }}
  .entry p.summary {{
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--ink);
    margin: 0 0 12px;
  }}
  .entry .foot {{
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 12px;
    color: var(--ink-faint);
  }}
  .entry .foot a {{
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }}
  .entry .foot a:hover {{ border-bottom-color: var(--accent); }}
  .entry .foot .dot {{ opacity: 0.5; }}

  .empty {{
    text-align: center;
    color: var(--ink-faint);
    padding: 60px 0;
    font-size: 14px;
  }}

  footer.meta {{
    margin-top: 48px;
    padding-top: 20px;
    border-top: 1px solid var(--line);
    font-family: "IBM Plex Mono", monospace;
    font-size: 12px;
    color: var(--ink-faint);
  }}
</style>

<div class="wrap">
  <header class="top">
    <div class="eyebrow">Daily AI &amp; architecture research</div>
    <h1>Signal Log</h1>
    <p class="sub">アプリ設計に活かせる技術・アーキテクチャ、最新AI技術の動向、既存技術の組み合わせ、AIの活用分野、AIの流行を毎日調査した記録。</p>
    <div class="stats">
      <div class="stat"><span class="n">{total_count}</span><span class="l">total entries</span></div>
      <div class="stat"><span class="n">{day_count}</span><span class="l">days logged</span></div>
      <div class="stat"><span class="n">{cat_count}</span><span class="l">categories</span></div>
      <div class="stat"><span class="n">{latest_date}</span><span class="l">latest</span></div>
    </div>
  </header>

  <nav class="filters" id="filters">
    <button class="chip active" data-filter="__all__">すべて<span class="count">{total_count}</span></button>
{filter_chips}
  </nav>

  <main id="feed">
{feed_html}
  </main>

  <footer class="meta">Signal Log · progress-tracker-dashboard/data/ai-research-feed.json より生成 · 毎日JST9:00更新</footer>
</div>

<script>
(function () {{
  var chips = document.querySelectorAll('#filters .chip');
  var entries = document.querySelectorAll('.entry');
  var groups = document.querySelectorAll('.day-group');

  function applyFilter(cat) {{
    entries.forEach(function (el) {{
      var show = cat === '__all__' || el.getAttribute('data-cat') === cat;
      el.style.display = show ? '' : 'none';
    }});
    groups.forEach(function (g) {{
      var visible = g.querySelectorAll('.entry:not([style*="display: none"])').length;
      g.style.display = visible ? '' : 'none';
    }});
  }}

  chips.forEach(function (chip) {{
    chip.addEventListener('click', function () {{
      chips.forEach(function (c) {{ c.classList.remove('active'); }});
      chip.classList.add('active');
      applyFilter(chip.getAttribute('data-filter'));
    }});
  }});
}})();
</script>
"""

PALETTE_SIZE = 6


def cat_hash(name):
    h = 0
    for ch in name:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h % PALETTE_SIZE


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else "signal-log.html"
    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)
    entries = data.get("entries", [])

    cat_counts = OrderedDict()
    for e in entries:
        c = e.get("category", "未分類")
        cat_counts[c] = cat_counts.get(c, 0) + 1
    cat_list = sorted(cat_counts.keys(), key=lambda c: -cat_counts[c])

    filter_chips = "\n".join(
        '    <button class="chip" data-filter="{cat}">{cat}<span class="count">{n}</span></button>'.format(
            cat=escape(c), n=cat_counts[c]
        )
        for c in cat_list
    )

    by_date = group_by_date(entries)
    day_blocks = []
    for date, day_entries in by_date.items():
        item_html = []
        for e in day_entries:
            cat = e.get("category", "未分類")
            idx = cat_hash(cat)
            title = escape(e.get("title", ""))
            summary = escape(e.get("summary", ""))
            url = e.get("sourceUrl", "")
            dom = escape(domain_of(url))
            collected = escape(e.get("collectedAt", ""))
            used_ai = escape(e.get("usedAI", ""))
            item_html.append(f"""      <article class="entry" data-cat="{escape(cat)}">
        <span class="cat" style="background:var(--cat-{idx}-bg);color:var(--cat-{idx}-fg)">{escape(cat)}</span>
        <h2>{title}</h2>
        <p class="summary">{summary}</p>
        <div class="foot">
          <a href="{escape(url)}" target="_blank" rel="noopener">{dom}</a>
          <span class="dot">·</span>
          <span>{collected}</span>
          <span class="dot">·</span>
          <span>{used_ai}</span>
        </div>
      </article>""")
        day_blocks.append(f"""    <section class="day-group">
      <div class="day-label">{escape(date)}</div>
      <div class="entries">
{chr(10).join(item_html)}
      </div>
    </section>""")

    feed_html = "\n".join(day_blocks) if day_blocks else '    <div class="empty">まだ記録がありません</div>'
    latest_date = next(iter(by_date.keys()), "-")

    html = PAGE_TEMPLATE.format(
        total_count=len(entries),
        day_count=len(by_date),
        cat_count=len(cat_counts),
        latest_date=latest_date,
        filter_chips=filter_chips,
        feed_html=feed_html,
    )

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"saved {out_path} ({len(entries)} entries, {len(by_date)} days)")


if __name__ == "__main__":
    main()
