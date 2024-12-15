/* eslint-disable dci-lint/atomic-role-binding */
import type { TaintedFields, SuperFormValidated, SuperValidated } from '$lib/superValidate.js';
import type { ActionResult, BeforeNavigate, Page, SubmitFunction, Transport } from '@sveltejs/kit';
import {
	derived,
	get,
	readonly,
	writable,
	type Readable,
	type Writable,
	type Updater
} from 'svelte/store';
import { navigating, page } from '$app/stores';
import { clone } from '$lib/utils.js';
import { browser } from '$app/environment';
import { onDestroy, tick } from 'svelte';
import { comparePaths, pathExists, setPaths, traversePath, traversePaths } from '$lib/traversal.js';
import {
	splitPath,
	type FormPathType,
	mergePath,
	type FormPath,
	type FormPathLeaves
} from '$lib/stringPath.js';
import { beforeNavigate, goto, invalidateAll } from '$app/navigation';
import { SuperFormError, flattenErrors, mapErrors, updateErrors } from '$lib/errors.js';
import { cancelFlash, shouldSyncFlash } from './flash.js';
import { applyAction, deserialize, enhance as kitEnhance } from '$app/forms';
import { setCustomValidityForm, updateCustomValidity } from './customValidity.js';
import { inputInfo } from './elements.js';
import { Form as HtmlForm, scrollToFirstError } from './form.js';
import { stringify } from 'devalue';
import type { ValidationErrors } from '$lib/superValidate.js';
import type { IsAny, MaybePromise } from '$lib/utils.js';
import type {
	ClientValidationAdapter,
	ValidationAdapter,
	ValidationResult
} from '$lib/adapters/adapters.js';
import type { InputConstraints } from '$lib/jsonSchema/constraints.js';
import { fieldProxy, type ProxyOptions } from './proxies.js';
import { shapeFromObject } from '$lib/jsonSchema/schemaShape.js';

export type SuperFormEvents<T extends Record<string, unknown>, M> = Pick<
	FormOptions<T, M>,
	'onError' | 'onResult' | 'onSubmit' | 'onUpdate' | 'onUpdated'
>;

export type SuperFormEventList<T extends Record<string, unknown>, M> = {
	[Property in keyof SuperFormEvents<T, M>]-?: NonNullable<SuperFormEvents<T, M>[Property]>[];
};

type FilterType<T, Check> = {
	[K in keyof NonNullable<T> as NonNullable<NonNullable<T>[K]> extends Check
		? never
		: K]: NonNullable<T>[K];
};
/**
 * Helper type for making ActionResult data strongly typed in onUpdate.
 * @example const action : FormResult<ActionData> = result.data;
 */
export type FormResult<T extends Record<string, unknown> | null | undefined> = FilterType<
	T,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	SuperValidated<Record<string, unknown>, any, Record<string, unknown>>
>;

export type TaintOption = boolean | 'untaint' | 'untaint-all' | 'untaint-form';

type ValidatorsOption<T extends Record<string, unknown>> =
	| ValidationAdapter<Partial<T>, Record<string, unknown>>
	| false
	| 'clear';

// Need to distribute T with "T extends T",
// since SuperForm<A|B> is not the same as SuperForm<A> | SuperForm<B>
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
export type FormOptions<
	T extends Record<string, unknown> = Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = any,
	In extends Record<string, unknown> = T
> = Partial<{
	id: string;
	applyAction: boolean;
	invalidateAll: boolean | 'force';
	resetForm: boolean | (() => boolean);
	scrollToError: 'auto' | 'smooth' | 'off' | boolean | ScrollIntoViewOptions;
	autoFocusOnError: boolean | 'detect';
	errorSelector: string;
	selectErrorText: boolean;
	stickyNavbar: string;
	taintedMessage: string | boolean | null | (() => MaybePromise<boolean>);
	/**
	 * Enable single page application (SPA) mode.
	 * **The string and failStatus options are deprecated** and will be removed in the next major release.
	 * @see https://superforms.rocks/concepts/spa
	 */
	SPA: true | /** @deprecated */ string | /** @deprecated */ { failStatus?: number };

	onSubmit: (
		input: Parameters<SubmitFunction>[0] & {
			/**
			 * If dataType: 'json' is set, send this data instead of $form when posting,
			 * and client-side validation for $form passes.
			 * @param data An object that can be serialized with devalue.
			 */
			jsonData: (data: Record<string, unknown>) => void;
			/**
			 * Override client validation temporarily for this form submission.
			 */
			validators: (validators: Exclude<ValidatorsOption<T>, 'clear'>) => void;
			/**
			 * Use a custom fetch or XMLHttpRequest implementation for this form submission. It must return an ActionResult in the response body.
			 * If the request is using a XMLHttpRequest, the promise must be resolved when the request has been completed, not before.
			 */
			customRequest: (
				validators: (
					input: Parameters<SubmitFunction>[0]
				) => Promise<Response | XMLHttpRequest | ActionResult>
			) => void;
		}
	) => MaybePromise<unknown | void>;
	onResult: (event: {
		result: ActionResult;
		/**
		 * @deprecated Use formElement instead
		 */
		formEl: HTMLFormElement;
		formElement: HTMLFormElement;
		cancel: () => void;
	}) => MaybePromise<unknown | void>;
	onUpdate: (event: {
		form: SuperValidated<T, M, In>;
		/**
		 * @deprecated Use formElement instead
		 */
		formEl: HTMLFormElement;
		formElement: HTMLFormElement;
		cancel: () => void;
		result: Required<Extract<ActionResult, { type: 'success' | 'failure' }>>;
	}) => MaybePromise<unknown | void>;
	onUpdated: (event: { form: Readonly<SuperValidated<T, M, In>> }) => MaybePromise<unknown | void>;
	onError:
		| 'apply'
		| ((event: {
				result: {
					type: 'error';
					status?: number;
					error: App.Error | Error | { message: string };
				};
		  }) => MaybePromise<unknown | void>);
	onChange: (event: ChangeEvent<T>) => void;

	dataType: 'form' | 'json';
	jsonChunkSize: number;
	// TODO: Use NoInfer<T> on ClientValidationAdapter when available, so T can be used instead of Partial<T>
	validators: ClientValidationAdapter<Partial<T>, Record<string, unknown>> | ValidatorsOption<T>;
	validationMethod: 'auto' | 'oninput' | 'onblur' | 'onsubmit' | 'submit-only';
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
				error: App.Error | Error | { message: string };
			};
			flashMessage: Writable<App.PageData['flash']>;
		}) => MaybePromise<unknown | void>;
		cookiePath?: string;
		cookieName?: string;
	};
	warnings: {
		duplicateId?: boolean;
	};
	transport: IsAny<Transport> extends true ? never : Transport;

	/**
	 * Version 1 compatibilty mode if true.
	 * Sets resetForm = false and taintedMessage = true.
	 * Add define: { SUPERFORMS_LEGACY: true } to vite.config.ts to enable globally.
	 */
	legacy: boolean;
}>;

export type SuperFormSnapshot<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message,
	In extends Record<string, unknown> = T
> = SuperFormValidated<T, M, In> & { tainted: TaintedFields<T> | undefined };

export type SuperFormData<T extends Record<string, unknown>> = {
	subscribe: Readable<T>['subscribe'];
	set(this: void, value: T, options?: { taint?: TaintOption }): void;
	update(this: void, updater: Updater<T>, options?: { taint?: TaintOption }): void;
};

export type SuperFormErrors<T extends Record<string, unknown>> = {
	subscribe: Writable<ValidationErrors<T>>['subscribe'];
	set(this: void, value: ValidationErrors<T>, options?: { force?: boolean }): void;
	update(this: void, updater: Updater<ValidationErrors<T>>, options?: { force?: boolean }): void;
	clear: () => void;
};

type ResetOptions<T extends Record<string, unknown>> = {
	keepMessage?: boolean;
	data?: Partial<T>;
	newState?: Partial<T>;
	id?: string;
};

// Brackets are required: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
type Capture<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
> = [T] extends [T] ? () => SuperFormSnapshot<T, M> : never;

type Restore<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
> = (snapshot: SuperFormSnapshot<T, M>) => void;

