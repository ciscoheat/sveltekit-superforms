import { enhance, applyAction, type MaybePromise, type SubmitFunction } from '$app/forms';
import { beforeNavigate, invalidateAll } from '$app/navigation';
import { page } from '$app/stores';
import type { ActionResult } from '@sveltejs/kit';
//import { getFlash, updateFlash } from 'sveltekit-flash-message/client';
import { isElementInViewport, scrollToAndCenter } from './elements';
import { derived, get, writable, type Readable, type Updater, type Writable } from 'svelte/store';
import { tick } from 'svelte';
import { browser } from '$app/environment';
import type { Validation } from '..';
import type { z, AnyZodObject } from 'zod';
import { stringify } from 'devalue';
import { deepEqual } from '..';

enum FetchStatus {
  Idle = 0,
  Pending = 1,
  Delayed = 2,
  Timeout = 3
}

export type FormUpdate = (
  result: Exclude<ActionResult, { type: 'error' }>,
  untaint?: boolean
) => Promise<void>;

export type Validators<T extends AnyZodObject> = Partial<{
  [Property in keyof z.infer<T>]: (data: z.infer<T>[Property]) => string | null | undefined;
}>;

/**
 * @param {string} taintedMessage If set, a confirm dialog will be shown when navigating away from the page if the form has been modified.
 * @param onUpdate Callback when the form is updated, by either a POST or a load function.
 * @param {boolean} applyAction If false, will not automatically update the form when $page updates. Useful for modal forms. In that case, use the onResult callback to update the form.
 */
