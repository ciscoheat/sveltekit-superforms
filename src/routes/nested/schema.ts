import { z } from 'zod';

export const schema = z.object({
  ids: z.object({
    id: z.number().int().min(3).array()
  })
});
