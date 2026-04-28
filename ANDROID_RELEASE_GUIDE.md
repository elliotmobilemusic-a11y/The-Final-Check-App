# The Final Check Android Release Guide

## ✅ Pre-Release Configuration Complete

✅ **Package ID**: `uk.thefinalcheck.portal` (correct)
✅ **App Name**: The Final Check (correct)
✅ **Production URL**: `https://portal.thefinalcheck.uk` (correct, no localhost)
✅ **Version Code**: 3 (incremented)
✅ **Version Name**: 1.0.0
✅ **Debugging**: WebContentsDebugging disabled in production
✅ **Permissions**: Only INTERNET permission required
✅ **Signing Config**: Secure Gradle setup with local properties
✅ **Git Safety**: Keystore files are excluded from git

---

## 🔑 Step 1: Generate Release Keystore

Run this command in the root project folder to create your signing keystore:

```bash
keytool -genkey -v -keystore release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release
```

You will be prompted to:
1. Create a keystore password (store this securely)
2. Enter organization details
3. Create a key password (can be same as keystore password)

👉 **IMPORTANT**: Save these passwords in a secure password manager (1Password, LastPass etc.).
👉 **DO NOT COMMIT `release-keystore.jks` TO GIT** - it is automatically ignored.

---

## ⚙️ Step 2: Configure Signing Properties

1. Copy the example file:
   ```bash
   cp android/keystore.properties.example android/keystore.properties
   ```

2. Edit `android/keystore.properties` and enter your actual keystore details:
   ```properties
   storeFile=../release-keystore.jks
   storePassword=your_actual_keystore_password
   keyAlias=release
   keyPassword=your_actual_key_password
   ```

👉 `keystore.properties` is also automatically excluded from git.

---

## 📦 Step 3: Build Release Artifacts

### Build Signed Release APK (for testing)
```bash
npm run android:build:release
```
**Output path**: `android/app/build/outputs/apk/release/app-release.apk`

### Build Android App Bundle (for Google Play Store)
```bash
npm run android:build:bundle
```
**Output path**: `android/app/build/outputs/bundle/release/app-release.aab`

---

## ✅ Google Play Ready Checklist

✅ App ID: `uk.thefinalcheck.portal` (correct)
✅ No localhost URLs present
✅ No debug flags enabled
✅ WebContentsDebugging disabled
✅ Version code incremented (3)
✅ Correct production URL configured
✅ App signing is configured
✅ APK and AAB are properly signed
✅ Only required permissions are requested

---

## 📋 Google Play Console Upload Steps

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your application
3. Go to **Production > Releases > Create new release**
4. Upload the `app-release.aab` file
5. Fill in release notes
6. Complete required information:
   - App title & description
   - Screenshots & feature graphic
   - Content rating
   - Target audience
   - Privacy policy URL
7. Submit for review

---

## 🔄 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run cap:sync` | Sync web assets to Android project |
| `npm run android:open` | Open project in Android Studio |
| `npm run android:build:debug` | Build debug APK |
| `npm run android:build:release` | Build signed release APK |
| `npm run android:build:bundle` | Build signed AAB for Google Play |

---

## 🔒 Security Notes

- ✅ Keystore files are never committed to git
- ✅ Signing passwords are stored locally only
- ✅ No secrets or keys are hardcoded in source code
- ✅ Release builds have debugging disabled
- ✅ Cleartext HTTP is blocked