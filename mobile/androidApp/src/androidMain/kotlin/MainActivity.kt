package com.aiface.android

import android.os.Bundle
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.view.WindowCompat
import com.aiface.shared.AIFaceApp
import com.aiface.shared.di.MobileDI
import com.aiface.shared.di.androidMobileModule
import com.aiface.shared.runtime.DisplayRuntimeController
import org.koin.core.context.GlobalContext

class MainActivity : AppCompatActivity() {
    private lateinit var controller: DisplayRuntimeController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window, false)

        MobileDI.init(androidMobileModule(applicationContext))
        controller = GlobalContext.get().get()
        setContent {
            val uiState by controller.uiState.collectAsState()
            AIFaceApp(uiState = uiState)
        }
    }

    override fun onStart() {
        super.onStart()
        controller.start()
    }

    override fun onStop() {
        controller.stop()
        super.onStop()
    }

    override fun onDestroy() {
        controller.dispose()
        super.onDestroy()
    }
}
