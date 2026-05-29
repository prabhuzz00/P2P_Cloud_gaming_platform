package com.p2pgaming.client.ui.dashboard

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.p2pgaming.client.data.models.Game
import com.p2pgaming.client.data.repository.HostRepository
import kotlinx.coroutines.launch

class DashboardViewModel(
    private val hostRepository: HostRepository = HostRepository()
) : ViewModel() {
    var uiState by mutableStateOf(DashboardUiState())
        private set

    fun load(hostId: String) {
        viewModelScope.launch {
            val games = runCatching { hostRepository.getGamesForHost(hostId) }
                .getOrDefault(
                    listOf(
                        Game("game-1", hostId, "Forza Horizon", "https://cdn.example/game1.png"),
                        Game("game-2", hostId, "Tekken Arena", "https://cdn.example/game2.png")
                    )
                )
            uiState = DashboardUiState(games = games)
        }
    }
}

data class DashboardUiState(val games: List<Game> = emptyList())
