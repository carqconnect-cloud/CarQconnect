'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error in CRM console:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-800/80 p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-2xl text-red-400">
          ⚠️
        </div>
        <h2 className="mb-2 text-xl font-semibold text-white">
          CRM Application Error
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-400">
          {error.message || 'An unexpected error occurred while loading this view.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
          >
            Reload CRM
          </button>
        </div>
      </div>
    </div>
  );
}

