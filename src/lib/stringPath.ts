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
export type FormPath<T extends object> = string & StringPath<T>;
//| FormPathLeaves<T>
//| FormPathArrays<T>;

/**
 * List paths in an object as string accessors, but only with non-objects as accessible properties.
 * Similar to the leaves in a node tree, if you look at the object as a tree structure.
 */
export type FormPathLeaves<T extends object> = string & StringPath<T, 'leaves'>;

/**
 * List paths in an object as string accessors, but only with non-objects as accessible properties.
 * Similar to the leaves in a node tree, if you look at the object as a tree structure.
 */
export type FormPathLeavesWithErrors<T extends object> = string &
	StringPath<T, 'leaves', '_errors'>;

/**
 * List all arrays in an object as string accessors.
 */
export type FormPathArrays<T extends object> = string & StringPath<T, 'arrays'>;

type Concat<
	Path extends string,
	Next extends string
> = `${Path}${Path extends '' ? '' : '.'}${Next}`;

export type StringPath<
	T extends object,
	Filter extends 'arrays' | 'leaves' | 'all' = 'all',
	ObjAppend extends string = never,
	Path extends string = ''
> = T extends BuiltInObjects
	? Filter extends 'leaves' | 'all'
		? Path
		: never
	: T extends (infer U)[]
		?
				| (ObjAppend extends string ? Concat<Path, ObjAppend> : never)
				| (Filter extends 'arrays' | 'all' ? Path : never)
				| (NonNullable<U> extends object
						? StringPath<NonNullable<U>, Filter, ObjAppend, `${Path}[${number}]`>
						: Filter extends 'leaves' | 'all'
							? `${Path}[${number}]`
							: never)
		: {
				[K in Extract<AllKeys<T>, string>]: NonNullable<T[K]> extends object
					?
							| (ObjAppend extends string ? Concat<Path, ObjAppend> : never)
							| NonNullable<T[K]> extends (infer U)[]
						?
								| (Filter extends 'arrays' | 'all' ? Concat<Path, K> : never)
								| (NonNullable<U> extends unknown[]
										? Filter extends 'arrays' | 'all'
											? Concat<Path, `${K}[${number}]`>
											: never
										: Filter extends 'leaves' | 'all'
											? Concat<Path, `${K}[${number}]`>
											: never)
								| (NonNullable<U> extends object
										? StringPath<NonNullable<U>, Filter, ObjAppend, Concat<Path, `${K}[${number}]`>>
										: never)
						:
								| (Filter extends 'all' ? Concat<Path, K> : never)
								| StringPath<NonNullable<T[K]>, Filter, ObjAppend, Concat<Path, K>>
					: Filter extends 'leaves' | 'all'
						? Concat<Path, K>
						: never;
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
