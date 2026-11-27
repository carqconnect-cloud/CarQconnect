"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, UserPlus, CheckCircle2, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../ThemeContext';
import CarQLogo from '../CarQLogo';
import { getApiBaseUrl } from '../../utils/apiBase';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

const ROLES = [
  { value: 'ADMIN',     label: 'Administrator',   desc: 'Full access to all modules and reports.' },
  { value: 'TEAM_HEAD', label: 'Team Head',        desc: 'Manage team, assign leads and monitor performance.' },
  { value: 'EXECUTIVE', label: 'Sales Executive',  desc: 'Handle leads, customers and follow-ups.' },
];

const SignupPage = ({ onSwitchToLogin }: SignupPageProps) => {
  const { theme, toggleTheme } = useTheme();
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '', password: '', confirm: '' });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);
  const [errors, setErrors]           = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    
    // Email validation
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail) {
      e.email = 'Email address is required.';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      e.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    // Phone validation
    const trimmedPhone = form.phone.trim();
    const cleanPhone = trimmedPhone.replace(/[\s\-\(\)]/g, '');
    if (!trimmedPhone) {
      e.phone = 'Phone number is required.';
    } else if (!/^(\+?[1-9]\d{9,14}|\d{10})$/.test(cleanPhone)) {
      e.phone = 'Please enter a valid 10-digit mobile number or international format (e.g. +91 9876543210).';
    }

    // Role validation
    if (!form.role) e.role = 'Please select a role.';

    // Password validation
    if (!form.password) {
      e.password = 'Password is required.';
    } else if (form.password.length < 8) {
      e.password = 'Password must be at least 8 characters.';
    } else if (!/[a-z]/.test(form.password)) {
      e.password = 'Password must contain at least one lowercase letter.';
    } else if (!/[A-Z]/.test(form.password)) {
      e.password = 'Password must contain at least one uppercase letter.';
    } else if (!/\d/.test(form.password)) {
      e.password = 'Password must contain at least one number.';
    }

    // Confirm password validation
    if (!form.confirm) {
      e.confirm = 'Please confirm your password.';
    } else if (form.confirm !== form.password) {
      e.confirm = 'Passwords do not match.';
    }

    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      const firstErr = Object.values(errs)[0];
      toast.error(firstErr);
      return;
    }
    setLoading(true);
    
    try {
      const nameParts = form.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ').trim() || firstName;

      const API_BASE = getApiBaseUrl();
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
          organizationName: `${firstName}'s Organization`,
          role: form.role
        })
      });
      
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setDone(true);
        toast.success('Account created! You can now log in.');
      } else {
        toast.error(data.message || data.error?.message || 'Registration failed');
      }
    } catch (err) {
      setLoading(false);
      toast.error('Network error. Please try again.');
    }
  };

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  if (done) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-6 relative">
        {/* Floating theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white backdrop-blur-sm transition-all"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Requested!</h2>
            <p className="text-gray-500 dark:text-zinc-400 mt-2 text-sm">
              Your account request has been submitted. An administrator will review and activate it shortly.
            </p>
          </div>
          <button
            onClick={onSwitchToLogin}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex relative">
      {/* Floating theme toggle */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white backdrop-blur-sm transition-all"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-5/12 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800" />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="absolute top-24 left-10 w-64 h-64 bg-white rounded-full blur-3xl opacity-5" />
        <div className="absolute bottom-24 right-10 w-80 h-80 bg-cyan-300 rounded-full blur-3xl opacity-10" />

        <div className="relative z-10 flex items-center">
          <CarQLogo variant="wordmark" inverted={true} className="h-8 w-auto" />
        </div>

        <div className="relative z-10 space-y-5">
          <h1 className="text-3xl font-bold text-white leading-snug">
            Join the<br />
            <span className="text-emerald-200">CarQConnect team</span><br />
            today.
          </h1>
          <p className="text-emerald-100 text-sm leading-relaxed max-w-xs">
            Create your account and get role-based access to leads, customers, and team performance tools.
          </p>

          <div className="space-y-2">
            {ROLES.map(r => (
              <div key={r.value} className="flex items-start gap-3 bg-white/10 border border-white/20 rounded-xl p-3">
                <CheckCircle2 size={16} className="text-emerald-300 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-xs font-semibold">{r.label}</p>
                  <p className="text-emerald-200 text-[10px] mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-emerald-200 text-xs">© 2026 CarQConnect. All rights reserved.</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-14 py-12 bg-white dark:bg-gray-950 overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-7 mt-8 lg:mt-0">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center">
            <CarQLogo variant="wordmark" className="h-7 w-auto" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create account</h2>
            <p className="text-gray-500 dark:text-zinc-400 mt-1 text-sm">Fill in your details to request access.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Full Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Jane Smith"
                className={`w-full bg-white dark:bg-zinc-900 border ${errors.name ? 'border-red-500/60' : 'border-gray-300 dark:border-zinc-800 focus:border-blue-500'} text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                onBlur={() => {
                  const errs = validate();
                  if (errs.email) setErrors(prev => ({ ...prev, email: errs.email }));
                }}
                placeholder="jane@company.com"
                className={`w-full bg-white dark:bg-zinc-900 border ${errors.email ? 'border-red-500/60' : 'border-gray-300 dark:border-zinc-800 focus:border-blue-500'} text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                onBlur={() => {
                  const errs = validate();
                  if (errs.phone) setErrors(prev => ({ ...prev, phone: errs.phone }));
                }}
                placeholder="+91 98765 43210"
                className={`w-full bg-white dark:bg-zinc-900 border ${errors.phone ? 'border-red-500/60' : 'border-gray-300 dark:border-zinc-800 focus:border-blue-500'} text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Select Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => set('role', r.value)}
                    className={`py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                      form.role === r.value
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-600 hover:text-gray-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {errors.role && <p className="text-red-400 text-xs mt-1">{errors.role}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  onBlur={() => {
                    const errs = validate();
                    if (errs.password) setErrors(prev => ({ ...prev, password: errs.password }));
                  }}
                  placeholder="Min. 8 characters with Uppercase, Lowercase & Number"
                  className={`w-full bg-white dark:bg-zinc-900 border ${errors.password ? 'border-red-500/60' : 'border-gray-300 dark:border-zinc-800 focus:border-blue-500'} text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              
              {/* Password Requirements Checklist */}
              {form.password && (
                <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      form.password.length >= 8 ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                    }`}>
                      {form.password.length >= 8 ? '✓' : '•'}
                    </span>
                    <span className={form.password.length >= 8 ? 'text-emerald-500 font-medium' : 'text-gray-500 dark:text-zinc-400'}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      /[A-Z]/.test(form.password) ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                    }`}>
                      {/[A-Z]/.test(form.password) ? '✓' : '•'}
                    </span>
                    <span className={/[A-Z]/.test(form.password) ? 'text-emerald-500 font-medium' : 'text-gray-500 dark:text-zinc-400'}>
                      Uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      /[a-z]/.test(form.password) ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                    }`}>
                      {/[a-z]/.test(form.password) ? '✓' : '•'}
                    </span>
                    <span className={/[a-z]/.test(form.password) ? 'text-emerald-500 font-medium' : 'text-gray-500 dark:text-zinc-400'}>
                      Lowercase letter (a-z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      /\d/.test(form.password) ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                    }`}>
                      {/\d/.test(form.password) ? '✓' : '•'}
                    </span>
                    <span className={/\d/.test(form.password) ? 'text-emerald-500 font-medium' : 'text-gray-500 dark:text-zinc-400'}>
                      At least one number (0-9)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={e => set('confirm', e.target.value)}
                  onBlur={() => {
                    if (form.confirm && form.confirm !== form.password) {
                      setErrors(prev => ({ ...prev, confirm: 'Passwords do not match.' }));
                    }
                  }}
                  placeholder="Repeat your password"
                  className={`w-full bg-white dark:bg-zinc-900 border ${errors.confirm ? 'border-red-500/60' : 'border-gray-300 dark:border-zinc-800 focus:border-blue-500'} text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><UserPlus size={18} /> Create Account</>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-zinc-500">
            Already have an account?{' '}
            <button onClick={onSwitchToLogin} className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 font-medium transition-colors">
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
