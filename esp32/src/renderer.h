#pragma once

// ============================================================
// renderer.h — Draws the AIFace scene onto the TFT display
// ============================================================

#include "scene_store.h"
#include "life_sim.h"
#include <TFT_eSPI.h>

class Renderer {
public:
    // Initialise display hardware; call once in setup()
    void begin();

    // Redraw the full scene. Call at FPS_TARGET rate from loop().
    void drawScene(const SceneStore& store, const LifeSim& lifeSim);

    // Print a short status string in the top-left corner.
    // Useful for WiFi / boot messages before the first scene arrives.
    void showStatus(const char* line1, const char* line2 = nullptr);

    // Clear the screen to black
    void clear();

private:
    TFT_eSPI _tft;

    // --- Coordinate helpers (scene [-100,100] → screen pixels) ---
    static inline int toScreenX(float x);
    static inline int toScreenY(float y);
    static inline int toScreenR(float r);   // radius / half-dimension

    // --- Color helpers ---
    // Convert packed RGB24 to RGB565 used by TFT_eSPI
    uint16_t rgb24to565(uint32_t rgb);

    // --- Per-shape draw routines ---
    void drawShape(const Shape& shape);
    void drawCircle (const Shape& s);
    void drawEllipse(const Shape& s);
    void drawRect   (const Shape& s);
    void drawLine   (const Shape& s);
    void drawArc    (const Shape& s);
};
