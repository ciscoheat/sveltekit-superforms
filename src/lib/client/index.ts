import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import type { Page } from '@sveltejs/kit';
import type { Readable, Writable, Updater } from 'svelte/store';
import { type SuperValidated, SuperFormError } from '../index.js';
import type { MaybePromise } from '../index.js';
import type { FormPath, FormPathLeaves, FormPathType } from '../stringPath.js';
import type { ValidationAdapter } from '$lib/adapters/index.js';
import { enhance as svelteKitEnhance } from '$app/forms';
import type { TaintedFields, ValidationErrors } from '../superValidate.js';

export { superForm } from './superForm.js';
export { superValidate, message, setMessage, setError } from '../superValidate.js';
export { superValidateSync } from '../superValidateSync.js';
export { defaultValues } from '../jsonSchema/defaultValues.js';
export { actionResult } from '../actionResult.js';

export {
	intProxy,
	numberProxy,
	booleanProxy,
	dateProxy,
	fieldProxy,
	formFieldProxy,
	stringProxy,
	arrayProxy,
	type TaintOptions
} from './proxies.js';

export type FormUpdate = (
	result: Exclude<ActionResult, { type: 'error' }>,
	untaint?: boolean
) => Promise<void>;

export type SuperFormEvents<T extends Record<string, unknown>, M> = Pick<
	FormOptions<T, M>,
	'onError' | 'onResult' | 'onSubmit' | 'onUpdate' | 'onUpdated'
>;

export type SuperFormEventList<T extends Record<string, unknown>, M> = {
	[Property in keyof SuperFormEvents<T, M>]-?: NonNullable<SuperFormEvents<T, M>[Property]>[];
};

/**
 * Helper type for making onResult strongly typed with ActionData.
 * @example const result = event.result as FormResult<ActionData>;
 */
export type FormResult<T extends Record<string, unknown> | null> = ActionResult<
	NonNullable<T>,
	NonNullable<T>
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormOptions<T extends Record<string, unknown>, M> = Partial<{
	id: string;
	applyAction: boolean;
	invalidateAll: boolean;
	resetForm: boolean | (() => boolean);
	scrollToError: 'auto' | 'smooth' | 'off' | boolean | ScrollIntoViewOptions;
	autoFocusOnError: boolean | 'detect';
	errorSelector: string;
	selectErrorText: boolean;
	stickyNavbar: string;
	taintedMessage: string | boolean | null;
	SPA: true | { failStatus?: number };

	onSubmit: (...params: Parameters<SubmitFunction>) => MaybePromise<unknown | void>;
	onResult: (event: {
		result: ActionResult;
		formEl: HTMLFormElement;
		cancel: () => void;
	}) => MaybePromise<unknown | void>;
	onUpdate: (event: {
		form: SuperValidated<T, M>;
		formEl: HTMLFormElement;
		cancel: () => void;
	}) => MaybePromise<unknown | void>;
	onUpdated: (event: { form: Readonly<SuperValidated<T, M>> }) => MaybePromise<unknown | void>;
	onError:
		| 'apply'
		| ((event: {
				result: {
					type: 'error';
					status?: number;
					error: App.Error;
				};
				message: Writable<SuperValidated<T, M>['message']>;
		  }) => MaybePromise<unknown | void>);
	dataType: 'form' | 'json';
	jsonChunkSize: number;
	validators: ValidationAdapter<T> | false;
	validationMethod: 'auto' | 'oninput' | 'onblur' | 'submit-only';
	defaultValidator: 'keep' | 'clear';
	customValidity: boolean;
	clearOnSubmit: 'errors' | 'message' | 'errors-and-message' | 'none';
	delayMs: number;
	timeoutMs: number;
	multipleSubmits: 'prevent' | 'allow' | 'abort';
	syncFlashMessage?: boolean;
	flashMessage: {
		module: {
			getFlash(page: Readable<Page>): Writable<App.PageData['flash']>;
			updateFlash(page: Readable<Page>, update?: () => Promise<void>): Promise<boolean>;
		};
		onError?: (event: {
			result: {
				type: 'error';
				status?: number;
				error: App.Error;
			};
			message: Writable<App.PageData['flash']>;
		}) => MaybePromise<unknown | void>;
		cookiePath?: string;
		cookieName?: string;
	};
	warnings: {
		duplicateId?: boolean;
		noValidationAndConstraints?: boolean;
	};

	/**
	 * V1 compatibilty. Sets resetForm = false and taintedMessage = true
	 * Add define: { SUPERFORMS_LEGACY: true } to vite.config.ts to enable globally.
	 */
	legacy: boolean;
}>;

