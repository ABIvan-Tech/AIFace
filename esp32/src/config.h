#pragma once

// ============================================================
// config.h — Hardware and runtime configuration
// WiFi credentials are NOT stored here — they are entered at
// runtime via the captive portal (WiFiManager).
// ============================================================

// --- WiFi provisioning ---
// AP name shown to the user during first-boot captive-portal setup
#define WIFI_AP_NAME       "AIFace-Config"
// Hold BOOT button (GPIO0) for this many ms at startup to clear saved credentials
#define WIFI_RESET_HOLD_MS 3000
#define BOOT_PIN           0    // GPIO0 = BOOT button — WiFi credential reset
#define PWR_PIN            5    // GPIO5 = PWR button  — deep sleep trigger
#define PLUS_PIN           4    // GPIO4 = PLUS button — reserved for future use

// --- Power management ---
// Hold PWR button (GPIO5) for this many ms during normal operation to enter deep sleep.
// Short press (<SLEEP_BTN_HOLD_MS) is ignored. Press PWR once to wake from deep sleep.
#define SLEEP_BTN_HOLD_MS 800

// --- WebSocket server ---
// The MCP server will connect to ESP32 on this port
#define WS_PORT 8765

// --- Emotion timing ---
// Default semantic decay keeps the expression drifting back to neutral over ~75 seconds.
// Override this constant for faster demo feedback if needed.
#define LIFE_SIM_DECAY_SECONDS 75.0f

// --- mDNS advertisement ---
// Device will appear as "ai-face-esp32.local" on the network
#define MDNS_HOSTNAME     "ai-face-esp32"
#define MDNS_SERVICE_TYPE "_ai-face"
#define MDNS_SERVICE_PROTO "_tcp"

// --- Display resolution ---
// Must match TFT_WIDTH / TFT_HEIGHT in platformio.ini build_flags
#define DISPLAY_WIDTH  240
#define DISPLAY_HEIGHT 240

// --- SPI pin assignment (Waveshare ESP32-S3-LCD-1.54) ---
// Sourced from official Waveshare BSP: waveshareteam/ESP32-S3-Touch-LCD-1.54
// These are mirrored in platformio.ini build_flags for TFT_eSPI.
// If you change them here you MUST also change them in platformio.ini.
#define PIN_TFT_MOSI 39
#define PIN_TFT_SCLK 38
#define PIN_TFT_CS   21
#define PIN_TFT_DC   45
#define PIN_TFT_RST  40
#define PIN_TFT_BL   46  // Backlight (active HIGH)

// --- Rendering ---
#define FPS_TARGET 30
#define FRAME_MS   (1000 / FPS_TARGET)   // ~33 ms
