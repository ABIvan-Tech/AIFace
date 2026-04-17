// ============================================================
// mdns_service.cpp — mDNS advertisement implementation
// ============================================================

#include "mdns_service.h"
#include "config.h"
#include <ESPmDNS.h>
#include <Arduino.h>

bool MdnsService::begin(const char* hostname, uint16_t port) {
    if (!MDNS.begin(hostname)) {
        Serial.println("[mDNS] Failed to start mDNS responder");
        return false;
    }

    // Register the service so the MCP server can discover the device
    MDNS.addService(MDNS_SERVICE_TYPE, MDNS_SERVICE_PROTO, port);

    // TXT records carry additional metadata
    MDNS.addServiceTxt(MDNS_SERVICE_TYPE, MDNS_SERVICE_PROTO,
                       "transport", "ws");
    MDNS.addServiceTxt(MDNS_SERVICE_TYPE, MDNS_SERVICE_PROTO,
                       "schema", "ai-face.v1");

    Serial.printf("[mDNS] Hostname: %s.local  Service: %s.%s port %u\n",
                  hostname, MDNS_SERVICE_TYPE, MDNS_SERVICE_PROTO, port);
    return true;
}
