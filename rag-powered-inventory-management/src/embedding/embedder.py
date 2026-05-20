"""Generate embeddings for chunked inventory documents with SentenceTransformers."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

from sentence_transformers import SentenceTransformer


def load_jsonl_records(input_path: str | Path) -> List[Dict[str, Any]]:
    path = Path(input_path)
    records: List[Dict[str, Any]] = []

    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            raw = line.strip()
            if not raw:
                continue

            record = json.loads(raw)
            if "id" not in record or "text" not in record:
                raise ValueError(
                    f"Invalid record on line {line_number}: expected 'id' and 'text' fields."
                )
            records.append(record)

    return records


def build_embedding_model(model_name: str = "sentence-transformers/all-MiniLM-L6-v2") -> SentenceTransformer:
    return SentenceTransformer(model_name)


def embed_records(
    records: List[Dict[str, Any]],
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
    batch_size: int = 32,
    normalize_embeddings: bool = True,
) -> List[Dict[str, Any]]:
    if not records:
        return []

    model = build_embedding_model(model_name=model_name)
    texts = [str(record["text"]) for record in records]
    vectors = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=normalize_embeddings,
        show_progress_bar=False,
    )

    embedded_records: List[Dict[str, Any]] = []
    for record, vector in zip(records, vectors):
        embedded_records.append(
            {
                "id": record["id"],
                "text": record["text"],
                "embedding": vector.tolist(),
                "embedding_model": model_name,
                "embedding_dim": len(vector),
                "metadata": dict(record.get("metadata", {})),
                "source_id": record.get("source_id"),
                "chunk_index": record.get("chunk_index"),
            }
        )

    return embedded_records


def _write_jsonl(records: List[Dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=True) + "\n")


def embed_inventory_chunks(
    input_path: str | Path,
    output_path: str | Path,
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
    batch_size: int = 32,
    normalize_embeddings: bool = True,
) -> Path:
    records = load_jsonl_records(input_path)
    embedded_records = embed_records(
        records,
        model_name=model_name,
        batch_size=batch_size,
        normalize_embeddings=normalize_embeddings,
    )

    output_path = Path(output_path)
    _write_jsonl(embedded_records, output_path)
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate embeddings for chunked inventory documents with SentenceTransformers."
    )
    parser.add_argument(
        "--input",
        default="data/processed/inventory_rag_chunks.jsonl",
        help="Path to the input chunked JSONL file.",
    )
    parser.add_argument(
        "--output",
        default="data/processed/inventory_rag_embeddings.jsonl",
        help="Path to the output embeddings JSONL file.",
    )
    parser.add_argument(
        "--model",
        default="sentence-transformers/all-MiniLM-L6-v2",
        help="SentenceTransformers model name.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for embedding generation.",
    )
    parser.add_argument(
        "--no-normalize",
        action="store_true",
        help="Disable embedding normalization.",
    )
    args = parser.parse_args()

    output_path = embed_inventory_chunks(
        input_path=args.input,
        output_path=args.output,
        model_name=args.model,
        batch_size=args.batch_size,
        normalize_embeddings=not args.no_normalize,
    )
    print(f"embedded_docs: {output_path}")


if __name__ == "__main__":
    main()
