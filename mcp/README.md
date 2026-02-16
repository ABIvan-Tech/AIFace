# AI Face MCP Server

A Node.js/TypeScript implementation of a Model Context Protocol (MCP) server for the AI Face vector avatar system.

This server discovers mobile displays on LAN via mDNS/DNS-SD and delivers the AI Face Scene DSL over WebSocket.

## Features

- **Model Context Protocol (MCP)** server using the official TypeScript SDK
- **mDNS discovery** for `_ai-face._tcp` displays on the local network
- **WebSocket display transport** (`hello | set_scene | apply_mutations | reset`)
- **Built-in agent** that generates a basic face scene
- **Minimal tool surface** for setting current emotion

## Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- TypeScript knowledge
- Basic understanding of MCP protocol

## Installation

```bash
npm install
```

## Configuration

The server is configured via `src/index.ts`. Key configuration options:

```typescript
{
  name: 'ai-face-mcp-server',           // Server name
  version: '1.0.0',                      // Server version
  transport: { type: 'stdio' },          // MCP transport (stdio)
  discovery: {
    serviceName: 'ai-face',              // mDNS service name
    port: 8765,                          // Display WebSocket port
    protocol: 'tcp',                     // Service protocol
    ttl: 4500                            // TTL in seconds
  },
  // ai: { enabled: true }               // Optional agent (if/when enabled)
}
```

## Development

### Build the project

```bash
npm run build
```

### Run in development mode

```bash
npm run dev
```

### Watch for changes

```bash
npm run watch
```

### Type checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

```bash
npm run lint:fix
```

## Usage

### Starting the Server

```bash
npm start
```

The server will start on the stdio transport, listening for MCP protocol messages.

### Claude Code CLI (recommended)

From npm (published), you can add it to Claude Code with a single command:

```bash
claude mcp add --scope user --transport stdio ai-face -- npx -y ai-face-mcp-server
```

Local build (no npm publish required):

```bash
claude mcp add --scope user --transport stdio ai-face -- node /ABS/PATH/TO/AIFace/mcp/dist/index.js
```

### Available Tools

Current MCP tool set:

- `list_displays` — list discovered displays
- `set_emotion` — set mood and optional intensity
- `push_emotion_intent` — send explicit emotion intent (`INLINE|POST|HYBRID`)
- `get_current_emotion` — return current mood/intensity

Planned direction:
- Accept `EmotionIntent` (INLINE/POST/HYBRID)
- Stabilize emotion via an Emotion FSM (cooldowns + decay)
- Compile to Scene DSL updates (`set_scene` for rare semantic changes, `apply_mutations` for micro-movements)

## Project Structure

```
.
├── src/
│   ├── index.ts                 # Server entry point
│   ├── server.ts                # MCP server implementation
│   ├── transports/
│   │   ├── websocket.ts         # WebSocket transport implementation
│   │   └── stdio.ts             # Stdio transport implementation
│   ├── discovery/
│   │   └── mdns.ts              # mDNS discovery service
│   ├── ai/
│   │   ├── agent.ts             # AI agent with avatar management + FSM
│   │   └── post_processor.ts    # Lightweight text→EmotionIntent extractor
│   └── utils/
│       └── types.ts             # TypeScript type definitions
├── dist/                        # Compiled JavaScript (generated)
├── .vscode/
│   ├── launch.json              # VS Code debug configuration
│   ├── mcp.json                 # MCP server configuration
│   ├── settings.json            # VS Code settings
│   └── tasks.json               # Build tasks
├── package.json                 # Project dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Debugging

### VS Code Debugger

1. Open the project in VS Code.
2. Press `F5` to launch the debugger.
3. Select "Launch MCP Server" configuration.
4. The server will start with breakpoint support.

### Inspector Tool

Use the official MCP Inspector tool to test the server:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Dependencies

### Production

- `@modelcontextprotocol/sdk` - Official MCP protocol implementation
- `ws` - WebSocket server implementation
- `bonjour-service` - mDNS discovery service

### Development

- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution for Node.js
- `@types/node` - Node.js type definitions
- `@types/ws` - WebSocket type definitions
- `eslint` - Linting
- `@typescript-eslint/parser` - TypeScript ESLint parser
- `@typescript-eslint/eslint-plugin` - TypeScript ESLint rules

## Architecture

### Transport Layer

The server uses:

- **Stdio** for MCP client integration
- **WebSocket** as a display delivery transport (server → phone)

### Discovery Layer

- **mDNS**: Automatic service discovery using Multicast DNS
- Service can be discovered on local networks without manual configuration

### AI Agent Layer

- Singleton state (mood + intensity)
- Scene generation into the AI Face Scene DSL
- (Planned) EmotionIntent + FSM + micro-movements via mutations

## API Examples

### Set emotion

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "set_emotion",
    "arguments": {
      "mood": "happy",
      "intensity": 0.7
    }
  },
  "id": 1
}
```

## Troubleshooting

### Dependencies not installed

```bash
npm install
```

### TypeScript compilation errors

```bash
npm run type-check
```

### Module resolution issues

Ensure `NODE_OPTIONS=--experimental-modules` is set if needed (Node.js < 17).

### mDNS service not discoverable

1. Check network connectivity.
2. Ensure firewall allows UDP 5353.
3. Verify service name matches configuration.

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://modelcontextprotocol.io/specification/latest)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)

## License

MIT

## Contributing

Contributions are welcome! Please ensure:

- Code follows TypeScript strict mode.
- All code is properly typed.
- Tests pass and improve coverage.
- Documentation is updated.

## Support

For issues or questions, please open an issue on the project repository.
