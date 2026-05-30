package com.p2pgaming.client.service

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SignalingClient(
    private val signalingUrl: String,
    private val onMessageReceived: (String) -> Unit
) {
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private var reconnectAttempts = 0
    private var shouldReconnect = true

    fun connect() {
        shouldReconnect = true
        val request = Request.Builder().url(signalingUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                reconnectAttempts = 0
                onMessageReceived(text)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                if (shouldReconnect) scheduleReconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                if (shouldReconnect) scheduleReconnect()
            }
        })
    }

    /**
     * Send a signaling message. The payload should be a complete JSON object string
     * containing all fields (targetId, hostId, payload, etc.) excluding 'type'.
     * The type field is prepended automatically.
     */
    fun send(type: String, payload: String) {
        val message = JSONObject(payload).apply {
            put("type", type)
        }
        webSocket?.send(message.toString())
    }

    /**
     * Send a pre-formatted JSON message directly.
     */
    fun sendRaw(message: String) {
        webSocket?.send(message)
    }

    private fun scheduleReconnect() {
        reconnectAttempts += 1
        val delayMs = (reconnectAttempts.coerceAtMost(5) * 2_000).toLong()
        Thread {
            Thread.sleep(delayMs)
            if (shouldReconnect) connect()
        }.start()
    }

    fun close() {
        shouldReconnect = false
        webSocket?.close(1000, "Client closed")
    }
}
