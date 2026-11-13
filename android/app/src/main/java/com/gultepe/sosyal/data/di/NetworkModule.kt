package com.gultepe.sosyal.data.di

import android.content.Context
import androidx.room.migration.Migration
import androidx.room.Room
import androidx.sqlite.db.SupportSQLiteDatabase
import com.gultepe.sosyal.data.local.SosyalDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): SosyalDatabase =
        Room.databaseBuilder(context, SosyalDatabase::class.java, "gultepe-sosyal.db")
            .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
            .build()

    private val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                "CREATE TABLE IF NOT EXISTS `local_accounts` (`id` TEXT NOT NULL, `username` TEXT NOT NULL, `usernameKey` TEXT NOT NULL, `displayName` TEXT, `passwordSalt` TEXT, `passwordHash` TEXT, `isGuest` INTEGER NOT NULL, `createdAt` INTEGER NOT NULL, PRIMARY KEY(`id`))",
            )
            db.execSQL(
                "CREATE UNIQUE INDEX IF NOT EXISTS `index_local_accounts_usernameKey` ON `local_accounts` (`usernameKey`)",
            )
            db.execSQL(
                "CREATE TABLE IF NOT EXISTS `local_posts` (`id` TEXT NOT NULL, `authorId` TEXT NOT NULL, `caption` TEXT NOT NULL, `mediaType` TEXT NOT NULL, `mediaUrl` TEXT, `createdAt` INTEGER NOT NULL, PRIMARY KEY(`id`))",
            )
            db.execSQL("CREATE INDEX IF NOT EXISTS `index_local_posts_createdAt` ON `local_posts` (`createdAt`)")
            db.execSQL(
                "CREATE TABLE IF NOT EXISTS `local_likes` (`accountId` TEXT NOT NULL, `postId` TEXT NOT NULL, PRIMARY KEY(`accountId`, `postId`))",
            )
            db.execSQL(
                "CREATE TABLE IF NOT EXISTS `local_saved_posts` (`accountId` TEXT NOT NULL, `postId` TEXT NOT NULL, PRIMARY KEY(`accountId`, `postId`))",
            )
            db.execSQL(
                "CREATE TABLE IF NOT EXISTS `local_comments` (`id` TEXT NOT NULL, `postId` TEXT NOT NULL, `accountId` TEXT NOT NULL, `authorUsername` TEXT NOT NULL, `content` TEXT NOT NULL, `createdAt` INTEGER NOT NULL, PRIMARY KEY(`id`))",
            )
            db.execSQL(
                "CREATE INDEX IF NOT EXISTS `index_local_comments_postId_createdAt` ON `local_comments` (`postId`, `createdAt`)",
            )
            db.execSQL("DROP TABLE IF EXISTS `feed_cache`")
        }
    }

    private val MIGRATION_2_3 = object : Migration(2, 3) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL("DROP TABLE IF EXISTS `feed_cache`")
        }
    }
}
