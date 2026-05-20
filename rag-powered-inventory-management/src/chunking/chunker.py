"""Chunk prepared inventory documents with LangChain text splitters."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Dict, List

try:
    from langchain_core.documents import Document
except ImportError:  # pragma: no cover - compatibility fallback
    from langchain.schema import Document

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:  # pragma: no cover - compatibility fallback
    from langchain.text_splitter import RecursiveCharacterTextSplitter


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


def build_langchain_documents(records: List[Dict[str, Any]]) -> List[Document]:
    documents: List[Document] = []

    for record in records:
        metadata = dict(record.get("metadata", {}))
        metadata.update(
            {
                "source_id": record["id"],
                "doc_type": record.get("doc_type", "unknown"),
                "granularity": record.get("granularity", "unknown"),
            }
        )
        documents.append(Document(page_content=record["text"], metadata=metadata))

    return documents


def build_text_splitter(
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )


def chunk_documents(
    records: List[Dict[str, Any]],
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> List[Dict[str, Any]]:
    splitter = build_text_splitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    langchain_documents = build_langchain_documents(records)
    split_documents = splitter.split_documents(langchain_documents)

    source_chunk_counts: Dict[str, int] = {}
    chunked_records: List[Dict[str, Any]] = []

    for document in split_documents:
        source_id = str(document.metadata["source_id"])
        chunk_index = source_chunk_counts.get(source_id, 0)
        source_chunk_counts[source_id] = chunk_index + 1

        chunked_records.append(
            {
                "id": f"{source_id}__chunk_{chunk_index:03d}",
                "source_id": source_id,
                "chunk_index": chunk_index,
                "text": document.page_content,
                "metadata": document.metadata,
            }
        )

    return chunked_records


def _write_jsonl(records: List[Dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=True) + "\n")


def chunk_inventory_docs(
    input_path: str | Path,
    output_path: str | Path,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> Path:
    records = load_jsonl_records(input_path)
    chunked_records = chunk_documents(
        records,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    output_path = Path(output_path)
    _write_jsonl(chunked_records, output_path)
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Chunk prepared inventory documents with LangChain.")
    parser.add_argument(
        "--input",
        default="data/processed/inventory_rag_all_docs.jsonl",
        help="Path to the input JSONL file.",
    )
    parser.add_argument(
        "--output",
        default="data/processed/inventory_rag_chunks.jsonl",
        help="Path to the output JSONL file.",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=500,
        help="Maximum chunk size.",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=50,
        help="Chunk overlap size.",
    )
    args = parser.parse_args()

    output_path = chunk_inventory_docs(
        input_path=args.input,
        output_path=args.output,
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap,
    )
    print(f"chunked_docs: {output_path}")


if __name__ == "__main__":
    main()
