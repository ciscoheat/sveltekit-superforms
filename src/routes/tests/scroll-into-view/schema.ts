import { z } from 'zod';

export const schema = z.object({
  name: z.string().min(2)
});
