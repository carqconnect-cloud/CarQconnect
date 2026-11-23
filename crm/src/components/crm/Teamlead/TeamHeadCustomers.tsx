import React, { useState, useEffect } from 'react';
import { Search, Upload, Download, Database, ShieldAlert, BadgeDollarSign, X, ArrowRight, CheckCircle2, AlertTriangle, Car, Cpu, CreditCard, ShoppingCart, Headphones, Users, Plus, ArrowLeft, Mail, PhoneCall, Edit3, Activity, MapPin, Calendar, CheckCircle, Package, FileText, Leaf, IdCard, Zap, CheckSquare, Receipt, Shield, Bot, UserPlus, Trash2, Navigation, Sparkles, Clock, MessageSquare, ChevronRight } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';
import toast from 'react-hot-toast';


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
const API_BASE = getApiBaseUrl();

const TeamHeadCustomers = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('Customers');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedExecutiveForAssign, setSelectedExecutiveForAssign] = useState<any | null>(null);
  const [assignNote, setAssignNote] = useState('');
  const [importStep, setImportStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showHealthReasonsModal, setShowHealthReasonsModal] = useState(false);
  const [selectedCustomerForHealth, setSelectedCustomerForHealth] = useState<any | null>(null);
  const [showOBDReasonsModal, setShowOBDReasonsModal] = useState(false);
  const [selectedOBDVehicle, setSelectedOBDVehicle] = useState<any | null>(null);
  const [customerTab, setCustomerTab] = useState('360 View');
  const [modalTab, setModalTab] = useState('General');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const itemsPerPage = 10;

  const [customers, setCustomers] = useState<any[]>([]);
  const [teamExecutives, setTeamExecutives] = useState<any[]>([]);
  const [issueFilter, setIssueFilter] = useState('All');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/crm/customers`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const items = Array.isArray(data.data) ? data.data : (Array.isArray(data.data?.items) ? data.data.items : []);
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
                plan: meta.plan || c.plan || 'Starter',
                devices: meta.devices ?? (meta.vehicles?.length ? meta.vehicles.length : 0),
                spend: meta.spend || c.spend || '₹0',
                health: meta.health ?? c.health ?? 100,
                expiryDays: meta.expiryDays ?? c.expiryDays ?? 365,
                orders: meta.orders || [],
                vehicles: meta.vehicles || [],
                documents: meta.documents || [],
                emergencyContacts: meta.emergencyContacts || meta.sos || [],
                sos: meta.sos || meta.emergencyContacts || [],
                reminders: meta.reminders || [],
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
                assignedName: meta.assignedTo?.firstName ? `${meta.assignedTo.firstName} ${meta.assignedTo.lastName || ''}`.trim() : (meta.assignedTo?.name || meta.assignedTo?.username || c.assignedTo?.name || 'Unassigned'),
                assignedTo: meta.assignedTo || c.assignedTo,
                trips: normalizedTrips,
                tripsCompleted: meta.tripsCompleted ?? normalizedTrips.length,
                totalDistance: meta.totalDistance || (normalizedTrips.length > 0 ? `${normalizedTrips.reduce((acc: number, curr: any) => acc + (parseFloat(curr.distance) || 0), 0)} km` : '0 km'),
              };
            });
            setCustomers(realCustomers);
          }
        }
      } catch (err) {
        console.warn('Backend API not reachable', err);
      }
    };

    const fetchTeamAndUsers = async () => {
      try {
        const teamsRes = await fetch(`${API_BASE}/api/v1/crm/teams`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersRes = await fetch(`${API_BASE}/api/v1/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (teamsRes.ok && usersRes.ok) {
          const teamsData = await teamsRes.json();
          const usersData = await usersRes.json();

          const myTeam = teamsData.data?.find((t: any) => t.head?.id === user?.id);
          const currentTeamId = myTeam?.id;

          if (usersData && usersData.data) {
            const teamMembers = usersData.data.filter((m: any) => 
              currentTeamId && m.teamId === currentTeamId && m.role === 'EXECUTIVE'
            );
            setTeamExecutives(teamMembers);
          }
        }
      } catch (err) {
        console.warn('Backend API not reachable for teams/users', err);
      }
    };

    fetchCustomers();
    fetchTeamAndUsers();
  }, [token]);

  React.useEffect(() => {
    if (!selectedCustomer) return;
    const fetchRealTickets = async () => {
      try {
        const effectiveToken = token || (typeof window !== 'undefined' ? localStorage.getItem('fioner_auth_token') : null);
        const headers: Record<string, string> = {};
        if (effectiveToken) {
          headers['Authorization'] = `Bearer ${effectiveToken}`;
        }
        const query = encodeURIComponent(selectedCustomer.email || selectedCustomer.phone || selectedCustomer.id);
        const apiUrl = API_BASE;
        const res = await fetch(`${apiUrl}/api/v1/crm/tickets?search=${query}`, { headers });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            const realTickets = json.data.map((t: any) => ({
              id: t.id,
              type: t.category || t.rawSubject || t.subject || 'Support Request',
              subject: t.subject,
              description: t.description || '',
              agent: t.assignee || t.assignedToName || 'Customer Support',
              status: t.status || 'Open',
              priority: t.priority || 'Medium',
              date: t.time || (t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'),
            }));
            setSelectedCustomer((prev: any) => prev ? { ...prev, tickets: realTickets } : null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch real customer tickets:', err);
      }
    };
    fetchRealTickets();
  }, [selectedCustomer?.id, selectedCustomer?.email, token]);

  const isExpired = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d < new Date();
  };

  const problematicCustomers = customers.filter(cust => {
    const isPlanExpired = cust.expiryDays <= 0;
    const isLowHealth = cust.health <= 50;
    const hasTickets = (cust.tickets || []).length > 0;
    const hasSos = (cust.sos || []).length > 0;
    const hasExpiredFastag = (cust.fasttags || []).some((f: any) => isExpired(f.expiry));
    const hasExpiredInsurance = (cust.vehicles || []).some((v: any) => isExpired(v.insuranceExpiry));
    
    const isProblematic = isPlanExpired || isLowHealth || hasTickets || hasSos || hasExpiredFastag || hasExpiredInsurance;
    if (!isProblematic) return false;

    if (issueFilter === 'Low Health Score' && !isLowHealth) return false;
    if (issueFilter === 'Expire Plan' && !isPlanExpired) return false;
    if (issueFilter === 'SOS Alert' && !hasSos) return false;

    return true;
  });

  const totalPages = Math.ceil(problematicCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = problematicCustomers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6 relative">
      {/* Customer 360 Overlay */}
      {selectedCustomer && (
        <div className="absolute inset-0 bg-gray-50 dark:bg-zinc-950 z-40 min-h-screen">
          <div className="space-y-6 pb-20">
            <button onClick={() => { setSelectedCustomer(null); setCustomerTab('360 View'); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back to Customer Database
            </button>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
                <div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h1>
                    <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Active Customer
                    </span>
                    <span className={`px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full ${selectedCustomer.health > 80 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      Health: {selectedCustomer.health}/100
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1"><Mail size={14} className="shrink-0 text-blue-500" /> {selectedCustomer.email}</span>
                    <span className="flex items-center gap-1"><PhoneCall size={14} className="shrink-0 text-emerald-500" /> {selectedCustomer.phone}</span>
                    <span className="flex items-center gap-1"><BadgeDollarSign size={14} className="shrink-0 text-purple-500" /> {selectedCustomer.plan} Plan</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setShowAssignModal(true)} className="px-3 sm:px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm">
                    <UserPlus size={16} /> Assign
                  </button>
                  <button onClick={() => setShowCreateModal(true)} className="px-3 sm:px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm">
                    <Edit3 size={16} /> Edit
                  </button>
                  <button onClick={() => {
                    toast.success('Customer removed from your team view.');
                    setSelectedCustomer(null);
                  }} className="px-3 sm:px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 sm:gap-2 shadow-sm">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>

              {/* Internal Tabs */}
              <div className="flex items-center gap-4 sm:gap-6 px-4 sm:px-6 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                    
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse min-w-[700px]">
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
                              <td className="p-4 font-bold text-gray-900 dark:text-white pt-5">{row.model}</td>
                              <td className="p-4 text-sm text-gray-600 dark:text-zinc-300 pt-5">{row.hw}</td>
                              <td className="p-4 pt-5">
                                <span
                                  className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold ${row.health >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : row.health >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 cursor-pointer hover:underline' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 cursor-pointer hover:underline'}`}
                                  onClick={(e) => {
                                    if (row.health < 80) {
                                      e.stopPropagation();
                                      setSelectedOBDVehicle(row);
                                      setShowOBDReasonsModal(true);
                                    }
                                  }}
                                  title={row.health < 80 ? "Click to view reasons" : ""}
                                >
                                  {row.health}/100
                                </span>
                              </td>
                              <td className="p-4 pt-5 max-w-sm">
                                <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{row.obdStatus}</div>
                                {row.obdReasons && row.obdReasons.length > 0 && (
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

                    {/* Mobile Vehicle Cards */}
                    <div className="md:hidden space-y-3">
                      {(selectedCustomer.vehicles || []).map((row: any, i: number) => (
                        <div key={i} className="bg-gray-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-gray-900 dark:text-white text-base truncate">{row.model || 'Unknown'}</h4>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 truncate">{row.hw || 'N/A'}</p>
                            </div>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer ${row.health >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : row.health >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}
                              onClick={(e) => {
                                if (row.health < 80) {
                                  e.stopPropagation();
                                  setSelectedOBDVehicle(row);
                                  setShowOBDReasonsModal(true);
                                }
                              }}
                            >
                              Health: {row.health}/100
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200/60 dark:border-zinc-700/60">
                            <div>
                              <span className="text-gray-400 block text-[11px]">RC / PUC</span>
                              <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${row.status === 'Valid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{row.status || 'Valid'}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[11px]">Last Ping</span>
                              <span className="text-gray-700 dark:text-zinc-300 font-medium">{row.ping || 'Active'}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-gray-200/60 dark:border-zinc-700/60 text-xs">
                            <span className="text-gray-400 block text-[11px] mb-0.5">OBD Diagnostics:</span>
                            <div className="font-medium text-gray-800 dark:text-zinc-200">{row.obdStatus || 'Healthy (No active codes)'}</div>
                            {row.obdReasons && row.obdReasons.length > 0 && (
                              <button
                                type="button"
                                className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOBDVehicle(row);
                                  setShowOBDReasonsModal(true);
                                }}
                              >
                                View Diagnostic Reasons <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {(selectedCustomer.vehicles || []).length === 0 && (
                        <div className="p-6 text-center text-sm text-gray-500 bg-gray-50 dark:bg-zinc-800/40 rounded-xl">No vehicles found</div>
                      )}
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
                          <span className="font-medium text-gray-900 dark:text-white">{selectedCustomer.spend}</span>
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
                      <table className="w-full text-left border-collapse">
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
                    )}
                  </div>
                )}

                {customerTab === 'Trips' && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><MapPin size={18} className="text-blue-500" /> Trips Information</h3>
                    <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-gray-100 dark:border-zinc-700">
                      {(selectedCustomer.trips || []).map((t: any, i: number) => (
                        <div key={i} className="mb-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">From (Reached)</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{t.from || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">To (Live/Manual)</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{t.to || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Total Cost</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{t.cost || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-zinc-400">Health Score</p>
                              <p className="font-semibold text-gray-900 dark:text-white">{t.health || '100'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(selectedCustomer.trips || []).length === 0 && (
                        <p className="text-sm text-gray-500 text-center">No trips found.</p>
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
                      {(selectedCustomer.sos || []).map((s: any, i: number) => (
                        <div key={i} className="mb-4">
                          <p className="font-bold text-gray-900 dark:text-white">Emergency Contact: {s.contact}</p>
                          <p className="text-sm text-gray-500 dark:text-zinc-400">Relation: {s.relation || 'N/A'}</p>
                        </div>
                      ))}
                      {(selectedCustomer.sos || []).length === 0 && (
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
                        const uploadedDoc = (selectedCustomer.documents || []).find((d: any) => d.type === doc.name);
                        return (
                          <div key={idx} 
                            onClick={() => { if(uploadedDoc) { setSelectedDoc(uploadedDoc); setShowDocModal(true); } }}
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

      {/* Create / Edit Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Add / Edit Customer</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-6 px-6 pt-4 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto no-scrollbar">
              {['General', 'Vehicles & Hardware', 'Subscriptions', 'Orders', 'Support Logs'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setModalTab(tab)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${modalTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {modalTab === 'General' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Customer Name</label>
                    <input type="text" placeholder="e.g. John Doe" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Company / Organization</label>
                    <input type="text" placeholder="e.g. Acme Corp" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Email Address</label>
                    <input type="email" placeholder="john@example.com" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Phone Number</label>
                    <input type="tel" placeholder="+1 (555) 000-0000" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assigned Plan</label>
                    <select className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                      <option>Starter (Free)</option>
                      <option>Pro (Monthly)</option>
                      <option>Enterprise (Annual)</option>
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Account Status</label>
                    <select className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                      <option>Active</option>
                      <option>Onboarding</option>
                      <option>Suspended</option>
                    </select>
                  </div>
                </div>
              )}

              {modalTab === 'Vehicles & Hardware' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Linked Vehicles</h3>
                    <button className="text-sm text-blue-600 font-medium flex items-center gap-1"><Plus size={14} /> Add Vehicle</button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border border-gray-200 dark:border-zinc-700 p-4 rounded-xl">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Vehicle Model / Plate</label>
                      <input type="text" placeholder="e.g. Honda City (MH-01...)" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Hardware Device Type</label>
                      <select className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        <option>GPS Tracker (Wired)</option>
                        <option>GPS Tracker (OBD)</option>
                        <option>Smart QR Tag</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Device ID (IMEI)</label>
                      <input type="text" placeholder="Enter IMEI number" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Insurance Expiry Date</label>
                      <input type="date" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'Subscriptions' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Subscription Plan</label>
                      <select className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        <option>Enterprise Fleet (Annual)</option>
                        <option>Premium Protection (Monthly)</option>
                        <option>Basic Tracking (Monthly)</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Start Date</label>
                      <input type="date" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Renewal Date</label>
                      <input type="date" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Device Limit</label>
                      <input type="number" placeholder="e.g. 200" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Billing Status</label>
                      <select className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        <option>Active / Paid</option>
                        <option>Pending</option>
                        <option>Overdue</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'Orders' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Create New Order</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Item Description</label>
                      <input type="text" placeholder="e.g. 10x OBD GPS Trackers" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Order Amount ($)</label>
                      <input type="number" placeholder="4200" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Order Status</label>
                      <select className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        <option>Processing</option>
                        <option>Shipped</option>
                        <option>Delivered</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {modalTab === 'Support Logs' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Log Support Ticket</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Issue Type / Subject</label>
                      <input type="text" placeholder="e.g. Hardware Failure" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assigned Agent</label>
                      <input type="text" placeholder="e.g. Sarah Jenkins" className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Resolution Status</label>
                      <select className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                        <option>Open</option>
                        <option>Pending Customer</option>
                        <option>Resolved</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Resolution Notes</label>
                      <textarea rows={3} placeholder="Enter resolution details..." className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"></textarea>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
              <button onClick={() => setShowCreateModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                Save Customer Info
              </button>
            </div>
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
                <div className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-2xl p-10 text-center hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">Upload your customer list</h3>
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button onClick={() => setImportStep(2)} className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-zinc-700">
                      Local Drive
                    </button>
                  </div>
                </div>
              )}
              {importStep === 2 && (
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
              <select className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                <option>Word Document (.docx)</option>
                <option>CSV (Comma Separated Values)</option>
                <option>XLSX (Excel Spreadsheet)</option>
              </select>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
              <button onClick={() => { setShowExportModal(false); window.open('#', '_blank'); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                <Upload size={16} /> Export (Opens in new tab)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Executive Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><UserPlus size={20} className="text-blue-500" /> Assign Executive</h2>
              <button onClick={() => {
                setShowAssignModal(false);
                setSelectedExecutiveForAssign(null);
                setAssignNote('');
              }} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {!selectedExecutiveForAssign ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-zinc-300 mb-4">Select an executive from your team to handle this customer's issues.</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {teamExecutives.length > 0 ? (
                      teamExecutives.map((emp: any, i) => (
                        <button 
                          key={i} 
                          onClick={() => setSelectedExecutiveForAssign(emp)}
                          className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-sm font-medium text-gray-900 dark:text-white border border-gray-100 dark:border-zinc-700 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex flex-col">
                            <span>{`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || emp.username || 'Unnamed Executive'}</span>
                            <span className="text-xs text-gray-500 font-normal">{emp.email || emp.role}</span>
                          </div>
                          <ArrowRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-4">No executives available.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-0.5">Assigning to:</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{`${selectedExecutiveForAssign.firstName || ''} ${selectedExecutiveForAssign.lastName || ''}`.trim() || selectedExecutiveForAssign.name || selectedExecutiveForAssign.username || 'Executive'}</p>
                    </div>
                    <button onClick={() => setSelectedExecutiveForAssign(null)} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium px-2 py-1 bg-white dark:bg-zinc-800 rounded shadow-sm border border-blue-200 dark:border-blue-800 transition-colors">Change</button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Add Note / Instructions (Optional)</label>
                    <textarea 
                      value={assignNote}
                      onChange={(e) => setAssignNote(e.target.value)}
                      placeholder="e.g. Please follow up regarding their recent SOS alert..." 
                      className="w-full px-4 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px] resize-none"
                    ></textarea>
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button onClick={() => { setSelectedExecutiveForAssign(null); setAssignNote(''); setShowAssignModal(false); }} className="flex-1 px-4 py-2 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-zinc-700">Cancel</button>
                    <button onClick={async () => {
                      try {
                        const payload = {
                          metadata: { 
                            ...(selectedCustomer.metadata || {}), 
                            assignNote,
                            assignedTo: selectedExecutiveForAssign 
                          }
                        };
                        const res = await fetch(`${API_BASE}/api/v1/crm/customers/${selectedCustomer.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify(payload)
                        });
                        
                        if (res.ok) {
                          const fullName = `${selectedExecutiveForAssign.firstName || ''} ${selectedExecutiveForAssign.lastName || ''}`.trim() || selectedExecutiveForAssign.name || selectedExecutiveForAssign.username || 'Executive';
                          toast.success(`Customer successfully assigned to ${fullName}!`);
                          
                          setCustomers(customers.map(c => c.id === selectedCustomer.id ? {
                            ...c,
                            assignedTo: selectedExecutiveForAssign,
                            assignedName: fullName
                          } : c));
                          
                          setSelectedExecutiveForAssign(null);
                          setAssignNote('');
                          setShowAssignModal(false);
                        } else {
                          toast.error('Failed to assign customer');
                        }
                      } catch (err) {
                        toast.error('Error assigning customer');
                        console.error(err);
                      }
                    }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} /> Confirm Assign
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Complete view of users, vehicles, hardware, and lifecycle data.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
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
              <Users size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
              <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Total Customers</h3>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{problematicCustomers.length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-emerald-500 flex flex-col justify-between h-full overflow-hidden">
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-emerald-600 dark:text-emerald-400">
              <ShieldAlert size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
              <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Active SOS</h3>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{problematicCustomers.filter(c => (c.sos || []).length > 0).length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-red-500 flex flex-col justify-between h-full overflow-hidden">
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-red-600 dark:text-red-400">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
              <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Expired Plans</h3>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{problematicCustomers.filter(c => c.expiryDays <= 0).length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-amber-500 flex flex-col justify-between h-full overflow-hidden">
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-amber-600 dark:text-amber-400">
              <Activity size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
              <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Low Health</h3>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{problematicCustomers.filter(c => c.health <= 50).length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search by customer name, ID, or email..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={issueFilter}
                onChange={(e) => {
                  setIssueFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="All">All Issues</option>
                <option value="Low Health Score">Low Health Score</option>
                <option value="Expire Plan">Expire Plan</option>
                <option value="SOS Alert">SOS Alert</option>
              </select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase bg-gray-50 dark:bg-zinc-900/50">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Contact no.</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Total Spend</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4 text-center">Health Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {paginatedCustomers.map((cust, i) => (
                <tr key={i} onClick={() => setSelectedCustomer(cust)} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                  <td className="p-4 font-medium text-gray-900 dark:text-white">{cust.name}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{cust.email}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{cust.phone}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{cust.plan}</td>
                  <td className="p-4 text-sm font-medium">{cust.spend}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{cust.assignedName}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 relative">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden shrink-0">
                        <div className={`h-full ${cust.health <= 50 ? 'bg-red-500' : cust.health <= 70 ? 'bg-orange-500' : 'bg-emerald-500'} rounded-full`} style={{ width: `${cust.health}%` }}></div>
                      </div>
                      <span className="text-xs font-bold w-6 shrink-0 text-left">{cust.health}</span>
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

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {paginatedCustomers.map((cust, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedCustomer(cust)}
                className="p-3.5 hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">{cust.name}</h4>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      cust.health <= 50 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      cust.health <= 70 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      Score: {cust.health}
                    </span>
                    {cust.health <= 70 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedCustomerForHealth(cust); setShowHealthReasonsModal(true); }}
                        className={`${cust.health <= 50 ? 'text-red-500' : 'text-orange-500'} p-0.5`}
                        title="View Health Reasons"
                      >
                        <AlertTriangle size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1.5 truncate"><Mail size={12} className="shrink-0 text-blue-500" /> {cust.email}</span>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><PhoneCall size={12} className="shrink-0 text-emerald-500" /> {cust.phone}</span>
                    <span className="text-[11px] font-medium text-gray-700 dark:text-zinc-300">
                      Assigned: <span className="font-semibold text-blue-600 dark:text-blue-400">{cust.assignedName}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-50 dark:border-zinc-800/60 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium">{cust.plan}</span>
                  <span className="text-gray-500 dark:text-zinc-400">Spend: <strong className="text-gray-900 dark:text-white">{cust.spend}</strong></span>
                  <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium">360 View <ChevronRight size={12} /></span>
                </div>
              </div>
            ))}
            {paginatedCustomers.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">No customers found</div>
            )}
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50 dark:bg-zinc-900/50">
            <span className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 text-center sm:text-left">
              Showing {problematicCustomers.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, problematicCustomers.length)} of {problematicCustomers.length} entries
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
              {selectedDoc.url ? (
                selectedDoc.url.includes('application/pdf') || selectedDoc.name.endsWith('.pdf') ? (
                  <iframe src={selectedDoc.url} className="w-full h-full rounded-xl border border-gray-200 dark:border-zinc-800 bg-white" title={selectedDoc.name} />
                ) : (
                  <img src={selectedDoc.url} alt={selectedDoc.name} className="max-w-full max-h-full object-contain rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" />
                )
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
export default TeamHeadCustomers;
