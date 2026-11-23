import React, { useState, useEffect } from 'react';
import MetricCard from '../MetricCard';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { 
  Users, 
  PhoneCall, 
  TrendingUp,
  Target,
  BarChart3,
  Loader2,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { useAuth } from '../../AuthContext';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const EMPTY_LEADS_CHART = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
  name: d, inbound: 0, outbound: 0
}));

const EMPTY_CUSTOMERS_CHART = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({
  name: d, customers: 0
}));

const getSimpleStatus = (status: string) => {
  const map: Record<string, string> = {
    'NEW': 'New',
    'ATTEMPTED_TO_CONTACT': 'Contacted',
    'IN_CONVERSATION': 'In Progress',
    'QUALIFIED': 'Interested',
    'PROPOSAL': 'Negotiating',
    'CONVERTED': 'Converted',
    'WON': 'Won',
    'LOST': 'Lost'
  };
  return map[status] || status.replace(/_/g, ' ');
};

const Dashboard = () => {
  const { token } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('This month');

  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    newLeadsThisMonth: 0,
    leadTrend: 0,
    totalCustomers: 0,
    customerTrend: 0,
    conversionRate: 0,
    lowHealthCustomers: 0,

    teamMembers: 0,
  });
  const [leadsByStatus, setLeadsByStatus] = useState<{ status: string; count: number }[]>([]);
  const [leadsChartData, setLeadsChartData] = useState(EMPTY_LEADS_CHART);
  const [customersChartData, setCustomersChartData] = useState(EMPTY_CUSTOMERS_CHART);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!token) return;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({ filter: timeFilter.replace(/\s+/g, '').toLowerCase() });
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/v1/crm/dashboard/stats?${queryParams.toString()}`, {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.data) {
            setMetrics(data.data.metrics);
            setLeadsByStatus(data.data.leadsByStatus || []);
            if (data.data.leadsChartData?.length) {
              setLeadsChartData(data.data.leadsChartData);
            }
            if (data.data.customersChartData?.length) {
              setCustomersChartData(data.data.customersChartData);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [token, timeFilter]);

  const pieData = leadsByStatus.length > 0
    ? leadsByStatus.map(s => ({ name: getSimpleStatus(s.status), value: s.count }))
    : [{ name: 'No Data', value: 1 }];

  const totalLeadsForPie = leadsByStatus.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Live overview of all CRM data and metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-zinc-500 mr-2">
              <Loader2 size={16} className="animate-spin" />
              Loading...
            </div>
          )}
          <select 
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option>Today</option>
            <option>Last 7days</option>
            <option>This month</option>
            <option>This year</option>
          </select>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
        <MetricCard 
          title="Total Leads" 
          value={metrics.totalLeads.toLocaleString()} 
          icon={Target} 
          trend={metrics.leadTrend} 
          trendLabel="vs last month"
          colorClass="text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30"
        />
        <MetricCard 
          title="Total Customers" 
          value={metrics.totalCustomers.toLocaleString()} 
          icon={Users} 
          trend={metrics.customerTrend} 
          trendLabel="vs last month"
          colorClass="text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30"
        />
        <MetricCard 
          title="Conversion Rate" 
          value={`${metrics.conversionRate}%`} 
          icon={TrendingUp} 
          trend={0}
          trendLabel="WON leads"
          colorClass="text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30"
        />
        <MetricCard 
          title="Low Health Customers" 
          value={metrics.lowHealthCustomers.toLocaleString()} 
          icon={Activity} 
          trend={0}
          trendLabel="needs attention"
          colorClass="text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
        />

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Volume Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Lead Activity (Last 7 Days)</h2>
          <div className="h-72 w-full" style={{ minHeight: '288px', width: '100%', minWidth: '100px' }}>
            {mounted && (
              <ResponsiveContainer width="100%" height={280} minWidth={100} debounce={50}>
                <BarChart data={leadsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                  <Bar dataKey="inbound" name="New Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Status Pie Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Lead Status Breakdown</h2>
          <div className="h-64 w-full flex items-center justify-center relative" style={{ minHeight: '256px', width: '100%', minWidth: '100px' }}>
            {mounted && (
              <ResponsiveContainer width="100%" height={256} minWidth={100} debounce={50}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-2xl font-bold text-gray-900 dark:text-white">{totalLeadsForPie}</span>
               <span className="text-xs text-gray-500">Total Leads</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
             {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                   <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">{item.name}</span>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Stats */}
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-6 shadow-lg shadow-teal-500/20 text-white flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
          <h2 className="text-lg font-semibold mb-2 relative z-10">Team Overview</h2>
          <p className="text-emerald-50 text-sm mb-4 flex-1 relative z-10">Your active team managing CRM operations.</p>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-4 relative z-10">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Active Team Members</span>
              <span className="text-sm font-bold bg-white text-teal-600 px-2 py-0.5 rounded-full">{metrics.teamMembers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">New Leads (This Month)</span>
              <span className="text-sm font-bold bg-white text-teal-600 px-2 py-0.5 rounded-full">{metrics.newLeadsThisMonth}</span>
            </div>
          </div>

          <div className="flex gap-2 relative z-10">
            <button className="flex-1 bg-white/20 hover:bg-white/30 text-white text-sm font-medium py-2.5 px-4 rounded-xl backdrop-blur-md transition-colors border border-white/20 flex items-center justify-center gap-2">
              <PhoneCall size={16} /> Monitor Team
            </button>
          </div>
        </div>

        {/* Customer Growth Graph */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Growth (Last 7 Days)</h2>
          </div>
          <div className="h-64 w-full" style={{ minHeight: '256px', width: '100%', minWidth: '100px' }}>
            {mounted && (
              <ResponsiveContainer width="100%" height={256} minWidth={100} debounce={50}>
                <AreaChart data={customersChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip 
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="customers" name="New Customers" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCustomers)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
