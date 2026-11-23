/**
 * Fioner Super Admin Real-Time WebSocket & Siren Gateway
 * ------------------------------------------------------------------
 * Connects to the backend Socket.IO server, listens for critical events
 * (live emergency SOS, orders, GPS telemetry), synthesizes audio sirens
 * using Web Audio API, and automatically mutates DB state and re-renders tables
 * without requiring manual browser refresh.
 */

import { apiClient } from './apiClient';
import { DB, showToast, refreshTable, escapeHtml, renderNav } from './adminShared';
import { mapSosFromApi } from '../app/component/Sos';

let socket: any = null;
let sirenOscillator: OscillatorNode | null = null;
let sirenGain: GainNode | null = null;
let sirenInterval: any = null;
let audioCtx: AudioContext | null = null;
let isSirenPlaying = false;
let fallbackPollTimer: any = null;

/**
 * Initializes browser Web Audio API synthesizer for the emergency siren.
 * Operates purely via software synthesis - zero external audio asset dependencies.
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playEmergencySiren() {
  if (isSirenPlaying) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    isSirenPlaying = true;
    sirenOscillator = ctx.createOscillator();
    sirenGain = ctx.createGain();

    sirenOscillator.type = 'sawtooth';
    sirenOscillator.frequency.setValueAtTime(800, ctx.currentTime);

    sirenGain.gain.setValueAtTime(0.3, ctx.currentTime);
    sirenOscillator.connect(sirenGain);
    sirenGain.connect(ctx.destination);
    sirenOscillator.start();

    // Wailing frequency modulation (850Hz <-> 550Hz)
    let high = true;
    sirenInterval = setInterval(() => {
      if (!sirenOscillator || !ctx) return;
      const targetFreq = high ? 550 : 850;
      sirenOscillator.frequency.exponentialRampToValueAtTime(targetFreq, ctx.currentTime + 0.35);
      high = !high;
    }, 400);
  } catch (err) {
    console.warn('Failed to start audio siren:', err);
  }
}

export function stopEmergencySiren() {
  if (!isSirenPlaying) return;
  isSirenPlaying = false;
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  try {
    if (sirenGain && audioCtx) {
      sirenGain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    }
    setTimeout(() => {
      if (sirenOscillator) {
        try { sirenOscillator.stop(); } catch (_) {}
        sirenOscillator.disconnect();
        sirenOscillator = null;
      }
      if (sirenGain) {
        sirenGain.disconnect();
        sirenGain = null;
      }
    }, 150);
  } catch (_) {}

  // Remove live banner if exists
  if (typeof document !== 'undefined') {
    const banner = document.getElementById('fioner-live-sos-banner');
    if (banner) banner.remove();
  }
}

/**
 * Renders an unmissable, pulsing red emergency distress beacon directly on the screen.
 */
