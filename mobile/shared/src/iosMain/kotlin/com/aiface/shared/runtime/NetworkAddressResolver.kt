package com.aiface.shared.runtime

import com.aiface.shared.runtime.IOSNetworkAddressResolver

actual fun resolveLocalIpAddress(): String = IOSNetworkAddressResolver.resolveLocalIpAddress()