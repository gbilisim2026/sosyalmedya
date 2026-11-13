package com.gultepe.sosyal.data.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import androidx.room.Transaction

@Entity(tableName = "local_accounts", indices = [androidx.room.Index(value = ["usernameKey"], unique = true)])
data class LocalAccountEntity(
    @PrimaryKey val id: String,
    val username: String,
    val usernameKey: String,
    val displayName: String?,
    val passwordSalt: String?,
    val passwordHash: String?,
    val isGuest: Boolean,
    val createdAt: Long,
)

@Entity(tableName = "local_posts", indices = [androidx.room.Index(value = ["createdAt"])])
data class LocalPostEntity(
    @PrimaryKey val id: String,
    val authorId: String,
    val caption: String,
    val mediaType: String,
    val mediaUrl: String?,
    val createdAt: Long,
)

@Entity(tableName = "local_likes", primaryKeys = ["accountId", "postId"])
data class LocalLikeEntity(val accountId: String, val postId: String)

@Entity(tableName = "local_saved_posts", primaryKeys = ["accountId", "postId"])
data class LocalSavedPostEntity(val accountId: String, val postId: String)

@Entity(
    tableName = "local_comments",
    indices = [androidx.room.Index(value = ["postId", "createdAt"])],
)
data class LocalCommentEntity(
    @PrimaryKey val id: String,
    val postId: String,
    val accountId: String,
    val authorUsername: String,
    val content: String,
    val createdAt: Long,
)

@Dao
interface LocalAccountDao {
    @Query("SELECT * FROM local_accounts WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): LocalAccountEntity?

    @Query("SELECT * FROM local_accounts WHERE usernameKey = :usernameKey LIMIT 1")
    suspend fun findByUsername(usernameKey: String): LocalAccountEntity?

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(account: LocalAccountEntity)
}

@Dao
interface LocalPostDao {
    @Query("SELECT * FROM local_posts ORDER BY createdAt DESC LIMIT 100")
    suspend fun getPosts(): List<LocalPostEntity>

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(post: LocalPostEntity)
}

@Dao
interface LocalLikeDao {
    @Query("SELECT postId FROM local_likes WHERE accountId = :accountId")
    suspend fun getLikedPostIds(accountId: String): List<String>

    @Query("SELECT COUNT(*) FROM local_likes WHERE postId = :postId")
    suspend fun countForPost(postId: String): Int

    @Query("SELECT EXISTS(SELECT 1 FROM local_likes WHERE accountId = :accountId AND postId = :postId)")
    suspend fun exists(accountId: String, postId: String): Boolean

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(like: LocalLikeEntity): Long

    @Query("DELETE FROM local_likes WHERE accountId = :accountId AND postId = :postId")
    suspend fun delete(accountId: String, postId: String)
}

@Dao
interface LocalSavedPostDao {
    @Query("SELECT postId FROM local_saved_posts WHERE accountId = :accountId")
    suspend fun getSavedPostIds(accountId: String): List<String>

    @Query("SELECT EXISTS(SELECT 1 FROM local_saved_posts WHERE accountId = :accountId AND postId = :postId)")
    suspend fun exists(accountId: String, postId: String): Boolean

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(savedPost: LocalSavedPostEntity): Long

    @Query("DELETE FROM local_saved_posts WHERE accountId = :accountId AND postId = :postId")
    suspend fun delete(accountId: String, postId: String)
}

@Dao
interface LocalCommentDao {
    @Query("SELECT * FROM local_comments WHERE postId = :postId ORDER BY createdAt ASC")
    suspend fun getComments(postId: String): List<LocalCommentEntity>

    @Query("SELECT COUNT(*) FROM local_comments WHERE postId = :postId")
    suspend fun count(postId: String): Int

    @Insert
    suspend fun insert(comment: LocalCommentEntity)
}

@Database(
    entities = [
        LocalAccountEntity::class,
        LocalPostEntity::class,
        LocalLikeEntity::class,
        LocalSavedPostEntity::class,
        LocalCommentEntity::class,
    ],
    version = 3,
    exportSchema = false,
)
abstract class SosyalDatabase : RoomDatabase() {
    abstract fun accounts(): LocalAccountDao
    abstract fun posts(): LocalPostDao
    abstract fun likes(): LocalLikeDao
    abstract fun savedPosts(): LocalSavedPostDao
    abstract fun comments(): LocalCommentDao
}
