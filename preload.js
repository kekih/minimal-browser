const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  navigate: (url) => ipcRenderer.invoke('navigate', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getUrl: () => ipcRenderer.invoke('get-url'),
  settingsOpened: () => ipcRenderer.invoke('settings-opened'),
  settingsClosed: () => ipcRenderer.invoke('settings-closed'),
  onUrlChanged: (callback) => ipcRenderer.on('url-changed', (e, url) => callback(url)),
  onTitleChanged: (callback) => ipcRenderer.on('title-changed', (e, title) => callback(title)),
  onLoading: (callback) => ipcRenderer.on('loading', (e, isLoading) => callback(isLoading)),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', () => callback())
});
