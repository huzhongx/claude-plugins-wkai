#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-code-wkai-plugin installer
# Usage: curl -fsSL https://raw.githubusercontent.com/huzhongx/claude-plugins-wkai/main/install.sh | bash
# ============================================================

REPO="huzhongx/claude-plugins-wkai"
MARKETPLACE_NAME="wkai-plugins"
PLUGIN_NAME="wkai-stats"
PLUGIN_VERSION="0.0.1"
CLAUDE_DIR="$HOME/.claude"
PLUGINS_DIR="$CLAUDE_DIR/plugins"
INSTALL_DIR="$PLUGINS_DIR/marketplaces/claude-plugins-wkai"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# --- Pre-checks ---
command -v git >/dev/null 2>&1 || error "git is required. Please install git first."
command -v node >/dev/null 2>&1 || error "node is required. Please install Node.js first."

if [ ! -d "$CLAUDE_DIR" ]; then
  error "Claude Code config directory not found: $CLAUDE_DIR"
fi

info "Installing $PLUGIN_NAME from $REPO ..."

# --- Step 1: Clone or update repo ---
if [ -d "$INSTALL_DIR/.git" ]; then
  info "Repository exists, updating ..."
  cd "$INSTALL_DIR" && git pull --quiet
else
  mkdir -p "$INSTALL_DIR"
  info "Cloning $REPO ..."
  git clone --quiet "https://github.com/$REPO.git" "$INSTALL_DIR"
fi

# --- Step 2: Register marketplace in known_marketplaces.json ---
KNOWN_FILE="$PLUGINS_DIR/known_marketplaces.json"
mkdir -p "$PLUGINS_DIR"

if [ -f "$KNOWN_FILE" ]; then
  # Add entry using node (jq may not be installed)
  node -e "
    const fs = require('fs');
    const f = '$KNOWN_FILE';
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    data['$MARKETPLACE_NAME'] = {
      source: { source: 'github', repo: '$REPO' },
      installLocation: '$INSTALL_DIR',
      lastUpdated: '$TIMESTAMP'
    };
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
  "
else
  echo "{\"$MARKETPLACE_NAME\":{\"source\":{\"source\":\"github\",\"repo\":\"$REPO\"},\"installLocation\":\"$INSTALL_DIR\",\"lastUpdated\":\"$TIMESTAMP\"}}" > "$KNOWN_FILE"
fi
info "Registered marketplace: $MARKETPLACE_NAME"

# --- Step 3: Register plugin in installed_plugins.json ---
INSTALLED_FILE="$PLUGINS_DIR/installed_plugins.json"

if [ -f "$INSTALLED_FILE" ]; then
  node -e "
    const fs = require('fs');
    const f = '$INSTALLED_FILE';
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    if (!data.plugins) data.plugins = {};
    data.plugins['$PLUGIN_NAME@$MARKETPLACE_NAME'] = [{
      scope: 'user',
      installPath: '$INSTALL_DIR/plugins/$PLUGIN_NAME',
      version: '$PLUGIN_VERSION',
      installedAt: '$TIMESTAMP',
      lastUpdated: '$TIMESTAMP'
    }];
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
  "
else
  echo "{\"version\":2,\"plugins\":{\"$PLUGIN_NAME@$MARKETPLACE_NAME\":[{\"scope\":\"user\",\"installPath\":\"$INSTALL_DIR/plugins/$PLUGIN_NAME\",\"version\":\"$PLUGIN_VERSION\",\"installedAt\":\"$TIMESTAMP\",\"lastUpdated\":\"$TIMESTAMP\"}]}}" > "$INSTALLED_FILE"
fi
info "Registered plugin: $PLUGIN_NAME@$MARKETPLACE_NAME"

# --- Step 4: Enable plugin in settings.json ---
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

if [ -f "$SETTINGS_FILE" ]; then
  node -e "
    const fs = require('fs');
    const f = '$SETTINGS_FILE';
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    if (!data.enabledPlugins) data.enabledPlugins = {};
    data.enabledPlugins['$PLUGIN_NAME@$MARKETPLACE_NAME'] = true;
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
  "
else
  echo "{\"enabledPlugins\":{\"$PLUGIN_NAME@$MARKETPLACE_NAME\":true}}" > "$SETTINGS_FILE"
fi
info "Enabled plugin: $PLUGIN_NAME@$MARKETPLACE_NAME"

# --- Step 5: Install MCP server dependencies ---
MCP_DIR="$INSTALL_DIR/plugins/$PLUGIN_NAME/mcp-wkai"
MCP_INDEX="$MCP_DIR/index.js"
if [ -d "$MCP_DIR" ]; then
  info "Installing MCP server dependencies ..."
  cd "$MCP_DIR" && npm install --silent 2>/dev/null
  info "MCP server dependencies installed"
else
  warn "MCP server directory not found: $MCP_DIR"
fi

# --- Step 6: Configure MCP server globally in ~/.claude.json ---
CLAUDE_JSON="$HOME/.claude.json"
if [ -f "$CLAUDE_JSON" ] && [ -f "$MCP_INDEX" ]; then
  node -e "
    const fs = require('fs');
    const f = '$CLAUDE_JSON';
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    if (!data.mcpServers) data.mcpServers = {};
    data.mcpServers['wkai-api'] = {
      type: 'stdio',
      command: 'node',
      args: ['$MCP_INDEX'],
      env: {}
    };
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
  "
  info "Configured wkai-api MCP server globally"
else
  warn "Skipped MCP server configuration"
fi

# --- Done ---
echo ""
info "========================================="
info " Installation complete!"
info "========================================="
echo ""
info "Restart Claude Code, then run:"
echo ""
echo "  /wkai-stats:wkai-stats     # Query token usage and submit to wk.ai"
echo ""
