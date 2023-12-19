import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import type { Page } from '@sveltejs/kit';
import type { Readable, Writable, Updater } from 'svelte/store';
import type { TaintedFields, SuperValidated, Validators } from '../index.js';
import type { MaybePromise } from '../index.js';
import type { FormPathLeaves, FormPathType } from '../stringPath.js';
//import type { formEnhance, SuperFormEvents } from './formEnhance.js';
import type { Schema } from '@decs/typeschema';

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

export {
	superValidate,
	//superValidateSync,
	//actionResult,
	message,
	setMessage,
	setError
	//defaultValues
} from '../superValidate.js';

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
	taintedMessage: string | false | null;
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
	validators: false | Validators<T> | Schema;
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
}>;

export const defaultOnError = (event: { result: { error: unknown } }) => {
	console.warn('Unhandled Superform error, use onError event to handle it:', event.result.error);
};

/*
const defaultFormOptions = {
	applyAction: true,
	invalidateAll: true,
	resetForm: false,
	autoFocusOnError: 'detect',
	scrollToError: 'smooth',
	errorSelector: '[aria-invalid="true"],[data-invalid]',
	selectErrorText: false,
	stickyNavbar: undefined,
	taintedMessage: 'Do you want to leave this page? Changes you made may not be saved.',
	onSubmit: undefined,
	onResult: undefined,
	onUpdate: undefined,
	onUpdated: undefined,
	onError: defaultOnError,
	dataType: 'form',
	validators: undefined,
	defaultValidator: 'keep',
	customValidity: false,
	clearOnSubmit: 'errors-and-message',
	delayMs: 500,
	timeoutMs: 8000,
	multipleSubmits: 'prevent',
	validation: undefined,
	SPA: undefined,
	validateMethod: 'auto'
};
*/

type SuperFormSnapshot<
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

export type SuperForm<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
> = {
	form: SuperFormData<T>;
	formId: Writable<string | undefined>;
	errors: Writable<SuperValidated<T, M>['errors']> & {
		clear: () => void;
	};
	constraints: Writable<SuperValidated<T, M>['constraints']>;
	message: Writable<SuperValidated<T, M>['message']>;
	tainted: Writable<TaintedFields<T> | undefined>;

	submitting: Readable<boolean>;
	delayed: Readable<boolean>;
	timeout: Readable<boolean>;
	posted: Readable<boolean>;

	allErrors: Readable<{ path: string; messages: string[] }[]>;

	options: FormOptions<T, M>;

	enhance: (el: HTMLFormElement, events?: SuperFormEvents<T, M>) => ReturnType<typeof formEnhance>;

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
};

///// clientValidation.ts /////

export async function validateForm<T extends Record<string, unknown>>(
	path: FormPathLeaves<T>,
	opts?: ValidateOptions<FormPathType<T, FormPathLeaves<T>>>
): Promise<string[] | undefined> {
	return undefined;
}

export type ValidateOptions<V> = Partial<{
	value: V;
	update: boolean | 'errors' | 'value';
	taint: TaintOption;
	errors: string | string[];
}>;

///// formEnhance.ts /////

// TODO: add formEnhance signature
const formEnhance = () => {
	return undefined as any;
};

export type SuperFormEvents<T extends Record<string, unknown>, M> = Pick<
	FormOptions<T, M>,
	'onError' | 'onResult' | 'onSubmit' | 'onUpdate' | 'onUpdated'
>;
