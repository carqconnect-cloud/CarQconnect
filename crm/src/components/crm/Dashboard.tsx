"use client";

import React, { useState, useEffect } from 'react';
import { useRole } from './RoleContext';
// Admin
import AdminDashboard from './Admin/AdminDashboard';
import AdminLeads from './Admin/AdminLeads';
import AdminCustomers from './Admin/AdminCustomers';
import AdminAICalling from './Admin/AdminAICalling';
import AdminHumanCalling from './Admin/AdminHumanCalling';
import AdminSupport from './Admin/AdminSupport';
import AdminFollowUps from './Admin/AdminFollowUps';
import AdminAIScriptConfig from './Admin/AdminAIScriptConfig';
import AdminCRMReport from './Admin/AdminCRMReport';
import AdminTeamManagement from './Admin/AdminTeamManagement';
import AdminAIEscalationQueue from './Admin/AdminAIEscalationQueue';

// Team lead
import TeamHeadDashboard from './Teamlead/TeamHeadDashboard';
import TeamPerformance from './Teamlead/TeamPerformance';
import LeadAssignment from './Teamlead/LeadAssignment';
import TicketQueue from './Teamlead/TicketQueue';
import TeamHeadHumanCalling from './Teamlead/TeamHeadHumanCalling';
import TeamHeadCustomers from './Teamlead/TeamHeadCustomers';
import TeamHeadAICalling from './Teamlead/TeamHeadAICalling';
import TeamHeadAIScriptQueue from './Teamlead/TeamHeadAIScriptconfig';
import TeamHeadAIEscalationQueue from './Teamlead/TeamHeadAIEscalationQueue';
import TeamHeadFollowUps from './Teamlead/TeamHeadFollowUps';

// Sales & Support Executive
import ExecutiveDashboard from './Sales&SupportExecutive/ExecutiveDashboard';
import Leads from './Sales&SupportExecutive/ExecutiveLeads';
import Customers from './Sales&SupportExecutive/ExecutiveCustomers';
import CallWorkspace from './Sales&SupportExecutive/ExecutiveCallWorkspace';
import FollowUps from './Sales&SupportExecutive/ExecutiveFollowUps';
import ExecutiveSupport from './Sales&SupportExecutive/ExecutiveSupport';
import ExecutiveAICalling from './Sales&SupportExecutive/ExecutiveAICalling';
import ExecutiveAIEscalationQueue from './Sales&SupportExecutive/ExecutiveAIEscalationQueue';

import GlobalProfile from './Profile';
import { useAuth } from '../AuthContext';

function renderTabByRole(role: string, tab: string) {
  if (role === 'EXECUTIVE') {
    switch (tab) {
      case 'Leads':
        return <Leads />;
      case 'Customers':
        return <Customers />;
      case 'Call Workspace':
        return <CallWorkspace />;
      case 'Follow-ups':
        return <FollowUps />;
      case 'AI Calling Hand-offs':
        return <ExecutiveAICalling />;
      case 'Live Escalations':
        return <ExecutiveAIEscalationQueue />;
      case 'Support':
        return <ExecutiveSupport />;
      case 'Dashboard':
      case 'Executive Dashboard':
      default:
        return <ExecutiveDashboard />;
    }
  }

  if (role === 'TEAM_HEAD') {
    switch (tab) {
      case 'Lead Assignment':
        return <LeadAssignment />;
      case 'Customers':
        return <TeamHeadCustomers />;
      case 'AI Calling':
        return <TeamHeadAICalling />;
      case 'AI Escalation Queue':
        return <TeamHeadAIEscalationQueue />;
      case 'AI Config':
        return <TeamHeadAIScriptQueue />;
      case 'Call Workspace':
        return <TeamHeadHumanCalling />;
      case 'Support':
        return <TicketQueue />;
      case 'Follow-ups':
        return <TeamHeadFollowUps />;
      case 'Team Performance':
        return <TeamPerformance />;
      case 'Dashboard':
      default:
        return <TeamHeadDashboard />;
    }
  }

  if (role === 'ADMIN') {
    switch (tab) {
      case 'Leads':
        return <AdminLeads />;
      case 'Customers':
        return <AdminCustomers />;
      case 'AI Calling':
        return <AdminAICalling />;
      case 'AI Config & Guardrails':
        return <AdminAIScriptConfig />;
      case 'AI Escalations':
        return <AdminAIEscalationQueue />;
      case 'Call Workspace':
        return <AdminHumanCalling />;
      case 'Support':
        return <AdminSupport />;
      case 'Follow-ups':
        return <AdminFollowUps />;
      case 'Team Management':
        return <AdminTeamManagement />;
      case 'CRM Report':
        return <AdminCRMReport />;
      case 'Global Dashboard':
      case 'Dashboard':
      default:
        return <AdminDashboard />;
    }
  }

  return <AdminDashboard />;
}

const Dashboard = () => {
  const { role, activeTab } = useRole();
  const { user } = useAuth();
  const [visitedTabs, setVisitedTabs] = useState<string[]>(() => [activeTab]);

  useEffect(() => {
    setVisitedTabs((prev) => (prev.includes(activeTab) ? prev : [...prev, activeTab]));
  }, [activeTab]);

  useEffect(() => {
    setVisitedTabs([activeTab]);
  }, [role]);

  // Global cross-role tabs
  if (activeTab === 'Profile' || user?.requirePasswordChange) {
    return <GlobalProfile defaultTab={user?.requirePasswordChange ? 'security' : 'general'} />;
  }

  return (
    <div className="relative w-full">
      {visitedTabs.map((tab) => {
        const isCurrent = tab === activeTab;
        return (
          <div
            key={`${role}-${tab}`}
            style={{ display: isCurrent ? 'block' : 'none' }}
            aria-hidden={!isCurrent}
            className={isCurrent ? 'transition-opacity duration-150' : ''}
          >
            {renderTabByRole(role, tab)}
          </div>
        );
      })}
    </div>
  );
};

export default Dashboard;
