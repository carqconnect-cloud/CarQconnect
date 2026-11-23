"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Clock, CheckCircle2, PhoneCall, Mail, AlertTriangle, ArrowRight, X, User } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { getApiBaseUrl } from '../../../utils/apiBase';
import { useReminder } from '../../ReminderContext';
import toast from 'react-hot-toast';

const FollowUps = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'overdue'>('list');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const [completionNotes, setCompletionNotes] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [newScheduleAction, setNewScheduleAction] = useState('Follow-up Call');

  const { token, user } = useAuth();
  const { addReminder } = useReminder();
  const [realTasks, setRealTasks] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchLeads = async () => {
      try {
        const API_BASE = getApiBaseUrl();
        const response = await fetch(`${API_BASE}/api/v1/crm/leads`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.data) {
            const myLeads = data.data
              .filter((l: any) => l.ownerId === user?.id && (l.status === 'NEW' || l.status === 'CONTACTED') && (!l.notes || !l.notes.startsWith('[COMPLETED]')))
              .map((l: any) => {
                let due = 'Today, 5:00 PM';
                let actionType = 'Call';
                let note = l.notes || 'Routine follow-up.';
                
                if (l.notes && l.notes.startsWith('[SCHEDULED|')) {
                  const parts = l.notes.split(']');
                  const scheduleData = parts[0].substring(11).split('|'); // remove '[SCHEDULED|'
                  let status = l.status === 'NEW' ? 'Pending' : 'Upcoming';
                  if (scheduleData.length >= 2) {
                    const scheduleDate = new Date(scheduleData[0]);
                    due = scheduleDate.toLocaleString();
                    actionType = scheduleData[1];
                    note = parts.slice(1).join(']').trim() || 'Scheduled follow-up';
                    
                    if (scheduleDate < new Date()) {
                      status = 'Overdue';
                    }
                    
                    // Setup 5 min notification
                    const scheduledTime = scheduleDate.getTime();
                    const timeToNotify = scheduledTime - 5 * 60 * 1000 - Date.now();
                    if (timeToNotify > 0 && timeToNotify < 24 * 60 * 60 * 1000) { // within a day
                      setTimeout(() => {
                        toast(`Upcoming: ${actionType} with ${l.name || l.company} in 5 minutes!`, {
                          icon: '⏰',
                          duration: 10000,
                        });
                      }, timeToNotify);
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
                  assignedBy: l.assignedTo?.name || 'Admin'
                };
              });
            setRealTasks(myLeads);
          }
        }
      } catch (err) {
        console.error('Failed to fetch leads for follow-ups', err);
      }
    };
    if (token && user?.id) {
      fetchLeads();
    }
  }, [token, user?.id]);

  const tasks = realTasks;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Call': return <PhoneCall size={16} />;
      case 'Email': return <Mail size={16} />;
      case 'Meeting': return <Calendar size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const overdueTasks = tasks.filter(t => t.status === 'Overdue');
  const listTasks = tasks.filter(t => t.status !== 'Overdue');

  const renderTaskList = (taskList: any[]) => {
    const filteredTasks = taskList.filter(t =>
      (typeFilter === 'All' || t.type === typeFilter) &&
      (t.task.toLowerCase().includes(searchTerm.toLowerCase()) || t.client.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in fade-in">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="relative w-72">
            <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 outline-none cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Call">Call</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {filteredTasks.map((task) => (
            <div key={task.id} onClick={() => setSelectedTask(task)} className={`p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-between cursor-pointer group ${task.status === 'Overdue' ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl mt-1 ${task.status === 'Overdue' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                  {getTypeIcon(task.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">{task.task}</h3>
                    {task.status === 'Overdue' && <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> Overdue</span>}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-zinc-300 mt-1">{task.client} • Assigned by: <span className="font-semibold text-gray-800 dark:text-zinc-200">{task.assignedBy}</span></p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 flex items-center gap-1"><Clock size={12} /> Due: {task.due}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                  Open Task <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredTasks.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
              No tasks found in this view.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 relative pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Follow-ups & Tasks</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Manage your daily schedule and pending actions assigned to you.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 flex items-center gap-2">
            <Clock size={16} /> Set Reminder
          </button>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'list' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Follow-up List
          {activeTab === 'list' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'calendar' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Calendar Schedule
          {activeTab === 'calendar' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Overdue Tasks
          {activeTab === 'overdue' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 dark:bg-red-400"></div>}
        </button>
      </div>

      {activeTab === 'list' && renderTaskList(listTasks)}
      {activeTab === 'overdue' && renderTaskList(overdueTasks)}

      {activeTab === 'calendar' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 flex flex-col h-[600px] animate-in fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">Schedule ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800">Previous</button>
              <button className="px-3 py-1.5 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800">Next</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-zinc-700 rounded-xl overflow-hidden flex-1 border border-gray-200 dark:border-zinc-700">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-gray-50 dark:bg-zinc-800 p-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{day}</div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => {
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
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
                    <User size={10} /> Assigned by: {selectedTask.assignedBy}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-2">{selectedTask.task}</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">For {selectedTask.client} • Due {selectedTask.due}</p>
              </div>
              <button onClick={() => {
                setSelectedTask(null);
                setIsRescheduling(false);
                setCompletionNotes('');
              }} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Original Note</h3>
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 text-sm text-gray-700 dark:text-zinc-300">
                  {selectedTask.note}
                </div>
              </div>

              {isRescheduling ? (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Reschedule Task</h3>
                  <input type="datetime-local" value={newScheduleDate} onChange={e => setNewScheduleDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm" />
                  <select value={newScheduleAction} onChange={e => setNewScheduleAction(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm">
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                  </select>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Completion Notes (Optional)</h3>
                  <textarea
                    placeholder="Add notes about the outcome..."
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white resize-none"
                    rows={3}
                  ></textarea>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-between gap-3">
              {isRescheduling ? (
                <>
                  <button onClick={() => setIsRescheduling(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button onClick={async () => {
                    if (!newScheduleDate) return toast.error('Select a date');
                    try {
                      const leadId = selectedTask.id.replace('real-', '');
                      const scheduleString = `[SCHEDULED|${newScheduleDate}|${newScheduleAction}]`;
                      const newNotes = `${scheduleString} ${selectedTask.note}`;
                      const API_BASE = getApiBaseUrl();
                      const res = await fetch(`${API_BASE}/api/v1/crm/leads/${leadId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ notes: newNotes })
                      });
                      if (res.ok) {
                        toast.success('Task rescheduled!');
                        setRealTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, due: new Date(newScheduleDate).toLocaleString(), type: newScheduleAction } : t));
                        setSelectedTask(null);
                        setIsRescheduling(false);
                      }
                    } catch (e) { toast.error('Error rescheduling'); }
                  }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                    Save Schedule
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsRescheduling(true)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2">
                    <Calendar size={16} /> Reschedule
                  </button>
                  <button onClick={async () => {
                    try {
                      const leadId = selectedTask.id.replace('real-', '');
                      const newNotes = completionNotes ? `[COMPLETED] ${completionNotes} - ${selectedTask.note}` : `[COMPLETED] ${selectedTask.note}`;
                      const API_BASE = getApiBaseUrl();
                      const res = await fetch(`${API_BASE}/api/v1/crm/leads/${leadId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ notes: newNotes })
                      });
                      if (res.ok) {
                        toast.success('Task marked complete!');
                        setRealTasks(prev => prev.filter(t => t.id !== selectedTask.id));
                        setSelectedTask(null);
                        setCompletionNotes('');
                      }
                    } catch (e) { toast.error('Error marking complete'); }
                  }} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                    <CheckCircle2 size={16} /> Mark Complete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95">
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addReminder({
                id: Date.now().toString(),
                task: formData.get('task') as string,
                client: formData.get('client') as string,
                datetime: formData.get('datetime') as string,
                type: formData.get('type') as string
              });
              setShowCreateModal(false);
            }}>
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-900/50">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Clock size={20} className="text-blue-500" /> Set Custom Reminder</h2>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Task / Goal</label>
                  <input type="text" name="task" required placeholder="e.g. Call John to confirm details" className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Client / Lead (Optional)</label>
                  <input type="text" name="client" placeholder="Search customers..." className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Date & Time</label>
                    <input type="datetime-local" name="datetime" required className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Reminder Type</label>
                    <select name="type" className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white text-sm">
                      <option>Call</option>
                      <option>Email</option>
                      <option>Meeting</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FollowUps;
