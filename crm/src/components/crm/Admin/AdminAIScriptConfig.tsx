"use client";

import React, { useState } from 'react';
import { Save, Settings, Upload, FileText, CheckCircle2, AlertTriangle, MessageSquare, Bot, Plus } from 'lucide-react';

const AdminAIScriptConfig = () => {
  const [activeTab, setActiveTab] = useState<'prompts' | 'faqs' | 'intents' | 'tools'>('prompts');

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Agent Configuration</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Configure guardrails, knowledge bases, and conversational rules.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-6 rounded-lg shadow-sm transition-colors flex items-center gap-2">
            <Save size={16} /> Save Configuration
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800">
        <button 
          onClick={() => setActiveTab('prompts')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'prompts' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          System Prompts & Rules
          {activeTab === 'prompts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'faqs' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Knowledge Base (FAQs)
          {activeTab === 'faqs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('intents')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'intents' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          Intent Mappings & Fallbacks
          {activeTab === 'intents' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-3 text-sm font-medium transition-colors relative ${activeTab === 'tools' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          LLM Tools & Permissions
          {activeTab === 'tools' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
        {activeTab === 'prompts' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">Base System Prompt</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4">The core persona and overarching rules the AI must follow on every call.</p>
              <textarea 
                className="w-full p-4 border border-gray-200 dark:border-zinc-700 rounded-xl bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white font-mono text-sm resize-none"
                rows={8}
                defaultValue="You are 'Sara', a professional sales representative for Fioner CRM. Your goal is to qualify leads, answer basic product questions using ONLY the provided knowledge base, and schedule follow-up demonstrations with human executives. You must be polite, concise, and never make promises regarding pricing that are not explicitly stated in your training data."
              ></textarea>
            </div>
            
            <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Hard Guardrails (Do Not Cross)</h3>
              <div className="space-y-3">
                {['Never offer discounts without manager approval', 'Do not mention competitor names', 'Never swear or use inappropriate language', 'If user asks to speak to a human, immediately escalate'].map((rule, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="text-sm font-medium text-red-900 dark:text-red-400">{rule}</span>
                  </div>
                ))}
                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2 mt-2">
                  <Plus size={16} /> Add Rule
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'faqs' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-xl border border-gray-100 dark:border-zinc-700">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Upload size={18}/> Upload Knowledge Document</h3>
                <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Upload PDFs, DOCX, or CSV files to automatically train the agent.</p>
              </div>
              <button className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors shadow-sm">
                Select File
              </button>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Active Training Documents</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 rounded-lg"><FileText size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Q4_Pricing_Guide_v2.pdf</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> Embedded and Active</p>
                    </div>
                  </div>
                  <button className="text-sm text-red-600 hover:text-red-700 font-medium">Remove</button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 rounded-lg"><FileText size={20} /></div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Technical_Specs_OBD_Tracker.docx</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> Embedded and Active</p>
                    </div>
                  </div>
                  <button className="text-sm text-red-600 hover:text-red-700 font-medium">Remove</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'intents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Call Routing & Intents</h3>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <Plus size={16} /> New Intent
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { intent: 'Sales Inquiry', action: 'Schedule Demo', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                { intent: 'Technical Support', action: 'Route to Human Queue', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
                { intent: 'Billing Question', action: 'Answer from FAQ', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                { intent: 'Unrecognized / Confused', action: 'Immediate Human Escalation', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
              ].map((item, i) => (
                <div key={i} className="p-4 border border-gray-200 dark:border-zinc-700 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare size={16} className="text-gray-400" />
                    <span className="font-bold text-sm text-gray-900 dark:text-white">{item.intent}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">Action:</div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${item.color}`}>
                    {item.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                 <h3 className="font-bold text-gray-900 dark:text-white">LLM Function Calling & Permissions</h3>
                 <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Allow your AI agents to perform backend actions dynamically during calls.</p>
              </div>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <Plus size={16} /> Register Webhook
              </button>
            </div>
            
            <div className="space-y-4">
              {[
                { name: 'Book Appointment (Calendar API)', desc: 'Allows AI to check availability and schedule meetings.', status: 'Active' },
                { name: 'Update CRM Record', desc: 'Allows AI to update lead status, notes, or contact info.', status: 'Active' },
                { name: 'Process Payment (Stripe)', desc: 'Allows AI to initiate payment links.', status: 'Requires Handoff' },
                { name: 'Send Follow-up Email', desc: 'Allows AI to send summaries post-call via SendGrid.', status: 'Active' },
              ].map((tool, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                       <Settings size={16} className="text-gray-400" />
                       <h4 className="font-bold text-gray-900 dark:text-white">{tool.name}</h4>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 ml-6">{tool.desc}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2.5 py-1 text-xs uppercase font-bold tracking-wider rounded-full ${tool.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {tool.status}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={tool.status === 'Active'} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAIScriptConfig;
