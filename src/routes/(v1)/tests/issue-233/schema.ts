import { z } from 'zod';

const age = z
	.any()
	.refine((val) => {
		const parsed = parseInt(val, 10);
		return parsed >= 18 && parsed <= 55;
	})
	.default('31');

const value = z
	.any()
	.refine((val) => {
		const parsed = parseInt(val, 10);
		return parsed >= 0 && parsed <= 1000000;
	})
	.default('3456');

export const schema1 = z.object({
	age,
	value
});

export const schema2 = z.object({
	age,
	value
});
