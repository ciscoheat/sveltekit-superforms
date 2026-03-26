import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get, writable } from 'svelte/store';

// Capture the afterNavigate callback so we can trigger it manually.
let afterNavigateCallback: (() => void) | null = null;

vi.mock('$app/navigation', () => ({
	afterNavigate: (fn: () => void) => {
		afterNavigateCallback = fn;
	}
}));

vi.mock('svelte', async (original) => {
	const module = (await original()) as Record<string, unknown>;
	return {
		...module,
		onDestroy: vi.fn()
	};
});

import { Form } from '$lib/client/form.js';
import type { FormOptions } from '$lib/client/superForm.js';

function createMockFormElement() {
	return {
		querySelectorAll: vi.fn(() => []),
		querySelector: vi.fn(() => null),
		noValidate: false
	} as unknown as HTMLFormElement;
}

function createTimers() {
	return {
		submitting: writable(false),
		delayed: writable(false),
		timeout: writable(false)
	};
}

const defaultOptions = {
	delayMs: 500,
	timeoutMs: 8000,
	selectErrorText: false,
	scrollToError: 'off',
	errorSelector: '[data-invalid]',
	stickyNavbar: undefined,
	autoFocusOnError: true
} as unknown as FormOptions<Record<string, unknown>, unknown>;

describe('Issue #677 - afterNavigate should not reset timers during event processing', () => {
	let timers: ReturnType<typeof createTimers>;

	beforeEach(() => {
		afterNavigateCallback = null;
		timers = createTimers();
		vi.useFakeTimers();
		// form.ts uses window.setTimeout/clearTimeout
		vi.stubGlobal('window', {
			setTimeout: globalThis.setTimeout.bind(globalThis),
			clearTimeout: globalThis.clearTimeout.bind(globalThis)
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('should reset timers when afterNavigate fires normally', () => {
		const htmlForm = Form(createMockFormElement(), timers, defaultOptions);

		htmlForm.submitting();
		expect(get(timers.submitting)).toBe(true);

		// Simulate navigation completing (e.g. redirect from form action)
		afterNavigateCallback!();

		expect(get(timers.submitting)).toBe(false);
		expect(get(timers.delayed)).toBe(false);
		expect(get(timers.timeout)).toBe(false);
	});

	it('should NOT reset timers when processingEvents is true', () => {
		const htmlForm = Form(createMockFormElement(), timers, defaultOptions);

		htmlForm.submitting();
		expect(get(timers.submitting)).toBe(true);

		// Simulate goto() called from within an onUpdate handler
		htmlForm.setProcessingEvents(true);
		afterNavigateCallback!();

		// Timers should still be running
		expect(get(timers.submitting)).toBe(true);
	});

	it('should resume resetting timers after processingEvents is cleared', () => {
		const htmlForm = Form(createMockFormElement(), timers, defaultOptions);

		htmlForm.submitting();
		expect(get(timers.submitting)).toBe(true);

		// During event processing: afterNavigate should be suppressed
		htmlForm.setProcessingEvents(true);
		afterNavigateCallback!();
		expect(get(timers.submitting)).toBe(true);

		// After event processing: afterNavigate should work again
		htmlForm.setProcessingEvents(false);
		afterNavigateCallback!();
		expect(get(timers.submitting)).toBe(false);
	});

	it('should preserve the #622 fix: reset timers on redirect after events finish', () => {
		const htmlForm = Form(createMockFormElement(), timers, defaultOptions);

		htmlForm.submitting();

		// Event handlers run (processingEvents = true)
		htmlForm.setProcessingEvents(true);

		// Events finish, processingEvents cleared before applyAction
		htmlForm.setProcessingEvents(false);

		// Redirect navigation from applyAction triggers afterNavigate
		afterNavigateCallback!();

		// Timers should be reset (preserving #622 behavior)
		expect(get(timers.submitting)).toBe(false);
		expect(get(timers.delayed)).toBe(false);
		expect(get(timers.timeout)).toBe(false);
	});
});
