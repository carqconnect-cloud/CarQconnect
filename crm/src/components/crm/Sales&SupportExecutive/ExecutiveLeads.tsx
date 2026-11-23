"use client";

import React, { useState } from 'react';
import { Filter, Search, PhoneCall, Mail, MoreHorizontal, UserPlus, ArrowLeft, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth, invalidateCrmCache } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { toast } from 'react-hot-toast';

const Leads = () => {
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledAction, setScheduledAction] = useState('Follow-up Call');

  const { user, token } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchLeads = async () => {
      const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('fioner_auth_token') || localStorage.getItem('token')) : null);
      if (!activeToken) return;

      const API_BASE = getApiBaseUrl();
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

          const myLeads = items
            .filter((l: any) => !l.ownerId || l.ownerId === user?.id || user?.role === 'ADMIN')
            .map((l: any) => ({
              id: l.id,
              name: l.name || `${l.firstName || ''} ${l.lastName || ''}`.trim() || '-',
              phone: l.phone || '-',
              email: l.email || '-',
              status: l.status === 'NEW' ? 'Pending' : l.status === 'WON' ? 'Complete (Converted)' : l.status === 'CONTACTED' ? 'Scheduled' : l.status === 'NEGOTIATION' ? 'Negotiation' : l.status === 'LOST' ? 'Fake' : l.status === 'PROPOSAL' ? 'Rescheduled' : l.status,
              source: l.source || 'Website Demo',
              assigned: l.assignedTo?.name || (l.ownerId === user?.id ? 'Me' : 'Unassigned'),
              reason: l.notes || l.company || 'Inquiry',
              company: l.company || 'Unknown',
              time: l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '-',
              value: l.value ? `$${l.value}` : '-'
            }));
          setLeads(myLeads);
        }
      } catch (err) {
        console.error('Failed to fetch leads', err);
      }
    };
    
    if (token) {
      fetchLeads();
    }
  }, [token, user?.id, user?.role]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'In Conversation': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  // Lead Detail View
  if (selectedLead) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedLead(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to Leads
        </button>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedLead.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5"><Mail size={14} className="text-blue-500" /> {selectedLead.email}</span>
                <span className="flex items-center gap-1.5"><PhoneCall size={14} className="text-emerald-500" /> {selectedLead.phone}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Source: {selectedLead.source || 'Website Contact'}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <select 
                value={selectedLead.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  const dbStatus = newStatus === 'Pending' ? 'NEW' : newStatus === 'Complete (Converted)' ? 'WON' : newStatus === 'Scheduled' ? 'CONTACTED' : newStatus === 'Negotiation' ? 'NEGOTIATION' : newStatus === 'Fake' ? 'LOST' : newStatus === 'Rescheduled' ? 'PROPOSAL' : 'NEW';
                  
                  try {
                    const API_BASE = getApiBaseUrl();
                    const res = await fetch(`${API_BASE}/api/v1/crm/leads/${selectedLead.id}`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ status: dbStatus })
                    });
                    
                    if (res.ok) {
                      invalidateCrmCache('/api/v1/crm/leads');
                      toast.success('Lead status updated!');
                      setSelectedLead({ ...selectedLead, status: newStatus });
                      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: newStatus } : l));
                      
                      if (dbStatus === 'WON') {
                        // Create customer
                        const custRes = await fetch(`${API_BASE}/api/v1/crm/customers`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            name: selectedLead.name,
                            email: selectedLead.email === '-' ? '' : selectedLead.email,
                            phone: selectedLead.phone === '-' ? '' : selectedLead.phone,
                            company: selectedLead.company === 'Unknown' ? '' : selectedLead.company,
                            metadata: {
                              assignedTo: user?.id,
                              source: selectedLead.source,
                              convertedFromLead: selectedLead.id,
                              plan: 'Starter'
                            }
                          })
                        });
                        if (custRes.ok) {
                          toast.success('Successfully converted to Customer!');
                        }
                      }
                    }
                  } catch (err) {
                    toast.error('Failed to update status');
                  }
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-transparent focus:border-blue-500 outline-none cursor-pointer ${getStatusColor(selectedLead.status)}`}
              >
                <option value="Pending">Pending</option>
                <option value="Complete (Converted)">Complete (Converted)</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Fake">Fake</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              {/* Full Detailed Reason & Inquiry Message Card */}
              <div className="bg-gray-50/80 dark:bg-zinc-800/40 rounded-xl p-5 border border-gray-100 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-zinc-700/60">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                    <FileText size={18} className="text-blue-500" /> Full Reason & Inquiry Details
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold">
                    {selectedLead.source || 'Website Contact'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block">
                    Inquiry Requirement / Notes
                  </span>
                  <div className="text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-gray-100 dark:border-zinc-800 font-normal">
                    {selectedLead.reason && selectedLead.reason !== '-' ? (
                      selectedLead.reason
                    ) : (
                      <span className="text-gray-400 italic">No specific reason provided for this lead.</span>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Calendar size={18} /> Activity Timeline</h3>
              <div className="space-y-4 border-l-2 border-gray-100 dark:border-zinc-800 ml-2 pl-4">
                <div className="relative">
                  <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-zinc-900"></div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">{selectedLead.time}</p>
                  <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-gray-100 dark:border-zinc-700 text-sm text-gray-700 dark:text-zinc-300">
                    <strong>Lead acquired:</strong> via {selectedLead.source}.
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-gray-100 dark:border-zinc-700">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Add Call Note</h4>
                <textarea
                  className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none mb-3"
                  rows={3}
                  placeholder="Document your discussion..."
                ></textarea>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  Save Note
                </button>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30">
                <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-400 mb-2">Schedule Next Action</h4>
                <input type="datetime-local" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-3 text-gray-700 dark:text-zinc-300" />
                <select value={scheduledAction} onChange={e => setScheduledAction(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 mb-3 text-gray-700 dark:text-zinc-300">
                  <option value="Follow-up Call">Follow-up Call</option>
                  <option value="Product Demo">Product Demo</option>
                  <option value="Contract Review">Contract Review</option>
                </select>
                <button onClick={async () => {
                  if (!scheduledDate) return toast.error('Please select a date and time');
                  const scheduleString = `[SCHEDULED|${scheduledDate}|${scheduledAction}]`;
                  const newNotes = selectedLead.reason && selectedLead.reason !== '-' ? `${scheduleString} ${selectedLead.reason}` : scheduleString;
                  
                  try {
                    const API_BASE = getApiBaseUrl();
                    const res = await fetch(`${API_BASE}/api/v1/crm/leads/${selectedLead.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ status: 'CONTACTED', notes: newNotes })
                    });
                    if (res.ok) {
                      invalidateCrmCache('/api/v1/crm/leads');
                      toast.success('Action scheduled successfully');
                      setSelectedLead({ ...selectedLead, status: 'Scheduled', reason: newNotes });
                      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: 'Scheduled', reason: newNotes } : l));
                    }
                  } catch (err) {
                    toast.error('Failed to schedule action');
                  }
                }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Calendar size={16} /> Schedule
                </button>
              </div>

              <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-gray-100 text-sm font-medium py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                <PhoneCall size={16} /> Initiate Live Call
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Lead List View
  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads Pipeline</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Manage and track your assigned leads.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search leads..."
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
              <option value="New">New</option>
              <option value="Attempted Contact">Attempted Contact</option>
              <option value="In Conversation">In Conversation</option>
              <option value="Converted">Converted</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase tracking-wider bg-gray-50 dark:bg-zinc-900/50">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Contact no.</th>
                <th className="p-4">Status</th>
                <th className="p-4">Source</th>
                <th className="p-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {leads.filter(l =>
                (statusFilter === 'All' || l.status === statusFilter) &&
                (l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.email.toLowerCase().includes(searchTerm.toLowerCase()))
              ).map((lead) => (
                <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer">
                  <td className="p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{lead.name}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{lead.email}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{lead.phone}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs uppercase font-bold tracking-wider rounded-full ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{lead.source}</td>
                  <td className="p-4 text-sm text-gray-500 dark:text-zinc-400 max-w-[200px]">
                    <span 
                      className="block truncate cursor-pointer hover:text-blue-500 transition-colors" 
                      title={lead.reason && lead.reason !== '-' ? lead.reason : undefined}
                    >
                      {lead.reason && lead.reason !== '-'
                        ? (lead.reason.length > 25 ? `${lead.reason.slice(0, 25).trim()}...` : lead.reason)
                        : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
};

export default Leads;
