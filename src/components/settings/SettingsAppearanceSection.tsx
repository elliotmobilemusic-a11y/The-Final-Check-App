import type { LandingPage, ThemeMode } from '../../context/PreferencesContext';

interface ThemePreview {
  value: ThemeMode;
  accentClass: string;
}

interface SettingsAppearanceSectionProps {
  theme: ThemeMode;
  compactMode: boolean;
  reducedMotion: boolean;
  autoShowNav: boolean;
  defaultLandingPage: LandingPage;
  themeOptions: Array<{ value: ThemeMode; label: string; description: string; accentName: string; mood: string; bestFor: string }>;
  themePreviewClasses: ThemePreview[];
  landingPages: Array<{ value: LandingPage; label: string }>;
  onThemeChange: (value: ThemeMode) => void;
  onCompactModeChange: (value: boolean) => void;
  onReducedMotionChange: (value: boolean) => void;
  onAutoShowNavChange: (value: boolean) => void;
  onDefaultLandingPageChange: (value: LandingPage) => void;
}

export function SettingsAppearanceSection({
  theme,
  compactMode,
  reducedMotion,
  autoShowNav,
  defaultLandingPage,
  themeOptions,
  themePreviewClasses,
  landingPages,
  onThemeChange,
  onCompactModeChange,
  onReducedMotionChange,
  onAutoShowNavChange,
  onDefaultLandingPageChange
}: SettingsAppearanceSectionProps) {
  function prettyThemeName(value: ThemeMode) {
    const selectedTheme = themeOptions.find((option) => option.value === value);
    return selectedTheme?.label ?? value;
  }

  return (
    <>
      <section className="sub-panel">
        <div className="sub-panel-header">
          <h4>Visual themes</h4>
          <span className="soft-pill">Live preview</span>
        </div>

        <div className="settings-theme-grid">
          {themePreviewClasses.map((previewTheme) => {
            const option =
              themeOptions.find((item) => item.value === previewTheme.value) ??
              ({
                value: previewTheme.value,
                label: prettyThemeName(previewTheme.value),
                description: 'Available theme preset.',
                accentName: '',
                mood: 'Custom preset',
                bestFor: 'Available for workspace theming'
              } satisfies (typeof themeOptions)[number]);

            return (
              <button
                className={`settings-theme-card ${theme === option.value ? 'active' : ''}`}
                key={option.value}
                onClick={() => onThemeChange(option.value)}
                type="button"
              >
                <div className={`settings-theme-preview ${previewTheme.accentClass}`}>
                  <span className="settings-theme-preview-bar" />
                  <span className="settings-theme-preview-pane" />
                </div>
                <strong>{option.label}</strong>
                <p>{option.description}</p>
                <div className="settings-theme-card-meta">
                  <span>{option.mood}</span>
                  <small>{option.bestFor}</small>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="sub-panel">
        <div className="sub-panel-header">
          <h4>Behaviour and accessibility</h4>
          <span className="soft-pill">Device defaults</span>
        </div>

        <div className="settings-toggle-grid">
          <label className="settings-toggle-card">
            <div>
              <strong>Compact layout</strong>
              <p>Tighten spacing across panels and forms when you want more on screen.</p>
            </div>
            <input
              checked={compactMode}
              type="checkbox"
              onChange={(event) => onCompactModeChange(event.target.checked)}
            />
          </label>

          <label className="settings-toggle-card">
            <div>
              <strong>Reduced motion</strong>
              <p>Calm down transitions and movement across the workspace.</p>
            </div>
            <input
              checked={reducedMotion}
              type="checkbox"
              onChange={(event) => onReducedMotionChange(event.target.checked)}
            />
          </label>

          <label className="settings-toggle-card">
            <div>
              <strong>Auto-show navigation</strong>
              <p>Keep the top navigation responsive to scrolling and activity.</p>
            </div>
            <input
              checked={autoShowNav}
              type="checkbox"
              onChange={(event) => onAutoShowNavChange(event.target.checked)}
            />
          </label>

          <label className="field">
            <span>Default landing page</span>
            <select
              className="input"
              value={defaultLandingPage}
              onChange={(event) => onDefaultLandingPageChange(event.target.value as LandingPage)}
            >
              {landingPages.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
    </>
  );
}