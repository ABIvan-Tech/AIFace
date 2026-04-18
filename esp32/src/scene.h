#pragma once

// ============================================================
// scene.h — Plain-data structs for the AIFace scene DSL
// ============================================================
// Coordinate system: face center = (0,0), range [-100, 100].
// All shapes carry an id, transform, style, and type-specific props.

#include <Arduino.h>
#include <string>

// ---- Shape type -----------------------------------------

enum class ShapeType {
    CIRCLE,
    ELLIPSE,
    RECT,
    LINE,
    ARC,
    UNKNOWN
};

// ---- Sub-structs ----------------------------------------

struct Transform {
    float x        = 0.0f;
    float y        = 0.0f;
    float rotation = 0.0f;  // degrees (not used for rendering in v1)
};

struct Style {
    uint32_t fill   = 0xFFFFFF;  // RGB packed (24-bit)
    uint32_t stroke = 0x000000;
    float    opacity = 1.0f;     // 0.0 – 1.0
};

// All shape-specific properties in a single flat struct.
// Only the fields relevant to the shape type are meaningful.
struct ShapeProps {
    // circle
    float radius    = 0.0f;
    // ellipse
    float rx        = 0.0f;
    float ry        = 0.0f;
    // rect
    float width     = 0.0f;
    float height    = 0.0f;
    // line (relative to transform origin)
    float x1        = 0.0f;
    float y1        = 0.0f;
    float x2        = 0.0f;
    float y2        = 0.0f;
    // arc / ellipse arc
    float startAngle  = 0.0f;   // degrees
    float endAngle    = 360.0f; // degrees (legacy)
    float sweepAngle  = 360.0f; // degrees (preferred — relative to startAngle)
};

// ---- Top-level shape ------------------------------------

struct Shape {
    String     id;
    ShapeType  type = ShapeType::UNKNOWN;
    Transform  transform;
    Style      style;
    ShapeProps props;
};
