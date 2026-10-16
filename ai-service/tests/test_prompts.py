import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.llm.prompts import (
    _get_now_br,
    build_runtime_context_pack,
    build_system_prompt,
    build_context_prompt,
)


def test_get_now_br_default_uses_america_sao_paulo():
    dt = _get_now_br()
    assert dt is not None
    assert dt.tzinfo is not None
    assert dt.utcoffset() == timedelta(hours=-3)
    if hasattr(dt.tzinfo, "key"):
        assert dt.tzinfo.key == "America/Sao_Paulo"


def test_get_now_br_aware_datetime_conversion():
    # UTC 15:30 -> Brasilia (America/Sao_Paulo UTC-3) 12:30
    utc_dt = datetime(2026, 10, 15, 15, 30, tzinfo=timezone.utc)
    br_dt = _get_now_br(utc_dt)

    assert br_dt.tzinfo is not None
    assert br_dt.utcoffset() == timedelta(hours=-3)
    assert br_dt.year == 2026
    assert br_dt.month == 10
    assert br_dt.day == 15
    assert br_dt.hour == 12
    assert br_dt.minute == 30

    # UTC+2 18:00 -> Brasilia (UTC-3) 13:00 (5 hours behind)
    plus2_dt = datetime(2026, 10, 15, 18, 0, tzinfo=timezone(timedelta(hours=2)))
    br_dt2 = _get_now_br(plus2_dt)
    assert br_dt2.hour == 13
    assert br_dt2.minute == 0


def test_get_now_br_naive_datetime_preservation():
    # Naive datetimes must be returned exactly as provided (no timezone added)
    naive_dt = datetime(2026, 10, 15, 14, 25, 30)
    res = _get_now_br(naive_dt)

    assert res == naive_dt
    assert res.tzinfo is None


def test_get_now_br_fallback_fixed_utc3_when_zone_lookup_fails():
    with patch("app.llm.prompts.ZoneInfo", side_effect=ZoneInfoNotFoundError("No zone")):
        # 1. When now is None, fallback uses fixed UTC-3 offset
        fallback_dt = _get_now_br()
        assert fallback_dt.tzinfo is not None
        assert fallback_dt.utcoffset() == timedelta(hours=-3)
        assert not hasattr(fallback_dt.tzinfo, "key")

        # 2. When now is aware, converts to fixed UTC-3 offset
        utc_dt = datetime(2026, 10, 15, 15, 30, tzinfo=timezone.utc)
        fallback_aware = _get_now_br(utc_dt)
        assert fallback_aware.utcoffset() == timedelta(hours=-3)
        assert fallback_aware.hour == 12
        assert fallback_aware.minute == 30

        # 3. When now is naive, naive nature is preserved even on fallback
        naive_dt = datetime(2026, 10, 15, 10, 0, 0)
        fallback_naive = _get_now_br(naive_dt)
        assert fallback_naive == naive_dt
        assert fallback_naive.tzinfo is None


def test_prompts_consistency_with_aware_datetime():
    utc_dt = datetime(2026, 10, 15, 23, 30, tzinfo=timezone.utc)  # in BR: 20:30 on 2026-10-15
    sys_prompt = build_system_prompt(now=utc_dt)
    ctx_prompt = build_context_prompt("Qual o faturamento?", [], "none", now=utc_dt)

    assert "2026-10-15" in sys_prompt
    assert "20:30" in sys_prompt
    assert "2026-10-15" in ctx_prompt
