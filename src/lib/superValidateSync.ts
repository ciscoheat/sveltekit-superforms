import { mapAdapter, type ValidationAdapter } from './adapters/index.js';
import type { SuperValidated } from './index.js';
import type { SuperValidateSyncOptions, SuperValidateSyncData } from './superValidate.js';

export function superValidateSync<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(adapter: ValidationAdapter<T>, options?: SuperValidateSyncOptions<T>): SuperValidated<T, M>;

export function superValidateSync<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	data: SuperValidateSyncData<T>,
	adapter: ValidationAdapter<T>,
	options?: SuperValidateSyncOptions<T>
): SuperValidated<T, M>;

export function superValidateSync<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(
	data: SuperValidateSyncData<T> | ValidationAdapter<T>,
	adapter?: ValidationAdapter<T> | SuperValidateSyncOptions<T>,
	options?: SuperValidateSyncOptions<T>
): SuperValidated<T, M> {
	if (data && 'superFormValidationLibrary' in data) {
		options = adapter;
		adapter = data;
		data = null;
	}

	const validator = mapAdapter(adapter as ValidationAdapter<T>, options?.jsonSchema);
	const defaults = options?.defaults ?? validator.defaults;

	return {
		id: options?.id ?? validator.id,
		valid: false,
		posted: false,
		errors: {},
		data: { ...defaults, ...(data ?? {}) },
		constraints: validator.constraints
	};
}
