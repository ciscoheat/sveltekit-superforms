import { type ValidationAdapter } from './adapters/adapters.js';
import type { SuperValidateOptions, SuperValidated } from './superValidate.js';

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

	const validator = adapter as ValidationAdapter<T>;
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

export function defaultValues<T extends Record<string, unknown>>(adapter: ValidationAdapter<T>): T {
	return adapter.defaults;
}
