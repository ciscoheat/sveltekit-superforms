import type { SchemaShape } from './jsonSchema/schemaShape.js';
import { pathExists, setPaths, traversePath, traversePaths } from './traversal.js';
import { mergePath } from './stringPath.js';
import type { ValidationErrors } from './superValidate.js';
import type { ValidationIssue } from '@decs/typeschema';
import { schemaInfo, schemaInfoForPath } from './jsonSchema/schemaInfo.js';
import type { ValidationAdapter } from './adapters/adapters.js';
import {
	defaultTypes,
	defaultValue,
	defaultValues,
	type ArrayType,
	type TypeObject
} from './jsonSchema/schemaDefaults.js';
import type { JSONSchema } from './jsonSchema/index.js';

export class SuperFormError extends Error {
	constructor(message?: string) {
		super(message);
		Object.setPrototypeOf(this, SuperFormError.prototype);
	}
}

export class SchemaError extends SuperFormError {
	readonly path: string | undefined;
	constructor(message: string, path?: string | (string | number | symbol)[]) {
		super(
			(path && path.length ? `[${Array.isArray(path) ? path.join('.') : path}] ` : '') + message
		);
		this.path = Array.isArray(path) ? path.join('.') : path;
		Object.setPrototypeOf(this, SchemaError.prototype);
	}
}

export function mapErrors(errors: ValidationIssue[], shape: SchemaShape) {
	//console.log('===', errors.length, 'errors', shape);
	const output: Record<string, unknown> & { _errors?: string[] } = {};

	function addFormLevelError(error: ValidationIssue) {
		if (!('_errors' in output)) output._errors = [];

		if (!Array.isArray(output._errors)) {
			if (typeof output._errors === 'string') output._errors = [output._errors];
			else throw new SuperFormError('Form-level error was not an array.');
		}

		output._errors.push(error.message);
	}

	for (const error of errors) {
		// Form-level error
		if (!error.path || (error.path.length == 1 && !error.path[0])) {
			addFormLevelError(error);
			continue;
		}

		// Path must filter away number indices, since the object shape doesn't contain these.
		// Except the last, since otherwise any error in an array will count as an object error.
		const isLastIndexNumeric = /^\d$/.test(String(error.path[error.path.length - 1]));

		const objectError =
			!isLastIndexNumeric &&
			pathExists(
				shape,
				error.path.filter((p) => /\D/.test(String(p)))
			)?.value;

		//console.log(error.path, error.message, objectError ? '[OBJ]' : '');

		const leaf = traversePath(output, error.path, ({ value, parent, key }) => {
			if (value === undefined) parent[key] = {};
			return parent[key];
		});

		if (!leaf) {
			addFormLevelError(error);
			continue;
		}

		const { parent, key } = leaf;

		if (objectError) {
			if (!(key in parent)) parent[key] = {};
			if (!('_errors' in parent[key])) parent[key]._errors = [error.message];
			else parent[key]._errors.push(error.message);
		} else {
			if (!(key in parent)) parent[key] = [error.message];
			else parent[key].push(error.message);
		}
	}
	return output;
}

/**
 * Filter errors based on validation method.
 * auto = Requires the existence of errors and tainted (field in store) to show
 * oninput = Set directly
 */
export function updateErrors<T extends Record<string, unknown>>(
	New: ValidationErrors<T>,
	Previous: ValidationErrors<T>,
	force?: boolean
) {
	if (force) return New;

	// Set previous errors to undefined,
	// which signifies that an error can be displayed there again.
	traversePaths(Previous, (errors) => {
		if (!Array.isArray(errors.value)) return;
		errors.set(undefined);
	});

	traversePaths(New, (error) => {
		if (!Array.isArray(error.value)) return;
		setPaths(Previous, [error.path], error.value);
	});

	return Previous;
}

export function flattenErrors<T extends Record<string, unknown>>(errors: ValidationErrors<T>) {
	return _flattenErrors(errors, []);
}

function _flattenErrors(
	errors: ValidationErrors<Record<string, unknown>>,
	path: string[]
): { path: string; messages: string[] }[] {
	const entries = Object.entries(errors);
	return entries
		.filter(([, value]) => value !== undefined)
		.flatMap(([key, messages]) => {
			if (Array.isArray(messages) && messages.length > 0) {
				const currPath = path.concat([key]);
				return { path: mergePath(currPath), messages };
			} else {
				return _flattenErrors(
					errors[key] as unknown as ValidationErrors<Record<string, unknown>>,
					path.concat([key])
				);
			}
		});
}

/**
 * Merge defaults with (important!) already validated data.
 */
export function mergeDefaults<T extends Record<string, unknown>>(
	validatedData: Record<string, unknown> | null | undefined,
	adapter: ValidationAdapter<T>,
	errors: ValidationIssue[]
): T {
	const data = validatedData ?? {};

	traversePaths(adapter.defaults, (path) => {
		const dataPath = pathExists(data!, path.path);
		if ((!dataPath || dataPath.value === undefined) && path.value !== undefined) {
			setPaths(data, [path.path], path.value);
		}
	});

	const output = data;
	const types = defaultTypes(adapter.jsonSchema);

	//console.log('🚀 ~ mergeDefaults');
	//console.dir(types, { depth: 10 }); //debug

	for (const error of errors) {
		if (!error.path || !error.path[0]) continue;

		const dataPath = pathExists(data, error.path);
		const defaultPath = pathExists(adapter.defaults, error.path);

		const dataValue = dataPath?.value;
		let defValue: unknown = defaultPath?.value;

		if (defValue === undefined) {
			const isArrayError = /^\d+$/.test(String(error.path[error.path.length - 1]));
			const checkPath = isArrayError ? error.path.slice(0, -1) : error.path;

			const pathTypes = pathExists(types, checkPath);
			if (!pathTypes) throw new SchemaError('No types found for defaults', checkPath);

			const p = pathTypes.value as ArrayType;
			const t = p._items ? p._items._types : p._types;

			//console.log(error.path, t); //debug

			for (const type of t) {
				const defaultTypeValue = defaultValue(type, undefined);
				const sameType = typeof dataValue === typeof defaultTypeValue;

				if (sameType) {
					defValue = defaultTypeValue;
					break;
				}
			}
		}

		const sameType = typeof dataValue === typeof defValue;
		//const sameExistance = sameType && (dataValue === null) === (defValue === null);

		if (sameType /* && sameExistance */) {
			setPaths(output, [error.path], dataValue);
		} else if (Array.isArray(defaultPath?.parent)) {
			// Parse array type
			const info = schemaInfoForPath(adapter.jsonSchema, error.path.slice(0, -1));
			const arrayTypes = { anyOf: info?.array } satisfies JSONSchema;
			setPaths(output, [error.path], defaultValues(arrayTypes));
		} else {
			setPaths(output, [error.path], defValue);
		}
	}
	return output as T;
}
