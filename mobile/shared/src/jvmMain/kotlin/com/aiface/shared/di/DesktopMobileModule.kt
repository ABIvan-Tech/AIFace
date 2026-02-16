package com.aiface.shared.di

import com.aiface.shared.runtime.DisplayAdvertiser
import com.aiface.shared.runtime.JvmMdnsAdvertiser
import com.aiface.shared.runtime.JvmWebSocketDisplayServer
import com.aiface.shared.runtime.WebSocketDisplayServer
import org.koin.dsl.module

fun desktopMobileModule(): org.koin.core.module.Module = module {
    single<WebSocketDisplayServer> {
        JvmWebSocketDisplayServer()
    }

    single<DisplayAdvertiser> {
        JvmMdnsAdvertiser()
    }
}
