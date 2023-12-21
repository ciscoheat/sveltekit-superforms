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
import { comparePaths, isInvalidPath, pathExists, setPaths, traversePath } from '$lib/traversal.js';
import { splitPath, type FormPathLeaves, type FormPathType, mergePath } from '$lib/stringPath.js';
import { beforeNavigate, invalidateAll } from '$app/navigation';
import { clearErrors, flattenErrors } from '$lib/errors.js';
import {
	clientValidation,
	validateField,
	validateForm,
	validateObjectErrors
} from './clientValidation.js';
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

const formIds = new WeakMap<Page, Set<string | undefined>>();
const initializedForms = new WeakMap<object, SuperValidated<Record<string, unknown>, unknown>>();

export const defaultOnError = (event: { result: { error: unknown } }) => {
	console.warn('Unhandled Superform error, use onError event to handle it:', event.result.error);
};

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
	// Option guards
	{
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
			constraints: {},
			shape: {}
		} satisfies SuperValidated<T, M>;
	}

	form = form as SuperValidated<T, M>;

	const _initialFormId = options.id ?? form.id;
	const _currentPage = get(page);

	// Check multiple id's
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

	// Need to clone the form data, in case it's used to populate multiple forms and in components
	// that are mounted and destroyed multiple times.
	if (!initializedForms.has(form)) {
		initializedForms.set(form, clone(form));
	}
	const initialForm = initializedForms.get(form) as SuperValidated<T, M>;

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
			if (postedForm.id == _initialFormId && !initializedForms.has(postedForm)) {
				// Prevent multiple "posting" that can happen when components are recreated.
				initializedForms.set(postedData, postedData);

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

	// From here, form is properly initialized

	///// Roles ///////////////////////////////////////////////////////

	/**
	 * Container for store data, subscribed to with Unsubscriptions
	 * to avoid "get" usage.
	 */
	const Data = {
		formId: form.id,
		shape: form.shape,
		form: form.data,
		constraints: form.constraints,
		posted: form.posted,
		errors: form.errors,
		lastChanges: [] as (string | number | symbol)[][],
		message: form.message,
		tainted: undefined as TaintedFields<T> | undefined
	};

	const FormId = writable<string>(options.id ?? form.id);
	const Shape = writable(form.shape);

	const Context = {
		taintedMessage: options.taintedMessage,
		taintedFormState: clone(initialForm.data)
	};

	function Context_randomId(length = 8) {
		return Math.random()
			.toString(36)
			.substring(2, length + 2);
	}

	function Context_setTaintedFormState(data: typeof initialForm.data) {
		Context.taintedFormState = clone(data);
	}

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

	function Context_enableEnhance() {
		options.taintedMessage = Context.taintedMessage;
		if (Data.formId === undefined) FormId.set(Context_randomId());
	}

	function Context_newFormStore(data: T) {
		const _formData = writable(data);
		return {
			subscribe: _formData.subscribe,
			set: (value: Parameters<typeof _formData.set>[0], options: { taint?: TaintOption } = {}) => {
				Tainted_update(value, Context.taintedFormState, options.taint ?? true);

				Context_setTaintedFormState(value);
				// Need to clone the value, so it won't refer to $page for example.
				return _formData.set(clone(value));
			},
			update: (
				updater: Parameters<typeof _formData.update>[0],
				options: { taint?: TaintOption } = {}
			) => {
				return _formData.update((value) => {
					const output = updater(value);
					Tainted_update(output, Context.taintedFormState, options.taint ?? true);

					Context_setTaintedFormState(output);
					// No cloning here, since it's an update
					return output;
				});
			}
		};
	}

	// Stores for the properties of SuperValidated<T, M>
	const Form = Context_newFormStore(form.data);

	function Form_set(data: T, options: { taint?: TaintOption } = {}) {
		return Form.set(data, options);
	}

	// Check for nested objects, throw if datatype isn't json
	function Form_checkForNestedData(key: string, value: unknown) {
		if (!value || typeof value !== 'object') return;

		if (Array.isArray(value)) {
			if (value.length > 0) Form_checkForNestedData(key, value[0]);
		} else if (!(value instanceof Date)) {
			throw new SuperFormError(
				`Object found in form field "${key}". ` +
					`Set the dataType option to "json" and add use:enhance to use nested data structures. ` +
					`More information: https://superforms.rocks/concepts/nested-data`
			);
		}
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

	const LastChanges = writable<(string | number | symbol)[][]>([]);
	const Message = writable<M | undefined>(form.message);
	const Constraints = writable(form.constraints);
	const Posted = writable(false);

	const _errors = writable(form.errors);
	// eslint-disable-next-line dci-lint/grouped-rolemethods
	const Errors = {
		subscribe: _errors.subscribe,
		set: _errors.set,
		update: _errors.update,
		/**
		 * To work with client-side validation, errors cannot be deleted but must
		 * be set to undefined, to know where they existed before (tainted+error check in oninput)
		 */
		clear: () =>
			clearErrors(_errors, {
				undefinePath: null,
				clearFormLevelErrors: true
			})
	};

	const Tainted = writable<TaintedFields<T> | undefined>();

	function Tainted_isTainted(obj: unknown): boolean {
		if (obj === null) throw new SuperFormError('$tainted store contained null');

		if (typeof obj === 'object') {
			for (const obj2 of Object.values(obj)) {
				if (Tainted_isTainted(obj2)) return true;
			}
		}
		return obj === true;
	}

	async function Tainted__validate(path: (string | number | symbol)[], taint: TaintOption) {
		let shouldValidate = options.validationMethod === 'oninput';

		if (!shouldValidate) {
			const errorContent = Data.errors;

			const errorNode = errorContent
				? pathExists(errorContent, path, {
						modifier: (pathData) => {
							// Check if we have found a string in an error array.
							if (isInvalidPath(path, pathData)) {
								throw new SuperFormError(
									'Errors can only be added to form fields, not to arrays or objects in the schema. Path: ' +
										pathData.path.slice(0, -1)
								);
							}

							return pathData.value;
						}
					})
				: undefined;

			// Need a special check here, since if the error has never existed,
			// there won't be a key for the error. But if it existed and was cleared,
			// the key exists with the value undefined.
			const hasError = errorNode && errorNode.key in errorNode.parent;

			shouldValidate = !!hasError;
		}

		if (shouldValidate) {
			await validateField(path, options, Form, Errors, Tainted, { taint });
			return true;
		} else {
			return false;
		}
	}

	async function Tainted_update(
		newObj: unknown,
		compareAgainst: unknown,
		taintOptions: TaintOption
	) {
		// Ignore is set when returning errors from the server
		// so status messages and form-level errors won't be
		// immediately cleared by client-side validation.
		if (taintOptions == 'ignore') return;

		let paths = comparePaths(newObj, compareAgainst);

		LastChanges.set(paths);

		if (paths.length) {
			if (taintOptions === 'untaint-all') {
				Tainted.set(undefined);
			} else {
				Tainted.update((tainted) => {
					if (taintOptions !== true && tainted) {
						// Check if the paths are tainted already, then set to undefined or skip entirely.
						const _tainted = tainted;
						paths = paths.filter((path) => pathExists(_tainted, path));
						if (paths.length) {
							if (!tainted) tainted = {};
							setPaths(tainted, paths, undefined);
						}
					} else if (taintOptions === true) {
						if (!tainted) tainted = {};
						setPaths(tainted, paths, true);
					}
					return tainted;
				});
			}

			if (!(options.validationMethod == 'onblur' || options.validationMethod == 'submit-only')) {
				let updated = false;

				for (const path of paths) {
					updated = updated || (await Tainted__validate(path, taintOptions));
				}
				if (!updated) {
					await validateObjectErrors(options, Form, Errors, Data.tainted);
				}
			}
		}
	}

	function Tainted_set(tainted: TaintedFields<T> | undefined, newData: T) {
		Tainted.set(tainted);
		Context_setTaintedFormState(newData);
	}

	// Subscribe to certain stores and store the current
	// value in Data, to avoid using get
	const Unsubscriptions: (() => void)[] = [
		// eslint-disable-next-line dci-lint/private-role-access
		Tainted.subscribe((tainted) => (Data.tainted = tainted)),
		// eslint-disable-next-line dci-lint/private-role-access
		Form.subscribe((form) => (Data.form = form)),
		FormId.subscribe((id) => (Data.formId = id)),
		Shape.subscribe((shape) => (Data.shape = shape)),
		Constraints.subscribe((constraints) => (Data.constraints = constraints)),
		Posted.subscribe((posted) => (Data.posted = posted)),
		Errors.subscribe((errors) => (Data.errors = errors)),
		LastChanges.subscribe((lastChanges) => (Data.lastChanges = lastChanges)),
		Message.subscribe((message) => (Data.message = message))
	];

	function Unsubscriptions_add(func: () => void) {
		Unsubscriptions.push(func);
	}

	function Unsubscriptions_unsubscribe() {
		Unsubscriptions.forEach((unsub) => unsub());
	}

	// Timers
	const Submitting = writable(false);
	const Delayed = writable(false);
	const Timeout = writable(false);

	const AllErrors: Readable<ReturnType<typeof flattenErrors>> = derived(
		Errors,
		($errors: ValidationErrors<T> | undefined) => ($errors ? flattenErrors($errors) : [])
	);

	//////////////////////////////////////////////////////////////////////

	// Need to clear this and set it after use:enhance has run, to avoid showing the
	// tainted dialog when a form doesn't use it or the browser doesn't use JS.
	options.taintedMessage = undefined;

	onDestroy(() => {
		Unsubscriptions_unsubscribe();

		for (const events of Object.values(formEvents)) {
			events.length = 0;
		}

		formIds.get(_currentPage)?.delete(_initialFormId);
	});

	if (options.dataType !== 'json') {
		for (const [key, value] of Object.entries(form.data)) {
			Form_checkForNestedData(key, value);
		}
	}

	function rebind(form: SuperValidated<T, M>, untaint: TaintedFields<T> | boolean, message?: M) {
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

	///// When use:enhance is enabled ///////////////////////////////////////////

	if (browser) {
		beforeNavigate((nav) => {
			if (options.taintedMessage && !get(Submitting)) {
				if (
					Data.tainted &&
					Tainted_isTainted(Data.tainted) &&
					!window.confirm(options.taintedMessage)
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
						if (newForm.id !== Data.formId || initializedForms.has(newForm)) {
							continue;
						}

						// Prevent multiple "posting" that can happen when components are recreated.
						initializedForms.set(newForm, newForm);

						await Form_updateFromValidation(newForm as SuperValidated<T, M>, untaint);
					}
				} else if (pageUpdate.data && typeof pageUpdate.data === 'object') {
					// It's a page reload, redirect or error/failure,
					// so don't trigger any events, just update the data.
					const forms = Context_findValidationForms(pageUpdate.data);
					for (const newForm of forms) {
						//console.log('🚀 ~ PageData ~ newForm:', newForm.id);
						if (newForm.id !== Data.formId || initializedForms.has(newForm)) {
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
		opts?: ValidateOptions<FormPathType<T, Path>>
	) {
		if (path === undefined) {
			return clientValidation<T, M>(
				options.validators,
				Data.form,
				Data.formId,
				Data.constraints,
				false
			);
		}
		const result = await validateField<T, M>(
			splitPath(path) as string[],
			options,
			Form,
			Errors,
			Tainted,
			opts
		);
		return result.errors;
	}

	return {
		form: Form,
		formId: FormId,
		errors: Errors,
		message: Message,
		constraints: Constraints,
		tainted: Tainted,

		submitting: readonly(Submitting),
		delayed: readonly(Delayed),
		timeout: readonly(Timeout),

		options,

		capture() {
			return {
				valid: initialForm.valid,
				posted: Data.posted,
				errors: Data.errors,
				data: Data.form,
				constraints: Data.constraints,
				message: Data.message,
				id: Data.formId,
				tainted: Data.tainted,
				shape: Data.shape
			};
		},

		restore(snapshot: SuperFormSnapshot<T, M>) {
			return rebind(snapshot, snapshot.tainted ?? true);
		},

		validate: validate as typeof validateForm<T>,

		allErrors: AllErrors,
		posted: Posted,

		reset(options?) {
			return Form_reset(
				options?.keepMessage ? Data.message : undefined,
				options?.data,
				options?.id
			);
		},

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

			// Now we know that we are upgraded, so we can enable the tainted form option.
			Context_enableEnhance();

			// Called upon an event from a HTML element that affects the form.
			async function htmlInputChange(
				change: (string | number | symbol)[],
				event: 'blur' | 'input',
				target: HTMLElement | null
			) {
				if (options.validationMethod == 'submit-only') return;

				//console.log('htmlInputChange', change, event, target);

				const result = await validateField(change, options, Form, Errors, Tainted);

				// Update data if target exists (immediate is set, refactor please)
				if (result.data && target) Form_set(result.data);

				if (options.customValidity) {
					const name = CSS.escape(mergePath(change));
					const el = FormEl.querySelector<HTMLElement>(`[name="${name}"]`);
					if (el) updateCustomValidity(el, event, result.errors, options.validationMethod);
				}
			}

			async function checkBlur(e: Event) {
				if (options.validationMethod == 'oninput' || options.validationMethod == 'submit-only') {
					return;
				}

				// Wait for changes to update
				const immediateUpdate = isImmediateInput(e.target);
				if (immediateUpdate) await new Promise((r) => setTimeout(r, 0));

				const changes = Data.lastChanges;
				if (!changes.length) return;

				const target = e.target instanceof HTMLElement ? e.target : null;

				for (const change of changes) {
					htmlInputChange(change, 'blur', immediateUpdate ? null : target);
				}

				// Clear last changes after blur (not after input)
				LastChanges.set([]);
			}

			async function checkInput(e: Event) {
				if (options.validationMethod == 'onblur' || options.validationMethod == 'submit-only') {
					return;
				}

				// Wait for changes to update
				const immediateUpdate = isImmediateInput(e.target);
				if (immediateUpdate) await new Promise((r) => setTimeout(r, 0));

				const changes = Data.lastChanges;
				if (!changes.length) return;

				const target = e.target instanceof HTMLElement ? e.target : null;

				for (const change of changes) {
					const hadErrors =
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						immediateUpdate || traversePath(Data.errors, change as any);
					if (
						immediateUpdate ||
						(typeof hadErrors == 'object' && hadErrors.key in hadErrors.parent)
					) {
						// Problem - store hasn't updated here with new value yet.
						setTimeout(() => htmlInputChange(change, 'input', immediateUpdate ? target : null), 0);
					}
				}
			}

			FormEl.addEventListener('focusout', checkBlur);
			FormEl.addEventListener('input', checkInput);

			onDestroy(() => {
				FormEl.removeEventListener('focusout', checkBlur);
				FormEl.removeEventListener('input', checkInput);
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

					const validation = await clientValidation(
						noValidate ? undefined : options.validators,
						Data.form,
						Data.formId,
						Data.constraints,
						Data.posted
					);

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
