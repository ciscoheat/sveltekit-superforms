/* eslint-disable @typescript-eslint/no-explicit-any */

export type PathData = {
	parent: any;
	key: string;
	value: any;
	path: (string | number | symbol)[];
	isLeaf: boolean;
	set: (value: any) => 'skip';
};

function setPath<T extends object>(parent: T, key: keyof T, value: any) {
	parent[key] = value;
	return 'skip' as const;
}

function isInvalidPath(originalPath: (string | number | symbol)[], pathData: PathData) {
	return (
		pathData.value !== undefined &&
		typeof pathData.value !== 'object' &&
		pathData.path.length < originalPath.length
	);
}

export function pathExists<T extends object>(
	obj: T,
	path: (string | number | symbol)[],
	options: {
		value?: (value: unknown) => boolean;
		modifier?: (data: PathData) => undefined | unknown | void;
	} = {}
): PathData | undefined {
	if (!options.modifier) {
		options.modifier = (pathData) => (isInvalidPath(path, pathData) ? undefined : pathData.value);
	}

	const exists = traversePath(obj, path, options.modifier);
	if (!exists) return undefined;

	if (options.value === undefined) return exists;
	return options.value(exists.value) ? exists : undefined;
}

export function traversePath<T extends object>(
	obj: T,
	realPath: (string | number | symbol)[],
	modifier?: (data: PathData) => undefined | unknown | void
): PathData | undefined {
	if (!realPath.length) return undefined;
	const path = [realPath[0]];

	let parent = obj;

	while (parent && path.length < realPath.length) {
		const key = path[path.length - 1] as keyof typeof parent;

		const value = modifier
			? modifier({
					parent,
					key: String(key),
					value: parent[key],
					path: path.map((p) => String(p)),
					isLeaf: false,
					set: (v) => setPath(parent, key, v)
				})
			: parent[key];

		if (value === undefined) return undefined;
		else parent = value as T;

		path.push(realPath[path.length]);
	}

	if (!parent) return undefined;

	const key = realPath[realPath.length - 1];
	return {
		parent,
		key: String(key),
		value: parent[key as keyof typeof parent],
		path: realPath.map((p) => String(p)),
		isLeaf: true,
		set: (v) => setPath(parent, key as keyof typeof parent, v)
	};
}

type TraverseStatus = 'abort' | 'skip' | unknown | void;

export function traversePaths<T extends object>(
	parent: T,
	modifier: (data: PathData) => TraverseStatus,
	path: (string | number | symbol)[] = []
): TraverseStatus {
	for (const key in parent) {
		const value = parent[key] as any;
		const isLeaf = value === null || typeof value !== 'object';

		const pathData: PathData = {
			parent,
			key,
			value,
			path: path.concat([key]), // path.map(String).concat([key])
			isLeaf,
			set: (v) => setPath(parent, key, v)
		};

		const status = modifier(pathData);

		if (status === 'abort') return status;
		else if (status === 'skip') continue;
		else if (!isLeaf) {
			const status = traversePaths(value, modifier, pathData.path as any);
			if (status === 'abort') return status;
		}
	}
}

// Thanks to https://stackoverflow.com/a/31129384/70894
function eqSet(xs: Set<unknown>, ys: Set<unknown>) {
	return xs === ys || (xs.size === ys.size && [...xs].every((x) => ys.has(x)));
}

/**
 * Compare two objects and return the differences as paths.
 */
export function comparePaths(newObj: unknown, oldObj: unknown) {
	const diffPaths = new Map<string, (string | number | symbol)[]>();

	function builtInDiff(one: Date | Set<unknown> | File, other: Date | Set<unknown> | File) {
		if (one instanceof Date && other instanceof Date && one.getTime() !== other.getTime())
			return true;
		if (one instanceof Set && other instanceof Set && !eqSet(one, other)) return true;
		if (one instanceof File && other instanceof File && one !== other) return true;
		return false;
	}

	function isBuiltin(data: unknown): data is Date | Set<unknown> | File {
		return data instanceof Date || data instanceof Set || data instanceof File;
	}

	function checkPath(data: PathData, compareTo: object) {
		const otherData = compareTo ? traversePath(compareTo, data.path) : undefined;

		function addDiff() {
			diffPaths.set(data.path.join(' '), data.path);
			return 'skip';
		}

		if (isBuiltin(data.value)) {
			if (!isBuiltin(otherData?.value) || builtInDiff(data.value, otherData.value)) {
				return addDiff();
			}
		}

		if (data.isLeaf) {
			if (!otherData || data.value !== otherData.value) {
				addDiff();
			}
		}
	}

	traversePaths(newObj as object, (data) => checkPath(data, oldObj as object));
	traversePaths(oldObj as object, (data) => checkPath(data, newObj as object));

	return Array.from(diffPaths.values());
}

export function setPaths(
	obj: Record<string, unknown>,
	paths: (string | number | symbol)[][],
	value:
		| NonNullable<unknown>
		| ((path: (string | number | symbol)[], data: PathData) => unknown)
		| null
		| undefined
) {
	const isFunction = typeof value === 'function';

	for (const path of paths) {
		const leaf = traversePath(obj, path, ({ parent, key, value }) => {
			if (value === undefined || typeof value !== 'object') {
				// If a previous check tainted the node, but the search goes deeper,
				// so it needs to be replaced with a (parent) node
				parent[key] = {};
			}
			return parent[key];
		});
		if (leaf) leaf.parent[leaf.key] = isFunction ? value(path, leaf) : value;
	}
}
