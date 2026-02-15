package com.aiface.shared.runtime

/**
 * Platform-agnostic contract for the WebSocket server that receives scene updates.
 */
interface WebSocketDisplayServer {
    /**
     * Notifies the controller when the number of connected clients changes.
     */
    var onClientCountChanged: (Int) -> Unit

    /**
     * Callback for every text frame that the server receives.
     */
    var onTextMessage: (String) -> Unit

    /**
     * Callback to report transport-level errors.
     */
    var onError: (String) -> Unit

    /**
     * The port that the server listens on.
     */
    val port: Int

    fun start()
    fun stop()
    suspend fun sendMessage(text: String)
}

/**
 * Platform-agnostic contract for advertising the display over mDNS.
 */
interface DisplayAdvertiser {
    fun start(onStateChanged: (Boolean, String?) -> Unit)
    fun stop()
}