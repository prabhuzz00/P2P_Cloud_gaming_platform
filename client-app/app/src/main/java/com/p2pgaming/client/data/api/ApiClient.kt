package com.p2pgaming.client.data.api

import com.p2pgaming.client.BuildConfig
import com.p2pgaming.client.util.Constants
import com.p2pgaming.client.util.SecurityUtils
import okhttp3.CertificatePinner
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    @Volatile
    private var authToken: String? = null

    fun updateToken(token: String?) {
        authToken = token
    }

    private val authInterceptor = Interceptor { chain ->
        val requestBuilder = chain.request().newBuilder()
        authToken?.takeIf { it.isNotBlank() }?.let { token ->
            requestBuilder.addHeader("Authorization", listOf("Bearer", token).joinToString(" "))
        }
        chain.proceed(requestBuilder.build())
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val certificatePinner = CertificatePinner.Builder()
        .add(Constants.API_HOST, SecurityUtils.getCertificateFingerprint())
        .build()

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .apply {
                if (Constants.ENABLE_CERT_PINNING) certificatePinner(certificatePinner)
                if (BuildConfig.DEBUG) addInterceptor(loggingInterceptor)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()
    }

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(Constants.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
