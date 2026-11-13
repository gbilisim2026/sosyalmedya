package com.gultepe.sosyal.presentation.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp

@Composable
fun AuthScreen(
    register: Boolean,
    busy: Boolean,
    error: String?,
    notice: String?,
    onSubmit: (String, String) -> Unit = { _, _ -> },
    onRegister: (String, String, String) -> Unit = { _, _, _ -> },
    onAlternateAction: () -> Unit,
) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 40.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        BrandHeading()
        Spacer(Modifier.height(32.dp))
        Text(
            if (register) "Hesap oluştur" else "Tekrar hoş geldin",
            style = MaterialTheme.typography.headlineSmall,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            if (register) "Hesabın bu cihazda saklanır."
            else "Bu cihazda kayıtlı yerel hesabına giriş yap.",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Kullanıcı adı") },
            singleLine = true,
            enabled = !busy,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Ascii),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Şifre") },
            singleLine = true,
            enabled = !busy,
            visualTransformation = PasswordVisualTransformation(),
        )
        if (register) {
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Şifreyi tekrar gir") },
                singleLine = true,
                enabled = !busy,
                visualTransformation = PasswordVisualTransformation(),
            )
        }
        if (notice != null) {
            Spacer(Modifier.height(12.dp))
            Text(notice, color = MaterialTheme.colorScheme.primary)
        }
        if (error != null) {
            Spacer(Modifier.height(12.dp))
            Text(error, color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = {
                if (register) onRegister(username, password, confirmPassword)
                else onSubmit(username, password)
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = !busy && username.isNotBlank() && password.isNotBlank(),
        ) {
            if (busy) CircularProgressIndicator(modifier = Modifier.height(20.dp))
            else Text(if (register) "Hesap oluştur" else "Giriş yap")
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onAlternateAction,
            modifier = Modifier.fillMaxWidth(),
            enabled = !busy,
        ) {
            Text(if (register) "Zaten hesabın var mı? Giriş yap" else "Yeni hesap oluştur")
        }
    }
}
