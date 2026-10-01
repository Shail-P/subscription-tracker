const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAuth', {
  openOAuth: (url) => ipcRenderer.invoke('auth:open-oauth', url),
  onCallback: (listener) => {
    const handler = (_event, url) => listener(url)
    ipcRenderer.on('auth:callback', handler)
    return () => ipcRenderer.removeListener('auth:callback', handler)
  },
})

contextBridge.exposeInMainWorld('electronWindow', {
  close: () => ipcRenderer.invoke('window:close'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
})
