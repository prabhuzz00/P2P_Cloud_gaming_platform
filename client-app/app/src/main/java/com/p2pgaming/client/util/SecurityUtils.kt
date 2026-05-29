package com.p2pgaming.client.util

import android.content.Context
import android.os.Build
import android.provider.Settings
import java.security.MessageDigest

object SecurityUtils {
    fun checkDeviceIntegrity(): Boolean {
        // Placeholder for Play Integrity API attestation verification.
        return true
    }

    fun getCertificateFingerprint(): String {
        val fakeCertificate = "p2p-gaming-cert"
        val hash = MessageDigest.getInstance("SHA-256")
            .digest(fakeCertificate.toByteArray())
            .joinToString(separator = "") { "%02x".format(it) }
        return "sha256/$hash"
    }

    fun getDeviceFingerprint(context: Context): String {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        return listOf(Build.MANUFACTURER, Build.MODEL, androidId).joinToString(separator = "-")
    }
}
