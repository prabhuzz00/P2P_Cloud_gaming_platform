package com.p2pgaming.client.data.models

data class Transaction(
    val id: String,
    val type: String,
    val amount: Int,
    val description: String,
    val createdAt: String
)
