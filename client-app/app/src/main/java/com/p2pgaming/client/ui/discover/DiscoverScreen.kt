package com.p2pgaming.client.ui.discover

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.p2pgaming.client.data.models.Host
import com.p2pgaming.client.ui.components.PingIndicator

@Composable
fun DiscoverScreen(
    onOpenDashboard: (String) -> Unit,
    viewModel: DiscoverViewModel = viewModel()
) {
    val uiState = viewModel.uiState
    var selectedHost by remember { mutableStateOf<Host?>(null) }
    var selectedDuration by remember { mutableIntStateOf(30) }

    LazyColumn(
        modifier = Modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(uiState.hosts, key = { it.id }) { host ->
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = host.name, style = MaterialTheme.typography.titleLarge)
                    Text(text = host.specs, style = MaterialTheme.typography.bodyLarge)
                    Text(text = "${host.games.size} games available")
                    PingIndicator(pingMs = host.pingMs)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        Button(onClick = { viewModel.updatePing(host.id, listOf(24, 38, 57, 91).random()) }) {
                            Text("Check Ping")
                        }
                        Button(onClick = { selectedHost = host }) {
                            Text("Rent")
                        }
                        TextButton(onClick = { onOpenDashboard(host.id) }) {
                            Text("View")
                        }
                    }
                }
            }
        }
    }

    selectedHost?.let { host ->
        AlertDialog(
            onDismissRequest = { selectedHost = null },
            title = { Text("Select slot") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(30, 60, 90, 120).forEach { minutes ->
                        TextButton(onClick = { selectedDuration = minutes }) {
                            Text(text = "$minutes min • ${minutes / 30 * 15} tokens")
                        }
                    }
                    Text(text = "Selected ${selectedDuration} min for ${selectedDuration / 30 * 15} tokens")
                }
            },
            confirmButton = {
                Button(onClick = {
                    selectedHost = null
                    onOpenDashboard(host.id)
                }) {
                    Text("Confirm")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedHost = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}
