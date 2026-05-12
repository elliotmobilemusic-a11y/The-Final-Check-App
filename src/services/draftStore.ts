function hasWindow() {
  return typeof window !== 'undefined';
}

function resolveStorageKey(storageKey: string, userId?: string | null) {
  if (!userId) return storageKey;
  return `the-final-check:${userId}:${storageKey}`;
}

export function readDraft<T>(storageKey: string, userId?: string | null): T | null {
  if (!hasWindow()) return null;

  try {
    const raw = window.localStorage.getItem(resolveStorageKey(storageKey, userId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeDraft<T>(storageKey: string, value: T, userId?: string | null) {
  if (!hasWindow()) return;
  window.localStorage.setItem(resolveStorageKey(storageKey, userId), JSON.stringify(value));
}

export function clearDraft(storageKey: string, userId?: string | null) {
  if (!hasWindow()) return;
  window.localStorage.removeItem(resolveStorageKey(storageKey, userId));
}
