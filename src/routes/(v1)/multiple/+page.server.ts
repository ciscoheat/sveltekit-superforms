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

    const posted = await superValidate<typeof userSchema, Message>(
      data,
      userSchema
    );

    console.log('FORM ', posted);
    if (!posted.valid) return fail(400, { form: posted });

    posted.message = { message: 'Post OK' };

    const other = structuredClone(posted);

    // A bit complicated, but the test needs to check what
    // happens when multiple id's are posted.
    if (posted.id == 'second') {
      posted.data.name = '2:nd ' + posted.data.name;
      other.id = (await superValidate(null, userSchema)).id;
    } else {
      other.data.name = '2:nd ' + other.data.name;
      other.id = 'second';
    }

    return { posted, other };
  }
} satisfies Actions;
