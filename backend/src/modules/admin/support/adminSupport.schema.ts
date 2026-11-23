import { z } from 'zod';

export const SUPPORTED_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED'] as const;
export type SupportedTicketStatus = (typeof SUPPORTED_TICKET_STATUSES)[number];

export const SUPPORTED_TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type SupportedTicketPriority = (typeof SUPPORTED_TICKET_PRIORITIES)[number];

export const ticketStatusSchema = z.enum(SUPPORTED_TICKET_STATUSES, {
  errorMap: () => ({ message: 'Invalid ticket status. Supported statuses: OPEN, IN_PROGRESS, ESCALATED, RESOLVED' }),
});

export const ticketPrioritySchema = z.enum(SUPPORTED_TICKET_PRIORITIES, {
  errorMap: () => ({ message: 'Invalid ticket priority. Supported priorities: LOW, MEDIUM, HIGH, URGENT' }),
});

export const ticketIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Ticket ID is required'),
});

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  category: z.string().trim().min(1).max(100).optional(),
  assignedToId: z.string().trim().optional(),
  unassigned: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true' || val === '1')),
  aiEscalated: z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true' || val === '1')),
  search: z.string().trim().max(100).optional(),
});

export type ListTicketsQueryInput = z.infer<typeof listTicketsQuerySchema>;

export const updateTicketStatusSchema = z.object({
  status: ticketStatusSchema,
});

export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

export const assignTicketSchema = z.object({
  assignedToId: z.string().trim().min(1).nullable(),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const createTicketMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(10000, 'Message cannot exceed 10000 characters'),
});

export type CreateTicketMessageInput = z.infer<typeof createTicketMessageSchema>;
