#!/usr/bin/env python3
"""
data/vector-index.json を生成・更新するスクリプト。

CL-003(data/concept-log.json)で合意した方針の実装:
  - 既存の正本JSON(tasks.json・concept-log.json・ai-list.json・
    ai-research-radarのresearch-log.json)には一切変更を加えない。
  - そこからチャンク(検索単位のテキスト断片)を抽出し、ローカルのオープン
    ソース埋め込みモデル(fastembed、sentence-transformers/paraphrase-
    multilingual-MiniLM-L12-v2)でベクトル化し、data/vector-index.jsonという
    別ファイルへ一方向で書き出す。
  - 外部AI企業のAPIキー・アカウント登録は一切不要(モデルはHugging Faceから
    一度だけダウンロードしてローカル実行するだけ)。2026-08-23、ユーザー指示
    によりGemini Embedding APIから切り替えた(外部AIベンダーへの依存自体を
    なくすため)。
  - 専用のベクトルDBは使わず、JSONファイル+検索時の総当たりコサイン類似度
    計算(scripts/knowledge/search_knowledge.py)で完結させる(無料で完結する
    ことを優先)。

再実行時は、内容が変わっていないチャンクの埋め込みを再利用し(コンテンツ
ハッシュで判定)、変化があった/新規のチャンクだけを埋め込み直す(モデル
推論の計算コストを抑えるため)。

実行方法:
  pip install fastembed
  python3 scripts/knowledge/build_vector_index.py
GitHub Actions(.github/workflows/build-vector-index.yml)から定期実行される想定。
"""
from __future__ import annotations

import hashlib
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TASKS_JSON = REPO_ROOT / "data" / "tasks.json"
CONCEPT_LOG_JSON = REPO_ROOT / "data" / "concept-log.json"
AI_LIST_JSON = REPO_ROOT / "data" / "ai-list.json"
OUTPUT_JSON = REPO_ROOT / "data" / "vector-index.json"

RESEARCH_LOG_URL = "https://raw.githubusercontent.com/gurii-gabreh/ai-research-radar/main/data/research-log.json"

EMBED_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def fetch_remote_json(url: str) -> dict:
    try:
        with urllib.request.urlopen(url, timeout=15) as res:
            return json.loads(res.read().decode("utf-8"))
    except (urllib.error.URLError, json.JSONDecodeError) as e:
        print(f"警告: {url} の取得に失敗したためスキップします: {e}", file=sys.stderr)
        return {}


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def make_chunk(chunk_id: str, source: str, ref: str, text: str) -> dict | None:
    text = (text or "").strip()
    if not text:
        return None
    return {"id": chunk_id, "source": source, "ref": ref, "text": text, "hash": content_hash(text)}


def dedupe_chunk_ids(chunks: list[dict]) -> list[dict]:
    """同じidのチャンクが複数存在する場合(例: tasks.jsonに同じタスクIDが重複しているケース、
    2026-08-22時点でSSC-002が2件重複しているのを確認済み)、後発のものに#2・#3...を付けて
    idを一意にする。並び順は入力リストの順序に依存するため、抽出元(chunks_from_*)の走査順が
    実行のたびに変わらない限り安定する。"""
    seen: dict[str, int] = {}
    result = []
    for chunk in chunks:
        base_id = chunk["id"]
        seen[base_id] = seen.get(base_id, 0) + 1
        if seen[base_id] > 1:
            chunk = {**chunk, "id": f"{base_id}#{seen[base_id]}"}
        result.append(chunk)
    return result


# ---- チャンク抽出: data/tasks.json ----
def chunks_from_tasks(data: dict) -> list[dict]:
    chunks = []

    def walk(nodes):
        for node in nodes:
            repo = node.get("repo", "")
            task_id = node.get("id", "")
            title = node.get("task") or node.get("title") or ""
            detail = node.get("detail", "")
            note = node.get("note", "")
            parts = [p for p in [title, detail, note] if p]
            text = "\n".join(parts)
            chunk = make_chunk(
                chunk_id=f"tasks:{task_id or title[:40]}",
                source="tasks.json",
                ref=f"{repo}/{task_id}" if repo or task_id else title[:60],
                text=text,
            )
            if chunk:
                chunks.append(chunk)
            if node.get("subtasks"):
                walk(node["subtasks"])

    walk(data.get("tasks", []))
    return chunks


