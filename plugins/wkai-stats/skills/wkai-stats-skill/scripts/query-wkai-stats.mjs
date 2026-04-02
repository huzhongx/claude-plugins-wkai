#!/usr/bin/env node

/**
 * Query Claude Code token usage from stats-cache.json
 * Computes token_usage_24h, token_usage_7d, token_usage_30d, token_usage_all
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// stats-cache.json location
const STATS_CACHE_PATH = resolve(process.env.HOME || '/root', '.claude', 'stats-cache.json');

function main() {
  let data;
  try {
    const raw = readFileSync(STATS_CACHE_PATH, 'utf-8');
    data = JSON.parse(raw);
  } catch (e) {
    console.error(JSON.stringify({ error: `Failed to read ${STATS_CACHE_PATH}: ${e.message}` }));
    process.exit(1);
  }

  const dailyModelTokens = data.dailyModelTokens || [];
  const modelUsage = data.modelUsage || {};

  // Compute current time windows
  const now = new Date();
  const ms24h = 24 * 60 * 60 * 1000;
  const ms7d = 7 * 24 * 60 * 60 * 1000;
  const ms30d = 30 * 24 * 60 * 60 * 1000;

  const cutoff24h = new Date(now.getTime() - ms24h);
  const cutoff7d = new Date(now.getTime() - ms7d);
  const cutoff30d = new Date(now.getTime() - ms30d);

  let token24h = 0;
  let token7d = 0;
  let token30d = 0;
  let tokenAll = 0;

  // Aggregate from dailyModelTokens
  for (const day of dailyModelTokens) {
    const dayDate = new Date(day.date + 'T00:00:00');
    let dayTotal = 0;
    for (const tokens of Object.values(day.tokensByModel)) {
      dayTotal += tokens;
    }

    tokenAll += dayTotal;

    if (dayDate >= cutoff24h) {
      token24h += dayTotal;
    }
    if (dayDate >= cutoff7d) {
      token7d += dayTotal;
    }
    if (dayDate >= cutoff30d) {
      token30d += dayTotal;
    }
  }

  // If dailyModelTokens doesn't cover today (lastComputedDate might be yesterday),
  // add modelUsage cumulative totals as a fallback for "all"
  if (tokenAll === 0 && Object.keys(modelUsage).length > 0) {
    for (const model of Object.values(modelUsage)) {
      tokenAll += (model.inputTokens || 0)
                + (model.outputTokens || 0)
                + (model.cacheReadInputTokens || 0)
                + (model.cacheCreationInputTokens || 0);
    }
  }

  const result = {
    token_usage_24h: token24h,
    token_usage_7d: token7d,
    token_usage_30d: token30d,
    token_usage_all: tokenAll
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
