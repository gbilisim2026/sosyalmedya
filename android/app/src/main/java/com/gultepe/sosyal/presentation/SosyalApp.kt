package com.gultepe.sosyal.presentation

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.gultepe.sosyal.presentation.screens.AuthScreen
import com.gultepe.sosyal.presentation.screens.FeedScreen
import com.gultepe.sosyal.presentation.screens.SettingsScreen
import com.gultepe.sosyal.presentation.theme.SosyalTheme

@Composable
fun SosyalApp(viewModel: AppViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val navController = rememberNavController()
    val route = when (state.destination) {
        AppDestination.STARTUP -> "startup"
        AppDestination.LOGIN -> "login"
        AppDestination.REGISTER -> "register"
        AppDestination.HOME -> "home"
        AppDestination.SETTINGS -> "settings"
    }

    LaunchedEffect(route) {
        if (navController.currentDestination?.route == route) return@LaunchedEffect
        navController.navigate(route) {
            when (route) {
                "register" -> popUpTo("login") { inclusive = false }
                "settings" -> popUpTo("home") { inclusive = false }
                else -> popUpTo(navController.graph.id) { inclusive = true }
            }
            launchSingleTop = true
        }
    }

    BackHandler(state.destination == AppDestination.REGISTER) { viewModel.openLogin() }
    BackHandler(state.destination == AppDestination.LOGIN) { viewModel.returnToFeed() }
    BackHandler(state.destination == AppDestination.SETTINGS) { viewModel.returnToFeed() }

    SosyalTheme(preference = state.theme) {
        Surface(modifier = Modifier.fillMaxSize()) {
            NavHost(navController = navController, startDestination = "startup") {
                composable("startup") {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                composable("login") {
                    AuthScreen(
                        register = false,
                        busy = state.isLoading,
                        error = state.error,
                        notice = state.notice,
                        onSubmit = viewModel::login,
                        onAlternateAction = viewModel::openRegistration,
                    )
                }
                composable("register") {
                    AuthScreen(
                        register = true,
                        busy = state.isLoading,
                        error = state.error,
                        notice = state.notice,
                        onRegister = viewModel::register,
                        onAlternateAction = { viewModel.openLogin() },
                    )
                }
                composable("home") {
                    FeedScreen(
                        state = state,
                        onRefresh = viewModel::refreshFeed,
                        onSettings = viewModel::openSettings,
                        onCreatePost = viewModel::createPost,
                        onLike = viewModel::toggleLike,
                        onSave = viewModel::toggleSaved,
                        onComments = viewModel::openComments,
                        onCloseComments = viewModel::closeComments,
                        onAddComment = viewModel::addComment,
                    )
                }
                composable("settings") {
                    SettingsScreen(
                        theme = state.theme,
                        username = state.user?.username.orEmpty(),
                        isGuest = state.isGuest,
                        error = state.error,
                        onThemeChange = viewModel::changeTheme,
                        onLogin = viewModel::openLogin,
                        onRegister = viewModel::openRegistration,
                        onLogout = viewModel::logout,
                        onBack = viewModel::returnToFeed,
                    )
                }
            }
        }
    }
}
