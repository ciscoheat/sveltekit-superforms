import { schema1, schema2 } from './schema.js';
import { superValidate } from '$lib/server';

export const load = async () => {
  const [form1, form2] = await Promise.all([
    superValidate(
      {
        age: '42',
        value: '50000'
      },
      schema1
    ),
    superValidate(schema2)
  ]);

  return { form1, form2 };
};
