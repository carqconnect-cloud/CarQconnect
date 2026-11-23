"use client";

import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Plus, Key, Trash2, Shield, Grid, Edit, X, Copy, Check, ChevronRight, Mail, PhoneCall } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, invalidateCrmCache } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

// Temp password card shown for 10 minutes in User Detail modal
const TempPasswordBlock = ({ password, mins, secs, copiedPwd, onCopy }: {
  password: string; mins: number; secs: number; copiedPwd: boolean; onCopy: () => void;
}) => (
  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Key size={14} className="text-amber-600 dark:text-amber-400" />
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Temporary Password</p>
      </div>
      <span className="text-xs text-amber-600 dark:text-amber-500 font-mono bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
        ⏱ {mins}:{secs.toString().padStart(2, '0')} remaining
      </span>
    </div>
    <div className="flex items-center justify-between bg-white dark:bg-zinc-800 border border-amber-200 dark:border-amber-700/40 rounded-lg px-3 py-2">
      <code className="text-sm font-mono font-bold text-amber-700 dark:text-amber-300 tracking-wider select-all">{password}</code>
      <button
        onClick={onCopy}
        className="ml-3 p-1.5 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        title="Copy password"
      >
        {copiedPwd
          ? <Check size={14} className="text-emerald-500" />
          : <Copy size={14} className="text-amber-600 dark:text-amber-400" />}
      </button>
    </div>
    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">Share this password securely. It will not be visible after {mins === 0 ? `${secs}s` : `${mins}m ${secs}s`}.</p>
  </div>
);

