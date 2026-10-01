// Electron hides the native frame, so this component supplies the window controls.
// app-drag makes the header draggable; app-no-drag keeps the buttons clickable.
export function TitleBar() {
  return (
    <header className="app-drag fixed inset-x-0 top-0 z-50 flex h-10 items-center border-b border-white/10 bg-[#0f1115] px-3">
      {/* These preload methods send requests to the main process, which owns the window. */}
      <div
        className="app-no-drag flex items-center gap-2"
        role="group"
        aria-label="Window controls"
      >
        <button
          className="window-control group bg-[#ff5f57]"
          type="button"
          onClick={() => window.electronWindow.close()}
          aria-label="Close window"
        >
          <svg
            className="size-2.5 opacity-0 transition-opacity group-hover:opacity-70"
            viewBox="0 0 10 10"
            stroke="#4d0000"
            strokeWidth="1.5"
          >
            <path d="m2 2 6 6M8 2 2 8" />
          </svg>
        </button>
        <button
          className="window-control group bg-[#febc2e]"
          type="button"
          onClick={() => window.electronWindow.minimize()}
          aria-label="Minimize window"
        >
          <svg
            className="size-2.5 opacity-0 transition-opacity group-hover:opacity-70"
            viewBox="0 0 10 10"
            stroke="#7a4b00"
            strokeWidth="1.5"
          >
            <path d="M2 5h6" />
          </svg>
        </button>
        <button
          className="window-control group bg-[#28c840]"
          type="button"
          onClick={() => window.electronWindow.toggleMaximize()}
          aria-label="Maximize window"
        >
          <svg
            className="size-2.5 opacity-0 transition-opacity group-hover:opacity-70"
            viewBox="0 0 10 10"
            fill="#075b16"
          >
            <path d="M2 5.5 5.5 2H2v3.5ZM8 4.5 4.5 8H8V4.5Z" />
          </svg>
        </button>
      </div>
      <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xs font-medium text-[#8e918f]">
        SubTrack
      </p>
    </header>
  );
}
