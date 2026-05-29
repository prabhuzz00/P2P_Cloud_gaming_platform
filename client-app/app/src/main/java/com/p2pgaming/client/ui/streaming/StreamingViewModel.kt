package com.p2pgaming.client.ui.streaming

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.p2pgaming.client.data.repository.SessionRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class StreamingViewModel(
    private val sessionRepository: SessionRepository = SessionRepository()
) : ViewModel() {
    var remainingSeconds by mutableIntStateOf(30 * 60)
        private set
    var gamepadLayout by mutableStateOf(GamepadLayout.XBOX_LAYOUT)
        private set

    init {
        viewModelScope.launch {
            while (remainingSeconds > 0) {
                delay(1000)
                remainingSeconds -= 1
            }
        }
    }

    fun toggleLayout() {
        gamepadLayout = if (gamepadLayout == GamepadLayout.XBOX_LAYOUT) {
            GamepadLayout.PS3_LAYOUT
        } else {
            GamepadLayout.XBOX_LAYOUT
        }
    }

    fun extendSession(sessionId: String) {
        viewModelScope.launch {
            runCatching { sessionRepository.extendSession(sessionId, 30) }
            remainingSeconds += 30 * 60
        }
    }
}

enum class GamepadLayout { XBOX_LAYOUT, PS3_LAYOUT }
