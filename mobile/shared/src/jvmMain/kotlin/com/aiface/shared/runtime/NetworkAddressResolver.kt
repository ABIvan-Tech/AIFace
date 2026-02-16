package com.aiface.shared.runtime

import java.net.Inet4Address
import java.net.NetworkInterface

actual fun resolveLocalIpAddress(): String {
    val interfaces = NetworkInterface.getNetworkInterfaces()?.toList().orEmpty()
    interfaces.forEach { networkInterface ->
        if (!networkInterface.isUp || networkInterface.isLoopback) return@forEach

        val addresses = networkInterface.inetAddresses.toList()
        val ipv4 = addresses.firstOrNull { address ->
            address is Inet4Address && !address.isLoopbackAddress
        }

        if (ipv4 != null) {
            return ipv4.hostAddress ?: "0.0.0.0"
        }
    }

    return "0.0.0.0"
}
