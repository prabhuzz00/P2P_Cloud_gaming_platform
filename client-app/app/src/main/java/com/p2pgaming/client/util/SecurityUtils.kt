package com.p2pgaming.client.util

import android.content.Context
import android.os.Build
import android.provider.Settings
import java.security.MessageDigest

object SecurityUtils {
    /**
     * Check device integrity using Play Integrity API.
     *
     * In production, this should:
     * 1. Request an integrity token from Play Integrity API
     * 2. Send the token to your backend for verification
     * 3. Backend decrypts and validates the verdict
     *
     * For development/port-forwarded setups, this returns true.
     * To enable: add com.google.android.play:integrity dependency and implement
     * IntegrityManager.requestIntegrityToken().
     */
    fun checkDeviceIntegrity(): Boolean {
        // TODO: Implement Play Integrity API when publishing to Play Store.
        // For self-hosted/port-forwarded setups, device attestation is optional.
        return true
    }

    /**
     * Get SHA-256 certificate fingerprint for certificate pinning.
     * In production, replace with your actual server certificate's SHA-256 pin.
     */
    fun getCertificateFingerprint(): String {
        // Replace with actual certificate fingerprint when using HTTPS
        val certBytes = "p2p-gaming-production-cert".toByteArray()
        val hash = MessageDigest.getInstance("SHA-256")
            .digest(certBytes)
            .joinToString(separator = "") { "%02x".format(it) }
        return "sha256/$hash"
    }

    /**
     * Generate a stable device fingerprint for session binding.
     * Used to prevent session token theft/replay from different devices.
     */
    fun getDeviceFingerprint(context: Context): String {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        val components = listOf(
            Build.MANUFACTURER,
            Build.MODEL,
            Build.BOARD,
            androidId
        )
        val raw = components.joinToString(separator = "|")
        val hash = MessageDigest.getInstance("SHA-256")
            .digest(raw.toByteArray())
            .joinToString(separator = "") { "%02x".format(it) }
        return hash.take(32)
    }
}
