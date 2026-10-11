"""
Text-based PDF parser using pypdf.

Extracts plain text from PDF pages and returns lines as records.
Structured medical data extraction from free-text PDFs requires
additional NLP/regex post-processing beyond this parser's scope.

pypdf is an optional dependency — listed in requirements.txt.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)


def parse_pdf(file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Extract text from each PDF page.

    Returns:
        records — list of {"page": int, "text": str} dicts
        columns — ["page", "text"]
    Raises:
        ImportError — pypdf not installed
        ValueError  — empty or unreadable PDF
    """
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ImportError(
            "pypdf is required for PDF parsing. Install it with: pip install pypdf"
        ) from exc

    reader = PdfReader(str(file_path))
    if not reader.pages:
        raise ValueError("PDF has no pages.")

    records: List[Dict[str, Any]] = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        records.append({"page": i, "text": text.strip()})

    non_empty = [r for r in records if r["text"]]
    if not non_empty:
        raise ValueError("PDF contained no extractable text.")

    return records, ["page", "text"]