const AdminTeamManagement = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('Users');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showTeamDetailModal, setShowTeamDetailModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('All Teams');
  
  const [teamMetrics, setTeamMetrics] = useState({ activeProjects: 0, tasksCompleted: 0, efficiencyRate: 0 });
  const [metricsTimeframe, setMetricsTimeframe] = useState('lastmonth');
  // Stores { password, createdAt } for 10-minute temp display keyed by user membership id
  const [tempPasswords, setTempPasswords] = useState<Record<string, { password: string; createdAt: number }>>({});
  const [copiedPwd, setCopiedPwd] = useState(false);

  // Add New User Form State & Validation
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Employee',
    team: 'Unassigned',
  });
  const [createUserErrors, setCreateUserErrors] = useState<{
    firstName?: string;
    email?: string;
    phone?: string;
  }>({});
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const validateEmail = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Email address is required.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address (e.g. alex@example.com).';
    return null;
  };

  const validatePhone = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Phone number is required.';
    const clean = trimmed.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(\+?[1-9]\d{9,14}|\d{10})$/;
    if (!phoneRegex.test(clean)) {
      return 'Please enter a valid 10-digit mobile number or international format (e.g. +91 9876543210).';
    }
    return null;
  };

  const handleOpenCreateUser = () => {
    setNewUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'Employee',
      team: 'Unassigned',
    });
    setCreateUserErrors({});
    setShowCreateUserModal(true);
  };

  const [permissions, setPermissions] = useState([
    { id: 1, name: 'View Global Analytics Dashboard', head: false, exec: false },
    { id: 2, name: 'View Team Performance Dashboard', head: true, exec: false },
    { id: 3, name: 'Export Leads/Customer Data', head: true, exec: false },
    { id: 4, name: 'Delete Customer Records', head: false, exec: false },
    { id: 5, name: 'Review AI Call Recordings', head: true, exec: true },
    { id: 6, name: 'Re-assign Leads within Team', head: true, exec: false },
    { id: 7, name: 'Manage Follow-up Tasks', head: true, exec: true },
  ]);

  const handlePermissionChange = (index: number, role: 'head' | 'exec') => {
    setPermissions(prev => {
      const newPerms = [...prev];
      newPerms[index] = { ...newPerms[index], [role]: !newPerms[index][role] };
      return newPerms;
    });
  };

  const handleSavePermissions = () => {
    toast.success('Role configurations saved successfully');
  };

  const generatePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '@#$!&*';
    const all = upper + lower + digits + special;
    // Guarantee one of each required char class first, then fill remaining randomly
    const required = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
    ];
    const rest = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)]);
    // Shuffle only the combined array so required chars are always present
    return [...required, ...rest].sort(() => 0.5 - Math.random()).join('');
  };

  const filterRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFiltersModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tick every second to update temp-password countdowns and clean up expired ones
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (Object.keys(tempPasswords).length === 0) return;
    const tick = setInterval(() => {
      const now = Date.now();
      const hasExpired = Object.values(tempPasswords).some(e => now - e.createdAt >= 10 * 60 * 1000);
      if (hasExpired) {
        setTempPasswords(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => { if (now - next[k].createdAt >= 10 * 60 * 1000) delete next[k]; });
          return next;
        });
      }
      forceUpdate(n => n + 1);
    }, 1000);
    return () => clearInterval(tick);
  }, [tempPasswords]);

  useEffect(() => {
    if (showTeamDetailModal && selectedTeam) {
      const fetchMetrics = async () => {
        try {
          const API_BASE = getApiBaseUrl();
          const res = await fetch(`${API_BASE}/api/v1/crm/teams/${selectedTeam.id}/metrics?timeframe=${metricsTimeframe}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setTeamMetrics(data.data);
          }
        } catch (e) { console.error(e); }
      };
      fetchMetrics();
    }
  }, [showTeamDetailModal, selectedTeam, metricsTimeframe, token]);

  const toggleFilter = (val: string) => {
    setFilterStatuses(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const role = formData.get('role') as string;
    const teamId = formData.get('team') as string;
    const status = formData.get('status') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phone = formData.get('phone') as string;

    if (phone && phone.trim()) {
      const phoneErr = validatePhone(phone);
      if (phoneErr) {
        toast.error(phoneErr);
        return;
      }
    }

    // Build only valid fields — backend only accepts ACTIVE | SUSPENDED for status
    const body: Record<string, unknown> = {
      role: role === 'Team Head' ? 'TEAM_HEAD' : role === 'Admin' ? 'OWNER' : 'EXECUTIVE',
      teamId: teamId === 'Unassigned' ? null : teamId,
      ...(firstName && { firstName: firstName.trim() }),
      ...(lastName && { lastName: lastName.trim() }),
      ...(phone && { phone: phone.trim() }),
    };
    // Pending (INVITED) cannot be set via PATCH — only ACTIVE or SUSPENDED
    if (status === 'Active') body.status = 'ACTIVE';
    else if (status === 'Inactive') body.status = 'SUSPENDED';
    // If status === 'Pending' we simply don't send a status update

    try {
      const API_BASE = getApiBaseUrl();
      const res = await fetch(`${API_BASE}/api/v1/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        invalidateCrmCache('/api/v1/users');
        toast.success('User updated successfully');
        setShowEditUserModal(false);
        fetchUsers();
      } else {
        toast.error(data.message || 'Failed to update user');
      }
    } catch (err) {
      toast.error('An error occurred');
    }
  };

  const handleEditTeamSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const API_BASE = getApiBaseUrl();
      const res = await fetch(`${API_BASE}/api/v1/crm/teams/${selectedTeam.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.get('name'),
          headId: formData.get('head') === 'Unassigned' ? undefined : formData.get('head'),
          employeeIds: formData.getAll('new_employees').length > 0 ? formData.getAll('new_employees') : undefined,
        })
      });
      if (res.ok) {
        invalidateCrmCache('/api/v1/crm/teams');
        toast.success('Team updated successfully');
        setShowEditTeamModal(false);
        fetchTeams();
      } else {
        toast.error('Failed to update team');
      }
    } catch (err) {
      toast.error('An error occurred');
    }
  };

  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  const fetchUsers = async () => {
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('fioner_auth_token') || localStorage.getItem('token')) : null);
    if (!activeToken) return;
    const API_BASE = getApiBaseUrl();

    try {
      const [usersRes, teamsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/users`, { 
          headers: { 
            'Authorization': `Bearer ${activeToken}`
          } 
        }),
        fetch(`${API_BASE}/api/v1/crm/teams`, { 
          headers: { 
            'Authorization': `Bearer ${activeToken}`
          } 
        })
      ]);
      const data = await usersRes.json();
      const teamsData = await teamsRes.json();
      
      let teamsList: any[] = [];
      if (teamsData.data) {
        teamsList = teamsData.data;
      }

      if (data.data) {
        setUsers(data.data.map((m: any) => {
          const matchedTeam = teamsList.find((t: any) => t.id === m.team?.id);
          const headName = matchedTeam?.head ? `${matchedTeam.head.firstName} ${matchedTeam.head.lastName}`.trim() : 'Not assigned';
          
          return {
            id: m.id,
            firstName: m.firstName || m.user?.firstName || '',
            lastName: m.lastName || m.user?.lastName || '',
            name: `${m.firstName || m.user?.firstName || ''} ${m.lastName || m.user?.lastName || ''}`.trim(),
            email: m.email || m.user?.email,
            phone: m.phone || m.user?.phone || '-',
            role: m.role === 'TEAM_HEAD' ? 'Team Head' : (m.role === 'OWNER' || m.role === 'ADMIN') ? 'Admin' : 'Employee',
            rawRole: m.role,
            teamId: m.team?.id,
            team: m.team?.id ? headName : 'Not assigned',
            status: m.status === 'ACTIVE' ? 'Active' : m.status === 'INVITED' ? 'Pending' : 'Inactive',
          };
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };


  const fetchTeams = async () => {
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('fioner_auth_token') || localStorage.getItem('token')) : null);
    if (!activeToken) return;
    const API_BASE = getApiBaseUrl();

    try {
      const res = await fetch(`${API_BASE}/api/v1/crm/teams`, {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      const data = await res.json();
      if (data.data) {
        setTeams(data.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          head: t.head ? `${t.head.firstName} ${t.head.lastName}` : 'Unassigned',
          headId: t.head?.id,
          headEmail: t.head?.email || '-',
          members: t._count?.userTeams || 0,
          status: t.status,
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (token) {
      fetchUsers();
      fetchTeams();
    }
  }, [token]);

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Add New User</h2>
              <button type="button" onClick={() => setShowCreateUserModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              
              const firstNameErr = !newUserForm.firstName.trim() ? 'First name is required.' : null;
              const emailErr = validateEmail(newUserForm.email);
              const phoneErr = validatePhone(newUserForm.phone);

              if (firstNameErr || emailErr || phoneErr) {
                setCreateUserErrors({
                  firstName: firstNameErr || undefined,
                  email: emailErr || undefined,
                  phone: phoneErr || undefined,
                });
                if (firstNameErr) toast.error(firstNameErr);
                else if (emailErr) toast.error(emailErr);
                else if (phoneErr) toast.error(phoneErr);
                return;
              }

              setIsSubmittingUser(true);
              const generatedPassword = generatePassword();

              const payload = {
                firstName: newUserForm.firstName.trim(),
                lastName: newUserForm.lastName.trim() || '-',
                email: newUserForm.email.trim().toLowerCase(),
                phone: newUserForm.phone.trim(),
                role: newUserForm.role === 'Team Head' ? 'TEAM_HEAD' : 'EXECUTIVE',
                temporaryPassword: generatedPassword,
                teamId: newUserForm.team === 'Unassigned' ? null : newUserForm.team,
              };

              try {
                const API_BASE = getApiBaseUrl();
                const res = await fetch(`${API_BASE}/api/v1/users/invite`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok) {
                  invalidateCrmCache('/api/v1/users');
                  const membershipId = data.data?.membership?.id || data.data?.id || payload.email;
                  // Store temp password for 10 minutes
                  setTempPasswords(prev => ({ ...prev, [membershipId]: { password: generatedPassword, createdAt: Date.now() } }));
                  setShowCreateUserModal(false);
                  fetchUsers();

                  // Dispatch credentials email directly via Next.js API route
                  let emailSent = false;
                  let emailWarning = '';
                  try {
                    const emailRes = await fetch('/api/send-credentials', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        email: payload.email,
                        firstName: payload.firstName,
                        lastName: payload.lastName,
                        temporaryPassword: generatedPassword,
                        role: payload.role,
                        organizationName: 'Fioner CRM',
                        loginUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
                      })
                    });
                    const emailJson = await emailRes.json().catch(() => null);
                    if (emailRes.ok && emailJson?.success) {
                      emailSent = true;
                    } else {
                      emailWarning = emailJson?.error || 'Email dispatch failed';
                      console.warn('[CRM] Send credentials warning:', emailWarning);
                    }
                  } catch (e: any) {
                    emailWarning = e?.message || 'Email delivery network error';
                    console.error('[CRM] Send credentials error:', e);
                  }

                  // Rich toast with credentials
                  toast.custom((t) => (
                    <div className={`${t.visible ? 'animate-in slide-in-from-top-2' : 'opacity-0'} max-w-sm w-full bg-zinc-900 border ${emailSent ? 'border-emerald-500/40' : 'border-amber-500/40'} text-white rounded-2xl shadow-2xl p-4`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full ${emailSent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} flex items-center justify-center shrink-0`}>
                          {emailSent ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${emailSent ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {emailSent ? 'User Created & Credentials Emailed' : 'User Created (Email Sending Note)'}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            {emailSent ? (
                              <>Credentials have been sent to <span className="text-white font-medium">{payload.email}</span></>
                            ) : (
                              <>User created! Email status: {emailWarning || 'Check console'}. Save credentials below:</>
                            )}
                          </p>
                          <div className="mt-2 bg-zinc-800 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-zinc-500">Email (ID)</span>
                              <span className="text-xs font-mono text-white select-all">{payload.email}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-zinc-500">Password</span>
                              <span className="text-xs font-mono text-amber-400 font-bold tracking-wider select-all">{generatedPassword}</span>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-500 mt-2">⏱ Password visible for 10 mins in user details</p>
                        </div>
                        <button onClick={() => toast.dismiss(t.id)} className="text-zinc-500 hover:text-white transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ), { duration: 15000 });
                } else {
                  const errMsg = data.message || 'Failed to create user';
                  toast.error(errMsg);
                }
              } catch (err) {
                toast.error('An error occurred');
              } finally {
                setIsSubmittingUser(false);
              }
            }} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={newUserForm.firstName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewUserForm(prev => ({ ...prev, firstName: val }));
                        if (createUserErrors.firstName) setCreateUserErrors(prev => ({ ...prev, firstName: undefined }));
                      }}
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          setCreateUserErrors(prev => ({ ...prev, firstName: 'First name is required.' }));
                        }
                      }}
                      placeholder="e.g. Rahul"
                      className={`w-full px-4 py-2 border ${createUserErrors.firstName ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-200 dark:border-zinc-700 focus:ring-blue-500/50'} rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2`}
                      required
                    />
                    {createUserErrors.firstName && (
                      <p className="text-red-500 text-xs mt-1">{createUserErrors.firstName}</p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={newUserForm.lastName}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="e.g. Sharma"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newUserForm.email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewUserForm(prev => ({ ...prev, email: val }));
                        if (createUserErrors.email) setCreateUserErrors(prev => ({ ...prev, email: undefined }));
                      }}
                      onBlur={(e) => {
                        const err = validateEmail(e.target.value);
                        if (err) setCreateUserErrors(prev => ({ ...prev, email: err }));
                      }}
                      placeholder="rahul@fioner.com"
                      className={`w-full px-4 py-2 border ${createUserErrors.email ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-200 dark:border-zinc-700 focus:ring-blue-500/50'} rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2`}
                      required
                    />
                    {createUserErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{createUserErrors.email}</p>
                    )}
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                      Phone no. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={newUserForm.phone}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewUserForm(prev => ({ ...prev, phone: val }));
                        if (createUserErrors.phone) setCreateUserErrors(prev => ({ ...prev, phone: undefined }));
                      }}
                      onBlur={(e) => {
                        const err = validatePhone(e.target.value);
                        if (err) setCreateUserErrors(prev => ({ ...prev, phone: err }));
                      }}
                      placeholder="+91 98765 43210"
                      className={`w-full px-4 py-2 border ${createUserErrors.phone ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-200 dark:border-zinc-700 focus:ring-blue-500/50'} rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2`}
                      required
                    />
                    {createUserErrors.phone && (
                      <p className="text-red-500 text-xs mt-1">{createUserErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Role</label>
                    <select
                      name="role"
                      value={newUserForm.role}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="Employee">Employee</option>
                      <option value="Team Head">Team Head</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assign</label>
                    <select
                      name="team"
                      value={newUserForm.team}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, team: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="Unassigned">Unassigned</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Password</label>
                    <input type="text" readOnly defaultValue="Auto-generated upon creation" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-100 dark:bg-zinc-800/80 text-sm text-gray-500 dark:text-zinc-400 focus:outline-none cursor-not-allowed" />
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 flex items-center gap-1.5 font-medium">
                      <span>📧</span> Login ID and auto-generated password will be emailed to the user upon creation.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                >
                  {isSubmittingUser ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Edit User</h2>
              <button onClick={() => setShowEditUserModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">First Name</label>
                    <input type="text" name="firstName" defaultValue={selectedUser.firstName} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Last Name</label>
                    <input type="text" name="lastName" defaultValue={selectedUser.lastName} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Email Address</label>
                    <input type="email" name="email" defaultValue={selectedUser.email} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-100 dark:bg-zinc-800/80 text-sm text-gray-500 cursor-not-allowed focus:outline-none" readOnly />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Phone no.</label>
                    <input type="tel" name="phone" defaultValue={selectedUser.phone !== '-' ? selectedUser.phone : ''} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Role</label>
                    <select name="role" defaultValue={selectedUser.role} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                      <option value="Employee">Employee</option>
                      <option value="Team Head">Team Head</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assign</label>
                    <select name="team" defaultValue={selectedUser.teamId || 'Unassigned'} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                      <option value="Unassigned">Unassigned</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Status</label>
                    <select name="status" defaultValue={selectedUser.status} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditUserModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Detail Modal */}
      {showTeamDetailModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Team Details - {selectedTeam.name}</h2>
              <button onClick={() => setShowTeamDetailModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 sm:space-y-8 [&::-webkit-scrollbar]:hidden">
              {/* Team Head Section */}
              <section>
                <h3 className="text-sm font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-4">Team Head</h3>
                <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                    {selectedTeam.head !== 'Unassigned' ? selectedTeam.head.split(' ').map((n: string) => n[0]).join('') : '?'}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{selectedTeam.head}</h4>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">{selectedTeam.headEmail}</p>
                  </div>
                  <div className="ml-auto">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${selectedTeam.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                      {selectedTeam.status}
                    </span>
                  </div>
                </div>
              </section>

              {/* Work Metrics Section */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Team Work & Performance</h3>
                  <select 
                    value={metricsTimeframe} 
                    onChange={(e) => setMetricsTimeframe(e.target.value)}
                    className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs rounded-lg px-2 py-1 outline-none"
                  >
                    <option value="today">Today</option>
                    <option value="last7days">Last 7 Days</option>
                    <option value="lastmonth">Last Month</option>
                    <option value="lastyear">Last Year</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">Active Projects</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamMetrics.activeProjects}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">Tasks Completed</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamMetrics.tasksCompleted}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">Efficiency Rate</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{teamMetrics.efficiencyRate}%</p>
                  </div>
                </div>
              </section>

              {/* Team Employees Section */}
              <section>
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-sm font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Employees ({users.filter(u => u.teamId === selectedTeam.id && u.role !== 'Team Head').length})</h3>
                </div>
                <div className="space-y-3">
                  {users.filter(u => u.teamId === selectedTeam.id && u.role !== 'Team Head').length > 0 ? (
                    users.filter(u => u.teamId === selectedTeam.id && u.role !== 'Team Head').map(employee => (
                      <div key={employee.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                            {employee.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">{employee.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900 dark:text-white">{employee.email}</p>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">{employee.phone}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-zinc-400 italic">No employees assigned to this team.</p>
                  )}
                </div>
              </section>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-between items-center">
              <button onClick={async () => {
                if (!confirm('Are you sure?')) return;
                try {
                  const API_BASE = getApiBaseUrl();
                  const res = await fetch(`${API_BASE}/api/v1/crm/teams/${selectedTeam.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (res.ok) {
                    invalidateCrmCache('/api/v1/crm/teams');
                    setShowTeamDetailModal(false);
                    toast.success('Team deleted successfully');
                    fetchTeams();
                  } else toast.error('Failed to delete team');
                } catch (e) { toast.error('Error'); }
              }} className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors">
                <Trash2 size={16} /> Delete
              </button>
              <div className="flex gap-3">
                <button onClick={() => setShowTeamDetailModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Close</button>
                <button onClick={() => { setShowTeamDetailModal(false); setShowEditTeamModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
                  <Edit size={16} /> Edit Team
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Edit Team</h2>
              <button onClick={() => setShowEditTeamModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditTeamSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Team Name</label>
                    <input type="text" name="name" defaultValue={selectedTeam.name} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" pattern="^[\p{L}\s'\-]+$" title="Please enter a valid name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assign Team Head</label>
                    <select name="head" defaultValue={selectedTeam.headId || 'Unassigned'} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                      <option value="Unassigned">Unassigned</option>
                      {users.filter(u => u.role === 'MANAGER' || u.role === 'Team Head').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Add Employees</label>
                    <div className="border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 p-3 max-h-32 overflow-y-auto space-y-2">
                      {users.filter(u => u.team === 'Unassigned').length > 0 ? (
                        users.filter(u => u.team === 'Unassigned').map(user => (
                          <label key={user.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer">
                            <input type="checkbox" name="new_employees" value={user.id} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> {user.name}
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No unassigned employees available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditTeamModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Create New Team</h2>
              <button type="button" onClick={() => setShowCreateTeamModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const headId = formData.get('head') as string;
              const employeeIds = formData.getAll('employees') as string[];
              try {
                const API_BASE = getApiBaseUrl();
                const res = await fetch(`${API_BASE}/api/v1/crm/teams`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    name: formData.get('name'),
                    headId: headId === 'Unassigned' ? undefined : headId,
                    employeeIds: employeeIds.length > 0 ? employeeIds : undefined,
                  })
                });
                if (res.ok) {
                  invalidateCrmCache('/api/v1/crm/teams');
                  toast.success('Team created successfully');
                  setShowCreateTeamModal(false);
                  fetchTeams();
                } else {
                  toast.error('Failed to create team');
                }
              } catch (err) {
                toast.error('An error occurred');
              }
            }} className="flex flex-col flex-1 min-h-0 overflow-hidden">

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Team Name</label>
                    <input type="text" name="name" placeholder="e.g. Sales Team Alpha" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" pattern="^[\p{L}\s'\-]+$" title="Please enter a valid name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assign Team Head</label>
                    <select name="head" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                      <option value="Unassigned">Select a Team Head...</option>
                      {users.filter(u => (u.role === 'Team Head' || u.role === 'Admin') && u.team === 'Unassigned').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Select Employees</label>
                    <div className="border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 p-3 max-h-32 overflow-y-auto space-y-2">
                      {users.filter(u => u.team === 'Unassigned' && u.role === 'Employee').length > 0 ? (
                        users.filter(u => u.team === 'Unassigned' && u.role === 'Employee').map(user => (
                          <label key={user.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-blue-600">
                            <input type="checkbox" name="employees" value={user.id} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> {user.name}
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-zinc-400 italic">No unassigned employees available.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateTeamModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">User Details</h2>
              <button onClick={() => setShowUserDetailModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-bold">
                  {selectedUser.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">{selectedUser.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Email Address</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Phone No.</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUser.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Team Assignment</p>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedUser.team === 'Unassigned' ? 'Not assigned' : selectedUser.team}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Status</p>
                  <p className="text-sm mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${selectedUser.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : selectedUser.status === 'Pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                      {selectedUser.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Temp password section — visible for 10 minutes after user creation */}
              {(() => {
                const entry = tempPasswords[selectedUser.id];
                if (!entry) return null;
                const elapsed = Date.now() - entry.createdAt;
                const remaining = 10 * 60 * 1000 - elapsed;
                if (remaining <= 0) return null;
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                return (
                  <TempPasswordBlock
                    password={entry.password}
                    mins={mins}
                    secs={secs}
                    copiedPwd={copiedPwd}
                    onCopy={() => {
                      navigator.clipboard.writeText(entry.password);
                      setCopiedPwd(true);
                      setTimeout(() => setCopiedPwd(false), 2000);
                    }}
                  />
                );
              })()}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-between items-center shrink-0">
              <button onClick={async () => {
                if (!confirm('Are you sure?')) return;
                try {
                  const API_BASE = getApiBaseUrl();
                  const res = await fetch(`${API_BASE}/api/v1/users/${selectedUser.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (res.ok) {
                    invalidateCrmCache('/api/v1/users');
                    setShowUserDetailModal(false);
                    toast.success('User deleted successfully');
                    fetchUsers();
                  } else toast.error('Failed to delete user');
                } catch (e) { toast.error('Error'); }
              }} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-500/10 rounded-lg text-xs sm:text-sm font-medium transition-colors">
                <Trash2 size={16} /> Delete
              </button>
              <div className="flex gap-2 sm:gap-3">
                <button onClick={() => setShowUserDetailModal(false)} className="px-3 sm:px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-xs sm:text-sm font-medium transition-colors">Close</button>
                <button onClick={() => { setShowUserDetailModal(false); setShowEditUserModal(true); }} className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium shadow-sm transition-colors">
                  <Edit size={16} /> Edit User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Team Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5 sm:mt-1">Manage executive accounts, roles, and team assignments.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {activeTab === 'Users' && (
            <button onClick={handleOpenCreateUser} className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 sm:gap-2">
              <Plus size={16} /> Add New User
            </button>
          )}
          {activeTab === 'Teams' && (
            <button onClick={() => setShowCreateTeamModal(true)} className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 sm:gap-2">
              <Plus size={16} /> Create New Team
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 sm:gap-6 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button onClick={() => setActiveTab('Users')} className={`pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'Users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}>Users List</button>
        <button onClick={() => setActiveTab('Teams')} className={`pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'Teams' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}>Teams Management</button>
        <button onClick={() => setActiveTab('Permissions')} className={`pb-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'Permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}>Roles & Permissions</button>
      </div>

      {activeTab === 'Users' && (
        <div className="space-y-4 sm:space-y-6">

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-blue-500 flex flex-col justify-between h-full overflow-hidden">
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-blue-600 dark:text-blue-400">
                <Users size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
                <h3 className="font-semibold text-xs sm:text-sm leading-tight">Total Users</h3>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{users.length}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-emerald-500 flex flex-col justify-between h-full overflow-hidden">
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-emerald-600 dark:text-emerald-400">
                <Shield size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
                <h3 className="font-semibold text-xs sm:text-sm leading-tight">Team Heads</h3>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'Team Head').length}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-purple-500 flex flex-col justify-between h-full overflow-hidden col-span-2 md:col-span-1">
              <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-purple-600 dark:text-purple-400">
                <Grid size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
                <h3 className="font-semibold text-xs sm:text-sm leading-tight">Active Employees</h3>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'Employee' && u.status === 'Active').length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4 bg-gray-50/50 dark:bg-zinc-900/50">
              <div className="relative flex-1">
                <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
              </div>
              <div className="flex items-center gap-2">
                <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="flex-1 sm:flex-none bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm rounded-lg px-3 py-2 outline-none">
                  <option value="All Teams">All Teams</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                  <option value="Unassigned">Unassigned</option>
                </select>
                <div className="relative shrink-0" ref={filterRef}>
                  <button onClick={() => setShowFiltersModal(!showFiltersModal)} className={`whitespace-nowrap flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-colors border ${showFiltersModal ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'text-gray-600 border-gray-200 dark:text-zinc-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>
                    <Filter size={16} /> Filters {filterStatuses.length > 0 && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                  </button>
                  {showFiltersModal && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                      <div className="p-3 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Filter Status</h3>
                        <button onClick={() => setShowFiltersModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="p-3 space-y-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-blue-600">
                          <input type="checkbox" checked={filterStatuses.includes('Active')} onChange={() => toggleFilter('Active')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> Active
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-blue-600">
                          <input type="checkbox" checked={filterStatuses.includes('Pending')} onChange={() => toggleFilter('Pending')} className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" /> Pending
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-blue-600">
                          <input type="checkbox" checked={filterStatuses.includes('Inactive')} onChange={() => toggleFilter('Inactive')} className="rounded border-gray-300 text-red-500 focus:ring-red-500" /> Inactive
                        </label>
                      </div>
                      <div className="p-3 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-2">
                        <button onClick={() => { setFilterStatuses([]); setTeamFilter('All Teams'); setShowFiltersModal(false); }} className="px-3 py-1.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-md text-xs font-medium transition-colors">Clear</button>
                        <button onClick={() => setShowFiltersModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm transition-colors">Apply</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase tracking-wider bg-gray-50 dark:bg-zinc-900/50">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone No.</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Team Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {users.filter(user => {
                    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(user.status);
                    const matchesTeam = teamFilter === 'All Teams' || user.team === teamFilter;
                    const isNotAdmin = user.role !== 'Admin';
                    return matchesSearch && matchesStatus && matchesTeam && isNotAdmin;
                  }).map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer" onClick={() => { setSelectedUser(user); setShowUserDetailModal(true); }}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                            {user.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{user.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-700 dark:text-zinc-300">{user.email}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-700 dark:text-zinc-300">{user.phone}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${user.role === 'Team Head'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : user.role === 'Admin'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-700 dark:text-zinc-300">
                          {user.team === 'Unassigned' ? 'Not assigned' : user.team}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {users.filter(user => {
                    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(user.status);
                    const matchesTeam = teamFilter === 'All Teams' || user.team === teamFilter;
                    const isNotAdmin = user.role !== 'Admin';
                    return matchesSearch && matchesStatus && matchesTeam && isNotAdmin;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-sm text-gray-500 dark:text-zinc-400">
                        No users found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile User Cards List */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
              {users.filter(user => {
                const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(user.status);
                const matchesTeam = teamFilter === 'All Teams' || user.team === teamFilter;
                const isNotAdmin = user.role !== 'Admin';
                return matchesSearch && matchesStatus && matchesTeam && isNotAdmin;
              }).length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500 dark:text-zinc-400">
                  No users found matching your filters.
                </div>
              ) : (
                users.filter(user => {
                  const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(user.status);
                  const matchesTeam = teamFilter === 'All Teams' || user.team === teamFilter;
                  const isNotAdmin = user.role !== 'Admin';
                  return matchesSearch && matchesStatus && matchesTeam && isNotAdmin;
                }).map((user) => (
                  <div
                    key={user.id}
                    onClick={() => { setSelectedUser(user); setShowUserDetailModal(true); }}
                    className="p-3.5 space-y-2.5 active:bg-gray-50 dark:active:bg-zinc-800/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0 text-xs">
                          {user.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.name}</p>
                          <span className="text-xs text-gray-500 dark:text-zinc-400 block truncate">
                            {user.team === 'Unassigned' ? 'Not assigned' : user.team}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${user.role === 'Team Head'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : user.role === 'Admin'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                          {user.role}
                        </span>
                        <ChevronRight size={14} className="text-gray-400 shrink-0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-zinc-300 pt-1 border-t border-gray-50 dark:border-zinc-800/60">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <PhoneCall size={12} className="text-gray-400 shrink-0" />
                        <span className="truncate">{user.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Teams' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase tracking-wider bg-gray-50 dark:bg-zinc-900/50">
                    <th className="p-4">Team Name</th>
                    <th className="p-4">Team Head</th>
                    <th className="p-4">Head Email</th>
                    <th className="p-4">Total Employees</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {teams.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer" onClick={() => { setSelectedTeam(team); setShowTeamDetailModal(true); }}>
                      <td className="p-4">
                        <p className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{team.name}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {team.head !== 'Unassigned' ? (
                            <>
                              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                {team.head.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{team.head}</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-500 italic">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-700 dark:text-zinc-300">{team.headEmail}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-700 dark:text-zinc-300">{team.members}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${team.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                          {team.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Permissions' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">CRM Role Access Matrix</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">Define exactly what features each role can access or modify.</p>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 text-[13px] sm:text-[15px] uppercase tracking-wider font-bold text-gray-500 dark:text-white">
                  <th className="p-4">Permission Feature</th>
                  <th className="p-4 text-center">Team Head</th>
                  <th className="p-4 text-center">Executive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {permissions.map((perm, i) => (
                  <tr key={perm.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2"><Shield size={14} className="text-gray-400 shrink-0" /> {perm.name}</td>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={perm.head} 
                        onChange={() => handlePermissionChange(i, 'head')}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                      />
                    </td>
                    <td className="p-4 text-center">
                      <input 
                        type="checkbox" 
                        checked={perm.exec} 
                        onChange={() => handlePermissionChange(i, 'exec')}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end">
            <button 
              onClick={handleSavePermissions}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-6 rounded-lg shadow-sm transition-colors"
            >
              Save Configurations
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeamManagement;
