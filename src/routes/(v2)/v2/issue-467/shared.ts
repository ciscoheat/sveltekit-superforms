import { object, string, z } from 'zod';

export const Schema1 = object({
	value1: string().min(1)
});

export type Schema1 = z.infer<typeof Schema1>;

export const Schema2 = object({
	value2: string().min(1)
});

export type Schema2 = z.infer<typeof Schema2>;
