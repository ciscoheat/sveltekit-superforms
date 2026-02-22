import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z as z3 } from 'zod/v3';
import { z as z4 } from 'zod/v4';
import { zod } from '$lib/adapters/zod.js';
import { zod as zod4 } from '$lib/adapters/zod4.js';

describe('Zod version mismatch detection', () => {
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	it('should warn when Zod v4 schema is passed to v3 adapter', () => {
		const schema = z4.object({ name: z4.string() });

		// This should trigger a warning before throwing an error
		// The error is expected since v4 schema can't be properly processed by v3 adapter
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			zod(schema as any);
		} catch {
			// Expected to throw - the important thing is the warning was emitted first
		}

		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Zod v4 schema detected'));
	});

	it('should not warn when Zod v3 schema is passed to v3 adapter', () => {
		const schema = z3.object({ name: z3.string() });

		zod(schema);

		expect(warnSpy).not.toHaveBeenCalled();
	});

	it('should not warn when Zod v4 schema is passed to v4 adapter', () => {
		const schema = z4.object({ name: z4.string() });

		zod4(schema);

		expect(warnSpy).not.toHaveBeenCalled();
	});
});
