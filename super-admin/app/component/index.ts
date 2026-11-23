export {
  default as Dashboard,
  syncDashboard,
  hydrateDashboard,
  renderDashboardView,
  renderDashboardView as renderDashboardRoute,
  dashboardServerState,
} from './Dashboard';

export {
  default as Users,
  mapUserFromApi,
  syncUsers,
  renderUsersView,
  renderUsersView as renderUsersRoute,
  openUserDrawer,
  openAddUserModal,
  toggleUserStatus,
} from './Users';

export {
  default as Vechile,
  computeVehicleReminder,
  mapVehicleFromApi,
  syncVehicles,
  renderVehicleView,
  renderVehicleView as renderVehiclesView,
  renderVehicleView as renderVehiclesRoute,
  openVehicleDrawer,
} from './Vechile';

export { default as Vehicle } from './Vehicle';

export {
  default as Qrcodes,
  mapQrFromApi,
  syncQrCodes,
  renderQrcodesView,
  renderQrcodesView as renderQrView,
  renderQrcodesView as renderQrRoute,
  openQrDrawer,
  openBatchQrModal,
  openAssignQrModal,
  openReplaceQrModal,
  suspendQr,
  reactivateQr,
} from './Qrcodes';

export {
  default as Gpsdevices,
  mapGpsFromApi,
  syncGpsDevices,
  renderGpsdevicesView,
  renderGpsdevicesView as renderGpsView,
  renderGpsdevicesView as renderGpsRoute,
  openGpsDrawer,
  openAssignGpsModal,
  unbindGps,
} from './Gpsdevices';

export {
  default as Sos,
  mapSosFromApi,
  syncSosEvents,
  renderSosView,
  renderSosView as renderSosRoute,
  openSosDrawer,
} from './Sos';

export {
  default as Orders,
  mapOrderFromApi,
  syncOrders,
  renderOrdersView,
  renderOrdersView as renderOrdersRoute,
  openOrderDrawer,
} from './Orders';

export {
  default as Inventory,
  mapProductFromApi,
  syncProducts,
  renderInventoryView,
  renderInventoryView as renderInventoryRoute,
  renderInventoryTab,
  openProductDrawer,
  openProductModal,
} from './Inventory';

export {
  default as Membership,
  mapPlanFromApi,
  mapSubscriptionFromApi,
  syncPlans,
  syncSubscriptions,
  renderMembershipView,
  renderMembershipView as renderMembershipRoute,
  renderMembershipTab,
  openPlanModal,
  sendReminder,
} from './Membership';

export {
  default as Support,
  mapTicketFromApi,
  fetchTicketsServer,
  syncTickets,
  ticketsServerState,
  renderSupportView,
  renderSupportView as renderSupportRoute,
  renderSupportTab,
  openTicketDrawer,
} from './Support';

export {
  default as AiConsole,
  mapAiKnowledgeFromApi,
  mapAiIntentFromApi,
  mapAiToolFromApi,
  mapAiEscalationRuleFromApi,
  syncAiKnowledge,
  syncAiIntents,
  syncAiTools,
  syncAiEscalationRules,
  syncAiAnalytics,
  renderAiRoute,
  openKbModal,
  deleteKb,
  openThresholdModal,
} from './AiConsole';

export {
  default as CrmActivity,
  mapCrmCallFromApi,
  mapLeadFromApi,
  syncCrmOverview,
  syncCrmCalls,
  syncCrmLeads,
  fetchCrmCallsServer,
  fetchCrmLeadsServer,
  crmCallsServerState,
  crmLeadsServerState,
  renderCrmRoute,
} from './CrmActivity';

export {
  default as ContentCampaigns,
  mapBannerFromApi,
  mapCampaignFromApi,
  syncBanners,
  syncCampaigns,
  renderContentRoute,
  openBannerModal,
  openCampaignModal,
  toggleBanner,
  deleteBanner,
} from './ContentCampaigns';

export {
  default as Reports,
  downloadCsv,
  exportReport,
  renderReportsRoute,
} from './Reports';

export {
  default as RolesPermissions,
  mapRoleFromApi,
  syncRoles,
  renderRolesRoute,
  PERM_MODULES,
} from './RolesPermissions';

export {
  default as AuditLogs,
  mapAuditLogFromApi,
  fetchAuditLogs,
  renderAuditLogsRoute,
  auditLogsServerState,
} from './AuditLogs';

