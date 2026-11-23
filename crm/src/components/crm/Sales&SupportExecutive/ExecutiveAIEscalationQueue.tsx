import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, Bot, X, CheckCircle2, Clock, PhoneForwarded, MessageSquare } from 'lucide-react';

const ExecutiveAIEscalationQueue = () => {
  const [showIncomingPopup, setShowIncomingPopup] = useState(true);
  const [activeCall, setActiveCall] = useState(false);

  const pendingTransfers = [
    { id: 1, customer: 'TechFlow Inc', contact: 'Sarah Jenkins', timeWaiting: '02:15', reason: 'Billing dispute and refund request.', priority: 'High' },
    { id: 2, customer: 'Global Logistics', contact: 'Mike Smith', timeWaiting: '01:05', reason: 'Technical support - hardware failure.', priority: 'High' }
  ];

  const handleAcceptCall = () => {
    setShowIncomingPopup(false);
    setActiveCall(true);
  };

  return (
    <div className="space-y-6 pb-20 relative min-h-[80vh]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
             <PhoneForwarded className="text-red-500" /> Live AI Escalations
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Receive live hand-offs from the AI agent when human intervention is required.</p>
        </div>
      </div>

      {activeCall && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-6 flex items-center justify-between shadow-sm animate-pulse">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center relative">
                 <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-20"></div>
                 <PhoneCall size={24} />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-400">Live Call Connected: Acme Corp</h2>
                 <p className="text-emerald-700 dark:text-emerald-500 text-sm">00:14 • John Doe (Primary Contact)</p>
              </div>
           </div>
           <button onClick={() => setActiveCall(false)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors">
              End Call
           </button>
        </div>
      )}

      {!activeCall && (
        <div className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800">
            <div className="relative flex-1 max-w-md">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
               </div>
               <input type="text" className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="Search live escalations..." />
            </div>
            <button className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors border border-zinc-700">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
               Filter
            </button>
          </div>

          <div className="bg-zinc-900 rounded-xl shadow-sm border border-zinc-800 overflow-hidden overflow-x-auto">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="font-bold text-white flex items-center gap-2">
                 Waiting in Queue <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full text-xs">{pendingTransfers.length}</span>
              </h2>
            </div>
            
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Wait Time</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                 {pendingTransfers.map(transfer => (
                    <tr key={transfer.id} className="hover:bg-zinc-800/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white flex items-center gap-2">
                           <PhoneForwarded size={16} className="text-amber-500" />
                           {transfer.contact}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        {transfer.customer}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-zinc-300 truncate max-w-sm" title={transfer.reason}>
                          {transfer.reason}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-red-400 flex items-center gap-1"><Clock size={14}/> {transfer.timeWaiting}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors">
                           Accept & Connect
                        </button>
                      </td>
                    </tr>
                 ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incoming Live Escalation Pop-up Modal */}
      {showIncomingPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-red-500/20 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            {/* Header Alert */}
            <div className="bg-red-600 p-4 flex items-start justify-between text-white">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                    <PhoneForwarded size={24} />
                 </div>
                 <div>
                    <h2 className="text-lg font-bold">Incoming AI Transfer!</h2>
                    <p className="text-red-100 text-sm">Customer has been waiting 00:15</p>
                 </div>
              </div>
              <button onClick={() => setShowIncomingPopup(false)} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
               {/* Customer Info */}
               <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Acme Corp</h3>
                  <p className="text-gray-500 dark:text-zinc-400">John Doe • +1 (555) 123-4567</p>
               </div>
               
               {/* Escalation Reason */}
               <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                  <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle size={14}/> Transfer Reason</p>
                  <p className="text-sm text-red-900 dark:text-red-300 font-medium">Customer requested complex API integration details not covered in standard AI knowledge base.</p>
               </div>

               {/* AI Conversation Context */}
               <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Bot size={14}/> AI Conversation Summary</p>
                  <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-gray-100 dark:border-zinc-800 space-y-3 text-sm">
                     <div className="flex gap-3">
                        <MessageSquare size={16} className="text-purple-500 shrink-0 mt-0.5" />
                        <p className="text-gray-700 dark:text-zinc-300">Customer confirmed they want the Enterprise plan for 45 vehicles.</p>
                     </div>
                     <div className="flex gap-3">
                        <MessageSquare size={16} className="text-purple-500 shrink-0 mt-0.5" />
                        <p className="text-gray-700 dark:text-zinc-300">Customer asked if the routing engine supports strict time-window constraints via REST API.</p>
                     </div>
                     <div className="flex gap-3">
                        <MessageSquare size={16} className="text-purple-500 shrink-0 mt-0.5" />
                        <p className="text-gray-700 dark:text-zinc-300">AI initiated transfer to human technical executive.</p>
                     </div>
                  </div>
               </div>

               {/* Action Buttons */}
               <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={() => setShowIncomingPopup(false)} className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-bold py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                     Decline
                  </button>
                  <button onClick={handleAcceptCall} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                     <PhoneCall size={18} /> Accept & Join
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveAIEscalationQueue;
