// ============================================================
// renderer.cpp — TFT_eSPI-based scene renderer
// ============================================================

#include "renderer.h"
#include "config.h"
#include <cmath>
#include <algorithm>

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

// Sprite Y: scene → screen pixel, then offset -20 (sprite starts at screen y=20)
inline int Renderer::toSpriteY(float y) {
    return toScreenY(y) - 20;
}

// ---- Color helpers ---------------------------------------

uint16_t Renderer::rgb24to565(uint32_t rgb) {
    uint8_t r = (rgb >> 16) & 0xFF;
    uint8_t g = (rgb >>  8) & 0xFF;
    uint8_t b =  rgb        & 0xFF;
    return _tft.color565(r, g, b);
}

// ---- Public API ------------------------------------------

void Renderer::begin() {
    _tft.init();
    _tft.setRotation(1);  // 90° clockwise

    // Enable backlight (active HIGH on most boards)
    pinMode(PIN_TFT_BL, OUTPUT);
    digitalWrite(PIN_TFT_BL, HIGH);

    // Allocate sprite in PSRAM for flicker-free rendering (240×220 face area)
    _sprite.setColorDepth(16);
    _spriteReady = _sprite.createSprite(DISPLAY_WIDTH, DISPLAY_HEIGHT - 20);
    if (!_spriteReady) Serial.println("[Renderer] WARN: sprite alloc failed, using direct draw");

    clear();
    Serial.println("[Renderer] Display initialised");
}

void Renderer::clear() {
    _tft.fillScreen(TFT_BLACK);
}