function showLiveSosModal(sos: any) {
  if (typeof document === 'undefined') return;

  // Remove existing banner if any
  const existing = document.getElementById('fioner-live-sos-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'fioner-live-sos-banner';
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 999999;
    width: 92%;
    max-width: 650px;
    background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%);
    color: #ffffff;
    border: 2px solid #ef4444;
    border-radius: 14px;
    box-shadow: 0 20px 45px rgba(239, 68, 68, 0.45), 0 0 0 4px rgba(239, 68, 68, 0.2);
    padding: 18px 24px;
    font-family: inherit;
    animation: fionerSosPulse 1.2s infinite alternate ease-in-out;
  `;

  // Inject keyframe animation once
  if (!document.getElementById('fioner-sos-keyframes')) {
    const style = document.createElement('style');
    style.id = 'fioner-sos-keyframes';
    style.innerHTML = `
      @keyframes fionerSosPulse {
        0% { transform: translateX(-50%) scale(0.98); box-shadow: 0 0 15px rgba(239,68,68,0.5); }
        100% { transform: translateX(-50%) scale(1.02); box-shadow: 0 0 35px rgba(239,68,68,0.9); }
      }
    `;
    document.head.appendChild(style);
  }

  banner.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:28px;line-height:1;display:inline-block;animation:bounce 0.5s infinite alternate;">🚨</span>
        <div>
          <div style="font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#fecaca;">
            CRITICAL EMERGENCY DISTRESS
          </div>
          <h4 style="margin:2px 0 0;font-size:18px;font-weight:700;color:#fff;">
            SOS Triggered: ${escapeHtml(sos.userName || 'Vehicle Owner')}
          </h4>
        </div>
      </div>
      <button id="fioner-mute-sos-btn" style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;">
        🔇 Mute Siren
      </button>
    </div>

    <div style="margin-top:12px;padding:10px 14px;background:rgba(0,0,0,0.25);border-radius:8px;font-size:13px;line-height:1.5;">
      <div><strong>Vehicle:</strong> <span style="font-family:monospace;background:rgba(255,255,255,0.2);padding:2px 6px;border-radius:4px;">${escapeHtml(sos.vehicleReg || '—')}</span></div>
      <div style="margin-top:4px;"><strong>Location:</strong> ${escapeHtml(sos.address || `${sos.lat || sos.lastKnownLat || '22.7196'}, ${sos.lng || sos.lastKnownLng || '75.8577'}`)}</div>
      ${sos.phone ? `<div style="margin-top:4px;"><strong>Phone:</strong> <a href="tel:${escapeHtml(sos.phone)}" style="color:#fecaca;text-decoration:underline;">${escapeHtml(sos.phone)}</a></div>` : ''}
    </div>

    <div style="margin-top:14px;display:flex;align-items:center;justify-content:flex-end;gap:10px;">
      <button id="fioner-ack-sos-btn" style="background:#fff;color:#991b1b;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;">
        ✓ Acknowledge Distress
      </button>
      <button id="fioner-view-sos-btn" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;">
        Open Incident Room →
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  // Bind banner actions
  const muteBtn = document.getElementById('fioner-mute-sos-btn');
  if (muteBtn) {
    muteBtn.onclick = () => stopEmergencySiren();
  }

  const ackBtn = document.getElementById('fioner-ack-sos-btn');
  if (ackBtn) {
    ackBtn.onclick = async () => {
      stopEmergencySiren();
      try {
        await apiClient.patch(`/admin/sos/${encodeURIComponent(sos.id)}/status`, { status: 'ACKNOWLEDGED' });
        showToast('SOS Incident Acknowledged', 'success');
        refreshTable('admin-sos');
        refreshTable('sos');
        renderNav();
      } catch (e: any) {
        showToast(e?.message || 'Failed to acknowledge incident', 'danger');
      }
    };
  }

  const viewBtn = document.getElementById('fioner-view-sos-btn');
  if (viewBtn) {
    viewBtn.onclick = () => {
      stopEmergencySiren();
      if (typeof window !== 'undefined') {
        window.location.hash = '#/sos';
      }
    };
  }
}

/**
 * Dynamically loads the Socket.IO client library if not already present on window.
 */
async function loadSocketIo(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if ((window as any).io) return (window as any).io;

  return new Promise((resolve) => {
    const baseApi = apiClient.getBaseUrl();
    const socketUrl = baseApi.replace(/\/api\/v1\/?$/, '');

    // 1. Try backend server's built-in socket.io bundle
    const script = document.createElement('script');
    script.src = `${socketUrl}/socket.io/socket.io.js`;
    script.async = true;

    script.onload = () => {
      resolve((window as any).io || null);
    };

    script.onerror = () => {
      // 2. Fallback to CDN
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      cdnScript.async = true;
      cdnScript.onload = () => resolve((window as any).io || null);
      cdnScript.onerror = () => {
        console.warn('[SocketClient] Both local and CDN socket.io scripts failed to load. Will use fallback polling.');
        resolve(null);
      };
      document.head.appendChild(cdnScript);
    };

    document.head.appendChild(script);
  });
}

/**
 * Starts a background fallback polling mechanism in case WebSocket cannot be established.
 */
function startFallbackPolling() {
  if (fallbackPollTimer) return;
  fallbackPollTimer = setInterval(async () => {
    try {
      const token = apiClient.getToken();
      if (!token) return;
      const res: any = await apiClient.get('/admin/sos?status=PENDING&limit=3');
      const items = res?.data?.items || res?.data || res?.items || [];
      if (Array.isArray(items) && items.length > 0) {
        const pending = items[0];
        if (pending && (pending.status === 'PENDING' || pending.status === 'pending')) {
          if (!isSirenPlaying) {
            playEmergencySiren();
            showLiveSosModal(pending);
          }
        }
      }
    } catch (_) {}
  }, 8000);
}

/**
 * Disconnects socket and clears background timers.
 */
export function disconnectAdminSocket() {
  stopEmergencySiren();
  if (fallbackPollTimer) {
    clearInterval(fallbackPollTimer);
    fallbackPollTimer = null;
  }
  if (socket) {
    try {
      socket.disconnect();
    } catch (_) {}
    socket = null;
  }
}

/**
 * Connects and configures Socket.IO real-time events.
 */
export async function initAdminSocket() {
  if (typeof window === 'undefined') return;
  if (socket && socket.connected) return;

  const token = apiClient.getToken();
  if (!token) return;

  const ioConstructor = await loadSocketIo();
  if (!ioConstructor) {
    console.warn('[SuperAdmin Socket] Socket.IO library unavailable. Starting polling fallback.');
    startFallbackPolling();
    return;
  }

  // Resolve backend root origin (strip /api/v1)
  const baseApi = apiClient.getBaseUrl();
  const socketUrl = baseApi.replace(/\/api\/v1\/?$/, '');

  try {
    socket = ioConstructor(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      reconnectionDelay: 2500,
    });

    socket.on('connect', () => {
      console.log('[SuperAdmin Socket] Connected to real-time gateway:', socket?.id);
    });

    // 1. Live SOS Emergency Alert
    socket.on('sos:alert', (payload: any) => {
      console.warn('🚨 [CRITICAL LIVE SOS RECEIVED]:', payload);

      const mapped = mapSosFromApi(payload);
      if (!mapped) return;

      // Update or prepend to DB.sosEvents in-memory collection
      if (!DB.sosEvents) DB.sosEvents = [];
      const existingIdx = DB.sosEvents.findIndex((e: any) => e.id === mapped.id);
      if (existingIdx !== -1) {
        DB.sosEvents[existingIdx] = { ...DB.sosEvents[existingIdx], ...mapped };
      } else {
        DB.sosEvents.unshift(mapped);
      }

      // If PENDING, sound siren and present prominent emergency beacon
      if (mapped.status === 'pending' || payload.status === 'PENDING') {
        playEmergencySiren();
        showLiveSosModal(payload);
      } else if (mapped.status === 'resolved' || payload.status === 'RESOLVED') {
        stopEmergencySiren();
      }

      // Re-render SOS table without full page refresh
      refreshTable('admin-sos');
      refreshTable('sos');
      renderNav();
    });

    // 2. Real-time Order Status Updates
    socket.on('order:status_changed', (orderData: any) => {
      console.log('[Order Live Update]:', orderData);
      if (DB.orders && Array.isArray(DB.orders)) {
        const idx = DB.orders.findIndex((o: any) => o.id === orderData.id);
        if (idx !== -1) {
          DB.orders[idx].status = orderData.status;
          refreshTable('admin-orders');
        }
      }
    });

    // 3. Real-time GPS Fleet / Vehicle Telemetry update
    socket.on('gps:fleet_update', (telemetry: any) => {
      if (DB.gpsDevices && Array.isArray(DB.gpsDevices)) {
        const idx = DB.gpsDevices.findIndex(
          (d: any) => d.vehicleId === telemetry.vehicleId || d.imei === telemetry.imei,
        );
        if (idx !== -1) {
          DB.gpsDevices[idx] = {
            ...DB.gpsDevices[idx],
            lastLatitude: telemetry.lat,
            lastLongitude: telemetry.lng,
            speed: telemetry.speed,
            heading: telemetry.heading,
            lastPing: 'Just now',
          };
          refreshTable('admin-gps');
        }
      }
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[SuperAdmin Socket] Disconnected:', reason);
      startFallbackPolling();
    });
  } catch (err) {
    console.error('[SuperAdmin Socket] Failed to initialize:', err);
    startFallbackPolling();
  }
}