export const defaultOnError = (event: { result: { error: unknown } }) => {
	console.warn('Unhandled Superform error, use onError event to handle it:', event.result.error);
};

export type SuperFormSnapshot<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
> = SuperValidated<T, M> & { tainted: TaintedFields<T> | undefined };

export type TaintOption = boolean | 'untaint' | 'untaint-all' | 'ignore';

type SuperFormData<T extends Record<string, unknown>> = {
	subscribe: Readable<T>['subscribe'];
	set(this: void, value: T, options?: { taint?: TaintOption }): void;
	update(this: void, updater: Updater<T>, options?: { taint?: TaintOption }): void;
};

type SuperFormErrors<T extends Record<string, unknown>> = {
	subscribe: Writable<ValidationErrors<T>>['subscribe'];
	set(this: void, value: ValidationErrors<T>, options?: { force?: boolean }): void;
	update(this: void, updater: Updater<ValidationErrors<T>>, options?: { force?: boolean }): void;
	clear: () => void;
};

export type SuperForm<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
> = {
	form: SuperFormData<T>;
	formId: Writable<string | undefined>;
	errors: SuperFormErrors<T>;
	constraints: Writable<SuperValidated<T, M>['constraints']>;
	message: Writable<SuperValidated<T, M>['message']>;
	tainted: Writable<TaintedFields<T> | undefined>;

	submitting: Readable<boolean>;
	delayed: Readable<boolean>;
	timeout: Readable<boolean>;
	posted: Readable<boolean>;

	allErrors: Readable<{ path: string; messages: string[] }[]>;

	options: FormOptions<T, M>;

	enhance: (
		el: HTMLFormElement,
		events?: SuperFormEvents<T, M>
	) => ReturnType<typeof svelteKitEnhance>;

	reset: (
		options?: Partial<{
			keepMessage: boolean;
			data: Partial<T>;
			id: string;
		}>
	) => void;

	capture: () => SuperFormSnapshot<T, M>;
	restore: (snapshot: SuperFormSnapshot<T, M>) => void;

	validate: typeof validateForm<T>;
	isTainted: (path?: FormPath<T>) => boolean;
};

/**
 * Validate current form data.
 */
export function validateForm<T extends Record<string, unknown>>(): Promise<SuperValidated<T>>;

/**
 * Validate a specific field in the form.
 */
export function validateForm<
	T extends Record<string, unknown>,
	Path extends FormPathLeaves<T> = FormPathLeaves<T>
>(path: Path, opts?: ValidateOptions<FormPathType<T, Path>>): Promise<string[] | undefined>;

export function validateForm<
	T extends Record<string, unknown>,
	Path extends FormPathLeaves<T> = FormPathLeaves<T>
>(path?: Path, opts?: ValidateOptions<FormPathType<T, Path>>) {
	// See the validate function inside superForm for implementation.
	throw new SuperFormError('validateForm can only be used as superForm.validate.');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return { path, opts } as any;
}

export type ValidateOptions<V> = Partial<{
	value: V;
	update: boolean | 'errors' | 'value';
	taint: TaintOption;
	errors: string | string[];
}>;
