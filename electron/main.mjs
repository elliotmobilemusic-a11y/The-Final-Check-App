import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
const rendererIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {import('../src/lib/desktop').DesktopUpdateStatus} */
let updateStatus = {
  state: 'idle',
  message: 'Desktop app ready.'
};

function hasUpdateConfiguration() {
  return app.isPackaged && existsSync(updateConfigPath);
}

function sendUpdateStatus(status) {
  updateStatus = status;
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('desktop:update-status', status);
}

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1240,
    minHeight: 760,
    autoHideMenuBar: true,
    title: 'The Final Check',
    backgroundColor: '#0f151c',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    window.loadURL(devServerUrl);
  } else {
    window.loadFile(rendererIndexPath);
  }

  return window;
}

function configureAutoUpdates() {
  if (!hasUpdateConfiguration()) {
    sendUpdateStatus({
      state: 'unavailable',
      message:
        'Auto-updates are not configured for this build yet. Publish desktop releases to enable them.'
    });
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({
      state: 'checking',
      message: 'Checking for desktop updates...'
    });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      state: 'available',
      message: `Version ${info.version ?? 'new'} is available and ready to download.`,
      updateInfo: info
    });

    void autoUpdater.downloadUpdate();
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({
      state: 'not-available',
      message: `You are already on the latest desktop version${info.version ? ` (${info.version})` : ''}.`,
      updateInfo: info
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      state: 'progress',
      message: `Downloading update${progress.percent ? ` (${Math.round(progress.percent)}%)` : ''}...`,
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      state: 'downloaded',
      message: `Version ${info.version ?? 'new'} is ready to install. Restart the app to apply it.`,
      updateInfo: info
    });
  });

  autoUpdater.on('error', (error) => {
    sendUpdateStatus({
      state: 'error',
      message: error?.message || 'Desktop update check failed.'
    });
  });
}

ipcMain.handle('desktop:get-info', () => ({
  isDesktop: true,
  isPackaged: app.isPackaged,
  platform: process.platform,
  version: app.getVersion(),
  canCheckForUpdates: hasUpdateConfiguration(),
  updateConfigured: hasUpdateConfiguration()
}));

ipcMain.handle('desktop:check-for-updates', async () => {
  if (!hasUpdateConfiguration()) {
    const status = {
      state: 'unavailable',
      message:
        'Auto-updates are not configured for this build yet. Publish desktop releases to enable them.'
    };
    sendUpdateStatus(status);
    return status;
  }

  await autoUpdater.checkForUpdates();
  return updateStatus;
});

ipcMain.handle('desktop:install-update', async () => {
  if (updateStatus.state === 'downloaded') {
    autoUpdater.quitAndInstall();
  }
});

app.whenReady().then(() => {
  mainWindow = createMainWindow();
  configureAutoUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
