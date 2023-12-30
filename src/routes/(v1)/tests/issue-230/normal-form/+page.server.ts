import type { Actions } from './$types.js';

export const actions: Actions = {
	default: async ({ request }) => {
		// Data here
		const formData = await request.formData();
		console.log(formData);

		return { success: true };
	}
};
