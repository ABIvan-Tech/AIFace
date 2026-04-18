#pragma once
// ============================================================
// life_sim.h — Autonomous face animation (breathing + blinking)
// Mirrors the tick loop from mcp/src/ai/agent.ts.
// Active only when no external mutations received in the last second.
// ============================================================

#include <Arduino.h>
#include "scene.h"

// Emotion states — mirrors Mood enum in agent.ts
enum class Mood { NEUTRAL, CALM, HAPPY, AMUSED, NERVOUS, SAD, ANGRY };

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

    // Eye radius: 1.2 when blinking, else mood+intensity based
    float eyeRadius() const;

    // --- Emotion state machine (mirrors agent.ts) ---

    // Set current mood and intensity (called by WsServer on set_scene)
    void setMood(Mood mood, float intensity);

    Mood  mood()      const { return _mood;      }
    float intensity() const { return _intensity; }

    // Apply life-sim offsets to a COPY of a shape (call once per shape during render).
    // Modifies position, radius, and brow pose based on current mood + breath + blink.
    void applyShape(Shape& shape, const String& id) const;

private:
    float         _breathPhase    = 0.0f;
    unsigned long _lastTickMs     = 0;
    unsigned long _lastExternalMs = 0;
    unsigned long _blinkUntilMs   = 0;
    unsigned long _nextBlinkMs    = 0;

    // Emotion state
    Mood          _mood           = Mood::NEUTRAL;
    float         _intensity      = 0.0f;
    unsigned long _moodEnteredMs  = 0;
    unsigned long _angryUntilMs   = 0;

    // Brow endpoint data for lerping
    struct BrowProps { float x1, y1, x2, y2; };

    // Neutral/mood brow positions (mirrors agent.ts getBrowProps)
    static BrowProps getBrowProps(bool isLeft, Mood mood);

    // Brow rotation angle for mood in degrees (mirrors agent.ts getMoodRotation)
    static float getBrowRotation(bool isLeft, Mood mood);
};
