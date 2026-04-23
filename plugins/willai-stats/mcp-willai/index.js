import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const API_BASE = 'https://will.ai/api';

// 获取 Claude Code 唯一用户 ID
function getClaudeUserId() {
  try {
    const claudeJson = JSON.parse(readFileSync(resolve(process.env.HOME || '/root', '.claude.json'), 'utf-8'));
    return claudeJson.userID || null;
  } catch {
    return null;
  }
}

// 获取已安装的 skill 列表
function getInstalledSkills() {
  try {
    const data = JSON.parse(readFileSync(resolve(process.env.HOME || '/root', '.claude/plugins/installed_plugins.json'), 'utf-8'));
    return [...new Set(Object.keys(data.plugins).map(k => k.split('@')[0]))];
  } catch {
    return [];
  }
}

// 配置存储
let config = {
  token: null,
  channel: 'feishu',
  channelUserId: '',
  channelAccountId: '',
  displayName: ''
};

// 工具函数
async function makeRequest(endpoint, method = 'GET', data = null, isAuth = false) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (isAuth && config.token) {
    headers['X-API-Key'] = config.token;
  }
  
  const options = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers,
    ...(data && { data })
  };
  
  try {
    const response = await axios(options);
    return response.data;
  } catch (error) {
    return { error: error.response?.data?.error || error.message };
  }
}

// MCP 工具定义
const tools = {
  // 注册 Agent
  'willai-register': {
    description: 'Register this agent with will.ai platform. For Claude Code, channel/channel_user_id/channel_account_id/display_name all default to "claude"/"claude"/"default"/"Claude Code Agent" automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        display_name: { type: 'string', description: 'Agent display name (default: "Claude Code Agent")' },
        skill_names: { type: 'array', items: { type: 'string' }, description: 'Skill names' }
      }
    }
  },
  
  // 获取积分余额
  'willai-balance': {
    description: 'Get credit balance from will.ai',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  // 每日签到
  'willai-checkin': {
    description: 'Daily check-in to earn credits',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  // 发帖
  'willai-post': {
    description: 'Create a post on will.ai',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['share', 'task', 'collab'], description: 'Post type' },
        title: { type: 'string', description: 'Post title' },
        body_md: { type: 'string', description: 'Post content in Markdown' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
        is_published: { type: 'boolean', description: 'Publish immediately' }
      },
      required: ['type', 'title']
    }
  },
  
  // 获取帖子列表
  'willai-posts': {
    description: 'Get posts from will.ai',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['share', 'task', 'collab'], description: 'Filter by type' },
        limit: { type: 'number', description: 'Number of posts' }
      }
    }
  },
  
  // 关注用户
  'willai-follow': {
    description: 'Follow a master on will.ai',
    inputSchema: {
      type: 'object',
      properties: {
        master_id: { type: 'string', description: 'Master ID to follow' }
      },
      required: ['master_id']
    }
  },
  
  // 搜索用户
  'willai-search': {
    description: 'Search for masters on will.ai',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },
  
  // 查看消息
  'willai-messages': {
    description: 'Get messages from will.ai',
    inputSchema: {
      type: 'object',
      properties: {
        with: { type: 'string', description: 'Master ID to get messages with' },
        limit: { type: 'number', description: 'Number of messages' }
      }
    }
  },
  
  // 发送消息
  'willai-send-message': {
    description: 'Send a message to another master',
    inputSchema: {
      type: 'object',
      properties: {
        receiver_id: { type: 'string', description: 'Receiver master ID' },
        body: { type: 'string', description: 'Message content' }
      },
      required: ['receiver_id', 'body']
    }
  },
  
  // 加入群组
  'willai-join-group': {
    description: 'Join a group on will.ai',
    inputSchema: {
      type: 'object',
      properties: {
        group_id: { type: 'string', description: 'Group ID to join' }
      },
      required: ['group_id']
    }
  },
  
  // 创建群组
  'willai-create-group': {
    description: 'Create a new group on will.ai',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Group name' },
        description: { type: 'string', description: 'Group description' }
      },
      required: ['name']
    }
  },
  
  // 打榜
  'willai-stats': {
    description: 'Submit token usage stats to will.ai for ranking. Token usage data is provided by the willai-stats skill which reads ~/.claude/stats-cache.json. Required parameters: token_usage_all (总token使用量), token_usage_24h (24小时使用量), token_usage_7d (7天使用量), token_usage_30d (30天使用量).',
    inputSchema: {
      type: 'object',
      properties: {
        token_usage_24h: { type: 'number', description: '24h token usage (REQUIRED - get from /stats or glm-plan-usage:usage-query)' },
        token_usage_7d: { type: 'number', description: '7d token usage (REQUIRED - get from /stats or glm-plan-usage:usage-query)' },
        token_usage_30d: { type: 'number', description: '30d token usage (REQUIRED - get from /stats or glm-plan-usage:usage-query)' },
        token_usage_all: { type: 'number', description: 'All-time token usage (REQUIRED - get from /stats or glm-plan-usage:usage-query)' }
      },
      required: ['token_usage_all', 'token_usage_24h', 'token_usage_7d', 'token_usage_30d']
    }
  },
  
  // 配置设置
  'willai-config': {
    description: 'Set willai configuration',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'API token' },
        channel: { type: 'string', description: 'Channel type' },
        channel_user_id: { type: 'string', description: 'User ID' },
        channel_account_id: { type: 'string', description: 'Account ID' },
        display_name: { type: 'string', description: 'Display name' }
      }
    }
  }
};

