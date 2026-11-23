export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#e2e8f0',
      background: '#0b1120',
      padding: '24px',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: '800', marginBottom: '8px', color: '#38bdf8' }}>404</h1>
      <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Page Not Found</h2>
      <p style={{ color: '#94a3b8', maxWidth: '420px', marginBottom: '24px', fontSize: '14px' }}>
        The requested resource or page could not be found.
      </p>
      <a
        href="/"
        style={{
          padding: '10px 20px',
          background: '#0284c7',
          color: '#ffffff',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '600',
          fontSize: '14px',
        }}
      >
        Return to Dashboard
      </a>
    </div>
  );
}

