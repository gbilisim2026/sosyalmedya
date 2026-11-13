package com.gultepe.sosyal.data.network

data class SocialUser(
    val id: String,
    val username: String,
    val displayName: String?,
    val avatarUrl: String?,
    val themePreference: String? = null,
)

data class SocialPost(
    val id: String,
    val caption: String?,
    val mediaType: String,
    val mediaUrl: String?,
    val mediaItems: List<MediaItem>,
    val visualEffect: String,
    val location: String?,
    val createdAt: String,
    val user: SocialUser,
    val likesCount: Int,
    val commentsCount: Int,
    val likedByCurrentUser: Boolean,
    val isSaved: Boolean,
)

data class MediaItem(val mediaUrl: String)
