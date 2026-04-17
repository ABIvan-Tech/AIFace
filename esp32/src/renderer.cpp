// ============================================================
// renderer.cpp — TFT_eSPI-based scene renderer
// ============================================================

#include "renderer.h"
#include "config.h"
#include <cmath>

// ---- Coordinate mapping ----------------------------------

inline int Renderer::toScreenX(float x) {
    return (int)((x + 100.0f) / 200.0f * DISPLAY_WIDTH);
}

inline int Renderer::toScreenY(float y) {
    return (int)((y + 100.0f) / 200.0f * DISPLAY_HEIGHT);
}

// Scale a radius/half-dimension from scene units to pixels.
inline int Renderer::toScreenR(float r) {
    return (int)(r / 200.0f * DISPLAY_WIDTH);
}

// ---- Color helpers ---------------------------------------

uint16_t Renderer::rgb24to565(uint32_t rgb) const {
    uint8_t r = (rgb >> 16) & 0xFF;
    uint8_t g = (rgb >>  8) & 0xFF;
    uint8_t b =  rgb        & 0xFF;
    return _tft.color565(r, g, b);
}

// ---- Public API ------------------------------------------

void Renderer::begin() {
    _tft.init();
    _tft.setRotation(0);

    // Enable backlight (active HIGH on most boards)
    pinMode(PIN_TFT_BL, OUTPUT);
    digitalWrite(PIN_TFT_BL, HIGH);

    clear();
    Serial.println("[Renderer] Display initialised");
}

void Renderer::clear() {
    _tft.fillScreen(TFT_BLACK);
}

void Renderer::showStatus(const char* line1, const char* line2) {
    _tft.fillScreen(TFT_BLACK);
    _tft.setTextColor(TFT_WHITE, TFT_BLACK);
    _tft.setTextSize(2);
    _tft.setCursor(4, 4);
    _tft.print(line1);
    if (line2) {
        _tft.setCursor(4, 24);
        _tft.print(line2);
    }
}

void Renderer::drawScene(const SceneStore& store) {
    const auto& order  = store.order();
    const auto& shapes = store.shapes();

    if (order.empty()) return;  // nothing to draw

    // Draw in insertion order; background / face_base are always first
    // because set_scene sends them first per the protocol spec.
    for (const String& id : order) {
        auto it = shapes.find(id);
        if (it != shapes.end()) {
            drawShape(it->second);
        }
    }
}

// ---- Shape dispatcher ------------------------------------

void Renderer::drawShape(const Shape& shape) {
    // Skip nearly-transparent shapes (TFT_eSPI has no alpha support)
    if (shape.style.opacity < 0.1f) return;

    switch (shape.type) {
        case ShapeType::CIRCLE:  drawCircle(shape);  break;
        case ShapeType::ELLIPSE: drawEllipse(shape); break;
        case ShapeType::RECT:    drawRect(shape);    break;
        case ShapeType::LINE:    drawLine(shape);    break;
        case ShapeType::ARC:     drawArc(shape);     break;
        default: break;
    }
}

// ---- Individual shape renderers --------------------------

void Renderer::drawCircle(const Shape& s) {
    int cx = toScreenX(s.transform.x);
    int cy = toScreenY(s.transform.y);
    int r  = toScreenR(s.props.radius);

    uint16_t fillColor   = rgb24to565(s.style.fill);
    uint16_t strokeColor = rgb24to565(s.style.stroke);

    _tft.fillCircle(cx, cy, r, fillColor);
    _tft.drawCircle(cx, cy, r, strokeColor);
}

void Renderer::drawEllipse(const Shape& s) {
    int cx = toScreenX(s.transform.x);
    int cy = toScreenY(s.transform.y);
    int rx = toScreenR(s.props.rx);
    int ry = toScreenR(s.props.ry);

    uint16_t fillColor   = rgb24to565(s.style.fill);
    uint16_t strokeColor = rgb24to565(s.style.stroke);

    _tft.fillEllipse(cx, cy, rx, ry, fillColor);
    _tft.drawEllipse(cx, cy, rx, ry, strokeColor);
}

void Renderer::drawRect(const Shape& s) {
    int cx = toScreenX(s.transform.x);
    int cy = toScreenY(s.transform.y);
    int w  = toScreenR(s.props.width  / 2.0f);  // half-width: DSL width is full dimension
    int h  = toScreenR(s.props.height / 2.0f);  // half-height: DSL height is full dimension

    // Scene rect is centred on transform.x,y; TFT_eSPI drawRect takes top-left
    int tlx = cx - w;
    int tly = cy - h;

    uint16_t fillColor   = rgb24to565(s.style.fill);
    uint16_t strokeColor = rgb24to565(s.style.stroke);

    _tft.fillRect(tlx, tly, w * 2, h * 2, fillColor);
    _tft.drawRect(tlx, tly, w * 2, h * 2, strokeColor);
}

void Renderer::drawLine(const Shape& s) {
    // Line endpoints are relative to transform origin
    int x1 = toScreenX(s.transform.x + s.props.x1);
    int y1 = toScreenY(s.transform.y + s.props.y1);
    int x2 = toScreenX(s.transform.x + s.props.x2);
    int y2 = toScreenY(s.transform.y + s.props.y2);

    uint16_t strokeColor = rgb24to565(s.style.stroke);
    _tft.drawLine(x1, y1, x2, y2, strokeColor);
}

void Renderer::drawArc(const Shape& s) {
    int cx = toScreenX(s.transform.x);
    int cy = toScreenY(s.transform.y);
    int r  = toScreenR(s.props.radius);

    uint16_t strokeColor = rgb24to565(s.style.stroke);

    // Approximate the arc with short line segments (5° steps)
    const float step = 5.0f;
    float start = s.props.startAngle;
    float end   = s.props.endAngle;

    // Normalise direction
    if (end < start) end += 360.0f;

    float prev_x = cx + r * cosf(start * M_PI / 180.0f);
    float prev_y = cy + r * sinf(start * M_PI / 180.0f);

    for (float angle = start + step; angle <= end; angle += step) {
        float cur_x = cx + r * cosf(angle * M_PI / 180.0f);
        float cur_y = cy + r * sinf(angle * M_PI / 180.0f);
        _tft.drawLine((int)prev_x, (int)prev_y,
                      (int)cur_x,  (int)cur_y, strokeColor);
        prev_x = cur_x;
        prev_y = cur_y;
    }

    // Close to exact end angle
    float end_x = cx + r * cosf(end * M_PI / 180.0f);
    float end_y = cy + r * sinf(end * M_PI / 180.0f);
    _tft.drawLine((int)prev_x, (int)prev_y, (int)end_x, (int)end_y, strokeColor);
}
