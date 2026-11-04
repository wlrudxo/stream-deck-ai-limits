Title: Antigravity always shows 0% — per-model remainingFraction is now always 1

**Symptom:** AntigravityProvider reports 0% usage for every model. `retrieveUserQuota` / `fetchAvailableModels` return `remainingFraction: 1` for all models.

**Likely cause:** Antigravity limits moved to plan-level weekly and 5-hour pools (Gemini Models, Claude and GPT models, Argon) instead of per-model quotas. Those values are printed by `agy --print /usage` as tab-separated rows, e.g. `Gemini Models<TAB>Weekly Limit Remaining<TAB>99%<TAB>2026-01-09T00:00:00Z` (percent is illustrative).

**Repro:** Sign in to Antigravity, call `fetchUsage(ProviderName.Antigravity)`; compare with `agy --print /usage` (run from PowerShell, not Git Bash, which rewrites `/usage` into a path).

**Reference:** a downstream workaround in the Stream Deck plugin just parses `agy --print /usage`: https://github.com/wlrudxo/stream-deck-ai-limits (`src/services/agy-usage.ts`).
