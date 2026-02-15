package com.aiface.shared.data.codec

import com.aiface.shared.domain.model.Mutation
import com.aiface.shared.domain.model.SCHEMA_V1
import com.aiface.shared.domain.model.SceneDocument
import com.aiface.shared.domain.reducer.sanitizeScene
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull

object DisplayMessageParser {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    fun parse(rawText: String): DisplayMessage? {
        val root = try {
            json.parseToJsonElement(rawText).jsonObject
        } catch (_: Throwable) {
            return null
        }

        val schema = root["schema"]?.jsonPrimitive?.contentOrNull ?: return null
        if (schema != SCHEMA_V1) return null

        val type = root["type"]?.jsonPrimitive?.contentOrNull ?: return null
        val payload = root["payload"]?.asJsonObjectOrNull() ?: JsonObject(emptyMap())

        return when (type) {
            "hello" -> DisplayMessage.Hello
            "set_scene" -> parseSetScene(payload)
            "apply_mutations" -> parseApplyMutations(payload)
            "reset" -> DisplayMessage.Reset(reason = payload["reason"]?.jsonPrimitive?.contentOrNull)
            else -> null
        }
    }

    private fun parseSetScene(payload: JsonObject): DisplayMessage.SetScene? {
        val sceneElement = payload["scene"] ?: return null
        val sceneDocument = try {
            json.decodeFromJsonElement<SceneDocument>(sceneElement)
        } catch (_: SerializationException) {
            return null
        } catch (_: IllegalArgumentException) {
            return null
        }

        return DisplayMessage.SetScene(
            scene = sceneDocument.copy(scene = sanitizeScene(sceneDocument.scene))
        )
    }

    private fun parseApplyMutations(payload: JsonObject): DisplayMessage.ApplyMutations? {
        val mutationsElement = payload["mutations"] ?: return null
        val mutations = try {
            json.decodeFromJsonElement<List<Mutation>>(mutationsElement)
        } catch (_: SerializationException) {
            return null
        } catch (_: IllegalArgumentException) {
            return null
        }

        return DisplayMessage.ApplyMutations(mutations)
    }

    private fun JsonElement.asJsonObjectOrNull(): JsonObject? = this as? JsonObject
}
