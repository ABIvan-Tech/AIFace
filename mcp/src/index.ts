import { MCPAIFaceServer } from './server.js';
import { MCPServerConfig } from './utils/types.js';

const config: MCPServerConfig = {
  name: 'ai-face-mcp-server',
  version: '1.0.0',
  transport: {
    type: 'stdio',
  },
  discovery: {
    serviceName: 'ai-face',
    port: 8765,
    protocol: 'tcp',
    ttl: 4500,
  }
};

async function main(): Promise<void> {
  const server = new MCPAIFaceServer(config);

  process.on('SIGINT', async () => {
    console.error('\nReceived SIGINT, shutting down...');
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('\nReceived SIGTERM, shutting down...');
    await server.shutdown();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
