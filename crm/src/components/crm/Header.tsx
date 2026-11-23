"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, User, Settings, LogOut, ChevronDown, Sun, Moon, X } from 'lucide-react';
import { useRole, Role } from './RoleContext';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import GlobalNotifications from './GlobalNotifications';
import { getApiBaseUrl } from '../../utils/apiBase';

const getRoleLabel = (role: Role) => {
  switch (role) {
    case 'ADMIN': return { name: 'John Doe', title: 'Administrator', initials: 'JD', color: 'from-indigo-500 to-purple-500' };
    case 'TEAM_HEAD': return { name: 'Sarah Jenkins', title: 'Team Head', initials: 'SJ', color: 'from-blue-500 to-cyan-500' };
    case 'EXECUTIVE': return { name: 'Mike Smith', title: 'Sales Executive', initials: 'MS', color: 'from-emerald-500 to-teal-500' };
  }
};

const Header = () => {
  const { role, setRole, activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen } = useRole();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { token } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  
  const [globalData, setGlobalData] = useState<any[]>([]);

  useEffect(() => {
    const fetchGlobalData = async () => {
      let aggregated: any[] = [];
      const API_BASE = getApiBaseUrl();
      try {
        const leadsRes = await fetch(`${API_BASE}/api/v1/crm/leads`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null);
        if (leadsRes && leadsRes.ok) {
          const lData = await leadsRes.json();
          const items = Array.isArray(lData.data) ? lData.data : Array.isArray(lData?.data?.items) ? lData.data.items : [];
          if (items.length > 0) {
            aggregated.push(...items.map((l: any) => ({
               id: `lead_${l.id}`,
               type: 'Lead',
               title: l.company || l.name || 'Unknown Lead',
               desc: `Status: ${l.status} - Email: ${l.email || 'N/A'}`
            })));
          }
        }
      } catch (e) { console.error('Leads fetch error', e); }

      try {
        const customersRes = await fetch(`${API_BASE}/api/v1/crm/customers`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null);
        if (customersRes && customersRes.ok) {
          const cData = await customersRes.json();
          if (cData && cData.data) {
            aggregated.push(...cData.data.map((c: any) => ({
               id: `cust_${c.id}`,
               type: 'Customer',
               title: c.company || c.name || 'Unknown Customer',
               desc: `Email: ${c.email || 'N/A'}`
            })));
          }
        }
      } catch (e) { console.error('Customers fetch error', e); }
      
      // Add searchable panels
      const panels = [
        'Dashboard', 'Leads', 'Customers', 'Campaigns', 'Support', 'Follow-ups',
        'Team Management', 'AI Calling', 'AI Escalations', 'AI Config & Guardrails',
        'Call Workspace', 'AI Escalation Queue', 'AI Config', 'Lead Assignment',
        'Team Performance', 'AI Calling Hand-offs', 'Live Escalations'
      ];
      
      panels.forEach((p, idx) => {
        aggregated.push({
           id: `panel_${idx}`,
           type: 'Panel',
           title: p,
           desc: `Navigate to ${p}`
        });
      });
      
      setGlobalData(aggregated);
    };
    if (token) fetchGlobalData();
  }, [token]);

  const profile = getRoleLabel(role);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = globalData.filter(r => 
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.desc?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-3 sm:px-6 z-40 transition-colors duration-300 relative">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={() => setIsMobileMenuOpen(prev => !prev)}
          aria-label="Toggle navigation menu"
          className="p-2 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden transition-colors shrink-0"
        >
          <Menu size={22} />
        </button>
        
        <h1 className="text-sm xs:text-base sm:text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
          {activeTab}
        </h1>

        {/* Desktop Search */}
        <div className="hidden sm:flex items-center relative ml-4" ref={searchRef}>
          <Search size={18} className="text-gray-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search leads, customers, or tickets..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(e.target.value.length > 0);
            }}
            onFocus={() => {
              if (searchQuery.length > 0) setIsSearchOpen(true);
            }}
            className="pl-10 pr-4 py-2 w-64 md:w-72 rounded-full border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200 transition-all focus:w-80 md:focus:w-96"
          />
          
          {/* Search Results Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50">
              {searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map(result => (
                    <button 
                      key={result.id} 
                      onClick={() => {
                        if (result.type === 'Panel') {
                          setActiveTab(result.title);
                        } else if (result.type === 'Customer') {
                          setActiveTab('Customers');
                        } else if (result.type === 'Lead') {
                          setActiveTab(role === 'TEAM_HEAD' ? 'Lead Assignment' : 'Leads');
                        } else if (result.type === 'Ticket') {
                          setActiveTab('Support');
                        }
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-gray-100 dark:border-zinc-800/50 last:border-0 flex flex-col"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-zinc-100">{result.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          result.type === 'Panel' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          result.type === 'Lead' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          result.type === 'Customer' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {result.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-zinc-400">{result.desc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-zinc-400">
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Mobile Search Toggle */}
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          aria-label="Search"
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:hidden transition-colors"
        >
          <Search size={19} />
        </button>

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="relative p-2 rounded-full transition-all duration-300 text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800 overflow-hidden"
        >
          <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
          }`}>
            <Sun size={19} />
          </span>
          <span className={`flex items-center justify-center transition-all duration-300 ${
            theme === 'light' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          }`}>
            <Moon size={19} />
          </span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2 rounded-full transition-colors ${isNotificationsOpen ? 'bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white' : 'text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
          >
            <Bell size={19} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-zinc-900"></span>
          </button>
          {isNotificationsOpen && <GlobalNotifications onClose={() => setIsNotificationsOpen(false)} />}
        </div>
      </div>

      {/* Mobile Search Bar Overlay */}
      {mobileSearchOpen && (
        <div className="absolute inset-x-0 top-0 h-16 bg-white dark:bg-zinc-900 z-50 flex items-center px-4 gap-3 border-b border-gray-200 dark:border-zinc-800 sm:hidden animate-in slide-in-from-top-2 duration-200">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search leads, customers..."
            value={searchQuery}
            autoFocus
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(e.target.value.length > 0);
            }}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder-gray-400 dark:placeholder-zinc-500"
          />
          <button
            onClick={() => {
              setMobileSearchOpen(false);
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>

          {/* Mobile Search Results */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-xl max-h-80 overflow-y-auto z-50">
              {searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map(result => (
                    <button 
                      key={result.id} 
                      onClick={() => {
                        if (result.type === 'Panel') {
                          setActiveTab(result.title);
                        } else if (result.type === 'Customer') {
                          setActiveTab('Customers');
                        } else if (result.type === 'Lead') {
                          setActiveTab(role === 'TEAM_HEAD' ? 'Lead Assignment' : 'Leads');
                        } else if (result.type === 'Ticket') {
                          setActiveTab('Support');
                        }
                        setIsSearchOpen(false);
                        setMobileSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-gray-100 dark:border-zinc-800/50 last:border-0 flex flex-col"
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-zinc-100">{result.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          result.type === 'Panel' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          result.type === 'Lead' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          result.type === 'Customer' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>
                          {result.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-zinc-400">{result.desc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-zinc-400">
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>

  );
};

export default Header;
