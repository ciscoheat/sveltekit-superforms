import type { Actions, PageServerLoad } from './$types';
import { superValidate } from '$lib/server';
import { schema } from './schema';
import { error } from '@sveltejs/kit';

export const load = (async () => {
  const form = await superValidate(schema);
  return { form };
}) satisfies PageServerLoad;

export const actions = {
  default: async () => {
    throw error(500);
  }
} satisfies Actions;
