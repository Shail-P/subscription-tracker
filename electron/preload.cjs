// Preload bridges the isolated React renderer to selected main-process actions.
// Expose narrow methods rather than giving React unrestricted ipcRenderer access.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAuth', {
  // invoke sends a request to main.cjs and returns a Promise for its result.
  openOAuth: (url) => ipcRenderer.invoke('auth:open-oauth', url),
  onCallback: (listener) => {
    // Forward only the callback URL, not Electron's internal event object.
    const handler = (_event, url) => listener(url)
    ipcRenderer.on('auth:callback', handler)
    // React's effect cleanup calls this to prevent duplicate callback listeners.
    return () => ipcRenderer.removeListener('auth:callback', handler)
  },
})

// React's custom TitleBar calls these methods as window.electronWindow.*.
// The matching ipcMain handlers in main.cjs control the requesting window.
contextBridge.exposeInMainWorld('electronWindow', {
  close: () => ipcRenderer.invoke('window:close'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
})
