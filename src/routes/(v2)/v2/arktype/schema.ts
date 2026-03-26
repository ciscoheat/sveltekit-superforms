import { type } from 'arktype';

export const schema = type({
	name: 'string>=2 = "Hello world!"',
	email: 'string.email'
});
