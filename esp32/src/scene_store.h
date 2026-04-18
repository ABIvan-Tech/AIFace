#pragma once

// ============================================================
// scene_store.h — In-memory store for the current scene
// ============================================================

#include "scene.h"
#include <ArduinoJson.h>
#include <map>
#include <vector>
#include <string>

class SceneStore {
public:
    // Replace the entire scene with the shapes in the JSON array.
    void setScene(JsonArrayConst shapes);

    // Apply partial updates to existing shapes.
    void applyMutations(JsonArrayConst mutations);

    // Clear all shapes (called on WebSocket disconnect / reset frame).
    void reset();

    // Pre-populate with a neutral face so the display is not blank before MCP connects
    void loadDefaultScene();

    // Read-only access to the current scene for the renderer.
    // Insertion-order is preserved via the _order vector.
    const std::vector<String>& order()  const { return _order;  }
    const std::map<String, Shape>& shapes() const { return _shapes; }

    // Dirty flag — set whenever the scene changes; cleared by the render loop.
    bool isDirty()    const { return _dirty; }
    void clearDirty()       { _dirty = false; }
    void markDirty()        { _dirty = true; }  // used by LifeSim to force re-render

private:
    std::map<String, Shape>  _shapes;  // id → Shape
    std::vector<String>      _order;   // insertion order for draw order
    bool                     _dirty = false;

    // Helpers
    static Shape        parseShape(JsonObjectConst obj);
    static void         applyMutation(Shape& shape, JsonObjectConst mut);
    static uint32_t     parseColor(const char* hex);
    static ShapeType    parseShapeType(const char* typeStr);
};
