import { zod } from '$lib/adapters/zod.js';
import type { SuperForm, TaintOptions } from '$lib/client/index.js';
import { superForm, superValidate, type SuperValidated } from '$lib/index.js';
import { get } from 'svelte/store';
import merge from 'ts-deepmerge';
import { describe, it, expect, assert, beforeEach, vi } from 'vitest';
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

		checkTaint({ name: 'Test' }, { name: true });
		expect(get(form.form).name).toEqual('Test');

		checkTaint(
			{ tags: ['A'] },
			{
				name: true,
				tags: {
					'0': true
				}
			}
		);
	});

	it("Should not set tainted to undefined if field doesn't exist", () => {
		expect(get(tainted)).toBeUndefined();

		checkTaint({ name: 'Test' }, { name: true });
		expect(get(form.form).name).toEqual('Test');

		checkTaint(
			{ tags: ['A'] },
			{
				name: true
			},
			false
		);
	});
});

///// Mocking ///////////////////////////////////////////////////////

vi.mock('svelte', async (original) => {
	const module = (await original()) as Record<string, unknown>;
	return {
		...module,
		onDestroy: vi.fn()
	};
});

vi.mock('$app/stores', async () => {
	const { readable, writable } = await import('svelte/store');
	/**
	 * @type {import('$app/stores').getStores}
	 */
	const getStores = () => ({
		navigating: readable(null),
		page: readable({ url: new URL('http://localhost'), params: {} }),
		session: writable(null),
		updated: readable(false)
	});
	/** @type {typeof import('$app/stores').page} */
	const page = {
		subscribe(fn) {
			return getStores().page.subscribe(fn);
		}
	};
	/** @type {typeof import('$app/stores').navigating} */
	const navigating = {
		subscribe(fn) {
			return getStores().navigating.subscribe(fn);
		}
	};
	/** @type {typeof import('$app/stores').session} */
	const session = {
		subscribe(fn) {
			return getStores().session.subscribe(fn);
		}
	};
	/** @type {typeof import('$app/stores').updated} */
	const updated = {
		subscribe(fn) {
			return getStores().updated.subscribe(fn);
		}
	};
	return {
		getStores,
		navigating,
		page,
		session,
		updated
	};
});
