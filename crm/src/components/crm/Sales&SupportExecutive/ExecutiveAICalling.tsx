import React, { useState } from 'react';
import { Bot, FileText, CheckCircle2, Clock, ArrowLeft, ShieldAlert, PhoneCall, ListTodo } from 'lucide-react';

const ExecutiveAICalling = () => {
  const [selectedCall, setSelectedCall] = useState<any | null>(null);

  const aiHandoffs = [
    { 
      id: 1, 
      lead: 'Acme Corp', 
      contact: 'John Doe', 
      duration: '4m 05s',
      reason: 'Q4 Renewal',
      assign: 'Human',
      action: 'Escalated to Mike Smith',
      date: 'Today, 10:30 AM',
      outcome: 'Interested in Enterprise Plan',
      sentiment: 'Positive',
      task: 'Send standard enterprise proposal and schedule demo.',
      status: 'Pending',
      transcript: [
        { role: 'AI', text: "Hello! This is Fioner AI calling on behalf of Acme Corp. I noticed you were looking into our routing solutions. How can I help?" },
        { role: 'USER', text: "Yes, I'm trying to figure out if your enterprise tier supports multi-depot routing." },
        { role: 'AI', text: "Absolutely, our enterprise plan fully supports multi-depot configurations. I can have a specialist send you the exact specifications and pricing. Would that be helpful?" },
        { role: 'USER', text: "That would be great, thanks." }
      ]
    },
    { 
      id: 2, 
      lead: 'TechFlow Inc', 
      contact: 'Sarah Jenkins', 
      duration: '3m 12s',
      reason: 'Cold Revival',
      assign: 'Human',
      action: 'pending',
      date: 'Yesterday, 04:15 PM',
      outcome: 'Requested Human Callback',
      sentiment: 'Neutral',
      task: 'Call back to discuss custom API integrations.',
      status: 'Pending',
      transcript: [
        { role: 'AI', text: "Hi there, I'm reaching out from Fioner CRM..." },
        { role: 'USER', text: "I have some very specific technical questions about your API rate limits. Are you a bot?" },
        { role: 'AI', text: "I am an AI assistant. It sounds like you need to speak with one of our technical integration specialists. I will schedule a callback for you right away." }
      ]
    }
  ];

  if (selectedCall) {
    return (
      <div className="space-y-6 pb-20">
        <button onClick={() => setSelectedCall(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to AI Handoffs
        </button>
        
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800 bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10">
            <div className="flex items-start justify-between">
               <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedCall.lead}</h1>
                  <p className="text-sm text-gray-500 dark:text-zinc-400 flex items-center gap-2">
                     <Clock size={14}/> AI Call Completed: {selectedCall.date}
                  </p>
               </div>
               <div className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Bot size={14} /> AI Analyzed
               </div>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText size={18} className="text-purple-500" /> Full Call Transcript</h3>
              
              <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-6 border border-gray-100 dark:border-zinc-800 space-y-4">
                 {selectedCall.transcript.map((msg: any, idx: number) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'AI' ? '' : 'justify-end'}`}>
                       {msg.role === 'AI' && (
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 text-xs font-bold shadow-sm border border-purple-200 dark:border-purple-800/50">AI</div>
                       )}
                       <div className={`p-3 rounded-xl max-w-[85%] text-sm shadow-sm ${msg.role === 'AI' ? 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border border-gray-100 dark:border-zinc-700' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30'}`}>
                          {msg.text}
                       </div>
                       {msg.role === 'USER' && (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 text-xs font-bold shadow-sm">Client</div>
                       )}
                    </div>
                 ))}
              </div>
            </div>
            
            <div className="space-y-6">
               <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-5 border border-blue-100 dark:border-blue-900/30">
                  <h4 className="font-bold text-sm text-blue-900 dark:text-blue-400 mb-4 flex items-center gap-2"><ListTodo size={16}/> AI Assigned Task</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mb-6 font-medium bg-white dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800/50">
                     "{selectedCall.task}"
                  </p>
                  
                  <div className="space-y-3">
                     <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2">
                       <CheckCircle2 size={16} /> Mark Task Complete
                     </button>
                     <button className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-bold py-2.5 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-700">
                       <PhoneCall size={16} /> Call Client Now
                     </button>
                  </div>
               </div>

               <div className="bg-white dark:bg-zinc-800/50 rounded-xl p-5 border border-gray-100 dark:border-zinc-800">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">AI Call Summary</h4>
                  <div className="space-y-3 text-sm">
                     <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-zinc-400">Sentiment:</span>
                        <span className={`font-bold ${selectedCall.sentiment === 'Positive' ? 'text-emerald-600' : 'text-gray-700 dark:text-zinc-300'}`}>{selectedCall.sentiment}</span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-zinc-400">Outcome:</span>
                        <span className="font-bold text-gray-900 dark:text-white text-right">{selectedCall.outcome}</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
             <Bot className="text-purple-500" /> AI Calling & Hand-offs
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Review AI call outcomes, read transcripts, and complete auto-assigned follow-ups.</p>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 flex items-center gap-3">
         <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <ShieldAlert size={20} />
         </div>
         <div>
            <h3 className="font-bold text-amber-900 dark:text-amber-500 text-sm">View-Only Access</h3>
            <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">You are viewing post-call analysis generated by Fioner AI. AI logic and script configurations are managed by your Team Head.</p>
         </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800">
        <div className="relative flex-1 max-w-md">
           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
           </div>
           <input type="text" className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="Search unassigned leads..." />
        </div>
        <button className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors border border-zinc-700">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
           Filter
        </button>
      </div>

      {/* Detailed List (Table) */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
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
            {aiHandoffs.map((handoff) => (
              <tr key={handoff.id} onClick={() => setSelectedCall(handoff)} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                    <Bot size={16} className="text-purple-500" />
                    {handoff.lead}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-300">
                  {handoff.duration}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/50">
                    {handoff.reason}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-300">
                  {handoff.assign}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${handoff.sentiment === 'Positive' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {handoff.outcome}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-300 capitalize">
                  {handoff.action}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExecutiveAICalling;
