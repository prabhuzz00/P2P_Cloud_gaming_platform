package com.p2pgaming.client.ui.complaint

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.p2pgaming.client.data.api.Complaint
import com.p2pgaming.client.data.repository.SessionRepository
import kotlinx.coroutines.launch

class ComplaintViewModel(
    private val repository: SessionRepository = SessionRepository()
) : ViewModel() {
    var uiState by mutableStateOf(ComplaintUiState())
        private set

    fun updateSelection(hostId: String, sessionId: String) {
        uiState = uiState.copy(selectedHostId = hostId, selectedSessionId = sessionId)
    }

    fun updateDescription(description: String) {
        uiState = uiState.copy(description = description)
    }

    fun submit() {
        viewModelScope.launch {
            val complaint = runCatching {
                repository.submitComplaint(
                    hostId = uiState.selectedHostId.takeIf { it.isNotBlank() },
                    sessionId = uiState.selectedSessionId.takeIf { it.isNotBlank() },
                    description = uiState.description
                )
            }.getOrNull() ?: Complaint(
                id = "local-${uiState.complaints.size + 1}",
                status = "Pending",
                description = uiState.description
            )

            uiState = uiState.copy(
                description = "",
                complaints = listOf(complaint) + uiState.complaints
            )
        }
    }
}

data class ComplaintUiState(
    val selectedHostId: String = "",
    val selectedSessionId: String = "",
    val description: String = "",
    val complaints: List<Complaint> = listOf(
        Complaint(id = "sample-1", status = "Resolved", description = "Lag spike during ranked match")
    )
)
