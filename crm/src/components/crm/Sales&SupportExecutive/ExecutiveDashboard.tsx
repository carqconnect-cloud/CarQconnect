import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';
import MetricCard from '../MetricCard';
import { 
  Users, 
  PhoneCall, 
  CalendarCheck, 
  CheckCircle2,
  Clock,
  Ticket,
  Target
} from 'lucide-react';

const ExecutiveDashboard = () => {
  const { token, user } = useAuth();
  const [timeFilter, setTimeFilter] = useState('Today');
  const [leads, setLeads] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const API_BASE = getApiBaseUrl();
        const response = await fetch(`${API_BASE}/api/v1/crm/leads`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.data) {
            setLeads(data.data.filter((l: any) => l.ownerId === user?.id));
          }
        }
      } catch (e) { console.error('Failed to fetch dashboard leads', e); }
    };
    if (token && user?.id) {
      fetchDashboardData();
    }
  }, [token, user?.id]);

  const getMultiplier = () => {
    if (timeFilter === 'Today') return 1;
    if (timeFilter === 'Last 7days') return 7;
    if (timeFilter === 'This Month') return 30;
    if (timeFilter === 'This Year') return 365;
    return 1;
  };
  
  const now = new Date();
  
  // Filter leads by selected time period based on createdAt
  const filteredLeads = leads.filter(l => {
     const created = new Date(l.createdAt);
     const diffDays = (now.getTime() - created.getTime()) / (1000 * 3600 * 24);
     const mult = getMultiplier();
     return diffDays <= mult;
  });

  const convertedLeads = filteredLeads.filter(l => l.status === 'WON').length;
  const target = getMultiplier() === 30 ? 25 : Math.max(1, Math.round(25 * (getMultiplier() / 30)));
  const conversionRate = Math.round((convertedLeads / target) * 100) || 0;
  
  // Extract real scheduled tasks from pending leads
  const tasks = leads
    .filter(l => l.status === 'NEW' || l.status === 'CONTACTED')
    .map(l => {
       if (l.notes && l.notes.startsWith('[SCHEDULED|')) {
           const parts = l.notes.split(']');
           const scheduleData = parts[0].substring(11).split('|');
           if (scheduleData.length >= 2) {
              const scheduleDate = new Date(scheduleData[0]);
              return {
                 time: scheduleDate,
                 task: scheduleData[1],
                 client: l.company || l.name,
                 status: scheduleDate < now ? 'overdue' : 'upcoming'
              };
           }
       }
       return null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.time.getTime() - b.time.getTime())
    .slice(0, 5);



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Workspace</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Manage your pipeline, calls, and tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option>Today</option>
            <option>Last 7days</option>
            <option>This Month</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
        <MetricCard 
          title="Total Leads" 
          value={filteredLeads.length.toString()} 
          icon={Users} 
          colorClass="text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30"
        />
        <MetricCard 
          title="Pending Follow-ups" 
          value={tasks.length.toString()} 
          icon={CalendarCheck} 
          colorClass="text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30"
        />
        <MetricCard 
          title="Converted Leads" 
          value={convertedLeads.toString()} 
          icon={CheckCircle2} 
          colorClass="text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30"
        />
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center gap-2 sm:gap-3 text-emerald-600 dark:text-emerald-400 mb-2">
            <Target size={18} className="shrink-0 sm:w-5 sm:h-5" />
            <h3 className="font-semibold text-xs sm:text-sm text-gray-700 dark:text-zinc-300 line-clamp-1">Monthly Target</h3>
          </div>
          <div className="flex items-end justify-between mb-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{convertedLeads}<span className="text-xs sm:text-sm lg:text-lg text-gray-500 font-medium">/{target}</span></span>
            <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">{Math.min(conversionRate, 100)}%</span>
          </div>
          <div className="w-full h-1.5 sm:h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(conversionRate, 100)}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Tasks & Follow-ups</h2>
            <button className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">View Calendar</button>
          </div>
          
          <div className="space-y-4">
            {tasks.length > 0 ? tasks.map((item: any, i) => (
              <div key={i} className="relative flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-xl transition-colors cursor-pointer border border-gray-100 dark:border-zinc-800 overflow-hidden">
                <div className={`w-2 h-full absolute left-0 top-0 bottom-0 ${item.status === 'overdue' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-gray-200 dark:border-zinc-700 pr-4">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-xs text-gray-500 dark:text-zinc-400">{item.time.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex-1 min-w-0 pl-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.task}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{item.client}</p>
                </div>
                <button className="shrink-0 p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors dark:text-blue-400 dark:hover:bg-blue-900/30">
                  <CheckCircle2 size={20} />
                </button>
              </div>
            )) : (
              <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
                No upcoming scheduled tasks.
              </div>
            )}
          </div>
        </div>

        {/* Live Call Workspace Widget */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-2xl p-6 shadow-lg shadow-blue-900/20 text-white flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
          
          <h2 className="text-lg font-semibold mb-2 relative z-10">In-App Dialer</h2>
          <p className="text-blue-200 text-sm mb-6 flex-1 relative z-10">Your SIP trunk is connected. Ready to make calls.</p>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-4 text-center relative z-10">
             <div className="w-16 h-16 mx-auto bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.5)] mb-4">
                <PhoneCall size={28} className="text-white" />
             </div>
             <p className="font-medium text-lg mb-1">Status: Online</p>
             <p className="text-sm text-blue-200">Waiting for next auto-dial...</p>
          </div>
          
          <button className="w-full bg-white text-blue-900 hover:bg-gray-100 text-sm font-bold py-3 px-4 rounded-xl transition-colors relative z-10 shadow-lg">
            Open Dialer Workspace
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
