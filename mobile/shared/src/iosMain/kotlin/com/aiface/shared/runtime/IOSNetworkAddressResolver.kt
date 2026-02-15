package com.aiface.shared.runtime

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.alloc
import kotlinx.cinterop.memScoped
import kotlinx.cinterop.ptr
import kotlinx.cinterop.toKString
import kotlinx.cinterop.value
import kotlinx.cinterop.pointed
import kotlinx.cinterop.reinterpret
import kotlinx.cinterop.CPointerVar
import kotlinx.cinterop.addressOf
import kotlinx.cinterop.usePinned
import kotlinx.cinterop.sizeOf
import platform.darwin.getifaddrs
import platform.darwin.freeifaddrs
import platform.darwin.ifaddrs
import platform.posix.AF_INET
import platform.posix.IFF_LOOPBACK
import platform.posix.NI_NUMERICHOST
import platform.posix.getnameinfo
import platform.posix.sockaddr
import platform.posix.sockaddr_in

@OptIn(ExperimentalForeignApi::class)
object IOSNetworkAddressResolver {
    fun resolveLocalIpAddress(): String = memScoped {
        val ifaddrsPtr = alloc<CPointerVar<ifaddrs>>()
        if (getifaddrs(ifaddrsPtr.ptr) != 0) {
            return@memScoped "0.0.0.0"
        }

        try {
            var current = ifaddrsPtr.value
            while (current != null) {
                val ifa = current.pointed
                val address = ifa.ifa_addr
                if (address != null && address.pointed.sa_family.toInt() == AF_INET) {
                    val isLoopback = (ifa.ifa_flags.toInt() and IFF_LOOPBACK) != 0
                    if (!isLoopback) {
                        val hostBuf = ByteArray(46) // enough for IPv4 & IPv6
                        val addrLen = sizeOf<sockaddr_in>().toUInt()
                        val result = hostBuf.usePinned { pinned ->
                            getnameinfo(
                                address,
                                addrLen,
                                pinned.addressOf(0),
                                hostBuf.size.toUInt(),
                                null,
                                0u,
                                NI_NUMERICHOST
                            )
                        }
                        if (result == 0) {
                            val ipv4 = hostBuf.decodeToString().trimEnd('\u0000')
                            if (ipv4.isNotBlank()) {
                                return@memScoped ipv4
                            }
                        }
                    }
                }
                current = ifa.ifa_next
            }
        } finally {
            freeifaddrs(ifaddrsPtr.value)
        }

        return@memScoped "0.0.0.0"
    }
}
