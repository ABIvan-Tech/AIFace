package com.aiface.shared.runtime

import com.aiface.shared.data.codec.DisplayMessage
import com.aiface.shared.data.codec.DisplayMessageParser
import com.aiface.shared.domain.model.NeutralSceneDocument
import com.aiface.shared.domain.model.SERVICE_PORT
import com.aiface.shared.domain.model.SERVICE_TYPE
import com.aiface.shared.domain.reducer.applyMutations
import com.aiface.shared.domain.reducer.sanitizeScene
import com.aiface.shared.presentation.display.DisplayUiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.datetime.Clock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class DisplayRuntimeController(
    private val server: WebSocketDisplayServer,
    private val advertiser: DisplayAdvertiser,
    private val coroutineScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
) {
    private val ackJson = Json {
        explicitNulls = false
    }
    private val incomingMessages = Channel<String>(capacity = Channel.UNLIMITED)
    private val _uiState = MutableStateFlow(
        DisplayUiState(
            endpoint = "ws://${resolveLocalIpAddress()}:$SERVICE_PORT",
            serviceType = SERVICE_TYPE,
        )
    )
    val uiState: StateFlow<DisplayUiState> = _uiState.asStateFlow()
    private var started = false

    init {
        server.onClientCountChanged = { count ->
            _uiState.update { current ->
                current.copy(connectedClients = count)
            }
        }

        server.onTextMessage = { rawMessage ->
            incomingMessages.trySend(rawMessage)
        }

        server.onError = { error ->
            _uiState.update { current ->
                current.copy(lastError = error)
            }
        }

        coroutineScope.launch {
            for (rawMessage in incomingMessages) {
                handleRawMessage(rawMessage)
            }
        }
    }

    fun start() {
        if (started) return
        started = true

        server.start()
        advertiser.start { isAdvertising, error ->
            _uiState.update { current ->
                current.copy(
                    isAdvertising = isAdvertising,
                    lastError = error ?: current.lastError
                )
            }
        }
    }

    fun stop() {
        if (!started) return
        started = false

        advertiser.stop()
        server.stop()
        _uiState.update { current ->
            current.copy(
                isAdvertising = false,
                connectedClients = 0,
                lastMessageType = "stopped"
            )
        }
    }

    fun dispose() {
        stop()
        incomingMessages.close()
        coroutineScope.cancel()
    }

    private fun handleRawMessage(rawMessage: String) {
        val message = DisplayMessageParser.parse(rawMessage)
        if (message == null) {
            _uiState.update { current ->
                current.copy(lastError = "Unsupported or invalid message")
            }
            return
        }

        var ackType = "hello"
        var ackStatus = "applied"
        var ackReason: String? = null
        var sceneVersion: Long? = null

        when (message) {
            DisplayMessage.Hello -> {
                ackType = "hello"
                _uiState.update { current ->
                    current.copy(lastMessageType = "hello", lastError = null)
                }
            }

            is DisplayMessage.SetScene -> {
                ackType = "set_scene"
                sceneVersion = message.sceneVersion
                _uiState.update { current ->
                    current.copy(
                        scene = sanitizeScene(message.scene.scene),
                        activeSceneVersion = message.sceneVersion,
                        lastMessageType = "set_scene",
                        lastError = null
                    )
                }
            }

            is DisplayMessage.ApplyMutations -> {
                ackType = "apply_mutations"
                sceneVersion = message.sceneVersion
                val currentVersion = _uiState.value.activeSceneVersion
                val versionMismatch = message.sceneVersion != null && currentVersion != message.sceneVersion

                if (versionMismatch) {
                    ackStatus = "ignored"
                    ackReason = if (currentVersion == null) {
                        "missing_scene_version"
                    } else {
                        "scene_version_mismatch"
                    }
                    _uiState.update { current ->
                        current.copy(lastMessageType = "apply_mutations_ignored", lastError = null)
                    }
                } else {
                    _uiState.update { current ->
                        current.copy(
                            scene = applyMutations(current.scene, message.mutations),
                            activeSceneVersion = message.sceneVersion ?: current.activeSceneVersion,
                            lastMessageType = "apply_mutations",
                            lastError = null
                        )
                    }
                }
            }

            is DisplayMessage.Reset -> {
                ackType = "reset"
                sceneVersion = message.sceneVersion
                _uiState.update { current ->
                    current.copy(
                        scene = NeutralSceneDocument.scene,
                        activeSceneVersion = message.sceneVersion,
                        lastMessageType = "reset",
                        lastError = null
                    )
                }
            }
        }

        coroutineScope.launch {
            try {
                server.sendMessage(buildAckEnvelope(ackType, ackStatus, sceneVersion, ackReason))
            } catch (_: Exception) {
                // Ignore send errors for ACK broadcast
            }
        }
    }

    private fun buildAckEnvelope(
        ackType: String,
        status: String,
        sceneVersion: Long?,
        reason: String?,
    ): String {
        val payload = buildJsonObject {
            put("ackType", ackType)
            put("status", status)
            if (sceneVersion != null) {
                put("sceneVersion", sceneVersion)
            }
            if (reason != null) {
                put("reason", reason)
            }
        }

        return ackJson.encodeToString(
            buildJsonObject {
                put("schema", "ai-face.v1")
                put("type", "ack")
                put("ts", Clock.System.now().toEpochMilliseconds())
                put("payload", payload)
            }
        )
    }
}