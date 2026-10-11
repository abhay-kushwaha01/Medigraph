"""
CSV parser for medical data files.
Uses Python's built-in csv module — no extra dependencies needed.
"""
from __future__ import annotations

import csv
import io
from pathlib import Path
from typing import Any, Dict, List, Tuple


def parse_csv(file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse a CSV file.

    Returns:
        records  — list of row dicts (column names are keys)
        columns  — ordered list of column header names
    Raises:
        ValueError  — empty file or no headers detected
        OSError     — file not found or unreadable
    """
    content = file_path.read_bytes()

    # Try common encodings
    text: str = ""
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(enc)
            break
        except UnicodeDecodeError:
            continue

    if not text.strip():
        raise ValueError("CSV file is empty.")

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValueError("CSV file has no headers.")

    columns: List[str] = list(reader.fieldnames)
    records: List[Dict[str, Any]] = []

    for row in reader:
        # Strip whitespace from all values; keep None for truly empty cells
        cleaned = {k: (v.strip() if v is not None else None) for k, v in row.items()}
        records.append(cleaned)

    return records, columns


def parse_csv_bytes(data: bytes, filename: str = "upload.csv") -> Tuple[List[Dict[str, Any]], List[str]]:
    """Parse CSV from raw bytes (used in tests and upload handler)."""
    tmp = Path(f"/tmp/{filename}")
    tmp.write_bytes(data)
    return parse_csv(tmp)
