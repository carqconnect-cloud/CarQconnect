"use client";

import React, { useState } from 'react';
import { Search, Filter, Download, Upload, Target, CheckCircle2, AlertTriangle, ArrowRight, X, Settings, Layers, Bot, Plus, ArrowLeft, UserPlus, PhoneCall, Mail, Calendar, UserCheck, Activity, Edit3, TrendingUp, Users, ChevronRight, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useAuth, invalidateCrmCache } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

const AdminLeads = () => {
  const { token } = useAuth();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('CSV');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [filterTeam, setFilterTeam] = useState('All Teams');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filterRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTeam, filterStatus]);

  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('fioner_auth_token') || localStorage.getItem('token')) : null);
      if (!activeToken) return;

      const API_BASE = getApiBaseUrl();
      try {
        const [leadsRes, usersRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/crm/leads`, { 
            headers: { 
              'Authorization': `Bearer ${activeToken}`
            } 
          }),
          fetch(`${API_BASE}/api/v1/users`, { 
            headers: { 
              'Authorization': `Bearer ${activeToken}`
            } 
          })
        ]);

        let fetchedUsers: any[] = [];
        if (usersRes.ok) {
          const uData = await usersRes.json();
          if (uData && uData.data) {
            fetchedUsers = uData.data.map((u: any) => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email, role: u.role }));
            setUsers(fetchedUsers);
          }
        }

        if (leadsRes.ok) {
          const lData = await leadsRes.json();
          const items = Array.isArray(lData.data)
            ? lData.data
            : Array.isArray(lData.data?.items)
              ? lData.data.items
              : Array.isArray(lData.items)
                ? lData.items
                : Array.isArray(lData)
                  ? lData
                  : [];

          const realLeads = items.map((l: any) => {
            const owner = fetchedUsers.find(u => u.id === l.ownerId);
            return {
              id: l.id,
              name: l.name || `${l.firstName || ''} ${l.lastName || ''}`.trim() || '-',
              email: l.email || '-',
              phone: l.phone || '-',
              status: l.status === 'NEW' ? 'New' : l.status === 'CONTACTED' ? 'Attempted Contact' : l.status === 'WON' ? 'Converted' : 'In Conversation',
              source: l.source || 'Website Contact',
              assigned: owner ? owner.name : (l.assignedTo?.name || 'Unassigned'),
              ownerId: l.ownerId,
              reason: l.notes || l.company || '-'
            };
          });
          setLeads(realLeads);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };

    fetchData();
  }, [token]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportCSV = () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length > 1) {
          const headers = (json[0] as any[]).map(h => String(h).trim().replace(/"/g, ''));
          const linesData = json.slice(1);
          const newLeads: any[] = [];
          
          const toastId = toast.loading('Importing leads...');
          
          for (let i = 0; i < linesData.length; i++) {
            if (!linesData[i] || linesData[i].length === 0) continue;
            const values = (linesData[i] as any[]).map(v => v !== undefined && v !== null ? String(v).trim().replace(/"/g, '') : '');
            
            const getVal = (key: string) => {
              const idx = headers.findIndex(h => h.toLowerCase() === key.toLowerCase());
              return idx !== -1 && values[idx] ? values[idx] : '';
            };
            
            const phoneVal = getVal('phone');
            const emailVal = getVal('email');
            
            const payload: any = {
              name: getVal('name') || `Imported Lead ${Date.now() + i}`,
              source: getVal('source') || 'Website Demo',
              status: 'NEW'
            };
            
            if (emailVal) {
              payload.email = emailVal;
            } else {
              payload.email = `imported${Date.now() + i}@example.com`;
            }
            
            if (phoneVal && phoneVal.length >= 6) {
              payload.phone = phoneVal;
            }

            try {
              const API_BASE = getApiBaseUrl();
              const res = await fetch(`${API_BASE}/api/v1/crm/leads`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
              });
              
              if (res.ok) {
                invalidateCrmCache('/api/v1/crm/leads');
                const result = await res.json();
                newLeads.push({
                  id: result.data.id,
                  name: result.data.name,
                  email: result.data.email,
                  phone: result.data.phone || '-',
                  status: 'New',
                  reason: getVal('reason') || '-',
                  source: result.data.source,
                  assigned: getVal('assigned') || 'Unassigned'
                });
              }
            } catch (err) {
              console.error('Failed to import lead', err);
            }
          }
          
          if (newLeads.length > 0) {
            setLeads(prev => [...newLeads, ...prev]);
          }
          setImportStep(3);
          toast.success(`${newLeads.length} of ${linesData.length} leads imported successfully`, { id: toastId });
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse file');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = filterTeam === 'All Teams'; // Mock data doesn't have team field
    const matchesStatus = filterStatus === 'All' || lead.status === filterStatus;
    
    return matchesSearch && matchesTeam && matchesStatus;
  });

  const handleExport = () => {
    setShowExportModal(false);
    
    if (exportFormat === 'XLSX') {
      const exportData = filteredLeads.map(lead => ({
        Name: lead.name,
        Email: lead.email,
        Phone: lead.phone,
        Status: lead.status,
        Source: lead.source,
        Assigned: lead.assigned,
        Reason: lead.reason
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
      XLSX.writeFile(workbook, "fioner_leads_export.xlsx");
    } else {
      const headers = ['Name', 'Email', 'Phone', 'Status', 'Source', 'Assigned', 'Reason'];
      const csvContent = [
        headers.join(','),
        ...filteredLeads.map(lead => [
          `"${lead.name}"`,
          `"${lead.email}"`,
          `"${lead.phone}"`,
          `"${lead.status}"`,
          `"${lead.source}"`,
          `"${lead.assigned}"`,
          `"${lead.reason}"`
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'fioner_leads_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast.success(`Exported ${filteredLeads.length} leads successfully`);
  };

  return (
    <div className="space-y-6 relative">
      {selectedLead && (
        <div className="absolute inset-0 bg-gray-50 dark:bg-zinc-950 z-40 min-h-screen">
          <div className="space-y-6 pb-20">
            <button onClick={() => { setSelectedLead(null); setIsEditing(false); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back to Leads Directory
            </button>
            
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-start bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedLead.name}</h1>
                    <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {selectedLead.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5"><Mail size={14} className="text-blue-500" /> {selectedLead.email}</span>
                    <span className="flex items-center gap-1.5"><PhoneCall size={14} className="text-emerald-500" /> {selectedLead.phone}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                      Source: {selectedLead.source || 'Website Contact'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                    <Edit3 size={16} /> {isEditing ? 'Cancel Edit' : 'Edit Lead'}
                  </button>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                  {isEditing ? (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const nameParts = (formData.get('name') as string).split(' ');
                      const firstName = nameParts[0];
                      const lastName = nameParts.slice(1).join(' ');
                      const statusMap: any = {
                        'New': 'NEW',
                        'Attempted Contact': 'CONTACTED',
                        'In Conversation': 'QUALIFIED',
                        'Converted': 'QUALIFIED'
                      };
                      try {
                        const API_BASE = getApiBaseUrl();
                        const res = await fetch(`${API_BASE}/api/v1/crm/leads/${selectedLead.id}`, {
                          method: 'PATCH',
                          headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            firstName,
                            lastName,
                            email: formData.get('email') as string,
                            phone: formData.get('phone') as string,
                            status: statusMap[formData.get('status') as string] || 'NEW',
                          })
                        });
                        if (res.ok) {
                          invalidateCrmCache('/api/v1/crm/leads');
                          const updatedLead = {
                            ...selectedLead,
                            name: formData.get('name') as string,
                            email: formData.get('email') as string,
                            phone: formData.get('phone') as string,
                            status: formData.get('status') as string,
                            reason: formData.get('reason') as string,
                          };
                          setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
                          setSelectedLead(updatedLead);
                          setIsEditing(false);
                          toast.success('Lead updated successfully');
                        } else {
                          toast.error('Failed to update lead');
                        }
                      } catch (err) {
                        toast.error('Failed to communicate with server');
                      }
                    }} className="space-y-4 bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Edit Lead Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Name</label>
                          <input type="text" name="name" defaultValue={selectedLead.name} className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500/50" pattern="^[\p{L}\s'\-]+$" title="Please enter a valid name" required />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Email</label>
                          <input type="email" name="email" defaultValue={selectedLead.email} className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500/50" title="Please enter a valid email address" required />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Contact no.</label>
                          <input type="text" name="phone" defaultValue={selectedLead.phone} className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500/50" pattern="^\+?[1-9]\d{1,14}$" title="Please enter a valid phone number" required />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Status</label>
                          <select name="status" defaultValue={selectedLead.status} className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500/50">
                            <option>New</option>
                            <option>Attempted Contact</option>
                            <option>In Conversation</option>
                            <option>Converted</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Reason</label>
                          <input type="text" name="reason" defaultValue={selectedLead.reason} className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500/50" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Source</label>
                          <input type="text" defaultValue={selectedLead.source} className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-100 dark:bg-zinc-800 text-sm text-gray-500 cursor-not-allowed" readOnly />
                        </div>
                      </div>
                      <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">Save Changes</button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      {/* Full Detailed Reason & Inquiry Message Card */}
                      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
                            <FileText size={18} className="text-blue-500" /> Full Reason & Inquiry Details
                          </h3>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold">
                            {selectedLead.source || 'Website Contact'}
                          </span>
                        </div>

                        <div className="bg-gray-50/80 dark:bg-zinc-800/40 rounded-xl p-4 border border-gray-100 dark:border-zinc-800/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                              Inquiry Message / Requirement
                            </span>
                            <span className="text-[11px] text-gray-400">Full Description</span>
                          </div>
                          <div className="text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-100 dark:border-zinc-800 font-normal">
                            {selectedLead.reason && selectedLead.reason !== '-' ? (
                              selectedLead.reason
                            ) : (
                              <span className="text-gray-400 italic">No specific reason or notes provided for this lead.</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div className="p-3 rounded-xl bg-gray-50/60 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
                            <span className="text-[11px] font-medium text-gray-400 block mb-0.5">Contact Source</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{selectedLead.source || 'Website Contact'}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-gray-50/60 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
                            <span className="text-[11px] font-medium text-gray-400 block mb-0.5">Contact Number</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{selectedLead.phone || 'N/A'}</span>
                          </div>
                          <div className="p-3 rounded-xl bg-gray-50/60 dark:bg-zinc-800/30 border border-gray-100 dark:border-zinc-800">
                            <span className="text-[11px] font-medium text-gray-400 block mb-0.5">Email Address</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate block">{selectedLead.email || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Lead Activity Timeline */}
                      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                          <Activity size={18} className="text-blue-500" /> Lead Activity Timeline
                        </h3>
                        <div className="space-y-4 border-l-2 border-gray-100 dark:border-zinc-800 ml-2 pl-4">
                          <div className="relative">
                            <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-zinc-900"></div>
                            <p className="text-sm text-gray-700 dark:text-zinc-300">Lead acquired via <span className="font-semibold text-gray-900 dark:text-white">{selectedLead.source || 'Website Contact'}</span>.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-5 border border-blue-100 dark:border-blue-900/30">
                    <h4 className="font-bold text-sm text-blue-900 dark:text-blue-400 mb-4 flex items-center gap-2"><UserCheck size={16}/> Lead Assignment</h4>
                    <div className="mb-4">
                      <p className="text-xs font-medium text-blue-800/70 dark:text-blue-300/70 mb-1">Current Owner</p>
                      <p className="font-bold text-blue-900 dark:text-blue-200 text-lg">{selectedLead.assigned}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-blue-900 dark:text-blue-400">Reassign To (Team Head / Employee)</label>
                      <select 
                        onChange={(e) => {
                          const value = e.target.value;
                          const user = users.find(u => u.id === value);
                          if (user) {
                            setSelectedLead((prev: any) => ({ ...prev, _tempAssigneeId: value, _tempAssigneeName: user.name }));
                          }
                        }}
                        value={selectedLead._tempAssigneeId || ''}
                        className="w-full px-3 py-2 border border-blue-200 dark:border-blue-800/50 rounded-lg bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="">Select Assignee...</option>
                        {users.filter(u => u.role === 'TEAM_HEAD').map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={async () => {
                          if (!selectedLead._tempAssigneeId) {
                            toast.error('Please select an assignee first');
                            return;
                          }
                          try {
                            const API_BASE = getApiBaseUrl();
                            const res = await fetch(`${API_BASE}/api/v1/crm/leads/${selectedLead.id}`, {
                              method: 'PATCH',
                              headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                ownerId: selectedLead._tempAssigneeId
                              })
                            });
                            if (res.ok) {
                              invalidateCrmCache('/api/v1/crm/leads');
                              const updatedLead = {
                                ...selectedLead,
                                assigned: selectedLead._tempAssigneeName,
                                ownerId: selectedLead._tempAssigneeId
                              };
                              setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
                              setSelectedLead(updatedLead);
                              toast.success('Lead reassigned successfully');
                            } else {
                              toast.error('Failed to reassign lead');
                            }
                          } catch (err) {
                            toast.error('Failed to communicate with server');
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl shadow-sm transition-colors mt-2"
                      >
                        Assign Lead
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-xl overflow-hidden animate-in zoom-in-95">
             <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Create New Lead</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
             </div>
             
             <form onSubmit={async (e) => {
               e.preventDefault();
               const formData = new FormData(e.currentTarget);
               
               const name = formData.get('name') as string;
               const email = formData.get('email') as string;
               const phone = formData.get('phone') as string;
               const source = formData.get('source') as string;
               const status = formData.get('status') as string;
               const reason = formData.get('reason') as string;
               const assigned = formData.get('assigned') as string;
               
               try {
                 const payload: any = {
                   name,
                   email,
                   phone,
                   source,
                   status: status === 'Attempted Contact' ? 'CONTACTED' : status === 'In Conversation' ? 'QUALIFIED' : status === 'Converted' ? 'WON' : 'NEW',
                 };
                 if (reason) payload.notes = reason;
                 if (assigned) payload.ownerId = assigned;

                 const API_BASE = getApiBaseUrl();
                 const res = await fetch(`${API_BASE}/api/v1/crm/leads`, {
                   method: 'POST',
                   headers: { 
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`
                   },
                   body: JSON.stringify(payload)
                 });
                 if (res.ok) {
                   invalidateCrmCache('/api/v1/crm/leads');
                   const result = await res.json();
                   const newLead = {
                     id: result.data.id,
                     name: result.data.name,
                     email: result.data.email,
                     phone: result.data.phone || '-',
                     status: status,
                     reason: reason || '-',
                     source: result.data.source,
                     assigned: assigned ? (users.find(u => u.id === assigned)?.name || 'Unassigned') : 'Unassigned',
                     ownerId: assigned || null
                   };
                   setLeads(prev => [newLead, ...prev]);
                   setShowCreateModal(false);
                   toast.success('Lead created successfully!');
                 } else {
                   toast.error('Failed to create lead');
                 }
               } catch (err) {
                 toast.error('Failed to communicate with server');
               }
             }}>
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Name</label>
                        <input type="text" name="name" required className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" pattern="^[\p{L}\s'\-]+$" title="Please enter a valid name" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Email</label>
                        <input type="email" name="email" required className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" title="Please enter a valid email address" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Contact no.</label>
                        <input type="text" name="phone" required className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" pattern="^\+?[1-9]\d{1,14}$" title="Please enter a valid phone number" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Status</label>
                        <select name="status" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                          <option>New</option>
                          <option>Attempted Contact</option>
                          <option>In Conversation</option>
                          <option>Converted</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Reason</label>
                        <input type="text" name="reason" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Source</label>
                        <select name="source" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                          <option>Website Demo</option>
                          <option>Inbound Call</option>
                          <option>Organic Search</option>
                          <option>Referral</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assigned</label>
                        <select name="assigned" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                          <option value="">Unassigned</option>
                          {users.filter(u => u.role === 'TEAM_HEAD').map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                     </div>
                  </div>
               </div>
               <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                 <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                 <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                    Save Lead
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
             <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Upload size={20}/> Import Leads Wizard</h2>
                <button onClick={() => {setShowImportModal(false); setImportStep(1);}} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
             </div>
             
             <div className="p-6">
                {/* Stepper */}
                <div className="flex items-center gap-4 mb-8">
                   <div className={`flex items-center gap-2 font-medium text-sm ${importStep >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${importStep >= 1 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-700'}`}>1</div>
                      Upload File
                   </div>
                   <div className={`flex-1 h-px ${importStep >= 3 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-zinc-700'}`}></div>
                   <div className={`flex items-center gap-2 font-medium text-sm ${importStep >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${importStep >= 3 ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-zinc-700'}`}>2</div>
                      Complete
                   </div>
                </div>

                {importStep === 1 && (
                  <div 
                    className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-2xl p-10 text-center hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                     <input 
                       type="file" 
                       accept=".csv, .xlsx, .xls" 
                       className="hidden" 
                       ref={fileInputRef} 
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const ext = file.name.split('.').pop()?.toLowerCase();
                           if (['pdf', 'doc', 'docx'].includes(ext || '')) {
                             toast.error('Only .csv and .xlsx files are allowed');
                             e.target.value = '';
                             return;
                           }
                           if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
                             toast.error('Only .csv and .xlsx files are allowed');
                             e.target.value = '';
                             return;
                           }
                           setSelectedFile(file);
                         }
                       }} 
                     />
                     <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload size={32} />
                     </div>
                     <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                        {selectedFile ? selectedFile.name : 'Upload your leads list (.csv)'}
                     </h3>
                     <p className="text-sm text-gray-500 dark:text-zinc-400">
                        {selectedFile ? 'File ready for import.' : 'Click to browse your local files.'}
                     </p>
                     
                     {selectedFile && (
                        <div className="mt-8">
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleImportCSV(); }} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center justify-center gap-2 mx-auto"
                          >
                             Import Data <ArrowRight size={16} />
                          </button>
                        </div>
                     )}
                  </div>
                )}

                {importStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-zinc-300 mb-4">We found 3 columns in your file. Map them to the corresponding Fioner CRM fields.</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm font-bold text-gray-500 dark:text-zinc-400 pb-2 border-b border-gray-100 dark:border-zinc-800">
                       <div>Your CSV Column</div>
                       <div>CRM Field</div>
                    </div>
                    
                    {[
                      { csv: 'Company Name', crm: 'Company' },
                      { csv: 'Contact Person', crm: 'Contact Name' },
                      { csv: 'Phone Number', crm: 'Phone' }
                    ].map((row, i) => (
                      <div key={i} className="grid grid-cols-2 gap-4 items-center p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-700">
                         <div className="font-medium text-gray-900 dark:text-white">{row.csv}</div>
                         <select className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50" defaultValue={row.crm}>
                            <option value="">-- Leave Blank --</option>
                            <option>Company</option>
                            <option>Contact Name</option>
                            <option>Email</option>
                            <option>Phone</option>
                            <option>Lead Source</option>
                         </select>
                      </div>
                    ))}
                    
                    <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                       <button onClick={() => setImportStep(1)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Back</button>
                       <button onClick={() => setImportStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                          Import Data <ArrowRight size={16} />
                       </button>
                    </div>
                  </div>
                )}

                {importStep === 3 && (
                  <div className="text-center py-8">
                     <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} />
                     </div>
                     <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Import Successful!</h3>
                     <p className="text-gray-500 dark:text-zinc-400 mb-8">Successfully imported new leads into the CRM.</p>
                     
                     <button onClick={() => {setShowImportModal(false); setImportStep(1);}} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors mx-auto">
                        View New Leads
                     </button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95">
             <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Download size={20}/> Export Leads Data</h2>
                <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
             </div>
             
             <div className="p-6 space-y-6">
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Export Format</label>
                 <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="CSV">CSV (Comma Separated Values)</option>
                    <option value="XLSX">XLSX (Excel Spreadsheet)</option>
                 </select>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Data Range</label>
                 <div className="space-y-2">
                   <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                     <input type="radio" name="export-range" className="text-blue-600" defaultChecked /> Current View (Filtered Leads)
                   </label>
                   <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                     <input type="radio" name="export-range" className="text-blue-600" /> All Leads in CRM
                   </label>
                 </div>
               </div>
               
               <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-200 dark:border-amber-900/30 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-500">Exports containing PII (Personally Identifiable Information) are logged in the global security audit trail.</p>
               </div>
             </div>
             
             <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
               <button type="button" onClick={() => setShowExportModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
               <button type="button" onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                  <Upload size={16} /> {exportFormat === 'XLSX' ? 'Export Excel' : 'Export CSV'}
               </button>
             </div>
          </div>
        </div>
      )}


      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Leads Directory</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Manage leads and perform imports/exports.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} /> New Lead
          </button>
          <button 
            type="button"
            onClick={() => setShowImportModal(true)}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2"
          >
            <Download size={16} /> Import
          </button>
          <button 
            type="button"
            onClick={() => setShowExportModal(true)}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2"
          >
            <Upload size={16} /> Export
          </button>
        </div>
      </div>

      <div className="space-y-6">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-blue-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-blue-600 dark:text-blue-400">
            <Target size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
            <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Total Leads</h3>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{leads.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-emerald-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-emerald-600 dark:text-emerald-400">
            <Activity size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
            <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">New Today</h3>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{leads.filter(l => l.status === 'New').length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-amber-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
            <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Unassigned</h3>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{leads.filter(l => l.assigned === 'Unassigned').length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-purple-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-purple-600 dark:text-purple-400">
            <TrendingUp size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
            <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Conversion Rate</h3>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{leads.length ? ((leads.filter(l => l.status === 'Converted').length / leads.length) * 100).toFixed(1) + '%' : '0.0%'}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search global leads..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" 
            />
          </div>
          
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="w-full sm:w-auto bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs sm:text-sm rounded-lg px-3 py-2 outline-none cursor-pointer truncate">
              <option>All Teams</option>
              <option>Team Alpha</option>
              <option>Team Beta</option>
              <option>Team Gamma</option>
            </select>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs sm:text-sm rounded-lg px-3 py-2 outline-none cursor-pointer truncate"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Attempted Contact">Attempted Contact</option>
              <option value="In Conversation">In Conversation</option>
              <option value="Converted">Converted</option>
            </select>
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-semibold text-gray-500 dark:text-white uppercase tracking-wider bg-gray-50 dark:bg-zinc-900/50">
              <th className="p-4 font-bold">Name</th>
              <th className="p-4 font-bold">Email</th>
              <th className="p-4 font-bold">Contact no.</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Source</th>
              <th className="p-4 font-bold">Assigned</th>
              <th className="p-4 font-bold">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lead) => (
              <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                <td className="p-4 text-gray-900 dark:text-white text-medium">{lead.name}</td>
                <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{lead.email}</td>
                <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{lead.phone}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-xs uppercase font-bold tracking-wider rounded-full ${
                    lead.status === 'New' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    lead.status === 'In Conversation' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {lead.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{lead.source}</td>
                <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                   <span className={lead.assigned === 'Unassigned' ? 'text-amber-500' : ''}>{lead.assigned}</span>
                </td>
                <td className="p-4 text-sm text-gray-500 dark:text-zinc-400 max-w-[200px]">
                  <span 
                    className="block truncate cursor-pointer hover:text-blue-500 transition-colors" 
                    title={lead.reason && lead.reason !== '-' ? lead.reason : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLead(lead);
                    }}
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

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
          {filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((lead) => (
            <div 
              key={lead.id} 
              onClick={() => setSelectedLead(lead)}
              className="p-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">{lead.name}</h4>
                <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full ${
                  lead.status === 'New' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  lead.status === 'In Conversation' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  {lead.status}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-zinc-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 truncate"><Mail size={12} className="shrink-0 text-blue-500" /> {lead.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><PhoneCall size={12} className="shrink-0 text-emerald-500" /> {lead.phone}</span>
                  <span className="text-[11px] font-medium text-gray-700 dark:text-zinc-300">
                    Assigned: <span className={lead.assigned === 'Unassigned' ? 'text-amber-500 font-semibold' : ''}>{lead.assigned}</span>
                  </span>
                </div>
                {lead.reason && lead.reason !== '-' && (
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-1 italic bg-gray-50 dark:bg-zinc-800/40 px-2 py-0.5 rounded">
                    Reason: {lead.reason.length > 30 ? `${lead.reason.slice(0, 30).trim()}...` : lead.reason}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-zinc-800/60 text-[11px] text-gray-400">
                <span>Source: {lead.source}</span>
                <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">View details <ChevronRight size={12} /></span>
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-500">No leads found</div>
          )}
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-zinc-900">
           <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 text-center sm:text-left">
             Showing <span className="font-medium">{filteredLeads.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredLeads.length)}</span> of <span className="font-medium">{filteredLeads.length}</span> leads
           </p>
           <div className="flex gap-2">
             <button 
               onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
               disabled={currentPage === 1 || filteredLeads.length === 0}
               className="px-3 py-1.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
               Previous
             </button>
             <button 
               onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage))))}
               disabled={currentPage >= Math.ceil(filteredLeads.length / itemsPerPage) || filteredLeads.length === 0}
               className="px-3 py-1.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
             >
               Next
             </button>
           </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default AdminLeads;
