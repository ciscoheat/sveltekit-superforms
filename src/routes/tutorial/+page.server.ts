import { setError, superValidate } from '$lib/server';
import { z } from 'zod';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// See https://zod.dev/?id=primitives for schema syntax
const schema = z.object({
  id: z.number().int().optional(),
  name: z.string().default('Hello world!'),
  email: z.string().email()
});

const users = [
  {
    name: 'Important Customer',
    email: 'rich@famous.com'
  }
];

export const load = (async () => {
  const form = await superValidate(users[0], schema);
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const form = await superValidate(event, schema);
    console.log('POST', form);

    if (!form.success) {
      return fail(400, { form });
    }

    const user = users.find((u) => u.name == form.data.name);

    if (!user) return setError(form, 'name', 'User not found');
    else user.email = form.data.email;

    return { form };
  }
} satisfies Actions;
