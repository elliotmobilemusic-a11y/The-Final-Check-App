import { useState } from 'react';
import type { LandingPage, ThemeMode } from '../../context/PreferencesContext';
import type { Session } from '@supabase/supabase-js';

interface SettingsProfileSectionProps {
  displayName: string;
  effectiveDisplayName: string;
  jobTitle: string;
  organisation: string;
  avatarUrl: string;
  avatarPreview: string;
  avatarPosition: { x: number; y: number; scale: number };
  session: Session | null;
  defaultLandingPage: LandingPage;
  compactMode: boolean;
  theme: ThemeMode;
  themeOptions: Array<{ value: ThemeMode; label: string; description: string; accentName: string; mood: string; bestFor: string }>;
  landingPages: Array<{ value: LandingPage; label: string }>;
  onDisplayNameChange: (value: string) => void;
  onJobTitleChange: (value: string) => void;
  onOrganisationChange: (value: string) => void;
  onAvatarUrlChange: (value: string) => void;
  onAvatarPreviewChange: (value: string) => void;
}

export function SettingsProfileSection({
  displayName,
  effectiveDisplayName,
  jobTitle,
  organisation,
  avatarUrl,
  avatarPreview,
  avatarPosition,
  session,
  defaultLandingPage,
  compactMode,
  theme,
  themeOptions,
  landingPages,
  onDisplayNameChange,
  onJobTitleChange,
  onOrganisationChange,
  onAvatarUrlChange,
  onAvatarPreviewChange
}: SettingsProfileSectionProps) {
  const currentAvatarSrc = avatarPreview || avatarUrl.trim();
  const currentTheme = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];

  return (
    <section className="sub-panel">
      <div className="sub-panel-header">
        <h4>Account profile</h4>
        <span className="soft-pill">Visible in the app shell</span>
      </div>

      <div className="form-grid two-columns">
        <label className="field">
          <span>Display name</span>
          <input
            className="input"
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Account email</span>
          <input className="input" disabled value={session?.user.email ?? ''} />
        </label>

        <label className="field">
          <span>Job title</span>
          <input
            className="input"
            placeholder="e.g. Auditor, Manager"
            value={jobTitle}
            onChange={(event) => onJobTitleChange(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Organisation</span>
          <input
            className="input"
            placeholder="Company name"
            value={organisation}
            onChange={(event) => onOrganisationChange(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Profile photo URL</span>
          <input
            className="input"
            placeholder="Or leave blank and upload a photo above"
            value={avatarUrl}
            onChange={(event) => onAvatarUrlChange(event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}