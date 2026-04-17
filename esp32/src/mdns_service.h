#pragma once

// ============================================================
// mdns_service.h — mDNS advertisement for AIFace discovery
// ============================================================
// Advertises the WebSocket server so the MCP server can find
// the device by hostname instead of a hardcoded IP address.

class MdnsService {
public:
    // Start mDNS and register the _ai-face._tcp service.
    // hostname — e.g. "ai-face-esp32"
    // port     — WebSocket server port (8765)
    // Returns true on success.
    bool begin(const char* hostname, uint16_t port);
};
