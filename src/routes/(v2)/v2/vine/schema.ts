import Vine from '@vinejs/vine';

export const schema = Vine.object({
	name: Vine.string().minLength(2),
	email: Vine.string().email()
});
