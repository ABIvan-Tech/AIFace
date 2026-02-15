package com.aiface.shared.runtime

import com.aiface.shared.domain.model.SERVICE_PORT
import com.aiface.shared.domain.model.SERVICE_TYPE
import platform.Foundation.NSNetService
import platform.Foundation.NSNetServiceDelegateProtocol
import platform.darwin.NSObject

import com.aiface.shared.runtime.DisplayAdvertiser

class IOSNetServiceAdvertiser(
    private val serviceName: String = "AIFace Display",
    private val serviceType: String = "${SERVICE_TYPE}.",
    private val domain: String = "local.",
    private val port: Int = SERVICE_PORT,
) : DisplayAdvertiser {
    private var netService: NSNetService? = null
    private var delegateRef: NSObject? = null

    override fun start(onStateChanged: (Boolean, String?) -> Unit) {
        if (netService != null) return

        val service = NSNetService(
            domain = domain,
            type = serviceType,
            name = serviceName,
            port = port
        )

        val delegate = object : NSObject(), NSNetServiceDelegateProtocol {
            override fun netServiceDidPublish(sender: NSNetService) {
                onStateChanged(true, null)
            }

            override fun netServiceDidStop(sender: NSNetService) {
                onStateChanged(false, null)
            }

            override fun netService(sender: NSNetService, didNotPublish: Map<Any?, *>) {
                val code = didNotPublish["NSNetServicesErrorCode"]
                onStateChanged(false, "iOS NetService publish failed: $code")
            }
        }

        service.delegate = delegate
        service.publish()

        delegateRef = delegate
        netService = service
    }

    override fun stop() {
        netService?.stop()
        netService = null
        delegateRef = null
    }
}