void Renderer::drawStatusBar(const char* text) {
    // Dark strip at top (20 px) — always drawn directly to TFT, never to sprite
    _tft.fillRect(0, 0, DISPLAY_WIDTH, 20, _tft.color565(30, 30, 30));
    _tft.setTextColor(TFT_WHITE, _tft.color565(30, 30, 30));
    _tft.setTextSize(1);
    _tft.setCursor(4, 6);
    _tft.print(text);
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

void Renderer::drawScene(const SceneStore& store, const LifeSim& lifeSim) {
    const auto& order  = store.order();
    const auto& shapes = store.shapes();

    if (order.empty()) return;  // nothing to draw

    // If sprite is available, fill it black before drawing shapes.
    // The background rect shape will cover it with the scene background colour.
    if (_spriteReady) {
        _sprite.fillSprite(TFT_BLACK);
    }

    // Draw in insertion order; background / face_base are always first
    // because set_scene sends them first per the protocol spec.
    for (const String& id : order) {
        auto it = shapes.find(id);
        if (it == shapes.end()) continue;

        if (lifeSim.isActive()) {
            // Apply life-sim offsets for known face parts — copy to avoid mutating the store
            Shape live = it->second;
            lifeSim.applyShape(live, id);
            drawShape(live);
        } else {
            drawShape(it->second);
        }
    }

    if (_spriteReady) {
        // Push rendered sprite to screen below the 20px status bar
        _sprite.pushSprite(0, 20);
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
    int cy = _spriteReady ? toSpriteY(s.transform.y) : toScreenY(s.transform.y);
    int r  = toScreenR(s.props.radius);

    uint16_t fillColor   = rgb24to565(s.style.fill);
    uint16_t strokeColor = rgb24to565(s.style.stroke);

    if (_spriteReady) {
        _sprite.fillCircle(cx, cy, r, fillColor);
        _sprite.drawCircle(cx, cy, r, strokeColor);
    } else {
        _tft.fillCircle(cx, cy, r, fillColor);
        _tft.drawCircle(cx, cy, r, strokeColor);
    }
}

void Renderer::drawEllipse(const Shape& s) {
    int cx = toScreenX(s.transform.x);
    int cy = _spriteReady ? toSpriteY(s.transform.y) : toScreenY(s.transform.y);
    int rx = toScreenR(s.props.width  / 2.0f);  // half-width
    int ry = toScreenR(s.props.height / 2.0f);  // half-height

    uint16_t fillColor   = rgb24to565(s.style.fill);
    uint16_t strokeColor = rgb24to565(s.style.stroke);

    if (_spriteReady) {
        _sprite.fillEllipse(cx, cy, rx, ry, fillColor);
        _sprite.drawEllipse(cx, cy, rx, ry, strokeColor);
    } else {
        _tft.fillEllipse(cx, cy, rx, ry, fillColor);
        _tft.drawEllipse(cx, cy, rx, ry, strokeColor);
    }
}

void Renderer::drawRect(const Shape& s) {
    int cx = toScreenX(s.transform.x);
    int cy = _spriteReady ? toSpriteY(s.transform.y) : toScreenY(s.transform.y);
    int w  = toScreenR(s.props.width  / 2.0f);  // half-width: DSL width is full dimension
    int h  = toScreenR(s.props.height / 2.0f);  // half-height: DSL height is full dimension

    // Scene rect is centred on transform.x,y; TFT_eSPI drawRect takes top-left
    int tlx = cx - w;
    int tly = cy - h;

    uint16_t fillColor   = rgb24to565(s.style.fill);
    uint16_t strokeColor = rgb24to565(s.style.stroke);

    if (_spriteReady) {
        _sprite.fillRect(tlx, tly, w * 2, h * 2, fillColor);
        _sprite.drawRect(tlx, tly, w * 2, h * 2, strokeColor);
    } else {
        _tft.fillRect(tlx, tly, w * 2, h * 2, fillColor);
        _tft.drawRect(tlx, tly, w * 2, h * 2, strokeColor);
    }
}

void Renderer::drawLine(const Shape& s) {
    // Line endpoints are relative to transform origin
    int x1 = toScreenX(s.transform.x + s.props.x1);
    int y1 = _spriteReady ? toSpriteY(s.transform.y + s.props.y1) : toScreenY(s.transform.y + s.props.y1);
    int x2 = toScreenX(s.transform.x + s.props.x2);
    int y2 = _spriteReady ? toSpriteY(s.transform.y + s.props.y2) : toScreenY(s.transform.y + s.props.y2);

    uint16_t strokeColor = rgb24to565(s.style.stroke);

    // Use drawWideLine for thick lines (strokeWidth > 1 scene unit)
    if (s.style.strokeWidth > 1.0f) {
        float lw = std::max(1.0f, (float)toScreenR(s.style.strokeWidth));
        if (_spriteReady) {
            _sprite.drawWideLine((float)x1, (float)y1, (float)x2, (float)y2, lw, strokeColor);
        } else {
            _tft.drawWideLine((float)x1, (float)y1, (float)x2, (float)y2, lw, strokeColor);
        }
    } else {
        if (_spriteReady) {
            _sprite.drawLine(x1, y1, x2, y2, strokeColor);
        } else {
            _tft.drawLine(x1, y1, x2, y2, strokeColor);
        }
    }
}

void Renderer::drawArc(const Shape& s) {
    int cx = toScreenX(s.transform.x);
    int cy = _spriteReady ? toSpriteY(s.transform.y) : toScreenY(s.transform.y);
    int rx = toScreenR(s.props.width  / 2.0f);  // horizontal semi-axis
    int ry = toScreenR(s.props.height / 2.0f);  // vertical semi-axis

    uint16_t strokeColor = rgb24to565(s.style.stroke);

    float start = s.props.startAngle;
    float sweep = s.props.sweepAngle;
    float end   = start + sweep;

    // Walk in 5° steps; handle both positive (smile) and negative (frown) sweep
    const float step = (sweep >= 0) ? 5.0f : -5.0f;

    float prev_x = cx + rx * cosf(start * M_PI / 180.0f);
    float prev_y = cy + ry * sinf(start * M_PI / 180.0f);

    float angle = start + step;
    while ((sweep >= 0) ? (angle <= end) : (angle >= end)) {
        float cur_x = cx + rx * cosf(angle * M_PI / 180.0f);
        float cur_y = cy + ry * sinf(angle * M_PI / 180.0f);
        if (_spriteReady) {
            _sprite.drawLine((int)prev_x, (int)prev_y, (int)cur_x, (int)cur_y, strokeColor);
        } else {
            _tft.drawLine((int)prev_x, (int)prev_y, (int)cur_x, (int)cur_y, strokeColor);
        }
        prev_x = cur_x;
        prev_y = cur_y;
        angle += step;
    }
    // Close to exact end angle
    float end_x = cx + rx * cosf(end * M_PI / 180.0f);
    float end_y = cy + ry * sinf(end * M_PI / 180.0f);
    if (_spriteReady) {
        _sprite.drawLine((int)prev_x, (int)prev_y, (int)end_x, (int)end_y, strokeColor);
    } else {
        _tft.drawLine((int)prev_x, (int)prev_y, (int)end_x, (int)end_y, strokeColor);
    }
}
