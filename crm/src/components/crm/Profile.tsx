"use client";

import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Shield, Key, Bell, Save, Camera, CheckCircle2, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRole } from './RoleContext';
import { useAuth } from '../AuthContext';
import { getApiBaseUrl } from '../../utils/apiBase';

const GlobalProfile = ({ defaultTab = 'general' }: { defaultTab?: 'general' | 'security' | 'preferences' | 'activity' }) => {
  const { role } = useRole();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'preferences' | 'activity'>(defaultTab);

  const nameParts = (user?.name || 'John Doe').split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials = `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase();

  const getNotificationsByRole = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { title: 'System Alerts', desc: 'Critical platform updates, downtime, and maintenance', checked: true },
          { title: 'Global Performance Reports', desc: 'Daily summaries of all team activities and metrics', checked: true },
          { title: 'High-Level Escalations', desc: 'Alerts when major client issues are escalated', checked: true },
          { title: 'Billing & Subscriptions', desc: 'Updates regarding CRM subscription status', checked: false }
        ];
      case 'TEAM_HEAD':
        return [
          { title: 'Team Performance', desc: 'Daily reports on your executives\' metrics', checked: true },
          { title: 'AI Escalation Alerts', desc: 'Immediate notification when AI transfers a call', checked: true },
          { title: 'Lead Assignment Updates', desc: 'Alerts when new lead pools are assigned to your team', checked: false },
          { title: 'Leave Requests', desc: 'When team members request time off', checked: true }
        ];
      case 'EXECUTIVE':
      default:
        return [
          { title: 'New Lead Assigned', desc: 'Get notified immediately when a new lead is assigned to you', checked: true },
          { title: 'Follow-up Reminders', desc: 'Alerts 15 minutes before a scheduled follow-up', checked: true },
          { title: 'Live Call Hand-offs', desc: 'Urgent notification when an AI transfers a live call to you', checked: true },
          { title: 'Customer Messages', desc: 'When a customer replies to your ticket or email', checked: false }
        ];
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Manage your personal information, security, and preferences.</p>
        
        {user?.requirePasswordChange && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
            <Shield className="text-red-500 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Action Required: Change Your Password</h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                You are currently using an auto-generated temporary password. For security reasons, please change your password immediately.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        {/* Cover & Avatar Header */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 relative">
           <button className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors">
              <Camera size={14} /> Change Cover
           </button>
        </div>
        <div className="px-6 sm:px-10 pb-6">
           <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-6">
              <div className="relative inline-block -mt-12">
                 <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-3xl shadow-xl ring-4 ring-white dark:ring-zinc-900">
                    {initials}
                 </div>
                 <button className="absolute bottom-0 right-0 p-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-lg hover:scale-105 transition-transform">
                    <Camera size={14} />
                 </button>
              </div>
              <div className="flex-1 pb-2">
                 <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">{user?.name || 'John Doe'} <CheckCircle2 size={20} className="text-emerald-500" /></h2>
                 <p className="text-gray-500 dark:text-zinc-400 font-medium">{user?.email || 'john.doe@fioner.com'} • Active User</p>
              </div>
              <div className="pb-2">
                 <button onClick={() => toast.success('Profile updated successfully!')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-6 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                    <Save size={16} /> Save Changes
                 </button>
              </div>
           </div>

           {/* Tabs */}
           <div className="flex gap-6 border-b border-gray-200 dark:border-zinc-800 mb-6 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('general')}
                className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === 'general' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
              >
                General Info
                {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
              </button>
              <button 
                onClick={() => setActiveTab('security')}
                className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === 'security' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
              >
                Security & Password
                {activeTab === 'security' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
              </button>
              <button 
                onClick={() => setActiveTab('preferences')}
                className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === 'preferences' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
              >
                Notifications
                {activeTab === 'preferences' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
              </button>
              <button 
                onClick={() => setActiveTab('activity')}
                className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap relative ${activeTab === 'activity' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
              >
                Activity
                {activeTab === 'activity' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
              </button>
           </div>

           {/* Tab Content */}
           {activeTab === 'general' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">First Name</label>
                      <div className="relative">
                         <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                         <input type="text" defaultValue={firstName} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Email Address</label>
                      <div className="relative">
                         <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                         <input type="email" defaultValue={user?.email || 'john.doe@fioner.com'} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
                      </div>
                   </div>
                </div>
                <div className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Last Name</label>
                      <div className="relative">
                         <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                         <input type="text" defaultValue={lastName} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Phone Number</label>
                      <div className="relative">
                         <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                         <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
                      </div>
                   </div>
                </div>
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Bio / Role Description</label>
                   <textarea rows={4} className="w-full p-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white resize-none" defaultValue="Senior Executive handling inbound technical sales and tier 2 escalations."></textarea>
                </div>
             </div>
           )}

           {activeTab === 'security' && (
             <div className="max-w-xl space-y-6">
                <div>
                   <h3 className="font-bold text-gray-900 dark:text-white mb-4">Change Password</h3>
                   <div className="space-y-4">
                      <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Current Password</label>
                         <input id="current-password" type="password" placeholder="••••••••" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">New Password</label>
                         <input id="new-password" type="password" placeholder="••••••••" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Confirm New Password</label>
                         <input id="confirm-password" type="password" placeholder="••••••••" className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
                      </div>
                      <button 
                        onClick={async () => {
                          const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
                          const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
                          const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

                          if (!currentPassword || !newPassword || !confirmPassword) {
                            return toast.error('Please fill out all fields.');
                          }
                          if (newPassword !== confirmPassword) {
                            return toast.error('New passwords do not match.');
                          }

                          try {
                            const token = localStorage.getItem('fioner_auth_token');
                            const API_BASE = getApiBaseUrl();
                            const res = await fetch(`${API_BASE}/api/v1/auth/change-password`, {
                              method: 'POST',
                              headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ currentPassword, newPassword }),
                            });

                            if (res.ok) {
                              toast.success('Password updated successfully!');
                              if (user?.requirePasswordChange) {
                                const updatedUser = { ...user, requirePasswordChange: false };
                                localStorage.setItem('fioner_auth_user', JSON.stringify(updatedUser));
                                window.location.reload();
                              } else {
                                (document.getElementById('current-password') as HTMLInputElement).value = '';
                                (document.getElementById('new-password') as HTMLInputElement).value = '';
                                (document.getElementById('confirm-password') as HTMLInputElement).value = '';
                              }
                            } else {
                              const data = await res.json();
                              toast.error(data.message || 'Failed to update password.');
                            }
                          } catch (err) {
                            toast.error('Network error. Could not change password.');
                          }
                        }} 
                        className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium py-2 px-6 rounded-lg transition-colors"
                      >
                        Update Password
                      </button>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'preferences' && (
             <div className="max-w-2xl space-y-6">
                <div>
                   <h3 className="font-bold text-gray-900 dark:text-white mb-4">Notification Channels</h3>
                   <div className="space-y-3">
                      {getNotificationsByRole().map((item, i) => (
                        <label key={i} className="flex items-start gap-3 p-4 border border-gray-200 dark:border-zinc-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                           <input type="checkbox" defaultChecked={item.checked} className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                           <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</p>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{item.desc}</p>
                           </div>
                        </label>
                      ))}
                   </div>
                </div>
                                <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
                   <h3 className="font-bold text-gray-900 dark:text-white mb-4">System Preferences</h3>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">Timezone</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">Used for all your scheduling and timestamps</p>
                         </div>
                         <select className="px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white">
                            <option>(UTC -08:00) Pacific Time</option>
                            <option>(UTC -05:00) Eastern Time</option>
                            <option>(UTC +00:00) London</option>
                            <option selected>(UTC +05:30) India Standard Time</option>
                         </select>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'activity' && (
             <div className="max-w-2xl">
               <h3 className="font-bold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
               <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-zinc-700 before:to-transparent">
                  {[
                    { action: 'Logged in to system', time: 'Today, 09:00 AM', desc: 'Successfully authenticated from IP 192.168.1.10', type: 'system' },
                    { action: 'Updated Lead Status', time: 'Yesterday, 02:30 PM', desc: 'Changed TechCorp expansion lead from "Contacted" to "Negotiation"', type: 'lead' },
                    { action: 'Closed Support Ticket', time: 'Yesterday, 11:15 AM', desc: 'Resolved issue #402 for Acme Industries', type: 'ticket' },
                    { action: 'Changed Profile Picture', time: 'Sep 15, 04:00 PM', desc: 'Uploaded a new avatar image', type: 'system' }
                  ].map((activity, i) => (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      {/* Icon Indicator */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-900 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                        <Activity size={16} />
                      </div>
                      
                      {/* Content Card */}
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/30 shadow-sm transition-all hover:shadow-md hover:bg-white dark:hover:bg-zinc-800">
                        <div className="flex flex-col gap-1">
                          <h4 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm">{activity.action}</h4>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">{activity.desc}</p>
                          <time className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-2">{activity.time}</time>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default GlobalProfile;