export type FormOptions<T extends AnyZodObject> = {
  applyAction?: boolean;
  invalidateAll?: boolean;
  resetForm?: boolean;
  scrollToError?: 'auto' | 'smooth' | 'off';
  autoFocusOnError?: boolean | 'detect';
  errorSelector?: string;
  stickyNavbar?: string;
  taintedMessage?: string | false;
  onSubmit?: (...params: Parameters<SubmitFunction>) => unknown | void;
  onResult?: (event: {
    result: ActionResult;
    update: FormUpdate;
    formEl: HTMLFormElement;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdate?: (event: {
    validation: Validation<T>;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdated?: (event: { validation: Validation<T> }) => MaybePromise<unknown | void>;
  dataType?: 'form' | 'json' | 'formdata';
  validators?: Validators<T>;
  defaultValidator?: 'keep' | 'clear';
  defaultValidatorMessage?: string;
  clearOnSubmit?: 'errors' | 'message' | 'errors-and-message' | 'none';
  delayMs?: number;
  timeoutMs?: number;
  multipleSubmits?: 'prevent' | 'allow' | 'abort';
};

const defaultFormOptions: FormOptions<AnyZodObject> = {
  applyAction: true,
  invalidateAll: true,
  resetForm: false,
  autoFocusOnError: 'detect',
  scrollToError: 'smooth',
  errorSelector: '[data-invalid]',
  stickyNavbar: undefined,
  taintedMessage: 'Do you want to leave this page? Changes you made may not be saved.',
  onSubmit: undefined,
  onResult: undefined,
  onUpdate: undefined,
  onUpdated: undefined,
  dataType: 'form',
  validators: undefined,
  defaultValidator: 'keep',
  defaultValidatorMessage: 'Invalid',
  clearOnSubmit: 'errors-and-message',
  delayMs: 150,
  timeoutMs: 8000,
  multipleSubmits: 'prevent'
};

export type EnhancedForm<T extends AnyZodObject> = {
  form: Writable<Validation<T>['data']>;
  errors: Writable<Validation<T>['errors']>;
  submitting: Writable<boolean>;
  delayed: Writable<boolean>;
  timeout: Writable<boolean>;
  firstError: Readable<{ key: string; value: string } | null>;
  message: Writable<Validation<T>['message']>;
  enhance: (el: HTMLFormElement) => ReturnType<typeof formEnhance>;
  update: FormUpdate;
  reset: () => void;
  wipe: () => void;
};

/**
 * Creates a string store that will pass its value to a primitive value in the form.
 * @param form The form
 * @param field Form field
 * @param type 'int' | 'boolean'
 */
export function stringProxy<T extends Record<string, unknown>, Type extends 'int' | 'boolean'>(
  form: Writable<T>,
  field: keyof T,
  type: Type
): Writable<string> {
  function toValue(val: unknown) {
    if (typeof val === 'string') {
      if (type == 'int') return parseInt(val, 10);
      if (type == 'boolean') return !!val;
    }
    throw new Error('stringProxy received a non-string value.');
  }

  const proxy = derived(form, ($form) => {
    if (type == 'int') {
      const num = $form[field] as number;
      return isNaN(num) ? '' : String(num);
    } else {
      return $form[field] ? 'true' : '';
    }
  });

  return {
    subscribe: proxy.subscribe,
    set(val: string) {
      form.update((f) => ({ ...f, [field]: toValue(val) }));
    },
    update(updater) {
      form.update((f) => ({ ...f, [field]: toValue(updater(String(f[field]))) }));
    }
  };
}

interface IntArrayProxy extends Writable<number[]> {
  toggle(id: number): void;
  add(id: number): void;
  remove(id: number): void;
  length: number;
}

/**
 * Creates a number[] store that will accept only integers and pass its values
 * to a string in the form, comma-separated as default.
 * @param form The form
 * @param field Form field
 * @param options allowNaN, separator
 */
export function intArrayProxy<T extends Record<string, unknown>>(
  form: Writable<T>,
  field: keyof T,
  options: {
    allowNaN?: boolean;
    separator?: string;
  } = {}
): IntArrayProxy {
  options = { allowNaN: false, separator: ',', ...options };

  function toArray(val: unknown) {
    if (typeof val !== 'string' || !val) return [];
    return val
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter((n) => (options.allowNaN ? true : !isNaN(n)));
  }
  const proxy = derived(form, ($form) => {
    return toArray($form[field]);
  });

  function update(updater: Updater<number[]>) {
    form.update((f) => ({ ...f, [field]: updater(toArray(f[field])).join(',') }));
  }

  return {
    subscribe: proxy.subscribe,
    update,
    set(val: number[]) {
      form.update((f) => ({ ...f, [field]: val.join(options.separator) }));
    },
    toggle(id: number) {
      update((r) => (r.includes(id) ? r.filter((i) => i !== id) : [...r, id]));
    },
    add(id: number) {
      update((r) => [...r, id]);
    },
    remove(id: number) {
      update((r) => r.filter((i) => i !== id));
    },
    get length() {
      return get(proxy).length;
    }
  };
}

/**
 * Initializes a SvelteKit form, for convenient handling of values, errors and sumbitting data.
 * @param {Validation} form Usually data.form from PageData.
 * @param {FormOptions} options Configuration for the form.
 * @returns {EnhancedForm} An object with properties for the form.
 */
export function superForm<T extends AnyZodObject>(
  form?: FormOptions<T> | Validation<T> | null | undefined,
  options: FormOptions<T> = {}
): EnhancedForm<T> {
  if (form && !('data' in form)) {
    options = form;
    form = null;
  }

  options = { ...(defaultFormOptions as FormOptions<T>), ...options };

  const actionForm = get(page).form;
  if (options.applyAction && actionForm && 'form' in actionForm) {
    if (!('success' in actionForm.form) || typeof actionForm.form.success !== 'boolean') {
      throw new Error(
        "ActionData didn't return a Validation object. Make sure you return { form } from form actions."
      );
    }
    form = actionForm.form as Validation<T>;
  } else if (!form) {
    form = { success: true, errors: {}, data: {}, empty: true, message: null };
  }

  const FormStore = writable(form.data);
  const Errors = writable(form.errors);
  const Message = writable(form.message);

  const FirstError = derived(Errors, (errors) => {
    if (!errors) return null;
    const keys = Object.keys(errors);
    if (!keys.length) return null;
    const messages = errors[keys[0]];
    return messages && messages[0] ? { key: keys[0], value: messages[0] } : null;
  });

  const Submitting = writable(false);
  const Delayed = writable(false);
  const Timeout = writable(false);

  const startData = form.data;
  const startErrors = form.errors;

  // Must make a copy for the equality comparison to make sense
  let savedForm = options.taintedMessage ? { ...startData } : undefined;

  function resetForm() {
    FormStore.set(startData);
    Errors.set(startErrors);
    savedForm = options.taintedMessage ? { ...startData } : undefined;
  }

  function wipeForm() {
    FormStore.set({});
    Errors.set({});
    savedForm = options.taintedMessage ? {} : undefined;
  }

  const FormStore_update: FormUpdate = async (result, untaint?: boolean) => {
    if ((result.type as string) == 'error') {
      throw new Error('ActionResult of type "error" was passed to update function.');
    }

    if (untaint === undefined) {
      untaint = result.type == 'success' || result.type == 'redirect';
    }

    Submitting.set(false);
    Delayed.set(false);
    Timeout.set(false);

    function resultData(data: unknown) {
      if (!data) return null;
      else if (typeof data !== 'object') {
        throw new Error('Non-object validation data returned from ActionResult.');
      }

      if ('form' in data) return data.form as Validation<T>;
      else if ('data' in data) return data as Validation<T>;
      else if (result.type != 'redirect') {
        throw new Error('Incorrect validation type returned from ActionResult.');
      } else {
        return null;
      }
    }

    const validation = resultData(result.type == 'redirect' ? get(page).data : result.data) ?? {
      success: true,
      errors: {},
      data: {},
      empty: true,
      message: null
    };

    let form = validation.data;
    let formErrors = validation.errors;
    let message = validation.message;

    if (options.onUpdate) {
      let cancelled = false;
      await options.onUpdate({
        validation: validation,
        cancel: () => (cancelled = true)
      });
      if (cancelled) return;

      form = validation.data as typeof form;
      formErrors = validation.errors as typeof formErrors;
      message = validation.message as typeof message;
    }

    Message.set(message);

    if (result.type != 'failure' && options.resetForm) {
      resetForm();
    } else {
      FormStore.set(form);
      Errors.set(formErrors);

      if (untaint && options.taintedMessage) {
        savedForm = { ...form };
      }
    }

    if (options.onUpdated) {
      await options.onUpdated({ validation: validation });
    }

    return;
  };

  if (browser) {
    beforeNavigate((nav) => {
      if (options.taintedMessage && !get(Submitting)) {
        const tainted = !deepEqual(get(FormStore), savedForm);

        if (tainted && !window.confirm(options.taintedMessage)) {
          nav.cancel();
        }
      }
    });
  }

  let previousForm = { ...form.data };
  FormStore.subscribe((f) => {
    for (const key of Object.keys(f)) {
      if (f[key] !== previousForm[key]) {
        const validator = options.validators && options.validators[key];
        if (validator) {
          const newError = validator(f[key]);
          Errors.update((e) => {
            if (!newError) delete e[key];
            else e[key as keyof z.infer<T>] = [newError];
            return e;
          });
        } else if (options.defaultValidator == 'clear') {
          Errors.update((e) => {
            delete e[key];
            return e;
          });
        }
      }
    }
    previousForm = { ...f };
  });

  return {
    form: FormStore,
    errors: Errors,
    submitting: Submitting,
    delayed: Delayed,
    timeout: Timeout,
    enhance: (el: HTMLFormElement) =>
      formEnhance(
        el,
        Submitting,
        Delayed,
        Timeout,
        Errors,
        FormStore_update,
        options,
        FormStore,
        Message
      ),
    update: FormStore_update,
    firstError: FirstError,
    message: Message,
    reset: resetForm,
    wipe: wipeForm
    //fieldChanged(field: keyof z.infer<T>) { return !!savedForm && !deepEqual(savedForm[field], get(formStore)[field]); },
  };
}

/**
 * Custom use:enhance version. Flash message support, friendly error messages, for usage with initializeForm.
 * @param formEl Form element from the use:formEnhance default parameter.
 */
function formEnhance<T extends AnyZodObject>(
  formEl: HTMLFormElement,
  submitting: Writable<boolean>,
  delayed: Writable<boolean>,
  timeout: Writable<boolean>,
  errors: Writable<Validation<T>['errors']>,
  formUpdate: FormUpdate,
  options: FormOptions<T>,
  data: Writable<Validation<T>['data']>,
  message: Writable<Validation<T>['message']>
) {
  /**
   * @DCI-context
   */
  function Form(formEl: HTMLFormElement) {
    function rebind() {
      Form = formEl;
    }

    let Form: {
      querySelectorAll: (selector: string) => NodeListOf<HTMLElement>;
      querySelector: (selector: string) => HTMLElement;
      dataset: DOMStringMap;
    };

    function Form_shouldAutoFocus(userAgent: string) {
      if (typeof options.autoFocusOnError === 'boolean') return options.autoFocusOnError;
      else return !/iPhone|iPad|iPod|Android/i.test(userAgent);
    }

    const Form_scrollToFirstError = async () => {
      if (options.scrollToError == 'off') return;

      const selector = options.errorSelector;
      if (!selector) return;

      // Wait for form to update with errors
      await tick();

      // Scroll to first form message, if not visible
      let el: HTMLElement | null;
      el = Form.querySelector(selector) as HTMLElement | null;
      if (!el) return;
      // Find underlying element if it is a FormGroup element
      el = el.querySelector(selector) ?? el;

      //d('Validation error:', el);

      const nav = options.stickyNavbar
        ? (document.querySelector(options.stickyNavbar) as HTMLElement)
        : null;

      if (!isElementInViewport(el, nav?.offsetHeight ?? 0)) {
        scrollToAndCenter(el, undefined, options.scrollToError);
      }

      // Don't focus on the element if on mobile, it will open the keyboard
      // and probably hide the error message.
      if (!Form_shouldAutoFocus(navigator.userAgent)) return;

      let focusEl;
      focusEl = el;

      if (!['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(focusEl.tagName)) {
        focusEl = focusEl.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not(.flatpickr-input), select, textarea'
        );
      }

      try {
        focusEl?.focus({ preventScroll: true });
      } catch (err) {
        // Some hidden inputs like from flatpickr cannot be focused.
      }
    };

    {
      let state: FetchStatus = FetchStatus.Idle;
      let delayedTimeout: number, timeoutTimeout: number;

      const setState = (s: typeof state) => {
        state = s;
        submitting.set(state != FetchStatus.Idle);
        delayed.set(state >= FetchStatus.Delayed);
        timeout.set(state >= FetchStatus.Timeout);
      };

      return {
        submitting: () => {
          rebind();
          setState(state != FetchStatus.Delayed ? FetchStatus.Pending : FetchStatus.Delayed);

          // https://www.nngroup.com/articles/response-times-3-important-limits/
          if (delayedTimeout) clearTimeout(delayedTimeout);
          if (timeoutTimeout) clearTimeout(timeoutTimeout);

          delayedTimeout = window.setTimeout(() => {
            if (state == FetchStatus.Pending) setState(FetchStatus.Delayed);
          }, options.delayMs);
          timeoutTimeout = window.setTimeout(() => {
            if (state == FetchStatus.Delayed) setState(FetchStatus.Timeout);
          }, options.timeoutMs);
        },
        completed: (cancelled: boolean) => {
          setState(FetchStatus.Idle);
          if (!cancelled) Form_scrollToFirstError();
        },
        isSubmitting: () => state === FetchStatus.Pending || state === FetchStatus.Delayed
      };
    }
  }

  const form = Form(formEl);

  return enhance(formEl, async (submit) => {
    let cancelled = false;
    if (form.isSubmitting()) {
      //d('Prevented form submission');
      cancelled = true;
      submit.cancel();
    } else if (options.onSubmit) {
      const submit2 = {
        ...submit,
        cancel: () => {
          cancelled = true;
          return submit.cancel();
        }
      };

      options.onSubmit(submit2);
    }

    if (!cancelled) {
      switch (options.clearOnSubmit) {
        case 'errors-and-message':
          errors.set({});
          message.set(null);
          break;

        case 'errors':
          errors.set({});
          break;

        case 'message':
          message.set(null);
          break;
      }

      form.submitting();
      //d('Submitting');

      // TODO: flash message
      /*
			try {
				getFlash(page).set(undefined);
			} catch (_) {
				//
			}
			*/

      switch (options.dataType) {
        case 'json':
          submit.data.set('json', stringify(get(data)));
          break;

        case 'formdata':
          for (const [key, value] of Object.entries(get(data))) {
            submit.data.set(key, value instanceof Blob ? value : `${value || ''}`);
          }
          break;
      }
    }

    return async ({ result }) => {
      //d('Completed: ', result, options);
      let cancelled = false;
      if (options.onResult) {
        await options.onResult({
          result,
          update: formUpdate,
          formEl,
          cancel: () => (cancelled = true)
        });
      }

      if (!cancelled) {
        if (result.type !== 'error') {
          if (result.type === 'success' && options.invalidateAll) {
            await invalidateAll();
          }

          if (options.applyAction) {
            await applyAction(result);
          }
        } else if (options.applyAction) {
          await applyAction({
            type: 'failure',
            status: Math.floor(result.status || 500)
          });
        }

        if (options.applyAction && result.type != 'error') {
          formUpdate(result);
        }

        /*
				// TODO: Flash message handling
				function errorMessage(result: ActionResult): string | undefined {
					if (result.type != 'error') return undefined;
					return result.error;
				}

				const error = errorMessage(result);
				if (error) {
					getFlash(page).set({
						status: 'error',
						text: error
					});
				} else {
					try {
						await updateFlash(page);
					} catch (_) {
						//
					}
				}
				*/
      }

      form.completed(cancelled);
    };
  });
}
