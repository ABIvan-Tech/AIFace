package com.aiface.shared.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

@Serializable
data class SceneDocument(
    val schema: String = SCHEMA_V1,
    val scene: List<Shape> = emptyList()
)

@Serializable
data class Shape(
    val id: String,
    val type: ShapeType,
    val transform: ShapeTransform = ShapeTransform(),
    val style: ShapeStyle = ShapeStyle(),
    val props: JsonObject = JsonObject(emptyMap())
)

@Serializable
enum class ShapeType {
    @SerialName("circle")
    CIRCLE,

    @SerialName("ellipse")
    ELLIPSE,

    @SerialName("rect")
    RECT,

    @SerialName("line")
    LINE,

    @SerialName("triangle")
    TRIANGLE,
    
    @SerialName("arc")
    ARC,
}

@Serializable
data class ShapeTransform(
    val x: Float = 0f,
    val y: Float = 0f,
    val rotation: Float = 0f
)

@Serializable
data class ShapeStyle(
    val fill: String? = null,
    val stroke: String? = null,
    val strokeWidth: Float = 0f,
    val opacity: Float = 1f
)

@Serializable
data class Mutation(
    val op: MutationOp,
    val id: String,
    val shape: Shape? = null
)

@Serializable
enum class MutationOp {
    @SerialName("add")
    ADD,

    @SerialName("update")
    UPDATE,

    @SerialName("remove")
    REMOVE,
}
