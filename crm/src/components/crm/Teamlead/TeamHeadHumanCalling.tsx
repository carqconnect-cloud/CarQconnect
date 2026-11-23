import React, { useState } from 'react';
import { Headphones, Clock, Phone, Play, CalendarClock, Users, Filter, Search, ArrowLeft, Bot, Mail, Activity, User } from 'lucide-react';

const TeamHeadHumanCalling = () => {
  const [activeTab, setActiveTab] = useState('Human Calling Logs');
  const [selectedCall, setSelectedCall] = useState<any>(null);

  const teamPerformance = [
    { id: 1, agent: 'Sarah Jenkins', totalTalkTime: '4h 12m', callsMade: 45, avgDuration: '5m 36s', lastCallStatus: 'Interested' },
    { id: 2, agent: 'Mike Smith', totalTalkTime: '3h 45m', callsMade: 32, avgDuration: '7m 01s', lastCallStatus: 'Not Interested' },
    { id: 3, agent: 'Emily Chen', totalTalkTime: '5h 05m', callsMade: 58, avgDuration: '5m 15s', lastCallStatus: 'Demo Scheduled' },
  ];

  const recentCalls = [
    { id: 101, name: 'Acme Corp', assignedExecutive: 'Sarah Jenkins', assign: 'Agent', status: 'Completed', startTime: '10:00 AM', endTime: '10:12 AM', outcome: 'Lead interested in demo, scheduled for tomorrow.' },
    { id: 102, name: 'TechFlow', assignedExecutive: 'Mike Smith', assign: 'Manual', status: 'Completed', startTime: '11:30 AM', endTime: '11:33 AM', outcome: 'Left voicemail, will follow up next week.' },
    { id: 103, name: 'Global Co', assignedExecutive: 'Emily Chen', assign: 'Agent', status: 'In Progress', startTime: '12:05 PM', endTime: '-', outcome: 'Currently discussing pricing options.' },
  ];

  const callbacks = [
    { id: 201, lead: 'Startup Hub', agent: 'Mike Smith', scheduledFor: 'Today, 2:30 PM', priority: 'High' },
    { id: 202, lead: 'CloudSync', agent: 'Sarah Jenkins', scheduledFor: 'Tomorrow, 10:00 AM', priority: 'Medium' },
    { id: 203, lead: 'Nexus Tech', agent: 'Unassigned', scheduledFor: 'Today, 4:00 PM', priority: 'Critical' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {selectedCall ? (
        <div className="animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-6 cursor-pointer text-zinc-400 hover:text-white transition-colors w-max" onClick={() => setSelectedCall(null)}>
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back to Calling Logs</span>
          </div>
          
          <div className="bg-[#18181b] rounded-2xl p-6 lg:p-8 max-w-7xl shadow-sm border border-zinc-800/50">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white">{selectedCall.name}</h2>
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-900/30 text-blue-400 rounded-md">NEW</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                  <span className="flex items-center gap-1.5"><Mail size={14} /> {selectedCall.name.toLowerCase().replace(' ', '')}@example.com</span>
                  <span className="flex items-center gap-1.5"><Phone size={14} /> +1 (555) 019-2814</span>
                  <span className="px-2 py-1 rounded bg-[#121214] border border-zinc-800 text-zinc-300 text-xs">Reason: Inquiry</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm mt-3 text-zinc-400">
                  <span>Assigned By: <span className="text-white flex inline-flex items-center gap-1"><Bot size={12} className="text-purple-400"/> {selectedCall.assign}</span></span>
                  <span className="text-zinc-600">•</span>
                  <span>Call Duration: <span className="text-white">12:00</span></span>
                  <span className="text-zinc-600">•</span>
                  <span>Start: <span className="text-white">{selectedCall.startTime}</span></span>
                  <span className="text-zinc-600">•</span>
                  <span>End: <span className="text-white">{selectedCall.endTime}</span></span>
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
                    <p className="text-xs text-zinc-500 mb-2">Today, {selectedCall.startTime} - AI Conversation</p>
                    <div className="bg-[#121214] border border-zinc-800/80 rounded-xl p-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                      <div className="space-y-4">
                        <p className="text-sm text-zinc-300"><strong className="text-purple-400">AI:</strong> Hello! I see you have an inquiry. How can I assist you today?</p>
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
                    <p className="text-xs text-emerald-500/70 mb-2">Today, {selectedCall.startTime} - Human Transfer {selectedCall.status === 'In Progress' && "(Live)"}</p>
                    <div className="bg-[#121214] border border-emerald-900/30 rounded-xl p-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                      <div className="space-y-4">
                        <p className="text-sm text-zinc-300"><strong className="text-emerald-400">{selectedCall.assignedExecutive}:</strong> Hi, I see you were transferred. How can I help you?</p>
                        <p className="text-sm text-zinc-300"><strong>Customer:</strong> Hi {selectedCall.assignedExecutive}, yes I just wanted to verify my account details.</p>
                        <p className="text-sm text-zinc-300"><strong className="text-emerald-400">{selectedCall.assignedExecutive}:</strong> Certainly! Let me pull up your account now.</p>
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
                    {selectedCall.status === 'In Progress' ? <span className="italic text-zinc-500">Generating short summary...</span> : (selectedCall.outcome)}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
             <Headphones className="text-blue-500" /> Human Calling & Audits
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Track agent talk-time, manage callback queues, and audit call quality.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm border-b-4 border-b-blue-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-3 mb-4 text-blue-600 dark:text-blue-400">
            <Clock size={20} className="shrink-0 mt-0.5" />
            <h3 className="font-semibold leading-tight">Total Team Talk-Time</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">13h 02m</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm border-b-4 border-b-emerald-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
            <Phone size={20} className="shrink-0 mt-0.5" />
            <h3 className="font-semibold leading-tight">Total Calls Made</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">135</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm border-b-4 border-b-amber-500 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex items-start gap-3 mb-4 text-amber-600 dark:text-amber-400">
            <CalendarClock size={20} className="shrink-0 mt-0.5" />
            <h3 className="font-semibold leading-tight">Pending Callbacks</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">12</p>
        </div>
      </div>

      <div className="flex border-b border-zinc-800 mt-6 mb-6">
        {['Human Calling Logs', 'Callback Manager'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Human Calling Logs' && (
        <div className="space-y-6">
           <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
             <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
               <h2 className="text-lg font-bold text-gray-900 dark:text-white">Human Calling Logs</h2>
               <button className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-300 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-2 rounded-lg transition-colors">
                 <Filter size={16} /> Filter by Agent
               </button>
             </div>
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                   <th className="p-4 font-medium">Name</th>
                   <th className="p-4 font-medium">Assigned Executive</th>
                   <th className="p-4 font-medium">Assign</th>
                   <th className="p-4 font-medium">Status</th>
                   <th className="p-4 font-medium">Start Time</th>
                   <th className="p-4 font-medium">End Time</th>
                   <th className="p-4 font-medium">Outcome</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                 {recentCalls.map((call) => (
                   <tr key={call.id} onClick={() => setSelectedCall(call)} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                     <td className="p-4 font-bold text-gray-900 dark:text-white">{call.name}</td>
                     <td className="p-4 text-sm text-gray-700 dark:text-zinc-300">{call.assignedExecutive}</td>
                     <td className="p-4 text-sm text-gray-700 dark:text-zinc-300 capitalize">{call.assign}</td>
                     <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${call.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                           {call.status}
                        </span>
                     </td>
                     <td className="p-4 text-sm font-mono text-gray-500 dark:text-zinc-400">{call.startTime}</td>
                     <td className="p-4 text-sm font-mono text-gray-500 dark:text-zinc-400">{call.endTime}</td>
                     <td className="p-4 text-sm text-gray-700 dark:text-zinc-300 truncate max-w-[200px]">{call.outcome}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'Callback Manager' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
           <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
             <div className="relative w-full sm:w-72">
               <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
               <input type="text" placeholder="Search callbacks..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
             </div>
           </div>
           
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                 <th className="p-4 font-medium">Lead</th>
                 <th className="p-4 font-medium">Scheduled For</th>
                 <th className="p-4 font-medium">Priority</th>
                 <th className="p-4 font-medium">Assigned Agent</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
               {callbacks.map((cb) => (
                 <tr key={cb.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                   <td className="p-4 font-bold text-gray-900 dark:text-white">{cb.lead}</td>
                   <td className="p-4 text-sm font-medium text-gray-700 dark:text-zinc-300 flex items-center gap-2"><Clock size={14} className="text-gray-400" /> {cb.scheduledFor}</td>
                   <td className="p-4">
                     <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                        cb.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                        cb.priority === 'High' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                     }`}>
                       {cb.priority}
                     </span>
                   </td>
                   <td className="p-4">
                     <select className="bg-transparent border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer" defaultValue={cb.agent === 'Unassigned' ? '' : cb.agent}>
                       <option value="" disabled>Select Executive...</option>
                       <option value="Sarah Jenkins">Sarah Jenkins</option>
                       <option value="Mike Smith">Mike Smith</option>
                       <option value="Emily Chen">Emily Chen</option>
                     </select>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default TeamHeadHumanCalling;
