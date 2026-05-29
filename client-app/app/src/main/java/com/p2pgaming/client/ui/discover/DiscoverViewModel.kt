package com.p2pgaming.client.ui.discover

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.p2pgaming.client.data.models.Host
import com.p2pgaming.client.data.repository.HostRepository
import kotlinx.coroutines.launch

class DiscoverViewModel(
    private val hostRepository: HostRepository = HostRepository()
) : ViewModel() {
    var uiState by mutableStateOf(DiscoverUiState())
        private set

    init {
        loadHosts()
    }

    fun loadHosts() {
        viewModelScope.launch {
            val hosts = runCatching { hostRepository.discoverHosts() }
                .getOrDefault(sampleHosts())
                .filter { it.isAvailable && it.isOnline }
            uiState = DiscoverUiState(hosts = hosts)
        }
    }

    fun updatePing(hostId: String, ping: Int) {
        uiState = uiState.copy(hosts = uiState.hosts.map {
            if (it.id == hostId) it.copy(pingMs = ping) else it
        })
    }

    private fun sampleHosts(): List<Host> = listOf(
        Host("1", "RTX Arena", "RTX 4080 • Ryzen 9 • 32GB", true, true, true, false),
        Host("2", "Night Owl Rig", "RTX 4070 • i7 • 16GB", true, true, true, false)
    )
}

data class DiscoverUiState(val hosts: List<Host> = emptyList())
