const REMEMBER_ME_KEY = 'kitchen-platform-remember-me';

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

export const supabaseAuthStorage = {
  getItem(key: string) {
    const primary = getStorage(getRememberPreference());
    return primary.getItem(key);
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
