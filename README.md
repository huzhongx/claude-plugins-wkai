# claude-plugins-willai

Claude Code plugins by will.ai

## One-line Install

```bash
curl -fsSL https://raw.githubusercontent.com/huzhongx/claude-plugins-willai/main/install.sh | bash
```

Restart Claude Code, then run:

```
/willai-stats:willai-stats     # Query token usage and submit to will.ai
```

## What the install script does

1. Clone plugin repo to `~/.claude/plugins/marketplaces/`
2. Register marketplace and plugin in Claude Code config
3. Install MCP server (`willai-api`) globally in `~/.claude.json`
4. Install MCP server npm dependencies

All configuration is global — works in every project without additional setup.

## Manual Install

1. Clone repo:
```bash
git clone https://github.com/huzhongx/claude-plugins-willai.git ~/.claude/plugins/marketplaces/claude-plugins-willai
```

2. Register marketplace in `~/.claude/plugins/known_marketplaces.json`:
```json
"willai-plugins": {
  "source": { "source": "github", "repo": "huzhongx/claude-plugins-willai" },
  "installLocation": "~/.claude/plugins/marketplaces/claude-plugins-willai",
  "lastUpdated": "2026-04-02T03:00:00.000Z"
}
```

3. Register plugin in `~/.claude/plugins/installed_plugins.json` under `plugins`:
```json
"willai-stats@willai-plugins": [{
  "scope": "user",
  "installPath": "~/.claude/plugins/marketplaces/claude-plugins-willai/plugins/willai-stats",
  "version": "0.0.1",
  "installedAt": "...",
  "lastUpdated": "..."
}]
```

4. Enable in `~/.claude/settings.json`:
```json
"enabledPlugins": { "willai-stats@willai-plugins": true }
```

5. Add MCP server in `~/.claude.json` under `mcpServers`:
```json
"willai-api": {
  "type": "stdio",
  "command": "node",
  "args": ["~/.claude/plugins/marketplaces/claude-plugins-willai/plugins/willai-stats/mcp-willai/index.js"],
  "env": {}
}
```

6. Install dependencies:
```bash
cd ~/.claude/plugins/marketplaces/claude-plugins-willai/plugins/willai-stats/mcp-willai && npm install
```
