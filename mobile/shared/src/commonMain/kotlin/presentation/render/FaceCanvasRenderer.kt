package com.aiface.shared.presentation.render

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.withTransform
import com.aiface.shared.domain.model.Shape
import com.aiface.shared.domain.model.ShapeType
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonPrimitive

@Composable
fun AnimatedFaceCanvas(
    scene: List<Shape>,
    modifier: Modifier = Modifier,
) {
    var previousScene by remember { mutableStateOf(scene) }
    var targetScene by remember { mutableStateOf(scene) }
    val progress = remember { Animatable(1f) }

    LaunchedEffect(scene) {
        previousScene = targetScene
        targetScene = scene
        progress.snapTo(0f)
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 200)
        )
    }

    val drawScene = interpolateScene(previousScene, targetScene, progress.value)

    Canvas(modifier = modifier.fillMaxSize()) {
        val mapper = WorldMapper(size)

        for (shape in drawScene) {
            drawShape(shape, mapper)
        }
    }
}

private data class WorldMapper(
    private val size: Size,
) {
    private val scale: Float = min(size.width, size.height) / 220f
    private val centerX: Float = size.width / 2f
    private val centerY: Float = size.height / 2f

    fun worldToPx(x: Float, y: Float): Offset = Offset(
        x = centerX + (x * scale),
        y = centerY + (y * scale)
    )

    fun lengthToPx(value: Float): Float = value * scale
}

private fun DrawScope.drawShape(shape: Shape, mapper: WorldMapper) {
    val opacity = shape.style.opacity.coerceIn(0f, 1f)
    val fillColor = parseHexColor(shape.style.fill, opacity)
    val strokeColor = parseHexColor(shape.style.stroke, opacity)
    val strokeWidthPx = mapper.lengthToPx(shape.style.strokeWidth.coerceAtLeast(0f))

    when (shape.type) {
        ShapeType.CIRCLE -> {
            val radiusPx = mapper.lengthToPx(shape.props.float("radius"))
            if (radiusPx <= 0f) return

            val center = mapper.worldToPx(shape.transform.x, shape.transform.y)
            fillColor?.let { drawCircle(color = it, radius = radiusPx, center = center) }
            if (strokeColor != null && strokeWidthPx > 0f) {
                drawCircle(
                    color = strokeColor,
                    radius = radiusPx,
                    center = center,
                    style = Stroke(width = strokeWidthPx)
                )
            }
        }

        ShapeType.ELLIPSE -> {
            val widthPx = mapper.lengthToPx(shape.props.float("rx") * 2f)
            val heightPx = mapper.lengthToPx(shape.props.float("ry") * 2f)
            if (widthPx <= 0f || heightPx <= 0f) return

            val center = mapper.worldToPx(shape.transform.x, shape.transform.y)
            withTransform({
                translate(left = center.x, top = center.y)
                rotate(degrees = shape.transform.rotation)
            }) {
                val topLeft = Offset(-widthPx / 2f, -heightPx / 2f)
                val size = Size(widthPx, heightPx)

                fillColor?.let {
                    drawOval(color = it, topLeft = topLeft, size = size, style = Fill)
                }
                if (strokeColor != null && strokeWidthPx > 0f) {
                    drawOval(
                        color = strokeColor,
                        topLeft = topLeft,
                        size = size,
                        style = Stroke(width = strokeWidthPx)
                    )
                }
            }
        }

        ShapeType.RECT -> {
            val widthPx = mapper.lengthToPx(shape.props.float("width"))
            val heightPx = mapper.lengthToPx(shape.props.float("height"))
            if (widthPx <= 0f || heightPx <= 0f) return

            val center = mapper.worldToPx(shape.transform.x, shape.transform.y)
            withTransform({
                translate(left = center.x, top = center.y)
                rotate(degrees = shape.transform.rotation)
            }) {
                val topLeft = Offset(-widthPx / 2f, -heightPx / 2f)
                val size = Size(widthPx, heightPx)

                fillColor?.let {
                    drawRect(color = it, topLeft = topLeft, size = size, style = Fill)
                }
                if (strokeColor != null && strokeWidthPx > 0f) {
                    drawRect(
                        color = strokeColor,
                        topLeft = topLeft,
                        size = size,
                        style = Stroke(width = strokeWidthPx)
                    )
                }
            }
        }

        ShapeType.LINE -> {
            val p1 = Offset(shape.props.float("x1"), shape.props.float("y1"))
            val p2 = Offset(shape.props.float("x2"), shape.props.float("y2"))

            val start = mapper.worldToPx(
                x = rotatePoint(p1, shape.transform.rotation).x + shape.transform.x,
                y = rotatePoint(p1, shape.transform.rotation).y + shape.transform.y
            )
            val end = mapper.worldToPx(
                x = rotatePoint(p2, shape.transform.rotation).x + shape.transform.x,
                y = rotatePoint(p2, shape.transform.rotation).y + shape.transform.y
            )

            if (strokeColor != null && strokeWidthPx > 0f) {
                drawLine(
                    color = strokeColor,
                    start = start,
                    end = end,
                    strokeWidth = strokeWidthPx,
                    cap = StrokeCap.Round
                )
            }
        }

        ShapeType.TRIANGLE -> {
            val a = Offset(shape.props.float("ax"), shape.props.float("ay"))
            val b = Offset(shape.props.float("bx"), shape.props.float("by"))
            val c = Offset(shape.props.float("cx"), shape.props.float("cy"))

            val pa = mapper.worldToPx(
                x = rotatePoint(a, shape.transform.rotation).x + shape.transform.x,
                y = rotatePoint(a, shape.transform.rotation).y + shape.transform.y
            )
            val pb = mapper.worldToPx(
                x = rotatePoint(b, shape.transform.rotation).x + shape.transform.x,
                y = rotatePoint(b, shape.transform.rotation).y + shape.transform.y
            )
            val pc = mapper.worldToPx(
                x = rotatePoint(c, shape.transform.rotation).x + shape.transform.x,
                y = rotatePoint(c, shape.transform.rotation).y + shape.transform.y
            )

            val path = Path().apply {
                moveTo(pa.x, pa.y)
                lineTo(pb.x, pb.y)
                lineTo(pc.x, pc.y)
                close()
            }

            fillColor?.let {
                drawPath(path = path, color = it, style = Fill)
            }
            if (strokeColor != null && strokeWidthPx > 0f) {
                drawPath(
                    path = path,
                    color = strokeColor,
                    style = Stroke(width = strokeWidthPx)
                )
            }
        }

        ShapeType.ARC -> {
            val widthPx = mapper.lengthToPx(shape.props.float("width"))
            val heightPx = mapper.lengthToPx(shape.props.float("height"))
            val startAngle = shape.props.float("startAngle")
            val sweepAngle = shape.props.float("sweepAngle")
            
            if (widthPx <= 0f || heightPx <= 0f) return

            val center = mapper.worldToPx(shape.transform.x, shape.transform.y)
            withTransform({
                translate(left = center.x, top = center.y)
                rotate(degrees = shape.transform.rotation)
            }) {
                val topLeft = Offset(-widthPx / 2f, -heightPx / 2f)
                val size = Size(widthPx, heightPx)

                fillColor?.let {
                    drawArc(
                        color = it,
                        startAngle = startAngle,
                        sweepAngle = sweepAngle,
                        useCenter = false,
                        topLeft = topLeft,
                        size = size,
                        style = Fill
                    )
                }
                if (strokeColor != null && strokeWidthPx > 0f) {
                    drawArc(
                        color = strokeColor,
                        startAngle = startAngle,
                        sweepAngle = sweepAngle,
                        useCenter = false,
                        topLeft = topLeft,
                        size = size,
                        style = Stroke(width = strokeWidthPx, cap = StrokeCap.Round)
                    )
                }
            }
        }
    }
}

