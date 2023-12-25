import { schema } from './schema';
import { superValidate } from '$lib/server';
import { fail } from '@sveltejs/kit';

const defaultData = {
  tags: [
    { id: 1, name: 'A' },
    { id: 2, name: 'Bb' },
    { id: 3, name: 'Cc' },
    { id: 4, name: 'Dd' }
  ]
};

export const load = async () => {
  const form = await superValidate(defaultData, schema, {
    errors: false,
    id: 'zod'
  });
  const form2 = await superValidate(defaultData, schema, {
    errors: false,
    id: 'superforms'
  });

  return { form, form2 };
};

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const form = await superValidate(formData, schema);
    form.id = formData.get('id')?.toString();

    console.log('POST', form);

    if (!form.valid) return fail(400, { form });
    form.message = 'It works';

    return { form };
  }
};
