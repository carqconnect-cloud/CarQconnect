import React, { useState } from 'react';
import { PhoneCall, Users, Clock, ArrowUpRight, Play, Search, Settings, ArrowLeft, FileText, Bot, User, Headphones, Mail, Phone, Edit2, Activity } from 'lucide-react';

const AdminHumanCalling = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'live'>('logs');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'AI Agent' | 'Manual'>('All');

  const logsData = [
    { name: 'Alice Brown', phone: '+1 (555) 019-2814', assigned: 'AI Agent', exec: 'Mike Smith', dur: '04:12', startTime: '10:00 AM', endTime: '10:04 AM', reason: 'Billing Support', summary: 'Customer disputed a recent charge. AI routed it to Mike for manual review. Mike waived the fee.' },
    { name: 'John Doe', phone: '+1 (555) 928-1123', assigned: 'Manual', exec: 'Sarah Jenkins', dur: '12:05', startTime: '09:15 AM', endTime: '09:27 AM', reason: 'Technical Setup', summary: 'Customer needed help installing the tracking module. Walked through the steps manually.' },
    { name: 'Jane Smith', phone: '+1 (555) 732-9988', assigned: 'AI Agent', exec: 'Emily Chen', dur: '02:30', startTime: '08:30 AM', endTime: '08:32 AM', reason: 'Sales Inquiry', summary: 'AI qualified the lead and routed to Emily. Emily sent over the contract.' },
  ];

  const liveData = [
    { name: 'Alice Brown', phone: '+1 (555) 928-1123', assigned: 'AI Agent', exec: 'David Lee', dur: '01:15', status: 'On Call', isLive: true, startTime: '10:00 AM', reason: 'Billing Inquiry' },
    { name: 'Marcus Johnson', phone: '+1 (555) 334-9921', assigned: 'Manual', exec: 'Amanda Cole', dur: '05:42', status: 'On Call', isLive: true, startTime: '09:55 AM', reason: 'Technical Setup' },
  ];

  const handleFilterToggle = () => {
    if (filterType === 'All') setFilterType('AI Agent');
    else if (filterType === 'AI Agent') setFilterType('Manual');
    else setFilterType('All');
  };

  const filteredLogs = logsData.filter(log => {
    const matchesSearch = log.name.toLowerCase().includes(searchQuery.toLowerCase()) || log.phone.includes(searchQuery) || log.exec.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'All' || log.assigned === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredLive = liveData.filter(live => {
    const matchesSearch = live.name.toLowerCase().includes(searchQuery.toLowerCase()) || live.phone.includes(searchQuery) || live.exec.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'All' || live.assigned === filterType;
    return matchesSearch && matchesFilter;
  });

  if (selectedLog) {
    return (
      <div className="space-y-6 pb-20">
        <button onClick={() => setSelectedLog(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to Call Logs
        </button>

        <div className="bg-[#18181b] rounded-2xl p-6 lg:p-8 max-w-7xl shadow-sm border border-zinc-800/50">
          {/* Header section */}
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">{selectedLog.name}</h2>
                <span className="px-2 py-0.5 text-xs font-bold bg-blue-900/30 text-blue-400 rounded-md">NEW</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5"><Mail size={14} /> {selectedLog.name.toLowerCase().split(' ')[0]}@example.com</span>
                <span className="flex items-center gap-1.5"><Phone size={14} /> {selectedLog.phone}</span>
                <span className="px-2 py-1 rounded bg-[#121214] border border-zinc-800 text-zinc-300 text-xs">Reason: {selectedLog.reason || 'Support'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm mt-3 text-zinc-400">
                <span>Assigned By: <span className="text-white">{selectedLog.assigned}</span></span>
                <span className="text-zinc-600">•</span>
                <span>Call Duration: <span className="text-white">{selectedLog.dur}</span></span>
                <span className="text-zinc-600">•</span>
                <span>Start: <span className="text-white">{selectedLog.startTime}</span></span>
                <span className="text-zinc-600">•</span>
                <span>End: <span className="text-white">{selectedLog.endTime || 'Ongoing'}</span></span>
              </div>
            </div>
          </div>

          {/* 2-Column Body */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 pt-4 border-t border-zinc-800/50">

            {/* Timeline (Left Column) */}
            <div className="flex-1">
              <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:left-2 before:w-px before:bg-zinc-800 before:-z-10">
                {/* Node 1: AI */}
                <div className="relative">
                  <h3 className="text-[15px] font-bold text-white mb-6 flex items-center gap-2">
                    <Activity size={16} className="text-blue-500" /> AI Calling
                  </h3>
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-[#18181b]"></span>
                  <p className="text-xs text-zinc-500 mb-2">Today, {selectedLog.startTime} - AI Conversation</p>
                  <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-300"><strong className="text-purple-400">AI:</strong> Hello! I see you have an inquiry about {selectedLog.reason}. How can I assist you today?</p>
                      <p className="text-sm text-zinc-300"><strong>Customer:</strong> Yes, I'm having some trouble and need to speak with someone.</p>
                      <p className="text-sm text-zinc-300"><strong className="text-purple-400">AI:</strong> I can definitely help with that. Let me route you to one of our available executives.</p>
                    </div>
                  </div>
                </div>

                {/* Node 2: Human */}
                <div className="relative">
                  <h3 className="text-[15px] font-bold text-white mb-6 flex items-center gap-2">
                    <Activity size={16} className="text-blue-500" /> Human Calling
                  </h3>
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-[#18181b]"></span>
                  <p className="text-xs text-emerald-500/70 mb-2">Today, {selectedLog.startTime} - Human Transfer {selectedLog.isLive && "(Live)"}</p>
                  <div className="bg-[#121214] border border-emerald-900/30 rounded-xl p-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    <div className="space-y-4">
                      <p className="text-sm text-zinc-300"><strong className="text-emerald-400">{selectedLog.exec}:</strong> Hi, I see you were transferred regarding {selectedLog.reason}. How can I help you?</p>
                      <p className="text-sm text-zinc-300"><strong>Customer:</strong> Hi {selectedLog.exec}, yes I just wanted to verify my account details.</p>
                      <p className="text-sm text-zinc-300"><strong className="text-emerald-400">{selectedLog.exec}:</strong> Certainly! Let me pull up your account now.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary (Right Column) */}
            <div className="w-full lg:w-[340px] shrink-0">
              <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-sm sticky top-6">
                <h3 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-wider">Summary / Outcome</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {selectedLog.isLive ? <span className="italic text-zinc-500">Generating short summary...</span> : (selectedLog.summary)}
                </p>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Human Calling Overview</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Monitor human executive call performance across all teams.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800 mb-6">
        <button
          onClick={() => { setActiveTab('logs'); setSearchQuery(''); setFilterType('All'); }}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'logs' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Call Logs & Playback
          {activeTab === 'logs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button
          onClick={() => { setActiveTab('live'); setSearchQuery(''); setFilterType('All'); }}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'live' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Live Line Monitoring
          {activeTab === 'live' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
      </div>

      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                placeholder="Search call logs..."
              />
            </div>
            <button onClick={handleFilterToggle} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors border border-zinc-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              Filter: {filterType}
            </button>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Contact no.</th>
                  <th className="px-6 py-4">Assigned By</th>
                  <th className="px-6 py-4">Executive</th>
                  <th className="px-6 py-4">Call Duration</th>
                  <th className="px-6 py-4">Call startTime</th>
                  <th className="px-6 py-4">Call endtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredLogs.length > 0 ? filteredLogs.map((log, i) => (
                  <tr key={i} onClick={() => setSelectedLog(log)} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white text-sm">{log.name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">
                      {log.phone}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs uppercase font-bold rounded-full border ${log.assigned === 'AI Agent' ? 'bg-purple-900/30 text-purple-400 border-purple-800/50' : 'bg-blue-900/30 text-blue-400 border-blue-800/50'}`}>
                        {log.assigned}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">{log.exec}</td>
                    <td className="px-6 py-4 text-sm text-zinc-300">{log.dur}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{log.startTime}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{log.endTime}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-zinc-500 text-sm">
                      No call logs found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'live' && (
        <div className="space-y-6">

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800 mt-6">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-700"
                  placeholder="Search live calls..."
                />
              </div>
              <button onClick={handleFilterToggle} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors border border-zinc-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                Filter: {filterType}
              </button>
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Contact no.</th>
                    <th className="px-6 py-4">Assigned By</th>
                    <th className="px-6 py-4">Executive</th>
                    <th className="px-6 py-4">Current Duration</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredLive.length > 0 ? filteredLive.map((live, i) => (
                    <tr key={i} onClick={() => setSelectedLog(live)} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-white text-sm">{live.name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        {live.phone}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs uppercase font-bold rounded-full border ${live.assigned === 'AI Agent' ? 'bg-purple-900/30 text-purple-400 border-purple-800/50' : 'bg-blue-900/30 text-blue-400 border-blue-800/50'}`}>
                          {live.assigned}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">{live.exec}</td>
                      <td className="px-6 py-4 text-sm text-emerald-400 font-mono">{live.dur}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2.5 py-1 text-xs uppercase font-bold rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 animate-pulse">
                          {live.status}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500 text-sm">
                        No live calls found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHumanCalling;
