import React, { useState, useEffect } from 'react';
import { Users, Circle, PhoneCall, Briefcase, MessageSquare, Plus, Activity, Search, Filter, X, Edit, Trash2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

const TeamPerformance = () => {
  const { user, token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [formErrors, setFormErrors] = useState<{ firstName?: string; email?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const generatePassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '@#$!&*';
    const all = upper + lower + digits + special;
    const required = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      digits[Math.floor(Math.random() * digits.length)],
      special[Math.floor(Math.random() * special.length)],
    ];
    const rest = Array.from({ length: 6 }, () => all[Math.floor(Math.random() * all.length)]);
    return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
  };

  const validateEmail = (val: string): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Email address is required.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address (e.g. name@domain.com).';
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

  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const API_BASE = getApiBaseUrl();
      // Fetch teams, users, leads simultaneously
      const [teamsRes, usersRes, leadsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/crm/teams`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/v1/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/v1/crm/leads`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      let currentTeamId: string | null = null;
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        const teamsList = teamsData.data || [];
        const myTeam = teamsList.find((t: any) => 
          (t.head?.id && user?.id && t.head.id === user.id) ||
          (t.headId && user?.id && t.headId === user.id) ||
          (t.head?.email && user?.email && t.head.email.toLowerCase() === user.email.toLowerCase()) ||
          (t.headEmail && user?.email && t.headEmail.toLowerCase() === user.email.toLowerCase())
        );
        if (myTeam) {
          currentTeamId = myTeam.id;
          setMyTeamId(myTeam.id);
        }
      }

      let allLeads = [];
      if (leadsRes.ok) allLeads = (await leadsRes.json()).data || [];

      if (usersRes.ok) {
        const data = await usersRes.json();
        const userList = data.data || [];

        if (!currentTeamId) {
          const me = userList.find((m: any) => 
            (m.id && user?.id && m.id === user.id) ||
            (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase())
          );
          if (me?.teamId) {
            currentTeamId = me.teamId;
            setMyTeamId(me.teamId);
          }
        }

        const filteredData = userList.filter((m: any) => (!currentTeamId || m.teamId === currentTeamId) && m.role === 'EXECUTIVE');

        setTeamMembers(filteredData.map((m: any) => {
          const mLeads = allLeads.filter((l: any) => l.ownerId === m.id);

          return {
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            name: `${m.firstName} ${m.lastName}`,
            email: m.email,
            phone: m.phone || '-',
            role: m.role,
            status: m.status === 'ACTIVE' ? 'Online' : 'Offline',
            statusColor: m.status === 'ACTIVE' ? 'text-emerald-500' : 'text-gray-500',
            statusBg: m.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400',
            activeLeads: mLeads.length,
            openTickets: 0,

            lastActive: 'Just now'
          };
        }));
      }
    } catch (error) {
      console.error('Failed to fetch team members', error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMembers();
    }
  }, [token, user?.id]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormData({ firstName: '', lastName: '', email: '', phone: '' });
    setFormErrors({});
    setShowCreateUserModal(true);
  };

  const handleOpenEditModal = () => {
    setIsEditing(true);
    setFormData({
      firstName: selectedEmployee.firstName || '',
      lastName: selectedEmployee.lastName || '',
      email: selectedEmployee.email,
      phone: selectedEmployee.phone !== '-' ? selectedEmployee.phone : ''
    });
    setFormErrors({});
    setShowCreateUserModal(true);
  };

  const handleFormSubmit = async () => {
    if (isEditing && selectedEmployee) {
      // Logic for editing
      const { firstName, lastName, phone } = formData;
      if (phone && phone.trim()) {
        const phoneErr = validatePhone(phone);
        if (phoneErr) {
          toast.error(phoneErr);
          setFormErrors(prev => ({ ...prev, phone: phoneErr }));
          return;
        }
      }

      setIsSubmitting(true);
      try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/v1/users/${selectedEmployee.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim() || '-',
            phone: phone ? phone.trim() : null
          })
        });

        if (res.ok) {
          setTeamMembers(prev => prev.map(m => m.id === selectedEmployee.id ? { ...m, ...formData } : m));
          setSelectedEmployee((prev: any) => ({ ...prev, ...formData }));
          toast.success('User updated successfully');
          setShowCreateUserModal(false);
        } else {
          const err = await res.json();
          toast.error(err.message || 'Failed to update user');
        }
      } catch (err) {
        toast.error('Network error while updating');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // POST to backend — Validate first
      const firstNameErr = !formData.firstName.trim() ? 'First name is required.' : null;
      const emailErr = validateEmail(formData.email);
      const phoneErr = validatePhone(formData.phone);

      if (firstNameErr || emailErr || phoneErr) {
        setFormErrors({
          firstName: firstNameErr || undefined,
          email: emailErr || undefined,
          phone: phoneErr || undefined,
        });
        if (firstNameErr) toast.error(firstNameErr);
        else if (emailErr) toast.error(emailErr);
        else if (phoneErr) toast.error(phoneErr);
        return;
      }

      setIsSubmitting(true);
      const tempPassword = generatePassword();
      const targetEmail = formData.email.trim().toLowerCase();

      try {
        let targetTeamId = myTeamId;
        
        // Auto-create team if Team Head doesn't have one yet
        if (!targetTeamId && user?.id) {
          try {
            const API_BASE = getApiBaseUrl();
            const createTeamRes = await fetch(`${API_BASE}/api/v1/crm/teams`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                name: `${user.name ? user.name.split(' ')[0] : 'My'} Team`,
              })
            });
            
            if (createTeamRes.ok) {
              const newTeam = await createTeamRes.json();
              targetTeamId = newTeam.data?.id || null;
              if (targetTeamId) {
                setMyTeamId(targetTeamId);
              }
            } else {
              console.warn('Team auto-creation skipped, inviting directly:', await createTeamRes.text().catch(() => ''));
            }
          } catch (teamErr) {
            console.warn('Could not auto-create team, continuing with invite:', teamErr);
          }
        }

        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/v1/users/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim() || '-',
            email: targetEmail,
            phone: formData.phone.trim(),
            role: 'EXECUTIVE',
            teamId: targetTeamId,
            temporaryPassword: tempPassword
          })
        });

        if (res.ok) {
          const userResult = await res.json();
          const userId = userResult.data?.id || userResult.id || targetEmail;
          const expiresAt = Date.now() + 10 * 60 * 1000;
          localStorage.setItem(`fioner_temp_pw_${userId}`, JSON.stringify({ password: tempPassword, expiresAt }));

          // Dispatch credentials email directly via Next.js API route
          let emailSent = false;
          let emailWarning = '';
          try {
            const emailRes = await fetch('/api/send-credentials', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: targetEmail,
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                temporaryPassword: tempPassword,
                role: 'EXECUTIVE',
                organizationName: 'Fioner CRM',
                loginUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
              })
            });
            const emailJson = await emailRes.json().catch(() => null);
            if (emailRes.ok && emailJson?.success) {
              emailSent = true;
            } else {
              emailWarning = emailJson?.error || 'Email dispatch failed';
              console.warn('[CRM Teamlead] Send credentials warning:', emailWarning);
            }
          } catch (e: any) {
            emailWarning = e?.message || 'Email delivery network error';
            console.error('[CRM Teamlead] Send credentials error:', e);
          }

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
                      <>Credentials have been sent to <span className="text-white font-medium">{targetEmail}</span></>
                    ) : (
                      <>User created! Email status: {emailWarning || 'Check console'}. Save credentials below:</>
                    )}
                  </p>
                  <div className="mt-2 bg-zinc-800 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Email (ID)</span>
                      <span className="text-xs font-mono text-white select-all">{targetEmail}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Password</span>
                      <span className="text-xs font-mono text-amber-400 font-bold tracking-wider select-all">{tempPassword}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">⏱ Password visible for 10 mins</p>
                </div>
                <button onClick={() => toast.dismiss(t.id)} className="text-zinc-500 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ), { duration: 15000 });

          fetchMembers();
          setShowCreateUserModal(false);
        } else {
          const err = await res.json();
          toast.error(err.message || 'Failed to create user');
        }
      } catch (err) {
        toast.error('Network error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };



  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          member.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-20 relative">
      {/* Create/Edit User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-xl overflow-hidden animate-in zoom-in-95">
             <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">{isEditing ? 'Update User' : 'Add New User'}</h2>
                <button onClick={() => setShowCreateUserModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
             </div>
             
             <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => {
                          setFormData({...formData, firstName: e.target.value});
                          if (formErrors.firstName) setFormErrors(prev => ({ ...prev, firstName: undefined }));
                        }}
                        onBlur={(e) => {
                          if (!e.target.value.trim()) {
                            setFormErrors(prev => ({ ...prev, firstName: 'First name is required.' }));
                          }
                        }}
                        placeholder="e.g. Akshay"
                        className={`w-full px-4 py-2 border ${
                          formErrors.firstName ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-200 dark:border-zinc-700 focus:ring-blue-500/50'
                        } rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2`}
                      />
                      {formErrors.firstName && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.firstName}</p>
                      )}
                   </div>
                   <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        placeholder="e.g. Ladne"
                        className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                   </div>
                   <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        disabled={isEditing}
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({...formData, email: e.target.value});
                          if (formErrors.email) setFormErrors(prev => ({ ...prev, email: undefined }));
                        }}
                        onBlur={(e) => {
                          const err = validateEmail(e.target.value);
                          if (err) setFormErrors(prev => ({ ...prev, email: err }));
                        }}
                        placeholder="akshay@fioner.com"
                        className={`w-full px-4 py-2 border ${
                          formErrors.email ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-200 dark:border-zinc-700 focus:ring-blue-500/50'
                        } ${isEditing ? 'bg-gray-100 dark:bg-zinc-800/80 cursor-not-allowed text-gray-500' : 'bg-gray-50 dark:bg-zinc-800'} rounded-lg text-sm focus:outline-none focus:ring-2`}
                      />
                      {formErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                      )}
                   </div>
                   <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                        Phone no. <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({...formData, phone: e.target.value});
                          if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: undefined }));
                        }}
                        onBlur={(e) => {
                          const err = validatePhone(e.target.value);
                          if (err) setFormErrors(prev => ({ ...prev, phone: err }));
                        }}
                        placeholder="+91 98765 43210"
                        className={`w-full px-4 py-2 border ${
                          formErrors.phone ? 'border-red-500 focus:ring-red-500/30' : 'border-gray-200 dark:border-zinc-700 focus:ring-blue-500/50'
                        } rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2`}
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
                      )}
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Role</label>
                      <input type="text" readOnly disabled value="Employee" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-100 dark:bg-zinc-800/80 text-sm text-gray-500 dark:text-zinc-400 focus:outline-none cursor-not-allowed" />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assign</label>
                      <input type="text" readOnly disabled value={user?.name || 'My Team'} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-100 dark:bg-zinc-800/80 text-sm text-gray-500 dark:text-zinc-400 focus:outline-none cursor-not-allowed" />
                   </div>
                   <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Password</label>
                      <input type="text" readOnly defaultValue={isEditing ? "********" : "Auto-generated upon creation"} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-100 dark:bg-zinc-800/80 text-sm text-gray-500 dark:text-zinc-400 focus:outline-none cursor-not-allowed" />
                      {!isEditing && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 flex items-center gap-1.5 font-medium">
                          <span>📧</span> Login ID and auto-generated password will be emailed to the user upon creation.
                        </p>
                      )}
                   </div>
                </div>
             </div>
             <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
               <button onClick={() => setShowCreateUserModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
               <button
                 onClick={handleFormSubmit}
                 disabled={isSubmitting}
                 className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
               >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  {isEditing ? 'Save Changes' : 'Create User'}
               </button>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
             <Users className="text-blue-500" /> Team Performance & Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Monitor your team members' live status, performance, and workload bandwidth.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleOpenCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2">
            <Plus size={16} /> Add New User
          </button>
        </div>
      </div>

      {!selectedEmployee ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden shadow-sm mt-6">
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800">
            <div className="relative w-full max-w-sm">
              <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search team members..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-100 dark:border-zinc-800 rounded-lg bg-gray-50 dark:bg-zinc-800/50 focus:outline-none focus:border-gray-500 text-gray-200 transition-colors" 
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-100 dark:border-zinc-800 rounded-lg text-sm text-gray-300 hover:bg-gray-50 dark:bg-zinc-800/50 hover:text-white transition-colors font-medium whitespace-nowrap">
               <Filter size={16} /> Filter <ChevronDown size={14} className="ml-1" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr>
                  <th className="p-5 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-zinc-800">Name</th>
                  <th className="p-5 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-zinc-800">Email</th>
                  <th className="p-5 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-zinc-800">Phone No.</th>
                  <th className="p-5 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-zinc-800">Status</th>
                  <th className="p-5 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-zinc-800">Active Leads</th>
                  <th className="p-5 text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-zinc-800">Open Tickets</th>

                </tr>
              </thead>
              <tbody>
                {filteredTeamMembers.map((member) => (
                  <tr key={member.id} onClick={() => setSelectedEmployee(member)} className="hover:bg-gray-50 dark:bg-zinc-800/50 transition-colors group cursor-pointer">
                    <td className="p-5 border-b border-gray-100 dark:border-zinc-800 text-sm font-medium text-white">{member.name}</td>
                    <td className="p-5 border-b border-gray-100 dark:border-zinc-800 text-sm font-medium text-gray-400">{member.email}</td>
                    <td className="p-5 border-b border-gray-100 dark:border-zinc-800 text-sm font-medium text-gray-400">{member.phone}</td>
                    <td className="p-5 border-b border-gray-100 dark:border-zinc-800">
                      <span className={`flex items-center gap-1.5 text-sm font-medium ${member.statusColor}`}>
                        <Circle size={10} fill="currentColor" /> {member.status}
                      </span>
                    </td>
                    <td className="p-5 border-b border-gray-100 dark:border-zinc-800 text-sm font-medium text-gray-400">{member.activeLeads}</td>
                    <td className="p-5 border-b border-gray-100 dark:border-zinc-800 text-sm font-medium text-gray-400">{member.openTickets}</td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-8 animate-in fade-in">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100 dark:border-zinc-800 relative">
             <button onClick={() => setSelectedEmployee(null)} className="absolute -top-2 -right-2 p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white">
                <X size={20} />
             </button>
             <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-gray-800 flex items-center justify-center text-blue-600 dark:text-white font-bold text-2xl shadow-sm">
               {selectedEmployee.name.split(' ').map((n: string) => n[0]).join('')}
             </div>
             <div className="flex-1 flex items-start justify-between">
               <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{selectedEmployee.name}</h2>
                  <p className="text-blue-600 dark:text-blue-400 font-medium text-lg">{selectedEmployee.role}</p>
               </div>
               <div className="flex items-center gap-3 pr-8">
                  <button onClick={handleOpenEditModal} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
                     <Edit size={16} /> Update
                  </button>
                  <button onClick={async () => {
                      if (!confirm(`Are you sure you want to delete ${selectedEmployee.name}?`)) return;
                      try {
                        const API_BASE = getApiBaseUrl();
                        const res = await fetch(`${API_BASE}/api/v1/users/${selectedEmployee.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (res.ok) {
                          setTeamMembers(prev => prev.filter(m => m.id !== selectedEmployee.id));
                          setSelectedEmployee(null);
                          toast.success(`${selectedEmployee.name} deleted successfully`);
                        } else {
                          const err = await res.json();
                          toast.error(err.message || 'Failed to delete user');
                        }
                      } catch (e) {
                        toast.error('Network error while deleting');
                      }
                  }} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors">
                     <Trash2 size={16} /> Delete
                  </button>
               </div>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Users size={18} className="text-blue-500"/> Contact Information</h3>
                <div className="space-y-5 bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-xl border border-gray-100 dark:border-zinc-700/50">
                   <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedEmployee.email}</p>
                   </div>
                   <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Password</p>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">
                        {(() => {
                          const cached = localStorage.getItem(`fioner_temp_pw_${selectedEmployee.id}`);
                          if (cached) {
                            try {
                              const parsed = JSON.parse(cached);
                              if (Date.now() < parsed.expiresAt) {
                                return parsed.password;
                              }
                            } catch (e) {}
                          }
                          return '********';
                        })()}
                      </p>
                   </div>
                   <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Phone Number</p>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedEmployee.phone}</p>
                   </div>
                   <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Current Status</p>
                      <p className={`font-bold ${selectedEmployee.statusColor} flex items-center gap-2 mt-1 text-lg`}>
                         <Circle size={12} fill="currentColor" /> {selectedEmployee.status}
                      </p>
                   </div>
                </div>
             </div>
             <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Activity size={18} className="text-emerald-500"/> Performance Metrics</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center p-5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-700/50 shadow-sm">
                      <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2"><Briefcase size={18} className="text-blue-500"/> Active Leads</span>
                      <span className="font-bold text-gray-900 dark:text-white text-2xl">{selectedEmployee.activeLeads}</span>
                   </div>
                   <div className="flex justify-between items-center p-5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-700/50 shadow-sm">
                      <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-2"><MessageSquare size={18} className="text-amber-500"/> Open Tickets</span>
                      <span className="font-bold text-gray-900 dark:text-white text-2xl">{selectedEmployee.openTickets}</span>
                   </div>

                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPerformance;
