package com.aiface.shared.di

import com.aiface.shared.runtime.DisplayAdvertiser
import com.aiface.shared.runtime.WebSocketDisplayServer
import com.aiface.shared.runtime.IOSNetServiceAdvertiser
import com.aiface.shared.runtime.IosWebSocketDisplayServer
import org.koin.dsl.module

fun iosMobileModule(): org.koin.core.module.Module = module {
    single<DisplayAdvertiser> {
        IOSNetServiceAdvertiser()
    }

    single<WebSocketDisplayServer> {
        IosWebSocketDisplayServer()
    }
}