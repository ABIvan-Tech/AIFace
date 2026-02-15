package com.aiface.shared.runtime

import android.content.Context
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import com.aiface.shared.domain.model.SCHEMA_V1
import com.aiface.shared.domain.model.SERVICE_PORT
import com.aiface.shared.domain.model.SERVICE_TYPE

class AndroidNsdAdvertiser(
    context: Context,
    private val serviceName: String = "AIFace Display",
    private val serviceType: String = "${SERVICE_TYPE}.",
    private val servicePort: Int = SERVICE_PORT,
) : DisplayAdvertiser {
    private val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private var registrationListener: NsdManager.RegistrationListener? = null

    override fun start(onStateChanged: (Boolean, String?) -> Unit) {
        if (registrationListener != null) return

        val serviceInfo = NsdServiceInfo().apply {
            serviceName = this@AndroidNsdAdvertiser.serviceName
            serviceType = this@AndroidNsdAdvertiser.serviceType
            port = servicePort

            runCatching {
                setAttribute("schema", SCHEMA_V1)
                setAttribute("transport", "ws")
            }
        }

        val listener = object : NsdManager.RegistrationListener {
            override fun onRegistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                onStateChanged(false, "NSD registration failed ($errorCode)")
            }

            override fun onUnregistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                onStateChanged(false, "NSD unregistration failed ($errorCode)")
            }

            override fun onServiceRegistered(serviceInfo: NsdServiceInfo) {
                onStateChanged(true, null)
            }

            override fun onServiceUnregistered(serviceInfo: NsdServiceInfo) {
                onStateChanged(false, null)
            }
        }

        registrationListener = listener
        runCatching {
            nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, listener)
        }.onFailure { throwable ->
            registrationListener = null
            onStateChanged(false, throwable.message ?: "NSD registration error")
        }
    }

    override fun stop() {
        val listener = registrationListener ?: return
        registrationListener = null

        runCatching {
            nsdManager.unregisterService(listener)
        }
    }
}
