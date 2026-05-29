package com.p2pgaming.client.data.repository

import com.p2pgaming.client.data.api.ApiClient
import com.p2pgaming.client.data.api.Complaint
import com.p2pgaming.client.data.api.ComplaintRequest
import com.p2pgaming.client.data.api.CreateSessionRequest
import com.p2pgaming.client.data.api.ExtendRequest
import com.p2pgaming.client.data.api.TokenBalance
import com.p2pgaming.client.data.models.Session

class SessionRepository {
    suspend fun createSession(hostId: String, gameId: String?, durationMinutes: Int): Session? =
        ApiClient.apiService.createSession(CreateSessionRequest(hostId, gameId, durationMinutes)).body()

    suspend fun extendSession(sessionId: String, additionalMinutes: Int): Session? =
        ApiClient.apiService.extendSession(sessionId, ExtendRequest(additionalMinutes)).body()

    suspend fun getTokenBalance(): TokenBalance? =
        ApiClient.apiService.getTokenBalance().body()

    suspend fun submitComplaint(hostId: String?, sessionId: String?, description: String): Complaint? =
        ApiClient.apiService.submitComplaint(ComplaintRequest(hostId, sessionId, description)).body()
}
