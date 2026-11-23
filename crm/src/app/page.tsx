"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/components/AuthContext";
import { ThemeProvider } from "@/components/ThemeContext";
import { RoleProvider } from "@/components/crm/RoleContext";
import { ReminderProvider } from "@/components/ReminderContext";
import CRMLayout from "@/components/crm/CRMLayout";
import Dashboard from "@/components/crm/Dashboard";
import LoginPage from "@/components/auth/LoginPage";
import SignupPage from "@/components/auth/SignupPage";
import ForgetPassword from "@/components/auth/forgetPassword";

type AuthScreen = "login" | "signup" | "forgot-password";

function AppShell() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [screen, setScreen] = useState<AuthScreen>("login");

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-black overflow-hidden font-sans">
        {/* Skeleton Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-4 hidden md:block animate-pulse">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-gray-100 dark:border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30" />
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-28" />
          </div>
          <div className="space-y-2 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 bg-gray-100 dark:bg-zinc-900 rounded-lg w-full" />
            ))}
          </div>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-16 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-8 flex items-center justify-between animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-36" />
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800" />
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800" />
            </div>
          </div>
          <div className="flex-1 p-8 space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (screen === "signup") {
      return <SignupPage onSwitchToLogin={() => setScreen("login")} />;
    }
    if (screen === "forgot-password") {
      return <ForgetPassword onSwitchToLogin={() => setScreen("login")} />;
    }
    return (
      <LoginPage 
        onSwitchToSignup={() => setScreen("signup")} 
        onSwitchToForgot={() => setScreen("forgot-password")}
      />
    );
  }

  return (
    <RoleProvider initialRole={user!.role}>
      <CRMLayout>
        <Dashboard />
      </CRMLayout>
    </RoleProvider>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReminderProvider>
          <AppShell />
        </ReminderProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
