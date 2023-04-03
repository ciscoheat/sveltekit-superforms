import type { Actions, PageServerLoad } from './$types';
import { superValidate } from '$lib/server';
import type { z } from 'zod';
import { schema } from './schemas';

export const load = (async (event) => {
  const form = await superValidate(event, schema);
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async ({ request }) => {
    //console.log('--- POST -------------------------------------------');
    const data = await request.formData();
    //console.log(data);
    const form = await superValidate(data, schema);
    console.log('POST', form);

    return { form };
  }
} satisfies Actions;
