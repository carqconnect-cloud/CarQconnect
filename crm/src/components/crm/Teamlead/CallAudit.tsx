"use client";

import React, { useState } from 'react';
import { Search, Filter, PlayCircle, Star, Pause, Volume2, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

const CallAudit = () => {
  const [selectedCall, setSelectedCall] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState<'playback' | 'transcript'>('playback');

  const calls = [
    { id: 1, exec: 'Sarah Jenkins', client: 'Acme Corp', duration: '05:42', date: 'Today, 10:30 AM', aiScore: 92, status: 'Needs Review' },
    { id: 2, exec: 'Mike Smith', client: 'TechFlow', duration: '12:15', date: 'Today, 09:15 AM', aiScore: 78, status: 'Reviewed' },
    { id: 3, exec: 'Emily Chen', client: 'Global Co', duration: '03:50', date: 'Yesterday, 04:20 PM', aiScore: 95, status: 'Needs Review' },
    { id: 4, exec: 'Sarah Jenkins', client: 'StartUp Hub', duration: '08:20', date: 'Yesterday, 11:00 AM', aiScore: 65, status: 'Flagged' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Call Quality Audit</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Review executive calls, QA scores, and AI transcripts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 text-sm font-medium py-2 px-4 rounded-lg shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-zinc-800 flex items-center gap-2">
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call List */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden h-[700px] flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col gap-3">
            <div className="relative w-full">
              <Search size={16} className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search calls..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-zinc-200" />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-zinc-800">
            {calls.map((call) => (
              <div 
                key={call.id} 
                onClick={() => setSelectedCall(call.id)}
                className={`p-4 cursor-pointer transition-colors border-l-4 ${
                  selectedCall === call.id 
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">{call.exec}</h3>
                  <div className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full flex items-center gap-1 ${
                    call.status === 'Flagged' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    call.status === 'Reviewed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {call.status === 'Flagged' && <AlertTriangle size={10} />}
                    {call.status}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400 mb-3">
                  <span>{call.client}</span>
                  <span>{call.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                    <PlayCircle size={14} className="text-blue-500" /> {call.duration}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <Star size={14} className="fill-emerald-600" /> AI Score: {call.aiScore}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Workspace */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 h-[700px] flex flex-col">
          {selectedCall ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Call with Acme Corp
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Handled by Sarah Jenkins • Oct 15, 2026</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">AI QA Score</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">92<span className="text-lg text-gray-400">/100</span></p>
                  </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-200 dark:border-zinc-700">
                  <button 
                    onClick={() => setActiveTab('playback')}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'playback' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
                  >
                    Playback & Scoring
                    {activeTab === 'playback' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
                  </button>
                  <button 
                    onClick={() => setActiveTab('transcript')}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'transcript' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
                  >
                    Transcript & Notes
                    {activeTab === 'transcript' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-zinc-900/50">
                {activeTab === 'playback' ? (
                  <div className="space-y-8">
                    {/* Audio Player */}
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-gray-100 dark:border-zinc-700 shadow-sm">
                      <div className="flex items-center gap-4 mb-6">
                        <button className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center hover:bg-blue-200 transition-colors shrink-0">
                          <Pause size={24} />
                        </button>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">
                            <span>01:24</span>
                            <span>05:42</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden cursor-pointer">
                            <div className="h-full bg-blue-500 rounded-full w-1/4"></div>
                          </div>
                        </div>
                        <Volume2 size={20} className="text-gray-400 shrink-0" />
                      </div>
                      
                      {/* Audio Visualizer Mock */}
                      <div className="h-16 flex items-center gap-1 justify-center px-4">
                        {[...Array(60)].map((_, i) => (
                          <div key={i} className={`w-1.5 rounded-full ${i < 15 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-zinc-600'}`} style={{ height: `${Math.max(10, Math.random() * 100)}%` }}></div>
                        ))}
                      </div>
                    </div>
                    
                    {/* AI Insights & Manual Scoring */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">AI Sentiment Analysis</h3>
                        <div className="space-y-4">
                          <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600 dark:text-zinc-300 font-medium">Customer Sentiment</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Positive</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[85%]"></div></div>
                          </div>
                          <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-600 dark:text-zinc-300 font-medium">Talk Ratio (Exec : Client)</span>
                              <span className="text-blue-600 dark:text-blue-400 font-bold">45 : 55</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full flex overflow-hidden">
                              <div className="h-full bg-blue-500 w-[45%]"></div>
                              <div className="h-full bg-purple-500 w-[55%]"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4">Manual QA Rubric</h3>
                        <div className="space-y-3">
                          {[
                            { label: 'Proper Greeting & Verification', checked: true },
                            { label: 'Active Listening & Empathy', checked: true },
                            { label: 'Accurate Product Information', checked: true },
                            { label: 'Clear Next Steps Outlined', checked: false },
                          ].map((item, i) => (
                            <label key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50">
                              <input type="checkbox" defaultChecked={item.checked} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                              <span className="text-sm text-gray-700 dark:text-zinc-300 font-medium">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6 h-full">
                    {/* Transcript */}
                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 flex flex-col h-full overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <FileText size={18} /> AI Transcript
                        </h3>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">SJ</div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-gray-900 dark:text-white">Sarah Jenkins</span>
                              <span className="text-xs text-gray-400">00:05</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-zinc-300 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl rounded-tl-none border border-blue-100 dark:border-blue-900/30">
                              Hi there, thanks for calling Fioner. This is Sarah. How can I help you today?
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center shrink-0">AC</div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-gray-900 dark:text-white">Acme Corp</span>
                              <span className="text-xs text-gray-400">00:12</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-zinc-300 bg-purple-50/50 dark:bg-purple-900/10 p-3 rounded-xl rounded-tl-none border border-purple-100 dark:border-purple-900/30">
                              Yes, hi. We are looking to expand our fleet and wanted to know about bulk pricing for the OBD trackers.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">SJ</div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-gray-900 dark:text-white">Sarah Jenkins</span>
                              <span className="text-xs text-blue-500 font-bold flex items-center gap-1"><PlayCircle size={12}/> 01:24</span>
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl rounded-tl-none border border-blue-200 dark:border-blue-800 shadow-sm relative">
                              <span className="absolute -left-1 top-1/2 w-1 h-8 bg-blue-500 rounded-r -translate-y-1/2"></span>
                              Absolutely, I can help with that. Are you currently using our basic tier or the enterprise plan?
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Executive Notes */}
                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 flex flex-col h-full overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-100 dark:border-zinc-700 bg-amber-50 dark:bg-amber-900/10">
                        <h3 className="font-bold text-amber-800 dark:text-amber-500 flex items-center gap-2">
                           Executive's Call Notes
                        </h3>
                      </div>
                      <div className="flex-1 p-6 text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap font-mono bg-[#fdfdfd] dark:bg-zinc-800/80">
{`Client inquired about bulk OBD trackers for upcoming fleet expansion. 

- Currently on Enterprise plan
- Looking for 45-50 new devices by Q4
- Asked about volume discounts

Action items:
1. Send over the Q4 pricing sheet
2. Schedule follow-up demo for the new dashboard features
3. Send contract for review

Disposition: Interested`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <PlayCircle size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select a call from the list to begin audit.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallAudit;
