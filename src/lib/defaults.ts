import { mapAdapter, type ValidationAdapter } from './adapters/index.js';
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
>(adapter: ValidationAdapter<T>, options?: SuperSchemaOptions<T>): SuperValidated<T, M>;

export function defaults<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	defaults: SuperSchemaData<T>,
	adapter: ValidationAdapter<T>,
	options?: SuperSchemaOptions<T>
): SuperValidated<T, M>;

export function defaults<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	defaults: SuperSchemaData<T> | ValidationAdapter<T>,
	adapter?: ValidationAdapter<T> | SuperSchemaOptions<T>,
	options?: SuperSchemaOptions<T>
): SuperValidated<T, M> {
	if (defaults && 'superFormValidationLibrary' in defaults) {
		options = adapter;
		adapter = defaults;
		defaults = null;
	}

	const validator = mapAdapter(adapter as ValidationAdapter<T>, options?.jsonSchema);
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
	adapter: ValidationAdapter<T>,
	options?: { jsonSchema: JSONSchema }
): T {
	return mapAdapter(adapter as ValidationAdapter<T>, options?.jsonSchema).defaults;
}
