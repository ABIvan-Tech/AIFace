package com.aiface.shared.runtime

import java.net.Inet4Address
import java.net.NetworkInterface

actual fun resolveLocalIpAddress(): String {
    val interfaces = try {
        NetworkInterface.getNetworkInterfaces()?.toList() ?: emptyList()
    } catch (_: Throwable) {
        return "0.0.0.0"
    }

    for (networkInterface in interfaces) {
        val addresses = networkInterface.inetAddresses.toList()
        for (address in addresses) {
            if (!address.isLoopbackAddress && address is Inet4Address) {
                return address.hostAddress ?: "0.0.0.0"
            }
        }
    }

    return "0.0.0.0"
}