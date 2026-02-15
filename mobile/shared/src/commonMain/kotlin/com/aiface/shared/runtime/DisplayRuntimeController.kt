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

class DisplayRuntimeController(
    private val server: WebSocketDisplayServer,
    private val advertiser: DisplayAdvertiser,
    private val coroutineScope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
) {
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

        when (message) {
            DisplayMessage.Hello -> {
                _uiState.update { current ->
                    current.copy(lastMessageType = "hello", lastError = null)
                }
            }

            is DisplayMessage.SetScene -> {
                _uiState.update { current ->
                    current.copy(
                        scene = sanitizeScene(message.scene.scene),
                        lastMessageType = "set_scene",
                        lastError = null
                    )
                }
            }

            is DisplayMessage.ApplyMutations -> {
                _uiState.update { current ->
                    current.copy(
                        scene = applyMutations(current.scene, message.mutations),
                        lastMessageType = "apply_mutations",
                        lastError = null
                    )
                }
            }

            is DisplayMessage.Reset -> {
                _uiState.update { current ->
                    current.copy(
                        scene = NeutralSceneDocument.scene,
                        lastMessageType = "reset",
                        lastError = null
                    )
                }
            }
        }
        
        // Send ACK to client (CLI) so it doesn't wait for timeout
        coroutineScope.launch {
            try {
                server.sendMessage("{\"status\": \"ok\"}")
            } catch (e: Exception) {
                // Ignore send errors
            }
        }
    }
}