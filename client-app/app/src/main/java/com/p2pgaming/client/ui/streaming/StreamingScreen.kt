package com.p2pgaming.client.ui.streaming

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.ViewGroup
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import org.webrtc.SurfaceViewRenderer

@Composable
fun StreamingScreen(
    sessionId: String,
    hostId: String = "",
    token: String = "",
    onExit: () -> Unit,
    viewModel: StreamingViewModel = viewModel()
) {
    val context = LocalContext.current
    val app = context.applicationContext as com.p2pgaming.client.P2PGamingApp
    val webRTCService = app.webRTCService
    var showExitDialog by remember { mutableStateOf(false) }

    DisposableEffect(sessionId) {
        // Initiate WebRTC connection via signaling when entering the streaming screen
        if (hostId.isNotEmpty() && token.isNotEmpty()) {
            viewModel.startConnection(sessionId, hostId, token)
        }
        onDispose {
            viewModel.stopConnection()
        }
    }

    BackHandler {
        showExitDialog = true
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // The SurfaceViewRenderer receives decoded frames from the WebRTC video track.
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                SurfaceViewRenderer(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    webRTCService.initializeRenderer(this)
                }
            }
        )
        GamepadOverlay(
            layout = viewModel.gamepadLayout,
            hasPhysicalController = webRTCService.hasPhysicalController(context),
            webRTCService = webRTCService,
            modifier = Modifier.fillMaxSize()
        )
        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Time left: ${viewModel.remainingSeconds / 60}:${(viewModel.remainingSeconds % 60).toString().padStart(2, '0')}",
                style = MaterialTheme.typography.titleLarge
            )
            if (viewModel.connectionState != "connected") {
                Text(
                    text = "Status: ${viewModel.connectionState}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Button(onClick = { viewModel.toggleLayout() }, modifier = Modifier.fillMaxWidth()) {
                Text(text = "Toggle ${if (viewModel.gamepadLayout == GamepadLayout.XBOX_LAYOUT) "PS3" else "Xbox"} Layout")
            }
            Button(onClick = { viewModel.extendSession(sessionId) }, modifier = Modifier.fillMaxWidth()) {
                Text(text = "Extend Time")
            }
            TextButton(onClick = { showExitDialog = true }) {
                Text(text = "Back")
            }
        }
    }

    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            title = { Text("Exit stream?") },
            text = { Text("Leaving will stop the active game session on the host.") },
            confirmButton = {
                Button(onClick = {
                    viewModel.stopConnection()
                    showExitDialog = false
                    onExit()
                }) {
                    Text("Exit")
                }
            },
            dismissButton = {
                TextButton(onClick = { showExitDialog = false }) {
                    Text("Stay")
                }
            }
        )
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}
