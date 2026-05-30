package com.p2pgaming.client.ui.streaming

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.p2pgaming.client.P2PGamingApp
import com.p2pgaming.client.data.repository.SessionRepository
import com.p2pgaming.client.service.SignalingClient
import com.p2pgaming.client.util.Constants
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.webrtc.IceCandidate
import org.webrtc.SessionDescription

class StreamingViewModel(application: Application) : AndroidViewModel(application) {
    private val sessionRepository = SessionRepository()
    private val webRTCService = (application as P2PGamingApp).webRTCService
    private var signalingClient: SignalingClient? = null

    var remainingSeconds by mutableIntStateOf(30 * 60)
        private set
    var gamepadLayout by mutableStateOf(GamepadLayout.XBOX_LAYOUT)
        private set
    var connectionState by mutableStateOf("disconnected")
        private set

    init {
        viewModelScope.launch {
            while (remainingSeconds > 0) {
                delay(1000)
                remainingSeconds -= 1
            }
        }
    }

    /**
     * Initiates the WebRTC connection via signaling.
     * Called when StreamingScreen is composed with a valid sessionId and hostId.
     */
    fun startConnection(sessionId: String, hostId: String, token: String) {
        connectionState = "connecting"

        // Build signaling URL with auth token
        val signalingUrl = "${Constants.SIGNALING_URL}?token=$token"

        signalingClient = SignalingClient(signalingUrl) { rawMessage ->
            viewModelScope.launch(Dispatchers.Main) {
                handleSignalingMessage(rawMessage, hostId)
            }
        }
        signalingClient?.connect()

        // Observe local ICE candidates and send them to the host via signaling
        webRTCService.observeSignaling { signal ->
            if (signal.startsWith("ice:")) {
                val parts = signal.removePrefix("ice:").split(":", limit = 3)
                if (parts.size == 3) {
                    val candidateJson = JSONObject().apply {
                        put("candidate", parts[2])
                        put("sdpMid", parts[0])
                        put("sdpMLineIndex", parts[1].toIntOrNull() ?: 0)
                    }
                    val payload = JSONObject().apply {
                        put("targetId", hostId)
                        put("hostId", hostId)
                        put("payload", JSONObject().apply {
                            put("candidate", candidateJson)
                        })
                    }
                    signalingClient?.send("ice-candidate", payload.toString())
                }
            }
        }

        // Create an SDP offer and send to host
        webRTCService.createOffer { offer ->
            val payload = JSONObject().apply {
                put("targetId", hostId)
                put("hostId", hostId)
                put("sessionId", sessionId)
                put("payload", JSONObject().apply {
                    put("type", offer.type.canonicalForm())
                    put("sdp", offer.description)
                })
            }
            signalingClient?.send("offer", payload.toString())
        }
    }

    private fun handleSignalingMessage(rawMessage: String, hostId: String) {
        try {
            val json = JSONObject(rawMessage)
            when (json.optString("type")) {
                "answer" -> {
                    val payload = json.optJSONObject("payload") ?: return
                    val sdp = payload.optString("sdp")
                    val type = payload.optString("type", "answer")
                    val sessionDesc = SessionDescription(
                        SessionDescription.Type.fromCanonicalForm(type),
                        sdp
                    )
                    webRTCService.setRemoteAnswer(sessionDesc)
                    connectionState = "connected"
                }
                "ice-candidate" -> {
                    val payload = json.optJSONObject("payload") ?: return
                    val candidateObj = payload.optJSONObject("candidate") ?: return
                    val candidate = IceCandidate(
                        candidateObj.optString("sdpMid"),
                        candidateObj.optInt("sdpMLineIndex", 0),
                        candidateObj.optString("candidate")
                    )
                    webRTCService.addIceCandidate(candidate)
                }
                "error" -> {
                    connectionState = "error"
                }
                "connected" -> {
                    // Signaling connection established, waiting for WebRTC
                }
            }
        } catch (e: Exception) {
            connectionState = "error"
        }
    }

    fun stopConnection() {
        signalingClient?.close()
        signalingClient = null
        webRTCService.closeSession()
        connectionState = "disconnected"
    }

    fun toggleLayout() {
        gamepadLayout = if (gamepadLayout == GamepadLayout.XBOX_LAYOUT) {
            GamepadLayout.PS3_LAYOUT
        } else {
            GamepadLayout.XBOX_LAYOUT
        }
    }

    fun extendSession(sessionId: String) {
        viewModelScope.launch {
            runCatching { sessionRepository.extendSession(sessionId, 30) }
            remainingSeconds += 30 * 60
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopConnection()
    }
}

enum class GamepadLayout { XBOX_LAYOUT, PS3_LAYOUT }
