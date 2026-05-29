package com.p2pgaming.client

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.p2pgaming.client.navigation.P2PNavGraph
import com.p2pgaming.client.ui.theme.P2PGamingTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            P2PGamingTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    P2PNavGraph()
                }
            }
        }
    }
}
