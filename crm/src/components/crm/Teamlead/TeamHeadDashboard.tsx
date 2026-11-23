"use client";

import React, { useState } from 'react';
import MetricCard from '../MetricCard';
import { 
  Users, 
  PhoneCall, 
  TrendingUp,
  Clock,
  Layers,
  ShieldCheck,
  Target
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

const slaData = [
  { day: 'Mon', compliance: 92 },
  { day: 'Tue', compliance: 94 },
  { day: 'Wed', compliance: 91 },
  { day: 'Thu', compliance: 95 },
  { day: 'Fri', compliance: 97 },
  { day: 'Sat', compliance: 98 },
  { day: 'Sun', compliance: 94 },
];

const TeamHeadDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('This Month');
  const { token, user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teamExecs, setTeamExecs] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const API_BASE = getApiBaseUrl();
        const [leadsRes, usersRes, teamsRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/crm/leads`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/v1/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/v1/crm/teams`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        let fetchedUsers: any[] = [];
        if (usersRes.ok) {
          const uData = await usersRes.json();
          fetchedUsers = uData.data || [];
          setUsers(fetchedUsers);
        }
        
        if (teamsRes.ok) {
          const tData = await teamsRes.json();
          const myTeam = (tData.data || []).find((t: any) => t.head?.id === user?.id);
          const currentTeamId = myTeam?.id;
          setTeamExecs(fetchedUsers.filter(u => currentTeamId && u.teamId === currentTeamId && (u.role === 'EXECUTIVE' || u.role === 'TEAM_HEAD')));
        }

        if (leadsRes.ok) {
          const lData = await leadsRes.json();
          setLeads(lData.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (token && user?.id) {
      fetchData();
    }
  }, [token, user?.id]);

  // Filter leads by owner and by time filter
  const teamMemberIds = teamExecs.map(e => e.id).concat(user?.id);
  
  const now = new Date();
  let startDate = new Date(0);
  if (timeFilter === 'Today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeFilter === 'Last 7days') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeFilter === 'This Month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (timeFilter === 'This Year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const teamLeads = leads.filter(l => {
    if (!teamMemberIds.includes(l.ownerId)) return false;
    if (!l.createdAt) return true; // Fallback if no date
    return new Date(l.createdAt) >= startDate;
  });

  // Calculate dynamic metrics
  const newLeadsCount = teamLeads.filter(l => l.status === 'NEW').length;
  const conversationCount = teamLeads.filter(l => l.status === 'IN_CONVERSATION' || l.status === 'CONTACTED').length;
  const negotiationCount = teamLeads.filter(l => l.status === 'NEGOTIATION' || l.status === 'PROPOSAL').length;
  const wonCount = teamLeads.filter(l => l.status === 'WON').length;
  const totalPipeline = newLeadsCount + conversationCount + negotiationCount;

  const pipelineData = [
    { name: 'New Leads', value: newLeadsCount, color: '#3b82f6' },
    { name: 'In Conversation', value: conversationCount, color: '#f59e0b' },
    { name: 'Negotiation', value: negotiationCount, color: '#10b981' }
  ];

  const perfData = teamExecs.map(exec => {
    const userLeads = teamLeads.filter(l => l.ownerId === exec.id);
    const conversions = userLeads.filter(l => l.status === 'WON').length;
    return {
      name: exec.firstName || exec.name,
      'Total Leads': userLeads.length,
      Conversions: conversions,
    };
  }).slice(0, 5);

  const getMultiplier = () => {
    if (timeFilter === 'Today') return 1;
    if (timeFilter === 'Last 7days') return 1;
    if (timeFilter === 'This Month') return 1;
    if (timeFilter === 'This Year') return 1;
    return 1;
  };
  const m = getMultiplier();
  const conversionRate = teamLeads.length ? ((wonCount / teamLeads.length) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Head Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Overview of your team's sales and support metrics.</p>
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
          title="Team Conversion Rate" 
          value={`${conversionRate}%`} 
          icon={Target} 
          trend={0} 
          trendLabel="total"
          colorClass="text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30"
        />
        <MetricCard 
          title="Team Executives" 
          value={`${teamExecs.length}`} 
          icon={Users} 
          trend={0}
          trendLabel="active"
          colorClass="text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30"
        />
        <MetricCard 
          title="Active Lead Pipeline" 
          value={totalPipeline.toLocaleString()} 
          icon={Layers} 
          trend={0} 
          trendLabel="total"
          colorClass="text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30"
        />
        <MetricCard 
          title="Total Won Leads" 
          value={`${wonCount}`} 
          icon={ShieldCheck} 
          trend={0} 
          trendLabel="total"
          colorClass="text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Executive Performance Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Executive Performance</h2>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={280} minWidth={100} debounce={50}>
              <BarChart data={perfData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800 opacity-50" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6', className: 'dark:fill-zinc-800/50' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-white, #fff)' }}
                  wrapperClassName="dark:!bg-zinc-800 dark:!text-white"
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="Total Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="Conversions" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Pipeline Widget */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col">
          <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Team Lead Pipeline</h2>
          
          <div className="flex-1 flex flex-col items-center justify-center min-h-[250px]">
            <ResponsiveContainer width="100%" height={200} minWidth={100} debounce={50}>
              <PieChart>
                <Pie
                  data={pipelineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  wrapperClassName="dark:!bg-zinc-800 dark:!text-white"
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="w-full mt-4 space-y-3">
              {pipelineData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-gray-600 dark:text-zinc-400">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button className="w-full mt-6 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 text-sm font-medium py-2.5 px-4 rounded-xl transition-colors border border-blue-200 dark:border-blue-800/50">
            Manage Assignment Rules
          </button>
        </div>
      </div>
      
      {/* SLA Compliance Trend */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SLA Compliance Trends (7 Days)</h2>
        </div>
        <div className="w-full h-[250px]">
          <ResponsiveContainer width="100%" height={250} minWidth={100} debounce={50}>
            <LineChart data={slaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800 opacity-50" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} domain={['dataMin - 2', 100]} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                wrapperClassName="dark:!bg-zinc-800 dark:!text-white"
              />
              <Line type="monotone" dataKey="compliance" name="Compliance %" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default TeamHeadDashboard;
