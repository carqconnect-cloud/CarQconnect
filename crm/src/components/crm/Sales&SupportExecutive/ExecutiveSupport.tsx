"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, AlertTriangle, Clock, CheckCircle2, MessageSquare, ArrowLeft, Send, Paperclip, LifeBuoy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

interface ExecutiveTicketItem {
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
  tags?: string[];
}

const API_BASE = getApiBaseUrl();

const ExecutiveSupport = () => {
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<ExecutiveTicketItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [liveTickets, setLiveTickets] = useState<ExecutiveTicketItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chat reply state
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<{ sender: string; text: string; time: string; isUser: boolean }[]>([]);
  const [internalNote, setInternalNote] = useState('');
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
        
        const mapped: ExecutiveTicketItem[] = items.map((t: any) => ({
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
          tags: t.tags || ['Support'],
        }));

        setLiveTickets(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch executive tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Show ONLY tickets assigned by Admin AND Team Head to this executive
  const myAssignedTickets = liveTickets.filter(t => {
    // Must be assigned by Admin OR Team Head
    const isAssignedByAuthorizedRole = t.assignedByRole === 'ADMIN' || t.assignedByRole === 'TEAM_HEAD';
    if (!isAssignedByAuthorizedRole) return false;

    // Must be assigned to an Executive
    const isAssignedToExecutive = 
      t.assignedToRole === 'EXECUTIVE' ||
      (user?.name && t.assignedToName?.toLowerCase() === user.name.toLowerCase()) ||
      (user?.id && t.assignedToId === user.id) ||
      (t.assigned && t.assigned.toLowerCase().includes('executive')) ||
      (t.assigned && t.assigned !== 'Unassigned' && t.assigned !== 'Team Head');

    return isAssignedToExecutive;
  });

  const filteredTickets = myAssignedTickets.filter(t => {
    const matchesStatus = statusFilter === 'All' || t.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = 
      t.issue.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assigned.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
        toast.error('Failed to update status.');
      }
    } catch (_) {
      toast.error('Error updating status.');
    }
  };

  const handleEscalateToHead = async () => {
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
        body: JSON.stringify({ id: selectedTicket.id, ticketId: selectedTicket.id, status: 'Escalated' })
      });

      if (res.ok) {
        toast.success('Ticket escalated to Team Head');
        setSelectedTicket(prev => prev ? { ...prev, status: 'Escalated' } : null);
        fetchTickets();
      } else {
        toast.error('Failed to escalate ticket.');
      }
    } catch (_) {
      toast.error('Error escalating ticket.');
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setReplies(prev => [
      ...prev,
      {
        sender: 'You',
        text: replyText.trim(),
        time: 'Just now',
        isUser: true,
      }
    ]);
    setReplyText('');
    toast.success('Reply sent to customer');
  };

  const handleSaveInternalNote = () => {
    if (!internalNote.trim()) return;
    setSavedNotes(prev => [internalNote.trim(), ...prev]);
    setInternalNote('');
    toast.success('Internal note saved');
  };

  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedTicket(null)} 
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Support Queue
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col h-[600px] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-sm font-bold text-gray-600 dark:text-zinc-300">{selectedTicket.id}</span>
                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                  selectedTicket.priority === 'Critical' || selectedTicket.priority === 'High' 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}>
                  {selectedTicket.priority} Priority
                </span>
                <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  Assigned by {selectedTicket.assignedByName || (selectedTicket.assignedByRole === 'ADMIN' ? 'Admin' : 'Team Head')}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTicket.issue}</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                From <span className="font-semibold text-gray-800 dark:text-zinc-200">{selectedTicket.customer}</span>
                {selectedTicket.customerPhone ? ` • ${selectedTicket.customerPhone}` : ''}
                {selectedTicket.customerEmail ? ` • ${selectedTicket.customerEmail}` : ''}
                {` • Opened ${selectedTicket.time}`}
              </p>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-gray-50/50 dark:bg-zinc-900/50">
              {/* Customer original issue */}
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedTicket.customer.slice(0, 2).toUpperCase()}
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-zinc-700 shadow-sm text-sm text-gray-700 dark:text-zinc-300 max-w-lg">
                  <p className="font-bold text-gray-900 dark:text-white mb-1">
                    {selectedTicket.customer} <span className="font-normal text-xs text-gray-500 ml-2">{selectedTicket.time}</span>
                  </p>
                  <p className="whitespace-pre-wrap">{selectedTicket.description || `Customer issue report: ${selectedTicket.issue}`}</p>
                </div>
              </div>

              {/* Dynamic replies */}
              {replies.map((r, i) => (
                <div key={i} className="flex gap-4 flex-row-reverse">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    YOU
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl rounded-tr-none border border-blue-100 dark:border-blue-800 shadow-sm text-sm text-gray-700 dark:text-zinc-300 max-w-lg">
                    <p className="font-bold text-gray-900 dark:text-white mb-1">
                      {r.sender} <span className="font-normal text-xs text-gray-500 ml-2">{r.time}</span>
                    </p>
                    <p className="whitespace-pre-wrap">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Bar */}
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="relative">
                <textarea
                  placeholder={`Type your reply to ${selectedTicket.customer}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  className="w-full px-4 py-3 pr-24 text-sm border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white resize-none"
                  rows={3}
                ></textarea>
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button 
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Action Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Assignment Details</h3>
              <div className="p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-xl border border-gray-200 dark:border-zinc-700 mb-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-zinc-400">Assigned By:</span>
                  <span className="font-semibold text-gray-800 dark:text-zinc-200">
                    {selectedTicket.assignedByName || (selectedTicket.assignedByRole === 'ADMIN' ? 'Admin' : 'Team Head')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-zinc-400">Assigned To:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {selectedTicket.assigned}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Update Ticket Status</h3>
              <select 
                value={selectedTicket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4 cursor-pointer"
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending Customer</option>
                <option value="Resolved">Resolved</option>
              </select>

              <button 
                onClick={handleEscalateToHead}
                className="w-full text-center text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <AlertTriangle size={16} />
                Escalate to Team Head
              </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Internal Notes</h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">Add private resolution notes (invisible to customer).</p>
              <textarea
                placeholder="Add notes about troubleshooting steps..."
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                className="w-full px-3 py-3 text-sm border border-amber-200 dark:border-amber-900/50 rounded-xl bg-amber-50 dark:bg-amber-900/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-amber-100 resize-none mb-3"
                rows={4}
              ></textarea>
              <button 
                onClick={handleSaveInternalNote}
                disabled={!internalNote.trim()}
                className="w-full text-center text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Save Internal Note
              </button>

              {savedNotes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                  <p className="text-xs font-bold text-gray-600 dark:text-zinc-400 uppercase">Saved Notes:</p>
                  {savedNotes.map((n, idx) => (
                    <div key={idx} className="p-2.5 bg-gray-50 dark:bg-zinc-800 rounded-lg text-xs text-gray-700 dark:text-zinc-300 border border-gray-100 dark:border-zinc-700">
                      {n}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assigned Support Tickets</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Support tickets assigned to you by Admin and Team Head.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
            {filteredTickets.length} Assigned {filteredTickets.length === 1 ? 'Ticket' : 'Tickets'}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search your tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {filteredTickets.map(ticket => (
            <div 
              key={ticket.id} 
              onClick={() => setSelectedTicket(ticket)} 
              className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl mt-1 shrink-0 ${
                  ticket.priority === 'Critical' || ticket.priority === 'High' 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30' 
                    : ticket.priority === 'Medium' 
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' 
                    : 'bg-gray-100 text-gray-600 dark:bg-zinc-800'
                }`}>
                  {ticket.status === 'Resolved' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-500">{ticket.id}</span>
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                      ticket.priority === 'Critical' || ticket.priority === 'High' 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : ticket.priority === 'Medium' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                        : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}>
                      {ticket.priority}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      Assigned by {ticket.assignedByName || (ticket.assignedByRole === 'ADMIN' ? 'Admin' : 'Team Head')}
                    </span>
                  </div>
                  <h3 className={`text-sm font-bold mt-1 ${ticket.status === 'Resolved' ? 'text-gray-500 dark:text-zinc-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                    {ticket.issue}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{ticket.customer} • {ticket.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                  ticket.status === 'Open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                  ticket.status === 'In Progress' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                  ticket.status === 'Escalated' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  ticket.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                  {ticket.status}
                </span>
                <button className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100">
                  <MessageSquare size={18} />
                </button>
              </div>
            </div>
          ))}

          {!isLoading && filteredTickets.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <LifeBuoy size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No Assigned Support Tickets</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 max-w-sm">
                {searchTerm || statusFilter !== 'All'
                  ? 'No assigned tickets match your search criteria.'
                  : 'You currently have no support tickets assigned to you by Admin or Team Head. New assignments will appear here.'}
              </p>
            </div>
          )}

          {isLoading && (
            <div className="p-12 text-center text-sm text-gray-500 dark:text-zinc-400">
              Loading your assigned tickets...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSupport;
