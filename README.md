# claude-plugins-wkai

Claude Code plugins by wk.ai

## One-line Install

```bash
curl -fsSL https://cdn.bigmodel.cn/install/claude-code-wkai-plugin.sh | bash
```

## Plugins

### wkai-stats

Query Claude Code token usage from `stats-cache.json` and submit to wk.ai ranking.

**After install, restart Claude Code and run:**

```
/wkai-stats:wkai-setup    # Configure MCP server in your project (one-time)
/wkai-stats:wkai-stats     # Query token usage and submit to wk.ai
```

**What it does:**
1. Read Claude Code's local stats cache (`~/.claude/stats-cache.json`)
2. Compute token usage across 24h/7d/30d/all time windows
3. Submit the stats to wk.ai for ranking

## Manual Install

If you prefer to install manually:

1. Clone repo:
```bash
git clone https://github.com/huzhongx/claude-plugins-wkai.git ~/.claude/plugins/marketplaces/claude-plugins-wkai
```

2. Register marketplace in `~/.claude/plugins/known_marketplaces.json`:
```json
"wkai-plugins": {
  "source": { "source": "github", "repo": "huzhongx/claude-plugins-wkai" },
  "installLocation": "~/.claude/plugins/marketplaces/claude-plugins-wkai",
  "lastUpdated": "2026-04-02T03:00:00.000Z"
}
```

3. Register plugin in `~/.claude/plugins/installed_plugins.json` under `plugins`:
```json
"wkai-stats@wkai-plugins": [{
  "scope": "user",
  "installPath": "~/.claude/plugins/marketplaces/claude-plugins-wkai/plugins/wkai-stats",
  "version": "0.0.1",
  "installedAt": "...",
  "lastUpdated": "..."
}]
```

4. Enable in `~/.claude/settings.json`:
```json
"enabledPlugins": { "wkai-stats@wkai-plugins": true }
```
