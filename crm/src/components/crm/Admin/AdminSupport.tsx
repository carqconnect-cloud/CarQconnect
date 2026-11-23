"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, CheckCircle2, MessageSquare, Clock, UserPlus, AlertTriangle, ArrowLeft, Send, LifeBuoy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

interface AdminTicketItem {
  id: string;
  subject: string;
  description?: string;
  source: string;
  status: string;
  assignee: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
  assignedToRole?: string | null;
  assignedById?: string | null;
  assignedByName?: string | null;
  assignedByRole?: string | null;
  time: string;
  customer: string;
  customerEmail?: string;
  customerPhone?: string;
  priority: string;
  tags: string[];
}

interface CrmUserAssignee {
  id: string;
  name: string;
  role: string;
  email?: string;
}

interface AssigneeMeta {
  teamHeads: CrmUserAssignee[];
  employees: CrmUserAssignee[];
  allUsers: CrmUserAssignee[];
}

const API_BASE = getApiBaseUrl();

const AdminSupport = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'directory' | 'escalations'>('directory');
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketItem | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveTickets, setLiveTickets] = useState<AdminTicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Team Heads & Employees from live crm_users table
  const [teamHeadsList, setTeamHeadsList] = useState<CrmUserAssignee[]>([
    { id: 'cmvhmzddb0003i6i4bcnzx3bx', name: 'Akshit Nannaware', role: 'TEAM_HEAD', email: 'akshitnannaware@gmail.com' },
  ]);
  const [employeesList, setEmployeesList] = useState<CrmUserAssignee[]>([
    { id: 'cmvho84xy0001i6uwdmkpcm95', name: 'Executive Employee', role: 'EXECUTIVE', email: 'Employee@fioner.test' },
  ]);

  const [targetHeadId, setTargetHeadId] = useState('cmvhmzddb0003i6i4bcnzx3bx');
  const [targetExecId, setTargetExecId] = useState('');

  // Ticket chat & internal notes
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<{ sender: string; text: string; time: string; isAdmin: boolean }[]>([]);
  const [adminNote, setAdminNote] = useState('');
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
        setLiveTickets(items);
      }
    } catch (err) {
      console.error('Failed to fetch admin tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAssignees = useCallback(async () => {
    try {
      const token = localStorage.getItem('fioner_auth_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/v1/crm/tickets/meta/assignees`, { headers });
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (data.teamHeads && data.teamHeads.length > 0) {
          setTeamHeadsList(data.teamHeads);
          setTargetHeadId(prev => data.teamHeads.some((h: CrmUserAssignee) => h.id === prev) ? prev : data.teamHeads[0].id);
        }
        if (data.employees && data.employees.length > 0) {
          setEmployeesList(data.employees);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchAssignees();
  }, [fetchTickets, fetchAssignees]);

  // Global tickets contains ONLY real data
  const globalTickets = liveTickets;

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
        toast.success(`Ticket status updated to ${newStatus}`);
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
        fetchTickets();
      } else {
        toast.error('Failed to update status');
      }
    } catch (_) {
      toast.error('Error updating status');
    }
  };

  const handleConfirmDelegation = async () => {
    if (!selectedTicket) return;
    try {
      const token = localStorage.getItem('fioner_auth_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
      const isExec = Boolean(targetExecId && targetExecId.trim());
      const selectedEmp = employeesList.find(e => e.id === targetExecId);
      const selectedHead = teamHeadsList.find(h => h.id === targetHeadId) || teamHeadsList[0];
      
      const assigneeId = isExec ? selectedEmp?.id : selectedHead?.id;
      const assigneeName = isExec ? selectedEmp?.name : selectedHead?.name;
      const assignedRole = isExec ? 'EXECUTIVE' : 'TEAM_HEAD';

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
          assignedToId: assigneeId,
          assignedToName: assigneeName,
          assignedToRole: assignedRole,
          assignedById: user?.id || 'admin-001',
          assignedByName: user?.name || 'Admin User',
          assignedByRole: 'ADMIN'
        })
      });

      if (res.ok) {
        toast.success(`Ticket successfully delegated to ${assigneeName}`);
        setSelectedTicket(prev => prev ? { ...prev, assignee: assigneeName || 'Assigned', assignedToName: assigneeName } : null);
        setShowAssignModal(false);
        fetchTickets();
      } else {
        toast.error('Failed to delegate ticket');
      }
    } catch (_) {
      toast.error('Error delegating ticket');
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setReplies(prev => [
      ...prev,
      {
        sender: user?.name ? `${user.name} (Admin)` : 'You (Admin)',
        text: replyText.trim(),
        time: 'Just now',
        isAdmin: true
      }
    ]);
    setReplyText('');
    toast.success('Internal note / response recorded');
  };

  const handleSaveNote = () => {
    if (!adminNote.trim()) return;
    setSavedNotes(prev => [adminNote.trim(), ...prev]);
    setAdminNote('');
    toast.success('Admin note saved');
  };

  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setSelectedTicket(null)} 
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} /> Back to {activeTab === 'escalations' ? 'Escalations' : 'Ticket Directory'}
          </button>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setShowAssignModal(true)} 
               className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
             >
               <UserPlus size={16} /> Assign / Delegate Ticket
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col h-[650px] relative overflow-hidden">
            {/* Header */}
            <div className={`p-6 border-b border-gray-100 dark:border-zinc-800 ${selectedTicket.priority === 'Critical' ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-gray-50/50 dark:bg-zinc-900/50'}`}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`font-mono text-sm font-bold ${selectedTicket.priority === 'Critical' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-zinc-400'}`}>
                  {selectedTicket.id}
                </span>
                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                    selectedTicket.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400' : 
                    selectedTicket.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                    'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  {selectedTicket.priority}
                </span>
                {(selectedTicket.tags || []).map((tag: string) => (
                  <span key={tag} className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTicket.subject}</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                From <span className="font-semibold text-gray-800 dark:text-zinc-200">{selectedTicket.customer}</span> via {selectedTicket.source || 'Mobile App'} • {selectedTicket.time}
                {selectedTicket.customerPhone ? ` • ${selectedTicket.customerPhone}` : ''}
                {selectedTicket.customerEmail ? ` • ${selectedTicket.customerEmail}` : ''}
              </p>
            </div>
            
            {/* Chat History */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50/50 dark:bg-zinc-900/50">
              {selectedTicket.status === 'Escalated' && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl p-4 text-sm">
                  <p className="font-bold text-red-800 dark:text-red-500 mb-1 flex items-center gap-2"><AlertTriangle size={16}/> SLA Breach / Escalation (Admin Review Required)</p>
                  <p className="text-red-900 dark:text-red-400">This ticket has been escalated and requires administrative intervention or team reassignment.</p>
                </div>
              )}

              {/* Customer original issue */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedTicket.customer.slice(0, 2).toUpperCase()}
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-zinc-700 shadow-sm text-sm text-gray-700 dark:text-zinc-300 max-w-lg">
                  <p className="font-bold text-gray-900 dark:text-white mb-1">{selectedTicket.customer} <span className="font-normal text-xs text-gray-500 ml-2">Ticket Opened</span></p>
                  <p className="whitespace-pre-wrap">{selectedTicket.description || `Reporting issue: ${selectedTicket.subject}. We need this resolved as soon as possible.`}</p>
                </div>
              </div>
              
              {/* Admin reply card */}
              <div className="flex gap-4 flex-row-reverse relative z-10">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100 dark:ring-emerald-900/30">
                  AD
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl rounded-tr-none border border-emerald-200 dark:border-emerald-800 shadow-sm text-sm text-gray-700 dark:text-zinc-300 max-w-lg">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">You (Admin) <span className="font-normal text-xs text-gray-500 ml-2">Just now</span></p>
                  <p className="font-medium">
                    {selectedTicket.assignee && selectedTicket.assignee !== 'Unassigned' 
                      ? `Ticket delegated to ${selectedTicket.assignee} for resolution.`
                      : 'Reviewing the ticket status and delegating to the appropriate team for immediate resolution.'}
                  </p>
                </div>
              </div>

              {/* Additional dynamic replies */}
              {replies.map((r, i) => (
                <div key={i} className="flex gap-4 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    AD
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl rounded-tr-none border border-emerald-200 dark:border-emerald-800 shadow-sm text-sm text-gray-700 dark:text-zinc-300 max-w-lg">
                    <p className="font-bold text-gray-900 dark:text-white mb-1">{r.sender} <span className="font-normal text-xs text-gray-500 ml-2">{r.time}</span></p>
                    <p className="whitespace-pre-wrap">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Input */}
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="relative">
                <textarea 
                  placeholder="Type an internal note or reply to the customer..." 
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
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">Ticket Status</h3>
              <select 
                value={selectedTicket.status} 
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4 cursor-pointer"
              >
                 <option value="Open">Open</option>
                 <option value="In Progress">In Progress</option>
                 <option value="Pending Customer">Pending Customer</option>
                 <option value="Escalated">Escalated</option>
                 <option value="Resolved">Resolved</option>
              </select>

              <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-700">
                 <p className="text-xs font-bold text-gray-500 dark:text-zinc-400 mb-1">Current Assignee</p>
                 <p className={`text-sm font-bold ${selectedTicket.assignee === 'Unassigned' ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                   {selectedTicket.assignee}
                 </p>
                 <button 
                   onClick={() => setShowAssignModal(true)} 
                   className="mt-3 w-full text-center text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 py-2 rounded-lg transition-colors border border-blue-200 dark:border-blue-900/30 cursor-pointer"
                 >
                   Change Assignee
                 </button>
              </div>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl shadow-sm border border-amber-200 dark:border-amber-900/30 p-6">
              <h3 className="font-bold text-amber-800 dark:text-amber-500 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} /> Admin Internal Notes
              </h3>
              <textarea 
                  placeholder="Add notes (invisible to customer)..." 
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-3 py-3 text-sm border border-amber-200 dark:border-amber-900/50 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-amber-100 resize-none mb-3"
                  rows={4}
              ></textarea>
              <button 
                onClick={handleSaveNote}
                disabled={!adminNote.trim()}
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

        {/* Assign Modal with Real Teams and Employees */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assign Ticket</h2>
                  <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Select Team Head</label>
                      <select 
                        value={targetHeadId}
                        onChange={(e) => setTargetHeadId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-3 cursor-pointer font-medium"
                      >
                         {teamHeadsList.map(head => (
                           <option key={head.id} value={head.id}>
                             {head.name} (Team Head)
                           </option>
                         ))}
                      </select>
                      {(() => {
                        const currentHead = teamHeadsList.find(h => h.id === targetHeadId) || teamHeadsList[0];
                        if (!currentHead) return null;
                        return (
                          <div className="p-3 bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                {currentHead.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                                  {currentHead.name}
                                </p>
                                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                  {currentHead.email || 'Team Head'}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                              Team Head
                            </span>
                          </div>
                        );
                      })()}
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Or Specific Employee / Executive (Optional)</label>
                      <select 
                        value={targetExecId}
                        onChange={(e) => setTargetExecId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                      >
                         <option value="">-- Let Team Head Decide --</option>
                         {employeesList.map(emp => (
                           <option key={emp.id} value={emp.id}>
                             {emp.name} ({emp.role === 'TEAM_HEAD' ? 'Team Head' : emp.role === 'ADMIN' ? 'Admin' : 'Executive'})
                           </option>
                         ))}
                      </select>
                   </div>
                   <button 
                     onClick={handleConfirmDelegation} 
                     className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-sm"
                   >
                      Confirm Delegation
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Support Operations</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Monitor SLA compliance and ticket resolution across all teams.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800 mb-6">
        <button 
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative cursor-pointer ${activeTab === 'directory' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Ticket Directory
          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs rounded-full font-bold">
            {globalTickets.length}
          </span>
          {activeTab === 'directory' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('escalations')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative cursor-pointer ${activeTab === 'escalations' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Escalations & SLA
          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-full font-bold">
            {globalTickets.filter(t => t.status === 'Escalated' || t.priority === 'Critical').length}
          </span>
          {activeTab === 'escalations' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
      </div>

      {activeTab === 'directory' && (() => {
        const filteredTickets = globalTickets.filter(t => {
          const matchesSearch = 
            t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
            t.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
            t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.assignee.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = filterStatus === 'All' || t.status.toLowerCase() === filterStatus.toLowerCase();
          return matchesSearch && matchesStatus;
        });

        return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-zinc-900/50">
            <div className="relative w-full sm:w-72">
              <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search global tickets..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" 
              />
            </div>
            <div className="flex items-center gap-2 relative w-full sm:w-auto">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:w-auto bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm rounded-lg px-4 py-2 outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Customer">Pending Customer</option>
                <option value="Escalated">Escalated</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider bg-gray-50 dark:bg-zinc-900/50">
                  <th className="p-4">Ticket ID & Subject</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Assignee</th>
                  <th className="p-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {filteredTickets.map((tkt) => (
                  <tr key={tkt.id} onClick={() => setSelectedTicket(tkt)} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                         <span className="font-mono text-medium font-bold text-gray-500">{tkt.id}</span>
                         <span className={`px-2 py-0.5 text-[10px] uppercase font-medium rounded-full ${tkt.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : tkt.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' : 'bg-gray-100 text-gray-700 dark:bg-zinc-800'}`}>
                           {tkt.priority}
                         </span>
                      </div>
                      <p className="font-bold text-sm text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors">{tkt.subject}</p>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-600 dark:text-zinc-400">{tkt.customer}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        tkt.status === 'Open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                        tkt.status === 'In Progress' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30' :
                        tkt.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                        tkt.status === 'Escalated' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                        'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {tkt.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium">
                      <span className={tkt.assignee === 'Unassigned' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-gray-900 dark:text-white'}>
                        {tkt.assignee}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{tkt.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && filteredTickets.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <LifeBuoy size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No Tickets Found</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 max-w-sm">
                {searchQuery || filterStatus !== 'All' 
                  ? 'No support tickets match your filter criteria.' 
                  : 'There are currently no support tickets in the database.'}
              </p>
            </div>
          )}

          {isLoading && (
            <div className="p-12 text-center text-sm text-gray-500 dark:text-zinc-400">
              Loading support tickets...
            </div>
          )}
        </div>
        );
      })()}

      {activeTab === 'escalations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center gap-2 sm:gap-3 text-blue-600 dark:text-blue-400 mb-2 sm:mb-4">
                <LifeBuoy size={18} className="shrink-0 sm:w-5 sm:h-5" />
                <h3 className="font-semibold text-xs sm:text-sm text-gray-700 dark:text-zinc-300 line-clamp-1">Open Tickets</h3>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                {globalTickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between border-b-4 border-b-red-500">
              <div className="flex items-center gap-2 sm:gap-3 text-red-600 dark:text-red-400 mb-2 sm:mb-4">
                <AlertTriangle size={18} className="shrink-0 sm:w-5 sm:h-5" />
                <h3 className="font-semibold text-xs sm:text-sm text-gray-700 dark:text-zinc-300 line-clamp-1">Critical / Escalated</h3>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                {globalTickets.filter(t => t.status === 'Escalated' || t.priority === 'Critical').length}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center gap-2 sm:gap-3 text-emerald-600 dark:text-emerald-400 mb-2 sm:mb-4">
                <CheckCircle2 size={18} className="shrink-0 sm:w-5 sm:h-5" />
                <h3 className="font-semibold text-xs sm:text-sm text-gray-700 dark:text-zinc-300 line-clamp-1">Resolved</h3>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                {globalTickets.filter(t => t.status === 'Resolved').length}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center gap-2 sm:gap-3 text-indigo-600 dark:text-indigo-400 mb-2 sm:mb-4">
                <Clock size={18} className="shrink-0 sm:w-5 sm:h-5" />
                <h3 className="font-semibold text-xs sm:text-sm text-gray-700 dark:text-zinc-300 line-clamp-1">Total Tickets</h3>
              </div>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                {globalTickets.length}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="font-bold text-gray-900 dark:text-white">Critical & Escalated Tickets</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {globalTickets.filter(t => t.status === 'Escalated' || t.priority === 'Critical').map((ticket) => (
                 <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer group">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-red-100 text-red-600 rounded-lg dark:bg-red-900/30 dark:text-red-400 mt-1">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">{ticket.id}</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {ticket.priority}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors">{ticket.customer}</p>
                        <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">{ticket.subject}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">{ticket.time}</span>
                      <p className="text-xs text-gray-500">Assigned to: {ticket.assignee}</p>
                      <button className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageSquare size={12} /> Intervene
                      </button>
                    </div>
                 </div>
              ))}

              {globalTickets.filter(t => t.status === 'Escalated' || t.priority === 'Critical').length === 0 && (
                <div className="p-12 text-center text-gray-500 dark:text-zinc-400 text-sm">
                  No critical or escalated tickets currently pending.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;
