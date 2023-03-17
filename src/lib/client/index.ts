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
import { onDestroy, tick } from 'svelte';
import { browser } from '$app/environment';
import { SuperFormError, type RawShape, type Validation } from '..';
import type { z, AnyZodObject, ZodArray, ZodTypeAny } from 'zod';
import { stringify } from 'devalue';
import { deepEqual, type FormFields } from '..';
import { mapErrors, unwrapZodType, checkPath, findErrors } from '../entity';

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

type Validator<T extends AnyZodObject, P extends keyof z.infer<T>> = (
  value: z.infer<T>[P]
) => MaybePromise<string | string[] | null | undefined>;

export type Validators<T extends AnyZodObject> = {
  [Property in keyof RawShape<T>]?: RawShape<T>[Property] extends
    | AnyZodObject
    | ZodArray<ZodTypeAny>
    ? Validators<RawShape<T>[Property]>
    : Validator<T, Property>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormOptions<T extends AnyZodObject, M> = Partial<{
  id: string;
  applyAction: boolean;
  invalidateAll: boolean;
  resetForm: boolean;
  scrollToError: 'auto' | 'smooth' | 'off';
  autoFocusOnError: boolean | 'detect';
  errorSelector: string;
  stickyNavbar: string;
  taintedMessage: string | false | null;
  onSubmit: (
    ...params: Parameters<SubmitFunction>
  ) => MaybePromise<unknown | void>;
  onResult: (event: {
    result: ActionResult;
    formEl: HTMLFormElement;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdate: (event: {
    form: Validation<T, M>;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdated: (event: {
    form: Validation<T, M>;
  }) => MaybePromise<unknown | void>;
  onError:
    | 'apply'
    | ((
        result: {
          type: 'error';
          status?: number;
          error: App.Error;
        },
        message: Writable<Validation<T, M>['message']>
      ) => MaybePromise<unknown | void>);
  dataType: 'form' | 'json';
  validators: Validators<T> | T;
  defaultValidator: 'clear' | 'keep';
  clearOnSubmit: 'errors' | 'message' | 'errors-and-message' | 'none';
  delayMs: number;
  timeoutMs: number;
  multipleSubmits: 'prevent' | 'allow' | 'abort';
  flashMessage: {
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
}>;

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
  multipleSubmits: 'prevent',
  validation: undefined
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EnhancedForm<T extends AnyZodObject, M = any> = {
  form: Writable<Validation<T, M>['data']>;
  errors: Writable<Validation<T, M>['errors']>;
  constraints: Writable<Validation<T, M>['constraints']>;
  message: Writable<Validation<T, M>['message']>;
  meta: Readable<Validation<T, M>['meta']>;

  valid: Readable<boolean>;
  empty: Readable<boolean>;
  submitting: Readable<boolean>;
  delayed: Readable<boolean>;
  timeout: Readable<boolean>;

  fields: Readable<FormFields<T>>;
  firstError: Readable<{ path: string[]; message: string } | null>;
  allErrors: Readable<{ path: string[]; message: string }[]>;

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
    throw new SuperFormError(
      'You cannot specify an id both in the first superForm argument and in the options.'
    );
  }

  const formId = typeof form === 'string' ? form : options.id ?? form?.id;

  // Detect if a form is posted (without JavaScript).
  const actionForm = get(page).form;

  if (options.applyAction && actionForm) {
    const postedFormId = isValidationObject(actionForm.form);
    if (postedFormId === false) {
      throw new SuperFormError(
        "ActionData didn't return a Validation object. Make sure you return { form } in the form actions."
      );
    }
    if (postedFormId === formId) form = actionForm.form as Validation<T, M>;
  }

  // Check for nested objects, throw if datatype isn't json
  function checkJson(key: string, value: unknown) {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      if (value.length > 0) checkJson(key, value[0]);
    } else if (!(value instanceof Date)) {
      throw new SuperFormError(
        `Object found in form field "${key}". Set options.dataType = 'json' and use:enhance to use nested structures.`
      );
    }
  }

  if (!form || typeof form === 'string') {
    form = emptyForm();
  } else if (options.dataType !== 'json') {
    for (const [key, value] of Object.entries(form.data)) {
      checkJson(key, value);
    }
  }

  // Make an "as deep copy as needed" of the original, in case of reset
  const initialForm: Validation<T, M> = {
    ...form,
    data: { ...form.data },
    errors: { ...form.errors },
    constraints: { ...form.constraints },
    meta: form.meta ? { ...form.meta } : undefined
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
  const Meta = writable<Validation<T, M>['meta'] | undefined>(
    form.meta ? { ...form.meta } : undefined
  );

  // Timers
  const Submitting = writable(false);
  const Delayed = writable(false);
  const Timeout = writable(false);

  // Utilities
  const AllErrors = derived(Errors, ($errors) => {
    if (!$errors) return [];
    return findErrors($errors);
  });

  const FirstError = derived(AllErrors, ($all) => $all[0] ?? null);
  const Tainted = derived(Data, ($d) => (savedForm ? isTainted($d) : false));

  //////////////////////////////////////////////////////////////////////

  if (typeof initialForm.valid !== 'boolean') {
    throw new SuperFormError(
      "A non-validation object was passed to superForm. Check what's passed to its first parameter (null/undefined is allowed)."
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
    Meta.set(form.meta);
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
      throw new SuperFormError(
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
      throw new SuperFormError(
        'Non-object validation data returned from ActionResult.'
      );
    }

    const forms = findForms(result.data);
    if (!forms.length) {
      throw new SuperFormError(
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

  async function checkEqual(
    newObj: unknown,
    compareAgainst: unknown,
    path: string[] = []
  ) {
    //console.log('Entering:', path);
    if (newObj === compareAgainst) return;

    if (
      newObj !== null &&
      compareAgainst !== null &&
      typeof newObj === 'object' &&
      typeof compareAgainst === 'object'
    ) {
      /*
        // Date comparison is a mess, since it can come from the server as undefined,
        // or be Invalid Date from a proxy.
        if (
          (f[key] instanceof Date || previousForm[key] instanceof Date) &&
          ((isNaN(f[key]) && isNaN(previousForm[key])) ||
            f[key]?.getTime() == previousForm[key]?.getTime())
        ) {
          continue;
        }
      */

      if (newObj instanceof Date) {
        if (
          compareAgainst instanceof Date &&
          newObj.getTime() == compareAgainst.getTime()
        ) {
          return;
        }
      } else {
        for (const prop in newObj) {
          checkEqual(
            newObj[prop as keyof object],
            compareAgainst[prop as keyof object],
            path.concat([prop])
          );
        }
        return;
      }
    }

    /*
    console.log(
      '  Run validator:',
      path,
      newObj,
      compareAgainst,
      get(Errors)
    );
    */

    function setError(path: string[], newErrors: string[] | null) {
      Errors.update((errors) => {
        const errorPath = checkPath(
          errors,
          path,
          ({ parent, key, value }) => {
            if (value === undefined) parent[key] = {};
            return parent[key];
          }
        );

        if (errorPath) {
          const { parent, key } = errorPath;
          if (newErrors === null) delete parent[key];
          else parent[key] = newErrors;
        }
        return errors;
      });
    }

    let validated = false;

    if (options.validators) {
      // Filter out array indices, since the type for options.validation
      // doesn't have that in the structure.
      const validationPath = [...path].filter((p) => isNaN(parseInt(p)));
      if (validationPath.length > 0) {
        if (options.validators.constructor.name === 'ZodObject') {
          const validator = options.validators as T;
          let found: ZodTypeAny | undefined = checkPath(
            validator.shape,
            validationPath,
            ({ value }) => {
              let type = unwrapZodType(value).zodType;

              while (type.constructor.name === 'ZodArray') {
                type = (type as ZodArray<ZodTypeAny>)._def.type;
              }

              if (type.constructor.name == 'ZodObject') {
                return (type as AnyZodObject).shape;
              } else {
                return undefined;
              }
            }
          )?.value;

          if (found) {
            // If we land on an array (can happen when an array index has errors)
            // go into the array schema and extract the underlying type
            while (found && found.constructor.name === 'ZodArray') {
              found = unwrapZodType(
                (found as unknown as ZodArray<ZodTypeAny>)._def.type
              ).zodType;
            }

            const result = await found.spa(newObj);

            setError(
              path,
              result.success
                ? null
                : result.error.errors.map((err) => err.message)
            );

            validated = true;
          }
        } else {
          // SuperForms validator
          const validator = options.validators as Validators<T>;

          const found: Validator<T, keyof z.infer<T>> | undefined =
            checkPath(validator, validationPath)?.value;

          if (found) {
            const result = await found(newObj as z.infer<T>);

            setError(
              path,
              typeof result === 'string' ? [result] : result ?? null
            );

            validated = true;
          }
        }
      }
    }

    if (!validated && options.defaultValidator == 'clear') {
      Errors.update((errors) => {
        const leaf = checkPath(errors, path);
        if (leaf) delete leaf.parent[leaf.key];
        return errors;
      });
    }
  }

  if (browser) {
    beforeNavigate((nav) => {
      if (options.taintedMessage && !get(Submitting)) {
        if (get(Tainted) && !window.confirm(options.taintedMessage)) {
          nav.cancel();
        }
      }
    });

    // Check client validation on data change
    let previousForm = structuredClone(initialForm.data);
    let loaded = false;

    Data.subscribe(async (data) => {
      if (!loaded) {
        loaded = true;
        return;
      }

      if (get(Submitting)) return;
      await checkEqual(data, previousForm);

      previousForm = structuredClone(data);
    });

    // Need to subscribe to catch page invalidation.
    if (options.applyAction) {
      onDestroy(
        page.subscribe(async (p) => {
          function error(type: string) {
            throw new SuperFormError(
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
        })
      );
    }
  }

  function cancelFlash() {
    if (options.flashMessage && browser)
      document.cookie = `flash=; Max-Age=0; Path=${
        options.flashMessage.cookiePath ?? '/'
      };`;
  }

  function fieldStore<V>(fieldName: string): Writable<V> {
    const store = writable<V>();

    Data.subscribe((data) => {
      store.set(data[fieldName]);
    });

    return {
      subscribe: store.subscribe,
      set: (value: V) => {
        Data.set({ ...get(Data), [fieldName]: value });
      },
      update: (cb: (value: V) => V) => {
        Data.set((form: z.infer<T>) => ({
          ...form,
          [fieldName]: cb(form[fieldName])
        }));
      }
    };
  }

  return {
    form: Data,
    errors: Errors,
    message: Message,
    constraints: Constraints,
    meta: derived(Meta, ($m) => $m),

    fields: derived([Errors, Constraints, Meta], ([$E, $C, $M], set) => {
      set(
        Object.fromEntries(
          Object.keys(get(Data)).map((key) => [
            key,
            {
              name: key,
              value: fieldStore(key),
              errors: $E[key],
              constraints: $C[key],
              type: $M?.types[key]
            }
          ])
        ) as FormFields<T>
      );
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

    rebind();

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

        scrollToFirstError: () => Form_scrollToFirstError(),

        isSubmitting: () =>
          state === FetchStatus.Submitting || state === FetchStatus.Delayed
      };
    }
  }

  const htmlForm = Form(formEl);
  let currentRequest: AbortController | null;

  return enhance(formEl, async (submit) => {
    let cancelled = false;
    function cancel() {
      cancelled = true;
      return submit.cancel();
    }

    if (htmlForm.isSubmitting() && options.multipleSubmits == 'prevent') {
      cancel();
    } else {
      if (htmlForm.isSubmitting() && options.multipleSubmits == 'abort') {
        if (currentRequest) currentRequest.abort();
      }
      currentRequest = submit.controller;

      if (options.onSubmit) {
        await options.onSubmit({ ...submit, cancel });
      }
    }

    if (cancelled) {
      cancelFlash();
    } else {
      // Client validation
      if (options.validators) {
        if (options.validators.constructor.name == 'ZodObject') {
          const validator = options.validators as AnyZodObject;
          const result = await validator.safeParseAsync(get(data));

          if (!result.success) {
            errors.set(mapErrors<T>(result.error.format()) as any);
            cancel();
            htmlForm.scrollToFirstError();
          }
        }
      }

      if (!cancelled) {
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

        htmlForm.submitting();

        if (options.dataType === 'json') {
          const postData = get(data);
          submit.data.set('__superform_json', stringify(postData));
          Object.keys(postData).forEach((key) => submit.data.delete(key));
        }
      }
    }

    return async ({ result }) => {
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
