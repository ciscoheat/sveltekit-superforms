import type { AllKeys, MergeUnion } from './utils.js';

export type SuperStructArray<T extends Record<string, unknown>, Data, ArrayData = unknown> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Property in AllKeys<T>]?: [T] extends [any]
		? NonNullable<T[Property]> extends Record<string, unknown>
			? ArrayData & SuperStructArray<MergeUnion<NonNullable<T[Property]>>, Data, ArrayData>
			: NonNullable<T[Property]> extends (infer A)[]
				? ArrayData &
						Record<
							number | string,
							NonNullable<A> extends Record<string, unknown>
								? SuperStructArray<MergeUnion<NonNullable<A>>, Data, ArrayData>
								: Data
						>
				: Data
		: never;
};

export type SuperStruct<T, Data> = Partial<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Property in AllKeys<T>]: [T] extends [any]
		? NonNullable<T[Property]> extends Record<string, unknown>
			? SuperStruct<MergeUnion<NonNullable<T[Property]>>, Data>
			: NonNullable<T[Property]> extends (infer A)[]
				? NonNullable<A> extends Record<string, unknown>
					? SuperStruct<MergeUnion<NonNullable<A>>, Data>
					: Data
				: Data
		: never;
}>;
