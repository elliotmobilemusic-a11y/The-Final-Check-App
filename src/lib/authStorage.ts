const REMEMBER_ME_KEY = 'kitchen-platform-remember-me';
const AUTH_RESET_NOTICE_KEY = 'the-final-check-auth-reset-notice';

function hasWindow() {
  return typeof window !== 'undefined';
}

function getStorage(remember: boolean) {
  if (!hasWindow()) {
    return {
      getItem: (_key: string) => null,
      setItem: (_key: string, _value: string) => undefined,
      removeItem: (_key: string) => undefined
    };
  }
  return remember ? window.localStorage : window.sessionStorage;
}

export function getRememberPreference() {
  if (!hasWindow()) return true;
  const saved = window.localStorage.getItem(REMEMBER_ME_KEY);
  return saved === null ? true : saved === 'true';
}

export function setRememberPreference(remember: boolean) {
  if (!hasWindow()) return;
  window.localStorage.setItem(REMEMBER_ME_KEY, String(remember));
}

function eachBrowserStorage(callback: (storage: Storage) => void) {
  if (!hasWindow()) return;
  callback(window.localStorage);
  callback(window.sessionStorage);
}

function isSupabaseAuthKey(key: string) {
  return /^sb-[a-z0-9_-]+-auth-token$/i.test(key) || key.includes('supabase.auth.token');
}

export function resetSupabaseAuthState(message?: string) {
  if (!hasWindow()) return;

  eachBrowserStorage((storage) => {
    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && isSupabaseAuthKey(key)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  });

  if (message) {
    window.sessionStorage.setItem(AUTH_RESET_NOTICE_KEY, message);
  }
}

export function consumeAuthResetNotice() {
  if (!hasWindow()) return '';
  const message = window.sessionStorage.getItem(AUTH_RESET_NOTICE_KEY) ?? '';
  if (message) {
    window.sessionStorage.removeItem(AUTH_RESET_NOTICE_KEY);
  }
  return message;
}

export const supabaseAuthStorage = {
  getItem(key: string) {
    // ✅ Only read from currently selected storage location
    // Never cross read or merge storage state - this was causing corrupted sessions
    const remember = getRememberPreference();
    const storage = getStorage(remember);
    
    const value = storage.getItem(key);
    
    if (value) {
      console.log(`🔐 Read auth from ${remember ? 'localStorage' : 'sessionStorage'}, length: ${value.length}`);
    }
    
    return value;
  },
  setItem(key: string, value: string) {
    const remember = getRememberPreference();
    const primary = getStorage(remember);
    const secondary = getStorage(!remember);
    
    console.log(`🔐 Writing auth to ${remember ? 'localStorage' : 'sessionStorage'}, length: ${value.length}`);
    
    primary.setItem(key, value);
    secondary.removeItem(key);
  },
  removeItem(key: string) {
    // Always clear from both locations to avoid stale state
    getStorage(true).removeItem(key);
    getStorage(false).removeItem(key);
  }
};