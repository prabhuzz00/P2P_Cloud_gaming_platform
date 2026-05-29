package com.p2pgaming.client.data.models

data class Session(
    val id: String,
    val hostId: String,
    val renterUserId: String,
    val startTime: String,
    val endTime: String,
    val status: String,
    val tokensSpent: Int
)
