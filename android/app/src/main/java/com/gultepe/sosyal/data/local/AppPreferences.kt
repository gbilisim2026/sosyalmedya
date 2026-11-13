package com.gultepe.sosyal.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppPreferences @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {
    val activeAccountId: Flow<String>
        get() = dataStore.data.map { it[ACTIVE_ACCOUNT_ID].orEmpty() }

    val theme: Flow<String>
        get() = dataStore.data.map { it[THEME] ?: "SYSTEM" }

    suspend fun saveActiveAccountId(accountId: String) {
        dataStore.edit { it[ACTIVE_ACCOUNT_ID] = accountId }
    }

    suspend fun clearActiveAccount() {
        dataStore.edit { it.remove(ACTIVE_ACCOUNT_ID) }
    }

    suspend fun saveTheme(theme: String) {
        require(theme in setOf("SYSTEM", "LIGHT", "DARK"))
        dataStore.edit { it[THEME] = theme }
    }

    private companion object {
        val ACTIVE_ACCOUNT_ID = stringPreferencesKey("active_account_id")
        val THEME = stringPreferencesKey("theme")
    }
}
