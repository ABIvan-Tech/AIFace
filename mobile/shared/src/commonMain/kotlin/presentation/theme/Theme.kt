package com.aiface.shared.presentation.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = PrimaryBlue,
    onPrimary = CardBackground,
    secondary = SecondaryText,
    onSecondary = CardBackground,
    background = Background,
    onBackground = DarkText,
    surface = SurfaceLight,
    onSurface = OnSurface,
    surfaceVariant = LightGrey,
    error = ErrorRed,
    onError = CardBackground,
    errorContainer = ErrorBackground,
    outline = OutlineGrey
)

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryBlue,
    onPrimary = CardBackground,
    secondary = SecondaryText,
    onSecondary = CardBackground,
    background = SurfaceDark,
    onBackground = CardBackground,
    surface = SurfaceDark,
    onSurface = CardBackground,
    surfaceVariant = OnSurfaceVariant,
    error = ErrorRed,
    onError = CardBackground,
    errorContainer = ErrorBackground,
    outline = OutlineGrey
)

@Composable
fun AIFaceTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
        typography = AppTypography,
        content = content
    )
}
