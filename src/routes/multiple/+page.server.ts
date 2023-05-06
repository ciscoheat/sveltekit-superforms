import { superValidate } from '$lib/server';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { userSchema, users } from '../users';

type Message = { message: string };

export const load = (async ({ url }) => {
  // READ user
  const id = url.searchParams.get('id') ?? users[0].id;
  const user = users.find((u) => u.id == id);

  if (id && !user) throw error(404, 'User not found.');

  const first = await superValidate<typeof userSchema, Message>(
    user,
    userSchema
  );
  const second = structuredClone(first);
  second.data.name += ' the 2:nd';

  return { first, second };
}) satisfies PageServerLoad;

export const actions = {
  default: async (event) => {
    const data = await event.request.formData();
    if (data.get('error')) throw error(501);

    console.log('POST', data);

    const first = await superValidate<typeof userSchema, Message>(
      data,
      userSchema
    );
    first.id = undefined;

    console.log('FORM ', first);
    if (!first.valid) return fail(400, { form: first });

    first.message = { message: 'Post OK' };

    const second = structuredClone(first);
    second.id = 'second';
    second.data.name = '2:nd ' + second.data.name;

    return { first, second };
  }
} satisfies Actions;
