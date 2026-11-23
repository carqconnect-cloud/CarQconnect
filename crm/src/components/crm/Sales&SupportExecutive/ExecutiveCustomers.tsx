"use client";

import React, { useState } from 'react';
import { Search, Filter, PhoneCall, Mail, Package, Car, CreditCard, ArrowLeft, MoreHorizontal, ShieldCheck, MapPin, FileText, Clock } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

const Customers = () => {
  const { user, token } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [customers, setCustomers] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const API_BASE = getApiBaseUrl();
        const response = await fetch(`${API_BASE}/api/v1/crm/customers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.data) {
            const myCustomers = data.data
              .filter((c: any) => c.assignedTo === user?.id || c.metadata?.assignedTo === user?.id || c.assignedTo?.id === user?.id || c.metadata?.assignedTo?.id === user?.id || (c.supportTickets && c.supportTickets.some((t: any) => t.assignedToId === user?.id)))
              .map((c: any) => ({
                ...c,
                ...(c.metadata || {}),
                name: c.company || c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown Customer',
                email: c.email || '-',
                plan: c.metadata?.plan || c.plan || 'Starter',
                vehicles: c.metadata?.devices ?? c.devices ?? 0,
                status: c.status || 'Active',
                value: c.metadata?.spend || c.spend || c.value || '$0',
              }));
            setCustomers(myCustomers);
          }
        }
      } catch (err) {
        console.error('Failed to fetch customers', err);
      }
    };
    
    if (token && user?.id) {
      fetchCustomers();
    }
  }, [token, user?.id]);

  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to Customers
        </button>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h1>
                <span className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  {selectedCustomer.plan}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">Primary Email: {selectedCustomer.email} • LTV: {selectedCustomer.value}</p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-zinc-300 shrink-0">Problem Status:</label>
              <select
                value={selectedCustomer.metadata?.problemStatus || 'Pending'}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  const newMetadata = { ...(selectedCustomer.metadata || {}), problemStatus: newStatus };
                  
                  // Update locally immediately
                  setSelectedCustomer({ ...selectedCustomer, metadata: newMetadata });
                  setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, metadata: newMetadata } : c));
                  
                  try {
                    const API_BASE = getApiBaseUrl();
                    await fetch(`${API_BASE}/api/v1/crm/customers/${selectedCustomer.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({ metadata: newMetadata })
                    });
                  } catch (err) {
                    console.error('Failed to update problem status', err);
                  }
                }}
                className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="Pending">Pending</option>
                <option value="In conversation">In conversation</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Complete">Complete</option>
              </select>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 mb-3 font-medium text-sm">
                <Car size={16} /> Fleet & Telematics
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedCustomer.vehicles} Vehicles</div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ShieldCheck size={12} /> {selectedCustomer.vehicles} Active GPS Trackers</p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 mb-3 font-medium text-sm">
                <Package size={16} /> Subscription Details
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white mb-1">Plan: {selectedCustomer.plan || 'Starter'}</div>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Total Value: {selectedCustomer.value}</p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400 mb-3 font-medium text-sm">
                <CreditCard size={16} /> Account Status
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1">{selectedCustomer.status || 'Active'}</div>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Health Score: {selectedCustomer.metadata?.health ?? 100}%</p>
            </div>
          </div>

          <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><MapPin size={18} /> Asset Overview</h3>
              <div className="h-64 bg-gray-100 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #6b7280 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium relative z-10 flex flex-col items-center gap-2">
                  <MapPin size={24} className="text-blue-500" />
                  Map view of {selectedCustomer.vehicles || 0} active vehicles
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FileText size={18} /> Past Notes & Call Context</h3>
              <div className="h-64 overflow-y-auto bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 p-4 space-y-4">
                {selectedCustomer.metadata?.assignNote ? (
                  <div className="border-l-2 border-blue-500 pl-3">
                    <p className="text-xs font-bold text-gray-500 dark:text-zinc-400 flex items-center gap-1 mb-1"><Clock size={12} /> Assignment Note</p>
                    <p className="text-sm text-gray-700 dark:text-zinc-300">{selectedCustomer.metadata.assignNote}</p>
                  </div>
                ) : null}
                {selectedCustomer.metadata?.notes ? (
                  <div className="border-l-2 border-gray-300 dark:border-zinc-600 pl-3">
                    <p className="text-xs font-bold text-gray-500 dark:text-zinc-400 flex items-center gap-1 mb-1"><Clock size={12} /> General Note</p>
                    <p className="text-sm text-gray-700 dark:text-zinc-300">{selectedCustomer.metadata.notes}</p>
                  </div>
                ) : null}
                {!selectedCustomer.metadata?.assignNote && !selectedCustomer.metadata?.notes && (
                  <p className="text-sm text-gray-500 dark:text-zinc-400 text-center mt-20">No notes available for this customer.</p>
                )}
              </div>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Base</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Manage and assist your active customers.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customers..."
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
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="At Risk">At Risk</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase tracking-wider bg-gray-50 dark:bg-zinc-900/50">
                <th className="p-4">Customer</th>
                <th className="p-4">Email</th>
                <th className="p-4">Plan</th>
                <th className="p-4">Vehicles</th>
                <th className="p-4 text-right">Problem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {customers.filter(c =>
                (statusFilter === 'All' || c.status === statusFilter) &&
                (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()))
              ).map((customer) => (
                <tr key={customer.id} onClick={() => setSelectedCustomer(customer)} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer">
                  <td className="p-4">
                    <p className="font-bold text-gray-900 dark:text-white">{customer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">LTV: {customer.value}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-zinc-300">{customer.email}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{customer.plan}</span>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{customer.vehicles}</td>
                  <td className="p-4 text-sm text-gray-500 dark:text-zinc-400 text-right">
                    {customer.supportTickets && customer.supportTickets.length > 0 
                      ? customer.supportTickets[0].subject 
                      : (customer.metadata?.assignNote || customer.metadata?.notes || '-')}
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

export default Customers;
