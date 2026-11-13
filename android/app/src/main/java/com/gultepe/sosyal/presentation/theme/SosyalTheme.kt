package com.gultepe.sosyal.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BrandGreen = Color(0xFF203D34)
private val LeafGreen = Color(0xFF4F8266)
private val PaleGreen = Color(0xFFC8E9AC)

@Composable
fun SosyalTheme(
    preference: String,
    content: @Composable () -> Unit,
) {
    val dark = when (preference) {
        "DARK" -> true
        "LIGHT" -> false
        else -> isSystemInDarkTheme()
    }
    val colors = if (dark) {
        darkColorScheme(
            primary = PaleGreen,
            onPrimary = BrandGreen,
            secondary = LeafGreen,
            background = Color(0xFF121713),
            surface = Color(0xFF1A211C),
            onSurface = Color(0xFFE6EAE5),
            onBackground = Color(0xFFE6EAE5),
        )
    } else {
        lightColorScheme(
            primary = BrandGreen,
            onPrimary = Color.White,
            secondary = LeafGreen,
            background = Color(0xFFF4F6F2),
            surface = Color.White,
            onSurface = Color(0xFF202522),
            onBackground = Color(0xFF202522),
        )
    }
    MaterialTheme(colorScheme = colors, content = content)
}
