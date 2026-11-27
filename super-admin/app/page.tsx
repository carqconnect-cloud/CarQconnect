'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { initAdminApp } from '@/lib/adminApp';
import SuperAdminLoginPage from './login/page';
import SuperAdminSignupPage from './signup/page';
import { CarQLogo } from './component/CarQLogo';

export default function Page() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    // Check initial authentication state
    const token = apiClient.getToken();
    setIsAuthenticated(!!token);

    // Sync screen from URL hash if user navigated to #/signup or #/login
    const handleHash = () => {
      const h = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
      if (h === 'signup') {
        setAuthScreen('signup');
      } else {
        setAuthScreen('login');
        // Clean URL if it has a trailing # or #/ or #/login
        if (location.hash && (location.hash === '#' || location.hash === '#/' || location.hash === '#/login')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);

    // Listen for unauthorized / sign out events
    const unregister = apiClient.onUnauthorized(() => {
      setIsAuthenticated(false);
      setAuthScreen('login');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    });

    return () => {
      window.removeEventListener('hashchange', handleHash);
      unregister();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const cleanup = initAdminApp();
      return cleanup;
    }
  }, [isAuthenticated]);

  // Brief initial hydration check
  if (isAuthenticated === null) {
    return (
      <div id="splash">
        <div className="splash-mark">
          <CarQLogo variant="mark" className="w-12 h-12" />
        </div>
        <div className="splash-label">STARTING CARQCONNECT CONTROL…</div>
      </div>
    );
  }

  // Not authenticated: render Login or Signup page directly (CRM pattern)
  if (!isAuthenticated) {
    if (authScreen === 'signup') {
      return (
        <SuperAdminSignupPage
          onSwitchToLogin={() => {
            setAuthScreen('login');
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }}
        />
      );
    }

    return (
      <SuperAdminLoginPage
        onSwitchToSignup={() => {
          setAuthScreen('signup');
          location.hash = '#/signup';
        }}
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          location.hash = '#/dashboard';
        }}
      />
    );
  }

  // Authenticated: render Super Admin Control Center dashboard
  return (
    <>
      <div id="splash" style={{ display: 'none' }}>
        <div className="splash-mark">
          <CarQLogo variant="mark" className="w-12 h-12" />
        </div>
        <div className="splash-label">STARTING CARQCONNECT CONTROL…</div>
      </div>

      <div id="app">
        <aside className="sidebar" id="sidebar">
          <div className="brand">
            <div className="brand-text flex-1 min-w-0">
              <CarQLogo variant="wordmark" className="h-[22px] w-auto mb-1" />
              <span>SUPER ADMIN</span>
            </div>
            <button
              type="button"
              className="sidebar-close-btn"
              data-action="close-sidebar"
              aria-label="Close navigation"
            >
              ✕
            </button>
          </div>
          <nav className="nav" id="nav"></nav>
        </aside>
        <div className="sidebar-backdrop" id="sidebar-backdrop" data-action="close-sidebar"></div>
        <div className="main">
          <header className="topbar">
            <button className="icon-btn hamburger" data-action="toggle-sidebar" aria-label="Toggle navigation" title="Menu">
              <svg className="icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.2 5.5h13.6M3.2 10h13.6M3.2 14.5h13.6" />
              </svg>
            </button>
            <div className="topbar-title-wrap">
              <div className="topbar-title" id="page-title">
                Dashboard
              </div>
            </div>
            <div className="search-wrap">
              <span className="search-glass">⌕</span>
              <input className="search-input" placeholder="Search anything..." aria-label="Search" />
              <span className="search-kbd">⌘K</span>
            </div>
            <div className="topbar-actions">
              <div
                className="icon-btn"
                id="notif-btn"
                data-action="toggle-notif"
                style={{ position: 'relative' }}
              ></div>
              <div className="icon-btn" data-action="toggle-theme" id="theme-btn"></div>
              <div className="profile-btn" data-action="toggle-profile">
                <div className="avatar">AK</div>
                <div style={{ display: 'none' }} id="profile-text">
                  <div className="profile-name">Aditi Kapoor</div>
                  <div className="profile-role">Super Admin</div>
                </div>
              </div>
            </div>
          </header>
          <div id="progressbar"></div>
          <main className="content" id="view"></main>
        </div>
      </div>

      <div id="drawer-root"></div>
      <div id="modal-root"></div>
      <div id="toast-root"></div>
    </>
  );
}
