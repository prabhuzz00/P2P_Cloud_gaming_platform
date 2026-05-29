package com.p2pgaming.client

import android.app.Application
import com.p2pgaming.client.service.WebRTCService

class P2PGamingApp : Application() {
    lateinit var webRTCService: WebRTCService
        private set

    override fun onCreate() {
        super.onCreate()
        webRTCService = WebRTCService(applicationContext)
    }
}
