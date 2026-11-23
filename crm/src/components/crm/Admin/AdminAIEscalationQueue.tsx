"use client";

import React, { useState } from 'react';
import { Search, Filter, AlertTriangle, Bot, ArrowRight, X, Sparkles, Plus } from 'lucide-react';

const AdminAIEscalationQueue = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'rules'>('inbox');
  const [selectedFailure, setSelectedFailure] = useState<any | null>(null);

  const failures = [
    { id: 'AIF-001', intent: 'Unknown', transcript: 'Wait, I need to talk to someone about the routing algorithm... [escalated]', time: '10 mins ago', handledBy: 'Mike Smith' },
    { id: 'AIF-002', intent: 'Pricing Dispute', transcript: 'The website said $10 but you are charging $12... [escalated]', time: '1h ago', handledBy: 'Sarah Jenkins' },
    { id: 'AIF-003', intent: 'Competitor Mention', transcript: 'How does this compare to Verizon Connect? [escalated]', time: '3h ago', handledBy: 'Emily Chen' },
  ];

  if (selectedFailure) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <button onClick={() => setSelectedFailure(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
            ← Back to Queue
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 max-w-4xl">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-zinc-800">
             <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
                <Bot size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Fallback Event: {selectedFailure.id}</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Triggered {selectedFailure.time} • Successfully handed off to {selectedFailure.handledBy}</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
             <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Conversation Transcript</h3>
                <div className="space-y-4 text-sm bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 h-64 overflow-y-auto">
                   <p className="text-blue-600 dark:text-blue-400 font-bold mb-1">AI Agent:</p>
                   <p className="text-gray-700 dark:text-zinc-300 mb-4 bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700">Can you clarify what type of fleet you manage?</p>
                   
                   <p className="text-purple-600 dark:text-purple-400 font-bold mb-1">Customer:</p>
                   <p className="text-gray-700 dark:text-zinc-300 mb-4 bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-zinc-700">Wait, I need to talk to someone about the routing algorithm.</p>
                   
                   <p className="text-red-500 font-bold text-center border-t border-red-200 dark:border-red-900 pt-4 mt-4 uppercase tracking-wider text-xs flex items-center justify-center gap-2">
                     <AlertTriangle size={14}/> Fallback Triggered: Intent Unknown
                   </p>
                </div>
             </div>
             
             <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Retrain AI Model</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">Map this unknown phrasing to an existing intent, or create a new one to prevent future handoffs.</p>
                
                <div className="space-y-4">
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Detected Phrase:</label>
                     <input type="text" readOnly value="talk to someone about the routing algorithm" className="w-full px-3 py-2 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-500 dark:text-zinc-400" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Map to Intent:</label>
                     <select className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50">
                        <option>Technical Support</option>
                        <option>Sales Inquiry</option>
                        <option>Human Request (Direct Escalate)</option>
                        <option>Create New Intent...</option>
                     </select>
                  </div>
                  
                  <button onClick={() => setSelectedFailure(null)} className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 mt-4">
                     <Sparkles size={16} /> Map Intent & Retrain Model
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Escalation Review</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Review AI fallbacks and map unknown intents to train the model.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800 mb-6">
        <button 
          onClick={() => setActiveTab('inbox')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'inbox' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Escalation Inbox
          {activeTab === 'inbox' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'rules' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Global Trigger Rules
          {activeTab === 'rules' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
      </div>

      {activeTab === 'inbox' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800">
             <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input type="text" className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="Search fallbacks..." />
             </div>
             <button className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors border border-zinc-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                Filter
             </button>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Transcript Snippet</th>
                  <th className="px-6 py-4">Handed Off To</th>
                  <th className="px-6 py-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {failures.map(fail => (
                  <tr key={fail.id} onClick={() => setSelectedFailure(fail)} className="hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm font-bold text-red-400 flex items-center gap-2">
                        <Bot size={16} />
                        {fail.id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs uppercase font-bold rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {fail.intent}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white italic max-w-md truncate">
                      "{fail.transcript}"
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {fail.handledBy}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-zinc-400">
                      {fail.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
         <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-2 border border-zinc-800">
             <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input type="text" className="w-full bg-zinc-900 text-sm text-white placeholder-zinc-500 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-700" placeholder="Search trigger rules..." />
             </div>
             <button className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors border border-zinc-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                Filter
             </button>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden overflow-x-auto">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="font-bold text-white">Escalation Trigger Rules</h3>
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-2">
                <Plus size={16} /> Add Rule
              </button>
            </div>
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-bold text-zinc-400 uppercase tracking-wider bg-zinc-900/50">
                  <th className="px-6 py-4">Rule Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Status / Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {[
                  { rule: 'Sentiment Drops Below 40%', desc: 'Monitors caller voice tone and speech for frustration.', status: 'Active' },
                  { rule: 'Agent Says "I don\'t understand" 2x', desc: 'Prevents looping by escalating after repeated confusion.', status: 'Active' },
                  { rule: 'Customer Mentions "Cancel" or "Lawyer"', desc: 'High-risk keyword monitoring.', status: 'Active' },
                  { rule: 'Call Duration > 15 Mins', desc: 'Hard cutoff for overly long unresolved AI sessions.', status: 'Paused' },
                ].map((rule, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white text-sm">{rule.rule}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300">
                      {rule.desc}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <span className={`px-2.5 py-1 text-xs uppercase font-bold tracking-wider rounded-full ${rule.status === 'Active' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                          {rule.status}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={rule.status === 'Active'} />
                          <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
         </div>
      )}
    </div>
  );
};

export default AdminAIEscalationQueue;
