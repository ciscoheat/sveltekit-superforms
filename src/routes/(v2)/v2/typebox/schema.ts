import { Type } from 'typebox';

export const schema = Type.Object({
	name: Type.String({ minLength: 2 }),
	email: Type.String({ format: 'email' })
});
