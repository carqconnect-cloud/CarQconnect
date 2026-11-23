import { z } from 'zod';

export const dashboardPeriodSchema = z.enum([
  'today',
  'last7days',
  'thismonth',
  'thisyear',
]);

export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;

export const getAdminDashboardOverviewSchema = z
  .object({
    period: dashboardPeriodSchema.default('thismonth'),
    startDate: z.string().trim().min(1).pipe(z.coerce.date()).optional(),
    endDate: z.string().trim().min(1).pipe(z.coerce.date()).optional(),
  })
  .refine(
    (data) => {
      if ((data.startDate && !data.endDate) || (!data.startDate && data.endDate)) {
        return false;
      }
      return true;
    },
    {
      message: 'Both startDate and endDate must be provided for a custom date range',
      path: ['startDate'],
    },
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: 'startDate must be less than or equal to endDate',
      path: ['endDate'],
    },
  );

export type GetAdminDashboardOverviewInput = z.infer<typeof getAdminDashboardOverviewSchema>;

export const getAdminDashboardAlertsSchema = z.object({
  severity: z.enum(['info', 'warning', 'danger']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type GetAdminDashboardAlertsInput = z.infer<typeof getAdminDashboardAlertsSchema>;
