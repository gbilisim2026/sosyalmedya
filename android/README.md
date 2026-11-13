# Gültepe Sosyal Android

This is a standalone native Kotlin/Jetpack Compose client. It opens directly into a device-local guest profile; no website URL, account setup, or Internet connection is required. Local accounts and posts stay on the device and do not synchronize with website accounts.

The current native feature scope includes local registration/sign-in, a text-post feed, likes, saved-post flags, comments, and light/dark/system appearance. The remaining website features are listed in [FEATURE_PARITY.md](./FEATURE_PARITY.md); this is not yet a complete native replacement for every website capability.

## Build

Requirements: JDK 17, Android SDK Platform 36, Build Tools 36.1.0, and Gradle 8.13. The Android SDK is read from `ANDROID_HOME` or `ANDROID_SDK_ROOT`; if neither is set, configure the SDK location in `local.properties` (do not commit that file). An API 36 Android emulator is configured as `Pixel_3a_API_36_extension_level_17_x86_64`.

```powershell
cd android
.\gradlew.bat testDebugUnitTest assembleDebug assembleRelease bundleRelease
```

Debug artifacts are installable with the debug signing key. Release builds use the project-owned local signing key when `keystore.properties` exists; without it, Gradle produces unsigned release artifacts. Never commit or share the private key or `keystore.properties`. Back up the release key and its passwords securely: Google Play updates must continue to use the same signing identity.

The current release key is stored locally at `android/signing/gultepe-release.jks`, with ignored Gradle credentials in `android/keystore.properties`. Both files are excluded from Git. Back up these files and credentials securely before distributing the APK/AAB; losing the key may prevent future updates unless Play App Signing recovery is configured.

Debug outputs are written under `android/app/build/outputs/`. Feature coverage and validation limitations are documented in [FEATURE_PARITY.md](./FEATURE_PARITY.md).
