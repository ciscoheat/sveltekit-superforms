export function splitPath(path: string) {
	return path
		.toString()
		.split(/[[\].]+/)
		.filter((p) => p);
}

export function mergePath(path: (string | number | symbol)[]) {
	return path.reduce((acc: string, next) => {
		const key = String(next);
		if (typeof next === 'number' || /^\d+$/.test(key)) acc += `[${key}]`;
		else if (!acc) acc += key;
		else acc += `.${key}`;

		return acc;
	}, '');
}

type BuiltInObjects = Date | Set<unknown> | File;

export type AllKeys<T> = T extends T ? keyof T : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PickType<T, K extends AllKeys<T>> = T extends { [k in K]: any } ? T[K] : never;

// Thanks to https://dev.to/lucianbc/union-type-merging-in-typescript-9al
export type MergeUnion<T> = {
	[K in AllKeys<T>]: PickType<T, K>;
};

/**
 * Lists all paths in an object as string accessors.
 */
export type FormPath<T extends object, Type = never> = string &
	StringPath<T, { filter: 'all'; objAppend: never; path: ''; type: Type }>;

/**
 * List paths in an object as string accessors, but only with non-objects as accessible properties.
 * Similar to the leaves in a node tree, if you look at the object as a tree structure.
 */
export type FormPathLeaves<T extends object, Type = never> = string &
	StringPath<T, { filter: 'leaves'; objAppend: never; path: ''; type: Type }>;

/**
 * List paths in an object as string accessors, but only with non-objects as accessible properties.
 * Also includes the _errors field for objects and arrays.
 */
export type FormPathLeavesWithErrors<T extends object, Type = never> = string &
	StringPath<T, { filter: 'leaves'; objAppend: '_errors'; path: ''; type: Type }>;

/**
 * List all arrays in an object as string accessors.
 */
export type FormPathArrays<T extends object> = string &
	StringPath<T, { filter: 'arrays'; objAppend: never; path: ''; type: never }>;

type Concat<
	Path extends string,
	Next extends string
> = `${Path}${Path extends '' ? '' : '.'}${Next}`;

type StringPathOptions = {
	filter: 'arrays' | 'leaves' | 'all';
	objAppend: string | never;
	path: string;
	type: unknown | never;
};

type If<
	Options extends StringPathOptions,
	Pred extends keyof StringPathOptions,
	Subj,
	Then,
	Else = never
> = Options[Pred] extends Subj ? Then : Else;

type StringPath<
	T extends object,
	Options extends StringPathOptions = {
		filter: 'all';
		objAppend: never;
		path: '';
		type: never;
	}
> = T extends BuiltInObjects
	? If<Options, 'filter', 'leaves' | 'all', Options['path']>
	: T extends (infer U)[]
		?
				| If<Options, 'objAppend', string, Concat<Options['path'], Options['objAppend']>>
				| If<Options, 'filter', 'arrays' | 'all', Options['path']>
				| (NonNullable<U> extends object
						? StringPath<
								NonNullable<U>,
								{
									filter: Options['filter'];
									objAppend: Options['objAppend'];
									path: `${Options['path']}[${number}]`;
									type: Options['type'];
								}
							>
						: If<Options, 'filter', 'leaves' | 'all', `${Options['path']}[${number}]`>)
		: {
				[K in Extract<AllKeys<T>, string>]: NonNullable<T[K]> extends object
					?
							| If<Options, 'objAppend', string, Concat<Options['path'], Options['objAppend']>>
							| NonNullable<T[K]> extends (infer U)[]
						?
								| If<Options, 'filter', 'arrays' | 'all', Concat<Options['path'], K>>
								| (NonNullable<U> extends unknown[]
										? If<
												Options,
												'filter',
												'arrays' | 'all',
												Concat<Options['path'], `${K}[${number}]`>
											>
										: If<
												Options,
												'filter',
												'leaves' | 'all',
												Concat<Options['path'], `${K}[${number}]`>
											>)
								| (NonNullable<U> extends object
										? StringPath<
												NonNullable<U>,
												{
													filter: Options['filter'];
													objAppend: Options['objAppend'];
													path: Concat<Options['path'], `${K}[${number}]`>;
													type: Options['type'];
												}
											>
										: never)
						:
								| If<Options, 'filter', 'all', Concat<Options['path'], K>>
								| StringPath<
										NonNullable<T[K]>,
										{
											filter: Options['filter'];
											objAppend: Options['objAppend'];
											path: Concat<Options['path'], K>;
											type: Options['type'];
										}
								  >
					: If<Options, 'filter', 'leaves' | 'all', Concat<Options['path'], K>>;
			}[Extract<AllKeys<T>, string>];

export type FormPathType<T, P extends string> = P extends keyof T
	? T[P]
	: P extends number
		? T
		: P extends `.${infer Rest}`
			? FormPathType<NonNullable<T>, Rest>
			: P extends `${number}]${infer Rest}`
				? NonNullable<T> extends (infer U)[]
					? FormPathType<U, Rest>
					: { invalid_path1: P; Type: T }
				: P extends `${infer K}[${infer Rest}`
					? K extends keyof NonNullable<T>
						? FormPathType<NonNullable<T>[K], Rest>
						: FormPathType<T, Rest>
					: P extends `${infer K}.${infer Rest}`
						? K extends keyof NonNullable<T>
							? FormPathType<NonNullable<T>[K], Rest>
							: NonNullable<T> extends (infer U)[]
								? FormPathType<U, Rest>
								: { invalid_path2: P; Type: T }
						: P extends `[${infer K}].${infer Rest}`
							? K extends number
								? T extends (infer U)[]
									? FormPathType<U, Rest>
									: { invalid_path3: P; Type: T }
								: P extends `${number}`
									? NonNullable<T> extends (infer U)[]
										? U
										: { invalid_path4: P; Type: T }
									: P extends keyof NonNullable<T>
										? NonNullable<T>[P]
										: P extends `${number}`
											? NonNullable<T> extends (infer U)[]
												? U
												: { invalid_path5: P; Type: T }
											: { invalid_path6: P; Type: T }
							: P extends ''
								? T
								: P extends AllKeys<T>
									? MergeUnion<T>[P]
									: { invalid_path7: P; Type: T };