export type SuperForm<
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
> = {
	form: SuperFormData<T>;
	formId: Writable<string>;
	errors: SuperFormErrors<T>;
	constraints: Writable<InputConstraints<T>>;
	message: Writable<M | undefined>;
	tainted: Writable<TaintedFields<T> | undefined>;

	submitting: Readable<boolean>;
	delayed: Readable<boolean>;
	timeout: Readable<boolean>;
	/**
	 * @deprecated posted is inconsistent between server and client validation, and SPA mode. Will be removed in v3. Use a status message or return your own data in the form action to handle form post status.
	 */
	posted: Readable<boolean>;

	allErrors: Readable<{ path: string; messages: string[] }[]>;

	options: T extends T ? FormOptions<T, M> : never; // Need this to distribute T so it works with unions

	enhance: (el: HTMLFormElement, events?: SuperFormEvents<T, M>) => ReturnType<typeof kitEnhance>;
	isTainted: (path?: FormPath<T> | Record<string, unknown> | boolean | undefined) => boolean;
	reset: (options?: ResetOptions<T>) => void;
	submit: (submitter?: HTMLElement | Event | EventTarget | null) => void;

	capture: Capture<T, M>;
	restore: T extends T ? Restore<T, M> : never;

	validate: <
		Out extends Partial<T> = T,
		Path extends FormPathLeaves<T> = FormPathLeaves<T>,
		In extends Record<string, unknown> = Record<string, unknown>
	>(
		path: Path,
		opts?: ValidateOptions<FormPathType<T, Path>, Out, In>
	) => Promise<string[] | undefined>;

	validateForm: <
		Out extends Partial<T> = T,
		In extends Record<string, unknown> = Record<string, unknown>
	>(opts?: {
		update?: boolean;
		schema?: ValidationAdapter<Out, In>;
		focusOnError?: boolean;
	}) => Promise<SuperFormValidated<T, M, In>>;
};

export type ValidateOptions<
	Value,
	Out extends Record<string, unknown>,
	In extends Record<string, unknown>
> = Partial<{
	value: Value;
	update: boolean | 'errors' | 'value';
	taint: TaintOption;
	errors: string | string[];
	schema: ValidationAdapter<Out, In>;
}>;

export type ChangeEvent<T extends Record<string, unknown>> =
	| {
			path: FormPath<T>;
			paths: FormPath<T>[];
			formElement: HTMLFormElement;
			target: Element;
			set: <Path extends FormPath<T>>(
				path: Path,
				value: FormPathType<T, Path>,
				options?: ProxyOptions
			) => void;
			get: <Path extends FormPath<T>>(path: Path) => FormPathType<T, Path>;
	  }
	| {
			target: undefined;
			paths: FormPath<T>[];
			set: <Path extends FormPath<T>>(
				path: Path,
				value: FormPathType<T, Path>,
				options?: ProxyOptions
			) => void;
			get: <Path extends FormPath<T>>(path: Path) => FormPathType<T, Path>;
	  };

type FullChangeEvent = {
	paths: (string | number | symbol)[][];
	immediate?: boolean;
	multiple?: boolean;
	type?: 'input' | 'blur';
	formElement?: HTMLFormElement;
	target?: EventTarget;
};

type FormDataOptions = Partial<{
	taint: TaintOption | 'ignore';
	keepFiles: boolean;
}>;

const formIds = new WeakMap<Page, Set<string | undefined>>();
const initialForms = new WeakMap<
	object,
	SuperValidated<Record<string, unknown>, unknown, Record<string, unknown>>
>();

const defaultOnError = (event: { result: { error: unknown } }) => {
	throw event.result.error;
};

const defaultFormOptions = {
	applyAction: true,
	invalidateAll: true,
	resetForm: true,
	autoFocusOnError: 'detect',
	scrollToError: 'smooth',
	errorSelector: '[aria-invalid="true"],[data-invalid]',
	selectErrorText: false,
	stickyNavbar: undefined,
	taintedMessage: false,
	onSubmit: undefined,
	onResult: undefined,
	onUpdate: undefined,
	onUpdated: undefined,
	onError: defaultOnError,
	dataType: 'form',
	validators: undefined,
	customValidity: false,
	clearOnSubmit: 'message',
	delayMs: 500,
	timeoutMs: 8000,
	multipleSubmits: 'prevent',
	SPA: undefined,
	validationMethod: 'auto'
} satisfies FormOptions;

function multipleFormIdError(id: string | undefined) {
	return (
		`Duplicate form id's found: "${id}". ` +
		'Multiple forms will receive the same data. Use the id option to differentiate between them, ' +
		'or if this is intended, set the warnings.duplicateId option to false in superForm to disable this warning. ' +
		'More information: https://superforms.rocks/concepts/multiple-forms'
	);
}

/////////////////////////////////////////////////////////////////////

/**
 * V1 compatibilty. resetForm = false and taintedMessage = true
 */
let LEGACY_MODE = false;

try {
	// @ts-expect-error Vite define check
	if (SUPERFORMS_LEGACY) LEGACY_MODE = true;
} catch {
	// No legacy mode defined
}

/**
 * Storybook compatibility mode, basically disables the navigating store.
 */
let STORYBOOK_MODE = false;

try {
	// @ts-expect-error Storybook check
	if (globalThis.STORIES) STORYBOOK_MODE = true;
} catch {
	// No Storybook
}

/////////////////////////////////////////////////////////////////////

/**
 * Initializes a SvelteKit form, for convenient handling of values, errors and sumbitting data.
 * @param {SuperValidated} form Usually data.form from PageData or defaults, but can also be an object with default values, but then constraints won't be available.
 * @param {FormOptions} formOptions Configuration for the form.
 * @returns {SuperForm} A SuperForm object that can be used in a Svelte component.
 * @DCI-context
 */
export function superForm<
	T extends Record<string, unknown> = Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message,
	In extends Record<string, unknown> = T
