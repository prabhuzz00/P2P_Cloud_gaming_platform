package com.p2pgaming.client.data.models

data class Host(
    val id: String,
    val name: String,
    val specs: String,
    val isVerified: Boolean,
    val isAvailable: Boolean,
    val isOnline: Boolean,
    val isRented: Boolean,
    val games: List<Game> = emptyList(),
    val pingMs: Int? = null
)
