import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod/v4';

// Capture the beforeNavigate callback so navigations can be simulated.
type NavCallback = (nav: unknown) => Promise<void>;
let beforeNavigateCallback: NavCallback | null = null;

const goto = vi.fn(async (url: URL) => {
	// Same check SvelteKit does in goto()
	if (url.origin !== 'http://localhost') {
		throw new Error(
			'Cannot use `goto` with an external URL. Use `window.location = "..."` instead'
		);
	}
});

vi.mock('$app/navigation', () => ({
	beforeNavigate: (fn: NavCallback) => {
		beforeNavigateCallback = fn;
	},
	afterNavigate: vi.fn(),
	goto: (url: URL) => goto(url),
	invalidateAll: vi.fn()
}));

vi.mock('esm-env', async (original) => ({
	...((await original()) as Record<string, unknown>),
	BROWSER: true
}));

vi.mock('svelte', async (original) => {
	const module = (await original()) as Record<string, unknown>;
	return {
		...module,
		onDestroy: vi.fn()
	};
});

vi.mock('$app/state', async () => ({
	page: {
		url: new URL('http://localhost'),
		params: {},
		status: 200,
		error: null,
		data: {},
		form: null,
		state: {},
		route: { id: null }
	},
	navigating: {
		from: null,
		to: null,
		type: null,
		willUnload: null,
		delta: null,
		complete: null
	},
	updated: { current: false, check: async () => false }
}));

import { superForm, type FormOptions } from '#lib/client/index.js';
import { superValidate } from '#lib/superValidate.js';
import { zod } from '#lib/adapters/zod4.js';

const schema = z.object({ name: z.string() });

function navigation(url: string) {
	return {
		type: 'link',
		willUnload: new URL(url).origin !== 'http://localhost',
		from: null,
		to: { url: new URL(url) },
		cancel: vi.fn()
	};
}

describe('Issue #683 - taintedMessage with external links', () => {
	let location: { href: string };

	beforeEach(() => {
		beforeNavigateCallback = null;
		goto.mockClear();
		location = { href: 'http://localhost/' };
		vi.stubGlobal('window', {
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			confirm: vi.fn(() => true),
			location
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	async function taintedForm(taintedMessage: FormOptions['taintedMessage']) {
		const form = superForm(await superValidate(zod(schema)), { taintedMessage });
		// The tainted check is only switched on once use:enhance has run
		form.options.taintedMessage = taintedMessage;
		form.form.update(($form) => ({ ...$form, name: 'changed' }), { taint: true });
		expect(form.isTainted()).toBe(true);
		expect(beforeNavigateCallback).not.toBeNull();
		return form;
	}

	it('does not call goto when the user confirms leaving to an external url', async () => {
		await taintedForm('You will lose your changes');
		const nav = navigation('https://www.github.com/');

		await expect(beforeNavigateCallback!(nav)).resolves.toBeUndefined();
		expect(goto).not.toHaveBeenCalled();
		expect(nav.cancel).not.toHaveBeenCalled();
	});

	it('redirects with window.location for an external url after a custom tainted function', async () => {
		await taintedForm(() => Promise.resolve(true));
		const nav = navigation('https://www.github.com/');

		await expect(beforeNavigateCallback!(nav)).resolves.toBeUndefined();
		expect(nav.cancel).toHaveBeenCalled();
		expect(goto).not.toHaveBeenCalled();
		expect(location.href).toBe('https://www.github.com/');
	});

	it('still uses goto for internal urls after a custom tainted function', async () => {
		await taintedForm(() => Promise.resolve(true));
		const nav = navigation('http://localhost/other');

		await beforeNavigateCallback!(nav);
		expect(nav.cancel).toHaveBeenCalled();
		expect(goto).toHaveBeenCalledWith(new URL('http://localhost/other'));
	});

	it('cancels navigation when the user declines', async () => {
		await taintedForm(true);
		(window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
		const nav = navigation('https://www.github.com/');

		await beforeNavigateCallback!(nav);
		expect(nav.cancel).toHaveBeenCalled();
		expect(goto).not.toHaveBeenCalled();
	});
});
