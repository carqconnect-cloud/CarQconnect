"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export interface Reminder {
  id: string;
  task: string;
  client?: string;
  datetime: string;
  type: string;
}

interface ReminderContextType {
  addReminder: (reminder: Reminder) => void;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider = ({ children }: { children: ReactNode }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    const checkReminders = setInterval(() => {
      const now = new Date();
      reminders.forEach(reminder => {
        const reminderTime = new Date(reminder.datetime);
        // If it's time to trigger (within the same minute) and not already triggered
        if (reminderTime <= now && !activeReminder) {
           setActiveReminder(reminder);
           setReminders(prev => prev.filter(r => r.id !== reminder.id));
        }
      });
    }, 5000); 
    return () => clearInterval(checkReminders);
  }, [reminders, activeReminder]);

  const addReminder = (reminder: Reminder) => {
    setReminders(prev => [...prev, reminder]);
    toast.success('Global reminder set successfully!');
  };

  return (
    <ReminderContext.Provider value={{ addReminder }}>
      {children}
      {activeReminder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg border-2 border-blue-500 overflow-hidden animate-in zoom-in-90 duration-300">
            <div className="p-8 space-y-6 text-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Clock size={40} />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Reminder Triggered!</h2>
                <p className="text-lg text-gray-600 dark:text-zinc-400">It's time for your scheduled task.</p>
              </div>
              <div className="bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-2xl text-left border border-gray-100 dark:border-zinc-800">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">{activeReminder.type} Reminder</p>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{activeReminder.task}</h3>
                {activeReminder.client && <p className="text-gray-600 dark:text-zinc-400">Client: <span className="font-semibold text-gray-900 dark:text-white">{activeReminder.client}</span></p>}
              </div>
              <button onClick={() => setActiveReminder(null)} className="w-full py-4 text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1">
                Dismiss & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </ReminderContext.Provider>
  );
};

export const useReminder = () => {
  const context = useContext(ReminderContext);
  if (!context) throw new Error('useReminder must be used within ReminderProvider');
  return context;
};
