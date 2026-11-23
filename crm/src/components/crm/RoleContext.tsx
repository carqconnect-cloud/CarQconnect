"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Role = 'ADMIN' | 'TEAM_HEAD' | 'EXECUTIVE';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children, initialRole = 'ADMIN' }: { children: ReactNode; initialRole?: Role }) => {
  const [role, setRole] = useState<Role>(initialRole);
  const [activeTab, setActiveTab] = useState<string>('Dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // When role changes, reset the tab to the dashboard of that role
  const handleSetRole = (newRole: Role) => {
    setRole(newRole);
    setActiveTab('Dashboard');
    setIsMobileMenuOpen(false);
  };

  return (
    <RoleContext.Provider value={{ role, setRole: handleSetRole, activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
