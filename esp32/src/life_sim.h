#pragma once
// ============================================================
// life_sim.h — Autonomous face animation (breathing + blinking)
// Mirrors the tick loop from mcp/src/ai/agent.ts.
// Active only when no external mutations received in the last second.
// ============================================================

#include <Arduino.h>

class LifeSim {
public:
    LifeSim();

    // Call every 200 ms from main loop
    void tick(unsigned long nowMs);

    // Call whenever an external apply_mutations or set_scene arrives
    void onExternalActivity(unsigned long nowMs);

    // True when MCP is not actively sending (>1 s since last external mutation)
    bool isActive() const;

    // Breathing Y-offset to add to eye/brow/mouth transform.y (world units)
    float breathY() const;

    // True during the 140 ms blink window
    bool isBlinking() const;

    // Eye radius: 1.2 when blinking, 7.5 when open
    float eyeRadius() const;

private:
    float         _breathPhase    = 0.0f;
    unsigned long _lastTickMs     = 0;
    unsigned long _lastExternalMs = 0;
    unsigned long _blinkUntilMs   = 0;
    unsigned long _nextBlinkMs    = 0;
};
