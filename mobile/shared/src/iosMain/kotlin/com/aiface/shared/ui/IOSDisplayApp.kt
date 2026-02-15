package com.aiface.shared.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import com.aiface.shared.AIFaceApp
import com.aiface.shared.di.MobileDI
import com.aiface.shared.di.iosMobileModule
import com.aiface.shared.runtime.DisplayRuntimeController
import org.koin.mp.KoinPlatform.getKoin

@Composable
fun IOSDisplayApp() {
    MobileDI.init(iosMobileModule())
    val controller = remember { getKoin().get<DisplayRuntimeController>() }
    val uiState by controller.uiState.collectAsState()

    DisposableEffect(controller) {
        controller.start()
        onDispose {
            controller.stop()
        }
    }

    AIFaceApp(uiState = uiState)
}
