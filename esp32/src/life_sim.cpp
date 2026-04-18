// ============================================================
// life_sim.cpp — Autonomous face animation implementation
// ============================================================

#include "life_sim.h"
#include <cmath>
#include <algorithm>

LifeSim::LifeSim() {
    // Schedule first blink 2–3 seconds after boot
    _nextBlinkMs = 2500;
}

void LifeSim::tick(unsigned long nowMs) {
    // --- Breathing ---
    // Compute dt; guard against first tick or millis() wrap
    float dtSec = 0.0f;
    if (_lastTickMs > 0 && nowMs >= _lastTickMs) {
        dtSec = (nowMs - _lastTickMs) / 1000.0f;
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

    // --- Intensity decay: 1/75 per second (agent.ts DECAY_SECONDS = 75) ---
    if (_intensity > 0.0f && dtSec > 0.0f) {
        _intensity = std::max(0.0f, _intensity - dtSec / 75.0f);
    }

    // --- Emotion FSM: emotion → calm → neutral ---
    const float INTENSITY_TO_CALM = 0.05f;
    const float CALM_TO_NEUTRAL   = 0.02f;
    if (_intensity <= INTENSITY_TO_CALM) {
        if (_mood != Mood::NEUTRAL && _mood != Mood::CALM) {
            _mood = Mood::CALM;
            _moodEnteredMs = nowMs;
        } else if (_mood == Mood::CALM && _intensity <= CALM_TO_NEUTRAL) {
            _mood = Mood::NEUTRAL;
            _intensity = 0.0f;
            _moodEnteredMs = nowMs;
        }
    }

    // --- Angry timeout: 8 seconds ---
    if (_mood == Mood::ANGRY && _angryUntilMs > 0 && nowMs >= _angryUntilMs) {
        _mood = Mood::CALM;
        _intensity = std::min(_intensity, 0.35f);
        _angryUntilMs = 0;
        _moodEnteredMs = nowMs;
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
    if (isBlinking()) return 1.2f;
    // Port of agent.ts getEyeRadiusPx: CALM base 6.5, others 7.5; scales up with intensity
    float baseRadius = (_mood == Mood::CALM) ? 6.5f : 7.5f;
    return baseRadius + (9.0f - baseRadius) * _intensity;
}

void LifeSim::setMood(Mood mood, float intensity) {
    _mood      = mood;
    _intensity = std::max(0.0f, std::min(1.0f, intensity));
    _moodEnteredMs = millis();
    if (mood == Mood::ANGRY) {
        _angryUntilMs = millis() + 8000UL;
    } else {
        _angryUntilMs = 0;
    }
}

// ---- Static brow helpers (mirrors agent.ts getBrowProps / getMoodRotation) ----

LifeSim::BrowProps LifeSim::getBrowProps(bool isLeft, Mood mood) {
    float x1 = isLeft ? -40.0f : 15.0f;
    float x2 = isLeft ? -15.0f : 40.0f;
    float y  = -38.0f;  // neutral / nervous / sad / angry brow height
    if (mood == Mood::CALM || mood == Mood::HAPPY || mood == Mood::AMUSED) {
        y = -44.0f;  // raised brows for positive moods
    }
    return {x1, y, x2, y};
}

float LifeSim::getBrowRotation(bool isLeft, Mood mood) {
    if (mood == Mood::ANGRY)                        return isLeft ?  15.0f : -15.0f;
    if (mood == Mood::SAD || mood == Mood::NERVOUS) return isLeft ? -15.0f :  15.0f;
    return 0.0f;
}

// ---- applyShape: modify a shape copy for the current animation frame ----

void LifeSim::applyShape(Shape& shape, const String& id) const {
    auto lerp = [](float a, float b, float t) { return a + (b - a) * t; };
    float t = _intensity;

    if (id == "left_brow" || id == "right_brow") {
        bool isLeft = (id == "left_brow");
        BrowProps baseP   = getBrowProps(isLeft, Mood::NEUTRAL);
        BrowProps targetP = getBrowProps(isLeft, _mood);
        // Override stored brow position with mood-lerped values
        shape.props.x1 = lerp(baseP.x1, targetP.x1, t);
        shape.props.y1 = lerp(baseP.y1, targetP.y1, t);
        shape.props.x2 = lerp(baseP.x2, targetP.x2, t);
        shape.props.y2 = lerp(baseP.y2, targetP.y2, t);
        shape.transform.rotation = getBrowRotation(isLeft, _mood) * t;
        // Breathing via transform.y (shifts both endpoints equally)
        shape.transform.y += breathY();

    } else if (id == "left_eye" || id == "right_eye") {
        shape.props.radius = eyeRadius();
        shape.transform.y += breathY();

    } else if (id == "mouth") {
        shape.transform.y += breathY();
        // Lerp arc height toward 0 as intensity decays (flattens smile/frown)
        if (shape.type == ShapeType::ARC) {
            shape.props.height *= _intensity;
        }
    }
}
