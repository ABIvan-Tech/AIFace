// ============================================================
// ws_server.cpp — WebSocket server implementation
// ============================================================

#include "ws_server.h"
#include "config.h"
#include <ArduinoJson.h>
#include <Arduino.h>
#include <cstring>

// Static instance pointer for the trampoline callback
WsServer* WsServer::_instance = nullptr;

// ---- Constructor -----------------------------------------

WsServer::WsServer(SceneStore& sceneStore, LifeSim& lifeSim)
    : _store(sceneStore), _lifeSim(lifeSim), _ws(WS_PORT) {
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
            // Scene persists — a new client can send mutations without re-sending set_scene
            break;

        case WStype_TEXT:
            handleFrame(num, reinterpret_cast<const char*>(payload), length);
            break;

        case WStype_BIN:
            // Binary frames are not part of the protocol — ignore
            break;

        default:
            break;
    }
}

// ---- Frame dispatch --------------------------------------

// Parse mood string to Mood enum (mirrors agent.ts Mood type)
static Mood parseMood(const char* s) {
    if (strcmp(s, "calm")    == 0) return Mood::CALM;
    if (strcmp(s, "happy")   == 0) return Mood::HAPPY;
    if (strcmp(s, "joy")     == 0) return Mood::HAPPY;
    if (strcmp(s, "amused")  == 0) return Mood::AMUSED;
    if (strcmp(s, "nervous") == 0) return Mood::NERVOUS;
    if (strcmp(s, "sad")     == 0) return Mood::SAD;
    if (strcmp(s, "angry")   == 0) return Mood::ANGRY;
    return Mood::NEUTRAL;
}

void WsServer::sendAck(uint8_t num, const char* ackType, const char* status, long sceneVersion, const char* reason) {
    JsonDocument ackDoc;
    ackDoc["schema"] = "ai-face.v1";
    ackDoc["type"] = "ack";
    ackDoc["ts"] = millis();

    JsonObject payload = ackDoc["payload"].to<JsonObject>();
    payload["ackType"] = ackType;
    payload["status"] = status;
    if (sceneVersion >= 0) {
        payload["sceneVersion"] = sceneVersion;
    }
    if (reason && reason[0] != '\0') {
        payload["reason"] = reason;
    }

    String encoded;
    serializeJson(ackDoc, encoded);
    _ws.sendTXT(num, encoded);
}

void WsServer::handleFrame(uint8_t num, const char* json, size_t len) {
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
        sendAck(num, "hello", "applied", _sceneVersion);

    } else if (strcmp(msgType, "set_scene") == 0) {
        JsonVariantConst scenePayload = doc["payload"]["scene"];
        JsonArrayConst shapes;
        if (scenePayload.is<JsonObjectConst>()) {
            shapes = scenePayload["scene"].as<JsonArrayConst>();
        } else {
            shapes = scenePayload.as<JsonArrayConst>();
        }
        const long sceneVersion = doc["payload"]["sceneVersion"] | -1;

        if (!shapes.isNull()) {
            _store.setScene(shapes);
            _lifeSim.onExternalActivity(millis());
            // Parse optional mood and intensity for emotion state machine
            const char* moodStr = doc["payload"]["mood"] | "";
            float intensity = doc["payload"]["intensity"] | 0.0f;
            _lifeSim.setMood(parseMood(moodStr), intensity);
            _sceneVersion = sceneVersion;
            Serial.printf("[WS] set_scene: %u shapes\n", shapes.size());
            sendAck(num, "set_scene", "applied", _sceneVersion);
        } else {
            sendAck(num, "set_scene", "ignored", sceneVersion, "invalid_scene_payload");
        }

    } else if (strcmp(msgType, "apply_mutations") == 0) {
        JsonArrayConst muts = doc["payload"]["mutations"];
        const long sceneVersion = doc["payload"]["sceneVersion"] | -1;
        if (!muts.isNull()) {
            if (sceneVersion >= 0 && _sceneVersion != sceneVersion) {
                const char* reason = (_sceneVersion < 0) ? "missing_scene_version" : "scene_version_mismatch";
                Serial.printf("[WS] apply_mutations ignored: %s (expected=%ld, got=%ld)\n", reason, _sceneVersion, sceneVersion);
                sendAck(num, "apply_mutations", "ignored", sceneVersion, reason);
                return;
            }
            _store.applyMutations(muts);
            _lifeSim.onExternalActivity(millis());
            Serial.printf("[WS] apply_mutations: %u ops\n", muts.size());
            sendAck(num, "apply_mutations", "applied", _sceneVersion >= 0 ? _sceneVersion : sceneVersion);
        } else {
            sendAck(num, "apply_mutations", "ignored", sceneVersion, "invalid_mutation_payload");
        }

    } else if (strcmp(msgType, "reset") == 0) {
        const char* reason = doc["payload"]["reason"] | "";
        const long sceneVersion = doc["payload"]["sceneVersion"] | -1;
        Serial.printf("[WS] reset: %s\n", reason);
        _store.reset();
        _sceneVersion = sceneVersion;
        sendAck(num, "reset", "applied", _sceneVersion);

    } else {
        // Unknown type — silently ignore per spec
        Serial.printf("[WS] Unknown message type '%s' — ignoring\n", msgType);
    }
}
