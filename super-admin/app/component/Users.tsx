'use client';

import React, { useState } from 'react';
import { Search, Upload, Download, Database, ShieldAlert, BadgeDollarSign, X, ArrowRight, CheckCircle2, AlertTriangle, Car, Cpu, CreditCard, ShoppingCart, Headphones, Users as UsersIcon, Plus, ArrowLeft, Mail, PhoneCall, Edit3, Activity, MapPin, Calendar, CheckCircle, Package, Filter, Eye, Bot, FileText, Shield, Leaf, IdCard, Zap, CheckSquare, Receipt, Navigation, MessageSquare, Sparkles, Clock, Trash2, RefreshCw } from 'lucide-react';
// @ts-ignore
import * as XLSX from 'xlsx';
import toast, { Toaster } from 'react-hot-toast';
import { createRoot } from 'react-dom/client';
import {
  $,
  $$,
  ic,
  escapeHtml,
  initials,
  fmtDate,
  timeAgo,
  statusBadge,
  badge,
  renderEmpty,
  openDrawer,
  openModal,
  closeModal,
  showToast,
  afterMutation,
  tableState,
  registerTable,
  refreshTable,
  buildTable,
  apiClient,
  DB,
  registerRoute,
  registerActions,
  registerRowMenuProvider,
} from '../../lib/adminShared';

const useAuth = () => {
  const [token, setToken] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('fioner_admin_token') || localStorage.getItem('fioner_auth_token') || localStorage.getItem('token');
      setToken(t);
    }
  }, []);
  return { token };
};

