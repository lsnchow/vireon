"""Global configuration constants for the simulation backend."""

from __future__ import annotations

import os
from typing import List
from dotenv import load_dotenv

# Load .env from project root (one level up)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# ── Backboard ──
BACKBOARD_API_KEY: str = os.getenv("BACKBOARD_API_KEY", "")
BACKBOARD_BASE_URL: str = os.getenv(
    "BACKBOARD_BASE_URL", "https://app.backboard.io/api"
)

# ── Model allowlist (max 10) ──
ALLOWED_MODELS: list[str] = [
    "amazon/nova-micro-v1",
    "amazon/nova-lite-v1",
    "anthropic/claude-3-haiku",
    "anthropic/claude-3.5-sonnet",
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash",
    "meta/llama-3.1-8b-instruct",
    "mistral/mistral-small-latest",
]

# ── Aggregation ──
# final_score = ALPHA * deterministic_acceptance + (1 - ALPHA) * sentiment_score
ALPHA: float = 0.7

# ── Timeouts & concurrency ──
AGENT_TIMEOUT_S: float = 25.0  # per-agent Backboard call
ASSISTANT_CREATE_TIMEOUT_S: float = 30.0
THREAD_CREATE_TIMEOUT_S: float = 30.0
JOB_TTL_S: float = 600.0  # 10 min expiry

# ── CORS ──
CORS_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
