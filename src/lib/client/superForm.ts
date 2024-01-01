import {
	SuperFormError,
	type SuperValidated,
	type TaintedFields,
	type ValidationErrors
} from '$lib/index.js';
import type { ActionResult, Page } from '@sveltejs/kit';
import type {
	FormOptions,
	FormUpdate,
	SuperForm,
	SuperFormEventList,
	SuperFormEvents,
	SuperFormSnapshot,
	TaintOption,
	ValidateOptions
} from './index.js';
import { derived, get, readonly, writable, type Readable } from 'svelte/store';
import { page } from '$app/stores';
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
import { beforeNavigate, invalidateAll } from '$app/navigation';
import { flattenErrors, updateErrors } from '$lib/errors.js';
import { clientValidation } from './clientValidation.js';
import { cancelFlash, shouldSyncFlash } from './flash.js';
import { applyAction, enhance } from '$app/forms';
import { setCustomValidityForm, updateCustomValidity } from './customValidity.js';
import { isImmediateInput } from './elements.js';
import { Form as HtmlForm } from './form.js';
import { stringify } from 'devalue';

type ValidationResponse<
	Success extends Record<string, unknown> | undefined = Record<
		string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		any
	>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	Invalid extends Record<string, unknown> | undefined = Record<string, any>
> = { result: ActionResult<Success, Invalid> };

type ChangeEvent = {
	paths: (string | number | symbol)[][];
	immediate?: boolean;
	type?: 'input' | 'blur' | 'submit';
	formEl?: HTMLFormElement;
};

const formIds = new WeakMap<Page, Set<string | undefined>>();
const initialForms = new WeakMap<object, SuperValidated<Record<string, unknown>, unknown>>();

export const defaultOnError = (event: { result: { error: unknown } }) => {
	console.warn('Unhandled Superform error, use onError event to handle it:', event.result.error);
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
	defaultValidator: 'keep',
	customValidity: false,
	clearOnSubmit: 'errors-and-message',
	delayMs: 500,
	timeoutMs: 8000,
	multipleSubmits: 'prevent',
	validation: undefined,
	SPA: undefined,
	validationMethod: 'auto'
};

function multipleFormIdError(id: string | undefined) {
	return (
		`Duplicate form id's found: "${id}". ` +
		'Multiple forms will receive the same data. Use the id option to differentiate between them, ' +
		'or if this is intended, set the warnings.duplicateId option to false in superForm to disable this warning. ' +
		'More information: https://superforms.rocks/concepts/multiple-forms'
	);
}

/**
 * Initializes a SvelteKit form, for convenient handling of values, errors and sumbitting data.
 * @param {SuperValidated} form Usually data.form from PageData.
 * @param {FormOptions} options Configuration for the form.
 * @returns {SuperForm} An object with properties for the form.
 * @DCI-context
 */
export function superForm<
	T extends Record<string, unknown> = Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message
