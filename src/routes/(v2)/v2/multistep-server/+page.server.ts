import { superValidate, message, defaultValues, type Infer } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { schemaStep1, schemaStep2 } from './schema.js';
import type { Actions } from './$types.js';

// Strongly typed status message
type Message = { step: number; text?: string };

const steps = [zod(schemaStep1), zod(schemaStep2)] as const;

export const load = async () => {
	const form = await superValidate<Infer<typeof schemaStep2>, Message>(steps[1]);
	return { form };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		// Get the step value from formData, as it's not included in the schema
		const step = parseInt(formData.get('step')?.toString() ?? '') || 1;

		const form = await superValidate(formData, steps[step - 1]);
		console.log(form);

		if (!form.valid) return message(form, { step });

		if (step < steps.length) {
			// Next step
			return message(form, { step: step + 1 });
		}

		// TODO: Do something with the validated form.data

		// Reset the form by hand, as resetForm is false on the client
		form.data = defaultValues(steps[0]);
		return message(form, { text: 'Form posted successfully!', step: 1 });
	}
} satisfies Actions;
