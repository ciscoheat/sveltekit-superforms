import { z } from 'zod';

export const schema = z.object({
  sub: z.object({
    tags: z.string().min(1).array().min(1)
  })
});
