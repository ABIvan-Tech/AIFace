package com.aiface.shared.presentation.display

import aiface.shared.generated.resources.Res
import aiface.shared.generated.resources.display_connected
import aiface.shared.generated.resources.display_endpoint
import aiface.shared.generated.resources.display_error
import aiface.shared.generated.resources.display_last_message
import aiface.shared.generated.resources.display_service
import aiface.shared.generated.resources.display_status_advertising
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aiface.shared.presentation.render.AnimatedFaceCanvas
import org.jetbrains.compose.resources.stringResource

@Composable
fun DisplayScreen(
    uiState: DisplayUiState,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top))
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
    ) {
        StatusBlock(uiState)
        Spacer(modifier = Modifier.height(16.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .background(
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                    shape = RoundedCornerShape(18.dp)
                )
                .padding(8.dp)
        ) {
            AnimatedFaceCanvas(
                scene = uiState.scene,
                modifier = Modifier.fillMaxSize()
            )
        }

        if (!uiState.lastError.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "${stringResource(Res.string.display_error)}: ${uiState.lastError}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
private fun StatusBlock(uiState: DisplayUiState) {
    val isAdvertising = if (uiState.isAdvertising) "ON" else "OFF"

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                shape = RoundedCornerShape(14.dp)
            )
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        StatusRow(
            label = stringResource(Res.string.display_status_advertising),
            value = isAdvertising
        )
        StatusRow(
            label = stringResource(Res.string.display_connected),
            value = uiState.connectedClients.toString()
        )
        StatusRow(
            label = stringResource(Res.string.display_last_message),
            value = uiState.lastMessageType
        )
        StatusRow(
            label = stringResource(Res.string.display_endpoint),
            value = uiState.endpoint
        )
        StatusRow(
            label = stringResource(Res.string.display_service),
            value = uiState.serviceType
        )
    }
}

@Composable
private fun StatusRow(
    label: String,
    value: String,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
