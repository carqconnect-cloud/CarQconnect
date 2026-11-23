"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Users, Cpu, Layers, ChevronDown, Mail, PhoneCall, X, User, MapPin, Building, Calendar, DollarSign, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth, invalidateCrmCache } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

const LeadAssignment = () => {
  const [activeTab, setActiveTab] = useState<'unassigned' | 'active'>('unassigned');
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [selectedActiveLeads, setSelectedActiveLeads] = useState<number[]>([]);
  const [detailedLead, setDetailedLead] = useState<any | null>(null);
  const [assignmentValue, setAssignmentValue] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [filterSource, setFilterSource] = useState<string>('All');
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { user, token } = useAuth();
  const [unassignedLeads, setUnassignedLeads] = useState<any[]>([]);
  const [activeLeads, setActiveLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [allLeads, setAllLeads] = useState<any[]>([]);

  useEffect(() => {
    const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('fioner_auth_token') || localStorage.getItem('token')) : null);
    if (!activeToken) return;
    const API_BASE = getApiBaseUrl();

    const fetchLeads = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/crm/leads`, {
          headers: {
            'Authorization': `Bearer ${activeToken}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const items = Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.data?.items)
              ? data.data.items
              : Array.isArray(data.items)
                ? data.items
                : Array.isArray(data)
                  ? data
                  : [];
          if (items.length > 0) {
            setAllLeads(items);
          }
        }
      } catch (err) {
        console.error('Failed to fetch real leads', err);
      }
    };

    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/users`, {
          headers: {
            'Authorization': `Bearer ${activeToken}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.data) {
            setUsers(data.data.map((u: any) => ({ 
              id: u.id, 
              userId: u.userId || u.user?.id,
              name: `${u.firstName || u.user?.firstName || ''} ${u.lastName || u.user?.lastName || ''}`.trim(), 
              role: u.role,
              teamId: u.team?.id || u.teamId
            })));
          }
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };

    const fetchTeams = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/crm/teams`, {
          headers: { 
            'Authorization': `Bearer ${activeToken}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.data) {
            const myTeam = data.data.find((t: any) => t.headId === user?.id);
            if (myTeam) {
              setMyTeamId(myTeam.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch teams', err);
      }
    };

    fetchLeads();
    fetchUsers();
    fetchTeams();
  }, [token, user?.id]);

  useEffect(() => {
    if (allLeads.length > 0) {
      // Find team members IDs
      const teamMemberIds = users
        .filter(u => u.teamId === myTeamId && u.role === 'EXECUTIVE')
        .map(u => u.id); // u.id is the UserTeam.id which matches ownerId

      const fetchedUnassigned = allLeads
        .filter((l: any) => l.ownerId === user?.id || l.ownerId === users.find(u => u.userId === user?.id)?.id)
        .map((l: any) => ({
          id: l.id,
          name: l.name || `${l.firstName || ''} ${l.lastName || ''}`.trim() || '-',
          email: l.email || '-',
          phone: l.phone || '-',
          company: l.company || 'Unknown',
          location: l.location || '-',
          source: l.source || 'Website Demo',
          value: l.value ? `$${l.value}` : '-',
          time: new Date(l.createdAt).toLocaleDateString(),
          status: l.status === 'NEW' ? 'New' : l.status,
          notes: l.notes || '-'
        }));
        
      const fetchedActive = allLeads
        .filter((l: any) => l.ownerId && teamMemberIds.includes(l.ownerId))
        .map((l: any) => {
          const assignedUser = users.find(u => u.id === l.ownerId);
          return {
            id: l.id,
            name: l.name || `${l.firstName || ''} ${l.lastName || ''}`.trim() || '-',
            email: l.email || '-',
            phone: l.phone || '-',
            company: l.company || 'Unknown',
            location: l.location || '-',
            source: l.source || 'Website Demo',
            value: l.value ? `$${l.value}` : '-',
            assignedTo: assignedUser ? assignedUser.name : (l.assignedTo?.name || l.assignedToId),
            time: new Date(l.createdAt).toLocaleDateString(),
            status: l.status,
            notes: l.notes || '-'
          };
        });
        
      setUnassignedLeads(fetchedUnassigned);
      setActiveLeads(fetchedActive);
    }
  }, [allLeads, users, myTeamId, user?.id]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      if (activeTab === 'unassigned') setSelectedLeads(unassignedLeads.map(l => l.id));
      if (activeTab === 'active') setSelectedActiveLeads(activeLeads.map(l => l.id));
    } else {
      if (activeTab === 'unassigned') setSelectedLeads([]);
      if (activeTab === 'active') setSelectedActiveLeads([]);
    }
  };

  const handleSelectLead = (e: React.MouseEvent, id: number, isUnassigned: boolean) => {
    e.stopPropagation();
    if (isUnassigned) {
      if (selectedLeads.includes(id)) {
        setSelectedLeads(selectedLeads.filter(lId => lId !== id));
      } else {
        setSelectedLeads([...selectedLeads, id]);
      }
    } else {
      if (selectedActiveLeads.includes(id)) {
        setSelectedActiveLeads(selectedActiveLeads.filter(lId => lId !== id));
      } else {
        setSelectedActiveLeads([...selectedActiveLeads, id]);
      }
    }
  };

  const openLeadDetail = (lead: any) => {
    setDetailedLead(lead);
    setAssignmentValue(lead.assignedTo || '');
  };

  const handleAssignLead = async () => {
    if (!assignmentValue) {
      toast.error('Please select an executive');
      return;
    }
    
    try {
      const API_BASE = getApiBaseUrl();
      const res = await fetch(`${API_BASE}/api/v1/crm/leads/${detailedLead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ownerId: assignmentValue })
      });
      
      if (res.ok) {
        invalidateCrmCache('/api/v1/crm/leads');
        toast.success('Lead assigned successfully');
        setDetailedLead(null);
        // Refresh leads
        window.location.reload(); // Simple way to refresh data or call fetchLeads if it was accessible outside useEffect
      } else {
        toast.error('Failed to assign lead');
      }
    } catch (e) {
      toast.error('Error assigning lead');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'In Conversation': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Negotiation': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Assignment Engine</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Distribute incoming leads to your team members.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm border-b-4 border-b-blue-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-3 mb-4 text-blue-600 dark:text-blue-400">
            <Layers size={20} className="shrink-0 mt-0.5" />
            <h3 className="font-semibold leading-tight">Unassigned Pool</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{unassignedLeads.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm border-b-4 border-b-emerald-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
            <Users size={20} className="shrink-0 mt-0.5" />
            <h3 className="font-semibold leading-tight">Active Team Leads</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeLeads.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800 mt-2">
        <button
          onClick={() => { setActiveTab('unassigned'); setSelectedActiveLeads([]); }}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'unassigned' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Unassigned Pool
          {activeTab === 'unassigned' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button
          onClick={() => { setActiveTab('active'); setSelectedLeads([]); }}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Active Team Leads
          {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder={`Search ${activeTab} leads...`} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
          </div>

          {/* Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(prev => !prev)}
              className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border transition-all ${
                (activeTab === 'active' && filterAssignee !== 'All') || (activeTab === 'unassigned' && filterSource !== 'All')
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                  : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
              }`}
            >
              <Filter size={15} />
              {activeTab === 'active'
                ? filterAssignee !== 'All' ? `Assignee: ${filterAssignee.split(' ')[0]}` : 'Filter'
                : filterSource !== 'All' ? `Source: ${filterSource}` : 'Filter'
              }
              {((activeTab === 'active' && filterAssignee !== 'All') || (activeTab === 'unassigned' && filterSource !== 'All')) && (
                <span className="w-2 h-2 rounded-full bg-blue-500 ml-0.5" />
              )}
              <ChevronDown size={14} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-3 pt-3 pb-1">
                  <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                    {activeTab === 'active' ? 'Filter by Assignee' : 'Filter by Source'}
                  </p>
                </div>
                <div className="py-1">
                  {activeTab === 'active' ? (
                    ['All', 'Sarah Jenkins', 'Mike Smith', 'Emily Chen'].map(name => (
                      <button
                        key={name}
                        onClick={() => { setFilterAssignee(name); setFilterOpen(false); }}
                        className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                          filterAssignee === name
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                            : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          filterAssignee === name ? 'bg-blue-500' : 'bg-transparent'
                        }`} />
                        {name}
                      </button>
                    ))
                  ) : (
                    ['All', 'Website Demo', 'Inbound Call', 'Referral', 'Organic Search', 'Paid Ads'].map(src => (
                      <button
                        key={src}
                        onClick={() => { setFilterSource(src); setFilterOpen(false); }}
                        className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                          filterSource === src
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                            : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          filterSource === src ? 'bg-blue-500' : 'bg-transparent'
                        }`} />
                        {src}
                      </button>
                    ))
                  )}
                </div>
                {((activeTab === 'active' && filterAssignee !== 'All') || (activeTab === 'unassigned' && filterSource !== 'All')) && (
                  <div className="border-t border-gray-100 dark:border-zinc-700 px-3 py-2">
                    <button
                      onClick={() => { setFilterAssignee('All'); setFilterSource('All'); setFilterOpen(false); }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Clear filter
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {activeTab === 'unassigned' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] uppercase tracking-wider font-bold text-gray-500 dark:text-white">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Source</th>
                <th className="p-4">Time in Queue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {unassignedLeads.filter(lead => filterSource === 'All' || lead.source === filterSource).map((lead) => (
                <tr key={lead.id} onClick={() => openLeadDetail(lead)} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${selectedLeads.includes(lead.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <td className="p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[150px]">{lead.email}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <span>{lead.phone}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{lead.source}</td>
                  <td className="p-4 text-sm text-gray-500 dark:text-zinc-400">{lead.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'active' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] uppercase tracking-wider font-bold text-gray-500 dark:text-white">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Phone No.</th>
                <th className="p-4">Stage</th>
                <th className="p-4">Source</th>
                <th className="p-4">Current Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {activeLeads.filter(lead => filterAssignee === 'All' || lead.assignedTo === filterAssignee).map((lead) => (
                <tr key={lead.id} onClick={() => openLeadDetail(lead)} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${selectedActiveLeads.includes(lead.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <td className="p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[150px]">{lead.email}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <span>{lead.phone}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-600 dark:text-zinc-300">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{lead.source}</td>
                  <td className="p-4 text-sm font-bold text-gray-900 dark:text-white">{lead.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {(selectedLeads.length > 0 || selectedActiveLeads.length > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-zinc-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10 fade-in border border-gray-700 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{selectedLeads.length + selectedActiveLeads.length}</div>
            <span className="font-medium text-sm">Leads Selected</span>
          </div>
          <div className="h-6 w-px bg-gray-700"></div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">Assign all to:</span>
            <select 
              id="bulkAssignSelect"
              className="bg-gray-800 dark:bg-zinc-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Select Executive...</option>
              {(() => {
                const members = users.filter(u => u.teamId === myTeamId && u.role === 'EXECUTIVE');
                return members.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ));
              })()}
            </select>
            <button 
              onClick={async () => { 
                const selectEl = document.getElementById('bulkAssignSelect') as HTMLSelectElement;
                const ownerId = selectEl.value;
                if (!ownerId) {
                  toast.error('Please select an executive');
                  return;
                }
                const allSelected = [...selectedLeads, ...selectedActiveLeads];
                const API_BASE = getApiBaseUrl();
                try {
                  await Promise.all(allSelected.map(id => 
                    fetch(`${API_BASE}/api/v1/crm/leads/${id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ ownerId })
                    })
                  ));
                  invalidateCrmCache('/api/v1/crm/leads');
                  toast.success('Bulk assignment complete!');
                  setSelectedLeads([]); 
                  setSelectedActiveLeads([]); 
                  window.location.reload();
                } catch (e) {
                  toast.error('Error in bulk assignment');
                }
              }} 
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-4 rounded-lg shadow-sm transition-colors ml-2"
            >
              Confirm Assignment
            </button>
          </div>
        </div>
      )}

      {/* Detailed Lead Modal */}
      {detailedLead && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-zinc-800 relative bg-gray-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-inner">
                  {detailedLead.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {detailedLead.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                    <Building size={14} /> {detailedLead.company || 'Unknown Company'}
                  </p>
                </div>
              </div>
              <button onClick={() => setDetailedLead(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors bg-white dark:bg-zinc-800 p-2 rounded-full shadow-sm border border-gray-100 dark:border-zinc-700">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-8">

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Contact Information</h3>
                  <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl space-y-3 border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300">
                      <Mail size={16} className="text-gray-400" />
                      <span>{detailedLead.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300">
                      <PhoneCall size={16} className="text-gray-400" />
                      <span>{detailedLead.phone}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300">
                      <MapPin size={16} className="text-gray-400" />
                      <span>{detailedLead.location || 'Location not specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Lead Details</h3>
                  <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl space-y-3 border border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300">
                      <Target size={16} className="text-gray-400" />
                      <span>Source: <span className="font-medium text-gray-900 dark:text-white">{detailedLead.source}</span></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300">
                      <DollarSign size={16} className="text-emerald-500" />
                      <span>Value: <span className="font-medium text-emerald-600 dark:text-emerald-400">{detailedLead.value}</span></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-zinc-300">
                      <Calendar size={16} className="text-gray-400" />
                      <span>Since: <span className="font-medium text-gray-900 dark:text-white">{detailedLead.time}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Notes & Context</h3>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {detailedLead.notes || 'No additional notes provided.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer (Assignment) */}
            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Assign Lead to Executive</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={assignmentValue}
                  onChange={(e) => setAssignmentValue(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer shadow-sm"
                >
                  <option value="" disabled>Select Executive...</option>
                  {(() => {
                    const members = users.filter(u => u.teamId === myTeamId && u.role === 'EXECUTIVE');
                    return members.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ));
                  })()}
                </select>
                <button
                  onClick={handleAssignLead}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <User size={16} /> Assign Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeadAssignment;
