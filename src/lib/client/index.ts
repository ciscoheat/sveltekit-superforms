import {
  enhance,
  applyAction,
  type MaybePromise,
  type SubmitFunction
} from '$app/forms';
import { beforeNavigate, invalidateAll } from '$app/navigation';
import { page } from '$app/stores';
import type { ActionResult } from '@sveltejs/kit';
import type { Page } from '@sveltejs/kit';
import { isElementInViewport, scrollToAndCenter } from './elements';
import {
  derived,
  get,
  writable,
  type Readable,
  type Writable
} from 'svelte/store';
import { tick } from 'svelte';
import { browser } from '$app/environment';
import type { Validation } from '..';
import type { z, AnyZodObject } from 'zod';
import { stringify } from 'devalue';
import { deepEqual, type InputConstraints } from '..';

enum FetchStatus {
  Idle = 0,
  Submitting = 1,
  Delayed = 2,
  Timeout = 3
}

export {
  jsonProxy,
  intProxy,
  numberProxy,
  booleanProxy,
  dateProxy
} from './proxies';

type FormUpdate = (
  result: Exclude<ActionResult, { type: 'error' }>,
  untaint?: boolean
) => Promise<void>;

export type Validators<T extends AnyZodObject> = Partial<{
  [Property in keyof z.infer<T>]: (
    value: z.infer<T>[Property]
  ) => MaybePromise<string | string[] | null | undefined>;
}>;