private fun parseHexColor(hex: String?, opacity: Float): Color? {
    if (hex.isNullOrBlank()) return null

    val normalized = hex.removePrefix("#")
    val expanded = when (normalized.length) {
        3 -> buildString(8) {
            append("FF")
            append(normalized[0]); append(normalized[0])
            append(normalized[1]); append(normalized[1])
            append(normalized[2]); append(normalized[2])
        }
        4 -> buildString(8) {
            append(normalized[0]); append(normalized[0])
            append(normalized[1]); append(normalized[1])
            append(normalized[2]); append(normalized[2])
            append(normalized[3]); append(normalized[3])
        }
        6 -> "FF$normalized"
        8 -> normalized
        else -> return null
    }

    val argb = expanded.toLongOrNull(16) ?: return null
    val a = ((argb shr 24) and 0xFF).toInt()
    val r = ((argb shr 16) and 0xFF).toInt()
    val g = ((argb shr 8) and 0xFF).toInt()
    val b = (argb and 0xFF).toInt()

    val effectiveAlpha = ((a / 255f) * opacity).coerceIn(0f, 1f)
    return Color(
        red = r / 255f,
        green = g / 255f,
        blue = b / 255f,
        alpha = effectiveAlpha
    )
}

private fun rotatePoint(point: Offset, degrees: Float): Offset {
    val radians = degrees * (PI / 180f).toFloat()
    val cosine = cos(radians)
    val sine = sin(radians)
    return Offset(
        x = (point.x * cosine) - (point.y * sine),
        y = (point.x * sine) + (point.y * cosine)
    )
}

private fun interpolateScene(
    previousScene: List<Shape>,
    targetScene: List<Shape>,
    progress: Float,
): List<Shape> {
    if (progress >= 1f) return targetScene

    val previousById = previousScene.associateBy { it.id }

    return targetScene.map { target ->
        val previous = previousById[target.id]
        if (previous == null || previous.type != target.type) {
            target
        } else {
            previous.interpolateTo(target, progress)
        }
    }
}

private fun Shape.interpolateTo(target: Shape, progress: Float): Shape {
    return target.copy(
        transform = target.transform.copy(
            x = lerp(this.transform.x, target.transform.x, progress),
            y = lerp(this.transform.y, target.transform.y, progress),
            rotation = lerp(this.transform.rotation, target.transform.rotation, progress)
        ),
        style = target.style.copy(
            opacity = lerp(this.style.opacity, target.style.opacity, progress),
            strokeWidth = lerp(this.style.strokeWidth, target.style.strokeWidth, progress),
        ),
        props = interpolateProps(this.props, target.props, progress)
    )
}

private fun interpolateProps(from: JsonObject, to: JsonObject, progress: Float): JsonObject {
    val merged = LinkedHashMap<String, JsonElement>(to.size)

    for ((key, toValue) in to) {
        val toNumber = toValue.toFloatOrNull()
        val fromNumber = from[key]?.toFloatOrNull()

        merged[key] = if (toNumber != null && fromNumber != null) {
            JsonPrimitive(lerp(fromNumber, toNumber, progress).toDouble())
        } else {
            toValue
        }
    }

    return JsonObject(merged)
}

private fun JsonObject.float(key: String): Float {
    return this[key].toFloatOrNull() ?: 0f
}

private fun JsonElement?.toFloatOrNull(): Float? {
    return this
        ?.jsonPrimitive
        ?.doubleOrNull
        ?.toFloat()
}

private fun lerp(start: Float, stop: Float, fraction: Float): Float {
    return start + ((stop - start) * fraction)
}
