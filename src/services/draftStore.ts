function hasWindow() {
  return typeof window !== 'undefined';
}

export function readDraft<T>(storageKey: string): T | null {
  if (!hasWindow()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeDraft<T>(storageKey: string, value: T) {
  if (!hasWindow()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function clearDraft(storageKey: string) {
  if (!hasWindow()) return;
  window.localStorage.removeItem(storageKey);
}
