import { WebSocket } from 'ws';
import { SceneDocument, Mutation } from '../utils/types.js';

export class DisplayClient {
  private ws: WebSocket | null = null;
  private url: string;
  private isConnected = false;

  constructor(host: string, port: number) {
    this.url = `ws://${host}:${port}/`;
  }

  public getConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) return;

    return new Promise((resolve, reject) => {
      try {
        console.error(`Attempting to connect to display at ${this.url}...`);
        this.ws = new WebSocket(this.url);

        const timeout = setTimeout(() => {
          if (!this.isConnected) {
            this.ws?.terminate();
            reject(new Error(`Connection timeout to ${this.url}`));
          }
        }, 5000);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          console.error(`SUCCESS: Connected to display at ${this.url}`);
          this.sendHello();
          resolve();
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          this.isConnected = false;
          console.error(`INFO: Disconnected from display at ${this.url}. Code: ${code}, Reason: ${reason}`);
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          console.error(`ERROR: WebSocket error for ${this.url}:`, error.message);
          reject(error);
        });

        this.ws.on('message', (data: any) => {
          console.error(`RAW: Received from display ${this.url}:`, data.toString());
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private sendHello() {
    this.sendJson('hello', {
      client: 'mcp-server',
      protocol: 'display-transport.v1',
    });
  }

  setScene(scene: SceneDocument) {
    this.sendJson('set_scene', { scene });
  }

  applyMutations(mutations: Mutation[]) {
    this.sendJson('apply_mutations', { mutations });
  }

  reset(reason: string = 'client request') {
    this.sendJson('reset', { reason });
  }

  private sendJson(type: string, payload: any) {
    if (!this.ws || !this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
      console.error(`Cannot send to ${this.url}: not connected (readyState: ${this.ws?.readyState})`);
      return;
    }

    const envelope = {
      schema: 'ai-face.v1',
      type,
      ts: Date.now(),
      payload,
    };

    this.ws.send(JSON.stringify(envelope), (err) => {
      if (err) {
        console.error(`ERROR sending to ${this.url}:`, err.message);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
