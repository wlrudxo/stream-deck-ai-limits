import { execFile } from "node:child_process";
import { existsSync, utimesSync } from "node:fs";
import { join } from "node:path";

// Parser adapted from C:\GitProject\_tools\Paseo\plugins\agent-card\server\agy-usage.ts (wlrudxo/_tools).
// `agy --print /usage` prints plan-level pools: group <TAB> limit <TAB> remaining% <TAB> reset(ISO).

export interface AgyPool {
    id: string;
    label: string;
    usedPercent: number;
    resetTime: string;
}

const ROWS: Record<string, { id: string; label: string }> = {
    "Gemini Models|Weekly Limit": { id: "gemini-weekly", label: "Gemini wk" },
    "Gemini Models|Five Hour Limit": { id: "gemini-5h", label: "Gemini 5h" },
    "Claude and GPT models|Weekly Limit": { id: "cg-weekly", label: "Claude/GPT wk" },
    "Claude and GPT models|Five Hour Limit": { id: "cg-5h", label: "Claude/GPT 5h" },
    "Gemini 4 Argon|Gemini 4 Argon Weekly Limit": { id: "argon-weekly", label: "Argon wk" },
};

export function parseAgyUsage(text: string): AgyPool[] {
    const pools: AgyPool[] = [];
    for (const line of text.split(/\r?\n/)) {
        const f = line.split("\t");
        if (f.length !== 4) continue;
        const meta = ROWS[`${f[0]}|${f[1].replace(/ Remaining$/, "")}`];
        if (!meta || !f[2].endsWith("%")) continue;
        const remaining = Number(f[2].slice(0, -1));
        if (!Number.isFinite(remaining) || remaining < 0 || remaining > 100) continue;
        pools.push({ ...meta, usedPercent: 100 - remaining, resetTime: f[3] });
    }
    return pools;
}

export function findAgy(): string | null {
    const local = process.env["LOCALAPPDATA"];
    const p = local ? join(local, "agy", "bin", process.platform === "win32" ? "agy.exe" : "agy") : "";
    return p && existsSync(p) ? p : null;
}

// agy's background update check spawns a detached `agy --version` that opens a
// visible console window even when the parent is hidden. Refresh the check stamp
// before a usage-only call so polling never triggers it.
function skipAgyUpdateCheck(): void {
    const home = process.env["USERPROFILE"] ?? process.env["HOME"] ?? "";
    const stamp = home ? join(home, ".gemini", "antigravity-cli", "last_check.timestamp") : "";
    if (!stamp || !existsSync(stamp)) return;
    const now = new Date();
    try { utimesSync(stamp, now, now); } catch { /* never block usage polling */ }
}

export function fetchAgyPools(binary = findAgy()): Promise<AgyPool[]> {
    if (!binary) return Promise.reject(new Error("agy not found"));
    skipAgyUpdateCheck();
    return new Promise((resolve, reject) => {
        execFile(binary, ["--print", "/usage", "--print-timeout", "20s"],
            { timeout: 30_000, windowsHide: true, encoding: "utf8" },
            (err, stdout) => {
                // Never surface stdout/stderr: may contain auth diagnostics.
                if (err) return reject(new Error("agy /usage failed"));
                const pools = parseAgyUsage(stdout);
                pools.length ? resolve(pools) : reject(new Error("agy /usage returned no quota rows"));
            });
    });
}
