package com.aiface.shared.di

import com.aiface.shared.runtime.DisplayRuntimeController
import org.koin.core.context.startKoin
import org.koin.core.module.Module
import org.koin.dsl.module

val displayModule: Module = module {
    single { DisplayRuntimeController(get(), get()) }
}

object MobileDI {
    private var started = false

    fun init(vararg platformModules: Module) {
        if (started) return
        startKoin {
            modules(listOf(displayModule) + platformModules.toList())
        }
        started = true
    }
}