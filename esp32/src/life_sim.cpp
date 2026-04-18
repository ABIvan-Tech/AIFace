// ============================================================
// life_sim.cpp — Autonomous face animation implementation
// ============================================================

#include "life_sim.h"
#include <cmath>

LifeSim::LifeSim() {
    // Schedule first blink 2–3 seconds after boot
    _nextBlinkMs = 2500;
}

void LifeSim::tick(unsigned long nowMs) {
    // --- Breathing ---
    // Compute dt; guard against first tick or millis() wrap
    if (_lastTickMs > 0 && nowMs >= _lastTickMs) {
        float dtSec = (nowMs - _lastTickMs) / 1000.0f;
        _breathPhase += dtSec * 2.0f * M_PI * 0.18f;
        if (_breathPhase > 2.0f * M_PI) _breathPhase -= 2.0f * M_PI;
    }
    _lastTickMs = nowMs;

    // --- Blinking ---
    if (nowMs >= _nextBlinkMs) {
        _blinkUntilMs = nowMs + 140;
        // Pseudo-random next interval: 2500–5500 ms (mirrors agent.ts)
        float jitter = (sinf((float)nowMs / 731.0f) + 1.0f) / 2.0f;
        _nextBlinkMs = nowMs + 2500 + (unsigned long)(jitter * 3000.0f);
    }
}

void LifeSim::onExternalActivity(unsigned long nowMs) {
    _lastExternalMs = nowMs;
}

bool LifeSim::isActive() const {
    // No external mutation for >1 second → we run autonomously
    if (_lastExternalMs == 0) return true;
    return (millis() - _lastExternalMs) > 1000UL;
}

float LifeSim::breathY() const {
    return sinf(_breathPhase) * 2.5f;
}

bool LifeSim::isBlinking() const {
    return millis() < _blinkUntilMs;
}

float LifeSim::eyeRadius() const {
    return isBlinking() ? 1.2f : 7.5f;
}
