"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, AlertTriangle, Clock, MessageSquare, Tag, AlertCircle, ArrowLeft, Send, Users, UserPlus, LifeBuoy, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

interface TicketItem {
  id: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  issue: string;
  description: string;
  priority: string;
  status: string;
  time: string;
  assigned: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
  assignedToRole?: string | null;
  assignedById?: string | null;
  assignedByName?: string | null;
  assignedByRole?: string | null;
  tags: string[];
}

const API_BASE = getApiBaseUrl();

const TicketQueue = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'escalated'>('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [liveTickets, setLiveTickets] = useState<TicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Executive selection in assign modal
  const [selectedExec, setSelectedExec] = useState('Executive Employee');
  const [availableExecutives, setAvailableExecutives] = useState<{ id: string; name: string }[]>([
    { id: 'exec-1', name: 'Executive Employee' },
    { id: 'exec-2', name: 'Emily' },
    { id: 'exec-3', name: 'Sarah' },
    { id: 'exec-4', name: 'Mike' },
  ]);

  // Reply state in ticket view
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<{ sender: string; text: string; time: string; isLead: boolean }[]>([]);
  const [privateNote, setPrivateNote] = useState('');
  const [savedNotes, setSavedNotes] = useState<string[]>([]);

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('fioner_auth_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/crm/tickets`, { headers });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : (Array.isArray(json.data?.items) ? json.data.items : []);
        
        const mapped: TicketItem[] = items.map((t: any) => ({
          id: t.id,
          customer: t.customer || 'Customer',
          customerEmail: t.customerEmail || '',
          customerPhone: t.customerPhone || '',
          issue: t.subject || 'Support Request',
          description: t.description || '',
          priority: t.priority || 'Medium',
          status: t.status || 'Open',
          time: t.time || 'Recently',
          assigned: t.assignee || (t.assignedToName || 'Unassigned'),
          assignedToId: t.assignedToId,
          assignedToName: t.assignedToName,
          assignedToRole: t.assignedToRole,
          assignedById: t.assignedById,
          assignedByName: t.assignedByName,
          assignedByRole: t.assignedByRole,
          tags: t.tags || ['Mobile App', t.category || 'General'],
        }));

        setLiveTickets(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Fetch real executive list if possible
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('fioner_auth_token') || localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/v1/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          const items = Array.isArray(json.data) ? json.data : (Array.isArray(json.data?.items) ? json.data.items : []);
          const execs = items
            .filter((u: any) => u.role === 'EXECUTIVE' || u.rawRole === 'EXECUTIVE' || !u.role || u.role === 'Employee')
            .map((u: any) => ({
              id: u.id,
              name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email
            }))
            .filter((u: any) => u.name);

          if (execs.length > 0) {
            setAvailableExecutives(prev => {
              const combined = [...execs];
              prev.forEach(p => {
                if (!combined.some(c => c.name.toLowerCase() === p.name.toLowerCase())) {
                  combined.push(p);
                }
              });
              return combined;
            });
            setSelectedExec(execs[0].name);
          }
        }
      } catch (_) {}
    };
    fetchUsers();
  }, []);

  // Show ONLY tickets assigned by Admin
  // (i.e. assignedByRole === 'ADMIN' or assignedToRole === 'TEAM_HEAD')
  const assignedByAdminTickets = liveTickets.filter(t => {
    return t.assignedByRole === 'ADMIN' || t.assignedToRole === 'TEAM_HEAD';
  });

  const filteredTickets = assignedByAdminTickets.filter(t => {
    const matchesTab = activeTab === 'all' || (activeTab === 'escalated' && t.status === 'Escalated');
    const matchesSearch = 
      t.issue.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigned.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesTab && matchesSearch && matchesStatus;
  });

  const handleAssignExecutive = async () => {
    if (!selectedTicket) return;
    try {
      const token = localStorage.getItem('fioner_auth_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const targetExec = availableExecutives.find(e => e.name === selectedExec) || { id: 'exec', name: selectedExec };
      const ticketParam = encodeURIComponent(selectedTicket.id);

      const res = await fetch(`${API_BASE}/api/v1/crm/tickets/${ticketParam}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: selectedTicket.id,
          ticketId: selectedTicket.id,
          assignedToId: targetExec.id,
          assignedToName: targetExec.name,
          assignedToRole: 'EXECUTIVE',
          assignedById: user?.id || 'teamhead-001',
          assignedByName: user?.name || 'Team Head',
          assignedByRole: 'TEAM_HEAD'
        })
      });

      if (res.ok) {
        toast.success(`Ticket assigned to ${targetExec.name}`);
        setSelectedTicket(prev => prev ? { ...prev, assigned: targetExec.name, assignedToName: targetExec.name } : null);
        setShowAssignModal(false);
        fetchTickets();
      } else {
        toast.error('Failed to assign ticket.');
      }
    } catch (err) {
      toast.error('Network error assigning ticket.');
    }
  };

  const handleTakeOverTicket = async () => {
    if (!selectedTicket) return;
    try {
      const token = localStorage.getItem('fioner_auth_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const leadName = user?.name || 'Team Head';
      const ticketParam = encodeURIComponent(selectedTicket.id);

      const res = await fetch(`${API_BASE}/api/v1/crm/tickets/${ticketParam}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: selectedTicket.id,
          ticketId: selectedTicket.id,
          assignedToId: user?.id || 'teamhead-001',
          assignedToName: leadName,
          assignedToRole: 'TEAM_HEAD',
          assignedById: user?.id || 'teamhead-001',
          assignedByName: leadName,
          assignedByRole: 'TEAM_HEAD'
        })
      });

      if (res.ok) {
        toast.success('You have taken over this ticket');
        setSelectedTicket(prev => prev ? { ...prev, assigned: leadName, assignedToName: leadName } : null);
        fetchTickets();
      } else {
        toast.error('Failed to take over ticket.');
      }
    } catch (_) {
      toast.error('Error updating ticket.');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      const token = localStorage.getItem('fioner_auth_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const ticketParam = encodeURIComponent(selectedTicket.id);

      const res = await fetch(`${API_BASE}/api/v1/crm/tickets/${ticketParam}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id: selectedTicket.id, ticketId: selectedTicket.id, status: newStatus })
      });

      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`);
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
        fetchTickets();
      } else {
        toast.error('Failed to update status.');
      }
    } catch (_) {
      toast.error('Error updating status.');
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setReplies(prev => [
      ...prev,
      {
        sender: user?.name || 'Team Head',
        text: replyText.trim(),
        time: 'Just now',
        isLead: true
      }
    ]);
    setReplyText('');
    toast.success('Reply sent to customer');
  };

  const handleSaveNote = () => {
    if (!privateNote.trim()) return;
    setSavedNotes(prev => [privateNote.trim(), ...prev]);
    setPrivateNote('');
    toast.success('Private note saved');
  };

  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedTicket(null)} 
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to {activeTab === 'escalated' ? 'Escalation Queue' : 'Ticket List'}
          </button>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setShowAssignModal(true)} 
               className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
             >
               <UserPlus size={16} /> Assign to Executive
             </button>
             <button 
               onClick={handleTakeOverTicket}
               className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
             >
               <AlertCircle size={16} /> Take Over Ticket
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col h-[650px] relative overflow-hidden">
            {/* Header */}
            <div className={`p-6 border-b border-gray-100 dark:border-zinc-800 ${selectedTicket.status === 'Escalated' ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-gray-50/50 dark:bg-zinc-900/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-mono text-sm font-bold ${selectedTicket.status === 'Escalated' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'}`}>
                  {selectedTicket.id}
                </span>
                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                    selectedTicket.status === 'Escalated' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' : 
                    selectedTicket.priority === 'Critical' || selectedTicket.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                    'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  {selectedTicket.priority} Priority
                </span>
                <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Assigned by {selectedTicket.assignedByName || 'Admin'}
                </span>
                {(selectedTicket.tags || []).map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTicket.issue}</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                From <span className="font-semibold text-gray-800 dark:text-zinc-200">{selectedTicket.customer}</span>
                {selectedTicket.customerPhone ? ` • ${selectedTicket.customerPhone}` : ''}
                {selectedTicket.customerEmail ? ` • ${selectedTicket.customerEmail}` : ''}
                {` • Opened ${selectedTicket.time}`}
              </p>
            </div>
            
            {/* Chat History */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50/50 dark:bg-zinc-900/50">
              {selectedTicket.status === 'Escalated' && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 text-sm">
                  <p className="font-bold text-amber-800 dark:text-amber-500 mb-1 flex items-center gap-2">
                    <AlertTriangle size={16}/> Escalation Note ({selectedTicket.assigned !== 'Unassigned' ? selectedTicket.assigned : 'Admin Assignment'})
                  </p>
                  <p className="text-amber-900 dark:text-amber-400">
                    This ticket has been escalated for high priority attention. Please review details and delegate or resolve immediately.
                  </p>
                </div>
              )}

              {/* Customer original issue message */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedTicket.customer.slice(0, 2).toUpperCase()}
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-zinc-700 shadow-sm text-sm text-gray-700 dark:text-zinc-300 max-w-lg">
                  <p className="font-bold text-gray-900 dark:text-white mb-1">
                    {selectedTicket.customer} <span className="font-normal text-xs text-gray-500 ml-2">{selectedTicket.time}</span>
                  </p>
                  <p className="whitespace-pre-wrap">{selectedTicket.description || `Customer reported: ${selectedTicket.issue}`}</p>
                </div>
              </div>

              {/* Dynamic replies thread */}
              {replies.map((r, i) => (
                <div key={i} className="flex gap-4 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    TH
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl rounded-tr-none border border-emerald-100 dark:border-emerald-800 shadow-sm text-sm text-gray-700 dark:text-zinc-300 max-w-lg">
                    <p className="font-bold text-gray-900 dark:text-white mb-1">
                      {r.sender} <span className="font-normal text-xs text-gray-500 ml-2">{r.time}</span>
                    </p>
                    <p className="whitespace-pre-wrap">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Reply Input */}
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="relative">
                <textarea 
                  placeholder="Type your response to the customer..." 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  className="w-full px-4 py-3 pr-12 text-sm border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white resize-none"
                  rows={3}
                ></textarea>
                <button 
                  onClick={handleSendReply}
                  disabled={!replyText.trim()}
                  className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Ticket Assignment</h3>
              <div className="p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-xl border border-gray-200 dark:border-zinc-700 mb-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-zinc-400">Assigned By:</span>
                  <span className="font-semibold text-gray-800 dark:text-zinc-200">{selectedTicket.assignedByName || 'Admin'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-zinc-400">Currently Assigned:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{selectedTicket.assigned}</span>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Update Status</h3>
              <select 
                value={selectedTicket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4 cursor-pointer"
              >
                 <option value="Open">Open</option>
                 <option value="In Progress">In Progress</option>
                 <option value="Escalated">Escalated</option>
                 <option value="Stalled">Mark as Stalled</option>
                 <option value="Pending Approval">Pending Approval</option>
                 <option value="Resolved">Resolved</option>
                 <option value="Closed">Closed</option>
              </select>

              <h3 className="font-bold text-gray-900 dark:text-white mb-3 mt-6 text-sm">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowAssignModal(true)}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium transition-colors text-gray-700 dark:text-zinc-300 flex items-center justify-between cursor-pointer"
                >
                  <span>Reassign to Executive</span>
                  <UserPlus size={16} className="text-gray-400" />
                </button>
                <button 
                  onClick={() => handleStatusChange('Resolved')}
                  className="w-full text-left px-4 py-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-sm font-medium transition-colors text-emerald-800 dark:text-emerald-300 flex items-center justify-between cursor-pointer"
                >
                  <span>Mark as Resolved</span>
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                </button>
              </div>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900/30 p-6">
              <h3 className="font-bold text-amber-800 dark:text-amber-500 mb-4 flex items-center gap-2">
                <AlertTriangle size={18} /> Team Head Private Notes
              </h3>
              <textarea 
                  placeholder="Add private note (visible to team only)..." 
                  value={privateNote}
                  onChange={(e) => setPrivateNote(e.target.value)}
                  className="w-full px-3 py-3 text-sm border border-amber-200 dark:border-amber-900/50 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-amber-100 resize-none mb-3"
                  rows={4}
              ></textarea>
              <button 
                onClick={handleSaveNote}
                disabled={!privateNote.trim()}
                className="w-full text-center text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Save Note
              </button>

              {savedNotes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-900/40 space-y-2">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase">Recent Notes:</p>
                  {savedNotes.map((note, idx) => (
                    <div key={idx} className="p-2.5 bg-white/70 dark:bg-zinc-800/70 rounded-lg text-xs text-amber-900 dark:text-amber-200 border border-amber-100 dark:border-amber-900/30">
                      {note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assign Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assign to Executive</h2>
                  <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Select Executive</label>
                      <select 
                        value={selectedExec}
                        onChange={(e) => setSelectedExec(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                      >
                         {availableExecutives.map(exec => (
                           <option key={exec.id || exec.name} value={exec.name}>{exec.name}</option>
                         ))}
                      </select>
                   </div>
                   <button 
                     onClick={handleAssignExecutive} 
                     className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-sm"
                   >
                      Confirm Assignment
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Support Queue</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Support tickets assigned by Admin for team resolution and delegation.
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800 mb-6 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap cursor-pointer ${activeTab === 'all' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Assigned by Admin
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs rounded-full font-bold">
            {assignedByAdminTickets.length}
          </span>
          {activeTab === 'all' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('escalated')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 cursor-pointer ${activeTab === 'escalated' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Escalation Queue
          <span className="px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-full font-bold">
            {assignedByAdminTickets.filter(t => t.status === 'Escalated').length}
          </span>
          {activeTab === 'escalated' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-red-400"></div>}
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search assigned tickets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" 
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full sm:w-auto pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Escalated">Escalated</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Stalled">Stalled</option>
              <option value="Resolved">Resolved</option>
            </select>
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {filteredTickets.map(ticket => (
            <div 
              key={ticket.id} 
              onClick={() => setSelectedTicket(ticket)} 
              className={`p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between group cursor-pointer ${ticket.status === 'Escalated' ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl mt-1 shrink-0 ${ticket.priority === 'Critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : ticket.priority === 'High' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-gray-100 text-gray-600 dark:bg-zinc-800'}`}>
                  {ticket.status === 'Escalated' ? <AlertCircle size={20} /> : <MessageSquare size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-500">{ticket.id}</span>
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${ticket.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ticket.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                      {ticket.priority}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Assigned by {ticket.assignedByName || 'Admin'}
                    </span>
                    {(ticket.tags || []).map((tag: string) => (
                      <span key={tag} className="flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className={`text-sm font-bold mt-1 ${ticket.status === 'Resolved' ? 'text-gray-500 dark:text-zinc-500 line-through' : 'text-gray-900 dark:text-white'}`}>{ticket.issue}</h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{ticket.customer} • {ticket.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                   <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Assigned To</p>
                   <p className={`text-sm font-bold ${ticket.assigned === 'Unassigned' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                     {ticket.assigned}
                   </p>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-zinc-700 hidden sm:block"></div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full min-w-[110px] text-center ${
                  ticket.status === 'Escalated' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-2 ring-red-500/20' : 
                  ticket.status === 'Stalled' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ring-2 ring-amber-500/20' : 
                  ticket.status === 'Pending Approval' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                  ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'}`}>
                  {ticket.status}
                </span>
              </div>
            </div>
          ))}

          {!isLoading && filteredTickets.length === 0 && (
             <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                  <LifeBuoy size={24} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">No Tickets Assigned by Admin</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 max-w-sm">
                  {searchQuery || statusFilter !== 'All' 
                    ? 'No assigned tickets match your current filters.' 
                    : 'There are currently no support tickets assigned by the administrator to your team.'}
                </p>
             </div>
          )}

          {isLoading && (
            <div className="p-12 text-center text-sm text-gray-500 dark:text-zinc-400">
              Loading assigned support queue...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketQueue;
