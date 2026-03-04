"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center px-4">
      <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 p-4 mb-6 shadow-lg shadow-indigo-500/30">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">You&apos;re offline</h1>
      <p className="text-zinc-400 text-sm max-w-xs">
        It looks like you lost your internet connection. Please check your network and try again.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="mt-8 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition shadow-lg shadow-indigo-500/20"
      >
        Try again
      </button>
    </div>
  );
}