export type FormOptions<T extends AnyZodObject, M = any> = {
  id?: string;
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
    formEl: HTMLFormElement;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdate?: (event: {
    form: Validation<T, M>;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdated?: (event: {
    form: Validation<T, M>;
  }) => MaybePromise<unknown | void>;
  onError?:
    | 'apply'
    | ((
        result: {
          type: 'error';
          status?: number;
          error: App.Error;
        },
        message: Writable<Validation<T, M>['message']>
      ) => MaybePromise<unknown | void>);
  dataType?: 'form' | 'json';
  validators?: Validators<T>;
  defaultValidator?: 'clear' | 'keep';
  clearOnSubmit?: 'errors' | 'message' | 'errors-and-message' | 'none';
  delayMs?: number;
  timeoutMs?: number;
  multipleSubmits?: 'prevent' | 'allow' | 'abort';
  flashMessage?: {
    module: {
      getFlash(page: Readable<Page>): Writable<App.PageData['flash']>;
      updateFlash(
        page: Readable<Page>,
        update?: () => Promise<void>
      ): Promise<void>;
    };
    onError?: (
      result: {
        type: 'error';
        status?: number;
        error: App.Error;
      },
      message: Writable<App.PageData['flash']>
    ) => MaybePromise<unknown | void>;
    cookiePath?: string;
  };
};

const defaultFormOptions = {
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
  onError: undefined,
  dataType: 'form',
  validators: undefined,
  defaultValidator: 'clear',
  clearOnSubmit: 'errors-and-message',
  delayMs: 500,
  timeoutMs: 8000,
  multipleSubmits: 'prevent'
};

type FormField<T, N = string> = {
  name: N;
  value: T;
  errors: string[] | undefined;
  constraints: InputConstraints | undefined;
  type: string | undefined;
};

/*
type FormFields<T extends AnyZodObject> = {
  [Property in keyof z.infer<T>]: FormField<z.infer<T>[Property], Property>;
};
*/

export type EnhancedForm<T extends AnyZodObject, M = any> = {
  form: Writable<Validation<T, M>['data']>;
  errors: Writable<Validation<T, M>['errors']>;
  constraints: Writable<Validation<T, M>['constraints']>;
  message: Writable<Validation<T, M>['message']>;

  valid: Readable<boolean>;
  empty: Readable<boolean>;
  submitting: Readable<boolean>;
  delayed: Readable<boolean>;
  timeout: Readable<boolean>;

  fields: Readable<FormField<T>[]>;
  firstError: Readable<{ key: string; value: string } | null>;
  allErrors: Readable<{ key: string; value: string }[]>;

  tainted: Readable<boolean>;

  enhance: (el: HTMLFormElement) => ReturnType<typeof formEnhance>;
  update: FormUpdate;
  reset: (options?: { keepMessage: boolean }) => void;
};

/**
 * Initializes a SvelteKit form, for convenient handling of values, errors and sumbitting data.
 * @param {Validation} form Usually data.form from PageData.
 * @param {FormOptions} options Configuration for the form.
 * @returns {EnhancedForm} An object with properties for the form.
 */
export function superForm<
  T extends AnyZodObject = AnyZodObject,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  form: Validation<T, M> | null | undefined | string,
  options: FormOptions<T, M> = {}
): EnhancedForm<T, M> {
  options = { ...(defaultFormOptions as FormOptions<T, M>), ...options };

  function emptyForm(): Validation<T, M> {
    return {
      valid: false,
      errors: {},
      data: {},
      empty: true,
      constraints: {} as Validation<T, M>['constraints']
    };
  }

  function findForms(data: Record<string, unknown>) {
    return Object.values(data).filter(
      (v) => isValidationObject(v) !== false
    ) as Validation<AnyZodObject>[];
  }

  function isValidationObject(object: unknown): string | undefined | false {
    if (!object || typeof object !== 'object') return false;

    if (
      !(
        'valid' in object &&
        'empty' in object &&
        typeof object.valid === 'boolean'
      )
    ) {
      return false;
    }

    return 'id' in object && typeof object.id === 'string'
      ? object.id
      : undefined;
  }

  if (typeof form === 'string' && typeof options.id === 'string') {
    throw new Error(
      'You cannot specify an id in the first superForm argument and in the options.'
    );
  }

  const formId = typeof form === 'string' ? form : options.id ?? form?.id;

  // Detect if a form is posted (without JavaScript).
  const actionForm = get(page).form;

  if (options.applyAction && actionForm) {
    const postedFormId = isValidationObject(actionForm.form);
    if (postedFormId === false) {
      throw new Error(
        "ActionData didn't return a Validation object. Make sure you return { form } in the form actions."
      );
    }
    if (postedFormId === formId) form = actionForm.form as Validation<T, M>;
  }

  if (!form || typeof form === 'string') {
    form = emptyForm();
  }

  // Make a deep copy of the original, in case of reset
  const initialForm: Validation<T, M> = {
    ...form,
    data: { ...form.data },
    errors: { ...form.errors },
    constraints: { ...form.constraints }
  };

  // Stores for the properties of Validation<T, M>
  // Need to make a copy here too, in case the form variable
  // is used to populate multiple forms.
  const Valid = writable(form.valid);
  const Empty = writable(form.empty);
  const Message = writable<M | undefined>(form.message);
  const Errors = writable({ ...form.errors });
  const Data = writable({ ...form.data });
  const Constraints = writable({ ...form.constraints });

  // Timers
  const Submitting = writable(false);
  const Delayed = writable(false);
  const Timeout = writable(false);

  // Utilities
  const AllErrors = derived(Errors, ($errors) => {
    if (!$errors) return [];
    return Object.entries($errors).flatMap(
      ([key, errors]) => errors?.map((value) => ({ key, value })) ?? []
    );
  });

  const FirstError = derived(
    AllErrors,
    ($allErrors) => $allErrors[0] ?? null
  );
  const Tainted = derived(Data, ($d) => (savedForm ? isTainted($d) : false));

  //////////////////////////////////////////////////////////////////////

  if (typeof initialForm.valid !== 'boolean') {
    throw new Error(
      "A non-validation object was passed to superForm. Check what's passed to its first parameter (null is allowed)."
    );
  }

  // Need to set this after use:enhance has run, to avoid showing the
  // tainted dialog when a form doesn't use it or the browser doesn't use JS.
  let savedForm: Validation<T, M>['data'] | undefined;

  const _taintedMessage = options.taintedMessage;
  options.taintedMessage = undefined;

  function enableTaintedMessage() {
    options.taintedMessage = _taintedMessage;
    savedForm = { ...get(Data) };
  }

  function isTainted(data: z.infer<T>) {
    return !deepEqual(data, savedForm);
  }

  function rebind(form: Validation<T, M>, untaint: boolean, message?: M) {
    if (untaint) {
      savedForm = { ...form.data };
    }

    Data.set(form.data);
    Message.set(message ?? form.message);
    Empty.set(form.empty);
    Valid.set(form.valid);
    Errors.set(form.errors);
  }

  async function _update(form: Validation<T, M>, untaint: boolean) {
    if (options.onUpdate) {
      let cancelled = false;
      await options.onUpdate({
        form,
        cancel: () => (cancelled = true)
      });

      if (cancelled) {
        cancelFlash();
        return;
      }
    }

    if (form.valid && options.resetForm) {
      _resetForm(form.message);
    } else {
      rebind(form, untaint);
    }

    // Do not await on onUpdated, since we're already finished with the request
    if (options.onUpdated) {
      options.onUpdated({ form });
    }
  }

  function _resetForm(message?: M) {
    rebind(initialForm, true, message);
  }

  const Data_update: FormUpdate = async (result, untaint?: boolean) => {
    if (result.type == ('error' as string)) {
      throw new Error(
        `ActionResult of type "${result.type}" cannot be passed to update function.`
      );
    }

    // All we need to do if redirected is to reset the form.
    // No events should be triggered because technically we're somewhere else.
    if (result.type == 'redirect') {
      if (options.resetForm) _resetForm();
      return;
    }

    if (typeof result.data !== 'object') {
      throw new Error(
        'Non-object validation data returned from ActionResult.'
      );
    }

    const forms = findForms(result.data);
    if (!forms.length) {
      throw new Error(
        'No form data returned from ActionResult. Make sure you return { form } in the form actions.'
      );
    }

    for (const newForm of forms) {
      if (newForm.id !== formId) continue;
      await _update(
        newForm as Validation<T, M>,
        untaint ?? (result.status >= 200 && result.status < 300)
      );
    }
  };

  if (browser) {
    beforeNavigate((nav) => {
      if (options.taintedMessage && !get(Submitting)) {
        if (get(Tainted) && !window.confirm(options.taintedMessage)) {
          nav.cancel();
        }
      }
    });

    // Check client validation on data change
    let previousForm = { ...initialForm.data };
    Data.subscribe(async (f) => {
      if (get(Submitting)) return;
      for (const key of Object.keys(f)) {
        if (f[key] === previousForm[key]) continue;
        if (!f[key] && !previousForm[key]) continue;

        // Date comparison is a mess, since it can come from the server as undefined,
        // or be Invalid Date from a proxy.
        if (
          (f[key] instanceof Date || previousForm[key] instanceof Date) &&
          ((isNaN(f[key]) && isNaN(previousForm[key])) ||
            f[key]?.getTime() == previousForm[key]?.getTime())
        ) {
          continue;
        }

        //console.log('Field changed:', formId, f, f[key], previousForm[key]);

        const validator = options.validators && options.validators[key];
        if (validator) {
          const newError = await validator(f[key]);
          Errors.update((e) => {
            if (!newError) delete e[key];
            else {
              e[key as keyof z.infer<T>] = Array.isArray(newError)
                ? newError
                : [newError];
            }
            return e;
          });
        } else if (options.defaultValidator == 'clear') {
          Errors.update((e) => {
            delete e[key];
            return e;
          });
        }
      }
      previousForm = { ...f };
    });

    // Need to subscribe to catch page invalidation.
    if (options.applyAction) {
      page.subscribe(async (p) => {
        function error(type: string) {
          throw new Error(
            `No form data found in ${type}. Make sure you return { form } in the form actions and load function.`
          );
        }

        if (p.form && typeof p.form === 'object') {
          const forms = findForms(p.form);
          if (!forms.length) error('$page.form (ActionData)');

          for (const newForm of forms) {
            if (newForm === form || newForm.id !== formId) continue;
            await _update(
              newForm as Validation<T, M>,
              p.status >= 200 && p.status < 300
            );
          }
        } else if (p.data && typeof p.data === 'object') {
          const forms = findForms(p.data);

          // It's a page reload, redirect or error/failure,
          // so don't trigger any events, just update the data.
          for (const newForm of forms) {
            if (newForm === form || newForm.id !== formId) continue;

            rebind(
              newForm as Validation<T, M>,
              p.status >= 200 && p.status < 300
            );
          }
        }
      });
    }
  }

  function cancelFlash() {
    if (options.flashMessage && browser)
      document.cookie = `flash=; Max-Age=0; Path=${
        options.flashMessage.cookiePath ?? '/'
      };`;
  }

  return {
    form: Data,
    errors: Errors,
    message: Message,
    constraints: Constraints,

    fields: derived([Data, Errors, Constraints], ([$D, $E, $C]) => {
      return Object.keys($D).map((key) => ({
        name: key,
        value: $D[key],
        errors: $E[key],
        constraints: $C[key],
        type: initialForm.meta ? initialForm.meta.types[key] : undefined
      }));
    }),

    tainted: derived(Tainted, ($t) => $t),
    valid: derived(Valid, ($s) => $s),
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
        enableTaintedMessage,
        cancelFlash
      ),

    firstError: FirstError,
    allErrors: AllErrors,
    update: Data_update,
    reset: (options?) =>
      _resetForm(options?.keepMessage ? get(Message) : undefined)
  };
}

