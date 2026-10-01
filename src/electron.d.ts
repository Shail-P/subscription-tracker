export {}

declare global {
  interface Window {
    electronAuth: {
      openOAuth: (url: string) => Promise<void>
      onCallback: (listener: (url: string) => void) => () => void
    }
    electronWindow: {
      close: () => Promise<void>
      minimize: () => Promise<void>
      toggleMaximize: () => Promise<void>
    }
  }
}
