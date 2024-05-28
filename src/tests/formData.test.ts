import { describe, it, expect, assert } from 'vitest';
import { parseFormData } from '$lib/formData.js';
import { z } from 'zod';
import * as v from 'valibot';
import { zodToJSONSchema } from '$lib/adapters/zod.js';
import { SchemaError } from '$lib/index.js';
import { valibot } from '$lib/adapters/valibot.js';

enum Foo {
	A = 2,
	B = 3
}

const schema = z.object({
	name: z.string(),
	email: z.string().email(),
	tags: z.string().min(2).array().min(2).default(['A']),
	foo: z.nativeEnum(Foo),
	set: z.set(z.string()),
	reg1: z.string().regex(/\D/).regex(/p/),
	reg: z.string().regex(/X/).min(3).max(30),
	num: z.number().int().multipleOf(5).min(10).max(100),
	date: z.date().min(new Date('2022-01-01')),
	arr: z.string().min(10).array().min(3).max(10),
	extra: z.string().nullable()
});

const bigJsonSchema = zodToJSONSchema(schema);

function dataToFormData(data: Record<string, string | number | string[] | number[]>) {
	const output = new FormData();
	for (const [key, value] of Object.entries(data)) {
		if (Array.isArray(value)) value.forEach((v) => output.append(key, String(v)));
		else output.set(key, String(value));
	}
	return output;
}

describe('FormData parsing', () => {
	const data = {
		name: 'Test',
		email: 'test@example.com',
		tags: ['a', 'b'],
		foo: Foo.B,
		set: ['a', 'b', 'c', 'a'],
		reg1: 'phew!',
		reg: 'MAX',
		num: 75,
		date: '2023-12-02'
	};

	it('Should map primitive types to default values', () => {
		const formData = dataToFormData(data);
		const parsed = parseFormData(formData, bigJsonSchema);

		assert(parsed.data);
		assert(parsed.data.date instanceof Date);
		// Just parse, no coercion
		assert(!('extra' in parsed.data));

		expect(parsed.posted).toEqual(true);
		expect(parsed.data.date.toISOString().substring(0, 10)).toBe('2023-12-02');
		expect({ ...parsed.data, date: undefined }).toEqual({ ...data, date: undefined });
	});

	it('should throw an error if literals are different from the other types', () => {
		const schema = v.object({
			urltest: v.union([v.literal(123), v.pipe(v.string(), v.startsWith('https://'))])
		});

		expect(() => valibot(schema)).toThrowError(SchemaError);
	});

	it('should treat literals as their typeof type', () => {
		const schema = v.object({
			urltest: v.union([v.literal(''), v.pipe(v.string(), v.startsWith('https://'))])
		});

		expect(valibot(schema).defaults.urltest).toBe('');
	});
});