/**
 * Custom use:enhance version. Flash message support, friendly error messages, for usage with initializeForm.
 * @param formEl Form element from the use:formEnhance default parameter.
 */
function formEnhance<T extends AnyZodObject, M>(
  formEl: HTMLFormElement,
  submitting: Writable<boolean>,
  delayed: Writable<boolean>,
  timeout: Writable<boolean>,
  errors: Writable<Validation<T, M>['errors']>,
  Data_update: FormUpdate,
  options: FormOptions<T, M>,
  data: Writable<Validation<T, M>['data']>,
  message: Writable<Validation<T, M>['message']>,
  enableTaintedForm: () => void,
  cancelFlash: () => void
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
          if (delayedTimeout) clearTimeout(delayedTimeout);
          if (timeoutTimeout) clearTimeout(timeoutTimeout);
          delayedTimeout = timeoutTimeout = 0;

          setState(FetchStatus.Idle);
          if (!cancelled) Form_scrollToFirstError();
        },

        isSubmitting: () =>
          state === FetchStatus.Submitting || state === FetchStatus.Delayed
      };
    }
  }

  const htmlForm = Form(formEl);
  let currentRequest: AbortController | null;

  return enhance(formEl, async (submit) => {
    let cancelled = false;
    if (htmlForm.isSubmitting() && options.multipleSubmits == 'prevent') {
      //d('Prevented form submission');
      cancelled = true;
      submit.cancel();
    } else {
      if (htmlForm.isSubmitting() && options.multipleSubmits == 'abort') {
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
      cancelFlash();
    } else {
      switch (options.clearOnSubmit) {
        case 'errors-and-message':
          errors.set({});
          message.set(undefined);
          break;

        case 'errors':
          errors.set({});
          break;

        case 'message':
          message.set(undefined);
          break;
      }

      if (
        options.flashMessage &&
        (options.clearOnSubmit == 'errors-and-message' ||
          options.clearOnSubmit == 'message')
      ) {
        options.flashMessage.module.getFlash(page).set(undefined);
      }

      //d('Submitting');
      htmlForm.submitting();

      if (options.dataType === 'json') {
        const postData = get(data);
        submit.data.set('__superform_json', stringify(postData));
        Object.keys(postData).forEach((key) => submit.data.delete(key));
      }
    }

    return async ({ result }) => {
      //d('Completed: ', result, options);
      currentRequest = null;
      let cancelled = false;

      if (options.onResult) {
        await options.onResult({
          result,
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
            // This will trigger the page subscription in superForm,
            // which will in turn call Data_update.
            await applyAction(result);
          } else {
            // Call Data_update directly to trigger events
            await Data_update(result);
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
                status: Math.floor(result.status || 500)
              });
            }
          }

          // Check if the error message should be replaced
          if (options.onError && options.onError != 'apply') {
            await options.onError(result, message);
          }
        }

        // Set flash message, which should be set in all cases, even
        // if we have redirected (which is the point with the flash message!)
        if (options.flashMessage) {
          if (result.type == 'error' && options.flashMessage.onError) {

            await options.flashMessage.onError(
              result,
              options.flashMessage.module.getFlash(page)
            );
          } else if (result.type != 'error') {
            await options.flashMessage.module.updateFlash(page);
          }
        }
      } else {
        cancelFlash();
      }

      htmlForm.completed(cancelled);
    };
  });
}
