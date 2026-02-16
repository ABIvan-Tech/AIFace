package com.aiface.shared.runtime

import com.aiface.shared.domain.model.SCHEMA_V1
import com.aiface.shared.domain.model.SERVICE_PORT
import com.aiface.shared.domain.model.SERVICE_TYPE
import java.net.InetAddress
import javax.jmdns.JmDNS
import javax.jmdns.ServiceInfo

class JvmMdnsAdvertiser(
    private val serviceName: String = "AIFace Display",
    private val serviceType: String = SERVICE_TYPE,
    private val servicePort: Int = SERVICE_PORT,
) : DisplayAdvertiser {
    private var jmdns: JmDNS? = null
    private var serviceInfo: ServiceInfo? = null

    override fun start(onStateChanged: (Boolean, String?) -> Unit) {
        if (jmdns != null) return

        runCatching {
            val hostAddress = InetAddress.getByName(resolveLocalIpAddress())
            val dns = JmDNS.create(hostAddress)
            val info = ServiceInfo.create(
                normalizeServiceType(serviceType),
                serviceName,
                servicePort,
                0,
                0,
                mapOf(
                    "schema" to SCHEMA_V1,
                    "transport" to "ws",
                )
            )

            dns.registerService(info)
            jmdns = dns
            serviceInfo = info
            onStateChanged(true, null)
        }.onFailure { throwable ->
            jmdns?.close()
            jmdns = null
            serviceInfo = null
            onStateChanged(false, throwable.message ?: "mDNS registration error")
        }
    }

    override fun stop() {
        val dns = jmdns ?: return

        runCatching {
            serviceInfo?.let { info ->
                dns.unregisterService(info)
            }
            dns.close()
        }

        serviceInfo = null
        jmdns = null
    }

    private fun normalizeServiceType(type: String): String {
        return when {
            type.endsWith(".local.") -> type
            type.endsWith(".") -> "${type}local."
            else -> "$type.local."
        }
    }
}
