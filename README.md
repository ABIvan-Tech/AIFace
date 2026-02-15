# AIFace

**Agent-driven Vector Avatar via MCP** — an interactive avatar project powered by AI agent through Model Context Protocol (MCP).

## Overview

AIFace combines:
- **MCP Server** — AI agent working with emotional interface and controlling the avatar
- **Mobile App** — cross-platform mobile application (Android/iOS) for displaying avatar with emotional state support
- **Emotional Interface** — system for mapping emotions to facial expressions with FSM and temporal smoothing

## Connecting MCP

### 1. Install Dependencies
```bash
cd mcp
npm install
```

### 2. Configuration
MCP server supports multiple transport methods:
- **Stdio** — standard input/output
- **WebSocket** — for remote connections
- **Display** — local display

### 3. Start MCP Server
```bash
cd mcp
npm start
```

The server will start on port **5000** by default (WebSocket).

### 4. Connect Client
The client connects to the MCP server via endpoint `ws://localhost:5000` and sends emotional commands.

**Example DSL command:**
```json
{
  "action": "emotion",
  "emotion": "happy",
  "intensity": 0.8
}
```

See [MCP documentation](docs/mcp/30_mcp_server.md) and [AI Agent documentation](docs/mcp/40_ai_agent.md) for more details.

## Building and Running Mobile

### Requirements
- **JDK 11+**
- **Android SDK** (minimum API 24)
- **Kotlin Multiplatform Mobile** support

### Build Android
```bash
cd mobile
./gradlew assembleDebug
```

![Android Display](img/android.png)

### Build iOS (from macOS)
```bash
cd mobile
./gradlew iosDeployDebug
```

![iOS Display](img/ios.png)

### Run on Emulator/Device

**Android:**
```bash
cd mobile
./gradlew installDebug
adb shell am start -n com.aiface/.MainActivity
```

**iOS:**
```bash
cd mobile/iosApp
xcodebuild -scheme iosApp -configuration Debug -derivedDataPath build -arch arm64 -sdk iphonesimulator
```

### Application Configuration
Edit `mobile/gradle.properties` to set:
- MCP endpoint (default: `ws://localhost:5000`)
- Emotional interface parameters

See [Android documentation](docs/mobile/20_android_app.md) and [architecture](docs/mobile/22_android_architecture.md) for more details.

## Documentation

- [Architecture overview](docs/architecture/00_overview.md)
- [Emotional Interface system](docs/emotional-interface/01_overview.md)
- [MCP server](docs/mcp/30_mcp_server.md)
- [AI Agent](docs/mcp/40_ai_agent.md)
- [Mobile application](docs/mobile/20_android_app.md)

## LLM Setup (Claude via Claude Desktop)

To connect an LLM (Claude) to control the AIFace avatar:
### Setup Steps

### Configure MCP Locally

Edit your Claude Desktop config file (usually `~/.claude_desktop_config.json`) and add the AIFace MCP server:

```json
{
  "mcpServers": {
    "ai-face": {
      "command": "/Users/alex/.nvm/versions/node/v20.19.6/bin/node",
      "args": [
        "/Users/alex/AndroidStudioProjects/AIFace/mcp/dist/index.js"
      ],
      "env": {}
    }
  }
}
```
![Claude Setup Step 5](img/claude_setup_5.png)

Replace the paths with your actual Node.js and project locations.



1. **Configure MCP Server Configuration**

![Claude Setup Step 1](img/claude_setup_1.png)

2. **Configure Server Permissions**

![Claude Setup Step 2](img/claude_setup_2.png)

3. **Check it**

![Claude Setup Step 3](img/claude_setup_3.png)

or

![Claude Setup Step 4](img/claude_setup_4.png)



The MCP server will then expose tools (`set_emotion`, `push_emotion_intent`, `list_displays`, `get_current_emotion`) accessible to Claude, enabling the AI to control the avatar's emotional expressions.

For more details, see [MCP server documentation](docs/mcp/30_mcp_server.md).

## Technology Stack

- **Backend**: Node.js, TypeScript
- **MCP**: Model Context Protocol
- **Mobile**: Kotlin Multiplatform Mobile
- **Database**: Supabase
- **AI**: OpenAI, Google Generative AI, Leonardo.AI

## License

See [LICENSE](LICENSE)
