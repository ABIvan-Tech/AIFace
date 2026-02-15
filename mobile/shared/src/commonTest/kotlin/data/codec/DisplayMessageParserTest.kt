package data.codec

import com.aiface.shared.data.codec.DisplayMessage
import com.aiface.shared.data.codec.DisplayMessageParser
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class DisplayMessageParserTest {

    @Test
    fun `parse set_scene envelope`() {
        val raw = """
            {
              "schema": "ai-face.v1",
              "type": "set_scene",
              "payload": {
                "scene": {
                  "schema": "ai-face.v1",
                  "scene": [
                    {
                      "id": "face_base",
                      "type": "circle",
                      "transform": { "x": 0, "y": 0, "rotation": 0 },
                      "style": { "fill": "#FFD8B0", "opacity": 1 },
                      "props": { "radius": 90 }
                    }
                  ]
                }
              }
            }
        """.trimIndent()

        val parsed = DisplayMessageParser.parse(raw)

        assertIs<DisplayMessage.SetScene>(parsed)
        assertEquals(1, parsed.scene.scene.size)
        assertEquals("face_base", parsed.scene.scene.first().id)
    }

    @Test
    fun `unsupported schema is ignored`() {
        val raw = """
            {
              "schema": "unknown.v1",
              "type": "reset",
              "payload": {}
            }
        """.trimIndent()

        val parsed = DisplayMessageParser.parse(raw)

        assertEquals(null, parsed)
    }
}
