package com.p2pgaming.client.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.p2pgaming.client.data.api.ApiClient
import com.p2pgaming.client.data.repository.AuthRepository
import kotlinx.coroutines.launch

class AuthViewModel(
    private val repository: AuthRepository = AuthRepository()
) : ViewModel() {
    var uiState by mutableStateOf(AuthUiState())
        private set

    fun login(email: String, password: String, onSuccess: () -> Unit) {
        submitAuth(
            block = { repository.login(email, password) },
            onSuccess = onSuccess
        )
    }

    fun register(email: String, password: String, onSuccess: () -> Unit) {
        submitAuth(
            block = { repository.register(email, password) },
            onSuccess = onSuccess
        )
    }

    private fun submitAuth(
        block: suspend () -> retrofit2.Response<com.p2pgaming.client.data.api.AuthResponse>,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            uiState = uiState.copy(isLoading = true, errorMessage = null)
            runCatching { block() }
                .onSuccess { response ->
                    val body = response.body()
                    if (response.isSuccessful && body != null) {
                        ApiClient.updateToken(body.token)
                        uiState = uiState.copy(isLoading = false)
                        onSuccess()
                    } else {
                        uiState = uiState.copy(isLoading = false, errorMessage = "Authentication failed")
                    }
                }
                .onFailure {
                    uiState = uiState.copy(isLoading = false, errorMessage = it.message ?: "Unexpected error")
                }
        }
    }
}

data class AuthUiState(
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)
