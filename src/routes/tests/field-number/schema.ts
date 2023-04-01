import { z } from 'zod';

export const schemaDto = z.object({
  itemType: z.number().min(1).max(4)
});
