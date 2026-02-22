import { arktype } from '$lib/adapters/arktype.js';
import { valibot } from '$lib/adapters/valibot.js';
import { zodToJSONSchema } from '$lib/adapters/zod.js';
import { parseFormData } from '$lib/formData.js';
import { SchemaError } from '$lib/index.js';
import { type } from 'arktype';
import * as v from 'valibot';
import { assert, describe, expect, it } from 'vitest';
import { z } from 'zod/v3';

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

function dataToFormData(
	data: Record<string, string | number | File | string[] | number[] | File[]>
) {
	const output = new FormData();
	for (const [key, value] of Object.entries(data)) {
		if (Array.isArray(value))
			value.forEach((v) => output.append(key, v instanceof File ? v : String(v)));
		else output.set(key, value instanceof File ? value : String(value));
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

		// The set field should be a Set (which removes duplicates)
		const expectedData = { ...data, date: undefined, set: new Set(['a', 'b', 'c']) };
		expect({ ...parsed.data, date: undefined }).toEqual(expectedData);
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

	it('should handle empty arrays with simple adapters as "any"', () => {
		const uploadSchema = type({
			files: type.instanceOf(File).array()
		});

		const defaults = { defaults: { files: [] as File[] } };
		const adapter = arktype(uploadSchema, defaults);

		const formData = dataToFormData({
			files: [new File(['123123'], 'test.png')]
		});
		const parsed = parseFormData(formData, adapter.jsonSchema, { allowFiles: true });
		const file = parsed.data?.files as File[];

		expect(file[0].size).toBe(6);
		expect(file[0].name).toBe('test.png');
	});
});

describe('union handling', () => {
	describe('with Zod schemas', () => {
		it('should reject true multi-type unions during parsing', () => {
			const schema = z.object({
				value: z.union([z.string(), z.number()])
			});

			const formData = new FormData();
			formData.set('value', 'test');

			expect(() => parseFormData(formData, zodToJSONSchema(schema))).toThrowError(
				'Unions are only supported when the dataType option'
			);
		});

		it('should parse same-type literal unions correctly', () => {
			const schema = z.object({
				status: z.union([z.literal('active'), z.literal('inactive')])
			});

			const formData = new FormData();
			formData.set('status', 'active');

			const result = parseFormData(formData, zodToJSONSchema(schema));
			expect(result.data?.status).toBe('active');
			expect(result.posted).toBe(true);
		});

		it('should handle nullable unions with empty strings', () => {
			const schema = z.object({
				name: z.string().nullable()
			});

			const formData1 = new FormData();
			formData1.set('name', 'test');

			const result1 = parseFormData(formData1, zodToJSONSchema(schema));
			expect(result1.data?.name).toBe('test');

			const formData2 = new FormData();
			formData2.set('name', '');

			const result2 = parseFormData(formData2, zodToJSONSchema(schema));
			expect(result2.data?.name).toBe(null); // Empty string becomes null for nullable fields
		});
	});

	describe('with Arktype schemas', () => {
		it('should reject true multi-type unions during parsing', () => {
			const schema = type({
				value: 'string | number'
			});

			const formData = new FormData();
			formData.set('value', 'test');

			// Provide a default to make the schema valid, then test FormData parsing rejection
			const adapter = arktype(schema, { defaults: { value: 'default' } });
			expect(() => parseFormData(formData, adapter.jsonSchema)).toThrowError(
				'Unions are only supported when the dataType option'
			);
		});

		it('should parse same-type literal unions correctly', () => {
			const schema = type({
				status: '"active" | "inactive"'
			});

			const formData = new FormData();
			formData.set('status', 'active');

			const adapter = arktype(schema);
			const result = parseFormData(formData, adapter.jsonSchema);
			expect(result.data?.status).toBe('active');
			expect(result.posted).toBe(true);
		});

		it('should handle nullable unions with empty strings', () => {
			const schema = type({
				name: 'string | null'
			});

			const formData1 = new FormData();
			formData1.set('name', 'test');

			const adapter = arktype(schema);
			const result1 = parseFormData(formData1, adapter.jsonSchema);
			expect(result1.data?.name).toBe('test');

			const formData2 = new FormData();
			formData2.set('name', '');

			const result2 = parseFormData(formData2, adapter.jsonSchema);
			expect(result2.data?.name).toBe(null); // Empty string becomes null for nullable fields
		});

		it('should parse UUID schemas with multiple constraints', () => {
			const schema = type({
				id: 'string.uuid'
			});

			const formData = new FormData();
			formData.set('id', '123e4567-e89b-12d3-a456-426614174000');

			const adapter = arktype(schema);
			const result = parseFormData(formData, adapter.jsonSchema);
			expect(result.data?.id).toBe('123e4567-e89b-12d3-a456-426614174000');
			expect(result.posted).toBe(true);
		});

		it('should parse specific UUID format schemas', () => {
			const schema = type({
				id: 'string.uuid.v7'
			});

			const formData = new FormData();
			formData.set('id', '017f22e2-79b0-7cc5-98c4-dc0c0c07398f');

			const adapter = arktype(schema);
			const result = parseFormData(formData, adapter.jsonSchema);
			expect(result.data?.id).toBe('017f22e2-79b0-7cc5-98c4-dc0c0c07398f');
			expect(result.posted).toBe(true);
		});
	});
});
