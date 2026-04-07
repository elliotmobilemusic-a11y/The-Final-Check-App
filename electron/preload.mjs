import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktopAPI', {
  getInfo: () => ipcRenderer.invoke('desktop:get-info'),
  checkForUpdates: () => ipcRenderer.invoke('desktop:check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('desktop:install-update'),
  onUpdateStatus: (listener) => {
    const wrappedListener = (_event, payload) => {
      listener(payload);
    };

    ipcRenderer.on('desktop:update-status', wrappedListener);

    return () => {
      ipcRenderer.removeListener('desktop:update-status', wrappedListener);
    };
  }
});
