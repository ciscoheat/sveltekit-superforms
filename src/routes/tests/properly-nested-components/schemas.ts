import { z } from 'zod';

export const schema = z.object({
  name: z.string().min(1),
  birth: z.date(),
  luckyNumber: z.number(),
  tags: z
    .object({
      name: z.string().min(2)
    })
    .array()
    .min(1)
});

export type Schema = typeof schema;
