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
    // Always check both storage locations first
    const localStorage = getStorage(true);
    const sessionStorage = getStorage(false);
    
    const localValue = localStorage.getItem(key);
    if (localValue) return localValue;
    
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue) return sessionValue;
    
    return null;
  },
  setItem(key: string, value: string) {
    const remember = getRememberPreference();
    const primary = getStorage(remember);
    const secondary = getStorage(!remember);
    primary.setItem(key, value);
    secondary.removeItem(key);
  },
  removeItem(key: string) {
    getStorage(true).removeItem(key);
    getStorage(false).removeItem(key);
  }
};
