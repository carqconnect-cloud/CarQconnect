"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  KeyRound, 
  ArrowLeft, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Mail, 
  RotateCcw, 
  Sun, 
  Moon,
  Zap,
  Shield,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../ThemeContext';
import { getApiBaseUrl } from '../../utils/apiBase';
import CarQLogo from '../CarQLogo';

interface ForgetPasswordProps {
  onSwitchToLogin: () => void;
}

type Step = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export default function ForgetPassword({ onSwitchToLogin }: ForgetPasswordProps) {
  const { theme, toggleTheme } = useTheme();

  // Current Step
  const [step, setStep] = useState<Step>('EMAIL');

  // Form State
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status & Timing
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Input refs for 4-box OTP
  const otpInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const callApi = async (path: string, body: Record<string, any>) => {
    const primaryUrl = getApiBaseUrl();
    try {
      const res = await fetch(`${primaryUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Portal-Type': 'crm',
        },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (primaryErr) {
      // Fallback between localhost and Render
      const isLocal = primaryUrl.includes('localhost') || primaryUrl.includes('127.0.0.1');
      const fallbackUrl = isLocal ? 'https://fioner-h5r7.onrender.com' : 'http://localhost:4000';
      try {
        console.warn(`Primary auth URL (${primaryUrl}) failed. Trying fallback (${fallbackUrl})...`);
        const fallbackRes = await fetch(`${fallbackUrl}${path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Portal-Type': 'crm',
          },
          body: JSON.stringify(body),
        });
        return await fallbackRes.json();
      } catch {
        throw primaryErr;
      }
    }
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error('Please enter your email address');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const data = await callApi('/api/v1/auth/send-otp', {
        email: cleanEmail,
        type: 'reset',
        purpose: 'reset',
      });

      setLoading(false);
      if (data.success) {
        toast.success(`Verification code sent to ${cleanEmail}`);
        setStep('OTP');
        setCountdown(60);
        setCanResend(false);
        setOtpDigits(['', '', '', '']);
        setTimeout(() => otpInputRefs[0].current?.focus(), 150);
      } else {
        toast.error(data.error?.message || data.message || 'Failed to send verification code');
      }
    } catch {
      setLoading(false);
      toast.error('Could not reach authentication server. Please verify your connection.');
    }
  };

  // Step 2: Handle OTP Input (single digit, paste, backspace)
  const handleOtpChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = '';
      setOtpDigits(nextDigits);
      return;
    }

    if (cleaned.length === 1) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = cleaned;
      setOtpDigits(nextDigits);
      if (index < 3) {
        otpInputRefs[index + 1].current?.focus();
      }
    } else {
      // Pasted full code (e.g. 4 digits)
      const digits = cleaned.slice(0, 4).split('');
      const nextDigits = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 4) nextDigits[i] = d;
      });
      setOtpDigits(nextDigits);
      const targetIndex = Math.min(digits.length, 3);
      otpInputRefs[targetIndex].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('').trim();
    if (fullOtp.length < 4) {
      toast.error('Please enter the complete 4-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const data = await callApi('/api/v1/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: fullOtp,
      });

      setLoading(false);
      if (data.success) {
        toast.success('Code verified successfully!');
        setStep('NEW_PASSWORD');
      } else {
        toast.error(data.error?.message || data.message || 'Invalid or expired code');
      }
    } catch {
      setLoading(false);
      toast.error('Verification failed. Could not reach server.');
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      toast.error('Password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Password must include at least one uppercase letter (A-Z)');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast.error('Password must include at least one lowercase letter (a-z)');
      return;
    }
    if (!/\d/.test(newPassword)) {
      toast.error('Password must include at least one number (0-9)');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await callApi('/api/v1/auth/reset-password', {
        email: email.trim().toLowerCase(),
        newPassword,
      });

      setLoading(false);
      if (data.success) {
        toast.success('Password updated successfully!');
        setStep('SUCCESS');
      } else {
        toast.error(data.error?.message || data.message || 'Failed to update password');
      }
    } catch {
      setLoading(false);
      toast.error('Failed to update password. Could not reach server.');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex relative">
      {/* Floating theme toggle */}
      <button
        onClick={toggleTheme}
        type="button"
        aria-label="Toggle theme"
        className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white backdrop-blur-sm transition-all shadow-sm"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Left Panel — Branding & Security */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-800 to-purple-900" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl opacity-10" />
          <div className="absolute bottom-32 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl opacity-15" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-300 rounded-full blur-3xl opacity-10" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/30 p-2">
            <CarQLogo className="w-8 h-8" inverted={true} />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">CarQConnect</span>
        </div>

        {/* Value Proposition */}
        <div className="relative z-10 space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-200 text-xs font-medium mb-4 backdrop-blur-sm">
              <ShieldCheck size={14} className="text-blue-300" />
              <span>Two-Factor Account Recovery</span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Reset your password<br />
              <span className="text-blue-200">safely & securely.</span>
            </h1>
            <p className="mt-4 text-blue-100 text-base leading-relaxed max-w-sm">
              Verify your identity via email OTP to regain access to your leads, deals, and team workspace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Zap, label: 'Instant OTP', sub: 'Sent directly to email' },
              { icon: Shield, label: 'Encrypted', sub: 'Bcrypt hashed storage' },
              { icon: Users, label: 'Role Ready', sub: 'Admin & Team members' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
                <Icon size={20} className="text-blue-200 mb-1.5" />
                <p className="text-white text-xs font-semibold">{label}</p>
                <p className="text-blue-200 text-[10px]">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-200 text-xs">© 2026 CarQConnect. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel — Interactive Recovery Flow */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 bg-white dark:bg-gray-950">
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Mobile Brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-zinc-800 border border-blue-100 dark:border-zinc-700 p-1 flex items-center justify-center">
              <CarQLogo className="w-7 h-7" />
            </div>
            <span className="text-gray-900 dark:text-white font-bold text-lg">CarQConnect</span>
          </div>

          {/* STEP 1: EMAIL INPUT */}
          {step === 'EMAIL' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors mb-4"
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
                  <KeyRound size={24} />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Forgot password?</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1.5 text-sm">
                  No worries! Enter your registered account email and we will send you a 4-digit verification code.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      autoFocus
                      required
                      className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 pl-11 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    />
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 pointer-events-none" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: OTP INPUT */}
          {step === 'OTP' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <button
                  type="button"
                  onClick={() => setStep('EMAIL')}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors mb-4"
                >
                  <ArrowLeft size={16} /> Change email address
                </button>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Verify code</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1.5 text-sm">
                  We sent a 4-digit OTP to <strong className="text-gray-800 dark:text-zinc-200">{email}</strong>. Please enter it below.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* 4 Box OTP Input */}
                <div className="flex justify-center items-center gap-3">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpInputRefs[idx]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-14 h-16 text-center text-2xl font-bold text-gray-900 dark:text-white bg-white dark:bg-zinc-900 border-2 border-gray-300 dark:border-zinc-800 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-zinc-400">
                    {countdown > 0 ? (
                      `Resend code in ${countdown}s`
                    ) : (
                      'Didn\'t receive the code?'
                    )}
                  </span>
                  <button
                    type="button"
                    disabled={!canResend || loading}
                    onClick={() => handleSendOtp()}
                    className={`font-semibold flex items-center gap-1.5 transition-colors ${
                      canResend && !loading
                        ? 'text-blue-600 dark:text-blue-400 hover:underline cursor-pointer'
                        : 'text-gray-400 dark:text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw size={12} /> Resend OTP
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpDigits.join('').length < 4}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify Code'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: SET NEW PASSWORD */}
          {step === 'NEW_PASSWORD' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
                  <KeyRound size={24} />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Create new password</h2>
                <p className="text-gray-500 dark:text-zinc-400 mt-1.5 text-sm">
                  Your identity has been verified. Choose a strong, new password for your account.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoFocus
                      required
                      className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      required
                      className="w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password Strength Checklist */}
                {newPassword && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        newPassword.length >= 8 ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                      }`}>
                        {newPassword.length >= 8 ? '✓' : '•'}
                      </span>
                      <span className={newPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-500 dark:text-zinc-400'}>
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        /[A-Z]/.test(newPassword) ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                      }`}>
                        {/[A-Z]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/[A-Z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-500 dark:text-zinc-400'}>
                        Uppercase letter (A-Z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        /[a-z]/.test(newPassword) ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                      }`}>
                        {/[a-z]/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/[a-z]/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-500 dark:text-zinc-400'}>
                        Lowercase letter (a-z)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        /\d/.test(newPassword) ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                      }`}>
                        {/\d/.test(newPassword) ? '✓' : '•'}
                      </span>
                      <span className={/\d/.test(newPassword) ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-500 dark:text-zinc-400'}>
                        At least one number (0-9)
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-300 py-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 size={44} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Password Updated!</h2>
                <p className="text-gray-500 dark:text-zinc-400 text-sm max-w-sm mx-auto">
                  Your password has been reset successfully. You can now log into CarQConnect with your new credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={onSwitchToLogin}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                Proceed to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
