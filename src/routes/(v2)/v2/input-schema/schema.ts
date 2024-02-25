/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';

export const schema = z.object({
	test: z.string().nullish().default('OK'),
	len: z
		.string()
		.transform((s) => s.length)
		.pipe(z.number().min(2))
});

type In = z.input<typeof schema>;
type Out = z.infer<typeof schema>;

type CommonFields<T, U> = {
	[K in keyof T & keyof U]: T[K] extends U[K]
		? T[K] extends object
			? U[K] extends object
				? CommonFields<T[K], U[K]>
				: never
			: T[K]
		: never;
};

type NotCommonFields<T, U> = {
	[K in keyof T & keyof U]: T[K] extends U[K]
		? never
		: T[K] extends object
			? U[K] extends object
				? NotCommonFields<T[K], U[K]>
				: T[K]
			: T[K];
};

type CommonFields2<T, U> = {
	[K in keyof T & keyof U]: [T[K], U[K]] extends [infer A, infer B]
		? A extends B
			? B extends A
				? A extends object
					? CommonFields<A, B>
					: A
				: never
			: never
		: never;
};

type CommonFields3<T, U> = {
	[K in keyof T & keyof U]: [T[K], U[K]] extends [infer A, infer B]
		? A extends B
			? never
			: A extends object
				? CommonFields3<A, B>
				: A
		: never;
};

type M = CommonFields3<In, Out>;

let m: M;
