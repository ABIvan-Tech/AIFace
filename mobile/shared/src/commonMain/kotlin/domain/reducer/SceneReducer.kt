package com.aiface.shared.domain.reducer

import com.aiface.shared.domain.model.MAX_SHAPES
import com.aiface.shared.domain.model.Mutation
import com.aiface.shared.domain.model.MutationOp
import com.aiface.shared.domain.model.PROTECTED_SHAPE_ID
import com.aiface.shared.domain.model.Shape

fun sanitizeScene(shapes: List<Shape>): List<Shape> {
    if (shapes.isEmpty()) {
        return emptyList()
    }

    val deduplicated = LinkedHashMap<String, Shape>(shapes.size)
    for (shape in shapes.take(MAX_SHAPES)) {
        deduplicated[shape.id] = shape
    }
    return deduplicated.values.toList()
}

fun applyMutations(currentScene: List<Shape>, mutations: List<Mutation>): List<Shape> {
    if (mutations.isEmpty()) {
        return currentScene
    }

    val mutableScene = currentScene.toMutableList()

    for (mutation in mutations) {
        when (mutation.op) {
            MutationOp.ADD -> {
                val shape = mutation.shape ?: continue
                if (mutableScene.size >= MAX_SHAPES) continue

                val existingIndex = mutableScene.indexOfFirst { it.id == shape.id }
                if (existingIndex >= 0) {
                    mutableScene[existingIndex] = shape
                } else {
                    mutableScene.add(shape)
                }
            }

            MutationOp.UPDATE -> {
                val shape = mutation.shape ?: continue
                if (shape.id != mutation.id) continue

                val existingIndex = mutableScene.indexOfFirst { it.id == mutation.id }
                if (existingIndex >= 0) {
                    mutableScene[existingIndex] = shape
                }
            }

            MutationOp.REMOVE -> {
                if (mutation.id == PROTECTED_SHAPE_ID) continue
                mutableScene.removeAll { it.id == mutation.id }
            }
        }
    }

    return sanitizeScene(mutableScene)
}
