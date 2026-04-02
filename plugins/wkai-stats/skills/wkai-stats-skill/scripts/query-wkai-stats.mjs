#!/usr/bin/env node

/**
 * Query Claude Code token usage by scanning session JSONL files.
 * Reads all projects under ~/.claude/projects/ and sums token usage
 * across 24h/7d/30d/all time windows.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const CLAUDE_DIR = resolve(process.env.HOME || '/root', '.claude');
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');

function main() {
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let token24h = 0;
  let token7d = 0;
  let token30d = 0;
  let tokenAll = 0;

  // Discover all project directories
  let projectDirs;
  try {
    projectDirs = readdirSync(PROJECTS_DIR).filter(f => {
      return statSync(join(PROJECTS_DIR, f)).isDirectory();
    });
  } catch (e) {
    console.error(JSON.stringify({ error: `Failed to read projects dir: ${e.message}` }));
    process.exit(1);
  }

  // Scan each project's JSONL files
  for (const projDir of projectDirs) {
    const projPath = join(PROJECTS_DIR, projDir);
    let files;
    try {
      files = readdirSync(projPath).filter(f => f.endsWith('.jsonl'));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = join(projPath, file);

      // Use file mtime as a quick filter: if modified before 30d ago, skip
      try {
        const mtime = new Date(statSync(filePath).mtime);
        if (mtime < cutoff30d) continue;
      } catch {
        continue;
      }

      // Read file and parse line by line
      let content;
      try {
        content = readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        let obj;
        try { obj = JSON.parse(line); } catch { continue; }

        // Extract timestamp
        const ts = obj.timestamp || obj.ts;
        if (!ts) continue;
        const msgDate = new Date(ts);
        if (isNaN(msgDate.getTime())) continue;

        // Extract usage from message
        const msg = obj.message || {};
        const usage = msg.usage || {};
        const inputTokens = usage.input_tokens || 0;
        const outputTokens = usage.output_tokens || 0;
        const cacheRead = usage.cache_read_input_tokens || 0;
        const cacheCreation = usage.cache_creation_input_tokens || 0;
        const total = inputTokens + outputTokens + cacheRead + cacheCreation;

        if (total === 0) continue;

        tokenAll += total;
        if (msgDate >= cutoff30d) token30d += total;
        if (msgDate >= cutoff7d) token7d += total;
        if (msgDate >= cutoff24h) token24h += total;
      }
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