# ---- チャンク抽出: data/concept-log.json ----
def chunks_from_concept_log(data: dict) -> list[dict]:
    chunks = []
    for category in data.get("categories", []):
        for item in category.get("items", []):
            item_id = item.get("id", "")
            parts = [item.get("concept", ""), item.get("context", ""), item.get("note", "")]
            text = "\n".join(p for p in parts if p)
            chunk = make_chunk(
                chunk_id=f"concept-log:{item_id}",
                source="concept-log.json",
                ref=item_id,
                text=text,
            )
            if chunk:
                chunks.append(chunk)
    return chunks


# ---- チャンク抽出: data/ai-list.json ----
def chunks_from_ai_list(data: dict) -> list[dict]:
    chunks = []
    for i, item in enumerate(data.get("items", [])):
        text = "\n".join(f"{k}: {v}" for k, v in item.items() if v)
        chunk = make_chunk(
            chunk_id=f"ai-list:{i}",
            source="ai-list.json",
            ref=str(item.get("appName") or item.get("title") or item.get("name") or i),
            text=text,
        )
        if chunk:
            chunks.append(chunk)
    return chunks


# ---- チャンク抽出: ai-research-radarのresearch-log.json(リモート取得) ----
def chunks_from_research_log(data: dict) -> list[dict]:
    chunks = []
    for i, item in enumerate(data.get("items", [])):
        parts = [item.get("タイトル", ""), item.get("概要", ""), item.get("カテゴリ", "")]
        text = "\n".join(p for p in parts if p)
        chunk = make_chunk(
            chunk_id=f"research-log:{i}",
            source="research-log.json (ai-research-radar)",
            ref=item.get("ソースURL", "") or str(i),
            text=text,
        )
        if chunk:
            chunks.append(chunk)
    return chunks


_embed_model_instance = None


def _get_embed_model():
    """fastembedのモデルは初回呼び出し時に1回だけロードする(以降は使い回す)。"""
    global _embed_model_instance
    if _embed_model_instance is None:
        from fastembed import TextEmbedding
        _embed_model_instance = TextEmbedding(model_name=EMBED_MODEL)
    return _embed_model_instance


def embed_text(text: str) -> list[float]:
    model = _get_embed_model()
    vec = next(model.embed([text[:8000]]))  # 過大なチャンクを安全側に切り詰める
    return vec.tolist()


def main() -> int:
    all_chunks = []
    all_chunks += chunks_from_tasks(load_json(TASKS_JSON))
    all_chunks += chunks_from_concept_log(load_json(CONCEPT_LOG_JSON))
    all_chunks += chunks_from_ai_list(load_json(AI_LIST_JSON))
    all_chunks += chunks_from_research_log(fetch_remote_json(RESEARCH_LOG_URL))
    all_chunks = dedupe_chunk_ids(all_chunks)

    existing = load_json(OUTPUT_JSON)
    existing_by_id = {c["id"]: c for c in existing.get("chunks", [])}

    result_chunks = []
    embedded_count = 0
    reused_count = 0
    for chunk in all_chunks:
        prior = existing_by_id.get(chunk["id"])
        if prior and prior.get("hash") == chunk["hash"] and prior.get("embedding"):
            # 内容が変わっていないので、既存の埋め込みをそのまま再利用する(API呼び出し節約)
            chunk["embedding"] = prior["embedding"]
            reused_count += 1
        else:
            try:
                chunk["embedding"] = embed_text(chunk["text"])
                embedded_count += 1
            except Exception as e:  # noqa: BLE001 - 1件の失敗で全体を止めない
                print(f"警告: チャンク {chunk['id']} の埋め込みに失敗: {e}", file=sys.stderr)
                continue
        result_chunks.append(chunk)

    output = {
        "description": "既存の正本JSON(tasks.json・concept-log.json・ai-list.json・ai-research-radarのresearch-log.json)から抽出したチャンクを、ローカルの埋め込みモデル(fastembed、sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2)でベクトル化したもの。scripts/knowledge/build_vector_index.pyによる自動生成。正本側は一切変更しない一方向の派生データ。検索はscripts/knowledge/search_knowledge.py(コサイン類似度の総当たり)で行う。外部AI企業のAPIキーは不要。",
        "model": EMBED_MODEL,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "chunkCount": len(result_chunks),
        "chunks": result_chunks,
    }
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"完了: 総チャンク数={len(result_chunks)} (新規/更新埋め込み={embedded_count}, 再利用={reused_count})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
