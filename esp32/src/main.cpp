// ============================================================
// main.cpp — AIFace ESP32-S3 display client
// ============================================================
// Boot sequence:
//   1. Init Serial + display
//   2. Show "Connecting…" on screen
//   3. Connect to WiFi (blocking, 20 s timeout)
//   4. Start mDNS so the MCP server can discover the device
//   5. Start WebSocket server on port 8765
//   6. Show IP address on screen
//   7. Enter render loop at FPS_TARGET fps

#include <Arduino.h>
#include <WiFi.h>

#include "config.h"
#include "scene_store.h"
#include "ws_server.h"
#include "renderer.h"
#include "mdns_service.h"

// ---- Global singletons (one per firmware image) ----------
static SceneStore  sceneStore;
static WsServer    wsServer(sceneStore);
static Renderer    renderer;
static MdnsService mdnsService;

// ---- Helpers ---------------------------------------------

// Connect to WiFi, showing status on the TFT.
// Blocks until connected or timeout (ms) is reached.
static bool connectWifi(unsigned long timeoutMs) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.printf("[WiFi] Connecting to '%s'", WIFI_SSID);

    unsigned long start = millis();
    int dotCount = 0;
    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - start > timeoutMs) {
            Serial.println("\n[WiFi] Timeout!");
            return false;
        }
        delay(500);
        Serial.print('.');
        dotCount++;
        if (dotCount % 20 == 0) {
            // Refresh screen status so the user sees progress
            renderer.showStatus("WiFi connecting...", WIFI_SSID);
        }
    }

    Serial.printf("\n[WiFi] Connected! IP: %s\n",
                  WiFi.localIP().toString().c_str());
    return true;
}

// ---- setup() ---------------------------------------------

void setup() {
    Serial.begin(115200);
    delay(200);  // let the USB-serial bridge settle
    Serial.println("\n[Boot] AIFace ESP32-S3 starting");

    // 1. Init display — do this first so we can show boot messages
    renderer.begin();
    renderer.showStatus("AIFace ESP32", "Booting...");
    delay(400);

    // 2. Connect to WiFi
    renderer.showStatus("Connecting WiFi...", WIFI_SSID);
    if (!connectWifi(20000)) {
        renderer.showStatus("WiFi FAILED", "Check config.h");
        // Halt — the user needs to fix credentials and reflash
        while (true) delay(1000);
    }

    // 3. Show IP so the user can verify without a serial monitor
    String ipLine = "IP: " + WiFi.localIP().toString();
    renderer.showStatus("WiFi OK", ipLine.c_str());
    delay(1000);

    // 4. Start mDNS
    if (!mdnsService.begin(MDNS_HOSTNAME, WS_PORT)) {
        // mDNS is nice-to-have — carry on even if it fails
        Serial.println("[Boot] mDNS unavailable; use IP to connect");
    }

    // 5. Start WebSocket server
    wsServer.begin();

    // 6. Show "ready" state
    String readyLine = WiFi.localIP().toString() + ":" + String(WS_PORT);
    renderer.showStatus("Ready. Waiting", readyLine.c_str());
    Serial.println("[Boot] Setup complete — entering main loop");
}

// ---- loop() ----------------------------------------------

namespace {
    unsigned long lastRenderMs = 0;
    bool          sceneActive  = false;  // true after first set_scene
}

void loop() {
    // Drive the WebSocket stack
    wsServer.loop();

    // Render at FPS_TARGET
    unsigned long now = millis();
    if (now - lastRenderMs >= FRAME_MS) {
        lastRenderMs = now;

        const bool hasShapes = !sceneStore.order().empty();

        if (hasShapes) {
            sceneActive = true;
            // Full redraw each frame.
            // For v2: consider a dirty-flag approach to reduce flicker.
            renderer.clear();
            renderer.drawScene(sceneStore);
        } else if (sceneActive) {
            // Scene was cleared (reset / disconnect) — show idle message
            sceneActive = false;
            String ip = WiFi.localIP().toString() + ":" + String(WS_PORT);
            renderer.showStatus("Waiting for MCP...", ip.c_str());
        }
    }
}
