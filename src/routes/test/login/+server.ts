import { actionResult, superValidate } from '$lib/server';
import { redirect } from '@sveltejs/kit';
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

  //if (!form.valid) return actionResult('redirect', '/');
  //if (!form.valid) return actionResult('error', 'I AM ERROR');
  if (!form.valid) return actionResult('failure', { form });

  if (data.has('redirect')) {
    return actionResult('redirect', '/redirected');
    //throw redirect(303, '/redirected');
  }

  form.message = 'Login successful!';
  return actionResult('success', { form });
}) satisfies RequestHandler;
