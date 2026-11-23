import React, { useState } from 'react';
import { Search, Filter, Calendar, Clock, Plus, Target, CheckCircle2, AlertTriangle, ArrowRight, X, PhoneCall, Mail, UserPlus, FileText, ChevronRight, MessageSquare, Briefcase, Video, Settings, Activity, AlertCircle, Edit3, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

const AdminFollowUps = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'sla' | 'activity'>('list');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filterRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFiltersModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFilter = (val: string) => {
    setFilterStatuses(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val]);
  };

  const [tasks, setTasks] = useState<any[]>([]);
  const { token } = useAuth();
  
  React.useEffect(() => {
    const fetchData = async () => {
      const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('fioner_auth_token') || localStorage.getItem('token')) : null);
      if (!activeToken) return;
      const API_BASE = getApiBaseUrl();

      try {
        const [leadsRes, usersRes, teamsRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/crm/leads`, { headers: { 'Authorization': `Bearer ${activeToken}` } }),
          fetch(`${API_BASE}/api/v1/users`, { headers: { 'Authorization': `Bearer ${activeToken}` } }),
          fetch(`${API_BASE}/api/v1/crm/teams`, { headers: { 'Authorization': `Bearer ${activeToken}` } })
        ]);
        
        let fetchedUsers: any[] = [];
        if (usersRes.ok) {
          const uData = await usersRes.json();
          fetchedUsers = uData.data || [];
        }
        
        let fetchedTeams: any[] = [];
        if (teamsRes.ok) {
          const tData = await teamsRes.json();
          fetchedTeams = tData.data || [];
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
          const mappedTasks = items
            .filter((l: any) => (l.status === 'NEW' || l.status === 'CONTACTED') && (!l.notes || !l.notes.startsWith('[COMPLETED]')))
            .map((l: any) => {
              const owner = fetchedUsers.find(u => u.id === l.ownerId);
              
              let due = 'Today, 5:00 PM';
              let actionType = 'Call';
              let note = l.notes || 'Routine follow-up.';
              
              if (l.notes && l.notes.startsWith('[SCHEDULED|')) {
                const parts = l.notes.split(']');
                const scheduleData = parts[0].substring(11).split('|'); 
                if (scheduleData.length >= 2) {
                  due = new Date(scheduleData[0]).toLocaleString();
                  actionType = scheduleData[1];
                  note = parts.slice(1).join(']').trim() || 'Scheduled follow-up';
                }
              }

              return {
                id: `real-${l.id}`,
                task: `Follow up with ${l.name || l.firstName || 'Client'}`,
                client: l.company || l.name || l.firstName || 'Unknown',
                due,
                type: actionType,
                status: l.status === 'NEW' ? 'Pending' : 'Upcoming',
                note,
                agent: owner ? (owner.firstName || owner.name) : 'Unassigned',
                team: owner?.team?.name || 'No Team'
              };
            });
          setTasks(mappedTasks);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    if (token) {
      fetchData();
    }
  }, [token]);

  const activities: any[] = [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Call': return <PhoneCall size={16} />;
      case 'Email': return <Mail size={16} />;
      case 'Meeting': return <Calendar size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const renderTaskList = (taskList: any[]) => (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col animate-in fade-in">
      <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-wrap gap-4 bg-gray-50/50 dark:bg-zinc-900/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search tasks by executive or client..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
        </div>
        <select className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm rounded-lg px-4 py-2 outline-none">
          <option>All Teams</option>
          <option>Team Alpha</option>
          <option>Team Beta</option>
          <option>Team Gamma</option>
        </select>
        <div className="relative" ref={filterRef}>
          <button 
            onClick={() => setShowFiltersModal(!showFiltersModal)}
            className={`shrink-0 whitespace-nowrap px-3 py-2 border rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${showFiltersModal ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'text-gray-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700'}`}
          >
            <Filter size={16} /> Status {filterStatuses.length > 0 && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
          </button>
          
          {showFiltersModal && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-800 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
               <div className="p-3 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
                 <h3 className="font-bold text-gray-900 dark:text-white text-sm">Filter Status</h3>
                 <button onClick={() => setShowFiltersModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <X size={16} />
                 </button>
               </div>
               <div className="p-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-blue-600">
                    <input type="checkbox" checked={filterStatuses.includes('Upcoming')} onChange={() => toggleFilter('Upcoming')} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> Upcoming
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-blue-600">
                    <input type="checkbox" checked={filterStatuses.includes('Pending')} onChange={() => toggleFilter('Pending')} className="rounded border-gray-300 text-amber-500 focus:ring-amber-500" /> Pending
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-blue-600">
                    <input type="checkbox" checked={filterStatuses.includes('Overdue')} onChange={() => toggleFilter('Overdue')} className="rounded border-gray-300 text-red-500 focus:ring-red-500" /> Overdue
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer hover:text-blue-600">
                    <input type="checkbox" checked={filterStatuses.includes('Completed')} onChange={() => toggleFilter('Completed')} className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" /> Completed
                  </label>
               </div>
               <div className="p-3 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-2">
                 <button onClick={() => { setFilterStatuses([]); setShowFiltersModal(false); }} className="px-3 py-1.5 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-md text-xs font-medium transition-colors">Clear</button>
                 <button onClick={() => setShowFiltersModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm transition-colors">Apply</button>
               </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase bg-gray-50 dark:bg-zinc-900/50">
              <th className="p-4">Task / Action</th>
              <th className="p-4">Client</th>
              <th className="p-4">Executive</th>
              <th className="p-4">Team</th>
              <th className="p-4">Due Date</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {taskList.map((task) => (
              <tr key={task.id} onClick={() => setSelectedTask(task)} className={`hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors ${task.status === 'Overdue' ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
                <td className="p-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {task.status === 'Overdue' && <AlertCircle size={14} className="text-red-500" />}
                  {task.task}
                </td>
                <td className="p-4 text-medium text-gray-600 dark:text-zinc-300">{task.client}</td>
                <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{task.agent}</td>
                <td className="p-4 text-sm text-gray-500 dark:text-zinc-400">{task.team}</td>
                <td className={`p-4 text-sm font-medium ${task.status === 'Overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {task.due}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full ${
                    task.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                    task.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {task.status}
                  </span>
                </td>
              </tr>
            ))}
            {taskList.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-zinc-400">
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Task & Follow-up Monitor</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Track pending actions, monitor team SLAs, and assign global tasks.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2 w-fit">
          <Plus size={16} /> Assign Global Task
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800 mb-6 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('list')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'list' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          All Follow-ups
          {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'calendar' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          System Calendar
          {activeTab === 'calendar' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('sla')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'sla' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          SLA Breach Reports
          {activeTab === 'sla' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-red-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'activity' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Global Activity Logs
          {activeTab === 'activity' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
      </div>

      {activeTab === 'list' && (() => {
        const filteredTasks = tasks.filter(t => {
          const matchesSearch = t.task.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                t.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                t.agent.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = filterStatuses.length === 0 || filterStatuses.includes(t.status);
          return matchesSearch && matchesStatus;
        });
        return renderTaskList(filteredTasks);
      })()}

      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">Recent Global Activity</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {activities.map(act => (
              <div key={act.id} className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 flex items-center gap-4 transition-colors">
                <div className={`p-2 rounded-full ${act.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : act.type === 'warning' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                  {act.type === 'success' && <CheckCircle2 size={16}/>}
                  {act.type === 'warning' && <Clock size={16}/>}
                  {act.type === 'info' && <Edit3 size={16}/>}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-bold">{act.actor}</span> <span className="text-xs text-gray-500 dark:text-zinc-400">({act.role})</span> {act.action} <span className="font-bold">{act.task}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 flex flex-col h-[600px] animate-in fade-in">
           <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Global Task Calendar ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</h2>
              <div className="flex gap-2">
                 <button className="px-3 py-1.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800">Previous</button>
                 <button className="px-3 py-1.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800">Next</button>
              </div>
           </div>
           
           <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-zinc-700 rounded-xl overflow-hidden flex-1 border border-gray-200 dark:border-zinc-700">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                 <div key={day} className="bg-gray-50 dark:bg-zinc-800 p-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{day}</div>
              ))}
              {Array.from({length: 35}).map((_, i) => {
                 const currentDate = new Date();
                 const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                 const firstDay = cellDate.getDay();
                 cellDate.setDate(i - firstDay + 1);
                 
                 const dayTasks = tasks.filter(t => {
                   if (t.due.includes('Today')) {
                     return cellDate.getDate() === currentDate.getDate() && cellDate.getMonth() === currentDate.getMonth();
                   }
                   const tDate = new Date(t.due);
                   return !isNaN(tDate.getTime()) && tDate.getDate() === cellDate.getDate() && tDate.getMonth() === cellDate.getMonth();
                 });
                 
                 const dayOverdue = dayTasks.filter(t => {
                   if (t.due.includes('Today')) return false; 
                   const td = new Date(t.due);
                   return !isNaN(td.getTime()) && td.getTime() < currentDate.getTime();
                 }).length;
                 const dayPending = dayTasks.length - dayOverdue;

                 return (
                 <div key={i} className={`bg-white dark:bg-zinc-900 p-2 min-h-[100px] transition-colors ${cellDate.getMonth() !== currentDate.getMonth() ? 'opacity-50 bg-gray-50 dark:bg-zinc-900/50' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}>
                    <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">{cellDate.getDate()}</span>
                    {dayOverdue > 0 && (
                       <div className="mt-1 p-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs truncate font-medium">
                          {dayOverdue} Overdue
                       </div>
                    )}
                    {dayPending > 0 && (
                       <div className="mt-1 p-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs truncate font-medium">
                          {dayPending} Pending
                       </div>
                    )}
                 </div>
               )})}
           </div>
        </div>
      )}

      {activeTab === 'sla' && (() => {
        const currentDate = new Date();
        const overdueTasks = tasks.filter(t => {
          if (t.due.includes('Today')) return false;
          const td = new Date(t.due);
          return !isNaN(td.getTime()) && td.getTime() < currentDate.getTime();
        });
        const totalOverdue = overdueTasks.length;
        
        const teamBreaches = overdueTasks.reduce((acc, t) => {
          acc[t.team] = (acc[t.team] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const sortedTeams = (Object.entries(teamBreaches) as [string, number][]).sort((a, b) => b[1] - a[1]);
        const worstTeam = sortedTeams.length > 0 ? sortedTeams[0][0] : 'None';
        const maxBreaches = sortedTeams.length > 0 ? sortedTeams[0][1] : 0;

        return (
        <div className="space-y-6 animate-in fade-in">
           <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6">
              <div className="bg-red-50 dark:bg-red-900/10 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-red-100 dark:border-red-900/30">
                 <h3 className="text-red-800 dark:text-red-400 text-xs sm:text-sm font-bold mb-1">Total Overdue</h3>
                 <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-900 dark:text-red-300">{totalOverdue}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-amber-100 dark:border-amber-900/30">
                 <h3 className="text-amber-800 dark:text-amber-400 text-xs sm:text-sm font-bold mb-1">Avg Delay</h3>
                 <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-900 dark:text-amber-300">{totalOverdue > 0 ? '1.5 Days' : '0 Days'}</p>
              </div>
              <div className="col-span-2 md:col-span-1 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                 <h3 className="text-gray-500 dark:text-zinc-400 text-xs sm:text-sm font-bold mb-1">Worst Performing Team</h3>
                 <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">{worstTeam}</p>
              </div>
           </div>
           
           <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
                 <h2 className="font-bold text-lg text-gray-900 dark:text-white">SLA Breach Breakdown</h2>
              </div>
              <div className="p-6">
                 <div className="space-y-6 max-w-3xl">
                    {sortedTeams.length > 0 ? sortedTeams.map(([team, count], idx) => (
                       <div key={team}>
                          <div className="flex justify-between text-sm mb-2">
                             <span className="font-medium text-gray-700 dark:text-zinc-300">{team} ({count} breaches)</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-3">
                             <div className="bg-red-500 h-3 rounded-full" style={{width: `${(count / maxBreaches) * 100}%`}}></div>
                          </div>
                       </div>
                    )) : (
                      <div className="text-gray-500 dark:text-zinc-400 py-4 text-center">No SLA breaches found.</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )})()}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${selectedTask.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    {selectedTask.type} • {selectedTask.status}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
                    <User size={10} /> {selectedTask.agent} • {selectedTask.team}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-2">{selectedTask.task}</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">For {selectedTask.client} • Due {selectedTask.due}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Original Note</h3>
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 text-sm text-gray-700 dark:text-zinc-300">
                  {selectedTask.note}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-between gap-3">
              <button onClick={() => setSelectedTask(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2">
                 Close
              </button>
              <button onClick={() => setSelectedTask(null)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                 Reassign / Edit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newTask = {
                id: Date.now(),
                task: formData.get('task') as string,
                client: formData.get('client') as string,
                due: formData.get('due') as string,
                type: formData.get('type') as string,
                status: 'Pending',
                note: formData.get('note') as string,
                agent: formData.get('agent') as string || 'Unassigned',
                team: formData.get('team') as string
              };
              setTasks(prev => [newTask, ...prev]);
              setShowCreateModal(false);
              toast.success('Global task assigned successfully');
            }}>
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Plus size={20} className="text-blue-500" /> Assign Global Task</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Task / Action Required</label>
                <input type="text" name="task" placeholder="e.g. Call John to confirm details" className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assign to Team</label>
                   <select name="team" className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm">
                      <option>Team Alpha</option>
                      <option>Team Beta</option>
                      <option>Team Gamma</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Or Specific Agent</label>
                   <select name="agent" className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm">
                      <option value="">-- Let Team Head Decide --</option>
                      <option>Sarah Jenkins</option>
                      <option>Emily Chen</option>
                      <option>Mike Smith</option>
                   </select>
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Client / Lead</label>
                <input type="text" name="client" placeholder="Search customers..." className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Due Date</label>
                   <input type="datetime-local" name="due" className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm" required />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Type</label>
                   <select name="type" className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm">
                      <option>Call</option>
                      <option>Email</option>
                      <option>Meeting</option>
                   </select>
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Notes</label>
                <textarea name="note" rows={2} placeholder="Add instructions..." className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm"></textarea>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                Assign Global Task
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFollowUps;
