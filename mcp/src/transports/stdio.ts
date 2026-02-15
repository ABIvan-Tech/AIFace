import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export class StdioTransport implements Transport {
  private isClosed = false;
  constructor() {
    this.setupStdinHandler();
  }

  async start(): Promise<void> {
    console.error('Stdio transport started');
  }

  async stop(): Promise<void> {
    console.error('Stdio transport stopped');
    await this.close();
  }

  async close(): Promise<void> {
    if (!this.isClosed) {
      this.isClosed = true;
      console.error('Stdio transport closed');
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    process.stdout.write(JSON.stringify(message) + '\n');
  }

  private setupStdinHandler(): void {
    let buffer = '';

    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      lines.forEach(line => {
        if (line.trim()) {
          try {
            const message: JSONRPCMessage = JSON.parse(line);
            this.onMessage(message);
          } catch (error) {
            console.error('Failed to parse stdin message:', error);
          }
        }
      });
    });

    process.stdin.on('end', () => {
      console.error('Stdin closed, exiting');
      process.exit(0);
    });
  }

  protected onMessage(message: JSONRPCMessage): void {
    // Override in subclass or set up event listeners
    console.error('Received stdin message:', message);
  }
}
