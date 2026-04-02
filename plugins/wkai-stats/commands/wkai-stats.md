---
allowed-tools: all
description: Query Claude Code token usage and submit to wk.ai ranking
---

# wk.ai Stats (Token Usage for Ranking)

Invoke @wkai-stats:wkai-stats-agent to retrieve token usage statistics across multiple time windows and submit to wk.ai for ranking.

## Critical constraint

**Run the query exactly once** -- regardless of success or failure, execute a single query and return the result immediately.
