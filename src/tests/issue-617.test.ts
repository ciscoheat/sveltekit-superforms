import { describe, it, expect } from 'vitest';
import { z } from 'zod/v4';
import { zod, zodToJSONSchema } from '$lib/adapters/zod4.js';
import { superValidate } from '$lib/server/index.js';

describe('issue-617: z.set() and z.map() with default values', () => {
	describe('JSON Schema generation', () => {
		it('should generate correct schema for z.set() with empty default', () => {
			const schema = z.object({
				set: z.set(z.number()).default(new Set())
			});

			const jsonSchema = zodToJSONSchema(schema);
			expect(jsonSchema.properties?.set).toMatchObject({
				type: 'array',
				uniqueItems: true,
				default: []
			});
		});

		it('should generate correct schema for z.set() with pre-filled default', () => {
			const schema = z.object({
				set: z.set(z.number()).default(new Set([1, 2, 3]))
			});

			const jsonSchema = zodToJSONSchema(schema);
			expect(jsonSchema.properties?.set).toMatchObject({
				type: 'array',
				uniqueItems: true,
				default: [1, 2, 3]
			});
		});

		it('should generate correct schema for z.map() with empty default', () => {
			const schema = z.object({
				map: z.map(z.string(), z.number()).default(new Map())
			});

			const jsonSchema = zodToJSONSchema(schema);
			expect(jsonSchema.properties?.map).toMatchObject({
				type: 'array',
				default: []
			});
		});

		it('should generate correct schema for z.map() with pre-filled default', () => {
			const schema = z.object({
				map: z.map(z.string(), z.number()).default(
					new Map([
						['a', 1],
						['b', 2]
					])
				)
			});

			const jsonSchema = zodToJSONSchema(schema);
			expect(jsonSchema.properties?.map).toMatchObject({
				type: 'array',
				default: [
					['a', 1],
					['b', 2]
				]
			});
		});
	});

	it('should handle z.set() with empty default', async () => {
		const schema = z.object({
			set: z.set(z.number()).default(new Set())
		});

		const form = await superValidate(zod(schema));
		expect(form.data.set).toBeInstanceOf(Set);
		expect(form.data.set.size).toBe(0);
	});

	it('should handle z.set() with pre-filled default values', async () => {
		const schema = z.object({
			set: z.set(z.number()).default(new Set([1, 2, 3]))
		});

		const jsonSchema = zodToJSONSchema(schema);
		expect(jsonSchema.properties?.set).toMatchObject({
			type: 'array',
			uniqueItems: true,
			default: [1, 2, 3]
		});

		const form = await superValidate(zod(schema));
		expect(form.data.set).toBeInstanceOf(Set);
		expect(form.data.set.size).toBe(3);
		expect(form.data.set.has(1)).toBe(true);
		expect(form.data.set.has(2)).toBe(true);
		expect(form.data.set.has(3)).toBe(true);
	});

	it('should handle z.map() with empty default', async () => {
		const schema = z.object({
			map: z.map(z.string(), z.number()).default(new Map())
		});

		const jsonSchema = zodToJSONSchema(schema);
		expect(jsonSchema.properties?.map).toMatchObject({
			type: 'array',
			default: []
		});

		const form = await superValidate(zod(schema));
		expect(form.data.map).toBeInstanceOf(Map);
		expect(form.data.map.size).toBe(0);
	});

	it('should handle z.map() with pre-filled default values', async () => {
		const schema = z.object({
			map: z.map(z.string(), z.number()).default(
				new Map([
					['a', 1],
					['b', 2]
				])
			)
		});

		const jsonSchema = zodToJSONSchema(schema);
		expect(jsonSchema.properties?.map).toMatchObject({
			type: 'array',
			default: [
				['a', 1],
				['b', 2]
			]
		});

		const form = await superValidate(zod(schema));
		expect(form.data.map).toBeInstanceOf(Map);
		expect(form.data.map.size).toBe(2);
		expect(form.data.map.get('a')).toBe(1);
		expect(form.data.map.get('b')).toBe(2);
	});

	it('should allow Set operations on default values', async () => {
		const schema = z.object({
			tags: z.set(z.string()).default(new Set(['typescript', 'svelte']))
		});

		const form = await superValidate(zod(schema));

		// This should not throw - the regression would cause this to fail
		expect(() => form.data.tags.has('typescript')).not.toThrow();
		expect(form.data.tags.has('typescript')).toBe(true);
		expect(form.data.tags.has('svelte')).toBe(true);
		expect(form.data.tags.has('react')).toBe(false);
	});
});
