#!/usr/bin/env python3
"""
data/vector-index.json(scripts/knowledge/build_vector_index.pyで生成)に対して、
自然文クエリで意味検索(コサイン類似度の総当たり)を行うCLI。

RAGの「検索」部分の最小実装。専用のベクトルDBは使わず、Pythonの標準ライブラリ
だけで完結させている(チャンク数が数百〜数千件程度の規模であれば、総当たり計算
でも実用上問題にならない想定。データ量が大きく増えた場合は見直しが必要)。

埋め込みはローカルのオープンソースモデル(fastembed)で行う。外部AI企業の
APIキーは不要(2026-08-23、build_vector_index.pyと同じ理由で切り替え)。

使い方:
  pip install fastembed
  python3 scripts/knowledge/search_knowledge.py "検索したい内容"
  python3 scripts/knowledge/search_knowledge.py "検索したい内容" --top 5
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
INDEX_JSON = REPO_ROOT / "data" / "vector-index.json"

EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def embed_query(text: str) -> list[float]:
    from fastembed import TextEmbedding
    model = TextEmbedding(model_name=EMBED_MODEL)
    vec = next(model.query_embed([text]))
    return vec.tolist()


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

    if not INDEX_JSON.exists():
        print(f"エラー: {INDEX_JSON} がありません。先に build_vector_index.py を実行してください", file=sys.stderr)
        return 1

    with INDEX_JSON.open(encoding="utf-8") as f:
        index = json.load(f)
    chunks = index.get("chunks", [])
    if not chunks:
        print("インデックスにチャンクがありません(まだ生成されていない可能性があります)")
        return 0

    query_vec = embed_query(args.query)
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
