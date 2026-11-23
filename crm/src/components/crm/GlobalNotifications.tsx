"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle, PhoneCall, MessageSquare, CheckCircle2, Target, Users, Megaphone, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { getApiBaseUrl } from '../../utils/apiBase';

interface Notification {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

interface GlobalNotificationsProps {
  onClose?: () => void;
}

function getIconAndColor(type: string) {
  switch (type) {
    case 'lead':
      return { icon: Target, color: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30' };
    case 'customer':
      return { icon: Users, color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' };
    case 'campaign':
      return { icon: Megaphone, color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30' };
    case 'call':
      return { icon: PhoneCall, color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' };
    case 'alert':
      return { icon: AlertTriangle, color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30' };
    default:
      return { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30' };
  }
}

const GlobalNotifications: React.FC<GlobalNotificationsProps> = ({ onClose }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchNotifications = async () => {
      try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/v1/crm/dashboard/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data?.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [token]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleClear = () => {
    if (notifications.length > 0) {
      setNotifications([]);
      toast.success('All notifications cleared');
    }
  };

  return (
    <>
      {/* Click outside backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] sm:bg-transparent"
        onClick={onClose}
      />
      <div className="fixed top-16 right-3 sm:right-6 w-[calc(100vw-1.5rem)] max-w-[380px] bg-white dark:bg-[#111115] rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h2>
            {unreadCount > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">{unreadCount} NEW</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClear} className="text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800">
              <CheckCircle2 size={13} /> Clear
            </button>
            {onClose && (
              <button onClick={onClose} aria-label="Close notifications" className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-md transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800/80 [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 dark:text-zinc-500">
              <Loader2 size={24} className="mx-auto mb-2 animate-spin opacity-40 text-blue-500" />
              <p className="text-xs font-medium">Loading notifications…</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-30 text-emerald-500" />
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200">You're all caught up!</p>
              <p className="text-xs text-gray-400 mt-0.5">No new alerts at this time.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon: Icon, color } = getIconAndColor(notif.type);
              return (
                <div key={notif.id} className="p-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex gap-3 cursor-pointer relative group">
                  {notif.unread && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full"></div>}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 pr-4 min-w-0">
                    <h3 className={`text-xs sm:text-sm mb-0.5 truncate ${notif.unread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-zinc-300'}`}>{notif.title}</h3>
                    <p className={`text-xs mb-1 line-clamp-2 ${notif.unread ? 'text-gray-600 dark:text-zinc-400 font-normal' : 'text-gray-500 dark:text-zinc-500'}`}>{notif.desc}</p>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">{notif.time}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default GlobalNotifications;
