package com.p2pgaming.client.ui.complaint

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun ComplaintScreen(viewModel: ComplaintViewModel = viewModel()) {
    val uiState = viewModel.uiState

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "Report an issue", style = MaterialTheme.typography.headlineMedium)
                OutlinedTextField(
                    value = uiState.selectedHostId,
                    onValueChange = { viewModel.updateSelection(it, uiState.selectedSessionId) },
                    label = { Text("Host ID") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = uiState.selectedSessionId,
                    onValueChange = { viewModel.updateSelection(uiState.selectedHostId, it) },
                    label = { Text("Session ID") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = uiState.description,
                    onValueChange = viewModel::updateDescription,
                    label = { Text("Description") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 4
                )
                Button(onClick = viewModel::submit, modifier = Modifier.fillMaxWidth()) {
                    Text(text = "Submit Complaint")
                }
            }
        }
        item {
            Text(text = "Past complaints", style = MaterialTheme.typography.titleLarge)
        }
        items(uiState.complaints, key = { it.id }) { complaint ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = complaint.id, style = MaterialTheme.typography.labelLarge)
                    Text(text = complaint.description, style = MaterialTheme.typography.bodyLarge)
                    Text(text = "Status: ${complaint.status}")
                }
            }
        }
    }
}
