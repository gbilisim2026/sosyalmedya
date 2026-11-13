package com.gultepe.sosyal.presentation.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    theme: String,
    username: String,
    isGuest: Boolean,
    error: String?,
    onThemeChange: (String) -> Unit,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onLogout: () -> Unit,
    onBack: () -> Unit,
) {
    var confirmLogout by remember { mutableStateOf(false) }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ayarlar") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Akışa dön")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
        ) {
            Text(if (isGuest) "Misafir profili" else "Yerel hesap", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(6.dp))
            Text(
                if (isGuest) "Gönderilerin yalnızca bu cihazda saklanır."
                else "@$username · bu cihazda saklanan hesap",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            if (isGuest) {
                Button(onClick = onRegister, modifier = Modifier.fillMaxWidth()) {
                    Text("Bu cihazda hesap oluştur")
                }
                Spacer(Modifier.height(8.dp))
                OutlinedButton(onClick = onLogin, modifier = Modifier.fillMaxWidth()) {
                    Text("Bu cihazdaki hesaba giriş yap")
                }
            } else {
                OutlinedButton(
                    onClick = { confirmLogout = true },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
                    Text("  Misafir profiline geç")
                }
            }
            Spacer(Modifier.height(28.dp))
            Text("Görünüm", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("SYSTEM" to "Sistem", "LIGHT" to "Açık", "DARK" to "Koyu").forEach { (value, label) ->
                    FilterChip(
                        selected = theme == value,
                        onClick = { onThemeChange(value) },
                        label = { Text(label) },
                    )
                }
            }
            Spacer(Modifier.height(24.dp))
            Text(
                "Uygulama tamamen native çalışır; hesaplar ve sosyal içerik bu cihazda saklanır, siteye bağlanmaz.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (error != null) {
                Spacer(Modifier.height(16.dp))
                Text(error, color = MaterialTheme.colorScheme.error)
            }
        }
    }

    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            title = { Text("Misafir profiline geçilsin mi?") },
            text = { Text("Yerel hesabın ve gönderilerin silinmez. Bu cihazdaki misafir profiline geçeceksin.") },
            confirmButton = {
                Button(onClick = {
                    confirmLogout = false
                    onLogout()
                }) { Text("Devam et") }
            },
            dismissButton = {
                OutlinedButton(onClick = { confirmLogout = false }) { Text("Vazgeç") }
            },
        )
    }
}
