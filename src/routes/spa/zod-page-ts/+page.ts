import { schema } from './schema';
import { superValidate } from '$lib/client';

const defaultData = {
  tags: [
    { id: 1, name: 'A' },
    { id: 2, name: 'Bb' },
    { id: 3, name: 'Cc' },
    { id: 4, name: 'Dd' }
  ],
  redirect: false
};

export const load = async (event) => {
  console.log('SPA load');
  const form = await superValidate(defaultData, schema, { errors: false });
  form.data.random = String(Math.random());
  //const form = null;
  return {
    form,
    useZod: event.url.searchParams.has('zod'),
    randomString: form.data.random
  };
};
