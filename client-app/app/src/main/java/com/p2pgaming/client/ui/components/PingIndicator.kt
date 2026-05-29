package com.p2pgaming.client.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun PingIndicator(pingMs: Int?, modifier: Modifier = Modifier) {
    val color = when {
        pingMs == null -> MaterialTheme.colorScheme.secondary
        pingMs < 40 -> Color(0xFF4CAF50)
        pingMs < 80 -> Color(0xFFFFC107)
        else -> MaterialTheme.colorScheme.error
    }
    Row(verticalAlignment = Alignment.CenterVertically, modifier = modifier) {
        Spacer(
            modifier = Modifier
                .size(10.dp)
                .background(color, CircleShape)
        )
        Text(text = " ${pingMs ?: "--"} ms", style = MaterialTheme.typography.labelLarge)
    }
}
