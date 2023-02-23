import {
  enhance,
  applyAction,
  type MaybePromise,
  type SubmitFunction
} from '$app/forms';
import { beforeNavigate, invalidateAll } from '$app/navigation';
import { page } from '$app/stores';
import type { ActionResult } from '@sveltejs/kit';
//import { getFlash, updateFlash } from 'sveltekit-flash-message/client';
import { isElementInViewport, scrollToAndCenter } from './elements';
import {
  derived,
  get,
  writable,
  type Readable,
  type Updater,
  type Writable
} from 'svelte/store';
import { tick } from 'svelte';
import { browser } from '$app/environment';
import type { Validation } from '..';
import type { z, AnyZodObject } from 'zod';
import { stringify } from 'devalue';
import { deepEqual } from '..';

enum FetchStatus {
  Idle = 0,
  Submitting = 1,
  Delayed = 2,
  Timeout = 3
}

export type FormUpdate = (
  result: Extract<ActionResult, { type: 'success' } | { type: 'failure' }>,
  untaint?: boolean
) => Promise<void>;

export type Validators<T extends AnyZodObject> = Partial<{
  [Property in keyof z.infer<T>]: (
    value: z.infer<T>[Property]
  ) => MaybePromise<string | null | undefined>;
}>;

/**
 * @param {string} taintedMessage If set, a confirm dialog will be shown when navigating away from the page if the form has been modified.
 * @param onUpdate Callback when the form is updated, by either a POST or a load function.
 * @param {boolean} applyAction If false, will not automatically update the form when $page updates. Useful for modal forms.
 */
