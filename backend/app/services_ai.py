"""AI provider abstraction. Only two providers are wired: Google Gemini
(selected by the operator's env) and NVIDIA Integrate (OpenAI-compatible).
No OpenAI/Anthropic keys are supported. Provider/model is env-configurable and
verified at runtime via /api/ai/status (no hard-coded free-model promise).
"""
from __future__ import annotations
import time
import httpx
from app.core_config import settings

ALLOWED_TASKS = {
    "caption", "copy_variants", "campaign_plan", "content_ideas",
    "hashtags", "sponsor_copy", "press_draft", "hooks", "reel_concepts",
    "repurpose", "performance_summary", "general",
}

# Model hints per provider; env picks the active model. Verify availability
# with the provider — never assume a model is permanently free.
MODEL_REGISTRY = {
    "gemini": {
        "gemini-3.6-flash": {"kind": "chat"},
        "gemini-2.5-flash": {"kind": "chat"},
    },
    "nvidia": {
        "nvidia/llama-3.1-nemotron-70b-instruct": {"ctx": 128000, "kind": "instruct"},
        "nvidia/llama-3.1-nemotron-nano-8b-v1": {"ctx": 128000, "kind": "instruct"},
    },
}

PROMPTS = {
    "caption": "Write an engaging Instagram caption for KIMUN 2026 about: {brief}. Include CTA and keep under 2200 chars.",
    "copy_variants": "Write 3 copy variants for KIMUN 2026 ({platform}) about: {brief}.",
    "campaign_plan": "Draft a phased campaign plan (concept, phases, post ideas, reel concepts, story concepts, sequence, CTAs) for goal '{goal}' audience '{audience}' duration {duration}. Editable draft only.",
    "content_ideas": "Suggest 10 content ideas (title, format, platform, goal) for KIMUN 2026 around: {brief}.",
    "hashtags": "Suggest 15 relevant hashtags (mix reach + niche, no banned tags) for: {brief}.",
    "sponsor_copy": "Draft sponsor announcement copy (formal + social variant) for sponsor '{sponsor}': {brief}. Requires human approval.",
    "press_draft": "Draft a press release for KIMUN 2026: {brief}. Formal tone, quotes placeholders.",
    "hooks": "Write 10 social hooks (first lines) for: {brief}.",
    "reel_concepts": "Propose 5 reel concepts (hook, shots, music mood, caption) for: {brief}.",
    "repurpose": "Repurpose this content into platform variants (IG, TikTok, LinkedIn): {brief}.",
    "performance_summary": "Summarize these content metrics in plain language with next actions: {brief}.",
    "general": "{brief}",
}


class AIError(Exception):
    pass


class GeminiAdapter:
    """Google Gemini generateContent (REST, ?key= auth). Server-side only."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.base_url = settings.GEMINI_BASE_URL.rstrip("/")
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL

    async def call(self, task: str, brief: str, context: dict | None = None) -> dict:
        if task not in ALLOWED_TASKS:
            raise AIError(f"Unknown AI task: {task}")
        if not self.api_key:
            raise AIError("GEMINI_API_KEY is not configured. Set backend .env; AI is disabled until then.")
        prompt = PROMPTS[task].format(**{"brief": brief, "goal": (context or {}).get("goal", brief),
                                         "audience": (context or {}).get("audience", "students"),
                                         "duration": (context or {}).get("duration", "7 days"),
                                         "sponsor": (context or {}).get("sponsor", ""),
                                         "platform": (context or {}).get("platform", "Instagram")})
        started = time.time()
        try:
            async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as c:
                r = await c.post(
                    f"{self.base_url}/models/{self.model}:generateContent",
                    params={"key": self.api_key},
                    json={"contents": [{"parts": [{"text": prompt}]}],
                          "generationConfig": {"maxOutputTokens": settings.AI_MAX_TOKENS, "temperature": 0.7}},
                )
        except Exception as e:
            raise AIError(f"Gemini endpoint unreachable: {e}")
        latency = round((time.time() - started) * 1000)
        if r.status_code != 200:
            raise AIError(f"Gemini error {r.status_code}: {r.text[:500]}")
        try:
            text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            raise AIError("Unexpected Gemini response shape")
        return {"model": self.model, "task": task, "text": text, "latency_ms": latency,
                "note": "Draft only — human review required before publishing."}


class NIMAdapter:
    """OpenAI-compatible chat completions against NVIDIA Integrate API."""

    def __init__(self, base_url: str | None = None, api_key: str | None = None, model: str | None = None):
        self.base_url = (base_url or settings.NVIDIA_BASE_URL).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.NVIDIA_API_KEY
        self.model = model or settings.DEFAULT_AI_MODEL

    async def call(self, task: str, brief: str, context: dict | None = None) -> dict:
        if task not in ALLOWED_TASKS:
            raise AIError(f"Unknown AI task: {task}")
        if not self.api_key:
            raise AIError("NVIDIA_API_KEY is not configured. Set backend .env; AI is disabled until then.")
        prompt = PROMPTS[task].format(**{"brief": brief, "goal": (context or {}).get("goal", brief),
                                         "audience": (context or {}).get("audience", "students"),
                                         "duration": (context or {}).get("duration", "7 days"),
                                         "sponsor": (context or {}).get("sponsor", ""),
                                         "platform": (context or {}).get("platform", "Instagram")})
        started = time.time()
        try:
            async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as c:
                r = await c.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={"model": self.model, "messages": [{"role": "user", "content": prompt}],
                          "max_tokens": settings.AI_MAX_TOKENS, "temperature": 0.7},
                )
        except Exception as e:
            raise AIError(f"NVIDIA endpoint unreachable: {e}")
        latency = round((time.time() - started) * 1000)
        if r.status_code != 200:
            raise AIError(f"NVIDIA error {r.status_code}: {r.text[:500]}")
        try:
            text = r.json()["choices"][0]["message"]["content"]
        except Exception:
            raise AIError("Unexpected NVIDIA response shape")
        return {"model": self.model, "task": task, "text": text, "latency_ms": latency,
                "note": "Draft only — human review required before publishing."}


class AIService:
    def __init__(self, adapter=None):
        provider = settings.AI_PROVIDER
        if provider == "gemini":
            self.adapter = adapter or GeminiAdapter()
        elif provider == "nvidia":
            self.adapter = adapter or NIMAdapter()
        else:
            raise AIError(f"Unknown AI_PROVIDER: {provider!r} (use 'gemini' or 'nvidia')")

    async def generate(self, task: str, brief: str, context: dict | None = None) -> dict:
        return await self.adapter.call(task, brief, context or {})
