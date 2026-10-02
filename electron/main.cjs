// Electron's main process owns the desktop window and OS features.
// React runs separately in the renderer; it reaches this file through preload/IPC.
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const http = require('node:http')
const path = require('node:path')

// Must match LoginPage's redirectTo URL and Supabase's allowed redirect URL.
const AUTH_CALLBACK_URL = 'http://127.0.0.1:57432/auth/callback'
let mainWindow
let authServer

function stopAuthServer() {
  if (!authServer) return
  authServer.close()
  authServer = undefined
}

function startAuthServer() {
  // Replace any listener left over from an earlier sign-in attempt.
  stopAuthServer()

  authServer = http.createServer((request, response) => {
    // HTTP requests contain a relative path; rebuild the full callback URL,
    // including the ?code=... query parameter returned by Supabase's PKCE flow.
    const callbackUrl = new URL(request.url || '/', AUTH_CALLBACK_URL)

    if (callbackUrl.pathname !== '/auth/callback') {
      response.writeHead(404)
      response.end('Not found')
      return
    }

    // This browser page confirms receipt of the redirect. The React renderer
    // still needs to exchange the code for a session before login is complete.
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

    // Send the full URL through preload to LoginPage, which extracts the code
    // and calls Supabase's exchangeCodeForSession. Then return focus to the app.
    mainWindow?.webContents.send('auth:callback', callbackUrl.toString())
    mainWindow?.show()
    mainWindow?.focus()
    stopAuthServer()
  })

  // Listen only on this computer's loopback interface, not the local network.
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
    // Reveal the window after its first painted frame, avoiding a blank flash.
    show: false,
    // Hide the native title bar; the React TitleBar supplies window controls.
    frame: false,
    webPreferences: {
      // Preload exposes selected desktop actions. React gets neither direct
      // Node.js access nor the preload's isolated JavaScript environment.
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Packaged apps use the built frontend; development uses Vite's fixed port.
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }
}

function windowForEvent(event) {
  // Apply a window action to the renderer that requested it.
  return BrowserWindow.fromWebContents(event.sender)
}

// Match the channels invoked by window.electronWindow in preload.cjs.
ipcMain.handle('window:close', (event) => windowForEvent(event)?.close())
ipcMain.handle('window:minimize', (event) => windowForEvent(event)?.minimize())
ipcMain.handle('window:toggle-maximize', (event) => {
  const window = windowForEvent(event)
  if (!window) return
  window.isMaximized() ? window.unmaximize() : window.maximize()
})

ipcMain.handle('auth:open-oauth', async (_event, authUrl) => {
  const parsedUrl = new URL(authUrl)
  // Allow Supabase hosts and loopback for local authentication. This checks the
  // host family, not an exact Supabase project; non-loopback URLs require HTTPS.
  const isAllowedHost = parsedUrl.hostname.endsWith('.supabase.co') || parsedUrl.hostname === '127.0.0.1'

  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== '127.0.0.1') {
    throw new Error('Only secure OAuth URLs can be opened.')
  }

  if (!isAllowedHost) {
    throw new Error('The OAuth URL is not from the configured authentication provider.')
  }

  // Start listening before opening the system browser so the redirect is caught.
  startAuthServer()
  await shell.openExternal(authUrl)
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    // On macOS, clicking the Dock icon reopens a window if all were closed.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopAuthServer()
  // macOS normally keeps the app alive after its final window closes.
  if (process.platform !== 'darwin') app.quit()
})
