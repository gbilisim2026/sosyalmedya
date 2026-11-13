package com.gultepe.sosyal.data

import android.util.Base64
import androidx.room.withTransaction
import com.gultepe.sosyal.data.local.LocalAccountEntity
import com.gultepe.sosyal.data.local.LocalCommentEntity
import com.gultepe.sosyal.data.local.LocalLikeEntity
import com.gultepe.sosyal.data.local.LocalPostEntity
import com.gultepe.sosyal.data.local.LocalSavedPostEntity
import com.gultepe.sosyal.data.local.SosyalDatabase
import com.gultepe.sosyal.data.network.MediaItem
import com.gultepe.sosyal.data.network.SocialPost
import com.gultepe.sosyal.data.network.SocialUser
import com.gultepe.sosyal.domain.SocialRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.security.SecureRandom
import java.security.MessageDigest
import java.time.Instant
import java.util.UUID
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SocialRepositoryImpl @Inject constructor(
    private val database: SosyalDatabase,
) : SocialRepository {
    override suspend fun guestAccount(): LocalAccountEntity = database.withTransaction {
        val accounts = database.accounts()
        accounts.findByUsername(GUEST_USERNAME)?.let { return@withTransaction it }
        LocalAccountEntity(
            id = UUID.randomUUID().toString(),
            username = GUEST_USERNAME,
            usernameKey = GUEST_USERNAME,
            displayName = "Yerel profil",
            passwordSalt = null,
            passwordHash = null,
            isGuest = true,
            createdAt = System.currentTimeMillis(),
        ).also { accounts.insert(it) }
    }

    override suspend fun account(id: String): LocalAccountEntity? = database.accounts().findById(id)

    override suspend fun register(
        username: String,
        password: String,
        confirmPassword: String,
    ): LocalAccountEntity {
        val normalizedName = username.trim()
        require(normalizedName.length in 3..30 && USERNAME_PATTERN.matches(normalizedName)) {
            "Kullanıcı adı 3-30 karakter olmalı; harf, rakam ve alt çizgi kullanılabilir."
        }
        require(password.length >= 8) { "Şifre en az 8 karakter olmalı." }
        require(password == confirmPassword) { "Şifreler eşleşmiyor." }

        val salt = ByteArray(SALT_BYTES).also(secureRandom::nextBytes)
        val passwordHash = withContext(Dispatchers.Default) { hashPassword(password, salt) }
        return database.withTransaction {
            val key = normalizedName.lowercase()
            check(database.accounts().findByUsername(key) == null) {
                "Bu kullanıcı adı bu telefonda zaten kullanılıyor."
            }
            val account = LocalAccountEntity(
                id = UUID.randomUUID().toString(),
                username = normalizedName,
                usernameKey = key,
                displayName = normalizedName,
                passwordSalt = Base64.encodeToString(salt, Base64.NO_WRAP),
                passwordHash = passwordHash,
                isGuest = false,
                createdAt = System.currentTimeMillis(),
            )
            database.accounts().insert(account)
            account
        }
    }

    override suspend fun login(username: String, password: String): LocalAccountEntity {
        val account = database.accounts().findByUsername(username.trim().lowercase())
            ?: throw IllegalArgumentException("Bu telefonda bu kullanıcıyla kayıtlı hesap bulunamadı.")
        val encodedSalt = account.passwordSalt
            ?: throw IllegalArgumentException("Bu yerel misafir hesabı parola ile giriş yapamaz.")
        val expectedHash = account.passwordHash
            ?: throw IllegalStateException("Yerel hesap parola doğrulaması eksik.")
        val salt = Base64.decode(encodedSalt, Base64.NO_WRAP)
        val actualHash = withContext(Dispatchers.Default) { hashPassword(password, salt) }
        val hashesMatch = MessageDigest.isEqual(
            Base64.decode(actualHash, Base64.NO_WRAP),
            Base64.decode(expectedHash, Base64.NO_WRAP),
        )
        check(hashesMatch) { "Kullanıcı adı veya şifre hatalı." }
        return account
    }

    override suspend fun feed(accountId: String): List<SocialPost> {
        val posts = database.posts().getPosts()
        val likedIds = database.likes().getLikedPostIds(accountId).toSet()
        val savedIds = database.savedPosts().getSavedPostIds(accountId).toSet()
        return posts.map { post ->
            val author = database.accounts().findById(post.authorId)
                ?: throw IllegalStateException("Yerel gönderinin sahibi bulunamadı.")
            SocialPost(
                id = post.id,
                caption = post.caption,
                mediaType = post.mediaType,
                mediaUrl = post.mediaUrl,
                mediaItems = emptyList<MediaItem>(),
                visualEffect = "NONE",
                location = null,
                createdAt = Instant.ofEpochMilli(post.createdAt).toString(),
                user = author.toSocialUser(),
                likesCount = database.likes().countForPost(post.id),
                commentsCount = database.comments().count(post.id),
                likedByCurrentUser = post.id in likedIds,
                isSaved = post.id in savedIds,
            )
        }
    }

    override suspend fun createTextPost(accountId: String, caption: String) {
        val text = caption.trim()
        require(text.isNotEmpty()) { "Gönderi metni boş olamaz." }
        require(text.length <= 2200) { "Gönderi en fazla 2200 karakter olabilir." }
        check(database.accounts().findById(accountId) != null) {
            "Aktif yerel hesap bulunamadı."
        }
        database.posts().insert(
            LocalPostEntity(
                id = UUID.randomUUID().toString(),
                authorId = accountId,
                caption = text,
                mediaType = "TEXT",
                mediaUrl = null,
                createdAt = System.currentTimeMillis(),
            ),
        )
    }

    override suspend fun toggleLike(accountId: String, postId: String) {
        if (database.likes().exists(accountId, postId)) {
            database.likes().delete(accountId, postId)
        } else {
            database.likes().insert(LocalLikeEntity(accountId, postId))
        }
    }

    override suspend fun toggleSaved(accountId: String, postId: String) {
        if (database.savedPosts().exists(accountId, postId)) {
            database.savedPosts().delete(accountId, postId)
        } else {
            database.savedPosts().insert(LocalSavedPostEntity(accountId, postId))
        }
    }

    override suspend fun comments(postId: String): List<LocalCommentEntity> =
        database.comments().getComments(postId)

    override suspend fun addComment(accountId: String, postId: String, content: String) {
        val text = content.trim()
        require(text.isNotEmpty()) { "Yorum boş olamaz." }
        require(text.length <= 1000) { "Yorum en fazla 1000 karakter olabilir." }
        val account = database.accounts().findById(accountId)
            ?: throw IllegalStateException("Aktif yerel hesap bulunamadı.")
        check(database.posts().getPosts().any { it.id == postId }) {
            "Gönderi artık mevcut değil."
        }
        database.comments().insert(
            LocalCommentEntity(
                id = UUID.randomUUID().toString(),
                postId = postId,
                accountId = accountId,
                authorUsername = account.username,
                content = text,
                createdAt = System.currentTimeMillis(),
            ),
        )
    }

    private fun LocalAccountEntity.toSocialUser() = SocialUser(
        id = id,
        username = username,
        displayName = displayName,
        avatarUrl = null,
        themePreference = null,
    )

    private fun hashPassword(password: String, salt: ByteArray): String {
        val spec = PBEKeySpec(password.toCharArray(), salt, PBKDF2_ITERATIONS, HASH_BITS)
        return try {
            val hash = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                .generateSecret(spec)
                .encoded
            Base64.encodeToString(hash, Base64.NO_WRAP)
        } finally {
            spec.clearPassword()
        }
    }

    private companion object {
        const val GUEST_USERNAME = "misafir"
        const val SALT_BYTES = 16
        const val PBKDF2_ITERATIONS = 310_000
        const val HASH_BITS = 256
        val USERNAME_PATTERN = Regex("[A-Za-z0-9_]+")
        val secureRandom = SecureRandom()
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class SocialRepositoryModule {
    @Binds
    @Singleton
    abstract fun bindSocialRepository(implementation: SocialRepositoryImpl): SocialRepository
}
