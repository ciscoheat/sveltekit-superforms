import { setError, superValidate } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { Schema1, Schema2 } from './shared.js';

export async function load({ url }) {
	const triggerError = url.searchParams.has('error');
	const form1 = await superValidate(zod(Schema1));
	const form2 = await superValidate(zod(Schema2));

	console.log('=====', url.toString());

	console.log('🚀 ~ load ~ triggerError:', triggerError);

	if (triggerError) {
		setError(form1, 'value1', 'bad value1');
	}

	console.log('🚀 ~ load ~ form1:', form1);

	return { form1, form2 };
}

export const actions = {};
