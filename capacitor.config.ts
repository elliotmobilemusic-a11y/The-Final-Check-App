import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uk.thefinalcheck.app',
  appName: 'The Final Check',
  webDir: 'dist',
  backgroundColor: '#10141b',
  server: {
    // Use the hosted production app because the current frontend depends on
    // same-origin server routes and production-auth/session behavior.
    url: 'https://portal.thefinalcheck.uk',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
    // Enforce https scheme for Web APIs (localStorage, cookies) on API 30+
    androidScheme: 'https',
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: '#10141b',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#10141b',
      overlaysWebView: false,
    },
  },
};

export default config;
