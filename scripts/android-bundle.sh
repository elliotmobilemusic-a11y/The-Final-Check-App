#!/bin/bash
# Builds a signed release AAB for Google Play.
# Run from the project root: npm run android:build:bundle
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

JAVA_HOME_AS="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
GRADLE_CACHE="/tmp/tfcapp-gradle-cache"
AAB_SRC="/tmp/tfcapp-build/app/outputs/bundle/release/app-release.aab"
AAB_DEST="$PROJECT_ROOT/android/release/app-release.aab"

echo "→ Removing stale Android web-asset cache..."
rm -rf "$PROJECT_ROOT/android/app/src/main/assets/public"

echo "→ Building release bundle..."
export JAVA_HOME="$JAVA_HOME_AS"

cd "$PROJECT_ROOT/android"
./gradlew bundleRelease \
  --no-daemon \
  --project-cache-dir "$GRADLE_CACHE"

echo "→ Copying AAB to android/release/..."
mkdir -p "$PROJECT_ROOT/android/release"
cp "$AAB_SRC" "$AAB_DEST"

echo ""
echo "Build complete."
echo "AAB: android/release/app-release.aab ($(du -sh "$AAB_DEST" | cut -f1))"
echo "Upload this file to Google Play Console → Production → Create new release."
