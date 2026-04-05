import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

export type ThemeMode = 'sandstone' | 'coastal' | 'cedar' | 'sunrise' | 'midnight';
export type LandingPage = '/dashboard' | '/clients' | '/audit' | '/menu' | '/settings';
export type ThemeOption = {
  value: ThemeMode;
  label: string;
  description: string;
  accentName: string;
  mood: string;
  bestFor: string;
};

export type AppPreferences = {
  displayName: string;
  avatarUrl: string;
  theme: ThemeMode;
  defaultLandingPage: LandingPage;
  compactMode: boolean;
  reducedMotion: boolean;
};

type PreferencesContextValue = {
  preferences: AppPreferences;
  updatePreferences: (updates: Partial<AppPreferences>) => void;
  resetDevicePreferences: () => void;
};

const STORAGE_KEY = 'the-final-check-preferences-v1';

const defaultPreferences: AppPreferences = {
  displayName: '',
  avatarUrl: '',
  theme: 'sandstone',
  defaultLandingPage: '/dashboard',
  compactMode: false,
  reducedMotion: false
};

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: defaultPreferences,
  updatePreferences: () => undefined,
  resetDevicePreferences: () => undefined
});

function hasWindow() {
  return typeof window !== 'undefined';
}

function readStoredPreferences(): Partial<AppPreferences> {
  if (!hasWindow()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function persistPreferences(preferences: AppPreferences) {
  if (!hasWindow()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function PreferencesProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [preferences, setPreferences] = useState<AppPreferences>(() => ({
    ...defaultPreferences,
    ...readStoredPreferences()
  }));

  useEffect(() => {
    persistPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!hasWindow()) return;

    const body = window.document.body;
    body.dataset.theme = preferences.theme;
    body.classList.toggle('compact-mode', preferences.compactMode);
    body.classList.toggle('reduced-motion', preferences.reducedMotion);
  }, [preferences]);

  useEffect(() => {
    const metadata = session?.user.user_metadata ?? {};
    const metadataDisplayName =
      typeof metadata.display_name === 'string' ? metadata.display_name.trim() : '';
    const metadataAvatarUrl =
      typeof metadata.avatar_url === 'string' ? metadata.avatar_url.trim() : '';

    if (!metadataDisplayName && !metadataAvatarUrl) return;

    setPreferences((current) => {
      const next = {
        ...current,
        displayName: current.displayName || metadataDisplayName,
        avatarUrl: current.avatarUrl || metadataAvatarUrl
      };

      if (
        next.displayName === current.displayName &&
        next.avatarUrl === current.avatarUrl
      ) {
        return current;
      }

      return next;
    });
  }, [session?.user.id, session?.user.user_metadata]);

  const updatePreferences = useCallback((updates: Partial<AppPreferences>) => {
    setPreferences((current) => ({
      ...current,
      ...updates
    }));
  }, []);

  const resetDevicePreferences = useCallback(() => {
    setPreferences((current) => ({
      ...defaultPreferences,
      displayName: current.displayName,
      avatarUrl: current.avatarUrl
    }));
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      updatePreferences,
      resetDevicePreferences
    }),
    [preferences, resetDevicePreferences, updatePreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  return useContext(PreferencesContext);
}

export const themeOptions: ThemeOption[] = [
  {
    value: 'sandstone',
    label: 'Sandstone',
    description: 'Warm, executive, and understated for everyday client and reporting work.',
    accentName: 'Brushed gold',
    mood: 'Calm consultancy',
    bestFor: 'Best for balanced daily operations'
  },
  {
    value: 'coastal',
    label: 'Coastal',
    description: 'Cooler, cleaner surfaces with a sharper analytical feel.',
    accentName: 'Atlantic blue',
    mood: 'Clean planning',
    bestFor: 'Best for longer strategy and admin sessions'
  },
  {
    value: 'cedar',
    label: 'Cedar',
    description: 'Grounded green-led surfaces with a stronger operational tone.',
    accentName: 'Olive cedar',
    mood: 'Operational control',
    bestFor: 'Best for audits, checklists, and site work'
  },
  {
    value: 'sunrise',
    label: 'Sunrise',
    description: 'A brighter premium palette with softer warmth and lighter panels.',
    accentName: 'Copper amber',
    mood: 'Light editorial',
    bestFor: 'Best for presenting reports and client-ready work'
  },
  {
    value: 'midnight',
    label: 'Dark mode',
    description: 'A lower-glare dark workspace with tighter contrast for focused work.',
    accentName: 'Bronzed brass',
    mood: 'Focused after-hours',
    bestFor: 'Best for low-light and dense working sessions'
  }
];
