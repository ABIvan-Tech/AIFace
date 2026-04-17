#pragma once

// ============================================================
// config.h — Edit this file before building and flashing
// ============================================================

// --- WiFi credentials ---
#define WIFI_SSID     "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// --- WebSocket server ---
// The MCP server will connect to ESP32 on this port
#define WS_PORT 8765

// --- mDNS advertisement ---
// Device will appear as "ai-face-esp32.local" on the network
#define MDNS_HOSTNAME     "ai-face-esp32"
#define MDNS_SERVICE_TYPE "_ai-face"
#define MDNS_SERVICE_PROTO "_tcp"

// --- Display resolution ---
// Must match TFT_WIDTH / TFT_HEIGHT in platformio.ini build_flags
#define DISPLAY_WIDTH  240
#define DISPLAY_HEIGHT 240

// --- SPI pin assignment (ESP32-S3 DevKitC-1 defaults) ---
// These are mirrored in platformio.ini build_flags for TFT_eSPI.
// If you change them here you MUST also change them in platformio.ini.
#define PIN_TFT_MOSI 11
#define PIN_TFT_SCLK 12
#define PIN_TFT_CS   10
#define PIN_TFT_DC    8
#define PIN_TFT_RST   9
#define PIN_TFT_BL   46  // Backlight (active HIGH)

// --- Rendering ---
#define FPS_TARGET 30
#define FRAME_MS   (1000 / FPS_TARGET)   // ~33 ms
