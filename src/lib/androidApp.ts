import { Capacitor } from '@capacitor/core';

export type AndroidAppInfo = {
  isNativeAndroid: boolean;
  platform: string;
};

export type AndroidReleaseManifest = {
  versionName: string;
  versionCode: number;
  channel: 'debug' | 'release';
  fileName: string;
  apkPath: string;
  apkSizeBytes?: number;
  publishedAt: string;
  notes?: string;
};

const fallbackAppInfo: AndroidAppInfo = {
  isNativeAndroid: false,
  platform: 'web'
};

export function isNativeAndroidApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function getAndroidAppInfo(): Promise<AndroidAppInfo> {
  if (!isNativeAndroidApp()) return fallbackAppInfo;
  return { isNativeAndroid: true, platform: 'android' };
}

export async function getLatestAndroidRelease(): Promise<AndroidReleaseManifest | null> {
  if (typeof window === 'undefined') return null;

  try {
    const response = await fetch('/android-app/latest.json', {
      cache: 'no-store',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const manifest = (await response.json()) as Partial<AndroidReleaseManifest>;
    if (!manifest.versionName || !manifest.versionCode || !manifest.apkPath || !manifest.fileName) {
      return null;
    }

    return {
      versionName: manifest.versionName,
      versionCode: manifest.versionCode,
      channel: manifest.channel === 'release' ? 'release' : 'debug',
      fileName: manifest.fileName,
      apkPath: manifest.apkPath,
      apkSizeBytes: manifest.apkSizeBytes,
      publishedAt: manifest.publishedAt ?? new Date(0).toISOString(),
      notes: manifest.notes
    };
  } catch {
    return null;
  }
}

export function getAndroidReleaseUrl(release: AndroidReleaseManifest) {
  if (typeof window === 'undefined') {
    return release.apkPath;
  }

  return new URL(release.apkPath, window.location.origin).toString();
}

export async function openAndroidReleaseDownload(release: AndroidReleaseManifest) {
  const url = getAndroidReleaseUrl(release);

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
