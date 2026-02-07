"""Async Backboard API client.

Handles assistant creation (cached), thread creation, and message sending
with form-data encoding as required by the Backboard API.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx

# #region agent log — debug file writer
_DEBUG_LOG = "/Users/lucas/Desktop/Vireon/.cursor/debug.log"
def _dlog(location: str, message: str, data: dict, hypothesis: str = ""):
    try:
        entry = json.dumps({"timestamp": int(time.time()*1000), "location": location, "message": message, "data": data, "hypothesisId": hypothesis})
        with open(_DEBUG_LOG, "a") as f:
            f.write(entry + "\n")
    except Exception:
        pass
# #endregion

from config import (
    BACKBOARD_API_KEY,
    BACKBOARD_BASE_URL,
    AGENT_TIMEOUT_S,
    ASSISTANT_CREATE_TIMEOUT_S,
    THREAD_CREATE_TIMEOUT_S,
)

log = logging.getLogger(__name__)

# ── In-process cache: archetype_key -> assistant_id ──
_assistant_cache: dict[str, str] = {}


class BackboardClient:
    """Thin async wrapper around the Backboard REST API."""

    def __init__(
        self,
        api_key: str = BACKBOARD_API_KEY,
        base_url: str = BACKBOARD_BASE_URL,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "X-API-Key": self.api_key,
            "Accept": "application/json",
        }

    # ── Assistant (cached per archetype) ──────────────────

    async def get_or_create_assistant(
        self, cache_key: str, name: str, system_prompt: str
    ) -> str:
        """Return a cached assistant_id, or create one via the API."""
        if cache_key in _assistant_cache:
            return _assistant_cache[cache_key]

        url = f"{self.base_url}/assistants"
        payload = {"name": name, "system_prompt": system_prompt}

        async with httpx.AsyncClient(timeout=ASSISTANT_CREATE_TIMEOUT_S) as client:
            resp = await client.post(url, headers=self.headers, json=payload)

        # #region agent log
        _dlog("backboard.py:create_assistant", "assistant response", {"status": resp.status_code, "body": resp.text[:500], "cache_key": cache_key}, "H4")
        # #endregion
        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Backboard create_assistant failed ({resp.status_code}): {resp.text}"
            )

        data = resp.json()
        assistant_id = data.get("assistant_id") or data.get("id")
        _assistant_cache[cache_key] = assistant_id
        log.info("Created assistant %s for %s", assistant_id, cache_key)
        return assistant_id

    # ── Thread ────────────────────────────────────────────

    async def create_thread(self, assistant_id: str) -> str:
        """Create a new conversation thread for an assistant."""
        url = f"{self.base_url}/assistants/{assistant_id}/threads"

        async with httpx.AsyncClient(timeout=THREAD_CREATE_TIMEOUT_S) as client:
            # CRITICAL: must send json={} — empty body causes 422
            resp = await client.post(url, headers=self.headers, json={})

        if resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Backboard create_thread failed ({resp.status_code}): {resp.text}"
            )

        data = resp.json()
        return data.get("thread_id") or data.get("id")

    # ── Message ───────────────────────────────────────────

    async def send_message(
        self,
        thread_id: str,
        content: str,
        model: str = "amazon/nova-micro-v1",
    ) -> str:
        """Send a user message and return the assistant's text response.

        The Backboard /messages endpoint requires **form data**
        (application/x-www-form-urlencoded), NOT JSON.
        """
        url = f"{self.base_url}/threads/{thread_id}/messages"

        # Split "provider/model-name" → provider, model
        provider = model.split("/")[0] if "/" in model else "amazon"

        form_data = {
            "content": content,
            "stream": "false",
            "memory": "off",
            "model": model,
            "provider": provider,
        }

        async with httpx.AsyncClient(timeout=AGENT_TIMEOUT_S) as client:
            resp = await client.post(url, headers=self.headers, data=form_data)

        # #region agent log
        _dlog("backboard.py:send_message", "message response", {"status": resp.status_code, "body_500": resp.text[:500], "model": model, "provider": provider}, "H3,H5")
        # #endregion
        if resp.status_code != 200:
            raise RuntimeError(
                f"Backboard send_message failed ({resp.status_code}): {resp.text}"
            )

        data = resp.json()
        raw_content = data.get("content") or data.get("text") or ""
        # #region agent log
        _dlog("backboard.py:send_message_extracted", "extracted content", {"has_content": bool(data.get("content")), "has_text": bool(data.get("text")), "raw_len": len(raw_content), "raw_300": raw_content[:300], "all_keys": list(data.keys())}, "H3")
        # #endregion
        return raw_content

    # ── High-level helper ─────────────────────────────────

    async def one_shot(
        self,
        cache_key: str,
        assistant_name: str,
        system_prompt: str,
        user_message: str,
        model: str,
    ) -> dict[str, Any]:
        """Full flow: ensure assistant → create thread → send message → parse JSON.

        Returns the parsed JSON dict.  On parse failure returns a fallback dict.
        """
        assistant_id = await self.get_or_create_assistant(
            cache_key, assistant_name, system_prompt
        )
        thread_id = await self.create_thread(assistant_id)
        raw = await self.send_message(thread_id, user_message, model=model)

        # #region agent log
        _dlog("backboard.py:one_shot_raw", "raw LLM response before cleaning", {"cache_key": cache_key, "raw_len": len(raw), "raw_500": raw[:500]}, "H1,H2")
        # #endregion

        # Strip potential markdown fences the LLM might add despite instructions
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            # Remove opening fence (```json or ```)
            first_nl = cleaned.index("\n") if "\n" in cleaned else 3
            cleaned = cleaned[first_nl + 1 :]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # #region agent log
        _dlog("backboard.py:one_shot_cleaned", "cleaned before JSON parse", {"cleaned_300": cleaned[:300], "starts_with_brace": cleaned[:1] if cleaned else ""}, "H2")
        # #endregion

        try:
            parsed = json.loads(cleaned)
            # #region agent log
            _dlog("backboard.py:one_shot_parsed_ok", "JSON parse SUCCESS", {"cache_key": cache_key, "keys": list(parsed.keys()) if isinstance(parsed, dict) else "not_dict"}, "H1")
            # #endregion
            return parsed
        except json.JSONDecodeError as e:
            # #region agent log
            _dlog("backboard.py:one_shot_parse_fail", "JSON parse FAILED", {"cache_key": cache_key, "error": str(e), "cleaned_500": cleaned[:500], "raw_500": raw[:500]}, "H1,H2")
            # #endregion
            log.warning("Failed to parse agent JSON, raw=%s", raw[:300])
            return {"_raw": raw, "_parse_error": True}
