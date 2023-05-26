import { superValidate } from '$lib/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string(),
  email: z.string().email()
});

export const load = async () => {
  const form = await superValidate(
    {
      name: 'Bob',
      email: 'test@example.com'
    },
    schema
  );
  return {
    form
  };
};
