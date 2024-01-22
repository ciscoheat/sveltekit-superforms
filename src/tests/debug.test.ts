//import { bigZodSchema, dataTypeForm } from './data.js';
import { z } from 'zod';
import { test } from 'vitest';
import { defaultValues } from '$lib/jsonSchema/schemaDefaults.js';
import { zod, zodToJsonSchema } from '$lib/adapters/zod.js';
import type { JSONSchema } from '$lib/jsonSchema/index.js';
import {
	object,
	string,
	email,
	minLength,
	array,
	integer,
	number,
	minValue,
	date,
	optional,
	regex,
	nullable
} from 'valibot';
import { valibot } from '$lib/adapters/valibot.js';

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

/*
const schema2 = z.object({
	len: z.string().transform((val) => val.length)
});
*/

const valiSchema = object({
	name: nullable(string(), 'A'),
	email: string([email()]),
	tags: array(string([minLength(2)]), [minLength(3)]),
	score: number([integer(), minValue(0)]),
	date: optional(date()),
	nospace: optional(string([regex(/^\S*$/)]))
});

test.skip('Valibot to JSON Schema', () => {
	console.dir(valibot(valiSchema).jsonSchema, { depth: 10 });
});

test.skip('Zod to JSON Schema', () => {
	console.dir(zod(schema).jsonSchema, { depth: 10 });
});

test.skip('defaultValues', () => {
	const values = defaultValues<z.infer<typeof schema>>(zodToJsonSchema(schema) as JSONSchema);
	console.dir(values, { depth: 10 });
});
