package com.aiface.shared.runtime

import com.aiface.shared.domain.model.SERVICE_PORT
import kotlinx.cinterop.*
import platform.Foundation.NSData
import platform.Foundation.NSString
import platform.Foundation.NSUTF8StringEncoding
import platform.Foundation.create
import platform.Network.*
import platform.darwin.*
import platform.posix.uint8_tVar
import platform.posix.size_tVar

/**
 * iOS WebSocket display server using Apple's Network.framework.
 *
 * Uses NWListener with WebSocket protocol to accept connections,
 * read text frames, and track connected clients.
 */
@OptIn(ExperimentalForeignApi::class, BetaInteropApi::class)
class IosWebSocketDisplayServer(
    override val port: Int = SERVICE_PORT,
) : WebSocketDisplayServer {

    override var onClientCountChanged: (Int) -> Unit = {}
    override var onTextMessage: (String) -> Unit = {}
    override var onError: (String) -> Unit = {}

    private var listener: nw_listener_t? = null
    private val connections = mutableListOf<nw_connection_t>()
    private val serverQueue = dispatch_queue_create("com.aiface.ws-server", null)

    override fun start() {
        println("IosWebSocketDisplayServer: Starting on port $port")
        if (listener != null) return

        // Configure manual TCP parameters without TLS.
        // Using nw_parameters_create_secure_tcp with null config block fails in K/N bindings.
        // So we manually construct the stack: IP -> TCP (no TLS) -> WebSocket.
        val parameters = nw_parameters_create()
        val protocolStack = nw_parameters_copy_default_protocol_stack(parameters)
        val tcpOptions = nw_tcp_create_options()
        nw_protocol_stack_set_transport_protocol(protocolStack, tcpOptions)

        // Add WebSocket protocol on top of TCP.
        val wsOptions = nw_ws_create_options(nw_ws_version_13)
        val stack = nw_parameters_copy_default_protocol_stack(parameters)
        if (stack != null && wsOptions != null) {
            nw_protocol_stack_prepend_application_protocol(stack, wsOptions)
        }

        val nwListener = nw_listener_create_with_port(port.toString(), parameters)
        if (nwListener == null) {
            onError("Failed to create NWListener on port $port")
            return
        }

        nw_listener_set_queue(nwListener, serverQueue)

        nw_listener_set_state_changed_handler(nwListener) { state, error ->
            println("IosWebSocketDisplayServer: Listener state changed to $state, error=$error")
            when (state) {
                nw_listener_state_ready -> {
                    println("IosWebSocketDisplayServer: Listener READY on port $port")
                }
                nw_listener_state_failed -> {
                    onError("NWListener failed: $error")
                }
                nw_listener_state_cancelled -> {
                    println("IosWebSocketDisplayServer: Listener cancelled")
                }
                else -> {
                     println("IosWebSocketDisplayServer: Listener state: $state")
                }
            }
        }

        nw_listener_set_new_connection_handler(nwListener) { connection ->
            if (connection != null) {
                println("IosWebSocketDisplayServer: New connection received: $connection")
                handleNewConnection(connection)
            } else {
                 println("IosWebSocketDisplayServer: Received null connection")
            }
        }

        nw_listener_start(nwListener)
        listener = nwListener
    }

    override fun stop() {
        val currentListener = listener ?: return
        listener = null

        // Cancel all active connections.
        connections.toList().forEach { conn ->
            nw_connection_cancel(conn)
        }
        connections.clear()
        onClientCountChanged(0)

        nw_listener_cancel(currentListener)
    }

    override suspend fun sendMessage(text: String) {
        // Temporarily disabled on iOS.
        // Network.framework callback bridging from Kotlin/Native is unstable here and
        // can crash with NSGenericException when ACK send callbacks fire.
        // CLI already has a short receive timeout and works without ACK.
        println("IosWebSocketDisplayServer: ACK disabled on iOS, skipping send")
    }


    private fun handleNewConnection(connection: nw_connection_t) {
        nw_connection_set_queue(connection, serverQueue)

        nw_connection_set_state_changed_handler(connection) { state, error ->
             println("IosWebSocketDisplayServer: Connection state changed: $state, error=$error")
            when (state) {
                nw_connection_state_ready -> {
                    println("IosWebSocketDisplayServer: Connection READY")
                    connections.add(connection)
                    onClientCountChanged(connections.size)
                    receiveLoop(connection)
                }
                nw_connection_state_failed,
                nw_connection_state_cancelled -> {
                    println("IosWebSocketDisplayServer: Connection closed/failed")
                    connections.remove(connection)
                    onClientCountChanged(connections.size)
                }
                nw_connection_state_waiting -> {
                    println("IosWebSocketDisplayServer: Connection waiting...")
                }
                else -> {}
            }
        }

        nw_connection_start(connection)
    }

    private fun receiveLoop(connection: nw_connection_t) {
        nw_connection_receive_message(connection) { content, context, isComplete, error ->
            if (error != null) {
                println("IosWebSocketDisplayServer: Receive error: $error")
                onError("WebSocket receive error")
                return@nw_connection_receive_message
            }

            if (content != null) {
                val text = dispatchDataToString(content)
                if (text != null) {
                    // println("IosWebSocketDisplayServer: Received message: ${text.take(50)}...")
                    onTextMessage(text)
                } else {
                     // println("IosWebSocketDisplayServer: Received message but text is null")
                }
            } else {
                 if (isComplete) {
                     println("IosWebSocketDisplayServer: Client disconnected (EOF)")
                     // Connection closed by peer
                     return@nw_connection_receive_message
                 }
            }

            if (isComplete) {
                 // println("IosWebSocketDisplayServer: Message complete")
            }

            // Continue listening for more messages if connection is still active
            // IMPORTANT: If isComplete is true and content was processed, we should continue reading next message?
            // WebSocket messages are framed. isComplete=true means frame end. 
            // BUT if content is null & isComplete=true, it's EOF. We handled that above.
            if (connections.contains(connection)) {
                receiveLoop(connection)
            }
        }
    }

    private fun dispatchDataToString(data: platform.darwin.dispatch_data_t): String? {
        // Use dispatch_data_create_map to avoid block-based enumeration which causes crashes in K/N interop
        return memScoped {
            val bufferPtr = alloc<kotlinx.cinterop.COpaquePointerVar>()
            val sizePtr = alloc<platform.posix.size_tVar>()
            
            // Returns a new dispatch_data_t that maps the memory. 
            // We assign it to a val to ensure it lives long enough for us to copy the bytes.
            val mappedData = platform.darwin.dispatch_data_create_map(data, bufferPtr.ptr, sizePtr.ptr)
            
            val ptr = bufferPtr.value
            val size = sizePtr.value.toInt()
            
            if (ptr != null && size > 0) {
                // Copy bytes to Kotlin ByteArray and decode
                val bytes = ptr.reinterpret<uint8_tVar>().readBytes(size)
                bytes.decodeToString()
            } else {
                null
            }
        }
    }
}