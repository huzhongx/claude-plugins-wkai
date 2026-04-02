# claude-plugins-wkai

Claude Code plugins by wk.ai

## One-line Install

```bash
curl -fsSL https://raw.githubusercontent.com/huzhongx/claude-plugins-wkai/main/install.sh | bash
```

Restart Claude Code, then run:

```
/wkai-stats:wkai-stats     # Query token usage and submit to wk.ai
```

## What the install script does

1. Clone plugin repo to `~/.claude/plugins/marketplaces/`
2. Register marketplace and plugin in Claude Code config
3. Install MCP server (`wkai-api`) globally in `~/.claude.json`
4. Install MCP server npm dependencies

All configuration is global — works in every project without additional setup.

## Manual Install

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

5. Add MCP server in `~/.claude.json` under `mcpServers`:
```json
"wkai-api": {
  "type": "stdio",
  "command": "node",
  "args": ["~/.claude/plugins/marketplaces/claude-plugins-wkai/plugins/wkai-stats/mcp-wkai/index.js"],
  "env": {}
}
```

6. Install dependencies:
```bash
cd ~/.claude/plugins/marketplaces/claude-plugins-wkai/plugins/wkai-stats/mcp-wkai && npm install
```
