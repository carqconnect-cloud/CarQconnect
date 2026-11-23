"use client";

import React, { useState } from 'react';
import { Download, TrendingUp, Users, Target, Headphones, LifeBuoy, Zap, Calendar, ArrowUpRight, BarChart3, Database, RefreshCcw, Bot, X, Upload} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

const AdminCRMReport = () => {
  const { token } = useAuth();
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('CSV');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  React.useEffect(() => {
    if (!token) return;
    const fetchReport = async () => {
      try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/v1/crm/dashboard/report`, {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setReport(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch CRM report', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [token]);

  const handleExport = () => {
    if (!report) return;
    setShowExportModal(false);
    
    if (exportFormat === 'XLSX') {
      const workbook = XLSX.utils.book_new();
      
      // Sheet 1: Summary
      const summaryData = [
        { Metric: "Total Customers", Value: report.totalCustomers.toString() },
        { Metric: "Active Leads", Value: report.activeLeads.toString() },
        { Metric: "Support Tickets", Value: report.supportTickets.toString() },
        { Metric: "Total Revenue", Value: report.totalRevenue },
        { Metric: "AI Calls Made", Value: report.aiCalls.made.toString() },
        { Metric: "AI Call Success", Value: `${report.aiCalls.successRate}%` },
        { Metric: "Human Calls Made", Value: report.humanCalls.made.toString() },
        { Metric: "Human Call Conversion", Value: `${report.humanCalls.successRate}%` }
      ];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), "Summary");


      
      if (report.topCustomers?.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.topCustomers), "Top Customers");
      }

      if (report.teamPerformance?.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.teamPerformance), "Team Performance");
      }

      XLSX.writeFile(workbook, "crm_comprehensive_report.xlsx");
    } else {
      let csvContent = "--- CRM SUMMARY ---\nMetric,Value\n";
      const summaryData = [
        { Metric: "Total Customers", Value: report.totalCustomers.toString() },
        { Metric: "Active Leads", Value: report.activeLeads.toString() },
        { Metric: "Support Tickets", Value: report.supportTickets.toString() },
        { Metric: "Total Revenue", Value: report.totalRevenue },
        { Metric: "AI Calls Made", Value: report.aiCalls.made.toString() },
        { Metric: "Human Calls Made", Value: report.humanCalls.made.toString() }
      ];
      csvContent += summaryData.map(row => `"${row.Metric}","${row.Value}"`).join('\n');
      


      if (report.topCustomers?.length > 0) {
        csvContent += "\n\n--- TOP CUSTOMERS ---\nName,Contact,Total Spend,Plan\n";
        csvContent += report.topCustomers.map((c: any) => `"${c.name}","${c.email}","${c.totalSpend}","${c.plan}"`).join('\n');
      }

      if (report.teamPerformance?.length > 0) {
        csvContent += "\n\n--- TEAM PERFORMANCE ---\nTeam,Total Employee,Deals Closed\n";
        csvContent += report.teamPerformance.map((t: any) => `"${t.name}","${t.totalEmployee}","${t.dealsClosed}"`).join('\n');
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'crm_comprehensive_report.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    toast.success('CRM Comprehensive Report exported successfully');
  };

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="text-blue-600 dark:text-blue-400" />
            Comprehensive CRM Report
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Holistic view of all CRM modules, performance metrics, and system data.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowExportModal(true)}
            disabled={loading || !report}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
          >
            <Upload size={18} />
            Export Report
          </button>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExportModal(false)}></div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Download className="text-blue-600" />
                Export CRM Report
              </h2>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-zinc-300 mb-3">Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setExportFormat('CSV')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-colors ${exportFormat === 'CSV' ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                  >
                    CSV File
                  </button>
                  <button 
                    onClick={() => setExportFormat('XLSX')}
                    className={`p-3 rounded-xl border-2 text-sm font-bold transition-colors ${exportFormat === 'XLSX' ? 'border-emerald-600 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                  >
                    Excel (XLSX)
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowExportModal(false)} className="px-5 py-2.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-xl text-sm font-bold transition-colors">
                Cancel
              </button>
              <button onClick={handleExport} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                <Download size={16} /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
        <StatCard title="Total Customers" value={report?.totalCustomers || 0} change={null} icon={Users} color="blue" />
        <StatCard title="Active Leads" value={report?.activeLeads || 0} change={null} icon={Target} color="indigo" />
        <StatCard title="Support Tickets" value={report?.supportTickets || 0} change={null} icon={LifeBuoy} color="emerald" />
        <StatCard title="Total Revenue" value={report?.totalRevenue || "$0"} change={null} icon={TrendingUp} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads & Conversion */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Target className="text-blue-500" size={20} /> Leads Breakdown
          </h3>
          <div className="space-y-4">
            {report?.leadsBreakdown ? (
              report.leadsBreakdown.map((lb: any) => (
                <ProgressBar key={lb.status} label={lb.status.replace(/_/g, ' ')} value={report.activeLeads ? Math.round((lb.count / Math.max(1, (report.activeLeads + (report.leadsBreakdown.find((x: any) => x.status === 'WON')?.count || 0)))) * 100) : 0} color="bg-blue-500" />
              ))
            ) : (
              <p className="text-sm text-gray-500">Loading...</p>
            )}
          </div>
        </div>

        {/* AI vs Human Performance */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Zap className="text-indigo-500" size={20} /> Calling Operations
          </h3>
          <div className="grid grid-cols-2 gap-4 h-[calc(100%-3rem)]">
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 flex flex-col justify-center items-center text-center">
               <Bot size={28} className="text-indigo-600 dark:text-indigo-400 mb-2" />
               <p className="text-2xl font-bold text-gray-900 dark:text-white">{report?.aiCalls?.made || 0}</p>
               <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">AI Calls Made</p>
               <span className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{report?.aiCalls?.successRate || 0}% Success</span>
            </div>
            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4 flex flex-col justify-center items-center text-center">
               <Headphones size={28} className="text-blue-600 dark:text-blue-400 mb-2" />
               <p className="text-2xl font-bold text-gray-900 dark:text-white">{report?.humanCalls?.made || 0}</p>
               <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Human Calls Made</p>
               <span className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{report?.humanCalls?.successRate || 0}% Conversion</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns and Support Row */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">


        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <LifeBuoy className="text-amber-500" size={20} /> Support SLA
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">Avg First Response</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{report?.supportSLA?.avgFirstResponse || "N/A"}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full w-[85%]"></div></div>
            
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">Avg Resolution Time</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{report?.supportSLA?.avgResolutionTime || "N/A"}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5"><div className="bg-blue-500 h-1.5 rounded-full w-[70%]"></div></div>
            
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">SLA Breach Rate</span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">{report?.supportSLA?.slaBreachRate || "0%"}</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5"><div className="bg-red-500 h-1.5 rounded-full w-[4%]"></div></div>
          </div>
        </div>
      </div>

      {/* Customers and Teams Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Users className="text-blue-500" size={20} /> Top Customers
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium text-right">Total Spend</th>
                    <th className="pb-3 font-medium text-right">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                  {report?.topCustomers?.length > 0 ? report.topCustomers.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-4 font-bold text-gray-900 dark:text-white text-sm">{c.name}</td>
                      <td className="py-4 text-sm text-gray-600 dark:text-zinc-300">
                        <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-xs font-semibold">{c.plan}</span>
                      </td>
                      <td className="py-4 text-sm font-bold text-gray-900 dark:text-white text-right">{c.totalSpend}</td>
                      <td className="py-4 text-sm text-emerald-600 dark:text-emerald-400 font-medium text-right">{c.email}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-4 text-center text-sm text-gray-500">No customers found</td></tr>
                  )}
                </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 overflow-hidden">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="text-purple-500" size={20} /> Team Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
                    <th className="pb-3 font-medium">Team</th>
                    <th className="pb-3 font-medium text-center">Total Employee</th>
                    <th className="pb-3 font-medium text-right">Deals Closed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
                  {report?.teamPerformance?.length > 0 ? report.teamPerformance.map((t: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-4 font-bold text-gray-900 dark:text-white text-sm">{t.name}</td>
                      <td className="py-4 text-sm text-center text-gray-600 dark:text-zinc-300">{t.totalEmployee}</td>
                      <td className="py-4 text-sm font-bold text-gray-900 dark:text-white text-right">{t.dealsClosed}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3} className="py-4 text-center text-sm text-gray-500">No teams found</td></tr>
                  )}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, change, icon: Icon, color }: any) => {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    purple: 'text-purple-600 dark:text-purple-400',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  const isPositive = change && change.startsWith('+');

  return (
    <div className={`bg-white dark:bg-zinc-900 p-3 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 border-b-4 border-b-${color}-500 flex flex-col justify-between h-full overflow-hidden`}>
      <div className={`flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 ${colorMap[color] || 'text-gray-600 dark:text-gray-400'}`}>
        <Icon size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
        <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">{title}</h3>
      </div>
      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      {change && (
        <div className="mt-2 sm:mt-4 flex items-center text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400">
          <span className={`font-medium mr-1.5 sm:mr-2 flex items-center ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            <ArrowUpRight size={14} className={`mr-0.5 sm:mr-1 ${!isPositive ? 'rotate-90' : ''}`} />
            {change}
          </span>
        </div>
      )}
    </div>
  );
};

const ProgressBar = ({ label, value, color }: any) => (
  <div>
    <div className="flex justify-between text-sm font-medium mb-1">
      <span className="text-gray-700 dark:text-zinc-300">{label}</span>
      <span className="text-gray-900 dark:text-white">{value}%</span>
    </div>
    <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
      <div className={`${color} h-2 rounded-full transition-all duration-1000 ease-out`} style={{ width: `${value}%` }}></div>
    </div>
  </div>
);



export default AdminCRMReport;