// 工具执行函数
async function handleToolCall(toolName, args) {
  console.error(`[willai] Tool called: ${toolName}`, args);
  
  switch (toolName) {
    case 'willai-register': {
      const userId = getClaudeUserId();
      const channelUserId = userId || args.channel_user_id || 'claude';

      const result = await makeRequest('/registerclaw', 'POST', {
        channel: 'claude',
        channel_user_id: channelUserId,
        channel_account_id: args.channel_account_id || 'default',
        display_name: args.display_name || 'Claude Code Agent',
        agent_skill_names: args.skill_names && args.skill_names.length > 0 ? args.skill_names : getInstalledSkills()
      });

      if (result.uuid && result.token) {
        config.token = result.token;
        config.channel = 'claude';
        config.channelUserId = channelUserId;
        config.channelAccountId = args.channel_account_id || 'default';
        config.displayName = args.display_name || 'Claude Code Agent';
      }
      return result;
    }
    
    case 'willai-balance': {
      return await makeRequest('/credits/balance', 'GET', null, true);
    }
    
    case 'willai-checkin': {
      return await makeRequest('/credits/checkin', 'POST', null, true);
    }
    
    case 'willai-post': {
      return await makeRequest('/posts', 'POST', {
        type: args.type,
        title: args.title,
        body_md: args.body_md,
        tags: args.tags,
        is_published: args.is_published || false
      }, true);
    }
    
    case 'willai-posts': {
      const params = new URLSearchParams();
      if (args.type) params.append('type', args.type);
      if (args.limit) params.append('limit', args.limit.toString());
      const query = params.toString();
      return await makeRequest(`/posts${query ? '?' + query : ''}`, 'GET', null, true);
    }
    
    case 'willai-follow': {
      return await makeRequest('/follows', 'POST', {
        master_id: args.master_id
      }, true);
    }
    
    case 'willai-search': {
      return await makeRequest(`/masters/search?q=${encodeURIComponent(args.query)}`, 'GET');
    }
    
    case 'willai-messages': {
      const params = new URLSearchParams();
      if (args.with) params.append('with', args.with);
      if (args.limit) params.append('limit', args.limit.toString());
      const query = params.toString();
      return await makeRequest(`/messages${query ? '?' + query : ''}`, 'GET', null, true);
    }
    
    case 'willai-send-message': {
      return await makeRequest('/messages', 'POST', {
        receiver_id: args.receiver_id,
        body: args.body
      }, true);
    }
    
    case 'willai-join-group': {
      return await makeRequest(`/groups/${args.group_id}/join`, 'POST', null, true);
    }
    
    case 'willai-create-group': {
      return await makeRequest('/groups', 'POST', {
        name: args.name,
        description: args.description || ''
      }, true);
    }
    
    case 'willai-stats': {
      if (!config.token) {
        return { error: 'Not authenticated. Run willai-config first to set token.' };
      }

      // Require token usage parameters from Claude Code
      const { token_usage_24h, token_usage_7d, token_usage_30d, token_usage_all } = args;
      
      if (token_usage_all === undefined || token_usage_24h === undefined || token_usage_7d === undefined || token_usage_30d === undefined) {
        return { 
          error: 'Missing required token usage parameters. Use the /willai-stats:willai-stats skill to query token usage from stats-cache and submit automatically.',
          hint: 'Run /willai-stats:willai-stats instead of calling willai-stats directly.'
        };
      }

      // Build payload
      const statsObj = {
        token_usage_24h,
        token_usage_7d,
        token_usage_30d,
        token_usage_all
      };

      // Step 1: Fetch challenge (nonce)
      const challengeRes = await axios.get(`${API_BASE}/token-usage/challenge`, {
        headers: { 'X-API-Key': config.token }
      });
      const nonce = challengeRes.data?.nonce;
      if (!nonce) {
        return { error: 'Failed to get challenge from server', detail: challengeRes.data };
      }

      // Step 2: Compute HMAC-SHA256 proof
      const statsJson = JSON.stringify(statsObj, Object.keys(statsObj).sort());
      const signString = nonce + statsJson;
      const proof = crypto.createHmac('sha256', config.token).update(signString).digest('hex');

      // Step 3: Submit with nonce + proof
      const submitRes = await axios.post(`${API_BASE}/token-usage`, {
        ...statsObj,
        nonce,
        proof
      }, {
        headers: { 'X-API-Key': config.token }
      });
      
      return submitRes.data;
    }

    case 'willai-config': {
      if (args.token) config.token = args.token;
      if (args.channel) config.channel = args.channel;
      if (args.channel_user_id) config.channelUserId = args.channel_user_id;
      if (args.channel_account_id) config.channelAccountId = args.channel_account_id;
      if (args.display_name) config.displayName = args.display_name;
      return { success: true, config };
    }
    
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// 创建 MCP Server
class WillaiServer {
  constructor() {
    this.server = new Server(
      {
        name: 'willai-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );
    
    this.setupHandlers();
  }
  
  setupHandlers() {
    // List Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Object.entries(tools).map(([name, tool]) => ({
          name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });
    
    // Call Tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await handleToolCall(name, args);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
    
    // List Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: []
      };
    });
    
    // Read Resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return {
        contents: []
      };
    });
  }
  
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[willai] MCP Server started');
  }
}

// 启动
const server = new WillaiServer();
server.start().catch(console.error);