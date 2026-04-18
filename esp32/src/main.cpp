// ============================================================
// main.cpp — AIFace ESP32-S3 display client
// ============================================================
// Boot sequence:
//   1. Init Serial + display
//   2. Provision WiFi via WiFiManager (captive portal on first boot)
//   3. Start mDNS so the MCP server can discover the device
//   4. Start WebSocket server on port 8765
//   5. Show IP address on screen
//   6. Enter render loop at FPS_TARGET fps

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>

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

// Provision WiFi using WiFiManager.
// - On first boot (or after credential reset): starts a captive-portal AP
//   named WIFI_AP_NAME so the user can pick a network from any browser.
// - On subsequent boots: connects automatically to saved credentials.
// - Holding BOOT_PIN LOW for WIFI_RESET_HOLD_MS at startup clears
//   saved credentials and restarts into portal mode.
// Blocks until connected; reboots on credential reset.
static void provisionWifi() {
    pinMode(BOOT_PIN, INPUT_PULLUP);

    // Give the user a window to hold BOOT for a credential reset
    renderer.showStatus("WiFi", "Hold BOOT to reset");
    unsigned long t0 = millis();
    while (millis() - t0 < WIFI_RESET_HOLD_MS) {
        if (digitalRead(BOOT_PIN) == HIGH) break;  // released early — skip reset
        delay(50);
    }
    if (digitalRead(BOOT_PIN) == LOW) {
        // Button still held after the window — wipe stored credentials
        WiFiManager wm;
        wm.resetSettings();
        renderer.showStatus("WiFi Reset", "Restarting...");
        Serial.println("[WiFi] Credentials cleared — restarting");
        delay(1500);
        ESP.restart();
    }

    WiFiManager wm;

    // Try to connect within 20 s; fall through to portal if no saved creds
    wm.setConnectTimeout(20);
    // Portal stays open indefinitely until the user saves credentials
    wm.setConfigPortalTimeout(0);

    // Pre-show the AP name so the TFT is already informative if the portal starts
    renderer.showStatus("Connecting WiFi...", WIFI_AP_NAME);

    wm.setAPCallback([](WiFiManager*) {
        // Captive portal is now active — Serial only (renderer is main-scope)
        Serial.println("[WiFi] Portal started — connect to: " WIFI_AP_NAME);
    });

    bool ok = wm.autoConnect(WIFI_AP_NAME);  // blocks until connected or portal exits
    if (!ok) {
        renderer.showStatus("WiFi FAILED", "Restart device");
        while (true) delay(1000);
    }
}

// ---- setup() ---------------------------------------------

void setup() {
    Serial.begin(115200);
    // Wait up to 2 s for USB-CDC to enumerate so boot messages aren't lost
    unsigned long t = millis();
    while (!Serial && millis() - t < 2000) delay(10);
    delay(200);  // let the USB-serial bridge settle
    Serial.println("\n[Boot] AIFace ESP32-S3 starting");

    // 1. Init display — do this first so we can show boot messages
    renderer.begin();
    renderer.showStatus("AIFace ESP32", "Booting...");
    delay(400);

    // 2. Provision WiFi (blocks until connected)
    provisionWifi();
    Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());

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
