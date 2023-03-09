import { actionResult, superValidate } from '$lib/server';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Please enter an e-mail address.' })
    .email(),
  password: z.string().min(5)
});

export const POST = (async (event) => {
  const data = await event.request.formData();
  console.log('POST /test/login', data);
  const form = await superValidate(data, loginSchema, {
    id: 'login-form'
  });
  console.log('FORM', form);

  if (!form.valid) return actionResult('failure', { form });

  form.message = 'Login successful!';
  return actionResult('success', { form });
}) satisfies RequestHandler;
