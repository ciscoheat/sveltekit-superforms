import { Schema } from 'effect';

const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;

export const schema = Schema.Struct({
	name: Schema.String.annotations({ default: 'Hello world!' }),
	email: Schema.String.pipe(
		Schema.filter((s) => emailRegex.test(s) || 'must be a valid email', {
			jsonSchema: {}
		})
	)
});
