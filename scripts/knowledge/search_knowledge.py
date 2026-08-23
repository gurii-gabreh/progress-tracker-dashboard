#!/usr/bin/env python3
"""
data/vector-index.json(scripts/knowledge/build_vector_index.pyで生成)に対して、
自然文クエリで意味検索(コサイン類似度の総当たり)を行うCLI。

RAGの「検索」部分の最小実装。専用のベクトルDBは使わず、Pythonの標準ライブラリ
だけで完結させている(チャンク数が数百〜数千件程度の規模であれば、総当たり計算
でも実用上問題にならない想定。データ量が大きく増えた場合は見直しが必要)。

使い方:
  GEMINI_API_KEY=xxx python3 scripts/knowledge/search_knowledge.py "検索したい内容"
  GEMINI_API_KEY=xxx python3 scripts/knowledge/search_knowledge.py "検索したい内容" --top 5
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
INDEX_JSON = REPO_ROOT / "data" / "vector-index.json"

EMBED_MODEL = "gemini-embedding-001"
EMBED_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBED_MODEL}:embedContent"


def embed_query(text: str, api_key: str) -> list[float]:
    body = json.dumps({
        "model": f"models/{EMBED_MODEL}",
        "content": {"parts": [{"text": text}]},
        "taskType": "RETRIEVAL_QUERY",  # 検索クエリ側は文書側(RETRIEVAL_DOCUMENT)と別のtaskTypeを使う
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{EMBED_URL}?key={api_key}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as res:
        payload = json.loads(res.read().decode("utf-8"))
    return payload["embedding"]["values"]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def main() -> int:
    parser = argparse.ArgumentParser(description="ナレッジのベクトル検索")
    parser.add_argument("query", help="検索したい内容(自然文)")
    parser.add_argument("--top", type=int, default=5, help="上位何件を表示するか(既定5件)")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("エラー: 環境変数 GEMINI_API_KEY が未設定です", file=sys.stderr)
        return 1

    if not INDEX_JSON.exists():
        print(f"エラー: {INDEX_JSON} がありません。先に build_vector_index.py を実行してください", file=sys.stderr)
        return 1

    with INDEX_JSON.open(encoding="utf-8") as f:
        index = json.load(f)
    chunks = index.get("chunks", [])
    if not chunks:
        print("インデックスにチャンクがありません(まだ生成されていない可能性があります)")
        return 0

    query_vec = embed_query(args.query, api_key)
    scored = [
        (cosine_similarity(query_vec, c["embedding"]), c)
        for c in chunks if c.get("embedding")
    ]
    scored.sort(key=lambda x: x[0], reverse=True)

    print(f"クエリ: {args.query}\n")
    for rank, (score, chunk) in enumerate(scored[: args.top], start=1):
        snippet = chunk["text"].replace("\n", " ")[:120]
        print(f"{rank}. [{score:.3f}] ({chunk['source']} / {chunk['ref']})\n   {snippet}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
