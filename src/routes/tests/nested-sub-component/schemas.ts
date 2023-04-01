import { z } from 'zod';

export const addressDto = z.object({
  id: z.string().uuid(),
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(256, { message: 'Name must be 256 characters or less' }),
  address1: z
    .string({ required_error: 'Address 1 is required' })
    .min(2, { message: 'Address 1 must be at least 2 characters' })
    .max(256, { message: 'Address 1 must be 256 characters or less' }),
  address2: z
    .string()
    .max(256, { message: 'Address 2 must be 256 characters or less' })
    .optional()
    .or(z.literal(''))
});

export const exampleDto = z.object({
  id: z.string().uuid(),
  confirm: z.boolean(),
  addresses: z.array(addressDto)
});
