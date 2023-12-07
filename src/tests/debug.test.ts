import { defaultValues } from '$lib/jsonSchema/index.js';
import { it } from 'vitest';
import { z } from 'zod';
import type { JSONSchema7 } from 'json-schema';
import { zodToJsonSchema } from '$lib/adapters/zod.js';

enum Foo {
	A = 2,
	B = 3
}

const schema = z.object({
	name: z.union([z.string().default('B'), z.number()]).default('A'),
	email: z.string().email(),
	tags: z.string().min(2).array().min(2).default(['A']),
	foo: z.nativeEnum(Foo),
	set: z.set(z.string()),
	reg1: z.string().regex(/\D/).regex(/p/),
	reg: z.string().regex(/X/).min(3).max(30),
	num: z.number().int().multipleOf(5).min(10).max(100),
	date: z.date().min(new Date('2022-01-01')),
	arr: z
		.union([z.string().min(10), z.date()])
		.array()
		.min(3)
		.max(10),
	nestedTags: z.object({
		id: z.number().int().positive().optional(),
		name: z.string().min(1)
	}),
	literal: z.literal(true).default(false as true)
});

it.skip('Zod to JSON Schema', () => {
	console.dir(zodToJsonSchema(schema), { depth: 10 });
});

it.skip('defaultValues', () => {
	const values = defaultValues<z.infer<typeof schema>>(zodToJsonSchema(schema) as JSONSchema7);
	console.dir(values, { depth: 10 });
});
