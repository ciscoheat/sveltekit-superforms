import { type } from 'arktype';

export const schema = type({
	name: 'string>=2',
	email: 'string.email'
});
