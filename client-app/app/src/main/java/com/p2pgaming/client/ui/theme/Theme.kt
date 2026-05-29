package com.p2pgaming.client.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary = MidnightPurple,
    secondary = ElectricBlue,
    tertiary = NeonCyan,
    background = DeepSurface,
    surface = DeepSurfaceVariant,
    onPrimary = SoftWhite,
    onSecondary = SoftWhite,
    onTertiary = DeepSurface,
    onBackground = SoftWhite,
    onSurface = SoftWhite,
    error = ErrorRed
)

@Composable
fun P2PGamingTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColors else DarkColors
    MaterialTheme(
        colorScheme = colors,
        typography = GamingTypography,
        content = content
    )
}
