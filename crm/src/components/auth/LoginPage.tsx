"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Zap, Shield, Users, Sun, Moon } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import toast from 'react-hot-toast';
import CarQLogo from '../CarQLogo';

interface LoginPageProps {
  onSwitchToSignup?: () => void;
  onSwitchToForgot?: () => void;
}

const LoginPage = ({ onSwitchToSignup, onSwitchToForgot }: LoginPageProps) => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const errs: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errs.email = 'Email address is required.';
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmedEmail)) {
        errs.email = 'Please enter a valid email address (e.g. you@carqconnect.com).';
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
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Login failed.');
      toast.error(result.error || 'Invalid credentials');
    } else {
      toast.success('Welcome back!');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex relative">
      {/* Floating theme toggle */}
      <button
        onClick={toggleTheme}
        type="button"
        aria-label="Toggle theme"
        className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white backdrop-blur-sm transition-all"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        {/* BG gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800" />
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

        {/* Content */}
        <div className="relative z-10">
          <CarQLogo variant="wordmark" inverted={true} className="h-8 w-auto" />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Manage your<br />
              <span className="text-blue-200">team & leads</span><br />
              smarter.
            </h1>
            <p className="mt-4 text-blue-100 text-base leading-relaxed max-w-sm">
              CarQConnect gives your team a unified workspace to assign leads, track performance, and close deals faster.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Zap,    label: 'AI Powered',    sub: 'Smart automation' },
              { icon: Users,  label: 'Team Ready',    sub: 'Role-based access' },
              { icon: Shield, label: 'Secure',        sub: 'Enterprise-grade'  },
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

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12 bg-white dark:bg-gray-950">
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center mb-2">
            <CarQLogo variant="wordmark" className="h-7 w-auto" />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
            <p className="text-gray-500 dark:text-zinc-400 mt-1 text-sm">Sign in to your account to continue.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Email
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
                placeholder="you@carqconnect.com"
                className={`w-full bg-white dark:bg-zinc-900 border ${
                  fieldErrors.email ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300 dark:border-zinc-800 focus:border-blue-500'
                } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
              />
              {fieldErrors.email && (
                <p className="text-red-500 text-xs mt-1 animate-in fade-in">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Password</label>
              <div className="relative">
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
                  className={`w-full bg-white dark:bg-zinc-900 border ${
                    fieldErrors.password ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-300 dark:border-zinc-800 focus:border-blue-500'
                  } text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-500 text-xs mt-1 animate-in fade-in">{fieldErrors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-blue-600 bg-gray-50 dark:bg-zinc-800 border-gray-300 dark:border-zinc-700" />
                <span className="text-sm text-gray-600 dark:text-zinc-400">Remember me</span>
              </label>
              {onSwitchToForgot && (
                <button 
                  type="button" 
                  onClick={onSwitchToForgot}
                  className="text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><LogIn size={18} /> Sign In</>
              )}
            </button>
          </form>

          {onSwitchToSignup && (
            <p className="text-center text-sm text-gray-500 dark:text-zinc-500">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Create Account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
