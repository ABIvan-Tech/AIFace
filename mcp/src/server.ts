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
import {
  MCPServerConfig,
  AvatarConfig,
  Mood,
  EmotionIntent,
  EmotionIntentSource,
  SceneDocument,
  SceneDeliverySummary,
} from './utils/types.js';

export class MCPAIFaceServer {
  private server: Server;
  private agent: AIAgent;
  private discovery: MDNSDiscovery | null = null;
  private config: MCPServerConfig;
  private displayClients: Map<string, DisplayClient> = new Map();
  private currentSceneVersion = 0;
  private lastScene: SceneDocument | null = null;
  private lastAvatar: AvatarConfig | null = null;

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

  private readonly emotionInputs = [...this.emotions, 'joy'] as const;

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
    this.agent = new AIAgent({ decaySeconds: config.decaySeconds });
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
          description: 'Display transport contract and geometry rules',
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
            text: [
              '# AI Face Display Contract',
              '- Envelope schema: `ai-face.v1`',
              '- Coordinates: X, Y in `[-100, 100]`',
              '- Mandatory IDs: `face_base`, `left_eye`, `right_eye`, `left_brow`, `right_brow`, `mouth`',
              '- `set_scene` payload: `{ scene: SceneDocument, mood?, intensity?, sceneVersion }`',
              '- `apply_mutations` payload: `{ mutations: Mutation[], sceneVersion }`',
              '- Displays should ACK authoritative frames with `type: "ack"` and matching `sceneVersion`',
            ].join('\n')
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
            text: JSON.stringify({
              avatar,
              sceneVersion: this.currentSceneVersion,
              displays: Array.from(this.displayClients.entries()).map(([name, client]) => ({
                name,
                ...client.getStatus(),
              })),
            }, null, 2)
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
        name: 'connect_display',
        description: 'Connect to a display manually when mDNS discovery is unavailable.',
        inputSchema: {
          type: 'object',
          properties: {
            host: { type: 'string', description: 'Display host or IP address' },
            port: { type: 'number', minimum: 1, maximum: 65535, description: 'Display WebSocket port' },
          },
          required: ['host', 'port'],
        },
      },
      {
        name: 'set_emotion',
        description: 'Set the AI Face emotion and intensity on the connected display. No IDs needed.',
        inputSchema: {
          type: 'object',
          properties: {
            mood: { type: 'string', enum: this.emotionInputs, description: 'The emotion to display (`joy` maps to `happy`)' },
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
            mood: { type: 'string', enum: this.emotionInputs, description: 'Target emotion (`joy` is normalized to `happy`)' },
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
          ...client.getStatus(),
        }));
        break;

      case 'connect_display': {
        const host = String(args.host ?? '').trim();
        const port = Number(args.port ?? 0);
        if (!host) {
          throw new McpError(ErrorCode.InvalidParams, 'connect_display requires a non-empty host');
        }
        if (!Number.isInteger(port) || port <= 0 || port > 65535) {
          throw new McpError(ErrorCode.InvalidParams, 'connect_display requires a valid port between 1 and 65535');
        }

        const key = `manual:${host}:${port}`;
        const client = await this.connectDisplayClient(key, host, port);
        result = {
          status: client.getConnected() ? 'success' : 'warning',
          name: key,
          ...client.getStatus(),
        };
        break;
      }

      case 'set_emotion': {
        const requestedMood = String(args.mood ?? '');
        const mood = normalizeMoodInput(args.mood);
        const intensity = args.intensity as number | undefined;
        const avatar = await this.agent.setMood(mood, intensity);
        const delivery = await this.broadcastScene(avatar);
        result = {
          status: delivery.deliveredTo > 0 ? 'success' : 'warning',
          requestedMood,
          effectiveMood: avatar.mood,
          effectiveIntensity: avatar.intensity,
          ...delivery,
        };
        break;
      }

      case 'push_emotion_intent': {
        const requestedMood = String(args.mood ?? '');
        const intent: EmotionIntent = {
          source: (args.source as EmotionIntentSource) ?? 'POST',
          mood: normalizeMoodInput(args.mood),
          intensity: Number(args.intensity ?? 0),
          confidence: Number(args.confidence ?? 0),
          timestamp: Number(args.timestamp ?? Date.now()),
        };
        const avatar = this.agent.pushEmotionIntent(intent);
        const delivery = await this.broadcastScene(avatar);
        result = {
          status: delivery.deliveredTo > 0 ? 'success' : 'warning',
          source: intent.source,
          requestedMood,
          effectiveMood: avatar.mood,
          effectiveIntensity: avatar.intensity,
          ...delivery,
        };
        break;
      }

      case 'get_current_emotion': {
        result = {
          avatar: await this.agent.getAvatar(),
          sceneVersion: this.currentSceneVersion,
          displays: Array.from(this.displayClients.entries()).map(([name, client]) => ({
            name,
            ...client.getStatus(),
          })),
        };
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
            try {
              await this.connectDisplayClient(service.name, host, service.port);
            } catch (e: any) {
              console.error(`Failed to connect to ${service.name}:`, e.message);
            }
          }
        },
        (service) => {
          const client = this.displayClients.get(service.name);
          client?.disconnect();
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

  private async broadcastScene(avatar: AvatarConfig): Promise<SceneDeliverySummary> {
    const sceneVersion = this.currentSceneVersion + 1;
    this.currentSceneVersion = sceneVersion;
    const scene = this.agent.generateScene(avatar);
    this.lastScene = scene;
    this.lastAvatar = avatar;

    const connectedClients = Array.from(this.displayClients.values()).filter((client) => client.getConnected());
    if (connectedClients.length === 0) {
      return {
        sceneVersion,
        connectedDisplays: 0,
        deliveredTo: 0,
        ackedBy: 0,
        warnings: ['No connected displays'],
      };
    }

    const acknowledgements = await Promise.all(
      connectedClients.map((client) => client.setScene(scene, avatar, sceneVersion)),
    );
    const ackedBy = acknowledgements.filter(Boolean).length;

    return {
      sceneVersion,
      connectedDisplays: connectedClients.length,
      deliveredTo: connectedClients.length,
      ackedBy,
      warnings:
        ackedBy === connectedClients.length
          ? []
          : [`${connectedClients.length - ackedBy} display(s) did not acknowledge scene v${sceneVersion}`],
    };
  }

  private startTickLoop(): void {
    if (this.tickTimer) return;

    this.tickTimer = setInterval(() => {
      try {
        this.agent.tick();

        if (this.currentSceneVersion === 0) return;

        const connectedClients = Array.from(this.displayClients.values()).filter((client) => client.getConnected());
        if (connectedClients.length === 0) return;

        // Emit micro-mutations.
        const shapes = this.agent.generateMutationShapes();
        const mutations = shapes.map((shape) => ({ op: 'update' as const, id: shape.id, shape }));

        for (const client of connectedClients) {
          client.applyMutations(mutations, this.currentSceneVersion);
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

  private async connectDisplayClient(name: string, host: string, port: number): Promise<DisplayClient> {
    let client = this.displayClients.get(name);
    if (!client) {
      client = new DisplayClient(host, port);
      client.onConnected = async () => {
        try {
          await this.syncClient(name, client!);
        } catch (error) {
          console.error(`Failed to synchronize ${name}:`, String(error));
        }
      };
      client.onAck = (ack) => {
        console.error(
          `[MCP] ACK from ${name}: type=${ack.ackType}, status=${ack.status}, sceneVersion=${ack.sceneVersion ?? 'n/a'}${ack.reason ? `, reason=${ack.reason}` : ''}`,
        );
      };
      this.displayClients.set(name, client);
    }

    await client.connect();
    return client;
  }

  private async syncClient(name: string, client: DisplayClient): Promise<void> {
    if (!this.lastAvatar || !this.lastScene) {
      this.lastAvatar = await this.agent.getAvatar();
      this.lastScene = this.agent.generateScene(this.lastAvatar);
      if (this.currentSceneVersion === 0) {
        this.currentSceneVersion = 1;
      }
    }

    client.reset('authoritative_state_sync', this.currentSceneVersion);
    const acked = await client.setScene(this.lastScene, this.lastAvatar, this.currentSceneVersion);
    console.error(`[MCP] Synchronized ${name} with scene v${this.currentSceneVersion} (acked=${acked})`);
  }
}

const normalizeMoodInput = (value: unknown): Mood => {
  const mood = String(value ?? '').trim().toLowerCase();
  if (mood === 'joy') return 'happy';
  if (
    mood === 'neutral' ||
    mood === 'calm' ||
    mood === 'happy' ||
    mood === 'amused' ||
    mood === 'nervous' ||
    mood === 'sad' ||
    mood === 'angry'
  ) {
    return mood;
  }
  throw new McpError(ErrorCode.InvalidParams, `Unsupported mood: ${String(value)}`);
};
