// NOTE: This is the public emotion set used by MCP tools.
// It matches the Emotional Interface docs under docs/emotional-interface/*.
export type Mood = 'neutral' | 'calm' | 'happy' | 'amused' | 'nervous' | 'sad' | 'angry';

export type EmotionIntentSource = 'INLINE' | 'POST' | 'HYBRID';

export interface EmotionIntent {
  source: EmotionIntentSource;
  mood: Mood;
  intensity: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
  timestamp: number; // unix ms
}

export interface ShapeTransform {
  x: number;
  y: number;
  rotation: number;
}

export interface ShapeStyle {
  fill?: string | null;
  stroke?: string | null;
  strokeWidth: number;
  opacity: number;
}

export interface Shape {
  id: string;
  type: 'circle' | 'ellipse' | 'rect' | 'line' | 'triangle' | 'arc';
  transform: ShapeTransform;
  style: ShapeStyle;
  props: Record<string, unknown>;
}

export interface SceneDocument {
  schema: 'ai-face.v1';
  scene: Shape[];
}

export interface Mutation {
  op: 'add' | 'update' | 'remove';
  id: string;
  shape?: Shape;
}

export interface AvatarConfig {
  id: string;
  name: string;
  mood: Mood;
  intensity: number; // 0.0 - 1.0
}

export interface AgentState {
  isRunning: boolean;
  lastUpdate: Date;
  currentTask?: string;
  mood: Mood;
}

export interface DiscoveryConfig {
  serviceName: string;
  port: number;
  protocol?: 'tcp' | 'udp';
  ttl?: number;
}

export interface TransportConfig {
  type: 'stdio' | 'websocket';
  port?: number;
  host?: string;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  discovery?: DiscoveryConfig;
  transport: TransportConfig;
}
