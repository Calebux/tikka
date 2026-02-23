import { z } from 'zod';

/** Query params for GET /users/:address/history */
export const UserHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type UserHistoryQueryDto = z.infer<typeof UserHistoryQuerySchema>;
