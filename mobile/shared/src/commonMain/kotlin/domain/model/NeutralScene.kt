package com.aiface.shared.domain.model

import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

val NeutralSceneDocument = SceneDocument(
    schema = SCHEMA_V1,
    scene = listOf(
        Shape(
            id = "background",
            type = ShapeType.RECT,
            style = ShapeStyle(fill = "#FFFFFF"),
            props = buildJsonObject {
                put("width", 200)
                put("height", 200)
            }
        ),
        Shape(
            id = PROTECTED_SHAPE_ID,
            type = ShapeType.CIRCLE,
            style = ShapeStyle(fill = "#FFD8B0"),
            props = buildJsonObject {
                put("radius", 90)
            }
        ),
        Shape(
            id = "left_brow",
            type = ShapeType.LINE,
            style = ShapeStyle(stroke = "#000000", strokeWidth = 4f),
            props = buildJsonObject {
                put("x1", -40)
                put("y1", -35)
                put("x2", -15)
                put("y2", -35)
            }
        ),
        Shape(
            id = "right_brow",
            type = ShapeType.LINE,
            style = ShapeStyle(stroke = "#000000", strokeWidth = 4f),
            props = buildJsonObject {
                put("x1", 15)
                put("y1", -35)
                put("x2", 40)
                put("y2", -35)
            }
        ),
        Shape(
            id = "left_eye",
            type = ShapeType.CIRCLE,
            transform = ShapeTransform(x = -30f, y = -20f),
            style = ShapeStyle(fill = "#000000"),
            props = buildJsonObject {
                put("radius", 8)
            }
        ),
        Shape(
            id = "right_eye",
            type = ShapeType.CIRCLE,
            transform = ShapeTransform(x = 30f, y = -20f),
            style = ShapeStyle(fill = "#000000"),
            props = buildJsonObject {
                put("radius", 8)
            }
        ),
        Shape(
            id = "mouth",
            type = ShapeType.LINE,
            style = ShapeStyle(stroke = "#000000", strokeWidth = 4f),
            props = buildJsonObject {
                put("x1", -25)
                put("y1", 35)
                put("x2", 25)
                put("y2", 35)
            }
        )
    )
)