>(form: SuperValidated<T, M> | T, options: FormOptions<T, M> = {}): SuperForm<T, M> {
	// Used in reset
	let initialForm: SuperValidated<T, M>;

	{
		// Option guards

		// TODO: Global legacy mode
		if (options.resetForm === undefined) options.resetForm = false;
		if (options.taintedMessage === undefined) options.taintedMessage = true;

		if (options.legacy) {
			if (options.resetForm === undefined) options.resetForm = false;
			if (options.taintedMessage === undefined) options.taintedMessage = true;
		}

		options = {
			...(defaultFormOptions as FormOptions<T, M>),
			...options
		};

		if (options.SPA && options.validators === undefined) {
			console.warn(
				'No validators set for superForm in SPA mode. ' +
					'Add them to the validators option, or set it to false to disable this warning.'
			);
		}

		if (!form) {
			throw new SuperFormError(
				'No form data sent to superForm. ' +
					"Make sure the output from superValidate is used (usually data.form) and that it's not null or undefined. " +
					'Alternatively, an object with default values for the form can also be used.'
			);
		}

		if (!Context_isValidationObject(form)) {
			form = {
				id: '',
				valid: false,
				posted: false,
				errors: {},
				data: form as T,
				constraints: {}
			} satisfies SuperValidated<T, M>;
		}

		form = form as SuperValidated<T, M>;

		// Check multiple id's
		const _initialFormId = options.id ?? form.id;
		const _currentPage = get(page);

		if (options.warnings?.duplicateId !== false) {
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
			initialForms.set(form, clone(form));
		}
		initialForm = initialForms.get(form) as SuperValidated<T, M>;

		if (typeof initialForm.valid !== 'boolean') {
			throw new SuperFormError(
				'A non-validation object was passed to superForm. ' +
					'It should be an object of type SuperValidated, usually returned from superValidate.'
			);
		}

		// Detect if a form is posted without JavaScript.
		if (!browser && _currentPage.form && typeof _currentPage.form === 'object') {
			const postedData = _currentPage.form;
			for (const postedForm of Context_findValidationForms(postedData).reverse()) {
				if (postedForm.id == _initialFormId && !initialForms.has(postedForm)) {
					// Prevent multiple "posting" that can happen when components are recreated.
					initialForms.set(postedData, postedData);

					const pageDataForm = form as SuperValidated<T, M>;
					form = postedForm as SuperValidated<T, M>;

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
				} else if (!(value instanceof Date)) {
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
		constraints: form.constraints,
		posted: form.posted,
		errors: clone(form.errors),
		message: form.message,
		tainted: undefined as TaintedFields<T> | undefined,
		valid: form.valid,
		submitting: false
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
	 * Return false if object isn't a validation object, otherwise the form id.
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
		set: (value: Parameters<typeof _formData.set>[0], options: { taint?: TaintOption } = {}) => {
			// Need to clone the value, so it won't refer to $page for example.
			const newData = clone(value);
			Tainted_update(newData, options.taint ?? true);
			return _formData.set(newData);
		},
		update: (
			updater: Parameters<typeof _formData.update>[0],
			options: { taint?: TaintOption } = {}
		) => {
			return _formData.update((value) => {
				// No cloning here, since it's an update
				const newData = updater(value);
				Tainted_update(newData, options.taint ?? true);
				return newData;
			});
		}
	};

	async function Form_validate() {
		return await clientValidation(
			options.validators,
			Data.form,
			Data.formId,
			Data.constraints,
			false
		);
	}

	async function Form_clientValidation(event: ChangeEvent | null) {
		if (!event || !options.validators) return;

		if (options.validationMethod == 'submit-only' && event.type != 'submit') return;
		if (options.validationMethod == 'onblur' && event.type == 'input') return;
		if (options.validationMethod == 'oninput' && event.type == 'blur') return;

		if (event.type == 'blur' && event.immediate) {
			console.log('Immediate event, skipping blur validation');
			return;
		}

		const result = await Form_validate();

		if (result.valid) {
			console.log(
				'🚀 ~ file: superForm.ts:372 ~ Form_clientValidation ~ updating data:',
				result.data
			);
			Form.set(result.data, { taint: 'ignore' });
		}

		if (options.validationMethod != 'auto' && options.validationMethod) {
			return Errors.set(result.errors);
		}

		// Wait for tainted, so object errors can be displayed
		await tick();

		Form__displayNewErrors(result.errors, event);
	}

	async function Form__displayNewErrors(errors: ValidationErrors<T>, event: ChangeEvent) {
		const { type, immediate, paths } = event;
		const previous = Data.errors;
		const output: Record<string, unknown> = {};

		const validity = new Map<string, { el: HTMLElement; message: string }>();

		if (options.customValidity && event.formEl) {
			for (const path of event.paths) {
				const name = CSS.escape(mergePath(path));
				const el = event.formEl.querySelector<HTMLElement>(`[name="${name}"]`);
				if (el) {
					const message = 'validationMessage' in el ? String(el.validationMessage) : '';
					validity.set(path.join(), { el, message });
					updateCustomValidity(el, undefined);
				}
			}
		}

		traversePaths(errors, (error) => {
			if (!Array.isArray(error.value)) return;

			const joinedPath = error.path.join();
			const isEventError = error.value && paths.map((path) => path.join()).includes(joinedPath);

			function addError() {
				//console.log('Adding error', `[${error.path.join('.')}]`, error.value);
				setPaths(output, [error.path], error.value);

				if (options.customValidity && isEventError && validity.has(joinedPath)) {
					const { el, message } = validity.get(joinedPath)!;

					if (message != error.value) {
						updateCustomValidity(el, error.value);
						validity.clear();
					}
				}
			}

			const previousError = pathExists(previous, error.path);

			// TODO: What to do if path doesn't exist?

			// If previous error exist, always display
			if (previousError && previousError.key in previousError.parent) {
				return addError();
			}

			const isObjectError = error.path[error.path.length - 1] == '_errors';
			if (isObjectError) {
				// Form-level errors should always be displayed
				if (error.path.length == 1) return addError();

				// New object errors should be displayed if the (parent) path is or has been tainted
				if (Tainted_hasBeenTainted(mergePath(error.path.slice(0, -1)) as FormPath<T>)) {
					return addError();
				}
				return;
			}

			if (type == 'blur' && isEventError) {
				return addError();
			}
		});

		Errors.set(output as ValidationErrors<T>);
	}

	function Form_set(data: T, options: { taint?: TaintOption } = {}) {
		return Form.set(data, options);
	}

	async function Form_updateFromValidation(form: SuperValidated<T, M>, untaint: boolean) {
		if (
			form.valid &&
			untaint &&
			options.resetForm &&
			(options.resetForm === true || options.resetForm())
		) {
			Form_reset(form.message);
		} else {
			rebind(form, untaint);
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

	function Form_reset(message?: M, data?: Partial<T>, id?: string) {
		const resetData = clone(initialForm);
		resetData.data = { ...resetData.data, ...data };
		if (id !== undefined) resetData.id = id;

		rebind(resetData, true, message);
	}

	const Form_updateFromActionResult: FormUpdate = async (result, untaint?: boolean) => {
		if (result.type == ('error' as string)) {
			throw new SuperFormError(
				`ActionResult of type "${result.type}" cannot be passed to update function.`
			);
		}

		if (result.type == 'redirect') {
			// All we need to do if redirected is to reset the form.
			// No events should be triggered because technically we're somewhere else.
			if (options.resetForm && (options.resetForm === true || options.resetForm())) {
				Form_reset();
			}
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
				newForm as SuperValidated<T, M>,
				untaint ?? (result.status >= 200 && result.status < 300)
			);
		}
	};

	//#endregion

	const Message = writable<M | undefined>(form.message);
	const Constraints = writable(form.constraints);
	const Posted = writable(false);

	//#region Errors

	const _errors = writable(form.errors);
	// eslint-disable-next-line dci-lint/grouped-rolemethods
	const Errors = {
		subscribe: _errors.subscribe,
		set(value: Parameters<typeof _errors.set>[0]) {
			return _errors.set(updateErrors(value, Data.errors));
		},
		update(updater: Parameters<typeof _errors.update>[0]) {
			return _errors.update((value) => {
				return updateErrors(updater(value), Data.errors);
			});
		},
		/**
		 * To work with client-side validation, errors cannot be deleted but must
		 * be set to undefined, to know where they existed before (tainted+error check in oninput)
		 */
		clear: () => undefined
	};

	//#endregion

	//#region NextChange /////

	let NextChange: ChangeEvent | null = null;

	function NextChange_addValidationEvent(event: ChangeEvent) {
		// TODO: What to do with more than one path (programmically updated)

		NextChange = event;
		// Wait for on:input to provide additional information
		setTimeout(() => Form_clientValidation(NextChange), 0);
	}

	function NextChange_additionalEventInformation(
		event: NonNullable<ChangeEvent['type']>,
		immediate: boolean,
		formEl: HTMLFormElement
	) {
		if (NextChange === null) {
			throw new SuperFormError('NextChange is null');
		}

		NextChange.type = event;
		NextChange.immediate = immediate;
		NextChange.formEl = formEl;
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
		state: writable<TaintedFields<T> | undefined>(),
		message: options.taintedMessage,
		clean: clone(form.data) // Important to clone form.data, so it's not comparing the same object,
	};

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

	function Tainted_isTainted(path?: FormPath<T>): boolean {
		if (!Data.tainted) return false;
		if (!path) return Tainted__isObjectTainted(Data.tainted);

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

	function Tainted_update(newData: T, taintOptions: TaintOption) {
		// Ignore is set when returning errors from the server
		// so status messages and form-level errors won't be
		// immediately cleared by client-side validation.
		if (taintOptions == 'ignore') return [];

		let paths = comparePaths(newData, Data.form);
		//console.log("🚀 ~ file: superForm.ts:581 ~ Tainted_update ~ paths:", paths)

		if (paths.length) {
			if (taintOptions === 'untaint-all') {
				Tainted.state.set(undefined);
			} else {
				Tainted.state.update((tainted) => {
					if (taintOptions !== true && tainted) {
						// Check if the paths are tainted already, then set to undefined or skip entirely.
						const _tainted = tainted;
						paths = paths.filter((path) => pathExists(_tainted, path));
						if (paths.length) {
							if (!tainted) tainted = {};
							setPaths(tainted, paths, (_, data) => {
								if (taintOptions == 'untaint') return undefined;
								return data.value;
							});
						}
					} else if (taintOptions === true) {
						if (!tainted) tainted = {};
						setPaths(tainted, paths, (path) => {
							// If value goes back to the clean value, untaint the path
							const currentValue = traversePath(newData, path);
							const cleanPath = traversePath(Tainted.clean, path);
							return currentValue && cleanPath && currentValue.value === cleanPath.value
								? undefined
								: true;
						});
					}
					return tainted;
				});
			}
		}

		NextChange_addValidationEvent({ paths });
	}

	function Tainted_set(tainted: TaintedFields<T> | undefined, newClean: T | undefined) {
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
		Submitting.subscribe((submitting) => (__data.submitting = submitting))
	];

	function Unsubscriptions_add(func: () => void) {
		Unsubscriptions.push(func);
	}

	function Unsubscriptions_unsubscribe() {
		Unsubscriptions.forEach((unsub) => unsub());
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
	function rebind(form: SuperValidated<T, M>, untaint: TaintedFields<T> | boolean, message?: M) {
		console.log('🚀 ~ file: superForm.ts:721 ~ rebind ~ form:', form.data);

		if (untaint) {
			Tainted_set(typeof untaint === 'boolean' ? undefined : untaint, form.data);
		}

		message = message ?? form.message;

		// Form data is not tainted when rebinding.
		// Prevents object errors from being revalidated after rebind.
		Form_set(form.data, { taint: 'ignore' });
		Message.set(message);
		Errors.set(form.errors);
		FormId.set(form.id);
		Posted.set(form.posted);
		// Only allowed non-subscribe __data access, in rebind
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

	if (browser) {
		// Tainted check
		const defaultMessage = 'Do you want to leave this page? Changes you made may not be saved.';
		beforeNavigate((nav) => {
			if (options.taintedMessage && !Data.submitting) {
				if (
					Tainted_isTainted() &&
					!window.confirm(options.taintedMessage === true ? defaultMessage : options.taintedMessage)
				) {
					nav.cancel();
				}
			}
		});

		// Need to subscribe to catch page invalidation.
		Unsubscriptions_add(
			page.subscribe(async (pageUpdate) => {
				if (!options.applyAction) return;

				// Strange timing issue in SPA mode forces a wait here,
				// otherwise errors will appear even if the form is valid
				// when pressing enter to submit the form (not when clicking a submit button!)
				if (options.SPA) {
					await new Promise((r) => setTimeout(r, 0));
				}

				const untaint = pageUpdate.status >= 200 && pageUpdate.status < 300;

				if (pageUpdate.form && typeof pageUpdate.form === 'object') {
					const actionData = pageUpdate.form;

					// Check if it is an error result, sent here from formEnhance
					if (actionData.type == 'error') return;

					const forms = Context_findValidationForms(actionData);
					for (const newForm of forms) {
						//console.log('🚀~ ActionData ~ newForm:', newForm.id);
						if (newForm.id !== Data.formId || initialForms.has(newForm)) {
							continue;
						}

						// Prevent multiple "posting" that can happen when components are recreated.
						initialForms.set(newForm, newForm);

						await Form_updateFromValidation(newForm as SuperValidated<T, M>, untaint);
					}
				} else if (pageUpdate.data && typeof pageUpdate.data === 'object') {
					// It's a page reload, redirect or error/failure,
					// so don't trigger any events, just update the data.
					const forms = Context_findValidationForms(pageUpdate.data);
					for (const newForm of forms) {
						//console.log('🚀 ~ PageData ~ newForm:', newForm.id);
						if (newForm.id !== Data.formId || initialForms.has(newForm)) {
							continue;
						}

						rebind(newForm as SuperValidated<T, M>, untaint);
					}
				}
			})
		);
	}

	async function validate<Path extends FormPathLeaves<T>>(
		path?: Path,
		opts: ValidateOptions<FormPathType<T, Path>> = {}
	) {
		if (path === undefined) return Form_validate();

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

		const result = await clientValidation(
			options.validators,
			data,
			Data.formId,
			Data.constraints,
			false
		);

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
	}

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

		options,

		capture() {
			return {
				valid: Data.valid,
				posted: Data.posted,
				errors: Data.errors,
				data: Data.form,
				constraints: Data.constraints,
				message: Data.message,
				id: Data.formId,
				tainted: Data.tainted
			};
		},

		restore(snapshot: SuperFormSnapshot<T, M>) {
			return rebind(snapshot, snapshot.tainted ?? true);
		},

		validate: validate,

		allErrors: AllErrors,
		posted: Posted,

		reset(options?) {
			return Form_reset(
				options?.keepMessage ? Data.message : undefined,
				options?.data,
				options?.id
			);
		},

		isTainted: Tainted_isTainted,

		// @DCI-context
		enhance(FormEl: HTMLFormElement, events?: SuperFormEvents<T, M>) {
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

			// Now we know that we are enhanced,
			// so we can enable the tainted form option.
			Tainted_enable();

			let lastInputChange: ChangeEvent['paths'] | undefined;

			// TODO: Debounce?
			async function onInput(e: Event) {
				const immediateUpdate = isImmediateInput(e.target);
				// Need to wait for immediate updates due to some timing issue
				if (immediateUpdate) await new Promise((r) => setTimeout(r, 0));

				lastInputChange = NextChange_paths();
				NextChange_additionalEventInformation('input', immediateUpdate, FormEl);
			}

			async function onBlur(e: Event) {
				// Avoid triggering client-side validation while submitting
				if (Data.submitting) return;

				if (!lastInputChange || NextChange_paths() != lastInputChange) {
					return;
				}

				const immediateUpdate = isImmediateInput(e.target);
				// Need to wait for immediate updates due to some timing issue
				if (immediateUpdate) await new Promise((r) => setTimeout(r, 0));

				Form_clientValidation({
					paths: lastInputChange,
					immediate: immediateUpdate,
					type: 'blur',
					formEl: FormEl
				});

				lastInputChange == null;
			}

			FormEl.addEventListener('focusout', onBlur);
			FormEl.addEventListener('input', onInput);

			onDestroy(() => {
				FormEl.removeEventListener('focusout', onBlur);
				FormEl.removeEventListener('input', onInput);
			});

			///// SvelteKit enhance function //////////////////////////////////

			const htmlForm = HtmlForm(
				FormEl,
				{ submitting: Submitting, delayed: Delayed, timeout: Timeout },
				options
			);

			let currentRequest: AbortController | null;

			return enhance(FormEl, async (submit) => {
				const _submitCancel = submit.cancel;

				let cancelled = false;
				function cancel(resetTimers = true) {
					cancelled = true;
					if (resetTimers && htmlForm.isSubmitting()) {
						htmlForm.completed(true);
					}
					return _submitCancel();
				}
				submit.cancel = cancel;

				if (htmlForm.isSubmitting() && options.multipleSubmits == 'prevent') {
					cancel(false);
				} else {
					if (htmlForm.isSubmitting() && options.multipleSubmits == 'abort') {
						if (currentRequest) currentRequest.abort();
					}
					htmlForm.submitting();
					currentRequest = submit.controller;

					for (const event of formEvents.onSubmit) {
						await event(submit);
					}
				}

				if (cancelled) {
					if (options.flashMessage) cancelFlash(options);
				} else {
					// Client validation
					const noValidate =
						!options.SPA &&
						(FormEl.noValidate ||
							((submit.submitter instanceof HTMLButtonElement ||
								submit.submitter instanceof HTMLInputElement) &&
								submit.submitter.formNoValidate));

					let validation: SuperValidated<T> | undefined = undefined;

					if (!noValidate) {
						validation = await Form_validate();

						if (!validation.valid) {
							cancel(false);

							const result = {
								type: 'failure' as const,
								status:
									(typeof options.SPA === 'boolean' ? undefined : options.SPA?.failStatus) ?? 400,
								data: { form: validation }
							};

							setTimeout(() => validationResponse({ result }), 0);
						}
					}

					if (!cancelled) {
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

						if (
							options.flashMessage &&
							(options.clearOnSubmit == 'errors-and-message' ||
								options.clearOnSubmit == 'message') &&
							shouldSyncFlash(options)
						) {
							options.flashMessage.module.getFlash(page).set(undefined);
						}

						// Deprecation fix
						const submitData =
							'formData' in submit ? submit.formData : (submit as { data: FormData }).data;

						if (options.SPA) {
							cancel(false);
							if (!validation) validation = await Form_validate();

							const validationResult = { ...validation, posted: true };

							const result = {
								type: validationResult.valid ? 'success' : 'failure',
								status: validationResult.valid
									? 200
									: typeof options.SPA == 'object'
										? options.SPA?.failStatus
										: 400 ?? 400,
								data: { form: validationResult }
							} as ActionResult;

							setTimeout(() => validationResponse({ result }), 0);
						} else if (options.dataType === 'json') {
							if (!validation) validation = await Form_validate();

							const postData = validation.data;
							const chunks = chunkSubstr(stringify(postData), options.jsonChunkSize ?? 500000);

							for (const chunk of chunks) {
								submitData.append('__superform_json', chunk);
							}

							// Clear post data to reduce transfer size,
							// since $form should be serialized and sent as json.
							Object.keys(postData).forEach((key) => {
								// Files should be kept though, even if same key.
								if (typeof submitData.get(key) === 'string') {
									submitData.delete(key);
								}
							});
						}

						if (!options.SPA && !submitData.has('__superform_id')) {
							// Add formId
							const id = Data.formId;
							if (id !== undefined) submitData.set('__superform_id', id);
						}
					}
				}

				// Thanks to https://stackoverflow.com/a/29202760/70894
				function chunkSubstr(str: string, size: number) {
					const numChunks = Math.ceil(str.length / size);
					const chunks = new Array(numChunks);

					for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
						chunks[i] = str.substring(o, o + size);
					}

					return chunks;
				}

				async function validationResponse(event: ValidationResponse) {
					// Check if an error was thrown in hooks, in which case it has no type.
					const result: ActionResult = event.result.type
						? event.result
						: {
								type: 'error',
								status: 500,
								error: event.result
							};

					currentRequest = null;
					let cancelled = false;

					const data = {
						result,
						formEl: FormEl,
						cancel: () => (cancelled = true)
					};

					for (const event of formEvents.onResult) {
						await event(data);
					}

					if (!cancelled) {
						if ((result.type === 'success' || result.type == 'failure') && result.data) {
							const forms = Context_findValidationForms(result.data);
							if (!forms.length) {
								throw new SuperFormError(
									'No form data returned from ActionResult. Make sure you return { form } in the form actions.'
								);
							}

							for (const newForm of forms) {
								if (newForm.id !== Data.formId) continue;

								const data = {
									form: newForm as SuperValidated<T>,
									formEl: FormEl,
									cancel: () => (cancelled = true)
								};

								for (const event of formEvents.onUpdate) {
									await event(data);
								}

								if (!cancelled && options.customValidity) {
									setCustomValidityForm(FormEl, data.form.errors);
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
								// Error result
								if (options.applyAction) {
									if (options.onError == 'apply') {
										await applyAction(result);
									} else {
										// Transform to failure, to avoid data loss
										// Set the data to the error result, so it will be
										// picked up in page.subscribe in superForm.
										const failResult = {
											type: 'failure',
											status: Math.floor(result.status || 500),
											data: result
										} as const;
										await applyAction(failResult);
									}
								}

								// Check if the error message should be replaced
								if (options.onError !== 'apply') {
									const data = { result, message: Message };

									for (const onErrorEvent of formEvents.onError) {
										if (
											onErrorEvent !== 'apply' &&
											(onErrorEvent != defaultOnError || !options.flashMessage?.onError)
										) {
											await onErrorEvent(data);
										}
									}
								}
							}

							// Trigger flash message event if there was an error
							if (options.flashMessage) {
								if (result.type == 'error' && options.flashMessage.onError) {
									await options.flashMessage.onError({
										result,
										message: options.flashMessage.module.getFlash(page)
									});
								}
							}
						}
					}

					if (cancelled && options.flashMessage) {
						cancelFlash(options);
					}

					// Redirect messages are handled in onDestroy and afterNavigate in client/form.ts.
					// Also fixing an edge case when timers weren't resetted when redirecting to the same route.
					if (cancelled || result.type != 'redirect') {
						htmlForm.completed(cancelled);
					} else if (
						result.type == 'redirect' &&
						new URL(
							result.location,
							/^https?:\/\//.test(result.location) ? undefined : document.location.origin
						).pathname == document.location.pathname
					) {
						// Checks if beforeNavigate have been called in client/form.ts.
						setTimeout(() => {
							htmlForm.completed(true, true);
						}, 0);
					}
				}

				return validationResponse;
			});
		}
	};
}
