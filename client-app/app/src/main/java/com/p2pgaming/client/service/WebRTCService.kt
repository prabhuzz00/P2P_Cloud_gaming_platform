package com.p2pgaming.client.service

import android.content.Context
import android.hardware.input.InputManager
import org.webrtc.DataChannel
import org.webrtc.DefaultVideoDecoderFactory
import org.webrtc.DefaultVideoEncoderFactory
import org.webrtc.EglBase
import org.webrtc.IceCandidate
import org.webrtc.MediaConstraints
import org.webrtc.PeerConnection
import org.webrtc.PeerConnectionFactory
import org.webrtc.RtpReceiver
import org.webrtc.SdpObserver
import org.webrtc.SessionDescription
import org.webrtc.SurfaceViewRenderer
import org.webrtc.VideoTrack
import java.nio.ByteBuffer
import java.util.concurrent.CopyOnWriteArrayList

class WebRTCService(private val context: Context) {
    private val eglBase = EglBase.create()
    private val iceServers = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("turn:turn.p2pgaming.example.com:3478")
            .setUsername("demo")
            .setPassword("demo")
            .createIceServer()
    )
    private val peerConnectionFactory: PeerConnectionFactory
    private var renderer: SurfaceViewRenderer? = null
    private var videoTrack: VideoTrack? = null
    private var dataChannel: DataChannel? = null
    private var peerConnection: PeerConnection? = null
    private val observers = CopyOnWriteArrayList<(String) -> Unit>()

    init {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(context)
                .setEnableInternalTracer(true)
                .createInitializationOptions()
        )
        peerConnectionFactory = PeerConnectionFactory.builder()
            .setVideoEncoderFactory(DefaultVideoEncoderFactory(eglBase.eglBaseContext, true, true))
            .setVideoDecoderFactory(DefaultVideoDecoderFactory(eglBase.eglBaseContext))
            .createPeerConnectionFactory()
        createPeerConnection()
    }

    private fun createPeerConnection() {
        peerConnection = peerConnectionFactory.createPeerConnection(
            iceServers,
            object : PeerConnection.Observer {
                override fun onSignalingChange(newState: PeerConnection.SignalingState?) = Unit
                override fun onIceConnectionChange(newState: PeerConnection.IceConnectionState?) = Unit
                override fun onIceConnectionReceivingChange(receiving: Boolean) = Unit
                override fun onIceGatheringChange(newState: PeerConnection.IceGatheringState?) = Unit
                override fun onIceCandidate(candidate: IceCandidate?) {
                    observers.forEach { it("ice:${candidate?.sdpMid}:${candidate?.sdpMLineIndex}:${candidate?.sdp}") }
                }
                override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) = Unit
                override fun onAddStream(stream: org.webrtc.MediaStream?) = Unit
                override fun onRemoveStream(stream: org.webrtc.MediaStream?) = Unit
                override fun onDataChannel(channel: DataChannel?) {
                    dataChannel = channel
                }
                override fun onRenegotiationNeeded() = Unit
                override fun onAddTrack(receiver: RtpReceiver?, mediaStreams: Array<out org.webrtc.MediaStream>?) {
                    val track = receiver?.track() as? VideoTrack ?: return
                    videoTrack = track
                    renderer?.let(track::addSink)
                }
            }
        )
        dataChannel = peerConnection?.createDataChannel("game-input", DataChannel.Init())
    }

    fun initializeRenderer(surfaceViewRenderer: SurfaceViewRenderer) {
        if (peerConnection == null) {
            createPeerConnection()
        }
        renderer = surfaceViewRenderer
        renderer?.init(eglBase.eglBaseContext, null)
        renderer?.setEnableHardwareScaler(true)
        renderer?.setMirror(false)
        videoTrack?.addSink(surfaceViewRenderer)
    }

    fun observeSignaling(listener: (String) -> Unit) {
        observers += listener
    }

    fun createOffer(onOfferReady: (SessionDescription) -> Unit) {
        val constraints = MediaConstraints().apply {
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveVideo", "true"))
            mandatory.add(MediaConstraints.KeyValuePair("OfferToReceiveAudio", "true"))
        }
        peerConnection?.createOffer(object : SimpleSdpObserver() {
            override fun onCreateSuccess(desc: SessionDescription?) {
                desc ?: return
                peerConnection?.setLocalDescription(SimpleSdpObserver(), desc)
                onOfferReady(desc)
            }
        }, constraints)
    }

    fun setRemoteAnswer(answer: SessionDescription) {
        peerConnection?.setRemoteDescription(SimpleSdpObserver(), answer)
    }

    fun addIceCandidate(candidate: IceCandidate) {
        peerConnection?.addIceCandidate(candidate)
    }

    fun sendInputEvent(control: String, action: String) {
        sendPayload("""{"type":"button","control":"$control","action":"$action"}""")
    }

    fun sendAnalogInput(control: String, x: Float, y: Float) {
        sendPayload("""{"type":"analog","control":"$control","x":$x,"y":$y}""")
    }

    private fun sendPayload(payload: String) {
        val buffer = DataChannel.Buffer(ByteBuffer.wrap(payload.toByteArray()), false)
        dataChannel?.send(buffer)
    }

    fun hasPhysicalController(context: Context): Boolean {
        val inputManager = context.getSystemService(InputManager::class.java) ?: return false
        return inputManager.inputDeviceIds.mapNotNull(inputManager::getInputDevice).any { device ->
            device.sources and android.view.InputDevice.SOURCE_GAMEPAD == android.view.InputDevice.SOURCE_GAMEPAD
        }
    }

    fun closeSession() {
        renderer?.release()
        renderer = null
        dataChannel?.close()
        peerConnection?.close()
        videoTrack = null
        dataChannel = null
        peerConnection = null
    }

    private open class SimpleSdpObserver : SdpObserver {
        override fun onCreateSuccess(desc: SessionDescription?) = Unit
        override fun onSetSuccess() = Unit
        override fun onCreateFailure(error: String?) = Unit
        override fun onSetFailure(error: String?) = Unit
    }
}
