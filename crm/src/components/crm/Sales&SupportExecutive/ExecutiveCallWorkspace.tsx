"use client";

import React, { useState } from 'react';
import { Phone, Mic, MicOff, Volume2, Pause, User, Briefcase, FileText, CheckCircle2, Save } from 'lucide-react';

const CallWorkspace = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'active' | 'wrap-up'>('active');

  if (callStatus === 'wrap-up') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Call Wrap-up</h1>
        
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">JD</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">John Doe</h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400">Duration: 04:12 • Acme Corp</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Call Disposition</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Interested', 'Not Interested', 'Follow-up Required', 'Wrong Number'].map(disp => (
                  <button key={disp} className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:border-blue-800 transition-colors">
                    {disp}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Call Notes</label>
              <textarea 
                className="w-full p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white resize-none" 
                rows={4}
                placeholder="Summarize the key points of the call..."
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">Schedule Next Action</label>
              <div className="flex gap-4">
                <input type="datetime-local" className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-sm text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                <input type="text" placeholder="Task description..." className="flex-1 px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white" />
              </div>
            </div>
            
            <div className="pt-6 flex justify-end">
               <button onClick={() => setCallStatus('idle')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
                 <Save size={18} /> Save & Close
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (callStatus === 'idle') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Call Workspace</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Make calls and view your personal call history.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 flex flex-col items-center">
             <div className="w-full max-w-[280px]">
                <div className="mb-6 text-center">
                   <div className="text-3xl font-light tracking-wider text-gray-400 dark:text-zinc-500 mb-2 h-10 flex items-center justify-center">
                      (555) 123-____
                   </div>
                   <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> SIP Online
                   </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                   {[1,2,3,4,5,6,7,8,9,'*',0,'#'].map(num => (
                      <button key={num} className="w-16 h-16 mx-auto rounded-full bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-2xl font-light hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center">
                         {num}
                      </button>
                   ))}
                </div>
                
                <button onClick={() => setCallStatus('active')} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-full shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
                   <Phone size={24} /> Dial Number
                </button>
             </div>
          </div>
          
          <div className="lg:col-span-2 space-y-4">
            {/* Search and Filter Bar */}
            <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800">
              <div className="relative flex-1 max-w-md">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                 </div>
                 <input type="text" className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="Search assigned leads & history..." />
              </div>
              <button className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors border border-zinc-700">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                 Filter
              </button>
            </div>

            <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 overflow-hidden overflow-x-auto">
               <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                  <h2 className="font-bold text-white">Call History & Assigned Leads</h2>
               </div>
               
               <table className="w-full text-left border-collapse min-w-[600px]">
                 <thead>
                   <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                     <th className="px-4 py-4">Name</th>
                     <th className="px-4 py-4">Company</th>
                     <th className="px-4 py-4">Type</th>
                     <th className="px-4 py-4">Outcome</th>
                     <th className="px-4 py-4 text-right">Time</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800">
                    {[
                      { name: 'Sarah Jenkins', company: 'TechFlow Inc', time: '10:30 AM', duration: '05:42', type: 'Outbound', outcome: 'Interested' },
                      { name: 'Mike Smith', company: 'Global Logistics', time: '09:15 AM', duration: '02:10', type: 'Inbound', outcome: 'Follow-up' },
                      { name: 'John Doe', company: 'Acme Corp', time: 'Yesterday', duration: '01:05', type: 'Outbound', outcome: 'No Answer' },
                    ].map((call, i) => (
                      <tr key={i} className="hover:bg-zinc-800/50 transition-colors group">
                         <td className="px-4 py-3">
                           <div className="font-bold text-white flex items-center gap-2">
                             <div className={`p-1.5 rounded-full ${call.type === 'Outbound' ? 'bg-blue-900/30 text-blue-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                               <Phone size={14} className={call.type === 'Outbound' ? '' : 'rotate-180'} />
                             </div>
                             {call.name}
                           </div>
                         </td>
                         <td className="px-4 py-3 text-sm text-zinc-300">
                           {call.company}
                         </td>
                         <td className="px-4 py-3 text-sm text-zinc-400">
                           {call.type}
                         </td>
                         <td className="px-4 py-3">
                           <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              call.outcome === 'Interested' ? 'bg-emerald-900/30 text-emerald-400' :
                              call.outcome === 'No Answer' ? 'bg-zinc-800 text-zinc-300' :
                              'bg-amber-900/30 text-amber-400'
                           }`}>
                              {call.outcome}
                           </span>
                         </td>
                         <td className="px-4 py-3 text-right text-sm text-zinc-400">
                           {call.time} <span className="text-zinc-500">({call.duration})</span>
                         </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Active Call Workspace</h1>
          <p className="text-sm text-emerald-500 font-medium mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Connected • 04:12
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Context */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">JD</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">John Doe</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Acme Corp</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Briefcase size={16} className="text-gray-400" />
                <span className="text-gray-600 dark:text-zinc-300">Enterprise Plan</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <User size={16} className="text-gray-400" />
                <span className="text-gray-600 dark:text-zinc-300">Lead Source: Website</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FileText size={16} className="text-gray-400" />
                <span className="text-gray-600 dark:text-zinc-300">LTV: $45,000</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-4 border-l-2 border-gray-100 dark:border-zinc-800 ml-2 pl-4">
              <div className="relative">
                <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-zinc-600 ring-4 ring-white dark:ring-zinc-900"></div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Oct 14, 2026</p>
                <p className="text-sm text-gray-700 dark:text-zinc-300">Opened support ticket TKT-1042 regarding GPS sync.</p>
              </div>
              <div className="relative">
                <div className="absolute -left-[21px] w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-zinc-600 ring-4 ring-white dark:ring-zinc-900"></div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">Oct 10, 2026</p>
                <p className="text-sm text-gray-700 dark:text-zinc-300">Purchased 10x OBD devices.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dialer & Notes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 flex flex-col items-center justify-center min-h-[200px] bg-gradient-to-b from-gray-50 to-white dark:from-zinc-800/50 dark:to-zinc-900">
            {/* Visualizer Mock */}
            <div className="flex items-center gap-1 h-12 mb-8 w-full justify-center opacity-50">
              {[...Array(32)].map((_, i) => (
                <div key={i} className="w-1.5 bg-blue-500 rounded-full" style={{ height: `${Math.max(20, Math.random() * 100)}%` }}></div>
              ))}
            </div>
            
            <div className="flex items-center gap-6">
              <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'}`}>
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button onClick={() => setCallStatus('wrap-up')} className="p-5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                <Phone size={32} className="rotate-[135deg]" />
              </button>
              <button className="p-4 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
                <Pause size={24} />
              </button>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 h-[340px] flex flex-col">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Live Notes</h3>
            <textarea 
              className="flex-1 w-full p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white resize-none"
              placeholder="Take notes during the call..."
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallWorkspace;
