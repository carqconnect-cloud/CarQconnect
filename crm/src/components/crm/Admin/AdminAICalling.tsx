import React, { useState } from 'react';
import { Headphones, Settings2, Activity, Play, PlusCircle, Bot, PhoneForwarded, Clock, FileText, CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-react';

const AdminAICalling = () => {
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('AI Calling Logs');

  const aiCalls = [
    { id: 1, lead: 'Alice Johnson', reason: 'Q4 Renewal', duration: '2m 14s', assignTo: 'AI agent', outcome: 'Success', action: 'resolved', summary: 'Lead confirmed renewal, payment link sent.' },
    { id: 2, lead: 'Michael Chang', reason: 'Cold Revival', duration: '4m 05s', assignTo: 'Human', outcome: 'Needs Help', action: 'Escalated to Mike Smith', summary: 'Lead asked complex pricing questions. Transferred to Mike Smith.' },
    { id: 3, lead: 'Sarah Jenkins', reason: 'Q4 Renewal', duration: '1m 45s', assignTo: 'AI agent', outcome: 'Success', action: 'complete', summary: 'Lead not interested at the moment, marked as follow-up next quarter.' },
  ];

  const liveCalls = [
    { id: 101, lead: 'Acme Corp', reason: 'Q4 Renewals (West)', duration: '0m 45s', assignTo: 'AI agent', outcome: 'In Progress', action: 'calling...', summary: 'Call currently in progress.' },
    { id: 102, lead: 'Global Tech', reason: 'Cold Outreach (East)', duration: '1m 12s', assignTo: 'AI agent', outcome: 'In Progress', action: 'calling...', summary: 'Call currently in progress.' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {selectedCall ? (
        <div className="animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-6 cursor-pointer text-zinc-400 hover:text-white transition-colors w-max" onClick={() => setSelectedCall(null)}>
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back to AI Handoffs</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedCall.lead}</h2>
                <p className="text-sm text-zinc-400 flex items-center gap-1"><Clock size={14}/> AI Call Completed: Today, 10:30 AM</p>
              </div>
              <span className="px-3 py-1 bg-purple-900/30 text-purple-400 text-xs font-bold rounded-full border border-purple-800/50 flex items-center gap-1.5 uppercase tracking-wider">
                <Bot size={14} /> AI ANALYZED
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-purple-500" /> Full Call Transcript</h3>
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-800/50 text-purple-400 text-xs font-bold">AI</div>
                    <div className="bg-zinc-800/50 text-zinc-300 text-sm p-4 rounded-2xl rounded-tl-sm border border-zinc-700/50">
                      Hello! This is Fioner AI calling on behalf of {selectedCall.lead}. I noticed you were looking into our routing solutions. How can I help?
                    </div>
                  </div>
                  <div className="flex items-start gap-4 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0 border border-blue-800/50 text-blue-400 text-xs font-bold">Client</div>
                    <div className="bg-blue-900/20 text-blue-100 text-sm p-4 rounded-2xl rounded-tr-sm border border-blue-800/30">
                      Yes, I'm trying to figure out if your enterprise tier supports multi-depot routing.
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-800/50 text-purple-400 text-xs font-bold">AI</div>
                    <div className="bg-zinc-800/50 text-zinc-300 text-sm p-4 rounded-2xl rounded-tl-sm border border-zinc-700/50">
                      Absolutely, our enterprise plan fully supports multi-depot configurations. I can have a specialist send you the exact specifications and pricing. Would that be helpful?
                    </div>
                  </div>
                  <div className="flex items-start gap-4 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0 border border-blue-800/50 text-blue-400 text-xs font-bold">Client</div>
                    <div className="bg-blue-900/20 text-blue-100 text-sm p-4 rounded-2xl rounded-tr-sm border border-blue-800/30">
                      That would be great, thanks.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><CheckCircle size={16} className="text-blue-500" /> AI Assigned Task</h3>
                  <div className="bg-blue-900/20 border border-blue-800/30 p-4 rounded-lg mb-6 text-sm text-blue-100 font-medium">
                    "Send standard enterprise proposal and schedule demo."
                  </div>
                  <div className="space-y-3">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <CheckCircle size={16} /> Mark Task Complete
                    </button>
                    <button className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <PhoneForwarded size={16} /> Call Client Now
                    </button>
                  </div>
                </div>

                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-white mb-4">AI Call Summary</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Sentiment:</span>
                      <span className="text-emerald-400 font-medium">Positive</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400">Outcome:</span>
                      <span className="text-white font-bold text-right max-w-[150px] leading-tight">{selectedCall.outcome === 'Success' ? 'Interested in Enterprise Plan' : selectedCall.summary}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Voice Agents Command Center</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Configure prompts, monitor live concurrency, and deploy new agents.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-2">
          <PlusCircle size={16} /> Deploy New Agent
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
          <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1 line-clamp-1">Containment Rate</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400">84.2%</p>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 mt-1 sm:mt-2 truncate">No human needed</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
          <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1 line-clamp-1">Human Handoff</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400">15.8%</p>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 mt-1 sm:mt-2 truncate">Escalated to reps</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
          <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1 line-clamp-1">Avg Latency</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">650<span className="text-sm sm:text-base font-medium text-gray-500 dark:text-zinc-500">ms</span></p>
          <p className="text-[11px] sm:text-xs text-emerald-500 mt-1 sm:mt-2 truncate">↓ 50ms (Voice V2)</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-between">
           <p className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1 line-clamp-1">Cost Per Min</p>
           <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">$0.08</p>
           <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 mt-1 sm:mt-2 truncate">Telephony + AI</p>
        </div>
      </div>

      <div className="flex border-b border-zinc-800 mb-6">
        {['AI Calling Logs', 'Live Calling Logs'].map(tab => (
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

      <div className="space-y-8">
        {activeTab === 'AI Calling Logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800">
             <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input type="text" className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="Search AI calling logs..." />
             </div>
             <button className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors border border-zinc-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                Filter
             </button>
          </div>
          
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="font-bold text-white flex items-center gap-2"><Activity size={18} className="text-blue-500"/> AI Calling Logs</h3>
            </div>
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                  <th className="px-6 py-4">Lead</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Assign</th>
                  <th className="px-6 py-4">Outcome</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {aiCalls.map((call) => (
                  <tr key={call.id} onClick={() => setSelectedCall(call)} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white flex items-center gap-2">
                         <Bot size={16} className="text-purple-500" />
                         {call.lead}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">
                      {call.duration}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/50">
                        {call.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">
                      {call.assignTo}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-sm font-medium ${call.outcome === 'Success' ? 'text-emerald-400' : call.outcome === 'In Progress' ? 'text-blue-400' : 'text-amber-400'}`}>
                        {call.outcome === 'Success' ? <CheckCircle size={14} /> : call.outcome === 'In Progress' ? <Activity size={14} /> : <AlertTriangle size={14} />}
                        {call.outcome}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300 capitalize">
                      {call.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {activeTab === 'Live Calling Logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800">
             <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input type="text" className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="Search live calls..." />
             </div>
             <button className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors border border-zinc-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                Filter
             </button>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2"><Play size={18} className="text-emerald-500"/> Live Calling Logs</h3>
            </div>
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                  <th className="px-6 py-4">Lead</th>
                  <th className="px-6 py-4">Duration</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Assign</th>
                  <th className="px-6 py-4">Outcome</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {liveCalls.map((call) => (
                  <tr key={call.id} onClick={() => setSelectedCall(call)} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white flex items-center gap-2">
                         <Bot size={16} className="text-purple-500" />
                         {call.lead}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">
                      {call.duration}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/50">
                        {call.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">
                      {call.assignTo}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-sm font-medium text-blue-400 animate-pulse`}>
                        <Activity size={14} />
                        {call.outcome}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300 capitalize">
                      {call.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default AdminAICalling;
