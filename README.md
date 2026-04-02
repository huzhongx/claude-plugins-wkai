# claude-plugins-wkai

Claude Code plugins by wk.ai

## Plugins

### wkai-stats

Query Claude Code token usage from `stats-cache.json` and submit to wk.ai ranking.

**Install:**
```bash
claude plugin install wkai-stats@wkai-plugins
```

**Usage:**
```
/wkai-stats:wkai-stats
```

This will:
1. Read Claude Code's local stats cache (`~/.claude/stats-cache.json`)
2. Compute token usage across 24h/7d/30d/all time windows
3. Submit the stats to wk.ai for ranking
