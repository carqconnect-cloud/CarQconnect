import React, { useState } from 'react';
import { BookOpen, FileText, Lock, MessageSquare, ShieldAlert } from 'lucide-react';

const TeamHeadAIScriptQueue = () => {
  const [activeTab, setActiveTab] = useState<'scripts' | 'faqs'>('scripts');

  const scripts = [
    {
      id: 1,
      title: 'Inbound Inquiry (General)',
      lastUpdated: 'Oct 12, 2026',
      content: [
        { role: 'AI', text: "Hello! Thank you for calling Fioner CRM. How can I assist you today?" },
        { role: 'USER', text: "[Intent: Pricing, Features, or Support]" },
        { role: 'AI', text: "I can certainly help with that. Are you a current customer, or are you looking to start a new plan?" },
        { role: 'AI', text: "[If Escalation Needed]: I'll connect you with a specialist who can provide more details. Please hold." }
      ]
    },
    {
      id: 2,
      title: 'Outbound Renewal (Q4)',
      lastUpdated: 'Nov 01, 2026',
      content: [
        { role: 'AI', text: "Hi, this is Alex from Fioner CRM. I'm calling because your current Premium plan is expiring in 15 days." },
        { role: 'AI', text: "We have a special 10% discount if you renew today. Would you like me to send you the renewal link?" },
        { role: 'USER', text: "[Intent: Yes / No / Maybe later]" }
      ]
    }
  ];

  const faqs = [
    { question: 'What is the standard refund policy?', answer: 'Refunds are only issued within 14 days of the initial purchase. No partial refunds for annual plans.' },
    { question: 'How do I upgrade a customer to Premium Gold?', answer: 'Customers must first clear any outstanding invoices. The upgrade can be triggered via the billing portal.' },
    { question: 'What happens if the vehicle registration is invalid?', answer: 'The CRM will automatically flag the profile. A human agent must manually verify the RC document before proceeding.' }
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
             AI Script & Knowledge Base
             <Lock size={16} className="text-amber-500" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Read-only access to globally approved AI scripts, flows, and product FAQs to align your team.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-zinc-800">
        <button 
          onClick={() => setActiveTab('scripts')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'scripts' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <MessageSquare size={16}/> Approved Script Flows
          {activeTab === 'scripts' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button 
          onClick={() => setActiveTab('faqs')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'faqs' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <BookOpen size={16}/> Product FAQs & Knowledge Base
          {activeTab === 'faqs' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 relative overflow-hidden">
        {/* Read-only watermark/badge */}
        <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-4 py-1.5 rounded-bl-xl text-xs font-bold flex items-center gap-1.5">
           <ShieldAlert size={14} /> View Only
        </div>

        {activeTab === 'scripts' && (
          <div className="space-y-8 mt-4">
             {scripts.map((script) => (
                <div key={script.id} className="border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                   <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                         <FileText size={18} className="text-blue-500"/>
                         {script.title}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-zinc-400">Last updated: {script.lastUpdated}</span>
                   </div>
                   <div className="p-6 space-y-4">
                      {script.content.map((msg, idx) => (
                         <div key={idx} className={`flex gap-4 ${msg.role === 'AI' ? '' : 'justify-end'}`}>
                            {msg.role === 'AI' && (
                               <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 text-xs font-bold">AI</div>
                            )}
                            <div className={`p-3 rounded-xl max-w-[80%] text-sm ${msg.role === 'AI' ? 'bg-gray-50 dark:bg-zinc-800/50 text-gray-700 dark:text-zinc-300' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800/30'}`}>
                               {msg.text}
                            </div>
                            {msg.role === 'USER' && (
                               <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 text-xs font-bold">User</div>
                            )}
                         </div>
                      ))}
                   </div>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'faqs' && (
          <div className="space-y-4 mt-4 max-w-4xl">
             {faqs.map((faq, i) => (
                <div key={i} className="p-5 border border-gray-100 dark:border-zinc-800 rounded-xl bg-gray-50/50 dark:bg-zinc-800/30 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                   <h4 className="font-bold text-gray-900 dark:text-white flex gap-2">
                     <span className="text-blue-500">Q:</span> {faq.question}
                   </h4>
                   <p className="text-sm text-gray-600 dark:text-zinc-400 mt-2 flex gap-2">
                     <span className="text-emerald-500 font-bold">A:</span> {faq.answer}
                   </p>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamHeadAIScriptQueue;
