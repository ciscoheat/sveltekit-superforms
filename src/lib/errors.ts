import type { SchemaShape } from './jsonSchema/schemaShape.js';
import { pathExists, setPaths, traversePath, traversePaths } from './traversal.js';
import { mergePath } from './stringPath.js';
import type { ValidationErrors } from './superValidate.js';
import { defaultTypes, defaultValue, type SchemaFieldType } from './jsonSchema/schemaDefaults.js';
import type { JSONSchema } from './jsonSchema/index.js';
import { clone } from './utils.js';
import { merge } from 'ts-deepmerge';
import { schemaInfo, type SchemaType } from './jsonSchema/schemaInfo.js';
import type { ValidationIssue } from './adapters/adapters.js';

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
		if (!Array.isArray(error.value) && error.value !== undefined) return;
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
 * Merge defaults with parsed data.
 */
export function mergeDefaults<T extends Record<string, unknown>>(
	parsedData: Record<string, unknown> | null | undefined,
	defaults: T
): T {
	if (!parsedData) return clone(defaults);
	return merge.withOptions({ mergeArrays: false }, defaults, parsedData) as T;
}

/**
 * Merge defaults with (important!) *already validated and merged data*.
 * @DCI-context
 */
export function replaceInvalidDefaults<T extends Record<string, unknown>>(
	Data: Record<string, unknown>,
	Defaults: T,
	_schema: JSONSchema,
	Errors: ValidationIssue[],
	preprocessed: (keyof T)[] | undefined
): T {
	const defaultType =
		_schema.additionalProperties && typeof _schema.additionalProperties == 'object'
			? { __types: schemaInfo(_schema.additionalProperties, false, []).types }
			: undefined; // Will throw if a field does not exist

	///// Roles ///////////////////////////////////////////////////////

	//#region Types

	const Types = defaultTypes(_schema);

	function Types_correctValue(dataValue: unknown, defValue: unknown, type: SchemaFieldType) {
		const types = type.__types;

		if (!types.length || types.every((t) => t == 'undefined' || t == 'null' || t == 'any')) {
			// No types counts as an "any" type
			return dataValue;
		} else if (types.length == 1 && types[0] == 'array' && !type.__items) {
			/* 
			No type info for array exists. 
			Keep the value even though it may not be the correct type, but validation 
			won't fail and the failed data is usually returned to the form without UX problems.
			*/
			return dataValue;
		}

		const dateTypes: SchemaType[] = ['unix-time', 'Date', 'date'];

		for (const schemaType of types) {
			const defaultTypeValue = defaultValue(schemaType, undefined);

			const sameType =
				typeof dataValue === typeof defaultTypeValue ||
				(dateTypes.includes(schemaType) && dataValue instanceof Date);

			const sameExistance = sameType && (dataValue === null) === (defaultTypeValue === null);

			if (sameType && sameExistance) {
				return dataValue;
			} else if (type.__items) {
				// Parse array type
				return Types_correctValue(dataValue, defValue, type.__items);
			}
		}

		// null takes preference over undefined
		if (defValue === undefined && types.includes('null')) {
			return null;
		}

		return defValue;
	}

	//#endregion

	//#region Data

	function Data_traverse() {
		traversePaths(Defaults, Defaults_traverseAndReplace);
		Errors_traverseAndReplace();
		return Data as T;
	}

	function Data_setValue(currentPath: (string | number | symbol)[], newValue: unknown) {
		setPaths(Data, [currentPath], newValue);
	}

	//#endregion

	//#region Errors

	function Errors_traverseAndReplace() {
		for (const error of Errors) {
			if (!error.path) continue;

			Defaults_traverseAndReplace({
				path: error.path,
				value: pathExists(Defaults, error.path)?.value
			});
		}
	}

	//#endregion

	//#region Defaults

	function Defaults_traverseAndReplace(defaultPath: {
		path: (string | number | symbol)[];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: any;
	}): void {
		const currentPath = defaultPath.path;
		if (!currentPath || !currentPath[0]) return;
		if (typeof currentPath[0] === 'string' && preprocessed?.includes(currentPath[0])) return;

		const dataPath = pathExists(Data, currentPath);

		//let newValue = defValue;

		if (
			(!dataPath && defaultPath.value !== undefined) ||
			(dataPath && dataPath.value === undefined)
		) {
			Data_setValue(currentPath, defaultPath.value);
		} else if (dataPath) {
			const defValue = defaultPath.value;
			const dataValue = dataPath.value;

			// Check for same JS type with an existing default value.
			if (
				defValue !== undefined &&
				typeof dataValue === typeof defValue &&
				(dataValue === null) === (defValue === null)
			) {
				return;
			}

			const typePath = currentPath.filter((p) => /\D/.test(String(p)));
			const pathTypes = traversePath(Types, typePath, (path) => {
				//console.log(path.path, path.value); //debug
				return '__items' in path.value ? path.value.__items : path.value;
			});
			if (!pathTypes) {
				throw new SchemaError('No types found for defaults', currentPath);
			}

			const fieldType = pathTypes.value ?? defaultType;
			if (fieldType) {
				Data_setValue(currentPath, Types_correctValue(dataValue, defValue, fieldType));
			}
		}
	}

	//#endregion

	{
		return Data_traverse();
	}
}
