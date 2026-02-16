package com.aiface.desktop

import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import com.aiface.shared.AIFaceApp
import com.aiface.shared.di.MobileDI
import com.aiface.shared.di.desktopMobileModule
import com.aiface.shared.runtime.DisplayRuntimeController
import org.koin.core.context.GlobalContext

fun main() = application {
    MobileDI.init(desktopMobileModule())

    val controller = remember { GlobalContext.get().get<DisplayRuntimeController>() }

    DisposableEffect(Unit) {
        controller.start()
        onDispose {
            controller.dispose()
        }
    }

    Window(
        onCloseRequest = ::exitApplication,
        title = "AIFace Desktop",
    ) {
        val uiState by controller.uiState.collectAsState()
        AIFaceApp(uiState = uiState)
    }
}
