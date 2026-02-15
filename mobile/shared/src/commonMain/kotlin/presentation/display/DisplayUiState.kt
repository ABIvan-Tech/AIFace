package com.aiface.shared.presentation.display

import com.aiface.shared.domain.model.NeutralSceneDocument
import com.aiface.shared.domain.model.SERVICE_PORT
import com.aiface.shared.domain.model.SERVICE_TYPE
import com.aiface.shared.domain.model.Shape

data class DisplayUiState(
    val scene: List<Shape> = NeutralSceneDocument.scene,
    val isAdvertising: Boolean = false,
    val connectedClients: Int = 0,
    val lastMessageType: String = "none",
    val endpoint: String = "ws://0.0.0.0:$SERVICE_PORT",
    val serviceType: String = SERVICE_TYPE,
    val lastError: String? = null,
)