const DOCUMENT_TYPES = [
  { name: 'Registration Certificate (RC)', icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
  { name: 'Insurance', icon: Shield, color: 'text-emerald-500 bg-emerald-500/10' },
  { name: 'PUC Certificate', icon: Leaf, color: 'text-purple-500 bg-purple-500/10' },
  { name: 'Driving License', icon: IdCard, color: 'text-rose-500 bg-rose-500/10' },
  { name: 'Fitness Certificate', icon: Activity, color: 'text-amber-500 bg-amber-500/10' },
  { name: 'Emission Certificate', icon: Zap, color: 'text-teal-500 bg-teal-500/10' },
  { name: 'Permit', icon: CheckSquare, color: 'text-sky-500 bg-sky-500/10' },
  { name: 'Tax Receipt', icon: Receipt, color: 'text-yellow-500 bg-yellow-500/10' },
  { name: 'Custom Document', icon: Plus, color: 'text-gray-500 bg-gray-500/10' }
];

const AdminCustomers = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('Customers');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('CSV');
  const [importStep, setImportStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showHealthReasonsModal, setShowHealthReasonsModal] = useState(false);
  const [selectedCustomerForHealth, setSelectedCustomerForHealth] = useState<any | null>(null);
  const [showOBDReasonsModal, setShowOBDReasonsModal] = useState(false);
  const [selectedOBDVehicle, setSelectedOBDVehicle] = useState<any | null>(null);
  const [customerTab, setCustomerTab] = useState('360 View');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [filterTeam, setFilterTeam] = useState('All Teams');
  const [filterHealth, setFilterHealth] = useState('All');
  const [filterPlan, setFilterPlan] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

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

  const [customers, setCustomers] = useState<any[]>([]);

  React.useEffect(() => {
    // Attempt to fetch real customers from backend API
    const fetchCustomers = async () => {
      try {
        const res: any = await apiClient.get('/admin/users', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' });
        const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
        if (items && items.length > 0) {
          const realCustomers = items.map((c: any) => {
            const meta = c.metadata || {};
            const rawTrips = meta.trips || c.trips || [];
            const normalizedTrips = rawTrips.map((t: any) => ({
              ...t,
              from: t.fromName || t.from || 'Indore',
              to: t.toName || t.to || 'Dewas',
              fromName: t.fromName || t.from || 'Indore',
              toName: t.toName || t.to || 'Dewas',
              cost: t.cost || (t.distance ? `₹${Math.round((parseFloat(t.distance) || 35) * 3.2)}` : '₹120'),
              health: t.health ?? 100,
              distance: t.distance || '36 km',
              duration: t.duration || '46m',
              viaRoute: t.viaRoute || 'Direct Route',
              status: t.status || 'COMPLETED',
              createdAt: t.createdAt || t.date || new Date().toISOString(),
            }));

            return {
              ...c,
              ...meta,
              id: c.id,
              name: c.name || (c.firstName ? `${c.firstName} ${c.lastName || ''}`.trim() : c.email),
              plan: meta.plan || c.plan || 'Starter',
              devices: meta.devices ?? (meta.vehicles?.length ? meta.vehicles.length : (c.vehicles?.length ? c.vehicles.length : 0)),
              spend: meta.spend || c.spend || '₹0',
              health: meta.health ?? c.health ?? 100,
              expiryDays: meta.expiryDays ?? c.expiryDays ?? 365,
              orders: meta.orders || c.orders || [],
              vehicles: meta.vehicles || c.vehicles || [],
              documents: meta.documents || c.documents || [],
              emergencyContacts: meta.emergencyContacts || meta.sos || c.emergencyContacts || [],
              sos: meta.sos || meta.emergencyContacts || c.sos || [],
              reminders: meta.reminders || c.reminders || [],
              addresses: meta.addresses || [],
              activity: meta.activity || [],
              tickets: (c.supportTickets && c.supportTickets.length > 0)
                ? c.supportTickets.map((t: any) => ({
                    id: t.id,
                    type: t.category || t.type || t.subject || 'Support Request',
                    subject: t.subject,
                    description: t.description || '',
                    agent: t.assignedToName || t.assignedTo?.name || t.agent || 'Customer Support',
                    status: t.status === 'OPEN' ? 'Open' : (t.status === 'RESOLVED' ? 'Resolved' : t.status),
                    priority: t.priority || 'Medium',
                    date: t.date || (t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'),
                  }))
                : (meta.tickets || []),
              trips: normalizedTrips,
              tripsCompleted: meta.tripsCompleted ?? normalizedTrips.length,
              totalDistance: meta.totalDistance || (normalizedTrips.length > 0 ? `${normalizedTrips.reduce((acc: number, curr: any) => acc + (parseFloat(curr.distance) || 0), 0)} km` : '0 km'),
            };
          });
          const sortedCustomers = realCustomers.sort((a: any, b: any) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
          });
          setCustomers(sortedCustomers);
          DB.users = sortedCustomers;
        }
      } catch (err) {
        console.warn('Backend API /admin/users fetch error:', err);
      }
    };
    fetchCustomers();
  }, [token]);

  React.useEffect(() => {
    if (!selectedCustomer) return;
    const fetchRealTickets = async () => {
      try {
        const query = selectedCustomer.email || selectedCustomer.name || selectedCustomer.id;
        const res: any = await apiClient.get('/admin/support/tickets', { search: query, limit: 50 });
        const items = Array.isArray(res) ? res : (res?.items || res?.data?.items || res?.data || []);
        if (Array.isArray(items) && items.length > 0) {
          const realTickets = items.map((t: any) => ({
            id: t.id,
            type: t.category || t.rawSubject || t.subject || 'Support Request',
            subject: t.subject,
            description: t.description || '',
            agent: t.assignedToName || t.assignedTo?.name || t.agent || 'Customer Support',
            status: t.status === 'OPEN' ? 'Open' : (t.status === 'RESOLVED' ? 'Resolved' : t.status),
            priority: t.priority || 'Medium',
            date: t.date || (t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'),
          }));
          setSelectedCustomer((prev: any) => prev ? { ...prev, tickets: realTickets } : null);
        }
      } catch (err) {
        console.warn('Failed to fetch real customer tickets:', err);
      }
    };
    fetchRealTickets();
  }, [selectedCustomer?.id, selectedCustomer?.email]);

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
          const newCustomers: any[] = [];

          const toastId = toast.loading('Importing customers...');

          for (let i = 0; i < linesData.length; i++) {
            if (!linesData[i] || linesData[i].length === 0) continue;
            const values = (linesData[i] as any[]).map(v => v !== undefined && v !== null ? String(v).trim().replace(/"/g, '') : '');

            const getVal = (key: string) => {
              const idx = headers.findIndex(h => h.toLowerCase() === key.toLowerCase());
              return idx !== -1 && values[idx] ? values[idx] : '';
            };

            const emailVal = getVal('email');
            const payload: any = {
              name: getVal('name') || `Imported Customer ${Date.now() + i}`,
              phone: getVal('phone') || '',
              company: getVal('company') || '',
              address: getVal('address') || ''
            };

            // Only add email if it looks somewhat valid to avoid Zod failure, 
            // or let the backend reject it if it's really bad. 
            // To be safe, if we have a val, we include it, else default.
            if (emailVal) {
              payload.email = emailVal;
            } else {
              payload.email = `customer${Date.now() + i}@example.com`;
            }

            try {
              const res: any = await apiClient.post('/admin/users', payload);
              const created = res?.data || res;

              // We need to parse custom fields from CSV for the UI state if possible
              const plan = getVal('plan') || 'Starter (Free)';
              const spend = getVal('spend') || '₹0';
              const healthStr = getVal('health');
              const health = !healthStr ? 100 : Number(healthStr);
              const devicesStr = getVal('devices');
              const devices = !devicesStr ? 0 : Number(devicesStr);

              newCustomers.push({
                ...created,
                plan,
                spend,
                health,
                devices,
                expiryDays: 365,
              });
            } catch (err: any) {
              console.error('Customer upload failed:', err);
              toast.error(`Row ${i + 1} failed: ${err.message || 'Unknown error'}`);
            }
          }

          if (newCustomers.length > 0) {
            setCustomers(prev => [...newCustomers, ...prev]);
          }
          setImportStep(3);
          toast.success(`${newCustomers.length} of ${linesData.length} customers imported successfully`, { id: toastId });
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse file');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const filteredCustomers = customers
    .filter(cust => {
      const matchesSearch = cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesHealth = filterHealth === 'All' ||
        (filterHealth === 'Low' && cust.health <= 50);
      const matchesPlan = filterPlan === 'All' ||
        (filterPlan === 'Expired' && cust.expiryDays <= 0);
      const matchesTeam = filterTeam === 'All Teams'; // Mock data doesn't have team field

      return matchesSearch && matchesHealth && matchesPlan && matchesTeam;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterHealth, filterPlan, filterTeam]);

  const handleExport = () => {
    setShowExportModal(false);

    if (exportFormat === 'XLSX') {
      const exportData = filteredCustomers.map(cust => ({
        Name: cust.name,
        Email: cust.email,
        Phone: cust.phone,
        Plan: cust.plan,
        Devices: cust.devices,
        Spend: cust.spend,
        Health: cust.health
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
      XLSX.writeFile(workbook, "fioner_customers_export.xlsx");
    } else {
      const headers = ['Name', 'Email', 'Phone', 'Plan', 'Devices', 'Spend', 'Health'];
      const csvContent = [
        headers.join(','),
        ...filteredCustomers.map(cust => [
          `"${cust.name}"`,
          `"${cust.email}"`,
          `"${cust.phone}"`,
          `"${cust.plan}"`,
          `"${cust.devices}"`,
          `"${cust.spend}"`,
          `"${cust.health}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'fioner_customers_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 relative">
      <Toaster position="top-right" />
      {/* Customer 360 Overlay */}
      {selectedCustomer && (
        <div className="absolute inset-0 bg-gray-50 dark:bg-zinc-950 z-40 min-h-screen">
          <div className="space-y-6 pb-20">
            <button onClick={() => { setSelectedCustomer(null); setCustomerTab('360 View'); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back to Customer Database
            </button>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h1>
                    <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${
                      selectedCustomer.isActive === false || String(selectedCustomer.status).toLowerCase() === 'suspended'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {selectedCustomer.isActive === false || String(selectedCustomer.status).toLowerCase() === 'suspended'
                        ? 'Suspended'
                        : 'Active Customer'}
                    </span>
                    <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${selectedCustomer.health > 80 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      Health: {selectedCustomer.health}/100
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><Mail size={14} /> {selectedCustomer.email}</span>
                    <span className="flex items-center gap-1"><PhoneCall size={14} /> {selectedCustomer.phone}</span>
                    <span className="flex items-center gap-1"><BadgeDollarSign size={14} /> {selectedCustomer.plan} Plan</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowEditModal(true)} className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                    <Edit3 size={16} /> Edit Profile
                  </button>
                  <button
                    onClick={async () => {
                      const isSuspended = selectedCustomer.isActive === false || String(selectedCustomer.status).toLowerCase() === 'suspended';
                      const newActive = isSuspended;
                      const actionLabel = newActive ? 'reactivate' : 'suspend';
                      if (window.confirm(`Are you sure you want to ${actionLabel} customer "${selectedCustomer.name}"?`)) {
                        try {
                          await apiClient.patch(`/admin/users/${selectedCustomer.id}/status`, {
                            isActive: newActive,
                            reason: newActive ? 'Reactivated by Super Admin' : 'Suspended by Super Admin',
                          });
                          const newStatus = newActive ? 'ACTIVE' : 'SUSPENDED';
                          setSelectedCustomer((prev: any) => prev ? { ...prev, isActive: newActive, status: newStatus } : null);
                          setCustomers((prev: any[]) => prev.map((c: any) => c.id === selectedCustomer.id ? { ...c, isActive: newActive, status: newStatus } : c));
                          toast.success(`Customer ${actionLabel}d successfully`);
                        } catch (err: any) {
                          toast.error(err?.message || `Failed to ${actionLabel} customer`);
                        }
                      }
                    }}
                    className={`px-4 py-2 border rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm ${
                      selectedCustomer.isActive === false || String(selectedCustomer.status).toLowerCase() === 'suspended'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                    }`}
                  >
                    <RefreshCw size={16} /> {selectedCustomer.isActive === false || String(selectedCustomer.status).toLowerCase() === 'suspended' ? 'Reactivate Customer' : 'Suspend Customer'}
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Are you sure you want to delete customer "${selectedCustomer.name}"? This action cannot be undone.`)) {
                        try {
                          await apiClient.delete(`/admin/users/${selectedCustomer.id}`);
                          setCustomers(prev => prev.filter(c => c.id !== selectedCustomer.id));
                          setSelectedCustomer(null);
                          toast.success('Customer deleted successfully');
                        } catch (err: any) {
                          toast.error(err?.message || 'Failed to delete customer');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Trash2 size={16} /> Delete Customer
                  </button>
                </div>
              </div>

              {/* Internal Tabs */}
              <div className="flex items-center gap-6 px-6 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {['360 View', 'Vehicles & Hardware', 'Subscriptions', 'Orders', 'Support Logs', 'Trips', 'Fastag', 'AI ChatBot', 'SOS', 'Documents'].map((tab, idx, arr) => (
                  <React.Fragment key={tab}>
                    <button
                      onClick={() => setCustomerTab(tab)}
                      className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${customerTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
                    >
                      {tab}
                    </button>
                    {idx < arr.length - 1 && <span className="text-gray-300 dark:text-zinc-700">|</span>}
                  </React.Fragment>
                ))}
              </div>

              <div className="p-6">
                {customerTab === '360 View' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      {/* Mock Map / Activity Layout */}
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><MapPin size={18} className="text-blue-500" /> Live Fleet & Trip Planning</h3>
                        <div className="h-64 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 relative overflow-hidden flex items-center justify-center group">
                          {/* Map Placeholder Grid Background */}
                          <div className="absolute inset-0 opacity-20 dark:opacity-10" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                          <div className="relative z-10 text-center">
                            <MapPin size={40} className="mx-auto text-blue-500 mb-2 opacity-80 group-hover:scale-110 transition-transform" />
                            <p className="font-medium text-gray-600 dark:text-zinc-300">Interactive Map View</p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Showing {selectedCustomer.devices} active devices.</p>
                          </div>
                          {/* Real map markers would go here based on customer vehicles */}
                          {(selectedCustomer.vehicles || []).length > 0 && (
                            <>
                              <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-blue-500/20 animate-pulse"></div>
                              <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-500/20"></div>
                              <div className="absolute bottom-1/4 left-1/2 w-3 h-3 bg-amber-500 rounded-full ring-4 ring-amber-500/20"></div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                          <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Total Distance (This Month)</p>
                          <p className="text-xl font-bold text-blue-900 dark:text-blue-200">{selectedCustomer.totalDistance || '0 km'}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1">Trips Completed</p>
                          <p className="text-xl font-bold text-emerald-900 dark:text-emerald-200">{selectedCustomer.tripsCompleted || '0'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><Activity size={18} className="text-blue-500" /> Recent Activity</h3>
                        <div className="space-y-4 border-l-2 border-gray-100 dark:border-zinc-800 ml-2 pl-4">
                          {(selectedCustomer.activity || []).map((act: any, i: number) => (
                            <div key={i} className="relative">
                              <div className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-zinc-900 ${act.color || 'bg-gray-300'}`}></div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">{act.time}</p>
                              <p className="text-sm text-gray-700 dark:text-zinc-300">{act.message}</p>
                            </div>
                          ))}
                          {(selectedCustomer.activity || []).length === 0 && (
                            <div className="text-sm text-gray-500">No recent activity</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {customerTab === 'Vehicles & Hardware' && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Car size={18} className="text-blue-500" /> Associated Vehicles & Devices</h3>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse min-w-[620px]">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase bg-gray-50 dark:bg-zinc-900/50">
                            <th className="p-4">Vehicle Model / Plate</th>
                            <th className="p-4">Hardware Device</th>
                            <th className="p-4">Health Score</th>
                            <th className="p-4">OBD Status & Alerts</th>
                            <th className="p-4">RC / PUC Status</th>
                            <th className="p-4">Location Ping</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                          {(selectedCustomer.vehicles || []).map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 align-top">
                              <td className="p-4 font-bold text-gray-900 dark:text-white pt-5">{row.model || row.name || row.regNumber || 'Unknown'}</td>
                              <td className="p-4 text-sm text-gray-600 dark:text-zinc-300 pt-5">{row.hw || 'N/A'}</td>
                              <td className="p-4 pt-5">
                                <span
                                  className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold ${(row.health ?? 100) >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : (row.health ?? 100) >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 cursor-pointer hover:underline' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 cursor-pointer hover:underline'}`}
                                  onClick={(e) => {
                                    if ((row.health ?? 100) < 80) {
                                      e.stopPropagation();
                                      setSelectedOBDVehicle(row);
                                      setShowOBDReasonsModal(true);
                                    }
                                  }}
                                  title={(row.health ?? 100) < 80 ? "Click to view reasons" : ""}
                                >
                                  {row.health ?? 100}/100
                                </span>
                              </td>
                              <td className="p-4 pt-5 max-w-sm">
                                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{row.obdStatus || 'N/A'}</div>
                                {row.obdReasons?.length > 0 && (
                                  <span
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOBDVehicle(row);
                                      setShowOBDReasonsModal(true);
                                    }}
                                  >
                                    View Details <ArrowRight size={12} />
                                  </span>
                                )}
                              </td>
                              <td className="p-4 pt-5"><span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'Valid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.status}</span></td>
                              <td className="p-4 text-sm text-gray-500 dark:text-zinc-400 pt-5">{row.ping}</td>
                            </tr>
                          ))}
                          {(selectedCustomer.vehicles || []).length === 0 && (
                            <tr><td colSpan={6} className="p-4 text-center text-sm text-gray-500">No vehicles found</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {customerTab === 'Subscriptions' && (
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><CreditCard size={18} className="text-blue-500" /> Active Memberships</h3>
                    <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-700">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{selectedCustomer.plan} Fleet Plan</p>
                          <p className="text-sm text-gray-500 dark:text-zinc-400">Billed Annually</p>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-bold uppercase rounded-full">Active</span>
                      </div>
                      <div className="space-y-3 mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-zinc-400">Active Devices:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedCustomer.devices} / 200 Limit</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-zinc-400">Renewal Date:</span>
                          <span className="font-medium text-gray-900 dark:text-white">Jan 1, 2027</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-zinc-400">Total Spend:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{String(selectedCustomer.spend).replace('$', '')}</span>
                        </div>
                      </div>
                      <button className="w-full py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        Manage Subscription
                      </button>
                    </div>
                  </div>
                )}

                {customerTab === 'Orders' && (
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><ShoppingCart size={18} className="text-blue-500" /> Order History</h3>
                    <div className="space-y-3">
                      {(selectedCustomer.orders || []).map((order: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                              <Package size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">{order.item}</p>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">{order.id} • {order.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">{order.amount}</p>
                            <p className={`text-xs font-bold ${order.status === 'Delivered' || order.status === 'Completed' ? 'text-emerald-500' : 'text-amber-500'}`}>{order.status}</p>
                          </div>
                        </div>
                      ))}
                      {(selectedCustomer.orders || []).length === 0 && (
                        <div className="text-center text-sm text-gray-500 py-4">No orders found</div>
                      )}
                    </div>
                  </div>
                )}

                {customerTab === 'Support Logs' && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Headphones size={18} className="text-blue-500" /> Customer Support Tickets</h3>
                    {(selectedCustomer.tickets || []).length === 0 ? (
                      <div className="text-center py-12 bg-gray-50/50 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
                        <Headphones size={32} className="mx-auto text-gray-400 dark:text-zinc-500 mb-2" />
                        <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">No support tickets found for this customer.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase bg-gray-50 dark:bg-zinc-900/50">
                              <th className="p-4">Ticket ID</th>
                              <th className="p-4">Issue Type</th>
                              <th className="p-4">Agent</th>
                              <th className="p-4">Resolution Status</th>
                              <th className="p-4">Resolution Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                            {selectedCustomer.tickets.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                <td className="p-4 text-sm font-mono text-blue-600 font-medium">{row.id}</td>
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{row.type}</td>
                                <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{row.agent}</td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${row.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.status}</span></td>
                                <td className="p-4 text-sm text-gray-500 dark:text-zinc-400">{row.date}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {customerTab === 'Trips' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin size={18} className="text-blue-500" /> Trips Information
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {(selectedCustomer.trips || []).length} Trips Recorded
                      </span>
                    </div>

                    <div className="space-y-4">
                      {(selectedCustomer.trips || []).map((t: any, i: number) => {
                        const fromLoc = t.fromName || t.from || 'Indore';
                        const toLoc = t.toName || t.to || 'Dewas';
                        const dist = t.distance || '36 km';
                        const dur = t.duration || '46m';
                        const cost = t.cost || (t.distance ? `₹${Math.round((parseFloat(t.distance) || 35) * 3.2)}` : '₹120');
                        const health = t.health ?? 100;
                        const status = t.status || 'COMPLETED';
                        const via = t.viaRoute || 'Direct Route';
                        const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (t.date || 'Recent');

                        return (
                          <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm transition-all hover:border-blue-500/40">
                            {/* Trip Header with Status & Route */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-zinc-800">
                              <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                  <Navigation size={16} />
                                </span>
                                <div>
                                  <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>{fromLoc}</span>
                                    <span className="text-blue-500 font-bold">➔</span>
                                    <span>{toLoc}</span>
                                  </p>
                                  {via && <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{via}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">{dateStr}</span>
                                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                                  status === 'COMPLETED' || status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                }`}>
                                  {status}
                                </span>
                              </div>
                            </div>

                            {/* 4 Cards Matching screenshot */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <div className="bg-gray-50/80 dark:bg-zinc-800/40 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">From (Reached)</p>
                                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{fromLoc}</p>
                              </div>
                              <div className="bg-gray-50/80 dark:bg-zinc-800/40 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">To (Live/Manual)</p>
                                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{toLoc}</p>
                              </div>
                              <div className="bg-gray-50/80 dark:bg-zinc-800/40 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Total Cost / Dist</p>
                                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{cost} • {dist}</p>
                              </div>
                              <div className="bg-gray-50/80 dark:bg-zinc-800/40 p-3 rounded-lg border border-gray-100 dark:border-zinc-800">
                                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Health / Duration</p>
                                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{health}/100 • {dur}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {(selectedCustomer.trips || []).length === 0 && (
                        <div className="p-8 text-center bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-700">
                          <MapPin size={32} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">No Trips Found</p>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">This customer hasn't completed any trips yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {customerTab === 'Fastag' && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><CreditCard size={18} className="text-blue-500" /> Fastag Information</h3>
                    <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-700">
                      {(selectedCustomer.fasttags || []).map((f: any, i: number) => (
                        <div key={i} className="mb-6 last:mb-0 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Fastag ID</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{f.id}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Expiry Date</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{f.expiry || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Linked Vehicle</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{f.vehicle || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 mt-2">
                            <p className="text-sm font-semibold mb-3 text-gray-700 dark:text-zinc-300">Transactions History</p>
                            <div className="space-y-3">
                              {(f.transactions || []).length > 0 ? f.transactions.map((txn: any, tIdx: number) => (
                                <div key={tIdx} className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-100 dark:border-zinc-700">
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{txn.desc}</p>
                                    <p className="text-xs text-gray-500">{txn.time}</p>
                                  </div>
                                  <span className={`font-semibold ${txn.amount?.startsWith('-') ? 'text-red-500' : 'text-emerald-500'}`}>{txn.amount}</span>
                                </div>
                              )) : (
                                <p className="text-sm text-gray-500">No transactions found.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {(selectedCustomer.fasttags || []).length === 0 && (
                        <p className="text-sm text-gray-500 text-center">No Fastag information found.</p>
                      )}
                    </div>
                  </div>
                )}

                {customerTab === 'AI ChatBot' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                          <Bot size={20} className="text-blue-500" /> AI ChatBot Conversations
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          Real-time AI assistant interactions and automated customer summaries
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold rounded-full border border-blue-500/20 flex items-center gap-1.5">
                          <Sparkles size={13} /> {(selectedCustomer.chats || []).length} Conversations
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {(selectedCustomer.chats || []).length > 0 ? (
                        selectedCustomer.chats.map((chat: any, i: number) => {
                          const summary = chat.summary || (chat.instruction ? chat.instruction.split('\n')[0] : 'General Query');
                          const userMsg = chat.userMessage || (chat.instruction?.includes('User: ') ? chat.instruction.split('User: ')[1]?.split('\nAI: ')[0] : chat.instruction);
                          const botReply = chat.aiResponse || (chat.instruction?.includes('AI: ') ? chat.instruction.split('AI: ')[1] : null);

                          return (
                            <div
                              key={chat.id || i}
                              className="bg-white dark:bg-zinc-800/70 p-5 rounded-2xl border border-gray-100 dark:border-zinc-700/80 shadow-sm space-y-3.5 transition-all hover:border-blue-500/40"
                            >
                              {/* Session Header / Short Summary */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-zinc-700/60">
                                <div className="flex items-center gap-2">
                                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Sparkles size={14} />
                                  </span>
                                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                    {summary}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-zinc-400">
                                  {chat.date && (
                                    <span className="flex items-center gap-1">
                                      <Clock size={12} /> {chat.date}
                                    </span>
                                  )}
                                  {chat.sessionId && (
                                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 font-mono text-[10px]">
                                      {chat.sessionId}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Conversation Messages Thread */}
                              <div className="space-y-3 pt-1">
                                {Array.isArray(chat.messages) && chat.messages.length > 0 ? (
                                  chat.messages.map((m: any, mIdx: number) => {
                                    const isUser = m.role === 'user';
                                    const msgContent = m.content || m.text || '';
                                    return isUser ? (
                                      <div key={mIdx} className="flex justify-end gap-2.5">
                                        <div className="max-w-[85%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-sm shadow-sm">
                                          <p className="text-[11px] font-semibold text-blue-200 mb-1 flex items-center gap-1">
                                            Customer
                                          </p>
                                          <p className="whitespace-pre-wrap leading-relaxed">{msgContent}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div key={mIdx} className="flex justify-start gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-1 border border-blue-500/20">
                                          <Bot size={15} />
                                        </div>
                                        <div className="max-w-[85%] bg-gray-50 dark:bg-zinc-900/90 text-gray-800 dark:text-zinc-200 border border-gray-100 dark:border-zinc-700/70 px-4 py-2.5 rounded-2xl rounded-tl-none text-sm shadow-sm">
                                          <p className="text-[11px] font-semibold text-blue-500 mb-1 flex items-center gap-1">
                                            CarQ AI Assistant
                                          </p>
                                          <p className="whitespace-pre-wrap leading-relaxed">{msgContent}</p>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <>
                                    <div className="flex justify-end gap-2.5">
                                      <div className="max-w-[85%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-sm shadow-sm">
                                        <p className="text-[11px] font-semibold text-blue-200 mb-1 flex items-center gap-1">
                                          Customer
                                        </p>
                                        <p className="whitespace-pre-wrap leading-relaxed">{userMsg}</p>
                                      </div>
                                    </div>

                                    {botReply && (
                                      <div className="flex justify-start gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-1 border border-blue-500/20">
                                          <Bot size={15} />
                                        </div>
                                        <div className="max-w-[85%] bg-gray-50 dark:bg-zinc-900/90 text-gray-800 dark:text-zinc-200 border border-gray-100 dark:border-zinc-700/70 px-4 py-2.5 rounded-2xl rounded-tl-none text-sm shadow-sm">
                                          <p className="text-[11px] font-semibold text-blue-500 mb-1 flex items-center gap-1">
                                            CarQ AI Assistant
                                          </p>
                                          <p className="whitespace-pre-wrap leading-relaxed">{botReply}</p>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="bg-gray-50 dark:bg-zinc-800/40 p-8 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-700 text-center space-y-2">
                          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-2">
                            <Bot size={24} />
                          </div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-zinc-200">
                            No AI ChatBot conversations recorded yet
                          </p>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                            When this customer interacts with the CarQ AI chatbot in the mobile or web app, their conversation threads and short summaries will automatically appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {customerTab === 'SOS' && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><ShieldAlert size={18} className="text-blue-500" /> SOS Data</h3>
                    <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-700">
                      {(selectedCustomer.emergencyContacts || selectedCustomer.sos || []).map((s: any, i: number) => (
                        <div key={i} className="mb-4">
                          <p className="font-bold text-gray-900 dark:text-white">Emergency Contact: {s.contact || s.name || s.phone}</p>
                          {s.phone && s.name && (
                            <p className="text-sm text-gray-600 dark:text-zinc-300">Phone: {s.phone}</p>
                          )}
                          <p className="text-sm text-gray-500 dark:text-zinc-400">Relation: {s.relationship || s.relation || 'N/A'}</p>
                        </div>
                      ))}
                      {(selectedCustomer.emergencyContacts || selectedCustomer.sos || []).length === 0 && (
                        <p className="text-sm text-gray-500 text-center">No SOS data found.</p>
                      )}
                    </div>
                  </div>
                )}
                {customerTab === 'Documents' && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 "><FileText size={18} className="text-blue-500" /> Customer Documents</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {DOCUMENT_TYPES.map((doc, idx) => {
                        const uploadedDoc = (selectedCustomer.documents || []).find((d: any) => {
                          const dt = (d.docType || '').toLowerCase();
                          const dTitle = (d.title || '').toLowerCase();
                          const n = doc.name.toLowerCase();
                          
                          if (dt && dt.length > 1 && n.includes(dt)) return true;
                          if (dTitle && dTitle.length > 1 && n.includes(dTitle)) return true;
                          if (dTitle === n) return true;
                          
                          return d.type === doc.name || d.title === doc.name;
                        });
                        return (
                          <div key={idx}
                            onClick={() => { if (uploadedDoc) { setSelectedDoc(uploadedDoc); setShowDocModal(true); } }}
                            className={`flex flex-col items-center justify-center p-4 border rounded-xl transition-colors text-center gap-2 ${uploadedDoc ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/20 shadow-sm' : 'border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 opacity-70'}`}>
                            <div className={`p-3 rounded-xl ${uploadedDoc ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : doc.color}`}>
                              {uploadedDoc ? <CheckCircle2 size={20} /> : <doc.icon size={20} />}
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                                {doc.name}
                              </span>
                              <span className={`text-[10px] mt-1 ${uploadedDoc ? 'text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[120px]' : 'text-gray-400 dark:text-zinc-500'}`}>
                                {uploadedDoc ? uploadedDoc.name : 'Not Uploaded'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Profile Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = (formData.get('name') as string)?.trim();
              const email = (formData.get('email') as string)?.trim();
              const phone = (formData.get('phone') as string)?.trim();
              const plan = formData.get('plan') as string;
              if (!name || !email) {
                toast.error('Name and email are required');
                return;
              }
              try {
                await apiClient.patch(`/admin/users/${selectedCustomer.id}`, { name, email, phone, plan });
                const updated = { ...selectedCustomer, name, email, phone, plan };
                setSelectedCustomer(updated);
                setCustomers((prev: any[]) => prev.map((c: any) => c.id === selectedCustomer.id ? { ...c, ...updated } : c));
                toast.success('Customer profile updated successfully');
                setShowEditModal(false);
              } catch (err: any) {
                toast.error(err?.message || 'Failed to update customer');
              }
            }}>
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Edit3 size={20} /> Edit Profile</h2>
                <button type="button" onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Customer Name *</label>
                  <input type="text" name="name" defaultValue={selectedCustomer.name || ''} required className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Email Address *</label>
                  <input type="email" name="email" defaultValue={selectedCustomer.email || ''} required className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Phone Number</label>
                  <input type="tel" name="phone" defaultValue={selectedCustomer.phone || ''} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Subscription Plan</label>
                  <select name="plan" defaultValue={selectedCustomer.plan || 'Starter'} className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200">
                    <option value="Starter">Starter</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise Fleet (Annual)">Enterprise Fleet (Annual)</option>
                    <option value="Premium Protection (Monthly)">Premium Protection (Monthly)</option>
                    <option value="Basic Tracking (Monthly)">Basic Tracking (Monthly)</option>
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors">Save Changes</button>
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Download size={20} /> Import Customers</h2>
              <button onClick={() => { setShowImportModal(false); setImportStep(1); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
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
                    {selectedFile ? selectedFile.name : 'Upload your customer list (.csv)'}
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
              {importStep === 3 && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Import Successful!</h3>
                  <button onClick={() => { setShowImportModal(false); setImportStep(1); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-sm transition-colors mx-auto mt-4">
                    Done
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
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Upload size={20} /> Export Customers</h2>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                <option value="CSV">CSV (Comma Separated Values)</option>
                <option value="XLSX">XLSX (Excel Spreadsheet)</option>
              </select>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Complete view of users, vehicles, hardware, and lifecycle data.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex-1 sm:flex-initial justify-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2"
          >
            <Download size={16} /> Import
          </button>
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="flex-1 sm:flex-initial justify-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2"
          >
            <Upload size={16} /> Export
          </button>
        </div>
      </div>

      <div className="space-y-6">

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
              />
            </div>
            <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:w-auto">
              <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="w-full sm:w-auto bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs sm:text-sm rounded-lg px-2 sm:px-3 py-2 outline-none cursor-pointer truncate">
                <option>All Teams</option>
                <option>Team Alpha</option>
                <option>Team Beta</option>
                <option>Team Gamma</option>
              </select>
              <select
                value={filterHealth}
                onChange={(e) => setFilterHealth(e.target.value)}
                className="w-full sm:w-auto bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs sm:text-sm rounded-lg px-2 sm:px-3 py-2 outline-none cursor-pointer truncate"
              >
                <option value="All">All Scores</option>
                <option value="Low">Low Health</option>
              </select>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full sm:w-auto bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-xs sm:text-sm rounded-lg px-2 sm:px-3 py-2 outline-none cursor-pointer truncate"
              >
                <option value="All">All Plans</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase bg-gray-50 dark:bg-zinc-900/50">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Contact no.</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Total Spend</th>
                  <th className="p-4 text-center">Health Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {paginatedCustomers.map((cust, i) => (
                  <tr key={i} onClick={() => setSelectedCustomer(cust)} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                    <td className="p-4 text-gray-900 dark:text-white text-medium">{cust.name}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{cust.email}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{cust.phone}</td>
                    <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{cust.plan}</td>
                    <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{String(cust.spend).replace('$', '')}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 relative">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden shrink-0">
                          <div className={`h-full ${cust.health <= 50 ? 'bg-red-500' : cust.health <= 70 ? 'bg-orange-500' : 'bg-emerald-500'} rounded-full`} style={{ width: `${cust.health}%` }}></div>
                        </div>
                        <span className="text-xs font-bold w-6 shrink-0 text-left text-gray-700 dark:text-zinc-200">{cust.health}</span>
                        <div className="w-8 shrink-0 flex justify-start">
                          {cust.health <= 70 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedCustomerForHealth(cust); setShowHealthReasonsModal(true); }}
                              className={`${cust.health <= 50 ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'} transition-colors p-1 rounded-full`}
                              title="View Health Reasons"
                            >
                              <AlertTriangle size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50 dark:bg-zinc-900/50">
            <span className="text-sm text-gray-500 dark:text-zinc-400">
              Showing {filteredCustomers.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm disabled:opacity-50 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm disabled:opacity-50 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OBD Reasons Modal */}
      {showOBDReasonsModal && selectedOBDVehicle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${selectedOBDVehicle.health >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : selectedOBDVehicle.health >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {selectedOBDVehicle.health}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">OBD Health Report</h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">{selectedOBDVehicle.model}</p>
                </div>
              </div>
              <button onClick={() => setShowOBDReasonsModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Detected Issues & Alerts</h3>
              {selectedOBDVehicle.obdReasons && selectedOBDVehicle.obdReasons.length > 0 ? (
                <div className="space-y-4">
                  {selectedOBDVehicle.obdReasons.map((reason: string, idx: number) => (
                    <div key={idx} className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 rounded-xl flex gap-3">
                      <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-900 dark:text-red-200 leading-relaxed">{reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-4 rounded-xl flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm text-emerald-900 dark:text-emerald-200">No issues detected. Vehicle is in good health.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end">
              <button onClick={() => setShowOBDReasonsModal(false)} className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors shadow-sm">
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Customer Health Reasons Modal */}
      {showHealthReasonsModal && selectedCustomerForHealth && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`}>
                  {selectedCustomerForHealth.health}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Health Score Reasons</h2>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">{selectedCustomerForHealth.name}</p>
                </div>
              </div>
              <button onClick={() => setShowHealthReasonsModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Why is this score low?</h3>
              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 rounded-xl flex gap-3">
                  <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900 dark:text-red-200 leading-relaxed">High volume of open support tickets</p>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 rounded-xl flex gap-3">
                  <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900 dark:text-red-200 leading-relaxed">Low engagement / inactive hardware</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 p-4 rounded-xl flex gap-3">
                  <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">Overdue invoices or payment issues</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end">
              <button onClick={() => setShowHealthReasonsModal(false)} className="px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors shadow-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Viewer Modal */}
      {showDocModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col h-[80vh] border border-gray-200 dark:border-zinc-800">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-500" size={24} />
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{selectedDoc.type}</h3>
                  <p className="text-xs text-gray-500">{selectedDoc.name}</p>
                </div>
              </div>
              <button onClick={() => setShowDocModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                <X size={20} className="text-gray-500 dark:text-zinc-400" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
              {selectedDoc.url || selectedDoc.frontImageUrl ? (
                <div className="flex flex-col gap-4 overflow-y-auto w-full h-full items-center">
                  {(selectedDoc.url || selectedDoc.frontImageUrl).includes('application/pdf') || selectedDoc.name?.endsWith('.pdf') ? (
                    <iframe src={selectedDoc.url || selectedDoc.frontImageUrl} className="w-full h-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white" title={selectedDoc.name || selectedDoc.title} />
                  ) : (
                    <>
                      <img src={selectedDoc.url || selectedDoc.frontImageUrl} alt={selectedDoc.name || selectedDoc.title} className="max-w-full object-contain rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
                      {selectedDoc.backImageUrl && (
                        <img src={selectedDoc.backImageUrl} alt={`${selectedDoc.name || selectedDoc.title} Back`} className="max-w-full object-contain rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mt-4" />
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-4 relative z-10 bg-white/50 dark:bg-zinc-900/50 p-8 rounded-3xl backdrop-blur-md border border-gray-200 dark:border-zinc-800 shadow-sm">
                  <div className="w-24 h-24 mx-auto bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                    <FileText size={40} className="text-amber-500" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">Document Preview Not Available</h4>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                    The file content for <strong className="text-gray-700 dark:text-zinc-300">{selectedDoc.name}</strong> was not saved in base64 format during upload. Please re-upload this document.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



/* =========================================================================
   CUSTOMER ENTITY MAPPER & SYNCHRONIZER (Backward Compatibility)
========================================================================= */
export function mapUserFromApi(u: any) {
  if (!u) return null;
  const meta = u.metadata || {};
  return {
    id: u.id,
    name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
    email: u.email,
    phone: u.phone || '—',
    city: u.city || meta.city || '—',
    status: u.status ? u.status.toLowerCase() : (u.isActive !== false ? 'active' : 'suspended'),
    membership: meta.plan || u.plan || (u.memberships && u.memberships[0]?.role) || 'Starter',
    joined: u.createdAt ? new Date(u.createdAt).getTime() : Date.now(),
    lastActive: u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : (u.updatedAt ? new Date(u.updatedAt).getTime() : Date.now()),
    language: 'English',
    raw: u,
  };
}

export async function syncUsers(query: any = {}) {
  if (!apiClient.getToken()) return DB.users || [];
  try {
    const res: any = await apiClient.get('/admin/users', { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc', ...query });
    const rawItems = Array.isArray(res) ? res : (res?.items || res?.data || []);
    const mapped = rawItems.map(mapUserFromApi).filter(Boolean);
    mapped.sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.joined || 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.joined || 0);
      return timeB - timeA;
    });
    DB.users = mapped;
    return DB.users;
  } catch (e) {
    return DB.users || [];
  }
}

export function openUserDrawer(id: string) {
  // Compatible handler
}

export function openAddUserModal(existing?: any) {
  // Compatible handler
}

export async function toggleUserStatus(id: string, newActiveState?: boolean) {
  const u = (DB.users || []).find((x: any) => x.id === id);
  const currentActive = u ? (u.status === 'active' || u.isActive !== false) : true;
  const targetActive = typeof newActiveState === 'boolean' ? newActiveState : !currentActive;
  try {
    const res: any = await apiClient.patch(`/admin/users/${encodeURIComponent(id)}/status`, {
      isActive: targetActive,
      reason: targetActive ? 'Reactivated by Super Admin' : 'Suspended by Super Admin',
    });
    if (u) {
      u.status = targetActive ? 'active' : 'suspended';
      u.isActive = targetActive;
    }
    afterMutation(`User ${targetActive ? 'reactivated' : 'suspended'}.`);
    return res;
  } catch (err: any) {
    showToast(err.message || 'Failed to update user status', 'danger');
    throw err;
  }
}

/* =========================================================================
   ROUTE VIEW RENDERER & ROUTER REGISTRATION
========================================================================= */
export function renderUsersView() {
  const viewEl = document.getElementById('view');
  if (!viewEl) return;
  viewEl.innerHTML = '<div id="users-react-container" style="width:100%;min-height:100%;"></div>';
  const container = document.getElementById('users-react-container');
  if (container) {
    const root = createRoot(container);
    root.render(<AdminCustomers />);
  }
}

export function registerUsersSection() {
  registerRoute('users', renderUsersView);
}

// Auto-register upon import
registerUsersSection();

export { AdminCustomers };
export default function Users() {
  return <AdminCustomers />;
}
