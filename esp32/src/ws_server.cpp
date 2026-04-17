// ============================================================
// ws_server.cpp — WebSocket server implementation
// ============================================================

#include "ws_server.h"
#include "config.h"
#include <ArduinoJson.h>
#include <Arduino.h>

// Static instance pointer for the trampoline callback
WsServer* WsServer::_instance = nullptr;

// ---- Constructor -----------------------------------------

WsServer::WsServer(SceneStore& sceneStore)
    : _store(sceneStore), _ws(WS_PORT) {
    _instance = this;
}

// ---- Public API ------------------------------------------

void WsServer::begin() {
    _ws.begin();
    _ws.onEvent(staticEvent);
    Serial.printf("[WS] Server started on port %d\n", WS_PORT);
}

void WsServer::loop() {
    _ws.loop();
}

// ---- Event handling --------------------------------------

void WsServer::staticEvent(uint8_t num, WStype_t type,
                            uint8_t* payload, size_t length) {
    if (_instance) _instance->onEvent(num, type, payload, length);
}

void WsServer::onEvent(uint8_t num, WStype_t type,
                       uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED: {
            IPAddress ip = _ws.remoteIP(num);
            Serial.printf("[WS] Client #%u connected from %s\n",
                          num, ip.toString().c_str());
            _connected = true;
            break;
        }

        case WStype_DISCONNECTED:
            Serial.printf("[WS] Client #%u disconnected\n", num);
            _connected = false;
            _store.reset();  // clear scene on disconnect
            break;

        case WStype_TEXT:
            handleFrame(reinterpret_cast<const char*>(payload), length);
            break;

        case WStype_BIN:
            // Binary frames are not part of the protocol — ignore
            break;

        default:
            break;
    }
}

// ---- Frame dispatch --------------------------------------

void WsServer::handleFrame(const char* json, size_t len) {
    // Use a statically-sized document; 4 KB covers typical frames.
    // For large set_scene payloads the ArduinoJson allocator
    // will spill to heap automatically.
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, json, len);
    if (err) {
        Serial.printf("[WS] JSON parse error: %s\n", err.c_str());
        return;  // silently ignore invalid JSON per spec
    }

    // Validate envelope
    const char* schema = doc["schema"] | "";
    if (strcmp(schema, "ai-face.v1") != 0) {
        Serial.println("[WS] Unknown schema — ignoring frame");
        return;
    }

    const char* msgType = doc["type"] | "";

    if (strcmp(msgType, "hello") == 0) {
        const char* client = doc["payload"]["client"] | "unknown";
        Serial.printf("[WS] hello from %s\n", client);
        // Nothing else to do — we accept the connection implicitly

    } else if (strcmp(msgType, "set_scene") == 0) {
        JsonArrayConst shapes = doc["payload"]["scene"];
        if (!shapes.isNull()) {
            _store.setScene(shapes);
            Serial.printf("[WS] set_scene: %u shapes\n", shapes.size());
        }

    } else if (strcmp(msgType, "apply_mutations") == 0) {
        JsonArrayConst muts = doc["payload"]["mutations"];
        if (!muts.isNull()) {
            _store.applyMutations(muts);
            Serial.printf("[WS] apply_mutations: %u ops\n", muts.size());
        }

    } else if (strcmp(msgType, "reset") == 0) {
        const char* reason = doc["payload"]["reason"] | "";
        Serial.printf("[WS] reset: %s\n", reason);
        _store.reset();

    } else {
        // Unknown type — silently ignore per spec
        Serial.printf("[WS] Unknown message type '%s' — ignoring\n", msgType);
    }
}
