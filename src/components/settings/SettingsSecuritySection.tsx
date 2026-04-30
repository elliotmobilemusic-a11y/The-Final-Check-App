import type { PushDeviceStatus } from '../../services/pushNotifications';

interface SettingsSecuritySectionProps {
  rememberMe: boolean;
  newPassword: string;
  confirmPassword: string;
  enquiryAlertsEnabled: boolean;
  pushStatus: PushDeviceStatus;
  pushBusy: boolean;
  onRememberMeChange: (value: boolean) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleEnquiryAlerts: (enabled: boolean) => void;
  onEnablePush: () => void;
  onDisablePush: () => void;
  onSendTestPush: () => void;
}

export function SettingsSecuritySection({
  rememberMe,
  newPassword,
  confirmPassword,
  enquiryAlertsEnabled,
  onRememberMeChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleEnquiryAlerts
}: SettingsSecuritySectionProps) {
  return (
    <>
      <section className="sub-panel">
        <div className="sub-panel-header">
          <h4>Sign-in persistence</h4>
          <span className="soft-pill">Current device</span>
        </div>

        <div className="settings-toggle-grid">
          <label className="settings-toggle-card">
            <div>
              <strong>Remember me on this device</strong>
              <p>Keep your session in local storage so you stay signed in between visits.</p>
            </div>
            <input
              checked={rememberMe}
              type="checkbox"
              onChange={(event) => onRememberMeChange(event.target.checked)}
            />
          </label>
        </div>
      </section>

      <section className="sub-panel">
        <div className="sub-panel-header">
          <h4>Password update</h4>
          <span className="soft-pill">Optional</span>
        </div>

        <div className="form-grid two-columns">
          <label className="field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              className="input"
              type="password"
              value={newPassword}
              onChange={(event) => onNewPasswordChange(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="sub-panel">
        <div className="sub-panel-header">
          <h4>Enquiry alerts</h4>
          <span className="soft-pill">
            {enquiryAlertsEnabled ? 'Enabled on this device' : 'Disabled on this device'}
          </span>
        </div>

        <div className="settings-toggle-grid">
          <label className="settings-toggle-card">
            <div>
              <strong>New enquiry notifications</strong>
              <p>
                Alert this signed-in device when a new client enquiry form creates a new prospect. On the Android app this uses local device notifications.
              </p>
            </div>
            <input
              checked={enquiryAlertsEnabled}
              type="checkbox"
              onChange={(event) => {
                onToggleEnquiryAlerts(event.target.checked);
              }}
            />
          </label>
        </div>

        <p className="muted-copy">
          This works in the installed APK without changing the desktop layout. Full background push later would need Firebase setup, but device alerts work now while the app is installed and signed in.
        </p>
      </section>
    </>
  );
}