>(form: SuperValidated<T, M, In> | T, formOptions?: FormOptions<T, M, In>): SuperForm<T, M> {
	// Used in reset
	let initialForm: SuperValidated<T, M, In>;
	let options = formOptions ?? ({} as FormOptions<T, M, In>);
	// To check if a full validator is used when switching options.validators dynamically
	let initialValidator: FormOptions<T, M, In>['validators'] | undefined = undefined;

	{
		if (options.legacy ?? LEGACY_MODE) {
			if (options.resetForm === undefined) options.resetForm = false;
			if (options.taintedMessage === undefined) options.taintedMessage = true;
		}

		if (STORYBOOK_MODE) {
			if (options.applyAction === undefined) options.applyAction = false;
		}

		if (typeof options.SPA === 'string') {
			// SPA action mode is "passive", no page updates are made.
			if (options.invalidateAll === undefined) options.invalidateAll = false;
			if (options.applyAction === undefined) options.applyAction = false;
		}

		initialValidator = options.validators;

		options = {
			...defaultFormOptions,
			...options
		};

		if (
			(options.SPA === true || typeof options.SPA === 'object') &&
			options.validators === undefined
		) {
			console.warn(
				'No validators set for superForm in SPA mode. ' +
					'Add a validation adapter to the validators option, or set it to false to disable this warning.'
			);
		}

		if (!form) {
			throw new SuperFormError(
				'No form data sent to superForm. ' +
					"Make sure the output from superValidate is used (usually data.form) and that it's not null or undefined. " +
					"Alternatively, an object with default values for the form can also be used, but then constraints won't be available."
			);
		}

		if (Context_isValidationObject(form) === false) {
			form = {
				id: options.id ?? Math.random().toString(36).slice(2, 10),
				valid: false,
				posted: false,
				errors: {},
				data: form as T,
				shape: shapeFromObject(form)
			} satisfies SuperValidated<T, M, In>;
		}

		form = form as SuperValidated<T, M, In>;

		// Assign options.id to form, if it exists
		const _initialFormId = (form.id = options.id ?? form.id);
		const _currentPage = get(page) ?? (STORYBOOK_MODE ? {} : undefined);

		// Check multiple id's
		if (browser && options.warnings?.duplicateId !== false) {
			if (!formIds.has(_currentPage)) {
				formIds.set(_currentPage, new Set([_initialFormId]));
			} else {
				const currentForms = formIds.get(_currentPage);
				if (currentForms?.has(_initialFormId)) {
					console.warn(multipleFormIdError(_initialFormId));
				} else {
					currentForms?.add(_initialFormId);
				}
			}
		}

		/**
		 * Need to clone the form data, in case it's used to populate multiple forms
		 * and in components that are mounted and destroyed multiple times.
		 * This also means that it needs to be set here, before it's cloned further below.
		 */
		if (!initialForms.has(form)) {
			initialForms.set(form, form);
		}
		initialForm = initialForms.get(form) as SuperValidated<T, M, In>;

		// Detect if a form is posted without JavaScript.
		if (!browser && _currentPage.form && typeof _currentPage.form === 'object') {
			const postedData = _currentPage.form;
			for (const postedForm of Context_findValidationForms(postedData).reverse()) {
				if (postedForm.id == _initialFormId && !initialForms.has(postedForm)) {
					// Prevent multiple "posting" that can happen when components are recreated.
					initialForms.set(postedData, postedData);

					const pageDataForm = form as SuperValidated<T, M, In>;

					// Add the missing fields from the page data form
					form = postedForm as SuperValidated<T, M, In>;
					form.constraints = pageDataForm.constraints;
					form.shape = pageDataForm.shape;

					// Reset the form if option set and form is valid.
					if (
						form.valid &&
						options.resetForm &&
						(options.resetForm === true || options.resetForm())
					) {
						form = clone(pageDataForm);
						form.message = clone(postedForm.message);
					}
					break;
				}
			}
		} else {
			form = clone(initialForm);
		}

		///// From here, form is properly initialized /////

		onDestroy(() => {
			Unsubscriptions_unsubscribe();
			NextChange_clear();
			EnhancedForm_destroy();

			for (const events of Object.values(formEvents)) {
				events.length = 0;
			}

			formIds.get(_currentPage)?.delete(_initialFormId);
		});

		// Check for nested objects, throw if datatype isn't json
		if (options.dataType !== 'json') {
			const checkForNestedData = (key: string, value: unknown) => {
				if (!value || typeof value !== 'object') return;

				if (Array.isArray(value)) {
					if (value.length > 0) checkForNestedData(key, value[0]);
				} else if (
					!(value instanceof Date) &&
					!(value instanceof File) &&
					(!browser || !(value instanceof FileList))
				) {
					throw new SuperFormError(
						`Object found in form field "${key}". ` +
							`Set the dataType option to "json" and add use:enhance to use nested data structures. ` +
							`More information: https://superforms.rocks/concepts/nested-data`
					);
				}
			};

			for (const [key, value] of Object.entries(form.data)) {
				checkForNestedData(key, value);
			}
		}
	}

	///// Roles ///////////////////////////////////////////////////////

	//#region Data

	/**
	 * Container for store data, subscribed to with Unsubscriptions
	 * to avoid "get" usage.
	 */
	const __data = {
		formId: form.id,
		form: clone(form.data),
		constraints: form.constraints ?? {},
		posted: form.posted,
		errors: clone(form.errors),
		message: clone(form.message),
		tainted: undefined as TaintedFields<T> | undefined,
		valid: form.valid,
		submitting: false,
		shape: form.shape
	};

	const Data: Readonly<typeof __data> = __data;

	//#endregion

	//#region FormId

	const FormId = writable<string>(options.id ?? form.id);

	//#endregion

	//#region Context

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const Context = {};

	function Context_findValidationForms(data: Record<string, unknown>) {
		const forms = Object.values(data).filter(
			(v) => Context_isValidationObject(v) !== false
		) as SuperValidated<Record<string, unknown>>[];
		return forms;
	}

	/**
	 * Return false if object isn't a validation object, otherwise the form id,
	 * which can be an empty string, so always check with === false
	 */
	function Context_isValidationObject(object: unknown): string | false {
		if (!object || typeof object !== 'object') return false;

		if (!('valid' in object && 'errors' in object && typeof object.valid === 'boolean')) {
			return false;
		}

		return 'id' in object && typeof object.id === 'string' ? object.id : false;
	}

	//#endregion

	//#region Form

	// eslint-disable-next-line dci-lint/grouped-rolemethods
	const _formData = writable(form.data);
	const Form = {
		subscribe: _formData.subscribe,
		set: (value: Parameters<typeof _formData.set>[0], options: FormDataOptions = {}) => {
			// Need to clone the value, so it won't refer to $page for example.
			const newData = clone(value);
			Tainted_update(newData, options.taint ?? true);
			return _formData.set(newData);
		},
		update: (updater: Parameters<typeof _formData.update>[0], options: FormDataOptions = {}) => {
			return _formData.update((value) => {
				// No cloning here, since it's an update
				const newData = updater(value);
				Tainted_update(newData, options.taint ?? true);
				return newData;
			});
		}
	};

	function Form_isSPA() {
		return options.SPA === true || typeof options.SPA === 'object';
	}

	function Form_resultStatus(defaultStatus: number) {
		if (defaultStatus > 400) return defaultStatus;
		return (
			(typeof options.SPA === 'boolean' || typeof options.SPA === 'string'
				? undefined
				: options.SPA?.failStatus) || defaultStatus
		);
	}

	async function Form_validate(
		opts: {
			adapter?: FormOptions<T, M>['validators'];
			recheckValidData?: boolean;
			formData?: Record<string, unknown>;
		} = {}
	): Promise<SuperFormValidated<T, M, In>> {
		const dataToValidate = opts.formData ?? Data.form;

		let errors: ValidationErrors<T> = {};
		let status: ValidationResult<Partial<T>>;
		const validator = opts.adapter ?? options.validators;

		if (typeof validator == 'object') {
			// Checking for full validation with the jsonSchema field (doesn't exist in client validators).
			if (validator != initialValidator && !('jsonSchema' in validator)) {
				throw new SuperFormError(
					'Client validation adapter found in options.validators. ' +
						'A full adapter must be used when changing validators dynamically, for example "zod" instead of "zodClient".'
				);
			}

			status = await /* @__PURE__ */ validator.validate(dataToValidate);

			if (!status.success) {
				errors = mapErrors(
					status.issues,
					validator.shape ?? Data.shape ?? {}
				) as ValidationErrors<T>;
			} else if (opts.recheckValidData !== false) {
				// need to make an additional validation, in case the data has been transformed
				return Form_validate({ ...opts, recheckValidData: false });
			}
		} else {
			status = { success: true, data: {} };
		}

		const data: T = { ...Data.form, ...dataToValidate, ...(status.success ? status.data : {}) };

		return {
			valid: status.success,
			posted: false,
			errors,
			data,
			constraints: Data.constraints,
			message: undefined,
			id: Data.formId,
			shape: Data.shape
		};
	}

	function Form__changeEvent(event: FullChangeEvent) {
		if (!options.onChange || !event.paths.length || event.type == 'blur') return;

		let changeEvent: ChangeEvent<T>;
		const paths = event.paths.map(mergePath) as FormPath<T>[];

		if (
			event.type &&
			event.paths.length == 1 &&
			event.formElement &&
			event.target instanceof Element
		) {
			changeEvent = {
				path: paths[0],
				paths,
				formElement: event.formElement,
				target: event.target,
				set(path, value, options?) {
					// Casting trick to make it think it's a SuperForm
					fieldProxy({ form: Form } as SuperForm<T>, path, options).set(value);
				},
				get(path) {
					return get(fieldProxy<T, typeof path>(Form, path));
				}
			};
		} else {
			changeEvent = {
				paths,
				target: undefined,
				set(path, value, options?) {
					// Casting trick to make it think it's a SuperForm
					fieldProxy({ form: Form } as SuperForm<T>, path, options).set(value);
				},
				get(path) {
					return get(fieldProxy<T, typeof path>(Form, path));
				}
			};
		}

		options.onChange(changeEvent);
	}

	/**
	 * Make a client-side validation, updating the form data if successful.
	 * @param event A change event, from html input or programmatically
	 * @param force Is true if called from validateForm with update: true
	 * @param adapter ValidationAdapter, if called from validateForm with schema set
	 * @returns SuperValidated, or undefined if options prevented validation.
	 */
	async function Form_clientValidation(
		event: FullChangeEvent | null,
		force = false,
		adapter?: ValidationAdapter<Partial<T>>
	) {
		if (event) {
			if (options.validators == 'clear') {
				Errors.update(($errors) => {
					setPaths($errors, event.paths, undefined);
					return $errors;
				});
			}

			setTimeout(() => Form__changeEvent(event));
		}

		let skipValidation = false;

		if (!force) {
			if (options.validationMethod == 'onsubmit' || options.validationMethod == 'submit-only') {
				skipValidation = true;
			} else if (options.validationMethod == 'onblur' && event?.type == 'input')
				skipValidation = true;
			else if (options.validationMethod == 'oninput' && event?.type == 'blur')
				skipValidation = true;
		}

		if (skipValidation || !event || !options.validators || options.validators == 'clear') {
			if (event?.paths) {
				const formElement = event?.formElement ?? EnhancedForm_get();
				if (formElement) Form__clearCustomValidity(formElement);
			}
			return;
		}

		const result = await Form_validate({ adapter });

		// TODO: Add option for always setting result.data?
		if (result.valid && (event.immediate || event.type != 'input')) {
			Form.set(result.data, { taint: 'ignore' });
		}

		// Wait for tainted, so object errors can be displayed
		await tick();
		Form__displayNewErrors(result.errors, event, force);

		return result;
	}

	function Form__clearCustomValidity(formElement: HTMLFormElement) {
		const validity = new Map<string, { el: HTMLElement; message: string }>();
		if (options.customValidity && formElement) {
			for (const el of formElement.querySelectorAll<HTMLElement & { name: string }>(`[name]`)) {
				if (typeof el.name !== 'string' || !el.name.length) continue;
				const message = 'validationMessage' in el ? String(el.validationMessage) : '';
				validity.set(el.name, { el, message });
				updateCustomValidity(el, undefined);
			}
		}
		return validity;
	}

	async function Form__displayNewErrors(
		errors: ValidationErrors<T>,
		event: FullChangeEvent,
		force: boolean
	) {
		const { type, immediate, multiple, paths } = event;
		const previous = Data.errors;

		const output: Record<string, unknown> = {};
		let validity = new Map<string, { el: HTMLElement; message: string }>();

		const formElement = event.formElement ?? EnhancedForm_get();
		if (formElement) validity = Form__clearCustomValidity(formElement);

		traversePaths(errors, (error) => {
			if (!Array.isArray(error.value)) return;

			const currentPath = [...error.path];
			if (currentPath[currentPath.length - 1] == '_errors') {
				currentPath.pop();
			}

			const joinedPath = currentPath.join('.');

			function addError() {
				//console.log('Adding error', `[${error.path.join('.')}]`, error.value); //debug
				setPaths(output, [error.path], error.value);

				if (options.customValidity && isEventError && validity.has(joinedPath)) {
					const { el, message } = validity.get(joinedPath)!;

					if (message != error.value) {
						setTimeout(() => updateCustomValidity(el, error.value));
						// Only need one error to display
						validity.clear();
					}
				}
			}

			if (force) return addError();

			const lastPath = error.path[error.path.length - 1];
			const isObjectError = lastPath == '_errors';

			const isEventError =
				error.value &&
				paths.some((path) => {
					// If array/object, any part of the path can match. If not, exact match is required
					return isObjectError
						? currentPath && path && currentPath.length > 0 && currentPath[0] == path[0]
						: joinedPath == path.join('.');
				});

			if (isEventError && options.validationMethod == 'oninput') return addError();

			// Immediate, non-multiple input should display the errors
			if (immediate && !multiple && isEventError) return addError();

			// Special case for multiple, which should display errors on blur
			// or if any error has existed previously. Tricky UX.
			if (multiple) {
				// For multi-select, if any error has existed, display all errors
				const errorPath = pathExists(get(Errors), error.path.slice(0, -1));
				if (errorPath?.value && typeof errorPath?.value == 'object') {
					for (const errors of Object.values(errorPath.value)) {
						if (Array.isArray(errors)) {
							return addError();
						}
					}
				}
			}

			// If previous error exist, always display
			const previousError = pathExists(previous, error.path);
			if (previousError && previousError.key in previousError.parent) {
				return addError();
			}

			if (isObjectError) {
				// New object errors should be displayed on blur events,
				// or the (parent) path is or has been tainted.
				if (
					options.validationMethod == 'oninput' ||
					(type == 'blur' &&
						Tainted_hasBeenTainted(mergePath(error.path.slice(0, -1)) as FormPath<T>))
				) {
					return addError();
				}
			} else {
				// Display text errors on blur, if the event matches the error path
				// Also, display errors if the error is in an array an it has been tainted.
				if (
					type == 'blur' &&
					isEventError
					//|| (isErrorInArray &&	Tainted_hasBeenTainted(mergePath(error.path.slice(0, -1)) as FormPath<T>))
				) {
					return addError();
				}
			}
		});

		Errors.set(output as ValidationErrors<T>);
	}

	function Form_set(data: T, options: FormDataOptions = {}) {
		// Check if file fields should be kept, usually when the server returns them as undefined.
		// in that case remove the undefined field from the new data.
		if (options.keepFiles) {
			traversePaths(Data.form, (info) => {
				if (
					(!browser || !(info.parent instanceof FileList)) &&
					(info.value instanceof File || (browser && info.value instanceof FileList))
				) {
					const dataPath = pathExists(data, info.path);
					if (!dataPath || !(dataPath.key in dataPath.parent)) {
						setPaths(data, [info.path], info.value);
					}
				}
			});
		}
		return Form.set(data, options);
	}

	function Form_shouldReset(validForm: boolean, successActionResult: boolean) {
		return (
			validForm &&
			successActionResult &&
			options.resetForm &&
			(options.resetForm === true || options.resetForm())
		);
	}

	function Form_capture(removeFilesfromData = true): SuperFormSnapshot<T, M, In> {
		let data = Data.form;
		let tainted = Data.tainted;

		if (removeFilesfromData) {
			const removed = removeFiles(Data.form);
			data = removed.data;
			const paths = removed.paths;

			if (paths.length) {
				tainted = clone(tainted) ?? {};
				setPaths(tainted, paths, false);
			}
		}

		return {
			valid: Data.valid,
			posted: Data.posted,
			errors: Data.errors,
			data,
			constraints: Data.constraints,
			message: Data.message,
			id: Data.formId,
			tainted,
			shape: Data.shape
		};
	}

	async function Form_updateFromValidation(form: SuperValidated<T, M, In>, successResult: boolean) {
		if (form.valid && successResult && Form_shouldReset(form.valid, successResult)) {
			Form_reset({ message: form.message, posted: true });
		} else {
			rebind({
				form,
				untaint: successResult,
				keepFiles: true,
				// Check if the form data should be used for updating, or if the invalidateAll load function should be used:
				skipFormData: options.invalidateAll == 'force'
			});
		}

		// onUpdated may check stores, so need to wait for them to update.
		if (formEvents.onUpdated.length) {
			await tick();
		}

		// But do not await on onUpdated itself, since we're already finished with the request
		for (const event of formEvents.onUpdated) {
			event({ form });
		}
	}

	function Form_reset(
		opts: Omit<ResetOptions<T>, 'keepMessage'> & {
			message?: M;
			posted?: boolean;
		} = {}
	) {
		if (opts.newState) initialForm.data = { ...initialForm.data, ...opts.newState };

		const resetData = clone(initialForm);
		resetData.data = { ...resetData.data, ...opts.data };
		if (opts.id !== undefined) resetData.id = opts.id;

		rebind({
			form: resetData,
			untaint: true,
			message: opts.message,
			keepFiles: false,
			posted: opts.posted,
			resetted: true
		});
	}

	async function Form_updateFromActionResult(result: Exclude<ActionResult, { type: 'error' }>) {
		if (result.type == ('error' as string)) {
			throw new SuperFormError(
				`ActionResult of type "${result.type}" cannot be passed to update function.`
			);
		}

		if (result.type == 'redirect') {
			// All we need to do if redirected is to reset the form.
			// No events should be triggered because technically we're somewhere else.
			if (Form_shouldReset(true, true)) Form_reset({ posted: true });
			return;
		}

		if (typeof result.data !== 'object') {
			throw new SuperFormError('Non-object validation data returned from ActionResult.');
		}

		const forms = Context_findValidationForms(result.data);
		if (!forms.length) {
			throw new SuperFormError(
				'No form data returned from ActionResult. Make sure you return { form } in the form actions.'
			);
		}

		for (const newForm of forms) {
			if (newForm.id !== Data.formId) continue;
			await Form_updateFromValidation(
				newForm as SuperValidated<T, M, In>,
				result.status >= 200 && result.status < 300
			);
		}
	}

	//#endregion

	const Message = writable<M | undefined>(__data.message);
	const Constraints = writable(__data.constraints);
	const Posted = writable(__data.posted);
	const Shape = writable(__data.shape);

	//#region Errors

	const _errors = writable(form.errors);
	// eslint-disable-next-line dci-lint/grouped-rolemethods
	const Errors = {
		subscribe: _errors.subscribe,
		set(value: Parameters<typeof _errors.set>[0], options?: { force?: boolean }) {
			return _errors.set(updateErrors(value, Data.errors, options?.force));
		},
		update(updater: Parameters<typeof _errors.update>[0], options?: { force?: boolean }) {
			return _errors.update((value) => {
				return updateErrors(updater(value), Data.errors, options?.force);
			});
		},
		/**
		 * To work with client-side validation, errors cannot be deleted but must
		 * be set to undefined, to know where they existed before (tainted+error check in oninput)
		 */
		clear: () => Errors.set({})
	};

	//#endregion

	//#region NextChange /////

	let NextChange: FullChangeEvent | null = null;

	function NextChange_setHtmlEvent(event: FullChangeEvent) {
		// For File inputs, if only paths are available, use that instead of replacing
		// (fileProxy updates causes this)
		if (
			NextChange &&
			event &&
			Object.keys(event).length == 1 &&
			event.paths?.length &&
			NextChange.target &&
			NextChange.target instanceof HTMLInputElement &&
			NextChange.target.type.toLowerCase() == 'file'
		) {
			NextChange.paths = event.paths;
		} else {
			NextChange = event;
		}
		// Wait for on:input to provide additional information
		setTimeout(() => {
			Form_clientValidation(NextChange);
		}, 0);
	}

	function NextChange_additionalEventInformation(
		event: NonNullable<FullChangeEvent['type']>,
		immediate: boolean,
		multiple: boolean,
		formElement: HTMLFormElement,
		target: EventTarget | undefined
	) {
		if (NextChange === null) {
			NextChange = { paths: [] };
		}

		NextChange.type = event;
		NextChange.immediate = immediate;
		NextChange.multiple = multiple;
		NextChange.formElement = formElement;
		NextChange.target = target;
	}

	function NextChange_paths() {
		return NextChange?.paths ?? [];
	}

	function NextChange_clear() {
		NextChange = null;
	}

	//#endregion

	//#region Tainted

	const Tainted = {
		defaultMessage: 'Leave page? Changes that you made may not be saved.',
		state: writable<TaintedFields<T> | undefined>(),
		message: options.taintedMessage,
		clean: clone(form.data), // Important to clone form.data, so it's not comparing the same object,
		forceRedirection: false
	};

	function Tainted_isEnabled() {
		return (
			options.taintedMessage && !Data.submitting && !Tainted.forceRedirection && Tainted_isTainted()
		);
	}

	function Tainted_checkUnload(e: BeforeUnloadEvent) {
		if (!Tainted_isEnabled()) return;

		// Chrome requires returnValue to be set
		e.preventDefault();
		e.returnValue = '';

		// Prompt the user
		const { taintedMessage } = options;
		const isTaintedFunction = typeof taintedMessage === 'function';
		const confirmationMessage =
			isTaintedFunction || taintedMessage === true ? Tainted.defaultMessage : taintedMessage;

		(e || window.event).returnValue = confirmationMessage || Tainted.defaultMessage;
		return confirmationMessage;
	}

	async function Tainted_beforeNav(nav: BeforeNavigate) {
		if (!Tainted_isEnabled()) return;

		const { taintedMessage } = options;
		const isTaintedFunction = typeof taintedMessage === 'function';

		// As beforeNavigate does not support Promise, we cancel the redirection until the promise resolve
		// if it's a custom function
		if (isTaintedFunction) nav.cancel();

		// Does not display any dialog on page refresh or closing tab, will use Tainted_checkUnload
		if (nav.type === 'leave') {
			return;
		}

		const message =
			isTaintedFunction || taintedMessage === true ? Tainted.defaultMessage : taintedMessage;

		let shouldRedirect;
		try {
			// - rejected => shouldRedirect = false
			// - resolved with false => shouldRedirect = false
			// - resolved with true => shouldRedirect = true
			shouldRedirect = isTaintedFunction
				? await taintedMessage()
				: window.confirm(message || Tainted.defaultMessage);
		} catch {
			shouldRedirect = false;
		}

		if (shouldRedirect && nav.to) {
			try {
				Tainted.forceRedirection = true;
				await goto(nav.to.url, { ...nav.to.params });
				return;
			} finally {
				// Reset forceRedirection for multiple-tainted purpose
				Tainted.forceRedirection = false;
			}
		} else if (!shouldRedirect && !isTaintedFunction) {
			nav.cancel();
		}
	}

	function Tainted_enable() {
		options.taintedMessage = Tainted.message;
	}

	function Tainted_currentState() {
		return Tainted.state;
	}

	function Tainted_hasBeenTainted(path?: FormPath<T>): boolean {
		if (!Data.tainted) return false;
		if (!path) return !!Data.tainted;
		const field = pathExists(Data.tainted, splitPath(path));
		return !!field && field.key in field.parent;
	}

	function Tainted_isTainted(
		path?: FormPath<T> | Record<string, unknown> | boolean | undefined
	): boolean {
		if (!arguments.length) return Tainted__isObjectTainted(Data.tainted);

		if (typeof path === 'boolean') return path;
		if (typeof path === 'object') return Tainted__isObjectTainted(path);
		if (!Data.tainted || path === undefined) return false;

		const field = pathExists(Data.tainted, splitPath(path));
		return Tainted__isObjectTainted(field?.value);
	}

	function Tainted__isObjectTainted(obj: unknown): boolean {
		if (!obj) return false;

		if (typeof obj === 'object') {
			for (const obj2 of Object.values(obj)) {
				if (Tainted__isObjectTainted(obj2)) return true;
			}
		}
		return obj === true;
	}

	/**
	 * Updates the tainted state. Use most of the time, except when submitting.
	 */
	function Tainted_update(newData: T, taintOptions: TaintOption | 'ignore') {
		// Ignore is set when returning errors from the server
		// so status messages and form-level errors won't be
		// immediately cleared by client-side validation.
		if (taintOptions == 'ignore') return;

		const paths = comparePaths(newData, Data.form);
		const newTainted = comparePaths(newData, Tainted.clean).map((path) => path.join());

		if (paths.length) {
			if (taintOptions == 'untaint-all' || taintOptions == 'untaint-form') {
				Tainted.state.set(undefined);
			} else {
				Tainted.state.update((currentlyTainted) => {
					if (!currentlyTainted) currentlyTainted = {};

					setPaths(currentlyTainted, paths, (path, data) => {
						// If value goes back to the clean value, untaint the path
						if (!newTainted.includes(path.join())) return undefined;

						const currentValue = traversePath(newData, path);
						const cleanPath = traversePath(Tainted.clean, path);
						return currentValue && cleanPath && currentValue.value === cleanPath.value
							? undefined
							: taintOptions === true
								? true
								: taintOptions === 'untaint'
									? undefined
									: data.value;
					});

					return currentlyTainted;
				});
			}

			NextChange_setHtmlEvent({ paths });
		}
	}

	/**
	 * Overwrites the current tainted state and setting a new clean state for the form data.
	 * @param tainted
	 * @param newClean
	 */
	function Tainted_set(tainted: TaintedFields<T> | undefined, newClean: T | undefined) {
		// TODO: Is it better to set tainted values to undefined instead of just overwriting?
		Tainted.state.set(tainted);
		if (newClean) Tainted.clean = newClean;
	}

	//#endregion

	//#region Timers

	const Submitting = writable(false);
	const Delayed = writable(false);
	// eslint-disable-next-line dci-lint/grouped-rolemethods
	const Timeout = writable(false);

	//#endregion

	//#region Unsubscriptions

	/**
	 * Subscribe to certain stores and store the current value in Data, to avoid using get.
	 * Need to clone the form data, so it won't refer to the same object and prevent change detection
	 */
	const Unsubscriptions: (() => void)[] = [
		// eslint-disable-next-line dci-lint/private-role-access
		Tainted.state.subscribe((tainted) => (__data.tainted = clone(tainted))),
		// eslint-disable-next-line dci-lint/private-role-access
		Form.subscribe((form) => (__data.form = clone(form))),
		// eslint-disable-next-line dci-lint/private-role-access
		Errors.subscribe((errors) => (__data.errors = clone(errors))),

		FormId.subscribe((id) => (__data.formId = id)),
		Constraints.subscribe((constraints) => (__data.constraints = constraints)),
		Posted.subscribe((posted) => (__data.posted = posted)),
		Message.subscribe((message) => (__data.message = message)),
		Submitting.subscribe((submitting) => (__data.submitting = submitting)),
		Shape.subscribe((shape) => (__data.shape = shape))
	];

	function Unsubscriptions_add(func: () => void) {
		Unsubscriptions.push(func);
	}

	function Unsubscriptions_unsubscribe() {
		Unsubscriptions.forEach((unsub) => unsub());
	}

	//#endregion

	//#region EnhancedForm

	/**
	 * Used for SPA action mode and options.customValidity to display errors, even if programmatically set
	 */
	let EnhancedForm: HTMLFormElement | undefined;

	function EnhancedForm_get() {
		return EnhancedForm;
	}

	function EnhancedForm_createFromSPA(action: string) {
		EnhancedForm = document.createElement('form');
		EnhancedForm.method = 'POST';
		EnhancedForm.action = action;
		superFormEnhance(EnhancedForm);
		document.body.appendChild(EnhancedForm);
	}

	function EnhancedForm_setAction(action: string) {
		if (EnhancedForm) EnhancedForm.action = action;
	}

	function EnhancedForm_destroy() {
		if (EnhancedForm?.parentElement) {
			EnhancedForm.remove();
		}
		EnhancedForm = undefined;
	}

	//#endregion

	const AllErrors: Readable<ReturnType<typeof flattenErrors>> = derived(
		Errors,
		($errors: ValidationErrors<T> | undefined) => ($errors ? flattenErrors($errors) : [])
	);

	///// End of Roles //////////////////////////////////////////////////////////

	// Need to clear this and set it again when use:enhance has run, to avoid showing the
	// tainted dialog when a form doesn't use it or the browser doesn't use JS.
	options.taintedMessage = undefined;

	// Role rebinding
	function rebind(opts: {
		form: SuperValidated<T, M, In>;
		untaint: TaintedFields<T> | boolean;
		message?: M;
		keepFiles?: boolean;
		posted?: boolean;
		skipFormData?: boolean;
		resetted?: boolean;
	}) {
		//console.log('🚀 ~ file: superForm.ts:721 ~ rebind ~ form:', form.data); //debug
		const form = opts.form;
		const message = opts.message ?? form.message;

		if (opts.untaint || opts.resetted) {
			Tainted_set(typeof opts.untaint === 'boolean' ? undefined : opts.untaint, form.data);
		}

		// Form data is not tainted when rebinding.
		// Prevents object errors from being revalidated after rebind.
		// Check if form was invalidated (usually with options.invalidateAll) to prevent data from being
		// overwritten by the load function data
		if (opts.skipFormData !== true) {
			Form_set(form.data, {
				taint: 'ignore',
				keepFiles: opts.keepFiles
			});
		}

		Message.set(message);

		if (opts.resetted) Errors.update(() => ({}), { force: true });
		else Errors.set(form.errors);

		FormId.set(form.id);
		Posted.set(opts.posted ?? form.posted);
		// Constraints and shape will only be set when they exist.
		if (form.constraints) Constraints.set(form.constraints);
		if (form.shape) Shape.set(form.shape);
		// Only allowed non-subscribe __data access, here in rebind
		__data.valid = form.valid;

		if (options.flashMessage && shouldSyncFlash(options)) {
			const flash = options.flashMessage.module.getFlash(page);
			if (message && get(flash) === undefined) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				flash.set(message as any);
			}
		}
	}

	const formEvents: SuperFormEventList<T, M> = {
		onSubmit: options.onSubmit ? [options.onSubmit] : [],
		onResult: options.onResult ? [options.onResult] : [],
		onUpdate: options.onUpdate ? [options.onUpdate] : [],
		onUpdated: options.onUpdated ? [options.onUpdated] : [],
		onError: options.onError ? [options.onError] : []
	};

	///// Store subscriptions ///////////////////////////////////////////////////

	if (browser) {
		// Set up events for tainted check
		window.addEventListener('beforeunload', Tainted_checkUnload);

		onDestroy(() => {
			window.removeEventListener('beforeunload', Tainted_checkUnload);
		});

		beforeNavigate(Tainted_beforeNav);

		// Need to subscribe to catch page invalidation.
		Unsubscriptions_add(
			page.subscribe(async (pageUpdate) => {
				if (STORYBOOK_MODE && pageUpdate === undefined) {
					pageUpdate = { status: 200 } as Page;
				}
				const successResult = pageUpdate.status >= 200 && pageUpdate.status < 300;

				if (options.applyAction && pageUpdate.form && typeof pageUpdate.form === 'object') {
					const actionData = pageUpdate.form;

					// If actionData is an error, it's sent here from triggerOnError
					if (actionData.type === 'error') return;

					for (const newForm of Context_findValidationForms(actionData)) {
						const isInitial = initialForms.has(newForm);

						if (newForm.id !== Data.formId || isInitial) {
							continue;
						}

						// Prevent multiple "posting" that can happen when components are recreated.
						initialForms.set(newForm, newForm);
						await Form_updateFromValidation(newForm as SuperValidated<T, M, In>, successResult);
					}
				} else if (pageUpdate.data && typeof pageUpdate.data === 'object') {
					// It's a page reload, redirect or error/failure,
					// so don't trigger any events, just update the data.
					for (const newForm of Context_findValidationForms(pageUpdate.data)) {
						const isInitial = initialForms.has(newForm);

						if (newForm.id !== Data.formId || isInitial) {
							continue;
						}

						if (options.invalidateAll === 'force') {
							initialForm.data = newForm.data as T;
						}

						const resetStatus = Form_shouldReset(newForm.valid, true);

						rebind({
							form: newForm as SuperValidated<T, M, In>,
							untaint: successResult,
							keepFiles: !resetStatus,
							resetted: resetStatus
						});
					}
				}
			})
		);

		if (typeof options.SPA === 'string') {
			EnhancedForm_createFromSPA(options.SPA);
		}
	}

	/**
	 * Custom use:enhance that enables all the client-side functionality.
	 * @param FormElement
	 * @param events
	 * @DCI-context
	 */
	function superFormEnhance(FormElement: HTMLFormElement, events?: SuperFormEvents<T, M>) {
		if (options.SPA !== undefined && FormElement.method == 'get') FormElement.method = 'post';

		if (typeof options.SPA === 'string') {
			if (options.SPA.length && FormElement.action == document.location.href) {
				FormElement.action = options.SPA;
			}
		} else {
			EnhancedForm = FormElement;
		}

		if (events) {
			if (events.onError) {
				if (options.onError === 'apply') {
					throw new SuperFormError(
						'options.onError is set to "apply", cannot add any onError events.'
					);
				} else if (events.onError === 'apply') {
					throw new SuperFormError('Cannot add "apply" as onError event in use:enhance.');
				}

				formEvents.onError.push(events.onError);
			}
			if (events.onResult) formEvents.onResult.push(events.onResult);
			if (events.onSubmit) formEvents.onSubmit.push(events.onSubmit);
			if (events.onUpdate) formEvents.onUpdate.push(events.onUpdate);
			if (events.onUpdated) formEvents.onUpdated.push(events.onUpdated);
		}

		// Now we know that we are enhanced, we can enable the tainted form option
		// for in-site navigation. Refresh and close tab is handled by window.beforeunload.
		Tainted_enable();

		let lastInputChange: FullChangeEvent['paths'] | undefined;

		// TODO: Debounce option?
		async function onInput(e: Event) {
			const info = inputInfo(e.target);
			// Need to wait for immediate updates due to some timing issue
			if (info.immediate && !info.file) await new Promise((r) => setTimeout(r, 0));

			lastInputChange = NextChange_paths();
			NextChange_additionalEventInformation(
				'input',
				info.immediate,
				info.multiple,
				FormElement,
				e.target ?? undefined
			);
		}

		async function onBlur(e: Event) {
			// Avoid triggering client-side validation while submitting
			if (Data.submitting) return;

			if (!lastInputChange || NextChange_paths() != lastInputChange) {
				return;
			}

			const info = inputInfo(e.target);
			// Need to wait for immediate updates due to some timing issue
			if (info.immediate && !info.file) await new Promise((r) => setTimeout(r, 0));

			Form_clientValidation({
				paths: lastInputChange,
				immediate: info.multiple,
				multiple: info.multiple,
				type: 'blur',
				formElement: FormElement,
				target: e.target ?? undefined
			});

			// Clear input change event, now that the field doesn't have focus anymore.
			lastInputChange = undefined;
		}

		FormElement.addEventListener('focusout', onBlur);
		FormElement.addEventListener('input', onInput);

		onDestroy(() => {
			FormElement.removeEventListener('focusout', onBlur);
			FormElement.removeEventListener('input', onInput);
		});

		///// SvelteKit enhance function //////////////////////////////////

		const htmlForm = HtmlForm(
			FormElement,
			{ submitting: Submitting, delayed: Delayed, timeout: Timeout },
			options
		);

		let currentRequest: AbortController | null;
		let customRequest:
			| ((
					input: Parameters<SubmitFunction>[0]
			  ) => Promise<Response | XMLHttpRequest | ActionResult>)
			| undefined = undefined;

		const enhanced = kitEnhance(FormElement, async (submitParams) => {
			let jsonData: Record<string, unknown> | undefined = undefined;
			let validationAdapter = options.validators;
			undefined;

			const submit = {
				...submitParams,
				jsonData(data: Record<string, unknown>) {
					if (options.dataType !== 'json') {
						throw new SuperFormError("options.dataType must be set to 'json' to use jsonData.");
					}
					jsonData = data;
				},
				validators(adapter: Exclude<ValidatorsOption<T>, 'clear'>) {
					validationAdapter = adapter;
				},
				customRequest(request: typeof customRequest) {
					customRequest = request;
				}
			} satisfies Parameters<NonNullable<FormOptions<T, M>['onSubmit']>>[0];

			const _submitCancel = submit.cancel;
			let cancelled = false;

			function clientValidationResult(validation: SuperFormValidated<T, M, In>) {
				const validationResult = { ...validation, posted: true };

				const status = validationResult.valid ? 200 : Form_resultStatus(400);

				const data = { form: validationResult };

				const result: ActionResult = validationResult.valid
					? { type: 'success', status, data }
					: { type: 'failure', status, data };

				setTimeout(() => validationResponse({ result }), 0);
			}

			function clearOnSubmit() {
				switch (options.clearOnSubmit) {
					case 'errors-and-message':
						Errors.clear();
						Message.set(undefined);
						break;

					case 'errors':
						Errors.clear();
						break;

					case 'message':
						Message.set(undefined);
						break;
				}
			}

			async function triggerOnError(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				result: { type: 'error'; status?: number; error: any },
				status: number
			) {
				// For v3, then return { form } as data in applyAction below:
				//const form: SuperValidated<T, M, In> = Form_capture(false);

				result.status = status;

				// Check if the error message should be replaced
				if (options.onError !== 'apply') {
					const event = { result, message: Message, form };

					for (const onErrorEvent of formEvents.onError) {
						if (
							onErrorEvent !== 'apply' &&
							(onErrorEvent != defaultOnError || !options.flashMessage?.onError)
						) {
							await onErrorEvent(event);
						}
					}
				}

				if (options.flashMessage && options.flashMessage.onError) {
					await options.flashMessage.onError({
						result,
						flashMessage: options.flashMessage.module.getFlash(page)
					});
				}

				if (options.applyAction) {
					if (options.onError == 'apply') {
						await applyAction(result);
					} else {
						// Transform to failure, to avoid data loss
						// Set the data to the error result, so it will be
						// picked up in page.subscribe in superForm.
						await applyAction({
							type: 'failure',
							status: Form_resultStatus(result.status),
							data: result
						});
					}
				}
			}

			function cancel(
				opts: { resetTimers?: boolean } = {
					resetTimers: true
				}
			) {
				cancelled = true;

				if (opts.resetTimers && htmlForm.isSubmitting()) {
					htmlForm.completed({ cancelled });
				}
				return _submitCancel();
			}
			submit.cancel = cancel;

			if (htmlForm.isSubmitting() && options.multipleSubmits == 'prevent') {
				cancel({ resetTimers: false });
			} else {
				if (htmlForm.isSubmitting() && options.multipleSubmits == 'abort') {
					if (currentRequest) currentRequest.abort();
				}
				htmlForm.submitting();
				currentRequest = submit.controller;

				for (const event of formEvents.onSubmit) {
					try {
						await event(submit);
					} catch (error) {
						cancel();
						triggerOnError({ type: 'error', error }, 500);
					}
				}
			}

			if (cancelled && options.flashMessage) cancelFlash(options);

			if (!cancelled) {
				// Client validation
				const noValidate =
					!Form_isSPA() &&
					(FormElement.noValidate ||
						((submit.submitter instanceof HTMLButtonElement ||
							submit.submitter instanceof HTMLInputElement) &&
							submit.submitter.formNoValidate));

				let validation: SuperFormValidated<T, M, In> | undefined = undefined;

				const validateForm = async () => {
					return await Form_validate({ adapter: validationAdapter });
				};

				clearOnSubmit();

				if (!noValidate) {
					validation = await validateForm();

					if (!validation.valid) {
						cancel({ resetTimers: false });
						clientValidationResult(validation);
					}
				}

				if (!cancelled) {
					if (
						options.flashMessage &&
						(options.clearOnSubmit == 'errors-and-message' || options.clearOnSubmit == 'message') &&
						shouldSyncFlash(options)
					) {
						options.flashMessage.module.getFlash(page).set(undefined);
					}

					// Deprecation fix
					const submitData =
						'formData' in submit ? submit.formData : (submit as { data: FormData }).data;

					// Prevent input/blur events to trigger client-side validation,
					// and accidentally removing errors set by setError
					lastInputChange = undefined;

					if (Form_isSPA()) {
						if (!validation) validation = await validateForm();
						cancel({ resetTimers: false });
						clientValidationResult(validation);
					} else if (options.dataType === 'json') {
						if (!validation) validation = await validateForm();

						const postData = clone(jsonData ?? validation.data);

						// Move files to form data, since they cannot be serialized.
						// Will be reassembled in superValidate.
						traversePaths(postData, (data) => {
							if (data.value instanceof File) {
								const key = '__superform_file_' + mergePath(data.path);
								submitData.append(key, data.value);
								return data.set(undefined);
							} else if (
								Array.isArray(data.value) &&
								data.value.length &&
								data.value.every((v) => v instanceof File)
							) {
								const key = '__superform_files_' + mergePath(data.path);
								for (const file of data.value) {
									submitData.append(key, file);
								}
								return data.set(undefined);
							}
						});

						// Clear post data to reduce transfer size,
						// since $form should be serialized and sent as json.
						Object.keys(postData).forEach((key) => {
							// Files should be kept though, even if same key.
							if (typeof submitData.get(key) === 'string') {
								submitData.delete(key);
							}
						});

						const transport = options.transport
							? Object.fromEntries(Object.entries(options.transport).map(([k, v]) => [k, v.encode]))
							: undefined;

						// Split the form data into chunks, in case it gets too large for proxy servers
						const chunks = chunkSubstr(
							stringify(postData, transport),
							options.jsonChunkSize ?? 500000
						);
						for (const chunk of chunks) {
							submitData.append('__superform_json', chunk);
						}
					}

					if (!submitData.has('__superform_id')) {
						// Add formId
						const id = Data.formId;
						if (id !== undefined) submitData.set('__superform_id', id);
					}

					if (typeof options.SPA === 'string') {
						EnhancedForm_setAction(options.SPA);
					}
				}
			}

			///// End of submit interaction ///////////////////////////////////////

			// Thanks to https://stackoverflow.com/a/29202760/70894
			function chunkSubstr(str: string, size: number) {
				const numChunks = Math.ceil(str.length / size);
				const chunks = new Array(numChunks);

				for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
					chunks[i] = str.substring(o, o + size);
				}

				return chunks;
			}

			// event can be a record if an external request was returning JSON,
			// or if it failed parsing the expected JSON.
			async function validationResponse(event: { result: Record<string, unknown> }) {
				let cancelled = false;
				currentRequest = null;

				// Check if an error was thrown in hooks, in which case it has no type.
				let result: ActionResult =
					'type' in event.result && 'status' in event.result
						? (event.result as ActionResult)
						: {
								type: 'error',
								status: Form_resultStatus(parseInt(String(event.result.status)) || 500),
								error: event.result.error instanceof Error ? event.result.error : event.result
							};

				const cancel = () => (cancelled = true);

				const data = {
					result,
					formEl: FormElement,
					formElement: FormElement,
					cancel
				};

				const unsubCheckforNav =
					STORYBOOK_MODE || !Form_isSPA()
						? () => {}
						: navigating.subscribe(($nav) => {
								// Check for goto to a different route in the events
								if (!$nav || $nav.from?.route.id === $nav.to?.route.id) return;
								cancel();
							});

				function setErrorResult(error: unknown, data: { result: ActionResult }, status: number) {
					data.result = {
						type: 'error',
						error,
						status: Form_resultStatus(status)
					};
				}

				for (const event of formEvents.onResult) {
					try {
						await event(data);
					} catch (error) {
						setErrorResult(error, data, Math.max(result.status ?? 500, 400));
					}
				}

				// In case it was modified in the event
				result = data.result;

				if (!cancelled) {
					if ((result.type === 'success' || result.type === 'failure') && result.data) {
						const forms = Context_findValidationForms(result.data);
						if (!forms.length) {
							throw new SuperFormError(
								'No form data returned from ActionResult. Make sure you return { form } in the form actions.'
							);
						}

						for (const newForm of forms) {
							if (newForm.id !== Data.formId) continue;

							const data = {
								form: newForm as SuperValidated<T, M, In>,
								formEl: FormElement,
								formElement: FormElement,
								cancel: () => (cancelled = true),
								result: result as Required<Extract<ActionResult, { type: 'success' | 'failure' }>>
							};

							for (const event of formEvents.onUpdate) {
								try {
									await event(data);
								} catch (error) {
									setErrorResult(error, data, Math.max(result.status ?? 500, 400));
								}
							}

							// In case it was modified in the event
							result = data.result as ActionResult;

							if (!cancelled) {
								if (options.customValidity) {
									setCustomValidityForm(FormElement, data.form.errors);
								}

								// Special reset case for file inputs
								if (Form_shouldReset(data.form.valid, result.type == 'success')) {
									data.formElement
										.querySelectorAll<HTMLInputElement>('input[type="file"]')
										.forEach((e) => (e.value = ''));
								}
							}
						}
					}

					if (!cancelled) {
						if (result.type !== 'error') {
							if (result.type === 'success' && options.invalidateAll) {
								await invalidateAll();
							}

							if (options.applyAction) {
								// This will trigger the page subscription in superForm,
								// which will in turn call Data_update.
								await applyAction(result);
							} else {
								// Call Data_update directly to trigger events
								await Form_updateFromActionResult(result);
							}
						} else {
							await triggerOnError(result, Math.max(result.status ?? 500, 400));
						}
					}
				}

				if (cancelled && options.flashMessage) {
					cancelFlash(options);
				}

				// Redirect messages are handled in onDestroy and afterNavigate in client/form.ts.
				if (cancelled || result.type != 'redirect') {
					htmlForm.completed({ cancelled });
				} else if (STORYBOOK_MODE) {
					htmlForm.completed({ cancelled, clearAll: true });
				} else {
					const unsub = navigating.subscribe(($nav) => {
						if ($nav) return;
						// Timeout required when applyAction is false
						setTimeout(() => {
							try {
								if (unsub) unsub();
							} catch {
								// If component is already destroyed?
							}
						});
						if (htmlForm.isSubmitting()) {
							htmlForm.completed({ cancelled, clearAll: true });
						}
					});
				}

				unsubCheckforNav();
			}

			if (!cancelled && customRequest) {
				_submitCancel();
				const response = await customRequest(submitParams);

				let result: ActionResult;

				if (response instanceof Response) {
					result = deserialize(await response.text());
				} else if (response instanceof XMLHttpRequest) {
					result = deserialize(response.responseText);
				} else {
					result = response;
				}

				if (result.type === 'error') result.status = response.status;
				validationResponse({ result });
			}

			return validationResponse;
		});

		return {
			destroy: () => {
				// Remove only events added in enhance
				for (const [name, events] of Object.entries(formEvents)) {
					// @ts-expect-error formEvents and options have the same keys
					formEvents[name] = events.filter((e) => e === options[name]);
				}

				enhanced.destroy();
			}
		};
	}

	function removeFiles(formData: T) {
		const paths: (string | number | symbol)[][] = [];

		traversePaths(formData, (data) => {
			if (data.value instanceof File) {
				paths.push(data.path);
				return 'skip';
			} else if (
				Array.isArray(data.value) &&
				data.value.length &&
				data.value.every((d) => d instanceof File)
			) {
				paths.push(data.path);
				return 'skip';
			}
		});

		if (!paths.length) return { data: formData, paths };

		const data = clone(formData);
		setPaths(data, paths, (path) => pathExists(initialForm.data, path)?.value);
		return { data, paths };
	}

	///// Return the SuperForm object /////////////////////////////////

	return {
		form: Form,
		formId: FormId,
		errors: Errors,
		message: Message,
		constraints: Constraints,
		tainted: Tainted_currentState(),

		submitting: readonly(Submitting),
		delayed: readonly(Delayed),
		timeout: readonly(Timeout),

		options: options as T extends T ? FormOptions<T, M> : never,

		capture: Form_capture,

		restore: ((snapshot: SuperFormSnapshot<T, M>) => {
			rebind({ form: snapshot, untaint: snapshot.tainted ?? true });
		}) as T extends T ? Restore<T, M> : never,

		async validate(path, opts = {}) {
			if (!options.validators) {
				throw new SuperFormError('options.validators must be set to use the validate method.');
			}

			if (opts.update === undefined) opts.update = true;
			if (opts.taint === undefined) opts.taint = false;
			if (typeof opts.errors == 'string') opts.errors = [opts.errors];

			let data: T;
			const splittedPath = splitPath(path);

			if ('value' in opts) {
				if (opts.update === true || opts.update === 'value') {
					// eslint-disable-next-line dci-lint/private-role-access
					Form.update(
						($form) => {
							setPaths($form, [splittedPath], opts.value);
							return $form;
						},
						{ taint: opts.taint }
					);
					data = Data.form;
				} else {
					data = clone(Data.form);
					setPaths(data, [splittedPath], opts.value);
				}
			} else {
				data = Data.form;
			}

			const result = await Form_validate({ formData: data });
			const error = pathExists(result.errors, splittedPath);

			// Replace with custom error, if it exist
			if (error && error.value && opts.errors) {
				error.value = opts.errors;
			}

			if (opts.update === true || opts.update == 'errors') {
				Errors.update(($errors) => {
					setPaths($errors, [splittedPath], error?.value);
					return $errors;
				});
			}

			return error?.value;
		},

		async validateForm<P extends Partial<T> = T>(
			opts: {
				update?: boolean;
				schema?: ValidationAdapter<P>;
				focusOnError?: boolean;
			} = {}
		): Promise<SuperFormValidated<T, M, In>> {
			if (!options.validators && !opts.schema) {
				throw new SuperFormError(
					'options.validators or the schema option must be set to use the validateForm method.'
				);
			}

			const result = opts.update
				? await Form_clientValidation(
						{ paths: [] },
						true,
						opts.schema as ValidationAdapter<Partial<T>> | undefined
					)
				: Form_validate({ adapter: opts.schema });

			const enhancedForm = EnhancedForm_get();
			if (opts.update && enhancedForm) {
				// Focus on first error field
				setTimeout(() => {
					if (!enhancedForm) return;
					scrollToFirstError(enhancedForm, {
						...options,
						scrollToError: opts.focusOnError === false ? 'off' : options.scrollToError
					});
				}, 1);
			}

			return result || Form_validate({ adapter: opts.schema });
		},

		allErrors: AllErrors,
		posted: Posted,

		reset(options?: ResetOptions<T>) {
			return Form_reset({
				message: options?.keepMessage ? Data.message : undefined,
				data: options?.data,
				id: options?.id,
				newState: options?.newState
			});
		},

		submit(submitter?: HTMLElement | Event | EventTarget | null | undefined) {
			const form = EnhancedForm_get()
				? EnhancedForm_get()
				: submitter && submitter instanceof HTMLElement
					? submitter.closest<HTMLFormElement>('form')
					: undefined;

			if (!form) {
				throw new SuperFormError(
					'use:enhance must be added to the form to use submit, or pass a HTMLElement inside the form (or the form itself) as an argument.'
				);
			}

			if (!form.requestSubmit) {
				return form.submit();
			}

			const isSubmitButton =
				submitter &&
				((submitter instanceof HTMLButtonElement && submitter.type == 'submit') ||
					(submitter instanceof HTMLInputElement && ['submit', 'image'].includes(submitter.type)));

			form.requestSubmit(isSubmitButton ? submitter : undefined);
		},

		isTainted: Tainted_isTainted,

		enhance: superFormEnhance
	} satisfies SuperForm<T, M>;
}
