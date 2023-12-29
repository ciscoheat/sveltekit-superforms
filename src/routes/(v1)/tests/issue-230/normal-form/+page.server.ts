import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    // Data here
    const formData = await request.formData();
    console.log(formData);

    return { success: true };
  }
};
