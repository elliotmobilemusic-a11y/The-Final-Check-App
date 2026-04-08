import type { LocalToolRecord } from '../types';

function hasWindow() {
  return typeof window !== 'undefined';
}

function readRecords<T>(storageKey: string): LocalToolRecord<T>[] {
  if (!hasWindow()) return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    return (JSON.parse(raw) as LocalToolRecord<T>[]) ?? [];
  } catch {
    return [];
  }
}

function writeRecords<T>(storageKey: string, records: LocalToolRecord<T>[]) {
  if (!hasWindow()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(records));
}

export function listLocalToolRecords<T>(storageKey: string): LocalToolRecord<T>[] {
  return readRecords<T>(storageKey).sort((a, b) => {
    const aTime = new Date(a.updatedAt).getTime();
    const bTime = new Date(b.updatedAt).getTime();
    return bTime - aTime;
  });
}

export function getLocalToolRecord<T>(storageKey: string, id: string) {
  return readRecords<T>(storageKey).find((record) => record.id === id) ?? null;
}

export function saveLocalToolRecord<T>(
  storageKey: string,
  record: Omit<LocalToolRecord<T>, 'createdAt' | 'updatedAt'> & {
    createdAt?: string;
    updatedAt?: string;
  }
) {
  const records = readRecords<T>(storageKey);
  const now = new Date().toISOString();
  const nextRecord: LocalToolRecord<T> = {
    ...record,
    createdAt: record.createdAt ?? now,
    updatedAt: now
  };

  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    records[index] = nextRecord;
  } else {
    records.unshift(nextRecord);
  }

  writeRecords(storageKey, records);
  return nextRecord;
}

export function deleteLocalToolRecord(storageKey: string, id: string) {
  const records = readRecords(storageKey).filter((record) => record.id !== id);
  writeRecords(storageKey, records);
}
