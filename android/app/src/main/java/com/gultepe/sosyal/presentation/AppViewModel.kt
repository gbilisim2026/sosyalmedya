package com.gultepe.sosyal.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.gultepe.sosyal.data.local.AppPreferences
import com.gultepe.sosyal.data.local.LocalAccountEntity
import com.gultepe.sosyal.data.local.LocalCommentEntity
import com.gultepe.sosyal.data.network.SocialPost
import com.gultepe.sosyal.data.network.SocialUser
import com.gultepe.sosyal.domain.SocialRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AppDestination { STARTUP, LOGIN, REGISTER, HOME, SETTINGS }

data class AppUiState(
    val destination: AppDestination = AppDestination.STARTUP,
    val user: SocialUser? = null,
    val isGuest: Boolean = true,
    val posts: List<SocialPost> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val notice: String? = null,
    val theme: String = "SYSTEM",
    val activeCommentsPostId: String? = null,
    val comments: List<LocalCommentEntity> = emptyList(),
)

@HiltViewModel
class AppViewModel @Inject constructor(
    private val repository: SocialRepository,
    private val preferences: AppPreferences,
) : ViewModel() {
    private val mutableState = MutableStateFlow(AppUiState())
    val state = mutableState.asStateFlow()
    private var activeAccountId: String? = null

    init {
        viewModelScope.launch {
            val savedTheme = preferences.theme.first()
            mutableState.update { it.copy(theme = savedTheme) }
            val savedAccountId = preferences.activeAccountId.first()
            val account = savedAccountId.takeIf(String::isNotBlank)?.let { repository.account(it) }
                ?: repository.guestAccount()
            activate(account)
        }
    }

    fun openRegistration() {
        mutableState.update { it.copy(destination = AppDestination.REGISTER, error = null, notice = null) }
    }

    fun openLogin() {
        mutableState.update { it.copy(destination = AppDestination.LOGIN, error = null, notice = null) }
    }

    fun login(username: String, password: String) {
        viewModelScope.launch {
            mutableState.update { it.copy(isLoading = true, error = null, notice = null) }
            try {
                activate(repository.login(username, password))
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                mutableState.update {
                    it.copy(isLoading = false, error = error.message ?: "Yerel giriş başarısız oldu.")
                }
            }
        }
    }

    fun register(username: String, password: String, confirmPassword: String) {
        viewModelScope.launch {
            mutableState.update { it.copy(isLoading = true, error = null, notice = null) }
            try {
                activate(repository.register(username, password, confirmPassword))
                mutableState.update { it.copy(notice = "Hesabın bu cihazda oluşturuldu.") }
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                mutableState.update {
                    it.copy(isLoading = false, error = error.message ?: "Yerel hesap oluşturulamadı.")
                }
            }
        }
    }

    fun refreshFeed() {
        viewModelScope.launch {
            mutableState.update { it.copy(isRefreshing = true, error = null) }
            try {
                val accountId = activeAccountId ?: error("Aktif yerel hesap bulunamadı.")
                val posts = repository.feed(accountId)
                mutableState.update { it.copy(posts = posts, isLoading = false, isRefreshing = false) }
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                mutableState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        error = error.message ?: "Yerel akış yüklenemedi.",
                    )
                }
            }
        }
    }

    fun createPost(caption: String) = runLocalAction {
        repository.createTextPost(activeAccountId ?: error("Aktif yerel hesap bulunamadı."), caption)
        reloadFeed()
        mutableState.update { it.copy(notice = "Gönderi bu cihaza kaydedildi.") }
    }

    fun toggleLike(postId: String) = runLocalAction {
        repository.toggleLike(activeAccountId ?: error("Aktif yerel hesap bulunamadı."), postId)
        reloadFeed()
    }

    fun toggleSaved(postId: String) = runLocalAction {
        repository.toggleSaved(activeAccountId ?: error("Aktif yerel hesap bulunamadı."), postId)
        reloadFeed()
    }

    fun openComments(postId: String) {
        viewModelScope.launch {
            try {
                val comments = repository.comments(postId)
                mutableState.update {
                    it.copy(activeCommentsPostId = postId, comments = comments, error = null)
                }
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                mutableState.update { it.copy(error = error.message ?: "Yorumlar yüklenemedi.") }
            }
        }
    }

    fun closeComments() {
        mutableState.update { it.copy(activeCommentsPostId = null, comments = emptyList()) }
    }

    fun addComment(content: String) = runLocalAction {
        val postId = state.value.activeCommentsPostId ?: error("Yorumlanacak gönderi seçilmedi.")
        repository.addComment(activeAccountId ?: error("Aktif yerel hesap bulunamadı."), postId, content)
        mutableState.update { it.copy(comments = repository.comments(postId)) }
        reloadFeed()
        mutableState.update { it.copy(notice = "Yorum bu cihaza kaydedildi.") }
    }

    fun openSettings() {
        mutableState.update { it.copy(destination = AppDestination.SETTINGS, error = null, notice = null) }
    }

    fun returnToFeed() {
        mutableState.update { it.copy(destination = AppDestination.HOME, error = null, notice = null) }
    }

    fun changeTheme(theme: String) {
        viewModelScope.launch {
            preferences.saveTheme(theme)
            mutableState.update { it.copy(theme = theme) }
        }
    }

    fun logout() {
        viewModelScope.launch {
            try {
                preferences.clearActiveAccount()
                activate(repository.guestAccount())
                mutableState.update { it.copy(notice = "Misafir profiline geçtin.") }
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                mutableState.update { it.copy(error = error.message ?: "Misafir profiline geçilemedi.") }
            }
        }
    }

    private suspend fun activate(account: LocalAccountEntity) {
        activeAccountId = account.id
        preferences.saveActiveAccountId(account.id)
        mutableState.update {
            it.copy(
                destination = AppDestination.HOME,
                user = account.toSocialUser(),
                isGuest = account.isGuest,
                isLoading = false,
                error = null,
                notice = null,
                activeCommentsPostId = null,
                comments = emptyList(),
            )
        }
        reloadFeed()
    }

    private suspend fun reloadFeed() {
        val accountId = activeAccountId ?: error("Aktif yerel hesap bulunamadı.")
        mutableState.update { it.copy(posts = repository.feed(accountId)) }
    }

    private fun runLocalAction(action: suspend () -> Unit) {
        viewModelScope.launch {
            try {
                mutableState.update { it.copy(error = null, notice = null) }
                action()
            } catch (error: Exception) {
                if (error is CancellationException) throw error
                mutableState.update { it.copy(error = error.message ?: "İşlem tamamlanamadı.") }
            }
        }
    }

    private fun LocalAccountEntity.toSocialUser() = SocialUser(
        id = id,
        username = username,
        displayName = displayName,
        avatarUrl = null,
        themePreference = null,
    )
}
