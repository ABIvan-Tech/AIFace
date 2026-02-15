package com.aiface.shared

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.aiface.shared.presentation.display.DisplayScreen
import com.aiface.shared.presentation.display.DisplayUiState
import com.aiface.shared.presentation.theme.AIFaceTheme

@Composable
fun AIFaceApp(
    uiState: DisplayUiState,
    modifier: Modifier = Modifier,
) {
    AIFaceTheme {
        DisplayScreen(
            uiState = uiState,
            modifier = modifier
        )
    }
}

@Composable
fun App() {
    AIFaceApp(uiState = DisplayUiState())
}
