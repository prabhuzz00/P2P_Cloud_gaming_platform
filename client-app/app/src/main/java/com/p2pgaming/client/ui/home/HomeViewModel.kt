package com.p2pgaming.client.ui.home

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.p2pgaming.client.data.models.Host
import com.p2pgaming.client.data.repository.HostRepository
import com.p2pgaming.client.data.repository.SessionRepository
import kotlinx.coroutines.launch

class HomeViewModel(
    private val hostRepository: HostRepository = HostRepository(),
    private val sessionRepository: SessionRepository = SessionRepository()
) : ViewModel() {
    var uiState by mutableStateOf(HomeUiState())
        private set

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            val pairedHosts = runCatching { hostRepository.getPairedHosts() }.getOrDefault(emptyList())
            val balance = runCatching { sessionRepository.getTokenBalance()?.balance ?: 0 }.getOrDefault(0)
            uiState = HomeUiState(
                tokenBalance = balance,
                pairedHosts = pairedHosts.map {
                    Host(
                        id = it.id,
                        name = it.name,
                        specs = it.specs,
                        isVerified = true,
                        isAvailable = true,
                        isOnline = true,
                        isRented = !it.rentingEnabled
                    )
                },
                rentingEnabled = pairedHosts.associate { it.id to it.rentingEnabled }
            )
        }
    }

    fun toggleRenting(hostId: String, enabled: Boolean) {
        uiState = uiState.copy(rentingEnabled = uiState.rentingEnabled + (hostId to enabled))
    }
}

data class HomeUiState(
    val tokenBalance: Int = 0,
    val pairedHosts: List<Host> = emptyList(),
    val rentingEnabled: Map<String, Boolean> = emptyMap()
)
