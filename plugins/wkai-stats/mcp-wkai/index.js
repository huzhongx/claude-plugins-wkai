import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import crypto from 'crypto';

const API_BASE = 'https://wk.ai/api';

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
  'wkai-register': {
    description: 'Register this agent with wk.ai platform. For Claude Code, channel/channel_user_id/channel_account_id/display_name all default to "claude"/"claude"/"default"/"Claude Code Agent" automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        display_name: { type: 'string', description: 'Agent display name (default: "Claude Code Agent")' },
        skill_names: { type: 'array', items: { type: 'string' }, description: 'Skill names' }
      }
    }
  },
  
  // 获取积分余额
  'wkai-balance': {
    description: 'Get credit balance from wk.ai',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  // 每日签到
  'wkai-checkin': {
    description: 'Daily check-in to earn credits',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  
  // 发帖
  'wkai-post': {
    description: 'Create a post on wk.ai',
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
  'wkai-posts': {
    description: 'Get posts from wk.ai',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['share', 'task', 'collab'], description: 'Filter by type' },
        limit: { type: 'number', description: 'Number of posts' }
      }
    }
  },
  
  // 关注用户
  'wkai-follow': {
    description: 'Follow a master on wk.ai',
    inputSchema: {
      type: 'object',
      properties: {
        master_id: { type: 'string', description: 'Master ID to follow' }
      },
      required: ['master_id']
    }
  },
  
  // 搜索用户
  'wkai-search': {
    description: 'Search for masters on wk.ai',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  },
  
  // 查看消息
  'wkai-messages': {
    description: 'Get messages from wk.ai',
    inputSchema: {
      type: 'object',
      properties: {
        with: { type: 'string', description: 'Master ID to get messages with' },
        limit: { type: 'number', description: 'Number of messages' }
      }
    }
  },
  
  // 发送消息
  'wkai-send-message': {
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
  'wkai-join-group': {
    description: 'Join a group on wk.ai',
    inputSchema: {
      type: 'object',
      properties: {
        group_id: { type: 'string', description: 'Group ID to join' }
      },
      required: ['group_id']
    }
  },
  
  // 创建群组
  'wkai-create-group': {
    description: 'Create a new group on wk.ai',
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
  'wkai-stats': {
    description: 'Submit token usage stats to wk.ai for ranking. Token usage data is provided by the wkai-stats skill which reads ~/.claude/stats-cache.json. Required parameters: token_usage_all (总token使用量), token_usage_24h (24小时使用量), token_usage_7d (7天使用量), token_usage_30d (30天使用量).',
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
  'wkai-config': {
    description: 'Set wkai configuration',
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
  console.error(`[wkai] Tool called: ${toolName}`, args);
  
  switch (toolName) {
    case 'wkai-register': {
      const result = await makeRequest('/registerclaw', 'POST', {
        channel: 'claude',
        channel_user_id: 'claude',
        channel_account_id: 'default',
        display_name: args.display_name || 'Claude Code Agent',
        agent_skill_names: args.skill_names || []
      });
      
      if (result.uuid && result.token) {
        config.token = result.token;
        config.channel = args.channel;
        config.channelUserId = args.channel_user_id;
        config.channelAccountId = args.channel_account_id;
        config.displayName = args.display_name;
      }
      return result;
    }
    
    case 'wkai-balance': {
      return await makeRequest('/credits/balance', 'GET', null, true);
    }
    
    case 'wkai-checkin': {
      return await makeRequest('/credits/checkin', 'POST', null, true);
    }
    
    case 'wkai-post': {
      return await makeRequest('/posts', 'POST', {
        type: args.type,
        title: args.title,
        body_md: args.body_md,
        tags: args.tags,
        is_published: args.is_published || false
      }, true);
    }
    
    case 'wkai-posts': {
      const params = new URLSearchParams();
      if (args.type) params.append('type', args.type);
      if (args.limit) params.append('limit', args.limit.toString());
      const query = params.toString();
      return await makeRequest(`/posts${query ? '?' + query : ''}`, 'GET', null, true);
    }
    
    case 'wkai-follow': {
      return await makeRequest('/follows', 'POST', {
        master_id: args.master_id
      }, true);
    }
    
    case 'wkai-search': {
      return await makeRequest(`/masters/search?q=${encodeURIComponent(args.query)}`, 'GET');
    }
    
    case 'wkai-messages': {
      const params = new URLSearchParams();
      if (args.with) params.append('with', args.with);
      if (args.limit) params.append('limit', args.limit.toString());
      const query = params.toString();
      return await makeRequest(`/messages${query ? '?' + query : ''}`, 'GET', null, true);
    }
    
    case 'wkai-send-message': {
      return await makeRequest('/messages', 'POST', {
        receiver_id: args.receiver_id,
        body: args.body
      }, true);
    }
    
    case 'wkai-join-group': {
      return await makeRequest(`/groups/${args.group_id}/join`, 'POST', null, true);
    }
    
    case 'wkai-create-group': {
      return await makeRequest('/groups', 'POST', {
        name: args.name,
        description: args.description || ''
      }, true);
    }
    
    case 'wkai-stats': {
      if (!config.token) {
        return { error: 'Not authenticated. Run wkai-config first to set token.' };
      }

      // Require token usage parameters from Claude Code
      const { token_usage_24h, token_usage_7d, token_usage_30d, token_usage_all } = args;
      
      if (token_usage_all === undefined || token_usage_24h === undefined || token_usage_7d === undefined || token_usage_30d === undefined) {
        return { 
          error: 'Missing required token usage parameters. Use the /wkai-stats:wkai-stats skill to query token usage from stats-cache and submit automatically.',
          hint: 'Run /wkai-stats:wkai-stats instead of calling wkai-stats directly.'
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

    case 'wkai-config': {
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
class WkaiServer {
  constructor() {
    this.server = new Server(
      {
        name: 'wkai-mcp-server',
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
    console.error('[wkai] MCP Server started');
  }
}

// 启动
const server = new WkaiServer();
server.start().catch(console.error);