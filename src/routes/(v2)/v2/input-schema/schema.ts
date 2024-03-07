/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Infer, InferIn } from '$lib/index.js';
import { z } from 'zod';

export const schema = z.object({
	test: z.string().nullish().default('OK'),
	len: z
		.string()
		.transform((s) => s.length)
		.pipe(z.number().min(2))
});

type Out = Infer<typeof schema>;
type In = InferIn<typeof schema>;

type P = Out extends In ? 'yes' : 'no';

type In1 = {
	test?: string | null | undefined;
	len?: string;
	tags: {
		id?: number;
		name: string;
	};
	extra: Date;
	extra2?: bigint;
};

type Out1 = {
	test: string | null;
	len: number;
	tags: {
		id: number;
		name: Date;
	};
};