export type FormOptions<T extends AnyZodObject> = {
  applyAction?: boolean;
  invalidateAll?: boolean;
  resetForm?: boolean;
  scrollToError?: 'auto' | 'smooth' | 'off';
  autoFocusOnError?: boolean | 'detect';
  errorSelector?: string;
  stickyNavbar?: string;
  taintedMessage?: string | false | null;
  onSubmit?: (...params: Parameters<SubmitFunction>) => unknown | void;
  onResult?: (event: {
    result: ActionResult;
    update: FormUpdate;
    formEl: HTMLFormElement;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdate?: (event: {
    form: Validation<T>;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdated?: (event: {
    form: Validation<T>;
  }) => MaybePromise<unknown | void>;
  onError?:
    | ((
        result: Extract<ActionResult, { type: 'error' }>,
        message: Writable<Validation<T>['message']>
      ) => MaybePromise<unknown | void>)
    | 'set-message'
    | 'apply'
    | string;
  dataType?: 'form' | 'formdata' | 'json';
  validators?: Validators<T>;
  defaultValidator?: 'clear' | 'keep';
  clearOnSubmit?: 'errors' | 'message' | 'errors-and-message' | 'none';
  delayMs?: number;
  timeoutMs?: number;
  multipleSubmits?: 'prevent' | 'allow' | 'abort';
  flashMessage?: (errorResult: {
    type: 'error';
    status: number;
    error: App.Error;
  }) => App.PageData['flash'];
};

const defaultFormOptions: FormOptions<AnyZodObject> = {
  applyAction: true,
  invalidateAll: true,
  resetForm: false,
  autoFocusOnError: 'detect',
  scrollToError: 'smooth',
  errorSelector: '[data-invalid]',
  stickyNavbar: undefined,
  taintedMessage:
    'Do you want to leave this page? Changes you made may not be saved.',
  onSubmit: undefined,
  onResult: undefined,
  onUpdate: undefined,
  onUpdated: undefined,
  onError: 'set-message',
  dataType: 'form',
  validators: undefined,
  defaultValidator: 'clear',
  clearOnSubmit: 'errors-and-message',
  delayMs: 500,
  timeoutMs: 8000,
  multipleSubmits: 'prevent'
};

export type EnhancedForm<T extends AnyZodObject> = {
  form: Writable<Validation<T>['data']>;
  errors: Writable<Validation<T>['errors']>;
  message: Writable<Validation<T>['message']>;

  validated: Readable<boolean>;
  empty: Readable<boolean>;

  submitting: Readable<boolean>;
  delayed: Readable<boolean>;
  timeout: Readable<boolean>;

  firstError: Readable<{ key: string; value: string } | null>;
  allErrors: Readable<{ key: string; value: string }[]>;

  enhance: (el: HTMLFormElement) => ReturnType<typeof formEnhance>;
  update: FormUpdate;
  reset: () => void;
};

/**
 * Creates a string store that will pass its value to a primitive value in the form.
 * @param form The form
 * @param field Form field
 * @param type 'int' | 'boolean'
 */
export function stringProxy<
  T extends Record<string, unknown>,
  Type extends 'int' | 'boolean'
>(form: Writable<T>, field: keyof T, type: Type): Writable<string> {
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
      form.update((f) => ({
        ...f,
        [field]: toValue(updater(String(f[field])))
      }));
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
    form.update((f) => ({
      ...f,
      [field]: updater(toArray(f[field])).join(',')
    }));
  }

  return {
    subscribe: proxy.subscribe,
    update,
    set(val: number[]) {
      form.update((f) => ({ ...f, [field]: val.join(options.separator) }));
    },
    toggle(id: number) {
      update((r) =>
        r.includes(id) ? r.filter((i) => i !== id) : [...r, id]
      );
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

let flashLibrary: any;

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

  /*
  if (options.flashMessage && !flashLibrary) {
    try {
      import('sveltekit-flash-message/client')
        .then((flash) => (flashLibrary = flash))
        .catch(function () {
          //
        });
    } catch {
      //
    }
  }
  */

  function emptyForm() {
    return {
      valid: false,
      errors: {},
      data: {},
      empty: true,
      message: null
    };
  }

  // Detect if a form is posted (without JavaScript).
  const actionForm = get(page).form;

  if (options.applyAction && actionForm) {
    if (
      !actionForm.form ||
      !('success' in actionForm.form) ||
      typeof actionForm.form.success !== 'boolean'
    ) {
      throw new Error(
        "ActionData didn't return a Validation object. Make sure you return { form } from form actions."
      );
    }
    form = actionForm.form as Validation<T>;
  } else if (!form) {
    form = emptyForm();
  }

  // Stores for the properties of Validation<T>
  const Validated = writable(form.valid);
  const Errors = writable(form.errors);
  const Data = writable(form.data);
  const Empty = writable(form.empty);
  const Message = writable(form.message);

  // Timers
  const Submitting = writable(false);
  const Delayed = writable(false);
  const Timeout = writable(false);

  // Utilities
  const AllErrors = derived(Errors, (errors) => {
    if (!errors) return [];
    return Object.entries(errors).flatMap(
      ([key, errors]) => errors?.map((value) => ({ key, value })) ?? []
    );
  });

  const FirstError = derived(AllErrors, (allErrors) => allErrors[0] ?? null);

  //////////////////////////////////////////////////////////////////////

  const initialForm = form;

  // Need to set this after use:enhance has run, to avoid showing the dialog
  // when a form doesn't use it.
  let savedForm: Validation<T>['data'] | undefined;

  const _taintedMessage = options.taintedMessage;
  options.taintedMessage = undefined;

  function enableTaintedMessage() {
    options.taintedMessage = _taintedMessage;
    savedForm = options.taintedMessage ? { ...get(Data) } : undefined;
  }

  function rebind(form: Validation<T>, untaint: boolean) {
    Validated.set(form.valid);
    Errors.set(form.errors);
    Data.set(form.data);
    Empty.set(form.empty);
    Message.set(form.message);

    if (untaint && options.taintedMessage) {
      savedForm = { ...form.data };
    }
  }

  async function _update(form: Validation<T>, untaint: boolean) {
    if (options.onUpdate) {
      let cancelled = false;
      await options.onUpdate({
        form,
        cancel: () => (cancelled = true)
      });
      if (cancelled) return;
    }

    if (form.valid && options.resetForm) {
      _resetForm();
    } else {
      rebind(form, untaint);
    }

    if (options.onUpdated) {
      await options.onUpdated({ form });
    }
  }

  function _resetForm() {
    rebind(initialForm, true);
  }

  /*
  function _wipeForm() {
    rebind(emptyForm(), true);
  }
  */

  const Data_update: FormUpdate = async (result, untaint?: boolean) => {
    if (['error', 'redirect'].includes(result.type)) {
      throw new Error(
        `ActionResult of type "${result.type}" was passed to update function. Only "success" and "failure" are allowed.`
      );
    }

    if (typeof result.data !== 'object') {
      throw new Error(
        'Non-object validation data returned from ActionResult.'
      );
    }

    if (!('form' in result.data)) {
      throw new Error(
        'No form data returned from ActionResult. Make sure you return { form } in the form actions.'
      );
    }

    const form = (result.data.form as Validation<T>) ?? emptyForm();

    _update(form, untaint ?? (result.status >= 200 && result.status < 300));
  };

  if (browser) {
    beforeNavigate((nav) => {
      if (options.taintedMessage && !get(Submitting)) {
        const tainted = !deepEqual(get(Data), savedForm);

        if (tainted && !window.confirm(options.taintedMessage)) {
          nav.cancel();
        }
      }
    });

    let previousForm = { ...form.data };
    Data.subscribe(async (f) => {
      for (const key of Object.keys(f)) {
        if (f[key] !== previousForm[key]) {
          const validator = options.validators && options.validators[key];
          if (validator) {
            const newError = await validator(f[key]);
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

    // Need to subscribe to catch page invalidation.
    if (options.applyAction) {
      page.subscribe((p) => {
        // Skip the update if no new data is retrieved.
        if (!p.form && !p.data.form) return;

        if (p.form && p.form != initialForm) {
          if (!p.form.form)
            throw new Error(
              "No form data found in $page.form (ActionData). Make sure you return { form } in this page's form actions."
            );
          _update(p.form.form, p.status >= 200 && p.status < 400);
        } else if (p.data.form && p.data.form != initialForm) {
          if (!p.data.form) {
            throw new Error(
              "No form data found in $page.data (PageData). Make sure you return { form } in this page's load function."
            );
          }
          // It's a page reload, so don't trigger any update events.
          rebind(p.data.form, true);
        }
      });
    }
  }

  return {
    errors: Errors,
    form: Data,
    message: Message,
    validated: derived(Validated, ($s) => $s),
    empty: derived(Empty, ($e) => $e),

    submitting: derived(Submitting, ($s) => $s),
    delayed: derived(Delayed, ($d) => $d),
    timeout: derived(Timeout, ($t) => $t),

    enhance: (el: HTMLFormElement) =>
      formEnhance(
        el,
        Submitting,
        Delayed,
        Timeout,
        Errors,
        Data_update,
        options,
        Data,
        Message,
        enableTaintedMessage
      ),

    firstError: FirstError,
    allErrors: AllErrors,
    update: Data_update,
    reset: _resetForm
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
  Data_update: FormUpdate,
  options: FormOptions<T>,
  data: Writable<Validation<T>['data']>,
  message: Writable<Validation<T>['message']>,
  enableTaintedForm: () => void
) {
  // Now we know that we are upgraded, so we can enable the tainted form option.
  enableTaintedForm();

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
      if (typeof options.autoFocusOnError === 'boolean')
        return options.autoFocusOnError;
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

      if (
        !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(focusEl.tagName)
      ) {
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
        submitting.set(state >= FetchStatus.Submitting);
        delayed.set(state >= FetchStatus.Delayed);
        timeout.set(state >= FetchStatus.Timeout);
      };

      return {
        submitting: () => {
          rebind();
          setState(
            state != FetchStatus.Delayed
              ? FetchStatus.Submitting
              : FetchStatus.Delayed
          );

          // https://www.nngroup.com/articles/response-times-3-important-limits/
          if (delayedTimeout) clearTimeout(delayedTimeout);
          if (timeoutTimeout) clearTimeout(timeoutTimeout);

          delayedTimeout = window.setTimeout(() => {
            if (state == FetchStatus.Submitting)
              setState(FetchStatus.Delayed);
          }, options.delayMs);

          timeoutTimeout = window.setTimeout(() => {
            if (state == FetchStatus.Delayed) setState(FetchStatus.Timeout);
          }, options.timeoutMs);
        },

        completed: (cancelled: boolean) => {
          setState(FetchStatus.Idle);
          if (!cancelled) Form_scrollToFirstError();
        },

        isSubmitting: () =>
          state === FetchStatus.Submitting || state === FetchStatus.Delayed
      };
    }
  }

  const form = Form(formEl);
  let currentRequest: AbortController | null;

  return enhance(formEl, async (submit) => {
    let cancelled = false;
    if (form.isSubmitting() && options.multipleSubmits == 'prevent') {
      //d('Prevented form submission');
      cancelled = true;
      submit.cancel();
    } else {
      if (form.isSubmitting() && options.multipleSubmits == 'abort') {
        if (currentRequest) currentRequest.abort();
      }
      currentRequest = submit.controller;

      if (options.onSubmit) {
        const submit2 = {
          ...submit,
          cancel: () => {
            cancelled = true;
            return submit.cancel();
          }
        };

        options.onSubmit(submit2);
      }
    }

    if (cancelled) {
      currentRequest = null;
    } else {
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

      if (
        flashLibrary &&
        options.flashMessage &&
        (options.clearOnSubmit == 'errors-and-message' ||
          options.clearOnSubmit == 'message')
      ) {
        try {
          flashLibrary.getFlash(page).set(undefined);
        } catch {
          //
        }
      }

      //d('Submitting');
      form.submitting();

      switch (options.dataType) {
        case 'json':
          submit.data.set('json', stringify(get(data)));
          break;

        case 'formdata':
          for (const [key, value] of Object.entries(get(data))) {
            submit.data.set(
              key,
              value instanceof Blob ? value : `${value || ''}`
            );
          }
          break;
      }
    }

    return async ({ result }) => {
      //d('Completed: ', result, options);
      currentRequest = null;
      let cancelled = false;
      if (options.onResult) {
        await options.onResult({
          result,
          update: Data_update,
          formEl,
          cancel: () => (cancelled = true)
        });
      }

      if (!cancelled) {
        const status = Math.floor(result.status || 500);
        let errorMessage: string | undefined = undefined;

        if (result.type !== 'error') {
          if (result.type === 'success' && options.invalidateAll) {
            await invalidateAll();
          }

          if (options.applyAction) {
            // This will call the page subscription in superForm
            await applyAction(result);
          } else if (result.type !== 'redirect') {
            Data_update(result);
          }
        } else {
          // Error result
          if (options.applyAction) {
            if (options.onError == 'apply') {
              await applyAction(result);
            } else {
              // Transform to failure, to avoid data loss
              await applyAction({
                type: 'failure',
                status
              });
            }
          }

          // Check if the error message should be replaced
          if (options.onError == 'set-message') {
            message.set(
              (errorMessage =
                result.error.message !== undefined
                  ? result.error.message
                  : `Error: ${status}`)
            );
          } else if (typeof options.onError === 'string') {
            message.set((errorMessage = options.onError));
          } else if (options.onError) {
            await options.onError(result, message);
          }
        }

        if (flashLibrary && options.flashMessage) {
          if (result.type == 'error') {
            if (
              errorMessage &&
              result.error &&
              typeof result.error === 'object' &&
              'message' in result.error
            ) {
              result.error.message = errorMessage;
            }
            flashLibrary.getFlash(page).set(
              options.flashMessage({
                ...result,
                status: result.status ?? status
              })
            );
          } else {
            try {
              await flashLibrary.updateFlash(page);
            } catch {
              //
            }
          }
        }
      }

      form.completed(cancelled);
    };
  });
}
