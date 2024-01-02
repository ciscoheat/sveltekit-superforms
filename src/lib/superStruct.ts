export type SuperStructArray<T extends Record<string, unknown>, Data, ArrayData = unknown> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Property in keyof T]?: T extends any
		? T[Property] extends Record<string, unknown>
			? SuperStructArray<T[Property], Data, ArrayData>
			: T[Property] extends (infer A)[]
				? ArrayData &
						Record<
							number,
							A extends Record<string, unknown> ? SuperStructArray<A, Data, ArrayData> : Data
						>
				: Data
		: never;
};

export type SuperStruct<T extends Record<string, unknown>, Data> = Partial<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Property in keyof T]: T extends any
		? T[Property] extends Record<string, unknown>
			? SuperStruct<T[Property], Data>
			: T[Property] extends (infer A)[]
				? A extends Record<string, unknown>
					? SuperStruct<A, Data>
					: Data
				: Data
		: never;
}>;
