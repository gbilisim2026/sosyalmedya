package com.gultepe.sosyal.data

import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.gultepe.sosyal.data.local.SosyalDatabase
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LocalSocialRepositoryTest {
    private lateinit var database: SosyalDatabase
    private lateinit var repository: SocialRepositoryImpl

    @Before
    fun setUp() {
        database = Room.inMemoryDatabaseBuilder(
            InstrumentationRegistry.getInstrumentation().targetContext,
            SosyalDatabase::class.java,
        ).allowMainThreadQueries().build()
        repository = SocialRepositoryImpl(database)
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun localAccountPostsAndEngagementPersistInSqlite() = runBlocking {
        val account = repository.register("alice_1", "securepass", "securepass")
        assertNotEquals("securepass", account.passwordHash)
        assertEquals(account.id, repository.login("ALICE_1", "securepass").id)
        assertTrue(runCatching { repository.login("alice_1", "incorrect") }.isFailure)
        assertTrue(
            runCatching { repository.register("ALICE_1", "securepass", "securepass") }.isFailure,
        )

        repository.createTextPost(account.id, "Bu gönderi çevrimdışı kaydedildi.")
        val post = repository.feed(account.id).single()
        repository.toggleLike(account.id, post.id)
        repository.toggleSaved(account.id, post.id)
        repository.addComment(account.id, post.id, "Yerel yorum")

        val refreshedPost = repository.feed(account.id).single()
        assertTrue(refreshedPost.likedByCurrentUser)
        assertTrue(refreshedPost.isSaved)
        assertEquals(1, refreshedPost.likesCount)
        assertEquals(1, refreshedPost.commentsCount)
        assertEquals("Yerel yorum", repository.comments(post.id).single().content)
    }

    @Test
    fun guestAccountIsCreatedOnlyOnce() = runBlocking {
        assertEquals(repository.guestAccount().id, repository.guestAccount().id)
    }
}
