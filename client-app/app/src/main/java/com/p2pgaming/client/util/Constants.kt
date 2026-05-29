package com.p2pgaming.client.util

/**
 * Application configuration constants.
 *
 * Before building for production or testing with a real server:
 * 1. Replace BASE_URL with your backend server's public address (e.g., "http://YOUR_PUBLIC_IP:3000/")
 * 2. Replace SIGNALING_URL with "ws://YOUR_PUBLIC_IP:3000/ws"
 * 3. If you port-forwarded your router, use your router's public IP
 * 4. Set ENABLE_CERT_PINNING to true for production with HTTPS
 */
object Constants {
    // Backend API base URL - change to your server's address
    const val BASE_URL = "http://192.168.1.100:3000/"
    const val API_HOST = "192.168.1.100"

    // WebSocket signaling endpoint
    const val SIGNALING_URL = "ws://192.168.1.100:3000/ws"

    // Security settings
    const val ENABLE_CERT_PINNING = false

    // ICE server configuration endpoint (fetched dynamically from backend)
    const val ICE_SERVERS_ENDPOINT = "api/ice-servers"
}
