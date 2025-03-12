import { splitPath } from './stringPath.js';

function setValueOfArrayOrObject(
	record: Record<string, unknown> | unknown[],
	key: string,
	value: unknown
) {
	const isParentArray = Array.isArray(record);
	const numericKey = parseInt(key, 10);

	if (isParentArray) {
		if (Number.isNaN(numericKey)) {
			return;
		}

		(record as unknown[])[numericKey] = value;
	} else {
		(record as Record<string, unknown>)[key] = value;
	}
}

/**
 * Take a FormData object that is a flattened representation of
 * a nested form and reconstruct the nested data structure.
 * Example keys:
 *
 * ```
 * {'a.b.c': 1} -> {a: b: {c: 1}},
 * {'a.b.d[0]': 2} -> {a: {b: {d: [2]}}}
 * ```
 */
export function unflattenFormData(data: FormData): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const flatKey of data.keys()) {
		const paths = splitPath(flatKey);
		const formValue = data.getAll(flatKey);

		let parent: Record<string, unknown> | unknown[] = result;
		paths.forEach((key, i) => {
			const adjacentKey = paths[i + 1];
			const numericAdjacentKey = parseInt(adjacentKey, 10);

			//End of the paths, so we set the actual FormData value
			if (!adjacentKey) {
				const actualFormValue = formValue.length === 1 ? formValue[0] : formValue;
				setValueOfArrayOrObject(parent, key, actualFormValue);
				return;
			}

			const value = Array.isArray(parent)
				? (parent[parseInt(key, 10)] as Record<string, unknown> | unknown[] | undefined)
				: (parent[key] as Record<string, unknown> | unknown[] | undefined);

			if (!value) {
				const initializedValue = !Number.isNaN(numericAdjacentKey) ? [] : {};
				setValueOfArrayOrObject(parent, key, initializedValue);
				parent = initializedValue;
				return;
			}

			parent = value;
		});
	}

	return result;
}
