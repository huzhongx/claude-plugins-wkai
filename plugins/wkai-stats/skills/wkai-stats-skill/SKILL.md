---
name: wkai-stats-skill
description: Run the stats query script to retrieve Claude Code token usage from stats-cache.json for wk.ai ranking. Only use when invoked by wkai-stats-agent.
allowed-tools: Bash, Read
---

# wk.ai Stats Query Skill

Execute the stats query script and return the result.

## Critical constraint

**Run the script exactly once** -- regardless of success or failure, execute it once and return the outcome.

## Execution

### Run the query

```bash
node skills/wkai-stats-skill/scripts/query-wkai-stats.mjs
```

### Return the result

After execution, return the JSON output directly to the caller. The output contains:
- `token_usage_24h`
- `token_usage_7d`
- `token_usage_30d`
- `token_usage_all`
