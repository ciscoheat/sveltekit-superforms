import { zod } from '$lib/adapters/zod.js';
import { message, superValidate } from '$lib/server/index.js';
import { type Actions, fail } from '@sveltejs/kit';
import { schema } from './schema.js';

const items = [
	{
		id: 1,
		label: 'One'
	},
	{
		id: 2,
		label: 'Two'
	},
	{
		id: 3,
		label: 'Three'
	}
];

export const load = async () => {
	const item_forms = await Promise.all(
		items.map((item) =>
			superValidate(item, zod(schema), {
				id: item.id.toString()
			})
		)
	);

	return { item_forms };
};

export const actions: Actions = {
	async create() {
		items.push({
			id: items.length + 1,
			label: (items.length + 1).toString()
		});

		return { success: true };
	},

	async save({ request }) {
		const form = await superValidate(request, zod(schema));

		if (!form.valid) {
			// Again, return { form } and things will just work.
			return fail(400, { form });
		}

		const index = items.findIndex((item) => item.id === form.data.id);
		if(index !== -1) {
			items[index].label = form.data.label;
		}

		return message(form, `Item ${form.data.id} updated`);
	}
};
