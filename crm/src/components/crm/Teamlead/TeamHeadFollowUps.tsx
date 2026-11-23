import React, { useState } from 'react';
import { CalendarClock, AlertTriangle, Users, Calendar, ArrowRight, UserMinus, Search, Filter, Plus, PhoneCall, Mail, Clock, CheckCircle2, User, X, Activity, Edit3 } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';

const TeamHeadFollowUps = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'overdue' | 'activity'>('list');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('All');

  const absentAgents: string[] = [];

  const { token, user } = useAuth();
  const [realTasks, setRealTasks] = useState<any[]>([]);
  const [teamAgents, setTeamAgents] = useState<any[]>([]);

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
        }
        
        let currentTeamId: any = null;
        let tExecs: any[] = [];
        if (teamsRes.ok) {
          const tData = await teamsRes.json();
          const myTeam = (tData.data || []).find((t: any) => t.head?.id === user?.id);
          currentTeamId = myTeam?.id;
          tExecs = fetchedUsers.filter(u => currentTeamId && u.teamId === currentTeamId && (u.role === 'EXECUTIVE' || u.role === 'TEAM_HEAD'));
          setTeamAgents(tExecs);
        }

        if (leadsRes.ok && tExecs.length > 0) {
          const lData = await leadsRes.json();
          const teamMemberIds = tExecs.map(e => e.id);
          const teamLeads = (lData.data || []).filter((l: any) => teamMemberIds.includes(l.ownerId));
          
          const mappedTasks = teamLeads
            .filter((l: any) => (l.status === 'NEW' || l.status === 'CONTACTED') && (!l.notes || !l.notes.startsWith('[COMPLETED]')))
            .map((l: any) => {
              const owner = tExecs.find(u => u.id === l.ownerId);
              let due = 'Today, 5:00 PM';
              let actionType = 'Call';
              let note = l.notes || 'Routine follow-up.';
              let status = l.status === 'NEW' ? 'Pending' : 'Upcoming';
              if (l.notes && l.notes.startsWith('[SCHEDULED|')) {
                const parts = l.notes.split(']');
                const scheduleData = parts[0].substring(11).split('|'); 
                if (scheduleData.length >= 2) {
                  const scheduleDate = new Date(scheduleData[0]);
                  due = scheduleDate.toLocaleString();
                  actionType = scheduleData[1];
                  note = parts.slice(1).join(']').trim() || 'Scheduled follow-up';
                  if (scheduleDate < new Date()) {
                    status = 'Overdue';
                  }
                }
              }

              return {
                id: `real-${l.id}`,
                task: `Follow up with ${l.name || l.firstName || 'Client'}`,
                client: l.company || l.name || l.firstName || 'Unknown',
                due,
                type: actionType,
                status,
                note,
                agent: owner ? (owner.firstName || owner.name) : 'Unknown'
              };
            });
          setRealTasks(mappedTasks);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    if (token && user?.id) {
      fetchData();
    }
  }, [token, user?.id]);

  const tasks = realTasks;

  const activities = tasks.filter(t => t.due !== 'Today, 5:00 PM').map((t, i) => ({
    id: i,
    agent: t.agent,
    action: t.status === 'Overdue' ? 'missed a deadline for' : 'scheduled',
    task: t.task,
    time: t.due,
    type: t.status === 'Overdue' ? 'warning' : 'info'
  })).slice(0, 10);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Call': return <PhoneCall size={16} />;
      case 'Email': return <Mail size={16} />;
      case 'Meeting': return <Calendar size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.task.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.agent.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAgent = selectedAgent === 'All' || t.agent === selectedAgent;
    return matchesSearch && matchesAgent;
  });

  const overdueTasks = filteredTasks.filter(t => t.status === 'Overdue');
  const listTasks = filteredTasks.filter(t => t.status !== 'Overdue');

  const renderTaskList = (taskList: any[], isOverdueView: boolean = false) => (
    <div className="space-y-6 animate-in fade-in">
       {isOverdueView && absentAgents.length > 0 && (
         <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
               <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                  <UserMinus size={24} />
               </div>
               <div>
                  <h3 className="font-bold text-amber-900 dark:text-amber-500">Agent Absent: {absentAgents.join(', ')}</h3>
                  <p className="text-sm text-amber-800 dark:text-amber-400 mt-1">There are pending follow-ups assigned to absent agents today. Please reassign them.</p>
               </div>
            </div>
            <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap">
               Bulk Reassign
            </button>
         </div>
       )}

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="relative w-72">
            <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search tasks by client or agent..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" 
            />
          </div>
          <div className="relative">
            <select 
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            >
              <option value="All">All Agents</option>
              {teamAgents.map(a => (
                <option key={a.id} value={a.firstName || a.name}>{a.firstName || a.name}</option>
              ))}
              <option value="Emily Chen">Emily Chen</option>
              <option value="Mike Smith">Mike Smith</option>
              <option value="Sarah Jenkins">Sarah Jenkins</option>
            </select>
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-zinc-800 text-[13px] font-bold text-gray-500 dark:text-white uppercase tracking-wider bg-gray-50 dark:bg-zinc-900/50">
              <th className="p-4 font-medium">Task & Client</th>
              <th className="p-4 font-medium">Due Date</th>
              <th className="p-4 font-medium">Assigned Agent</th>
              {isOverdueView && <th className="p-4 font-medium text-right">Reassign</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {taskList.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                <td className="p-4 cursor-pointer" onClick={() => setSelectedTask(task)}>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white hover:text-blue-600">{task.task}</p>
                    {task.status === 'Overdue' && <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> Overdue</span>}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-zinc-400">{task.client} • {task.type}</p>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${task.status === 'Overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                    {task.due}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-sm font-bold flex items-center gap-1.5 ${absentAgents.includes(task.agent) ? 'text-amber-600 dark:text-amber-500' : 'text-gray-900 dark:text-white'}`}>
                    {absentAgents.includes(task.agent) && <UserMinus size={14} />} {task.agent}
                  </span>
                </td>
                {isOverdueView && (
                  <td className="p-4 flex justify-end">
                    <select className="bg-transparent border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer w-40" onClick={e => e.stopPropagation()}>
                      <option value="" disabled selected>Select Agent</option>
                      <option value="Sarah Jenkins">Sarah Jenkins</option>
                      <option value="Emily Chen">Emily Chen</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
            {taskList.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-zinc-400">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
             <CalendarClock className="text-amber-500" /> Team Follow-Ups
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Track overdue tasks, monitor the calendar, and assign follow-ups.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2 w-fit">
          <Plus size={16} /> Assign New Task
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-6">
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm border-b-4 border-b-red-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
            <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Total Overdue</h3>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{overdueTasks.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm border-b-4 border-b-blue-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-blue-600 dark:text-blue-400">
            <Calendar size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
            <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Scheduled Today</h3>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{
            tasks.filter(t => {
              if (t.due.includes('Today')) return true;
              const d = new Date(t.due);
              return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
            }).length
          }</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white dark:bg-zinc-900 p-3.5 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm border-b-4 border-b-amber-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4 text-amber-600 dark:text-amber-400">
            <UserMinus size={18} className="shrink-0 mt-0.5 sm:w-5 sm:h-5" />
            <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">Absent Agents</h3>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{absentAgents.length}</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('list')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'list' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <Search size={16}/> Follow-up List
          {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'calendar' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <Calendar size={16}/> Team Calendar View
          {activeTab === 'calendar' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('overdue')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <AlertTriangle size={16}/> Overdue & Reassignments
          {activeTab === 'overdue' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-red-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'activity' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <Activity size={16}/> Agent Activity Logs
          {activeTab === 'activity' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
      </div>

      {activeTab === 'list' && renderTaskList(listTasks, false)}
      {activeTab === 'overdue' && renderTaskList(overdueTasks, true)}

      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in fade-in">
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">Recent Follow-up Activity</h2>
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
                  <p className="text-sm text-gray-900 dark:text-white"><span className="font-bold">{act.agent}</span> {act.action} <span className="font-bold">{act.task}</span></p>
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
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">Team Schedule ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</h2>
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
                 
                 const dayOverdue = dayTasks.filter(t => t.status === 'Overdue').length;
                 const dayPending = dayTasks.length - dayOverdue;

                 return (
                 <div key={i} className={`bg-white dark:bg-zinc-900 p-2 min-h-[80px] transition-colors ${cellDate.getMonth() !== currentDate.getMonth() ? 'opacity-50 bg-gray-50 dark:bg-zinc-900/50' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}>
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
                    <User size={10} /> Agent: {selectedTask.agent}
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
              <button onClick={() => setSelectedTask(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                 Reassign Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Plus size={20} className="text-blue-500" /> Assign New Task</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Task / Action Required</label>
                <input type="text" placeholder="e.g. Call John to confirm details" className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Assign to Agent</label>
                <select className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white">
                  <option>Sarah Jenkins</option>
                  <option>Emily Chen</option>
                  <option>Mike Smith</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Client / Lead</label>
                <input type="text" placeholder="Search customers..." className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Due Date</label>
                   <input type="datetime-local" className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Type</label>
                   <select className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm">
                      <option>Call</option>
                      <option>Email</option>
                      <option>Meeting</option>
                   </select>
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Notes</label>
                <textarea rows={2} placeholder="Add instructions..." className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm"></textarea>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                Assign Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamHeadFollowUps;
