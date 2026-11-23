"use client";

import { AuthProvider, useAuth } from "@/components/AuthContext";
import { ThemeProvider } from "@/components/ThemeContext";
import SignupPage from "@/components/auth/SignupPage";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function SignupShell() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) return null;

  return <SignupPage onSwitchToLogin={() => router.push("/")} />;
}

export default function SignupRoute() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SignupShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
