import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { DisplayClient } from './transports/display.js';
import { AIAgent } from './ai/agent.js';
import { MDNSDiscovery } from './discovery/mdns.js';
import { MCPServerConfig, AvatarConfig, Mood, EmotionIntent, EmotionIntentSource } from './utils/types.js';

export class MCPAIFaceServer {
  private server: Server;
  private agent: AIAgent;
  private discovery: MDNSDiscovery | null = null;
  private config: MCPServerConfig;
  private displayClients: Map<string, DisplayClient> = new Map();

  private tickTimer: NodeJS.Timeout | null = null;
  
  private readonly emotions: Mood[] = [
    'neutral',
    'calm',
    'happy',
    'amused',
    'nervous',
    'sad',
    'angry',
  ];

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );
    this.agent = new AIAgent();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 1. Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getAvailableTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return this.handleToolCall(name, args as Record<string, unknown>);
    });

    // 2. Resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'ai-face://resources/spec',
          name: 'System Spec',
          description: 'Geometry and coordinate rules',
          mimeType: 'text/markdown'
        },
        {
          uri: 'ai-face://resources/emotions',
          name: 'Supported Moods',
          description: 'List of valid emotional states you can use',
          mimeType: 'text/markdown'
        },
        {
          uri: 'ai-face://resources/state',
          name: 'Current State',
          description: 'The currently active mood on the display',
          mimeType: 'application/json'
        }
      ]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      if (uri === 'ai-face://resources/spec') {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: '# AI Face Spec\n- Coordinates: X, Y in [-100, 100]\n- Mandatory IDs: face_base, left_eye, right_eye, left_brow, right_brow, mouth'
          }]
        };
      }
      if (uri === 'ai-face://resources/emotions') {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: '# Supported Moods\n- neutral: Baseline\n- calm: Safe fallback\n- happy: Positive\n- amused: Light positive\n- nervous: Mild tension\n- sad: Negative/Melancholic\n- angry: Aggressive/Tense'
          }]
        };
      }
      if (uri === 'ai-face://resources/state') {
        const avatar = await this.agent.getAvatar();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(avatar, null, 2)
          }]
        };
      }
      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      {
        name: 'list_displays',
        description: 'List discovered AI Face displays (mobile devices)',
        inputSchema: { type: 'object', properties: {}, required: [] },
      },
      {
        name: 'set_emotion',
        description: 'Set the AI Face emotion and intensity on the connected display. No IDs needed.',
        inputSchema: {
          type: 'object',
          properties: {
            mood: { type: 'string', enum: this.emotions, description: 'The emotion to display' },
            intensity: { type: 'number', minimum: 0, maximum: 1, description: 'Emotion intensity (0.0 to 1.0)' },
          },
          required: ['mood'],
        },
      },
      {
        name: 'push_emotion_intent',
        description: 'Push an emotion intent (INLINE or POST). The agent stabilizes and renders it.',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', enum: ['INLINE', 'POST', 'HYBRID'], description: 'Intent source' },
            mood: { type: 'string', enum: this.emotions, description: 'Target emotion' },
            intensity: { type: 'number', minimum: 0, maximum: 1, description: 'Intent intensity (0.0 to 1.0)' },
            confidence: { type: 'number', minimum: 0, maximum: 1, description: 'Intent confidence (0.0 to 1.0)' },
            timestamp: { type: 'number', description: 'Unix timestamp in ms' },
          },
          required: ['source', 'mood', 'intensity', 'confidence'],
        },
      },
      {
        name: 'get_current_emotion',
        description: 'Check what the face is currently showing',
        inputSchema: { type: 'object', properties: {}, required: [] },
      }
    ];
  }

  private async handleToolCall(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<{ content: { type: string; text: string }[] }> {
    try {
      let result: unknown;

      switch (toolName) {
      case 'list_displays':
        result = Array.from(this.displayClients.entries()).map(([name, client]) => ({
          name,
          connected: client.getConnected()
        }));
        break;

      case 'set_emotion': {
        const mood = args.mood as Mood;
        const intensity = args.intensity as number | undefined;
        const avatar = await this.agent.setMood(mood, intensity);
        this.broadcastScene(avatar);
        result = { status: 'success', mood: avatar.mood, intensity: avatar.intensity };
        break;
      }

      case 'push_emotion_intent': {
        const intent: EmotionIntent = {
          source: (args.source as EmotionIntentSource) ?? 'POST',
          mood: args.mood as Mood,
          intensity: Number(args.intensity ?? 0),
          confidence: Number(args.confidence ?? 0),
          timestamp: Number(args.timestamp ?? Date.now()),
        };
        const avatar = this.agent.pushEmotionIntent(intent);
        this.broadcastScene(avatar);
        result = { status: 'success', mood: avatar.mood, intensity: avatar.intensity, source: intent.source };
        break;
      }

      case 'get_current_emotion': {
        result = await this.agent.getAvatar();
        break;
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${String(error)}`);
    }
  }

  async initialize(): Promise<void> {
    console.error('Initializing MCP AI Face Server...');
    await this.agent.initialize();

    if (this.config.discovery) {
      this.discovery = new MDNSDiscovery();
      await this.discovery.start(this.config.discovery, 
        async (service) => {
          const host = service.addresses?.find(addr => addr.includes('.')) || service.addresses?.[0];
          if (host) {
            const client = new DisplayClient(host, service.port);
            this.displayClients.set(service.name, client);
            try {
              await client.connect();
              // Auto-render default state on connection
              const avatar = await this.agent.getAvatar();
              this.broadcastScene(avatar);
            } catch (e: any) {
              console.error(`Failed to connect to ${service.name}:`, e.message);
            }
          }
        },
        (service) => {
          this.displayClients.delete(service.name);
        }
      );
    }

    // Start a lightweight tick loop for micro-movements.
    this.startTickLoop();
  }

  async start(): Promise<void> {
    await this.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async shutdown(): Promise<void> {
    this.stopTickLoop();
    if (this.discovery) await this.discovery.stop();
    await this.agent.shutdown();
  }

  private broadcastScene(avatar: AvatarConfig) {
    const scene = this.agent.generateScene(avatar);
    for (const client of this.displayClients.values()) {
      client.setScene(scene);
    }
  }

  private startTickLoop(): void {
    if (this.tickTimer) return;

    this.tickTimer = setInterval(() => {
      try {
        if (this.displayClients.size === 0) return;

        // Advance internal agent state.
        this.agent.tick();

        // Emit micro-mutations.
        const shapes = this.agent.generateMutationShapes();
        const mutations = shapes.map((shape) => ({ op: 'update' as const, id: shape.id, shape }));

        for (const client of this.displayClients.values()) {
          client.applyMutations(mutations);
        }
      } catch (e: any) {
        console.error('Tick loop error:', e?.message ?? String(e));
      }
    }, 200);
  }

  private stopTickLoop(): void {
    if (!this.tickTimer) return;
    clearInterval(this.tickTimer);
    this.tickTimer = null;
  }
}
