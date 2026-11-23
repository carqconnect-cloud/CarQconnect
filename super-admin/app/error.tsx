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
    console.error('Unhandled error in Super-Admin:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg, #0f172a)',
      color: 'var(--text, #f8fafc)',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: 'var(--surface, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#ef4444',
          fontSize: '24px',
        }}>
          ⚠️
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#f8fafc' }}>
          An error occurred in Super-Admin
        </h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
          {error.message || 'An unexpected runtime issue occurred. Please try reloading this section.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent, #3b82f6)',
              color: '#ffffff',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border, #334155)',
              background: 'transparent',
              color: '#94a3b8',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

