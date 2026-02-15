package com.aiface.shared.di

import android.content.Context
import com.aiface.shared.runtime.AndroidWebSocketDisplayServer
import com.aiface.shared.runtime.AndroidNsdAdvertiser
import com.aiface.shared.runtime.DisplayAdvertiser
import com.aiface.shared.runtime.WebSocketDisplayServer
import org.koin.dsl.module

fun androidMobileModule(context: Context): org.koin.core.module.Module = module {
    single<WebSocketDisplayServer> {
        AndroidWebSocketDisplayServer()
    }

    single<DisplayAdvertiser> {
        AndroidNsdAdvertiser(context.applicationContext)
    }
}
