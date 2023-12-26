import { zod } from '$lib/adapters/zod.js';
import type { SuperForm, TaintOptions } from '$lib/client/index.js';
import { superForm, superValidate, type SuperValidated } from '$lib/index.js';
import { get } from 'svelte/store';
import merge from 'ts-deepmerge';
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

const schema = z.object({
	name: z.string().default('Unknown'),
	email: z.string().email(),
	tags: z.string().min(2).array().min(3),
	score: z.number().int().min(0)
});

type Schema = z.infer<typeof schema>;

let validated: SuperValidated<Schema>;
let form: SuperForm<Schema>;

function updateForm(data: Partial<Schema>, taint?: TaintOptions) {
	form.form.update(
		($form) => {
			const output = merge($form, data) as Schema;
			//console.log('🚀 ~ file: superForm.test.ts:25 ~ updateForm ~ output:', output);
			return output;
		},
		{ taint }
	);
}

describe('Tainted', () => {
	let tainted: SuperForm<Schema>['tainted'];

	function checkTaint(
		data: Partial<Schema>,
		expected: Record<string, unknown>,
		taint?: TaintOptions
	) {
		updateForm(data, taint);
		expect(get(tainted)).toStrictEqual(expected);
	}

	beforeEach(async () => {
		validated = await superValidate(zod(schema));
		form = superForm(validated);
		tainted = form.tainted;
	});

	it('Should update tainted properly', () => {
		expect(get(tainted)).toBeUndefined();
		expect(form.isTainted()).toBe(false);

		checkTaint({ name: 'Test' }, { name: true });

		expect(get(form.form).name).toEqual('Test');
		expect(form.isTainted()).toBe(true);
		expect(form.isTainted('name')).toBe(true);
		expect(form.isTainted('tags')).toBe(false);

		checkTaint(
			{ tags: ['A'] },
			{
				name: true,
				tags: {
					'0': true
				}
			}
		);

		expect(form.isTainted('tags')).toBe(true);
		expect(form.isTainted('tags[0]')).toBe(true);
	});

	describe('When not tainting', () => {
		it("Should not set field to undefined if field isn't tainted", () => {
			expect(get(tainted)).toBeUndefined();

			checkTaint({ name: 'Test' }, { name: true });
			checkTaint(
				{ tags: ['A'] },
				{
					name: true
				},
				false
			);
		});
	});

	describe('Untainting', () => {
		it('Should set untainted field to undefined if field is tainted already', () => {
			expect(get(tainted)).toBeUndefined();

			checkTaint({ name: 'Test' }, { name: true });
			checkTaint(
				{ name: 'Test 2' },
				{
					name: true
				},
				false
			);
			checkTaint(
				{ name: 'Test 3' },
				{
					name: undefined
				},
				'untaint'
			);
		});

		it('should set the tainted field to undefined if it gets the same value as its original state', () => {
			expect(get(tainted)).toBeUndefined();

			checkTaint({ name: 'Test' }, { name: true });
			expect(form.isTainted('name')).toBe(true);
			checkTaint({ name: 'Unknown' }, { name: undefined });
			expect(form.isTainted('name')).toBe(false);
		});
	});
});

///// mockSvelte.ts /////

import { vi } from 'vitest';

vi.mock('svelte', async (original) => {
	const module = (await original()) as Record<string, unknown>;
	return {
		...module,
		onDestroy: vi.fn()
	};
});

vi.mock('$app/stores', async () => {
	const { readable, writable } = await import('svelte/store');

	const getStores = () => ({
		navigating: readable(null),
		page: readable({ url: new URL('http://localhost'), params: {} }),
		session: writable(null),
		updated: readable(false)
	});

	const page: typeof import('$app/stores').page = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		subscribe(fn: any) {
			return getStores().page.subscribe(fn);
		}
	};

	const navigating: typeof import('$app/stores').navigating = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		subscribe(fn: any) {
			return getStores().navigating.subscribe(fn);
		}
	};

	return {
		getStores,
		navigating,
		page
	};
});
