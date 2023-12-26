import type { SchemaShape } from './jsonSchema/schemaShape.js';
import type { ValidationIssue } from '@decs/typeschema';
import { pathExists, setPaths, traversePath, traversePaths } from './traversal.js';
import { SuperFormError, type ValidationErrors } from './index.js';
import type { Writable } from 'svelte/store';
import { mergePath } from './stringPath.js';

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

export function clearErrors<T extends Record<string, unknown>>(
	Errors: Writable<ValidationErrors<T>>,
	options: {
		undefinePath: (string | number | symbol)[] | null;
		clearFormLevelErrors: boolean;
	}
) {
	Errors.update(($errors) => {
		traversePaths($errors, (pathData) => {
			if (
				pathData.path.length == 1 &&
				pathData.path[0] == '_errors' &&
				!options.clearFormLevelErrors
			) {
				return;
			}
			if (Array.isArray(pathData.value)) {
				return pathData.set(undefined);
			}
		});

		if (options.undefinePath) setPaths($errors, [options.undefinePath], undefined);

		return $errors;
	});
}

export function flattenErrors(errors: ValidationErrors<Record<string, unknown>>) {
	return _flattenErrors(errors, []);
}

// TODO: Does it work with array-level errors?
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
