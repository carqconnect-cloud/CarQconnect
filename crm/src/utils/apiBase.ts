/**
 * Resolves the backend API base URL cleanly for both local and live environments.
 * Handles single URLs, comma-separated lists (e.g. "liveUrl, localUrl"),
 * and port corrections (mapping frontend :3000 to backend :4000).
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.')
  );

  if (raw && raw.trim()) {
    // Handle comma-separated format if provided: "https://live-url.com, http://localhost:4000"
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      if (isLocalhost) {
        // In local environment, pick the localhost or local IP URL
        const localPart = parts.find(
          (p) =>
            p.includes('localhost') ||
            p.includes('127.0.0.1') ||
            p.includes('192.168.')
        );
        if (localPart) {
          // If port was mistakenly set to 3000 (frontend port), map to backend port 4000
          return localPart.replace(':3000', ':4000').replace(/\/+$/, '');
        }
      } else {
        // In live/production environment, pick the remote HTTPS URL
        const livePart = parts.find(
          (p) => !p.includes('localhost') && !p.includes('127.0.0.1')
        );
        if (livePart) {
          return livePart.replace(/\/+$/, '');
        }
      }
      // Fallback to the first entry if no match
      return parts[0].replace(/\/+$/, '');
    }

    let single = parts[0] || '';
    if (isLocalhost && single.includes('localhost:3000')) {
      single = single.replace(':3000', ':4000');
    }
    return single.replace(/\/+$/, '');
  }

  // Fallback defaults
  return 'https://carqconnect-backend.onrender.com';
}
