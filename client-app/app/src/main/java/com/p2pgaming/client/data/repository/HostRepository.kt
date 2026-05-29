package com.p2pgaming.client.data.repository

import com.p2pgaming.client.data.api.ApiClient
import com.p2pgaming.client.data.api.PairedHost
import com.p2pgaming.client.data.models.Game
import com.p2pgaming.client.data.models.Host

class HostRepository {
    suspend fun discoverHosts(): List<Host> =
        ApiClient.apiService.discoverHosts().body().orEmpty()

    suspend fun getGamesForHost(hostId: String): List<Game> =
        ApiClient.apiService.getGamesForHost(hostId).body().orEmpty()

    suspend fun getPairedHosts(): List<PairedHost> =
        ApiClient.apiService.getPairedHosts().body().orEmpty()
}
