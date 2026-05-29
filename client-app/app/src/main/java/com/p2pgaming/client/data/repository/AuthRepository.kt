package com.p2pgaming.client.data.repository

import com.p2pgaming.client.data.api.ApiClient
import com.p2pgaming.client.data.api.AuthResponse
import com.p2pgaming.client.data.api.LoginRequest
import com.p2pgaming.client.data.api.RegisterRequest
import retrofit2.Response

class AuthRepository {
    suspend fun login(email: String, password: String): Response<AuthResponse> =
        ApiClient.apiService.login(LoginRequest(email, password))

    suspend fun register(email: String, password: String): Response<AuthResponse> =
        ApiClient.apiService.register(RegisterRequest(email, password))
}
