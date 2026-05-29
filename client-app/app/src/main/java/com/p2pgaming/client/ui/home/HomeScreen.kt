package com.p2pgaming.client.ui.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.p2pgaming.client.ui.components.PCCard
import com.p2pgaming.client.ui.components.TokenDisplay

@Composable
fun HomeScreen(
    onRentPc: () -> Unit,
    onOpenPc: (String) -> Unit,
    viewModel: HomeViewModel = viewModel()
) {
    val uiState = viewModel.uiState

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            TokenDisplay(balance = uiState.tokenBalance)
        }
        item {
            Text(text = "My PCs", style = MaterialTheme.typography.headlineMedium)
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Button(onClick = { /* QR scan entry point */ }, modifier = Modifier.fillMaxWidth()) {
                    Text(text = "Add Own PC")
                }
                Button(onClick = onRentPc, modifier = Modifier.fillMaxWidth()) {
                    Text(text = "Rent a PC")
                }
            }
        }
        items(uiState.pairedHosts, key = { it.id }) { host ->
            PCCard(
                host = host,
                rentingEnabled = uiState.rentingEnabled[host.id] ?: !host.isRented,
                onOpen = { onOpenPc(host.id) },
                onToggleRenting = { viewModel.toggleRenting(host.id, it) }
            )
        }
    }
}
