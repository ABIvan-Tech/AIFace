#pragma once

// ============================================================
// ws_server.h — WebSocket server + JSON frame dispatcher
// ============================================================
// The ESP32 acts as a WebSocket SERVER on WS_PORT.
// The MCP server connects to it as a client.

#include "scene_store.h"
#include "life_sim.h"
#include <WebSocketsServer.h>

class WsServer {
public:
    // sceneStore is owned externally (lives in main.cpp)
    WsServer(SceneStore& sceneStore, LifeSim& lifeSim);

    // Start listening; call once in setup()
    void begin();

    // Pump the WebSocket event loop; call every loop() iteration
    void loop();

    // True if at least one client is currently connected
    bool hasClient() const { return _connected; }

private:
    SceneStore&      _store;
    LifeSim&         _lifeSim;
    WebSocketsServer _ws;
    bool             _connected = false;

    // WebSocket event handler (static trampoline → member)
    void onEvent(uint8_t num, WStype_t type,
                 uint8_t* payload, size_t length);

    // JSON frame dispatch
    void handleFrame(const char* json, size_t len);

    // Static trampoline so we can pass a member function to the lib
    static WsServer* _instance;
    static void      staticEvent(uint8_t num, WStype_t type,
                                 uint8_t* payload, size_t length);
};
