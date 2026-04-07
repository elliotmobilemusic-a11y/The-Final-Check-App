export type DesktopAppInfo = {
  isDesktop: boolean;
  isPackaged: boolean;
  platform: string;
  version: string;
  canCheckForUpdates: boolean;
  updateConfigured: boolean;
};

export type DesktopUpdateStatus =
  | {
      state: 'idle' | 'unavailable' | 'checking' | 'available' | 'not-available' | 'downloaded';
      message: string;
      updateInfo?: {
        version?: string;
        files?: Array<{ url?: string }>;
      } | null;
    }
  | {
      state: 'error';
      message: string;
    }
  | {
      state: 'progress';
      message: string;
      percent: number;
      bytesPerSecond?: number;
      transferred?: number;
      total?: number;
    };

const fallbackInfo: DesktopAppInfo = {
  isDesktop: false,
  isPackaged: false,
  platform: 'web',
  version: 'web',
  canCheckForUpdates: false,
  updateConfigured: false
};

function getDesktopApi() {
  return typeof window !== 'undefined' ? window.desktopAPI : undefined;
}

export function hasDesktopApi() {
  return typeof getDesktopApi() !== 'undefined';
}

export async function getDesktopAppInfo() {
  const desktopApi = getDesktopApi();
  if (!desktopApi) return fallbackInfo;
  return desktopApi.getInfo();
}

export async function checkForDesktopUpdates() {
  const desktopApi = getDesktopApi();
  if (!desktopApi) {
    return {
      state: 'unavailable',
      message: 'Desktop updates are only available inside the installed app.'
    } satisfies DesktopUpdateStatus;
  }

  return desktopApi.checkForUpdates();
}

export async function installDesktopUpdate() {
  const desktopApi = getDesktopApi();
  if (!desktopApi) return;
  await desktopApi.installUpdate();
}

export function subscribeToDesktopUpdates(listener: (status: DesktopUpdateStatus) => void) {
  const desktopApi = getDesktopApi();
  if (!desktopApi) return () => undefined;
  return desktopApi.onUpdateStatus(listener);
}
