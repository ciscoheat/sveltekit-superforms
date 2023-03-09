import { actionResult, superValidate } from '$lib/server';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(5)
});

export const POST = (async (event) => {
  const form = await superValidate(event, loginSchema, {
    id: 'login-form'
  });
  console.log('POST /test/login', form);

  if (!form.valid) return actionResult('failure', { form });

  form.message = 'Login successful!';
  return actionResult('success', { form });
}) satisfies RequestHandler;
