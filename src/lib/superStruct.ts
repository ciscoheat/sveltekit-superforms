export type SuperStructArray<T extends Record<string, unknown>, Data, ArrayData = unknown> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Property in keyof T]?: T extends any
		? NonNullable<T[Property]> extends Record<string, unknown>
			? SuperStructArray<NonNullable<T[Property]>, Data, ArrayData>
			: NonNullable<T[Property]> extends (infer A)[]
				? ArrayData &
						Record<
							number,
							NonNullable<A> extends Record<string, unknown>
								? SuperStructArray<NonNullable<A>, Data, ArrayData>
								: Data
						>
				: Data
		: never;
};

export type SuperStruct<T extends Record<string, unknown>, Data> = Partial<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Property in keyof T]: T extends any
		? NonNullable<T[Property]> extends Record<string, unknown>
			? SuperStruct<NonNullable<T[Property]>, Data>
			: NonNullable<T[Property]> extends (infer A)[]
				? NonNullable<A> extends Record<string, unknown>
					? SuperStruct<NonNullable<A>, Data>
					: Data
				: Data
		: never;
}>;
