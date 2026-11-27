"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Zap,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CarQLogo } from '../component/CarQLogo';
import { apiClient } from '@/lib/apiClient';

interface SuperAdminSignupPageProps {
  onSwitchToLogin?: () => void;
}

export default function SuperAdminSignupPage({
  onSwitchToLogin,
}: SuperAdminSignupPageProps = {}) {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    securityKey: '',
    password: '',
    confirmPassword: '',
  });

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

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
    // If already authenticated and this is standalone /signup, redirect
    if (!onSwitchToLogin && typeof window !== 'undefined' && apiClient.getToken()) {
      router.replace('/#/dashboard');
    }
  }, [router, onSwitchToLogin]);

  const validate = () => {
    const e: Record<string, string> = {};

    // First Name
    const trimmedFirst = form.firstName.trim();
    if (!trimmedFirst) {
      e.firstName = 'First name is required.';
    } else if (trimmedFirst.length < 2) {
      e.firstName = 'First name must be at least 2 characters.';
    }

    // Last Name
    const trimmedLast = form.lastName.trim();
    if (!trimmedLast) {
      e.lastName = 'Last name is required.';
    }

    // Email
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail) {
      e.email = 'Administrator work email is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      e.email = 'Please enter a valid work email address (e.g. admin@fioner.com).';
    }

    // Phone (optional, but validate format if entered)
    const trimmedPhone = form.phone.trim();
    if (trimmedPhone) {
      const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');
      if (!/^(\+?[1-9]\d{9,14}|\d{10})$/.test(cleanPhone)) {
        e.phone = 'Please enter a valid phone number (e.g. +91 9876543210).';
      }
    }

    // Master Security Passcode
    const trimmedKey = form.securityKey.trim();
    if (!trimmedKey) {
      e.securityKey = 'Master Security Passcode / Secret Key is required.';
    }

    // Password
    if (!form.password) {
      e.password = 'Password is required.';
    } else if (form.password.length < 8) {
      e.password = 'Password must be at least 8 characters.';
    } else if (!/[a-z]/.test(form.password)) {
      e.password = 'Password must contain at least one lowercase letter (a-z).';
    } else if (!/[A-Z]/.test(form.password)) {
      e.password = 'Password must contain at least one uppercase letter (A-Z).';
    } else if (!/\d/.test(form.password)) {
      e.password = 'Password must contain at least one number (0-9).';
    }

    // Confirm Password
    if (!form.confirmPassword) {
      e.confirmPassword = 'Confirm password is required.';
    } else if (form.confirmPassword !== form.password) {
      e.confirmPassword = 'Passwords do not match.';
    }

    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const firstErr = Object.values(errs)[0];
      toast.error(firstErr);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.adminRegister({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        confirmPassword: form.confirmPassword,
        securityKey: form.securityKey.trim(),
      });

      setLoading(false);
      try {
        localStorage.setItem('fioner_super_admin_registered', 'true');
      } catch {}

      setDone(true);
      toast.success(res.message || 'Super Admin registered successfully!');
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Registration failed. Please check your information and security key.';
      setGlobalError(msg);
      toast.error(msg);
    }
  };

  const setField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // SUCCESS SCREEN (CRM Reference Style)
  if (done) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center px-6 relative font-sans text-white">
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={44} className="text-emerald-500" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">
              Super Admin Registered!
            </h2>
            <p className="text-zinc-400 mt-2 text-sm leading-relaxed">
              Your platform master administrator account has been successfully initialized. You can now sign in with <span className="font-semibold text-zinc-200">{form.email}</span>.
            </p>
          </div>

          <button
            onClick={() => {
              if (onSwitchToLogin) {
                onSwitchToLogin();
              } else {
                router.push('/login');
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] flex relative font-sans text-white">
      {/* Left Branding Panel (Unified Dark Canvas) */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-col justify-center p-8 lg:p-12 xl:p-14">
        {/* Ambient glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-24 right-10 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl" />
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
        <div className="absolute top-8 left-8 lg:top-12 lg:left-12 xl:left-14 z-10 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <CarQLogo variant="wordmark" inverted={true} className="h-7 w-auto" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              Root Setup
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">Primary Authority Registration</p>
        </div>

        {/* Hero Copy */}
        <div className="relative z-10 space-y-5 max-w-sm">
          <div>
            <h1 className="text-3xl font-bold text-white leading-snug">
              Initialize<br />
              <span className="text-emerald-400">Super Admin</span><br />
              authority.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mt-3">
              Configure the root administrator identity. Super Admin privileges govern telemetry streams, QR code minting, GPS trackers, and sub-admin delegation.
            </p>
          </div>

          <div className="space-y-2.5">
            {[
              {
                icon: ShieldCheck,
                label: 'Master Authority',
                desc: 'Unrestricted control across all CRM tenants & dealer groups.',
              },
              {
                icon: KeyRound,
                label: 'Cryptographic Security',
                desc: 'Protected by deployment master security key verification.',
              },
              {
                icon: Zap,
                label: 'Fleet & SOS Telemetry',
                desc: 'Full access to vehicle sensors, batch QR, and emergency alerts.',
              },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-start gap-3 bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl p-3.5 hover:bg-white/[0.07] transition-all"
              >
                <Icon size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold">{label}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Registration Form (High-contrast Dark Theme) */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 sm:px-12 lg:px-14 sm:py-12 bg-[#070b14] text-white overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-6 mt-2 lg:mt-0">
          {/* Mobile Logo */}
          <div className="lg:hidden space-y-1">
            <div className="flex items-center gap-2">
              <CarQLogo variant="wordmark" inverted={true} className="h-6 w-auto" />
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-zinc-400">Master Registration</p>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Create Account</h2>
            <p className="text-zinc-400 mt-1 text-sm">
              Register primary platform administrator credentials.
            </p>
          </div>

          {globalError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-start gap-2.5">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span className="leading-snug">{globalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* First & Last Name Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setField('firstName', e.target.value)}
                  placeholder="e.g. Alexander"
                  className={`auth-input ${errors.firstName ? 'has-error' : ''}`}
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setField('lastName', e.target.value)}
                  placeholder="e.g. Vance"
                  className={`auth-input ${errors.lastName ? 'has-error' : ''}`}
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Work Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="superadmin@fioner.com"
                className={`auth-input ${errors.email ? 'has-error' : ''}`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Phone Number <span className="text-zinc-500 text-[11px] font-normal lowercase">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className={`auth-input ${errors.phone ? 'has-error' : ''}`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Master Security Passcode */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Master Security Passcode / Secret Key <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={form.securityKey}
                  onChange={e => setField('securityKey', e.target.value)}
                  placeholder="Enter secret key (e.g. FIONER@SUPERADMIN#2026)"
                  className={`auth-input pr-12 font-mono ${errors.securityKey ? 'has-error' : ''}`}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowKey(p => !p);
                  }}
                  aria-label={showKey ? 'Hide passcode' : 'Show passcode'}
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
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400">
                Authorization key issued for primary platform super administrator registration.
              </p>
              {errors.securityKey && <p className="text-red-500 text-xs mt-1">{errors.securityKey}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`auth-input pr-12 ${errors.password ? 'has-error' : ''}`}
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
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}

              {/* Password Requirements Checklist (Matching CRM style) */}
              {form.password && (
                <div className="mt-2 p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        form.password.length >= 8 ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {form.password.length >= 8 ? '✓' : '•'}
                    </span>
                    <span className={form.password.length >= 8 ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        /[A-Z]/.test(form.password) ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {/[A-Z]/.test(form.password) ? '✓' : '•'}
                    </span>
                    <span className={/[A-Z]/.test(form.password) ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                      Uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        /[a-z]/.test(form.password) ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {/[a-z]/.test(form.password) ? '✓' : '•'}
                    </span>
                    <span className={/[a-z]/.test(form.password) ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                      Lowercase letter (a-z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        /\d/.test(form.password) ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {/\d/.test(form.password) ? '✓' : '•'}
                    </span>
                    <span className={/\d/.test(form.password) ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                      At least one number (0-9)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => setField('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  className={`auth-input pr-12 ${errors.confirmPassword ? 'has-error' : ''}`}
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowConfirm(p => !p);
                  }}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
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
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering Account…</span>
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Create Super Admin Account</span>
                </>
              )}
            </button>
          </form>

          {/* Switch to Login Link */}
          <div className="pt-2 text-center text-sm text-zinc-400 border-t border-zinc-800">
            Already registered?{' '}
            {onSwitchToLogin ? (
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer bg-transparent border-none p-0 inline"
              >
                Sign In to Control Center
              </button>
            ) : (
              <Link
                href="/login"
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                Sign In to Control Center
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
