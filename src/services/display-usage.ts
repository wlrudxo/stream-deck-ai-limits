import { readFileSync } from 'node:fs';
import { join } from 'node:path';
interface CachedBucket {
    usagePercent: number;
    resetTime: string;
    scope?: { model: string };
    displayName?: string;
    windowSeconds?: number;
}
interface CachedUsage {
    provider: 'claude' | 'antigravity' | 'chatgpt';
    perModel: Record<string, CachedBucket>;
    overallUsagePercent: number | null;
    overallResetTime: string | null;
    error: { code: 'CONN'; message: string } | null;
}

// Read the existing collector only. Never retry a provider API from a tile.
export function displayUsage(provider: 'claude' | 'antigravity' | 'chatgpt', root = join(process.env.LOCALAPPDATA || '', 'usage_budget'), now = Date.now()): CachedUsage {
    const perModel: Record<string, CachedBucket> = {};
    const valid = (used: unknown, at: string, reset: string) => typeof used === 'number' && Number.isFinite(used) && used >= 0 && used <= 100 && now - Date.parse(at) >= 0 && now - Date.parse(at) <= 600000 && Date.parse(reset) > now;
    try {
        if (provider === 'claude') {
            const data = JSON.parse(readFileSync(join(root, 'display_claude.json'), 'utf8'));
            for (const w of data.windows) {
                if (!valid(w.usedPct, data.successfulAt, w.resetsAt)) continue;
                const key = w.id === 'weekly' ? 'seven_day' : w.id === 'five_hour' ? 'five_hour' : w.id.startsWith('weekly_model_') ? `7d_${w.id.slice(13)}_quota` : null;
                if (!key) continue;
                perModel[key] = { usagePercent: w.usedPct, resetTime: w.resetsAt, ...(w.id.startsWith('weekly_model_') ? { scope: { model: w.id.slice(13) } } : {}) };
            }
        } else {
            const rows = readFileSync(join(root, 'samples.jsonl'), 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
            const row = rows.filter(r => r.provider === (provider === 'chatgpt' ? 'gpt' : 'argon')).sort((a,b) => Date.parse(b.until || b.at) - Date.parse(a.until || a.at))[0];
            if (row && valid(row.used, row.until || row.at, row.reset)) {
                const bucket = { usagePercent: row.used, resetTime: row.reset, displayName: 'Argon wk' };
                if (provider === 'chatgpt') perModel['primary_window'] = {...bucket, displayName:'GPT Week', windowSeconds:604800};
                else { perModel['argon-weekly'] = bucket; perModel['gemini-argon-wtu-weekly'] = bucket; }
            }
        }
    } catch { /* Files can be absent at boot; do not expose file contents. */ }
    const first = Object.values(perModel)[0];
    return { provider, perModel, overallUsagePercent: first?.usagePercent ?? null, overallResetTime: first?.resetTime ?? null, error: first ? null : { code: 'CONN', message: 'Cache stale' } };
}
