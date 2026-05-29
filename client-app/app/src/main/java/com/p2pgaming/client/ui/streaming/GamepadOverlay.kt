package com.p2pgaming.client.ui.streaming

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import com.p2pgaming.client.service.WebRTCService

@Composable
fun GamepadOverlay(
    layout: GamepadLayout,
    hasPhysicalController: Boolean,
    webRTCService: WebRTCService,
    modifier: Modifier = Modifier
) {
    if (hasPhysicalController) return

    val faceButtons = if (layout == GamepadLayout.XBOX_LAYOUT) {
        listOf("Y", "X", "B", "A")
    } else {
        listOf("Triangle", "Square", "Circle", "Cross")
    }

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(text = "D-Pad", style = MaterialTheme.typography.labelLarge)
                ControlPad(label = "↑", webRTCService = webRTCService)
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ControlPad(label = "←", webRTCService = webRTCService)
                    ControlPad(label = "↓", webRTCService = webRTCService)
                    ControlPad(label = "→", webRTCService = webRTCService)
                }
                StickPad(label = "L-Stick", webRTCService = webRTCService)
            }
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.End
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ShoulderButton(label = "L1/LB", webRTCService = webRTCService)
                    ShoulderButton(label = "R1/RB", webRTCService = webRTCService)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    faceButtons.forEach { label ->
                        ControlPad(label = label, webRTCService = webRTCService)
                    }
                }
                StickPad(label = "R-Stick", webRTCService = webRTCService)
            }
        }
    }
}

@Composable
private fun ControlPad(label: String, webRTCService: WebRTCService) {
    Box(
        modifier = Modifier
            .size(56.dp)
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.75f), CircleShape)
            .pointerInput(label) {
                detectTapGestures(onPress = {
                    webRTCService.sendInputEvent(label, "press")
                    tryAwaitRelease()
                    webRTCService.sendInputEvent(label, "release")
                })
            },
        contentAlignment = Alignment.Center
    ) {
        Text(text = label)
    }
}

@Composable
private fun StickPad(label: String, webRTCService: WebRTCService) {
    Box(
        modifier = Modifier
            .size(88.dp)
            .background(MaterialTheme.colorScheme.secondary.copy(alpha = 0.6f), CircleShape)
            .pointerInput(label) {
                detectDragGestures(
                    onDrag = { change, dragAmount ->
                        change.consume()
                        webRTCService.sendAnalogInput(label, dragAmount.x, dragAmount.y)
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        Text(text = label)
    }
}

@Composable
private fun ShoulderButton(label: String, webRTCService: WebRTCService) {
    Box(
        modifier = Modifier
            .background(MaterialTheme.colorScheme.tertiary.copy(alpha = 0.7f), RoundedCornerShape(14.dp))
            .padding(horizontal = 18.dp, vertical = 12.dp)
            .pointerInput(label) {
                detectTapGestures(onTap = { webRTCService.sendInputEvent(label, "tap") })
            }
    ) {
        Text(text = label)
    }
}
