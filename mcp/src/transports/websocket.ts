import { WebSocket, Server as WebSocketServer } from 'ws';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { TransportConfig } from '../utils/types.js';

export class WebSocketTransport implements Transport {
  private isClosed = false;
  private wss: WebSocketServer | null = null;
  private connections: Set<WebSocket> = new Set();
  private config: TransportConfig;

  constructor(config: TransportConfig) {
    if (config.type !== 'websocket') {
      throw new Error('Invalid transport type for WebSocketTransport');
    }
    this.config = config;
  }

  async start(): Promise<void> {
    const port = this.config.port || 8080;
    const host = this.config.host || 'localhost';

    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket) => {
      console.error(
        `WebSocket client connected. Total connections: ${this.connections.size + 1}`,
      );
      this.connections.add(ws);

      ws.on('message', (data: Buffer) => {
        try {
          const message: JSONRPCMessage = JSON.parse(data.toString());
          this.onMessage(message, ws);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });

      ws.on('close', () => {
        this.connections.delete(ws);
        console.error(
          `WebSocket client disconnected. Total connections: ${this.connections.size}`,
        );
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.error(`WebSocket server listening on ws://${host}:${port}`);
  }

  async stop(): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    if (!this.isClosed && this.wss) {
      this.isClosed = true;
      this.connections.forEach((ws) => ws.close());
      this.wss.close();
      console.error('WebSocket server stopped');
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const data = JSON.stringify(message);
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  protected onMessage(message: JSONRPCMessage, ws: WebSocket): void {
    // Override in subclass or set up event listeners
    console.error('Received message:', message);
    const messageId = this.getMessageId(message);
    if (messageId !== undefined) {
      ws.send(JSON.stringify({ id: messageId, result: 'ack' }));
    }
  }

  private getMessageId(message: JSONRPCMessage): unknown {
    if (typeof message === 'object' && message !== null && 'id' in message) {
      return (message as { id?: unknown }).id;
    }
    return undefined;
  }
}
