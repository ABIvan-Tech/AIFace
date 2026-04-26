import { WebSocket, type RawData } from 'ws';
import {
  SceneDocument,
  Mutation,
  AvatarConfig,
  DisplayAckPayload,
  DisplayClientStatus,
} from '../utils/types.js';

interface PendingSceneAck {
  resolve: (acked: boolean) => void;
  timeout: NodeJS.Timeout;
}

export class DisplayClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private manuallyDisconnected = false;
  private lastError: string | null = null;
  private lastSeenAt: number | null = null;
  private lastAckAt: number | null = null;
  private lastAckType: DisplayAckPayload['ackType'] | null = null;
  private lastAckSceneVersion: number | null = null;
  private readonly pendingSceneAcks = new Map<number, PendingSceneAck>();

  public onConnected?: () => void | Promise<void>;
  public onAck?: (ack: DisplayAckPayload) => void;

  constructor(host: string, port: number) {
    this.url = `ws://${host}:${port}/`;
  }

  public getConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  public getStatus(): DisplayClientStatus {
    return {
      url: this.url,
      connected: this.getConnected(),
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError,
      lastSeenAt: this.lastSeenAt,
      lastAckAt: this.lastAckAt,
      lastAckType: this.lastAckType,
      lastAckSceneVersion: this.lastAckSceneVersion,
    };
  }

  async connect(): Promise<void> {
    if (this.getConnected()) return;
    if (this.connectionPromise) return this.connectionPromise;

    this.manuallyDisconnected = false;
    this.clearReconnectTimer();

    this.connectionPromise = new Promise((resolve, reject) => {
      let settled = false;

      const finishResolve = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const finishReject = (error: Error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      try {
        console.error(`Attempting to connect to display at ${this.url}...`);
        this.ws = new WebSocket(this.url);

        const timeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.terminate();
            this.lastError = `Connection timeout to ${this.url}`;
            this.connectionPromise = null;
            finishReject(new Error(this.lastError));
          }
        }, 5000);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.connectionPromise = null;
          this.reconnectAttempts = 0;
          this.lastError = null;
          this.lastSeenAt = Date.now();
          console.error(`SUCCESS: Connected to display at ${this.url}`);
          this.sendHello();
          finishResolve();
          if (this.onConnected) {
            void Promise.resolve(this.onConnected()).catch((error) => {
              console.error(`ERROR: onConnected handler failed for ${this.url}:`, String(error));
            });
          }
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          const wasConnected = this.isConnected;
          this.isConnected = false;
          this.connectionPromise = null;
          this.lastSeenAt = Date.now();
          this.rejectPendingSceneAcks(false);
          console.error(`INFO: Disconnected from display at ${this.url}. Code: ${code}, Reason: ${reason}`);
          if (!settled) {
            finishReject(new Error(`Connection closed before readyState OPEN for ${this.url}`));
          }
          if (wasConnected && !this.manuallyDisconnected) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          this.lastError = error.message;
          console.error(`ERROR: WebSocket error for ${this.url}:`, error.message);
          if (!settled) {
            this.connectionPromise = null;
            finishReject(error);
          }
        });

        this.ws.on('message', (data: RawData) => {
          this.handleMessage(data.toString());
        });
      } catch (error) {
        this.connectionPromise = null;
        finishReject(error instanceof Error ? error : new Error(String(error)));
      }
    });

    return this.connectionPromise;
  }

  private sendHello() {
    void this.sendJson('hello', {
      client: 'mcp-server',
      protocol: 'display-transport.v1',
    });
  }

  async setScene(
    scene: SceneDocument,
    emotion?: Pick<AvatarConfig, 'mood' | 'intensity'>,
    sceneVersion?: number,
  ): Promise<boolean> {
    return this.sendJson('set_scene', {
      scene,
      ...(emotion ? { mood: emotion.mood, intensity: emotion.intensity } : {}),
      ...(sceneVersion !== undefined ? { sceneVersion } : {}),
    }, sceneVersion);
  }

  applyMutations(mutations: Mutation[], sceneVersion?: number) {
    void this.sendJson('apply_mutations', {
      mutations,
      ...(sceneVersion !== undefined ? { sceneVersion } : {}),
    });
  }

  reset(reason: string = 'client request', sceneVersion?: number) {
    void this.sendJson('reset', {
      reason,
      ...(sceneVersion !== undefined ? { sceneVersion } : {}),
    });
  }

  private async sendJson(type: string, payload: Record<string, unknown>, sceneVersion?: number): Promise<boolean> {
    if (!this.ws || !this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
      console.error(`Cannot send to ${this.url}: not connected (readyState: ${this.ws?.readyState})`);
      return false;
    }

    let ackPromise: Promise<boolean> = Promise.resolve(true);
    if (type === 'set_scene' && sceneVersion !== undefined) {
      ackPromise = new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          this.pendingSceneAcks.delete(sceneVersion);
          resolve(false);
        }, 1500);

        this.pendingSceneAcks.set(sceneVersion, { resolve, timeout });
      });
    }

    const envelope = {
      schema: 'ai-face.v1',
      type,
      ts: Date.now(),
      payload,
    };

    this.ws.send(JSON.stringify(envelope), (err) => {
      if (err) {
        this.lastError = err.message;
        console.error(`ERROR sending to ${this.url}:`, err.message);
        if (type === 'set_scene' && sceneVersion !== undefined) {
          this.settleSceneAck(sceneVersion, false);
        }
      }
    });

    return ackPromise;
  }

  disconnect() {
    this.manuallyDisconnected = true;
    this.clearReconnectTimer();
    this.rejectPendingSceneAcks(false);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionPromise = null;
    this.isConnected = false;
  }

  private handleMessage(raw: string): void {
    this.lastSeenAt = Date.now();

    try {
      const parsed = JSON.parse(raw) as {
        schema?: string;
        type?: string;
        payload?: Partial<DisplayAckPayload>;
        status?: string;
      };

      if (parsed.schema === 'ai-face.v1' && parsed.type === 'ack' && parsed.payload) {
        const ackType = parsed.payload.ackType;
        if (ackType) {
          this.lastAckAt = this.lastSeenAt;
          this.lastAckType = ackType;
          this.lastAckSceneVersion = parsed.payload.sceneVersion ?? null;
          this.onAck?.({
            ackType,
            status: parsed.payload.status ?? 'applied',
            sceneVersion: parsed.payload.sceneVersion,
            reason: parsed.payload.reason,
          });

          if (ackType === 'set_scene' && parsed.payload.sceneVersion !== undefined) {
            this.settleSceneAck(parsed.payload.sceneVersion, parsed.payload.status === 'applied');
          }
          return;
        }
      }

      if (parsed.status === 'ok' && this.pendingSceneAcks.size > 0) {
        const firstPending = this.pendingSceneAcks.keys().next();
        if (!firstPending.done) {
          const sceneVersion = firstPending.value;
          this.lastAckAt = this.lastSeenAt;
          this.lastAckType = 'set_scene';
          this.lastAckSceneVersion = sceneVersion;
          this.settleSceneAck(sceneVersion, true);
          return;
        }
      }
    } catch {
      // Fall through to raw logging.
    }

    console.error(`RAW: Received from display ${this.url}:`, raw);
  }

  private settleSceneAck(sceneVersion: number, acked: boolean): void {
    const pending = this.pendingSceneAcks.get(sceneVersion);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingSceneAcks.delete(sceneVersion);
    pending.resolve(acked);
  }

  private rejectPendingSceneAcks(acked: boolean): void {
    for (const [sceneVersion, pending] of this.pendingSceneAcks.entries()) {
      clearTimeout(pending.timeout);
      pending.resolve(acked);
      this.pendingSceneAcks.delete(sceneVersion);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.manuallyDisconnected) return;

    const delayMs = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts += 1;
    console.error(`INFO: Scheduling reconnect to ${this.url} in ${delayMs}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch((error) => {
        console.error(`ERROR: Reconnect to ${this.url} failed:`, String(error));
      });
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
