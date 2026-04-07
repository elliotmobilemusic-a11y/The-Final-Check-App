/// <reference types="vite/client" />

type DesktopAppInfo = {
  isDesktop: boolean;
  isPackaged: boolean;
  platform: string;
  version: string;
  canCheckForUpdates: boolean;
  updateConfigured: boolean;
};

type DesktopUpdateStatus =
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

interface Window {
  desktopAPI?: {
    getInfo: () => Promise<DesktopAppInfo>;
    checkForUpdates: () => Promise<DesktopUpdateStatus>;
    installUpdate: () => Promise<void>;
    onUpdateStatus: (listener: (status: DesktopUpdateStatus) => void) => () => void;
  };
}
