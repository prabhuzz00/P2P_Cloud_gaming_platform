package com.p2pgaming.client.service

import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
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
     * Send a raw signaling message. The message should be a complete JSON string
     * containing type, targetId, and payload fields as expected by the signaling server.
     */
    fun send(type: String, payload: String) {
        webSocket?.send("""{"type":"$type",${ payload.trimStart('{') }""")
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
