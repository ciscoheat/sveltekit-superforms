/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ValidationAdapter, ClientValidationAdapter } from './adapters/adapters.js';
import type { SuperValidateOptions, SuperValidated } from './superValidate.js';

type SuperSchemaData<T extends Record<string, unknown>> = Partial<T> | null | undefined;

type SuperSchemaOptions<T extends Record<string, unknown>> = Pick<
	SuperValidateOptions<T>,
	'id' | 'defaults'
>;

export function defaults<
	Out extends Record<string, unknown>,
	M = App.Superforms.Message extends never ? any : App.Superforms.Message,
	In extends Record<string, unknown> = Out
>(
	adapter: ValidationAdapter<Out, In>,
	options?: SuperSchemaOptions<Out>
): SuperValidated<Out, M, In>;

export function defaults<
	Out extends Record<string, unknown>,
	M = App.Superforms.Message extends never ? any : App.Superforms.Message,
	In extends Record<string, unknown> = Out
>(
	defaults: SuperSchemaData<Out>,
	adapter: ValidationAdapter<Out, In>,
	options?: SuperSchemaOptions<Out>
): SuperValidated<Out, M, In>;

export function defaults<
	Out extends Record<string, unknown>,
	M = App.Superforms.Message extends never ? any : App.Superforms.Message,
	In extends Record<string, unknown> = Out
>(
	defaults: Out,
	adapter: ClientValidationAdapter<Out, In>,
	options?: SuperSchemaOptions<Out>
): SuperValidated<Out, M, In>;

export function defaults<
	Out extends Record<string, unknown>,
	M = App.Superforms.Message extends never ? any : App.Superforms.Message,
	In extends Record<string, unknown> = Out
>(
	data: SuperSchemaData<Out> | ValidationAdapter<Out, In> | Out,
	adapter?: ValidationAdapter<Out, In> | ClientValidationAdapter<Out, In> | SuperSchemaOptions<Out>,
	options?: SuperSchemaOptions<Out>
): SuperValidated<Out, M, In> {
	if (data && 'superFormValidationLibrary' in data) {
		options = adapter as SuperSchemaOptions<Out>;
		adapter = data;
		data = null;
	}

	const validator = adapter as ValidationAdapter<Out, In>;
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

export function defaultValues<T extends Record<string, unknown>>(
	adapter: ValidationAdapter<T, Record<string, unknown>>
): T {
	return adapter.defaults;
}
