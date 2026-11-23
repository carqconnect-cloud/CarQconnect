"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Zap, Shield, Users, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { CarQLogo } from '../component/CarQLogo';
import { apiClient } from '@/lib/apiClient';

interface SuperAdminLoginPageProps {
  onSwitchToSignup?: () => void;
  onLoginSuccess?: () => void;
}

export default function SuperAdminLoginPage({
  onSwitchToSignup,
  onLoginSuccess,
}: SuperAdminLoginPageProps = {}) {
  const router = useRouter();
  const [email, setEmail] = useState('admin@connect.com');
  const [password, setPassword] = useState('Password123');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    // Ensure dark theme is active as originally styled
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('fioner_superadmin_theme', 'dark');
        localStorage.setItem('fioner-theme', 'dark');
      } catch {}
    }
    // If already authenticated and this is standalone /login, redirect
    if (!onLoginSuccess && typeof window !== 'undefined' && apiClient.getToken()) {
      router.replace('/#/dashboard');
    }
    // Clean up empty trailing hash or #/login from URL bar to keep it clean (e.g. http://localhost:3000)
    if (typeof window !== 'undefined' && (window.location.hash === '#' || window.location.hash === '#/' || window.location.hash === '#/login')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [router, onLoginSuccess]);

  const validateForm = () => {
    const errs: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errs.email = 'Administrator email address is required.';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmedEmail)) {
        errs.email = 'Please enter a valid email address (e.g. superadmin@fioner.com).';
      }
    }

    if (!password) {
      errs.password = 'Password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters.';
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errs = validateForm();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (errs.email) toast.error(errs.email);
      else if (errs.password) toast.error(errs.password);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.login(email.trim(), password);
      setLoading(false);
      try {
        localStorage.setItem('fioner_super_admin_registered', 'true');
      } catch {}

      const greeting = res.user?.firstName || 'Administrator';
      toast.success(`Welcome back, ${greeting}!`);

      // Forward to main dashboard
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.href = '/#/dashboard';
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Authentication failed. Please verify your credentials.';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex relative font-sans text-white">
      {/* Left Panel — Branding (Unified Dark Canvas) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-center p-8 lg:p-12 xl:p-16">
        {/* Ambient glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 left-16 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-24 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Header Branding */}
        <div className="absolute top-8 left-8 lg:top-12 lg:left-12 xl:left-16 z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/[0.06] backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10 p-2">
            <CarQLogo className="w-8 h-8" inverted={true} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-2xl tracking-tight">CarQConnect</span>
              <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">CarQConnect Control Center</p>
          </div>
        </div>

        {/* Center Hero Information */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Master control for<br />
              <span className="text-cyan-400">connected mobility</span><br />
              & platform security.
            </h1>
            <p className="mt-4 text-slate-400 text-sm leading-relaxed">
              Super Admin authority console for orchestrating vehicle telematics, QR Rakshak ecosystems, multi-tenant dealer networks, and emergency SOS dispatch.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: Shield, label: 'Root Authority', sub: 'Platform level governance' },
              { icon: Zap,    label: 'Live Telemetry', sub: 'Real time GPS & SOS' },
              { icon: Users,  label: 'Multi-Tenant',  sub: 'Dealer & role control' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-3.5 hover:bg-white/[0.07] transition-all">
                <Icon size={20} className="text-cyan-400 mb-2" />
                <p className="text-white text-xs font-semibold">{label}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Auth Form (High-contrast Dark Theme) */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 sm:px-12 lg:px-16 sm:py-12 bg-[#070b14] text-white overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6 sm:space-y-7">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 p-1.5 flex items-center justify-center shadow-sm">
              <CarQLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">CarQConnect</span>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-zinc-400">Fioner Control Center</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Sign In</h2>
            <p className="text-zinc-400 mt-1.5 text-sm">
              Enter platform administrator credentials to access the Control Center.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-start gap-2.5">
                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Administrator Work Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                }}
                onBlur={() => {
                  const errs = validateForm();
                  if (errs.email) setFieldErrors(prev => ({ ...prev, email: errs.email }));
                }}
                placeholder="admin@connect.com"
                className={`auth-input ${fieldErrors.email ? 'has-error' : ''}`}
              />
              {fieldErrors.email && (
                <p className="text-red-500 text-xs mt-1 animate-in fade-in">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Password <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  onBlur={() => {
                    const errs = validateForm();
                    if (errs.password) setFieldErrors(prev => ({ ...prev, password: errs.password }));
                  }}
                  placeholder="Min. 8 characters"
                  className={`auth-input pr-12 ${fieldErrors.password ? 'has-error' : ''}`}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPass(p => !p);
                  }}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="btn-eye text-zinc-400 hover:text-white"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-500 text-xs mt-1 animate-in fade-in">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember Me & Note */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600 bg-zinc-800 border-zinc-700"
                />
                <span className="text-zinc-400">Remember session</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In to Control Center</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
