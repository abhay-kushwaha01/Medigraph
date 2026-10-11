"""
XLSX / XLS parser using openpyxl (xlsx) and xlrd (xls).
openpyxl is required; xlrd is optional for legacy .xls files.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Tuple


def parse_xlsx(file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parse the first sheet of an Excel workbook.

    Returns:
        records — list of row dicts (first row = headers)
        columns — header names
    Raises:
        ValueError  — empty file, no headers, or unsupported format
        ImportError — required library not installed
    """
    ext = file_path.suffix.lower()

    if ext == ".xls":
        return _parse_xls(file_path)
    return _parse_xlsx_native(file_path)


def _parse_xlsx_native(file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    try:
        import openpyxl
    except ImportError as exc:
        raise ImportError(
            "openpyxl is required for .xlsx parsing. Install it with: pip install openpyxl"
        ) from exc

    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    if not rows:
        raise ValueError("Excel file is empty.")

    headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(rows[0])]
    if not any(headers):
        raise ValueError("Excel file has no column headers.")

    records: List[Dict[str, Any]] = []
    for row in rows[1:]:
        if all(v is None for v in row):
            continue  # skip blank rows
        record = {headers[i]: row[i] for i in range(len(headers))}
        records.append(record)

    return records, headers


def _parse_xls(file_path: Path) -> Tuple[List[Dict[str, Any]], List[str]]:
    try:
        import xlrd
    except ImportError as exc:
        raise ImportError(
            "xlrd is required for legacy .xls parsing. Install it with: pip install xlrd"
        ) from exc

    wb = xlrd.open_workbook(str(file_path))
    ws = wb.sheet_by_index(0)

    if ws.nrows == 0:
        raise ValueError("Excel file is empty.")

    headers = [str(ws.cell_value(0, c)).strip() for c in range(ws.ncols)]
    records: List[Dict[str, Any]] = []

    for r in range(1, ws.nrows):
        row_vals = [ws.cell_value(r, c) for c in range(ws.ncols)]
        if all(v == "" for v in row_vals):
            continue
        record = {headers[c]: row_vals[c] for c in range(ws.ncols)}
        records.append(record)

    return records, headers
