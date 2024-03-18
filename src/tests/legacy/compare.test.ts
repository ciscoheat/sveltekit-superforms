/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { assert, describe, expect, expectTypeOf, test } from 'vitest';
import { z } from 'zod';
import { pathExists } from '$lib/traversal.js';
import { get, writable } from 'svelte/store';
import { superValidate } from '$lib/superValidate.js';
import { comparePaths, setPaths } from '$lib/traversal.js';
import { zod } from '$lib/adapters/zod.js';
import { fieldProxy } from '$lib/client/index.js';

const user = z.object({
	id: z.number().int().positive(),
	name: z.string().min(2),
	email: z.string().email().nullable(),
	tags: z
		.object({ name: z.string().min(1) })
		.array()
		.optional()
});

export const social = z.object({
	user,
	friends: user.array()
});

describe('Path traversals', () => {
	test('fieldProxy traverse', async () => {
		const schema = z.object({
			id: z.number().int().positive(),
			name: z.string().min(2),
			email: z.string().email().nullable(),
			tags: z
				.object({ name: z.string().min(1) })
				.nullable()
				.array()
				.optional()
		});

		const person: z.infer<typeof schema> = {
			id: 123,
			name: 'Test',
			email: 'test@example.com',
			tags: [{ name: 'tag1' }, { name: 'tag2' }]
		};

		const form = await superValidate(person, zod(schema));

		expectTypeOf(form.data).toMatchTypeOf(person);
		expectTypeOf(form.errors).toMatchTypeOf({});
		assert(form.valid);

		const store = writable(form.data);

		const proxy1 = fieldProxy(store, 'tags');
		const proxy2 = fieldProxy(store, 'tags[0]');
		const proxy3 = fieldProxy(store, 'tags[1].name');

		proxy3.set('tag2-proxy3');
		expect(get(store).tags?.[1]?.name).toEqual('tag2-proxy3');

		proxy2.set({ name: 'tag1-proxy2' });
		expect(get(store).tags?.[0]?.name).toEqual('tag1-proxy2');

		const tags = get(store).tags!;

		proxy1.set([tags[1], tags[0]]);

		expect(get(store)).toStrictEqual({
			id: 123,
			name: 'Test',
			email: 'test@example.com',
			tags: [{ name: 'tag2-proxy3' }, { name: 'tag1-proxy2' }]
		});

		const idProxy = fieldProxy(store, 'id');

		idProxy.update((id) => id + 1);

		expect(get(store).id).toEqual(124);
	});
});

describe('Path comparisons', () => {
	test('Basic path comparison', () => {
		const obj1 = {
			name: 'Obj1',
			tags: [{ name: 'tag1' }, { name: 'tag2' }],
			deep: {
				test: true
			}
		};

		const obj2 = {
			name: 'Obj2',
			tags: [{ name: 'tag1' }, { name: 'tag4' }]
		};

		expect(comparePaths(obj1, obj2)).toStrictEqual([
			['name'],
			['tags', '1', 'name'],
			['deep', 'test']
		]);
	});

	test('Paths with empty arrays', () => {
		const obj1 = {
			flavours: [],
			scoops: 1
		};

		const obj2 = {
			flavours: [],
			scoops: 1
		};

		expect(comparePaths(obj1, obj2)).toStrictEqual([]);
	});

	test('Paths with arrays', () => {
		const obj1 = {
			flavours: [],
			scoops: 1
		};

		const obj2 = {
			flavours: ['Mint choc chip'],
			scoops: 1
		};

		expect(comparePaths(obj1, obj2)).toStrictEqual([['flavours', '0']]);
	});

	test('Paths with different array values', () => {
		/* 
      Array comparisons can unfortunately break the illusion that the form
      fields themselves are tainted.
      If you click on a checkbox to add an item, the array comparison will
      taint more than one field.
    */

		const obj1 = {
			flavours: ['Mint choc chip'],
			scoops: 1
		};

		const obj2 = {
			flavours: ['Cookies and cream', 'Mint choc chip'],
			scoops: 1
		};

		expect(comparePaths(obj1, obj2)).toStrictEqual([
			['flavours', '0'],
			['flavours', '1']
		]);
	});

	test('Paths with empty arrays', () => {
		const obj1 = { flavours: [] };
		const obj2 = { flavours: [] };

		expect(comparePaths(obj1, obj2)).toStrictEqual([]);
	});

	test('Paths with empty objects', () => {
		const obj1 = {};
		const obj2 = {};

		expect(comparePaths(obj1, obj2)).toStrictEqual([]);
	});

	test('Paths with built-in objects', () => {
		const obj1 = {
			images: [new File(['123456'], 'test.txt')]
		};

		const obj2 = {
			images: []
		};

		expect(comparePaths(obj1, obj2)).toStrictEqual([['images', '0']]);
		expect(comparePaths(obj2, obj1)).toStrictEqual([['images', '0']]);
	});
});

test('Set paths', () => {
	const obj1 = {
		tags: {
			'3': true
		},
		deep: {
			test: true
		}
	};

	setPaths(obj1, [['name'], ['tags', '1']], () => true);

	expect(obj1).toStrictEqual({
		tags: { '1': true, '3': true },
		deep: { test: true },
		name: true
	});
});

test('Check path existence', () => {
	const errors = {
		tags: {
			'0': {
				id: true
			}
		}
	};

	expect(pathExists({}, ['tags', '0', 'id'])).toBeUndefined();

	expect(pathExists(errors, ['tags', '0', 'id'])).toMatchObject({
		parent: errors.tags[0],
		key: 'id',
		value: true,
		isLeaf: true,
		path: ['tags', '0', 'id']
	});
});

test('Check path existence with path longer than existing', () => {
	const data = {
		persons: ['Need at least 2 persons']
	};

	expect(pathExists(data, ['persons', '0', 'name'])).toBeUndefined();
});

test('Schema with array containing objects', async () => {
	const postSchema = z.object({
		questions: z
			.object({
				text: z.string(),
				generated: z.boolean()
			})
			.array()
			.min(1, {
				message: 'Must have at least one question'
			})
	});

	const form = await superValidate(zod(postSchema));
	expect(form.data).toStrictEqual({ questions: [] });
});
