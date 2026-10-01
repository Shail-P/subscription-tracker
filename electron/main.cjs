const { app, BrowserWindow, ipcMain, shell } = require('electron')
const http = require('node:http')
const path = require('node:path')

const AUTH_CALLBACK_URL = 'http://127.0.0.1:57432/auth/callback'
let mainWindow
let authServer

function stopAuthServer() {
  if (!authServer) return
  authServer.close()
  authServer = undefined
}

function startAuthServer() {
  stopAuthServer()

  authServer = http.createServer((request, response) => {
    const callbackUrl = new URL(request.url || '/', AUTH_CALLBACK_URL)

    if (callbackUrl.pathname !== '/auth/callback') {
      response.writeHead(404)
      response.end('Not found')
      return
    }

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(`
      <!doctype html>
      <html lang="en">
        <head><meta charset="utf-8"><title>Signed in</title></head>
        <body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#020617;color:#fff;font:16px system-ui">
          <main style="text-align:center"><h1>Sign-in complete</h1><p>You can close this window and return to SubTrack.</p></main>
        </body>
      </html>
    `)

    mainWindow?.webContents.send('auth:callback', callbackUrl.toString())
    mainWindow?.show()
    mainWindow?.focus()
    stopAuthServer()
  })

  authServer.listen(57432, '127.0.0.1')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 360,
    minHeight: 520,
    title: 'Subscription Tracker',
    backgroundColor: '#0f1115',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }
}

function windowForEvent(event) {
  return BrowserWindow.fromWebContents(event.sender)
}

ipcMain.handle('window:close', (event) => windowForEvent(event)?.close())
ipcMain.handle('window:minimize', (event) => windowForEvent(event)?.minimize())
ipcMain.handle('window:toggle-maximize', (event) => {
  const window = windowForEvent(event)
  if (!window) return
  window.isMaximized() ? window.unmaximize() : window.maximize()
})

ipcMain.handle('auth:open-oauth', async (_event, authUrl) => {
  const parsedUrl = new URL(authUrl)
  const isAllowedHost = parsedUrl.hostname.endsWith('.supabase.co') || parsedUrl.hostname === '127.0.0.1'

  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== '127.0.0.1') {
    throw new Error('Only secure OAuth URLs can be opened.')
  }

  if (!isAllowedHost) {
    throw new Error('The OAuth URL is not from the configured authentication provider.')
  }

  startAuthServer()
  await shell.openExternal(authUrl)
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopAuthServer()
  if (process.platform !== 'darwin') app.quit()
})
