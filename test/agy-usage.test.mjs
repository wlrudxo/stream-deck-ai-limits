import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAgyUsage } from "../src/services/agy-usage.ts";

const SAMPLE = [
    "Gemini Models\tWeekly Limit Remaining\t99%\t2026-01-09T00:00:00Z",
    "Gemini Models\tFive Hour Limit Remaining\t100%\t2026-01-04T00:00:00Z",
    "Claude and GPT models\tWeekly Limit Remaining\t80%\t2026-01-11T00:00:00Z",
    "Gemini 4 Argon\tGemini 4 Argon Weekly Limit\t55%\t2026-01-09T00:00:00Z",
    "junk line",
    "Gemini Models\tWeekly Limit Remaining\tabc%\tx",
].join("\r\n");

test("parses pools into used percent", () => {
    const p = parseAgyUsage(SAMPLE);
    assert.deepEqual(p.map((x) => [x.id, x.usedPercent]), [
        ["gemini-weekly", 1], ["gemini-5h", 0], ["cg-weekly", 20], ["argon-weekly", 45],
    ]);
    assert.equal(p[0].resetTime, "2026-01-09T00:00:00Z");
});

test("empty on unknown output", () => assert.deepEqual(parseAgyUsage("nope"), []));
