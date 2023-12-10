import type { ObjectShape } from './jsonSchema/objectShape.js';
import type { ValidationIssue } from '@decs/typeschema';
import { pathExists, traversePath } from './traversal.js';
import { SuperFormError } from './index.js';

export function mapErrors(errors: ValidationIssue[], shape: ObjectShape) {
	//console.log('===', errors.length, 'errors', shape);
	const output: Record<string, unknown> = {};
	for (const error of errors) {
		if (!error.path) continue;

		// Path must filter away number indices, since
		// the object shape doesn't contain these.
		const objectError = pathExists(
			shape,
			error.path.filter((p) => /\D/.test(String(p)))
		)?.value;

		const leaf = traversePath(output, error.path, ({ value, parent, key }) => {
			if (value === undefined) parent[key] = {};
			return parent[key];
		});

		if (!leaf) throw new SuperFormError('Error leaf should exist.');

		const { parent, key } = leaf;

		//console.log(error.path, error.message, objectError ? '[OBJ]' : '');

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
