package com.gultepe.sosyal.presentation.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import com.gultepe.sosyal.data.local.LocalCommentEntity
import com.gultepe.sosyal.data.network.SocialPost
import com.gultepe.sosyal.presentation.AppUiState
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedScreen(
    state: AppUiState,
    onRefresh: () -> Unit,
    onSettings: () -> Unit,
    onCreatePost: (String) -> Unit,
    onLike: (String) -> Unit,
    onSave: (String) -> Unit,
    onComments: (String) -> Unit,
    onCloseComments: () -> Unit,
    onAddComment: (String) -> Unit,
) {
    var draft by remember { mutableStateOf("") }
    LaunchedEffect(state.notice) {
        if (state.notice == "Gönderi bu cihaza kaydedildi.") draft = ""
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Gültepe Sosyal", fontWeight = FontWeight.SemiBold) },
                actions = {
                    TextButton(onClick = onRefresh, enabled = !state.isRefreshing) {
                        if (state.isRefreshing) CircularProgressIndicator(modifier = Modifier.height(20.dp))
                        else Text("Yenile")
                    }
                    TextButton(onClick = onSettings) { Text("Ayarlar") }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding),
            horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
        ) {
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().widthIn(max = 720.dp).padding(horizontal = 16.dp, vertical = 12.dp),
                ) {
                    Text(
                        "Merhaba, @${state.user?.username ?: "misafir"}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                    Text("Akışın", style = MaterialTheme.typography.headlineSmall)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = draft,
                        onValueChange = { if (it.length <= 2200) draft = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Aklından ne geçiyor?") },
                        minLines = 2,
                        maxLines = 5,
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                        supportingText = { Text("${draft.length}/2200") },
                    )
                    Button(
                        onClick = {
                            onCreatePost(draft)
                        },
                        enabled = draft.isNotBlank() && !state.isLoading,
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    ) { Text("Paylaş") }
                }
            }
            if (state.error != null) {
                item {
                    Text(
                        state.error,
                        modifier = Modifier.fillMaxWidth().widthIn(max = 720.dp).padding(horizontal = 16.dp, vertical = 8.dp),
                        color = MaterialTheme.colorScheme.error,
                    )
                }
            }
            if (state.notice != null) {
                item {
                    Text(
                        state.notice,
                        modifier = Modifier.fillMaxWidth().widthIn(max = 720.dp).padding(horizontal = 16.dp, vertical = 4.dp),
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            if (state.posts.isEmpty()) {
                item {
                    Text(
                        "Henüz gönderi yok. İlk gönderini paylaş!",
                        modifier = Modifier.fillMaxWidth().widthIn(max = 720.dp).padding(24.dp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            items(state.posts, key = { it.id }) { post ->
                FeedPostCard(
                    post = post,
                    onLike = { onLike(post.id) },
                    onSave = { onSave(post.id) },
                    onComments = { onComments(post.id) },
                )
            }
        }
    }

    if (state.activeCommentsPostId != null) {
        CommentsDialog(
            comments = state.comments,
            notice = state.notice,
            error = state.error,
            onDismiss = onCloseComments,
            onSubmit = onAddComment,
        )
    }
}

@Composable
private fun FeedPostCard(
    post: SocialPost,
    onLike: () -> Unit,
    onSave: () -> Unit,
    onComments: () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth().widthIn(max = 720.dp).padding(horizontal = 12.dp, vertical = 7.dp),
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(post.user.displayName ?: post.user.username, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Text("@${post.user.username} · ${formatDate(post.createdAt)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            if (!post.caption.isNullOrBlank()) {
                Text(post.caption, modifier = Modifier.padding(vertical = 14.dp), style = MaterialTheme.typography.bodyLarge)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                TextButton(onClick = onLike) {
                    Text("${if (post.likedByCurrentUser) "♥" else "♡"} ${post.likesCount}")
                }
                TextButton(onClick = onComments) { Text("Yorumlar ${post.commentsCount}") }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = onSave) { Text(if (post.isSaved) "Kaydedildi" else "Kaydet") }
            }
        }
    }
}

@Composable
private fun CommentsDialog(
    comments: List<LocalCommentEntity>,
    notice: String?,
    error: String?,
    onDismiss: () -> Unit,
    onSubmit: (String) -> Unit,
) {
    var draft by remember { mutableStateOf("") }
    LaunchedEffect(notice) {
        if (notice == "Yorum bu cihaza kaydedildi.") draft = ""
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Yorumlar") },
        text = {
            Column {
                if (comments.isEmpty()) {
                    Text("Henüz yorum yok.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                } else {
                    comments.forEach { comment ->
                        Text("@${comment.authorUsername}", style = MaterialTheme.typography.labelLarge)
                        Text(comment.content, modifier = Modifier.padding(bottom = 10.dp))
                    }
                }
                if (error != null) {
                    Text(error, color = MaterialTheme.colorScheme.error)
                }
                OutlinedTextField(
                    value = draft,
                    onValueChange = { if (it.length <= 1000) draft = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Yorum yaz") },
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                    maxLines = 3,
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSubmit(draft)
                },
                enabled = draft.isNotBlank(),
            ) { Text("Gönder") }
        },
        dismissButton = { OutlinedButton(onClick = onDismiss) { Text("Kapat") } },
    )
}

private fun formatDate(value: String): String = try {
    DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm")
        .withZone(ZoneId.systemDefault())
        .format(Instant.parse(value))
} catch (_: java.time.format.DateTimeParseException) {
    value.take(16)
}
