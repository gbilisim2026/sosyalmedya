# Web-to-Android feature parity

The Android client is a standalone native Kotlin/Jetpack Compose application. It launches directly into a device-local guest profile and makes no website connection or network request. Website accounts and content are not imported or synchronized.

## Implemented natively

| Native behavior | Status |
|---|---|
| Start directly in a persisted guest profile without URL/server setup | Implemented |
| Create local username/password accounts and sign in on this device | Implemented; passwords are salted PBKDF2-HMAC-SHA256 hashes |
| Store accounts, text posts, likes, saved flags, and comments in Room/SQLite | Implemented |
| Publish text posts, refresh the feed, like/unlike, save/unsave, and add/read comments | Implemented |
| Switch from a local account to the guest profile without deleting the account | Implemented |
| Light, dark, and system appearance preference in DataStore | Implemented |

## Not yet implemented natively

The following website capabilities remain outstanding:

| Web capability | Android status |
|---|---|
| Website account login, cloud feed, cross-device synchronization, and server visibility rules | Not implemented; the Android app is standalone and offline |
| Photo/video capture, gallery/file selection, media upload/download, carousel editing, and playback | Not implemented; posts are text-only |
| Stories, story archive, music, audience controls, and replies | Not implemented |
| Reels feed, video watch tracking, and recommendations | Not implemented |
| Search, Explore, external media catalogs, and search/watch history | Not implemented |
| Profiles, avatars, follows/follow requests, suggested accounts, blocks, and close friends | Not implemented |
| Notifications/activity feed | Not implemented |
| Direct messages, message requests, presence, and shared songs/status | Not implemented |
| Saved/archive browsing, post editing, pinning, highlighting, and audience management | Not implemented |
| Account privacy, profile editing, recommendation preferences, and other website settings | Not implemented |
| Push notifications, Android share/deep links, biometric unlock, and data export/restore | Not implemented |

## Validation

The Android debug app builds successfully and the emulator instrumentation suite passes (2 tests). A physical-device test has not been performed.
