---
allowed-tools: all
description: Query Claude Code token usage and submit to will.ai ranking
---

# will.ai Stats (Token Usage for Ranking)

Invoke @willai-stats:willai-stats-agent to retrieve token usage statistics across multiple time windows and submit to will.ai for ranking.

## Critical constraint

**Run the query exactly once** -- regardless of success or failure, execute a single query and return the result immediately.
