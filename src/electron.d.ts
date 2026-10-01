// Mark this declaration file as a module so it can augment the global Window type.
export {}

// These types mirror the API exposed by electron/preload.cjs. They do not implement
// the methods: preload must expose each method, and main.cjs handles its IPC request.
declare global {
  interface Window {
    electronAuth: {
      // Request the main process to open OAuth in the system browser.
      openOAuth: (url: string) => Promise<void>
      // Subscribe to callback URLs; the returned function removes the listener.
      onCallback: (listener: (url: string) => void) => () => void
    }
    // Renderer-safe controls for Electron's frameless application window.
    electronWindow: {
      close: () => Promise<void>
      minimize: () => Promise<void>
      toggleMaximize: () => Promise<void>
    }
  }
}
