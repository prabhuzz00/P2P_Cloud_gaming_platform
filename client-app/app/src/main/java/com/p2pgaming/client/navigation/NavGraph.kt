package com.p2pgaming.client.navigation

import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Computer
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Report
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.p2pgaming.client.ui.auth.LoginScreen
import com.p2pgaming.client.ui.auth.RegisterScreen
import com.p2pgaming.client.ui.complaint.ComplaintScreen
import com.p2pgaming.client.ui.dashboard.PCDashboardScreen
import com.p2pgaming.client.ui.discover.DiscoverScreen
import com.p2pgaming.client.ui.home.HomeScreen
import com.p2pgaming.client.ui.streaming.StreamingScreen

sealed class Screen(val route: String) {
    data object Login : Screen("login")
    data object Register : Screen("register")
    data object Home : Screen("home")
    data object Discover : Screen("discover")
    data object Complaint : Screen("complaint")
    data object Dashboard : Screen("dashboard/{hostId}") {
        fun createRoute(hostId: String) = "dashboard/$hostId"
    }
    data object Streaming : Screen("streaming/{sessionId}") {
        fun createRoute(sessionId: String) = "streaming/$sessionId"
    }
}

data class BottomItem(val screen: Screen, val label: String, val icon: ImageVector)

@Composable
fun P2PNavGraph(navController: NavHostController = rememberNavController()) {
    val bottomItems = listOf(
        BottomItem(Screen.Home, "Home", Icons.Default.Home),
        BottomItem(Screen.Discover, "Discover", Icons.Default.Computer),
        BottomItem(Screen.Complaint, "Complaint", Icons.Default.Report)
    )
    val currentBackStack by navController.currentBackStackEntryAsState()
    val currentDestination = currentBackStack?.destination
    val showBottomBar = currentDestination?.route in bottomItems.map { it.screen.route }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    bottomItems.forEach { item ->
                        val selected = currentDestination?.hierarchy?.any { it.route == item.screen.route } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(item.screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label) }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Login.route,
            modifier = androidx.compose.ui.Modifier.padding(innerPadding)
        ) {
            composable(Screen.Login.route) {
                LoginScreen(
                    onLoginSuccess = { navController.navigate(Screen.Home.route) },
                    onNavigateToRegister = { navController.navigate(Screen.Register.route) }
                )
            }
            composable(Screen.Register.route) {
                RegisterScreen(
                    onRegisterSuccess = { navController.navigate(Screen.Home.route) },
                    onNavigateToLogin = { navController.popBackStack() }
                )
            }
            composable(Screen.Home.route) {
                HomeScreen(
                    onRentPc = { navController.navigate(Screen.Discover.route) },
                    onOpenPc = { hostId -> navController.navigate(Screen.Dashboard.createRoute(hostId)) }
                )
            }
            composable(Screen.Discover.route) {
                DiscoverScreen(onOpenDashboard = { hostId -> navController.navigate(Screen.Dashboard.createRoute(hostId)) })
            }
            composable(
                route = Screen.Dashboard.route,
                arguments = listOf(navArgument("hostId") { type = NavType.StringType })
            ) { backStackEntry ->
                PCDashboardScreen(
                    hostId = backStackEntry.arguments?.getString("hostId").orEmpty(),
                    onLaunchStream = { sessionId -> navController.navigate(Screen.Streaming.createRoute(sessionId)) }
                )
            }
            composable(
                route = Screen.Streaming.route,
                arguments = listOf(navArgument("sessionId") { type = NavType.StringType })
            ) { backStackEntry ->
                StreamingScreen(sessionId = backStackEntry.arguments?.getString("sessionId").orEmpty()) {
                    navController.popBackStack()
                }
            }
            composable(Screen.Complaint.route) {
                ComplaintScreen()
            }
        }
    }
}
