import { createAdapter, type BaseValidationAdapter } from './adapters/index.js';
import type { SuperValidated } from './index.js';
import type { JSONSchema } from './jsonSchema/index.js';
import type { SuperValidateOptions } from './superValidate.js';

type SuperSchemaData<T extends Record<string, unknown>> = Partial<T> | null | undefined;

type SuperSchemaOptions<T extends Record<string, unknown>> = Pick<
	SuperValidateOptions<T>,
	'id' | 'defaults' | 'jsonSchema'
>;

export function defaults<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(adapter: BaseValidationAdapter<T>, options?: SuperSchemaOptions<T>): SuperValidated<T, M>;

export function defaults<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	defaults: SuperSchemaData<T>,
	adapter: BaseValidationAdapter<T>,
	options?: SuperSchemaOptions<T>
): SuperValidated<T, M>;

export function defaults<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	defaults: SuperSchemaData<T> | BaseValidationAdapter<T>,
	adapter?: BaseValidationAdapter<T> | SuperSchemaOptions<T>,
	options?: SuperSchemaOptions<T>
): SuperValidated<T, M> {
	if (defaults && 'superFormValidationLibrary' in defaults) {
		options = adapter;
		adapter = defaults;
		defaults = null;
	}

	const validator = createAdapter(adapter as BaseValidationAdapter<T>, options?.jsonSchema);
	const optionDefaults = options?.defaults ?? validator.defaults;

	return {
		id: options?.id ?? validator.id,
		valid: false,
		posted: false,
		errors: {},
		data: { ...optionDefaults, ...defaults },
		constraints: validator.constraints
	};
}

export function defaultValues<T extends Record<string, unknown>>(
	adapter: BaseValidationAdapter<T>,
	options?: { jsonSchema: JSONSchema }
): T {
	return createAdapter(adapter as BaseValidationAdapter<T>, options?.jsonSchema).defaults;
}
