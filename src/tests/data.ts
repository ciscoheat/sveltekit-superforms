import { z } from 'zod';
import { zodToJSONSchema } from '$lib/adapters/zod.js';

export enum Foo {
	A = 2,
	B = 3
}

export const bigZodSchema = z.object({
	name: z.union([z.string().default('B'), z.number()]).default('A'),
	email: z.string().email(),
	tags: z.string().min(2).array().min(2).default(['A']),
	foo: z.nativeEnum(Foo).default(Foo.A),
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
	})
});

export const bigJsonSchema = zodToJSONSchema(bigZodSchema);

///// From legacy tests /////

enum Fruits {
	Apple,
	Banana
}

enum FruitsStr {
	Apple = 'Apple',
	Banana = 'Banana'
}

export const dataTypeForm = z.object({
	string: z.string().min(2).default('Shigeru'),
	email: z.string().email(),
	bool: z.boolean(),
	agree: z.literal(true).default(true),
	number: z.number(),
	proxyNumber: z.number().min(10).default(0),
	nullableString: z
		.string()
		.refine(() => true)
		.nullable(),
	nullishString: z.string().nullish(),
	optionalString: z.string().optional(),
	proxyString: z.string(),
	trimmedString: z.string().trim(),
	numberArray: z.number().int().default(NaN).array().min(3),
	date: z.date().optional().default(new Date()),
	coercedNumber: z.coerce.number().default(0).optional(),
	coercedDate: z.coerce.date().optional(),
	nativeEnumInt: z.nativeEnum(Fruits).default(Fruits.Apple),
	nativeEnumString: z.nativeEnum({ GRAY: 'GRAY', GREEN: 'GREEN' }).default('GREEN'),
	nativeEnumString2: z.nativeEnum(FruitsStr).default(FruitsStr.Banana),
	zodEnum: z.enum(['a', 'b', 'c']).default('a')
});
