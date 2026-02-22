import { assert, describe, expect, it } from 'vitest';
import { valibot } from '$lib/adapters/valibot.js';
import * as v from 'valibot';
import { superValidate } from '$lib/superValidate.js';
import type { JSONSchema7 } from 'json-schema';

describe('Valibot transformations with typeMode', () => {
	it('should handle trim transformation with typeMode input', async () => {
		const trimTest = v.object({
			username: v.pipe(v.string(), v.trim())
		});

		// Test that the adapter doesn't throw with typeMode: 'input'
		const adapter = valibot(trimTest, { typeMode: 'input' });
		expect(adapter.jsonSchema).toBeDefined();
		expect(adapter.jsonSchema.type).toBe('object');
		expect(adapter.jsonSchema.properties).toBeDefined();
		const props = adapter.jsonSchema.properties as Record<string, JSONSchema7>;
		expect(props.username?.type).toBe('string');

		// Test validation works
		const form = await superValidate({ username: '  test  ' }, adapter);
		assert(form.valid);
		expect(form.data.username).toBe('test');
	});

	it('should handle transform with typeMode', async () => {
		const transformTest = v.object({
			value: v.pipe(v.string(), v.decimal(), v.transform(Number), v.number(), v.maxValue(100))
		});

		// Test with typeMode: 'input' - should convert up to the transform
		const inputAdapter = valibot(transformTest, { typeMode: 'input' });
		expect(inputAdapter.jsonSchema).toBeDefined();
		const inputProps = inputAdapter.jsonSchema.properties as Record<string, JSONSchema7>;
		expect(inputProps.value?.type).toBe('string');
		expect(inputProps.value?.pattern).toBeDefined();

		// Test with typeMode: 'output' - should convert from after the transform
		const outputAdapter = valibot(transformTest, { typeMode: 'output' });
		expect(outputAdapter.jsonSchema).toBeDefined();
		const outputProps = outputAdapter.jsonSchema.properties as Record<string, JSONSchema7>;
		expect(outputProps.value?.type).toBe('number');
		expect(outputProps.value?.maximum).toBe(100);
	});

	it('should validate data correctly with transform schema', async () => {
		const transformTest = v.object({
			value: v.pipe(v.string(), v.decimal(), v.transform(Number), v.number(), v.maxValue(100))
		});

		// Test with input mode (for form input)
		const inputAdapter = valibot(transformTest, { typeMode: 'input' });
		const form = await superValidate({ value: '50.5' }, inputAdapter);
		assert(form.valid);
		expect(form.data.value).toBe(50.5);

		// Test with invalid max value
		const form2 = await superValidate({ value: '150' }, inputAdapter);
		assert(!form2.valid);
	});

	it('should handle object with transformation field', async () => {
		const schema = v.object({
			name: v.string(),
			price: v.pipe(v.string(), v.decimal(), v.transform(Number), v.number(), v.maxValue(1000))
		});

		const adapter = valibot(schema, { typeMode: 'input' });
		const props = adapter.jsonSchema.properties as Record<string, JSONSchema7>;
		expect(props.price?.type).toBe('string');

		const form = await superValidate({ name: 'Product', price: '99.99' }, adapter);
		assert(form.valid);
		expect(form.data.price).toBe(99.99);
	});

	it('should work with errorMode ignore for unsupported schemas', async () => {
		const schema = v.object({
			file: v.file(),
			name: v.string()
		});

		// Should not throw with errorMode: 'ignore'
		const adapter = valibot(schema, { errorMode: 'ignore' });
		expect(adapter.jsonSchema).toBeDefined();
		const props = adapter.jsonSchema.properties as Record<string, JSONSchema7>;
		expect(props.name?.type).toBe('string');
	});

	it('should handle complex nested transformation', async () => {
		const schema = v.object({
			users: v.array(
				v.object({
					name: v.pipe(v.string(), v.trim()),
					age: v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(0))
				})
			)
		});

		const adapter = valibot(schema, { typeMode: 'input' });
		const props = adapter.jsonSchema.properties as Record<string, JSONSchema7>;
		expect(props.users?.type).toBe('array');

		const form = await superValidate(
			{
				users: [
					{ name: '  John  ', age: '25' },
					{ name: 'Jane', age: '30' }
				]
			},
			adapter
		);

		assert(form.valid);
		expect(form.data.users[0].name).toBe('John');
		expect(form.data.users[0].age).toBe(25);
		expect(form.data.users[1].age).toBe(30);
	});

	it('should use default typeMode when not specified', async () => {
		const schema = v.object({
			value: v.pipe(v.string(), v.decimal(), v.transform(Number), v.number())
		});

		// Without typeMode, should use default 'input' mode with errorMode 'ignore'
		const adapter = valibot(schema);
		expect(adapter.jsonSchema).toBeDefined();
		const props = adapter.jsonSchema.properties as Record<string, JSONSchema7>;
		expect(props.value?.type).toBe('string');

		// Should still validate
		const form = await superValidate({ value: '42.5' }, adapter);
		assert(form.valid);
		expect(form.data.value).toBe(42.5);
	});
});
