package com.gultepe.sosyal.domain

import com.gultepe.sosyal.data.local.LocalAccountEntity
import com.gultepe.sosyal.data.local.LocalCommentEntity
import com.gultepe.sosyal.data.network.SocialPost

interface SocialRepository {
    suspend fun guestAccount(): LocalAccountEntity
    suspend fun account(id: String): LocalAccountEntity?
    suspend fun register(username: String, password: String, confirmPassword: String): LocalAccountEntity
    suspend fun login(username: String, password: String): LocalAccountEntity
    suspend fun feed(accountId: String): List<SocialPost>
    suspend fun createTextPost(accountId: String, caption: String)
    suspend fun toggleLike(accountId: String, postId: String)
    suspend fun toggleSaved(accountId: String, postId: String)
    suspend fun comments(postId: String): List<LocalCommentEntity>
    suspend fun addComment(accountId: String, postId: String, content: String)
}
