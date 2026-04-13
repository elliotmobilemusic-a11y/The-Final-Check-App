import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile } from '../services/profiles';
import { useAuth } from './AuthContext';

export type ThemeMode = 'sandstone' | 'coastal' | 'cedar' | 'sunrise' | 'midnight';
export type LandingPage =
  | '/dashboard'
  | '/clients'
  | '/audit'
  | '/menu'
  | '/settings/profile';
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
  avatarPosition: { x: number; y: number; scale: number };
  jobTitle: string;
  organisation: string;
  theme: ThemeMode;
  defaultLandingPage: LandingPage;
  compactMode: boolean;
  reducedMotion: boolean;
  autoShowNav: boolean;
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
  avatarPosition: { x: 50, y: 50, scale: 1 },
  jobTitle: '',
  organisation: '',
  theme: 'sandstone',
  defaultLandingPage: '/dashboard',
  compactMode: false,
  reducedMotion: false,
  autoShowNav: true
};

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: defaultPreferences,
  updatePreferences: () => undefined,
  resetDevicePreferences: () => undefined
});

function hasWindow() {
  return typeof window !== 'undefined';
}

function normalizeAvatarUrl(value?: string | null) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  return /^https?:\/\/.+\/storage\/v1\/object\/public\/avatars\//i.test(url) ? url : '';
}

function readStoredPreferences(): Partial<AppPreferences> {
  if (!hasWindow()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = (JSON.parse(raw) as Partial<AppPreferences>) ?? {};

    return {
      ...parsed,
      defaultLandingPage:
        String(parsed.defaultLandingPage ?? '') === '/settings'
          ? '/settings/profile'
          : parsed.defaultLandingPage
    };
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
      typeof metadata.avatar_url === 'string'
        ? normalizeAvatarUrl(metadata.avatar_url)
        : '';

    if (!metadataDisplayName && !metadataAvatarUrl) return;

    const metadataAvatarPosition = typeof metadata.avatar_position === 'object' 
      ? metadata.avatar_position 
      : { x: 50, y: 50, scale: 1 };

    setPreferences((current) => {
      const next = {
        ...current,
        displayName: current.displayName || metadataDisplayName,
        avatarUrl: current.avatarUrl || metadataAvatarUrl,
        avatarPosition: metadataAvatarPosition,
        jobTitle: current.jobTitle || (typeof metadata.job_title === 'string' ? metadata.job_title.trim() : ''),
        organisation: current.organisation || (typeof metadata.organisation === 'string' ? metadata.organisation.trim() : '')
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

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!session?.user.id) return;

      try {
        const profile = await getProfile(session.user.id);
        if (!profile || cancelled) return;

        setPreferences((current) => {
          const next = {
            ...current,
            displayName: profile.display_name?.trim() || current.displayName,
            avatarUrl: normalizeAvatarUrl(profile.avatar_url) || current.avatarUrl,
            avatarPosition:
              profile.avatar_position &&
              typeof profile.avatar_position.x === 'number' &&
              typeof profile.avatar_position.y === 'number' &&
              typeof profile.avatar_position.scale === 'number'
                ? {
                    x: profile.avatar_position.x,
                    y: profile.avatar_position.y,
                    scale: profile.avatar_position.scale
                  }
                : current.avatarPosition,
            jobTitle: profile.job_title?.trim() || current.jobTitle,
            organisation: profile.organisation?.trim() || current.organisation
          };

          return JSON.stringify(next) === JSON.stringify(current) ? current : next;
        });
      } catch {
        // Ignore profile hydration failures and keep the current local preferences.
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

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
    value: 'midnight',
    label: 'Dark mode',
    description: 'A lower-glare dark workspace with tighter contrast for focused work.',
    accentName: 'Bronzed brass',
    mood: 'Focused after-hours',
    bestFor: 'Best for low-light and dense working sessions'
  }
];
