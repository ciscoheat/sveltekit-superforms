import { Schema } from 'effect';

export const GalaxySchema = Schema.Struct({
	name: Schema.String,
	description: Schema.String,
	image: Schema.URL
});

export type Galaxy = typeof GalaxySchema.Type;

export const CreateGalaxySchema = Schema.Struct({
	...GalaxySchema.omit('image').fields,
	file: Schema.instanceOf(File).annotations({
		jsonSchema: {}
	})
});
