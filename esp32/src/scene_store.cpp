// ============================================================
// scene_store.cpp — Implementation of SceneStore
// ============================================================

#include "scene_store.h"
#include <cstring>
#include <cstdlib>

// ---- Public API ------------------------------------------

void SceneStore::setScene(JsonArrayConst shapes) {
    _shapes.clear();
    _order.clear();
    for (JsonObjectConst obj : shapes) {
        Shape s = parseShape(obj);
        if (s.id.length() == 0) continue;
        _order.push_back(s.id);
        _shapes[s.id] = s;
    }
    _dirty = true;
}

void SceneStore::applyMutations(JsonArrayConst mutations) {
    for (JsonObjectConst mut : mutations) {
        const char* id = mut["id"] | "";
        if (strlen(id) == 0) continue;

        auto it = _shapes.find(String(id));
        if (it == _shapes.end()) continue;  // unknown id — skip

        applyMutation(it->second, mut);
    }
    _dirty = true;
}

void SceneStore::reset() {
    _shapes.clear();
    _order.clear();
    _dirty = true;
}

// ---- Private helpers -------------------------------------

Shape SceneStore::parseShape(JsonObjectConst obj) {
    Shape s;
    s.id   = obj["id"]   | "";
    s.type = parseShapeType(obj["type"] | "");

    // Transform
    JsonObjectConst tr = obj["transform"];
    if (!tr.isNull()) {
        s.transform.x        = tr["x"]        | 0.0f;
        s.transform.y        = tr["y"]        | 0.0f;
        s.transform.rotation = tr["rotation"] | 0.0f;
    }

    // Style
    JsonObjectConst st = obj["style"];
    if (!st.isNull()) {
        s.style.fill    = parseColor(st["fill"]   | "#FFFFFF");
        s.style.stroke  = parseColor(st["stroke"] | "#000000");
        s.style.opacity = st["opacity"] | 1.0f;
    }

    // Props
    JsonObjectConst pr = obj["props"];
    if (!pr.isNull()) {
        s.props.radius     = pr["radius"]     | 0.0f;
        s.props.rx         = pr["rx"]         | 0.0f;
        s.props.ry         = pr["ry"]         | 0.0f;
        s.props.width      = pr["width"]      | 0.0f;
        s.props.height     = pr["height"]     | 0.0f;
        s.props.x1         = pr["x1"]         | 0.0f;
        s.props.y1         = pr["y1"]         | 0.0f;
        s.props.x2         = pr["x2"]         | 0.0f;
        s.props.y2         = pr["y2"]         | 0.0f;
        s.props.startAngle = pr["startAngle"] | 0.0f;
        s.props.endAngle   = pr["endAngle"]   | 360.0f;
        s.props.sweepAngle = pr["sweepAngle"] | 360.0f;
    }

    return s;
}

void SceneStore::applyMutation(Shape& shape, JsonObjectConst mut) {
    // op must be "update" in v1; other ops are ignored
    const char* op = mut["op"] | "update";
    if (strcmp(op, "update") != 0) return;

    JsonObjectConst tr = mut["transform"];
    if (!tr.isNull()) {
        if (!tr["x"].isNull())        shape.transform.x        = tr["x"];
        if (!tr["y"].isNull())        shape.transform.y        = tr["y"];
        if (!tr["rotation"].isNull()) shape.transform.rotation = tr["rotation"];
    }

    JsonObjectConst st = mut["style"];
    if (!st.isNull()) {
        if (!st["fill"].isNull())    shape.style.fill    = parseColor(st["fill"]);
        if (!st["stroke"].isNull())  shape.style.stroke  = parseColor(st["stroke"]);
        if (!st["opacity"].isNull()) shape.style.opacity = st["opacity"];
    }

    JsonObjectConst pr = mut["props"];
    if (!pr.isNull()) {
        if (!pr["radius"].isNull())     shape.props.radius     = pr["radius"];
        if (!pr["rx"].isNull())         shape.props.rx         = pr["rx"];
        if (!pr["ry"].isNull())         shape.props.ry         = pr["ry"];
        if (!pr["width"].isNull())      shape.props.width      = pr["width"];
        if (!pr["height"].isNull())     shape.props.height     = pr["height"];
        if (!pr["x1"].isNull())         shape.props.x1         = pr["x1"];
        if (!pr["y1"].isNull())         shape.props.y1         = pr["y1"];
        if (!pr["x2"].isNull())         shape.props.x2         = pr["x2"];
        if (!pr["y2"].isNull())         shape.props.y2         = pr["y2"];
        if (!pr["startAngle"].isNull()) shape.props.startAngle = pr["startAngle"];
        if (!pr["endAngle"].isNull())   shape.props.endAngle   = pr["endAngle"];
        if (!pr["sweepAngle"].isNull()) shape.props.sweepAngle = pr["sweepAngle"];
    }
}

// Parse "#RRGGBB" hex string into packed uint32_t (0x00RRGGBB).
uint32_t SceneStore::parseColor(const char* hex) {
    if (!hex || hex[0] != '#' || strlen(hex) < 7) return 0xFFFFFF;
    char buf[3] = {0};

    buf[0] = hex[1]; buf[1] = hex[2];
    uint8_t r = (uint8_t)strtol(buf, nullptr, 16);

    buf[0] = hex[3]; buf[1] = hex[4];
    uint8_t g = (uint8_t)strtol(buf, nullptr, 16);

    buf[0] = hex[5]; buf[1] = hex[6];
    uint8_t b = (uint8_t)strtol(buf, nullptr, 16);

    return ((uint32_t)r << 16) | ((uint32_t)g << 8) | b;
}

ShapeType SceneStore::parseShapeType(const char* typeStr) {
    if (!typeStr) return ShapeType::UNKNOWN;
    if (strcmp(typeStr, "circle")  == 0) return ShapeType::CIRCLE;
    if (strcmp(typeStr, "ellipse") == 0) return ShapeType::ELLIPSE;
    if (strcmp(typeStr, "rect")    == 0) return ShapeType::RECT;
    if (strcmp(typeStr, "line")    == 0) return ShapeType::LINE;
    if (strcmp(typeStr, "arc")     == 0) return ShapeType::ARC;
    return ShapeType::UNKNOWN;
}
