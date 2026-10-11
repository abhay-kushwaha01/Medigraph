"""
Tests for configuration loading and validation.
"""
import os
from unittest.mock import patch

import pytest

from app.config import Settings


def test_defaults_when_no_env():
    """Settings should have safe defaults when env vars are absent."""
    s = Settings(neo4j_uri="", neo4j_username="neo4j", neo4j_password="")
    assert s.neo4j_database == "neo4j"
    assert not s.is_neo4j_configured()


def test_configured_when_all_set():
    s = Settings(
        neo4j_uri="neo4j+s://example.databases.neo4j.io",
        neo4j_username="neo4j",
        neo4j_password="secret",
    )
    assert s.is_neo4j_configured()


def test_allowed_origins_parsed():
    s = Settings(
        neo4j_uri="",
        neo4j_password="",
        frontend_origins="http://localhost:5173,http://localhost:3000",
    )
    assert "http://localhost:5173" in s.allowed_origins
    assert "http://localhost:3000" in s.allowed_origins


def test_allowed_extension_set():
    s = Settings(neo4j_uri="", neo4j_password="", allowed_extensions="csv,json,xlsx")
    assert s.allowed_extension_set == {"csv", "json", "xlsx"}


def test_max_upload_bytes():
    s = Settings(neo4j_uri="", neo4j_password="", max_upload_size_mb=10)
    assert s.max_upload_bytes == 10 * 1024 * 1024
