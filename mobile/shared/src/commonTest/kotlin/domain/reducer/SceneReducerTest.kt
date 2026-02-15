package domain.reducer

import com.aiface.shared.domain.model.Mutation
import com.aiface.shared.domain.model.MutationOp
import com.aiface.shared.domain.model.NeutralSceneDocument
import com.aiface.shared.domain.model.PROTECTED_SHAPE_ID
import com.aiface.shared.domain.model.Shape
import com.aiface.shared.domain.model.ShapeType
import com.aiface.shared.domain.model.ShapeTransform
import com.aiface.shared.domain.reducer.applyMutations
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class SceneReducerTest {

    @Test
    fun `update replaces shape by id`() {
        val current = NeutralSceneDocument.scene
        val mutation = Mutation(
            op = MutationOp.UPDATE,
            id = "mouth",
            shape = Shape(
                id = "mouth",
                type = ShapeType.LINE,
                transform = ShapeTransform(rotation = -15f),
                props = buildJsonObject {
                    put("x1", -25)
                    put("y1", 30)
                    put("x2", 25)
                    put("y2", 30)
                }
            )
        )

        val updated = applyMutations(current, listOf(mutation))
        val mouth = updated.first { it.id == "mouth" }

        assertEquals(-15f, mouth.transform.rotation)
    }

    @Test
    fun `remove ignores protected face base`() {
        val updated = applyMutations(
            currentScene = NeutralSceneDocument.scene,
            mutations = listOf(
                Mutation(op = MutationOp.REMOVE, id = PROTECTED_SHAPE_ID)
            )
        )

        assertEquals(true, updated.any { it.id == PROTECTED_SHAPE_ID })
    }
}
