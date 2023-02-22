import { actionResult, superValidate } from '$lib/server';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(5)
});

export const POST = (async (event) => {
  const form = await superValidate(event, loginSchema);

  if (!form.validated) return actionResult('failure', { form });
  else return actionResult('success', { form });
}) satisfies RequestHandler;
