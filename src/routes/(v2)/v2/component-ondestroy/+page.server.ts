import type { Actions, PageServerLoad } from './$types.js';

import { superValidate, message } from '$lib/index.js';
import { zod } from '$lib/adapters/zod.js';
import { fail } from '@sveltejs/kit';
import { schema } from './schema.js';

const grids = [
	{
		id: 1,
		values: [1, 2, 3]
	},
	{
		id: 2,
		values: [4, 5, 6]
	},
	{
		id: 3,
		values: [7, 8, 9]
	},
]

export const actions: Actions = {
	async default({ request }) {
		console.log('push')
		grids.push({
			id: 3,
			values: [7, 8, 9]
		})

		return {success: true}
	}
}

export const load: PageServerLoad = async () => {
	const grid_forms = await Promise.all(grids.map((grid) => superValidate(grid, zod(schema), {
		id: grid.id.toString()
	})))

	console.log(grid_forms.length)

	return { grid_forms }
};
