import { Schema } from './schemas.js';
import { superValidate } from '$lib/index.js';
import { valibot } from '$lib/adapters/valibot.js';

export const load = async () => {
	const initialData = {
		date: new Date()
	};

	const form = await superValidate(initialData, valibot(Schema));

	return {
		form
	};
};
