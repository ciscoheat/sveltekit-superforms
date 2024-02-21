import type { ValidationAdapter, ClientValidationAdapter } from './adapters/adapters.js';
import type { SuperValidateOptions, SuperValidated } from './superValidate.js';

type SuperSchemaData<T extends Record<string, unknown>> = Partial<T> | null | undefined;

type SuperSchemaOptions<T extends Record<string, unknown>> = Pick<
	SuperValidateOptions<T>,
	'id' | 'defaults'
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
	defaults: T,
	adapter: ClientValidationAdapter<T>,
	options?: SuperSchemaOptions<T>
): SuperValidated<T, M>;

export function defaults<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	data: SuperSchemaData<T> | ValidationAdapter<T> | T,
	adapter?: ValidationAdapter<T> | ClientValidationAdapter<T> | SuperSchemaOptions<T>,
	options?: SuperSchemaOptions<T>
): SuperValidated<T, M> {
	if (data && 'superFormValidationLibrary' in data) {
		options = adapter as SuperSchemaOptions<T>;
		adapter = data;
		data = null;
	}

	const validator = adapter as ValidationAdapter<T>;
	const optionDefaults = options?.defaults ?? validator.defaults;

	return {
		id: options?.id ?? validator.id ?? '',
		valid: false,
		posted: false,
		errors: {},
		data: { ...optionDefaults, ...data },
		constraints: validator.constraints,
		shape: validator.shape
	};
}

export function defaultValues<T extends Record<string, unknown>>(adapter: ValidationAdapter<T>): T {
	return adapter.defaults;
}
