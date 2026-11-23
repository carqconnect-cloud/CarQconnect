"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  Headphones,
  CalendarCheck,
  LifeBuoy,
  Settings,
  LogOut,
  TrendingUp,
  ListChecks,
  Filter,
  Target,
  Megaphone,
  Bot,
  Zap,
  AlertTriangle,
  Shield,
  BookOpen,
  User,
  ChevronUp,
  X,
} from 'lucide-react';
import { useRole, Role } from './RoleContext';
import { useAuth } from '../AuthContext';
import CarQLogo from '../CarQLogo';

const getRoleColor = (role: Role) => {
  switch (role) {
    case 'ADMIN': return 'from-indigo-500 to-purple-500';
    case 'TEAM_HEAD': return 'from-blue-500 to-cyan-500';
    case 'EXECUTIVE': return 'from-emerald-500 to-teal-500';
    default: return 'from-indigo-500 to-purple-500';
  }
};

const Sidebar = () => {
  const { role, activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen } = useRole();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const nameParts = (user?.name || 'User').split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase();
  const profileColor = getRoleColor(role);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getMenuItems = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Leads', icon: Target },
          { name: 'Customers', icon: Users },

          { name: 'AI Calling', icon: Bot },
          { name: 'AI Config & Guardrails', icon: Zap },
          { name: 'AI Escalations', icon: AlertTriangle },
          { name: 'Call Workspace', icon: PhoneCall },
          { name: 'Support', icon: LifeBuoy },
          { name: 'Follow-ups', icon: CalendarCheck },
          { name: 'Team Management', icon: Shield },
          { name: 'CRM Report', icon: Settings },
        ];
      case 'TEAM_HEAD':
        return [
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Lead Assignment', icon: ListChecks },
          { name: 'Customers', icon: Users },

          { name: 'AI Calling', icon: Bot },
          { name: 'AI Escalation Queue', icon: AlertTriangle },
          { name: 'AI Config', icon: BookOpen },
          { name: 'Call Workspace', icon: PhoneCall },
          { name: 'Support', icon: LifeBuoy },
          { name: 'Follow-ups', icon: CalendarCheck },
          { name: 'Team Performance', icon: TrendingUp },
        ];
      case 'EXECUTIVE':
        return [
          { name: 'Dashboard', icon: LayoutDashboard },
          { name: 'Leads', icon: Filter },
          { name: 'Customers', icon: Users },

          { name: 'AI Calling Hand-offs', icon: Bot },
          { name: 'Live Escalations', icon: AlertTriangle },
          { name: 'Call Workspace', icon: PhoneCall },
          { name: 'Follow-ups', icon: CalendarCheck },
          { name: 'Support', icon: LifeBuoy },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col h-screen hidden md:flex transition-all duration-300 shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-zinc-800 border border-blue-100 dark:border-zinc-700 p-1 flex items-center justify-center shadow-sm">
              <CarQLogo className="w-7 h-7" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight">CarQConnect</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 [&::-webkit-scrollbar]:hidden">
          <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Main Menu
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;

            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50'
                  }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-zinc-400'} />
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Profile section at bottom */}
        <div className="border-t border-gray-200 dark:border-zinc-800 p-3 relative" ref={profileRef}>
          {/* Profile Dropdown — pops upward */}
          {profileOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">
              <div className="py-1">
                <button
                  onClick={() => { setActiveTab('Profile'); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  <User size={15} className="text-gray-400 dark:text-zinc-500" />
                  My Profile
                </button>
                <button
                  onClick={() => { setActiveTab('Profile'); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  <Settings size={15} className="text-gray-400 dark:text-zinc-500" />
                  Settings
                </button>
              </div>
              <div className="border-t border-gray-100 dark:border-zinc-700 py-1">
                <button
                  onClick={() => { logout(); setProfileOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Profile trigger button */}
          <button
            onClick={() => setProfileOpen(prev => !prev)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors group"
          >
            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${profileColor} flex items-center justify-center text-white font-bold shadow-sm shrink-0`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{user?.title || 'User'}</p>
            </div>
            <ChevronUp size={16} className={`text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col z-50 border-r border-gray-200 dark:border-zinc-800 animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-zinc-800 border border-blue-100 dark:border-zinc-700 p-1 flex items-center justify-center shadow-sm">
                  <CarQLogo className="w-7 h-7" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight">CarQConnect</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 [&::-webkit-scrollbar]:hidden">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Main Menu
              </div>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActiveTab(item.name);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-zinc-400'} />
                    {item.name}
                  </button>
                );
              })}
            </div>

            {/* Profile Section in Mobile Drawer */}
            <div className="border-t border-gray-200 dark:border-zinc-800 p-3 bg-gray-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${profileColor} flex items-center justify-center text-white font-bold shadow-sm shrink-0`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{user?.title || role}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-zinc-800">
                <button
                  onClick={() => {
                    setActiveTab('Profile');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg text-gray-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50"
                >
                  <User size={14} />
                  Profile
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 hover:bg-red-100/50"
                >
                  <LogOut size={14} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
