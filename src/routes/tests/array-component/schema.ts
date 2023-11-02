import { z } from 'zod';

export const schema = z.object({
  tags: z.string().min(1).array().min(1),
  tags2: z
    .object({
      id: z.number().int(),
      name: z.string().min(1)
    })
    .array()
    .min(1)
});
