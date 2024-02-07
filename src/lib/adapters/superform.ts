import { traversePath, traversePaths } from '$lib/traversal.js';
import { memoize } from '$lib/memoize.js';
import type { ClientValidationAdapter, ValidationIssue } from './adapters.js';
import type { MaybePromise } from '$lib/utils.js';

// Cannot be a SuperStruct due to Property having to be passed on.
// Deep recursive problem fixed thanks to
// https://www.angularfix.com/2022/01/why-am-i-getting-instantiation-is.html
export type Validators<T extends Record<string, unknown>> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[P in keyof T]?: T extends any
		? T[P] extends Record<string, unknown>
			? Validators<T[P]>
			: NonNullable<T[P]> extends (infer A)[]
				? A extends Record<string, unknown>
					? Validators<A>
					: Validator<T[P]>
				: Validator<T[P]>
		: never;
};

export type Validator<V> = (value?: V) => MaybePromise<string | string[] | null | undefined>;

type Errors = string | string[] | undefined | null;

function _superform<T extends Record<string, unknown>, T2 extends Partial<T> = Partial<T>>(
	schema: Validators<T2>
): ClientValidationAdapter<T> {
	return {
		superFormValidationLibrary: 'superform',
		async validate(data: unknown) {
			// Add top-level validator fields to non-existing data fields
			// so they will be validated even if the field doesn't exist
			if (!data || typeof data !== 'object') data = {};
			else data = { ...data };

			const newData = data as Record<string, unknown>;

			for (const [key, value] of Object.entries(schema)) {
				if (typeof value === 'function' && !(key in newData)) {
					// Setting undefined fields so they will be validated based on field existance.
					newData[key] = undefined;
				}
			}

			const output: ValidationIssue[] = [];

			function mapErrors(path: (string | number | symbol)[], errors: Errors) {
				if (!errors) return;
				if (typeof errors === 'string') errors = [errors];

				errors.forEach((message) => {
					output.push({
						path,
						message
					});
				});
			}

			const queue: Array<{ path: (string | number | symbol)[]; errors: MaybePromise<Errors> }> = [];

			traversePaths(newData, async ({ value, path }) => {
				// Filter out array indices, the validator structure doesn't contain these.
				const validationPath = path.filter((p) => /\D/.test(String(p)));
				const maybeValidator = traversePath(schema, validationPath);

				if (typeof maybeValidator?.value === 'function') {
					const check = maybeValidator.value as Validator<unknown>;
					queue.push({ path, errors: check(value) });
				}
			});

			const errors = await Promise.all(queue.map((check) => check.errors));
			for (let i = 0; i < errors.length; i++) {
				mapErrors(queue[i].path, errors[i]);
			}

			//console.log('Validating', newData);
			//console.log(output);

			return output.length
				? {
						success: false,
						issues: output
					}
				: {
						success: true,
						data: data as T
					};
		}
	};
}

/**
 * @deprecated This adapter requires you to do error-prone type checking yourself. If possible, use one of the supported validation libraries instead.
 */
export const superformClient = /* @__PURE__ */ memoize(_superform);
