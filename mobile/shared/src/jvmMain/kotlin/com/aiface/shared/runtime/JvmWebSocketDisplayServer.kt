package com.aiface.shared.runtime

import com.aiface.shared.domain.model.SERVICE_PORT
import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.EmbeddedServer
import io.ktor.server.engine.embeddedServer
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import io.ktor.server.websocket.DefaultWebSocketServerSession
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.Frame
import io.ktor.websocket.readText
import io.ktor.websocket.send
import java.util.Collections
import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.max

class JvmWebSocketDisplayServer(
    override val port: Int = SERVICE_PORT,
) : WebSocketDisplayServer {
    private var engine: EmbeddedServer<*, *>? = null
    private val connectedClients = AtomicInteger(0)

    override var onClientCountChanged: (Int) -> Unit = {}
    override var onTextMessage: (String) -> Unit = {}
    override var onError: (String) -> Unit = {}

    private val sessions = Collections.synchronizedSet(LinkedHashSet<DefaultWebSocketServerSession>())

    override fun start() {
        if (engine != null) return

        val server = embeddedServer(
            factory = CIO,
            host = "0.0.0.0",
            port = port,
        ) {
            install(WebSockets)

            routing {
                get("/") {
                    call.respondText("AIFace display endpoint")
                }

                webSocket("/") {
                    sessions.add(this)
                    updateClientCount(delta = 1)
                    try {
                        for (frame in incoming) {
                            if (frame is Frame.Text) {
                                onTextMessage(frame.readText())
                            }
                        }
                    } catch (throwable: Throwable) {
                        onError("WebSocket session error: ${throwable.message ?: "unknown"}")
                    } finally {
                        sessions.remove(this)
                        updateClientCount(delta = -1)
                    }
                }
            }
        }

        runCatching { server.start(wait = false) }
            .onSuccess {
                engine = server
            }
            .onFailure { throwable ->
                onError("Failed to start WebSocket server: ${throwable.message ?: "unknown"}")
            }
    }

    override fun stop() {
        engine?.stop(gracePeriodMillis = 500, timeoutMillis = 1_000)
        engine = null
        connectedClients.set(0)
        onClientCountChanged(0)
        sessions.clear()
    }

    override suspend fun sendMessage(text: String) {
        sessions.forEach { session ->
            try {
                session.send(text)
            } catch (_: Exception) {
                // Ignore send errors for broadcast
            }
        }
    }

    private fun updateClientCount(delta: Int) {
        val updated = max(0, connectedClients.addAndGet(delta))
        if (updated == 0) {
            connectedClients.set(0)
        }
        onClientCountChanged(connectedClients.get())
    }
}
