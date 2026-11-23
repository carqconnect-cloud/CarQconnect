import React, { useState } from 'react';
import { PhoneForwarded, Clock, Users, Play, UserPlus, AlertCircle, Phone, CheckCircle, ArrowLeft, Bot, FileText, Activity, AlertTriangle } from 'lucide-react';

const TeamHeadAIEscalationQueue = () => {
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [selectedExecutive, setSelectedExecutive] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('AI Escalation');
  const [escalations, setEscalations] = useState([
    { id: 1, lead: 'Alice Johnson', reason: 'Requested to speak with a human regarding custom pricing.', holdTime: '00:45', priority: 'High', status: 'Waiting', summary: 'Lead wants custom pricing.', outcome: 'In Progress' },
    { id: 2, lead: 'Michael Chang', reason: 'AI could not understand thick accent.', holdTime: '01:12', priority: 'Medium', status: 'Waiting', summary: 'Transfer required.', outcome: 'In Progress' },
    { id: 3, lead: 'Sarah Jenkins', reason: 'Angry customer, triggered sentiment guardrail.', holdTime: '00:15', priority: 'Critical', status: 'Waiting', summary: 'Customer upset.', outcome: 'In Progress' },
  ]);

  const executives = [
    { name: 'Sarah Jenkins', status: 'Available', currentCalls: 0, completedCalls: 12, inQueue: 0 },
    { name: 'Mike Smith', status: 'On Call', currentCalls: 1, completedCalls: 18, inQueue: 2 },
    { name: 'Emily Chen', status: 'Available', currentCalls: 0, completedCalls: 15, inQueue: 1 },
  ];

  const handleAssign = (id: number) => {
    setEscalations(escalations.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-6 pb-20">
      {selectedExecutive ? (
        <div className="animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-6 cursor-pointer text-zinc-400 hover:text-white transition-colors w-max" onClick={() => setSelectedExecutive(null)}>
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back to Live Team Status</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
             <div className="flex justify-between items-start mb-8">
               <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedExecutive.name}</h2>
                  <p className="text-sm text-zinc-400 flex items-center gap-1"><Users size={14}/> Executive Profile</p>
               </div>
               <span className={`px-3 py-1 ${selectedExecutive.status === 'Available' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 'bg-amber-900/30 text-amber-400 border-amber-800/50'} text-xs font-bold rounded-full border flex items-center gap-1.5 uppercase tracking-wider`}>
                 <Activity size={14} /> {selectedExecutive.status}
               </span>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
                   <h3 className="text-sm font-bold text-zinc-400 mb-2">Completed Calls Today</h3>
                   <p className="text-3xl font-bold text-emerald-400">{selectedExecutive.completedCalls}</p>
                </div>
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
                   <h3 className="text-sm font-bold text-zinc-400 mb-2">Active Calls</h3>
                   <p className="text-3xl font-bold text-blue-400">{selectedExecutive.currentCalls}</p>
                </div>
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
                   <h3 className="text-sm font-bold text-zinc-400 mb-2">In Queue Calls</h3>
                   <p className="text-3xl font-bold text-amber-400">{selectedExecutive.inQueue}</p>
                </div>
             </div>
             
             <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
               <h3 className="text-lg font-bold text-white mb-4">Recent Escalations Handled</h3>
               <div className="space-y-4">
                 <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700/50">
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-bold text-white">Acme Corp</span>
                       <span className="text-xs text-zinc-400">10 mins ago</span>
                    </div>
                    <p className="text-sm text-zinc-300">Resolved custom pricing issue and sent updated quote.</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      ) : selectedCall ? (
        <div className="animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-6 cursor-pointer text-zinc-400 hover:text-white transition-colors w-max" onClick={() => setSelectedCall(null)}>
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Back to Escalation Queue</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{selectedCall.lead}</h2>
                <p className="text-sm text-zinc-400 flex items-center gap-1"><Clock size={14}/> Escalation Wait Time: {selectedCall.holdTime}</p>
              </div>
              <span className={`px-3 py-1 ${selectedCall.priority === 'Critical' ? 'bg-red-900/30 text-red-400 border-red-800/50' : selectedCall.priority === 'High' ? 'bg-amber-900/30 text-amber-400 border-amber-800/50' : 'bg-blue-900/30 text-blue-400 border-blue-800/50'} text-xs font-bold rounded-full border flex items-center gap-1.5 uppercase tracking-wider`}>
                <AlertTriangle size={14} /> {selectedCall.priority} PRIORITY
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><FileText size={18} className="text-purple-500" /> Live Call Transcript</h3>
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-start gap-4 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0 border border-blue-800/50 text-blue-400 text-xs font-bold">Client</div>
                    <div className="bg-blue-900/20 text-blue-100 text-sm p-4 rounded-2xl rounded-tr-sm border border-blue-800/30">
                      I need to speak to a real person right now. This is ridiculous.
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-800/50 text-purple-400 text-xs font-bold">AI</div>
                    <div className="bg-zinc-800/50 text-zinc-300 text-sm p-4 rounded-2xl rounded-tl-sm border border-zinc-700/50">
                      I understand. Please hold for just a moment while I connect you to one of our specialists who can help you immediately.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4"><AlertTriangle size={16} className="text-red-500" /> Escalation Reason</h3>
                  <div className="bg-red-900/20 border border-red-800/30 p-4 rounded-lg mb-6 text-sm text-red-100 font-medium">
                    "{selectedCall.reason}"
                  </div>
                  <div className="space-y-3">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                      <PhoneForwarded size={16} /> Accept & Join Call
                    </button>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PhoneForwarded className="text-red-500" /> Live AI Escalations
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Receive live AI handoffs and instantly route them to available executives.</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="relative flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
           </span>
           <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{escalations.length} Calls Holding</span>
        </div>
      </div>

      <div className="flex border-b border-zinc-800 mt-6 mb-6">
        {['AI Escalation', 'Live Team Status'].map(tab => (
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
        {/* Top Section: Live Team Status */}
        {activeTab === 'Live Team Status' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="font-bold text-white flex items-center gap-2"><Users size={18} className="text-blue-500"/> Live Team Status</h3>
            </div>
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                  <th className="px-6 py-4">Executive Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Completed Calls</th>
                  <th className="px-6 py-4">In Queue</th>
                  <th className="px-6 py-4">Active Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                 {executives.map((exec, i) => (
                    <tr key={i} onClick={() => setSelectedExecutive(exec)} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center gap-2">
                           <UserPlus size={16} className="text-blue-500" />
                           {exec.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-2 text-sm font-bold ${exec.status === 'Available' ? 'text-emerald-400' : 'text-amber-400'}`}>
                           <div className={`w-2 h-2 rounded-full ${exec.status === 'Available' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                           {exec.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-emerald-400">
                        {exec.completedCalls}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-amber-400">
                        {exec.inQueue}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-blue-400 font-bold">
                        {exec.currentCalls} Calls
                      </td>
                    </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Bottom Section: AI Escalations */}
        {activeTab === 'AI Escalation' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="font-bold text-white flex items-center gap-2"><AlertCircle size={18} className="text-red-500"/> Escalation Queue</h3>
            </div>
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Lead</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Hold Time</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {escalations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      <CheckCircle size={32} className="mx-auto mb-3 text-emerald-500" />
                      No live escalations waiting.
                    </td>
                  </tr>
                ) : (
                  escalations.map((escalation) => (
                    <tr key={escalation.id} onClick={() => setSelectedCall(escalation)} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                      <td className="px-6 py-4">
                         <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${escalation.priority === 'Critical' ? 'bg-red-900/30 text-red-400 border border-red-800/50' : escalation.priority === 'High' ? 'bg-amber-900/30 text-amber-400 border border-amber-800/50' : 'bg-blue-900/30 text-blue-400 border border-blue-800/50'}`}>
                            {escalation.priority}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center gap-2">
                           {escalation.lead}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-zinc-300 truncate max-w-[300px]">{escalation.reason}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-red-400 font-bold flex items-center gap-1.5 mt-2">
                        <Clock size={14} /> {escalation.holdTime}
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        <span className="flex items-center gap-1.5 text-amber-400 animate-pulse font-medium">
                           <Activity size={14} /> {escalation.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
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

export default TeamHeadAIEscalationQueue;
