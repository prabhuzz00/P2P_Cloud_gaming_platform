package com.p2pgaming.client.data.api

import com.p2pgaming.client.data.models.Game
import com.p2pgaming.client.data.models.Host
import com.p2pgaming.client.data.models.Session
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

data class RegisterRequest(val email: String, val password: String)
data class LoginRequest(val email: String, val password: String)
data class AuthResponse(val token: String, val userId: String)
data class CreateSessionRequest(val hostId: String, val gameId: String?, val durationMinutes: Int)
data class ExtendRequest(val additionalMinutes: Int)
data class TokenBalance(val balance: Int)
data class PairingRequest(val hostId: String, val qrCode: String)
data class Pairing(val id: String, val hostId: String, val pairedAt: String)
data class PairedHost(val id: String, val name: String, val specs: String, val rentingEnabled: Boolean)
data class ComplaintRequest(val hostId: String?, val sessionId: String?, val description: String)
data class Complaint(val id: String, val status: String, val description: String)

interface ApiService {
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @GET("hosts/discover")
    suspend fun discoverHosts(): Response<List<Host>>

    @GET("games/host/{hostId}")
    suspend fun getGamesForHost(@Path("hostId") hostId: String): Response<List<Game>>

    @POST("sessions")
    suspend fun createSession(@Body request: CreateSessionRequest): Response<Session>

    @POST("sessions/{id}/extend")
    suspend fun extendSession(
        @Path("id") sessionId: String,
        @Body request: ExtendRequest
    ): Response<Session>

    @GET("tokens/balance")
    suspend fun getTokenBalance(): Response<TokenBalance>

    @POST("pairings")
    suspend fun pairWithHost(@Body request: PairingRequest): Response<Pairing>

    @GET("pairings")
    suspend fun getPairedHosts(): Response<List<PairedHost>>

    @POST("complaints")
    suspend fun submitComplaint(@Body request: ComplaintRequest): Response<Complaint>
}
