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
import { isElementInViewport, scrollToAndCenter } from './elements.js';
import {
  derived,
  get,
  writable,
  type Readable,
  type Writable
} from 'svelte/store';
import { onDestroy, tick } from 'svelte';
import { browser } from '$app/environment';
import {
  SuperFormError,
  type TaintedFields,
  type Validation,
  type ValidationErrors,
  type Validator,
  type Validators
} from '../index.js';
import type { z, AnyZodObject, ZodEffects } from 'zod';
import { stringify } from 'devalue';
import type { FormFields } from '../index.js';
import {
  mapErrors,
  traversePath,
  findErrors,
  traversePaths,
  traversePathAsync
} from '../entity.js';
import { fieldProxy } from './proxies.js';
import { clone } from '../utils.js';

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
} from './proxies.js';

type FormUpdate = (
  result: Exclude<ActionResult, { type: 'error' }>,
  untaint?: boolean
) => Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormOptions<T extends AnyZodObject, M> = Partial<{
  id: string;
  applyAction: boolean;
  invalidateAll: boolean;
  resetForm: boolean;
  scrollToError: 'auto' | 'smooth' | 'off';
  autoFocusOnError: boolean | 'detect';
  errorSelector: string;
  selectErrorText: boolean;
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
    | ((event: {
        result: {
          type: 'error';
          status?: number;
          error: App.Error;
        };
        message: Writable<Validation<T, M>['message']>;
      }) => MaybePromise<unknown | void>);
  dataType: 'form' | 'json';
  validators:
    | Validators<T>
    | T
    | ZodEffects<T>
    | ZodEffects<ZodEffects<T>>
    | ZodEffects<ZodEffects<ZodEffects<T>>>
    | ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>
    | ZodEffects<ZodEffects<ZodEffects<ZodEffects<ZodEffects<T>>>>>;
  defaultValidator: 'keep' | 'clear';
  clearOnSubmit: 'errors' | 'message' | 'errors-and-message' | 'none';
  delayMs: number;
  timeoutMs: number;
  multipleSubmits: 'prevent' | 'allow' | 'abort';
  syncFlashMessage?: boolean;
  flashMessage: {
    module: {
      getFlash(page: Readable<Page>): Writable<App.PageData['flash']>;
      updateFlash(
        page: Readable<Page>,
        update?: () => Promise<void>
      ): Promise<void>;
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
}>;

const defaultFormOptions = {
  applyAction: true,
  invalidateAll: true,
  resetForm: false,
  autoFocusOnError: 'detect',
  scrollToError: 'smooth',
  errorSelector: '[data-invalid]',
  selectErrorText: false,
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
  defaultValidator: 'keep',
  clearOnSubmit: 'errors-and-message',
  delayMs: 500,
  timeoutMs: 8000,
  multipleSubmits: 'prevent',
  validation: undefined
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SuperFormSnapshot<T extends AnyZodObject, M = any> = Validation<
  T,
  M
> & { tainted: TaintedFields<T> | undefined };

type SuperFormEvents<T extends AnyZodObject, M> = Pick<
  FormOptions<T, M>,
  'onError' | 'onResult' | 'onSubmit' | 'onUpdate' | 'onUpdated'
>;

type SuperFormEventList<T extends AnyZodObject, M> = {
  [Property in keyof SuperFormEvents<T, M>]-?: NonNullable<
    SuperFormEvents<T, M>[Property]
  >[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EnhancedForm<T extends AnyZodObject, M = any> = {
  form: Writable<Validation<T, M>['data']>;
  formId: Writable<string | undefined>;
  errors: Writable<Validation<T, M>['errors']>;
  constraints: Writable<Validation<T, M>['constraints']>;
  message: Writable<Validation<T, M>['message']>;
  tainted: Writable<TaintedFields<T> | undefined>;
  meta: Readable<Validation<T, M>['meta']>;

  valid: Readable<boolean>;
  empty: Readable<boolean>;
  submitting: Readable<boolean>;
  delayed: Readable<boolean>;
  timeout: Readable<boolean>;

  fields: FormFields<T>;
  firstError: Readable<{ path: string[]; message: string } | null>;
  allErrors: Readable<{ path: string[]; message: string }[]>;

  enhance: (
    el: HTMLFormElement,
    events?: SuperFormEvents<T, M>
  ) => ReturnType<typeof formEnhance>;
  update: FormUpdate;
  reset: (options?: { keepMessage: boolean }) => void;

  capture: () => SuperFormSnapshot<T, M>;
  restore: (snapshot: SuperFormSnapshot<T, M>) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SuperForm<T extends AnyZodObject, M = any> = EnhancedForm<T, M>;

/**
 * Initializes a SvelteKit form, for convenient handling of values, errors and sumbitting data.
 * @param {Validation} form Usually data.form from PageData.
 * @param {FormOptions} options Configuration for the form.
 * @returns {SuperForm} An object with properties for the form.
 */
export function superForm<
  T extends AnyZodObject = AnyZodObject,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  form: Validation<T, M> | null | undefined | string,
  options: FormOptions<T, M> = {}
): SuperForm<T, M> {
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

  const unsubscriptions: (() => void)[] = [];

  onDestroy(() => {
    unsubscriptions.forEach((unsub) => unsub());

    for (const events of Object.values(formEvents)) {
      events.length = 0;
    }
  });

  let formId = typeof form === 'string' ? form : options.id ?? form?.id;
  const FormId = writable<string | undefined>(formId);
  unsubscriptions.push(FormId.subscribe((id) => (formId = id)));

  // Detect if a form is posted without JavaScript.
  {
    const postedForm = get(page).form;
    if (postedForm && typeof postedForm === 'object') {
      for (const superForm of findForms(postedForm).reverse()) {
        if (superForm.id === formId) {
          form = superForm as Validation<T, M>;
          break;
        }
      }
    }
  }

  // Check for nested objects, throw if datatype isn't json
  function checkJson(key: string, value: unknown) {
    if (!value || typeof value !== 'object') return;

    if (Array.isArray(value)) {
      if (value.length > 0) checkJson(key, value[0]);
    } else if (!(value instanceof Date)) {
      throw new SuperFormError(
        `Object found in form field "${key}". Set options.dataType = 'json' and use:enhance to use nested data structures.`
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

  const initialForm = clone(form);
  const storeForm = clone(form);

  // Stores for the properties of Validation<T, M>
  // Need to make a copy here too, in case the form variable
  // is used to populate multiple forms.
  const Valid = writable(storeForm.valid);
  const Empty = writable(storeForm.empty);
  const Message = writable<M | undefined>(storeForm.message);
  const Errors = writable(storeForm.errors);
  const Data = writable(storeForm.data);
  const Constraints = writable(storeForm.constraints);
  const Meta = writable<Validation<T, M>['meta'] | undefined>(
    storeForm.meta
  );

  const Tainted = writable<TaintedFields<T> | undefined>();

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

  //////////////////////////////////////////////////////////////////////

  if (typeof initialForm.valid !== 'boolean') {
    throw new SuperFormError(
      "A non-validation object was passed to superForm. Check what's passed to its first parameter (null/undefined is allowed)."
    );
  }

  // Need to set this after use:enhance has run, to avoid showing the
  // tainted dialog when a form doesn't use it or the browser doesn't use JS.
  const _taintedMessage = options.taintedMessage;
  options.taintedMessage = undefined;

  function enableTaintedMessage() {
    options.taintedMessage = _taintedMessage;
  }

  function rebind(
    form: Validation<T, M>,
    untaint: TaintedFields<T> | boolean,
    message?: M
  ) {
    if (untaint) {
      Tainted.set(typeof untaint === 'boolean' ? undefined : untaint);
      checkedTaintedFormState = clone(form.data);
    }

    message = message ?? form.message;

    Data.set(form.data);
    Message.set(message);
    Empty.set(form.empty);
    Valid.set(form.valid);
    Errors.set(form.errors);
    Meta.set(form.meta);
    FormId.set(form.id);

    if (options.flashMessage && shouldSyncFlash(options)) {
      const flash = options.flashMessage.module.getFlash(page);
      if (message && get(flash) === undefined) {
        flash.set(message as any);
      }
    }
  }

  async function _update(form: Validation<T, M>, untaint: boolean) {
    let cancelled = false;
    const data = {
      form,
      cancel: () => (cancelled = true)
    };

    for (const event of formEvents.onUpdate) {
      await event(data);
    }

    if (cancelled) {
      if (options.flashMessage) cancelFlash(options);
      return;
    }

    if (form.valid && options.resetForm) {
      _resetForm(form.message);
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

  function _resetForm(message?: M) {
    rebind(clone(initialForm), true, message);
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

  const formEvents: SuperFormEventList<T, M> = {
    onSubmit: options.onSubmit ? [options.onSubmit] : [],
    onResult: options.onResult ? [options.onResult] : [],
    onUpdate: options.onUpdate ? [options.onUpdate] : [],
    onUpdated: options.onUpdated ? [options.onUpdated] : [],
    onError: options.onError ? [options.onError] : []
  };

  async function checkTainted(
    newObj: unknown,
    compareAgainst: unknown,
    path: string[] = []
  ): Promise<Record<string, unknown> | undefined> {
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
          await checkTainted(
            newObj[prop as keyof object],
            compareAgainst[prop as keyof object],
            path.concat([prop])
          );
        }
        return;
      }
    } else if (newObj === compareAgainst) {
      return;
    }

    // At this point, the field is modified.
    Tainted.update((tainted) => {
      if (!tainted) tainted = {};
      const leaf = traversePath(tainted, path, ({ parent, key, value }) => {
        if (value === undefined) parent[key] = {};
        else if (value === true) {
          // If a previous check tainted the node, but the search goes deeper,
          // so it needs to be replaced with a (parent) node
          parent[key] = {};
        }
        return parent[key];
      });
      if (leaf) leaf.parent[leaf.key] = true;
      return tainted;
    });

    /*
    console.log(
      '🚀 ~ file: index.ts:460 ~ Tainted.update ~ Tainted:',
      path,
      newObj,
      get(Tainted)
    );
    */

    if (options.defaultValidator == 'clear') {
      Errors.update((errors) => {
        const leaf = traversePath(errors, path);
        if (leaf) delete leaf.parent[leaf.key];
        return errors;
      });
    }
  }

  ///// When use:enhance is enabled ///////////////////////////////////////////

  // Prevent client validation on first page load
  // (when it recieives data from the server)
  let checkedTaintedFormState: typeof initialForm.data | undefined;

  function isTainted(obj: unknown): boolean {
    if (obj === null)
      throw new SuperFormError('$tainted store contained null');

    if (typeof obj === 'object') {
      for (const obj2 of Object.values(obj)) {
        if (isTainted(obj2)) return true;
      }
    }
    return obj === true;
  }

  if (browser) {
    beforeNavigate((nav) => {
      if (options.taintedMessage && !get(Submitting)) {
        const taintStatus = get(Tainted);
        if (
          taintStatus &&
          isTainted(taintStatus) &&
          !window.confirm(options.taintedMessage)
        ) {
          nav.cancel();
        }
      }
    });

    unsubscriptions.push(
      Data.subscribe(async (data) => {
        //console.log('🚀 ~ Data.subscribe ~ hasNewData:', formId, hasNewData);
        if (!checkedTaintedFormState) {
          checkedTaintedFormState = initialForm.data;
          return;
        }

        if (!get(Submitting)) {
          await checkTainted(data, checkedTaintedFormState);
          checkedTaintedFormState = clone(data);
        }
      })
    );

    // Need to subscribe to catch page invalidation.
    if (options.applyAction) {
      unsubscriptions.push(
        page.subscribe(async (pageUpdate) => {
          function error(type: string) {
            throw new SuperFormError(
              `No form data found in ${type}. Make sure you return { form } in form actions and load functions.`
            );
          }

          const untaint =
            pageUpdate.status >= 200 && pageUpdate.status < 300;

          if (pageUpdate.form && typeof pageUpdate.form === 'object') {
            const forms = findForms(pageUpdate.form);
            if (!forms.length) error('$page.form (ActionData)');

            for (const newForm of forms) {
              //console.log('🚀~ ActionData ~ newForm:', newForm.id);
              if (newForm === form || newForm.id !== formId) continue;

              // Prevent client validation from overriding the new server errors.
              checkedTaintedFormState = undefined;
              await _update(newForm as Validation<T, M>, untaint);
            }
          } else if (
            pageUpdate.data &&
            typeof pageUpdate.data === 'object'
          ) {
            const forms = findForms(pageUpdate.data);

            // It's a page reload, redirect or error/failure,
            // so don't trigger any events, just update the data.
            for (const newForm of forms) {
              //console.log('🚀 ~ PageData ~ newForm:', newForm.id);
              if (newForm === form || newForm.id !== formId) continue;

              checkedTaintedFormState = undefined;
              rebind(newForm as Validation<T, M>, untaint);
            }
          }
        })
      );
    }
  }

  const Fields = Object.fromEntries(
    Object.keys(initialForm.data).map((key) => [
      key,
      Fields_create(key, initialForm)
    ])
  ) as FormFields<T>;

  function Fields_create(key: string, validation: Validation<T, M>) {
    return {
      name: key,
      value: fieldProxy(Data, key),
      errors: fieldProxy(Errors, key),
      constraints: fieldProxy(Constraints, key),
      type: validation.meta?.types[key]
    };
  }

  return {
    form: Data,
    formId: FormId,
    errors: Errors,
    message: Message,
    constraints: Constraints,
    meta: derived(Meta, ($m) => $m),

    fields: Fields,

    tainted: Tainted,
    valid: derived(Valid, ($s) => $s),
    empty: derived(Empty, ($e) => $e),

    submitting: derived(Submitting, ($s) => $s),
    delayed: derived(Delayed, ($d) => $d),
    timeout: derived(Timeout, ($t) => $t),

    capture: () => ({
      valid: get(Valid),
      errors: get(Errors),
      data: get(Data),
      empty: get(Empty),
      constraints: get(Constraints),
      message: get(Message),
      id: formId,
      meta: get(Meta),
      tainted: get(Tainted)
    }),

    restore: (snapshot: SuperFormSnapshot<T, M>) => {
      rebind(snapshot, snapshot.tainted ?? true);
    },

    enhance: (el: HTMLFormElement, events?: SuperFormEvents<T, M>) => {
      if (events) {
        if (events.onError) {
          if (options.onError === 'apply') {
            throw new SuperFormError(
              'options.onError is set to "apply", cannot add any onError events.'
            );
          } else if (events.onError === 'apply') {
            throw new SuperFormError(
              'Cannot add "apply" as onError event in use:enhance.'
            );
          }

          formEvents.onError.push(events.onError);
        }
        if (events.onResult) formEvents.onResult.push(events.onResult);
        if (events.onSubmit) formEvents.onSubmit.push(events.onSubmit);
        if (events.onUpdate) formEvents.onUpdate.push(events.onUpdate);
        if (events.onUpdated) formEvents.onUpdated.push(events.onUpdated);
      }

      return formEnhance(
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
        formEvents
      );
    },

    firstError: FirstError,
    allErrors: AllErrors,
    update: Data_update,
    reset: (options?) =>
      _resetForm(options?.keepMessage ? get(Message) : undefined)
  };
}

function cancelFlash<T extends AnyZodObject, M>(options: FormOptions<T, M>) {
  if (!options.flashMessage || !browser) return;
  if (!shouldSyncFlash(options)) return;

  document.cookie = `flash=; Max-Age=0; Path=${
    options.flashMessage.cookiePath ?? '/'
  };`;
}

function shouldSyncFlash<T extends AnyZodObject, M>(
  options: FormOptions<T, M>
) {
  if (!options.flashMessage || !browser) return false;
  return options.syncFlashMessage;
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
  errs: Writable<unknown>,
  Data_update: FormUpdate,
  options: FormOptions<T, M>,
  data: Writable<z.infer<T>>,
  message: Writable<M | undefined>,
  enableTaintedForm: () => void,
  formEvents: SuperFormEventList<T, M>
) {
  // Now we know that we are upgraded, so we can enable the tainted form option.
  enableTaintedForm();

  // Using this type in the function argument causes a type recursion error.
  const errors = errs as Writable<ValidationErrors<T>>;

  function setError(path: string[], newErrors: string[] | null) {
    errors.update((err) => {
      const errorPath = traversePath(err, path, ({ parent, key, value }) => {
        if (value === undefined) parent[key] = {};
        return parent[key];
      });

      if (errorPath) {
        const { parent, key } = errorPath;
        if (newErrors === null) delete parent[key];
        else parent[key] = newErrors;
      }
      return err;
    });
  }

  async function validate(
    validator: Validator<unknown>,
    value: unknown,
    path: string[]
  ) {
    const errors = await validator(value);
    setError(path, typeof errors === 'string' ? [errors] : errors ?? null);
    return !errors;
  }

  const ErrorTextEvents = new Set<HTMLFormElement>();

  function ErrorTextEvents_selectText(e: Event) {
    const target = e.target as HTMLInputElement;
    if (options.selectErrorText) target.select();
  }

  function ErrorTextEvents_addErrorTextListeners(formEl: HTMLFormElement) {
    formEl.querySelectorAll('input').forEach((el) => {
      el.addEventListener('invalid', ErrorTextEvents_selectText);
    });
  }

  function ErrorTextEvents_removeErrorTextListeners(
    formEl: HTMLFormElement
  ) {
    formEl
      .querySelectorAll('input')
      .forEach((el) =>
        el.removeEventListener('invalid', ErrorTextEvents_selectText)
      );
  }

  onDestroy(() => {
    ErrorTextEvents.forEach((formEl) =>
      ErrorTextEvents_removeErrorTextListeners(formEl)
    );
    ErrorTextEvents.clear();
  });

  /**
   * @DCI-context
   */
  function Form(formEl: HTMLFormElement) {
    function rebind() {
      if (options.selectErrorText) {
        if (Form && formEl !== Form) {
          ErrorTextEvents_removeErrorTextListeners(Form as HTMLFormElement);
          ErrorTextEvents.delete(Form as HTMLFormElement);
        }
        if (!ErrorTextEvents.has(formEl)) {
          ErrorTextEvents_addErrorTextListeners(formEl);
          ErrorTextEvents.add(formEl);
        }
      }

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

      if (focusEl) {
        try {
          focusEl.focus({ preventScroll: true });
          if (options.selectErrorText && focusEl.tagName == 'INPUT') {
            (focusEl as HTMLInputElement).select();
          }
        } catch (err) {
          // Some hidden inputs like from flatpickr cannot be focused.
        }
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

      const data = { ...submit, cancel };

      for (const event of formEvents.onSubmit) {
        await event(data);
      }
    }

    if (cancelled) {
      if (options.flashMessage) cancelFlash(options);
    } else {
      // Client validation
      if (options.validators) {
        const checkData = get(data);
        let success: boolean;

        if (
          options.validators.constructor.name == 'ZodObject' ||
          options.validators.constructor.name == 'ZodEffects'
        ) {
          // Zod validator
          const validator = options.validators as AnyZodObject;
          const result = await validator.safeParseAsync(checkData);

          success = result.success;

          if (!result.success) {
            errors.set(mapErrors<T>(result.error.format()) as any);
          }
        } else {
          // SuperForms validator

          const validator = options.validators as Validators<T>;
          success = true;

          await traversePaths(checkData, async ({ value, path }) => {
            // Filter out array indices, the validator structure doesn't contain these.
            const validationPath = path.filter((p) => isNaN(parseInt(p)));
            const maybeValidator = await traversePathAsync(
              validator,
              validationPath
            );

            if (typeof maybeValidator?.value === 'function') {
              const check = maybeValidator.value as Validator<unknown>;

              if (Array.isArray(value)) {
                for (const key in value) {
                  if (
                    !(await validate(check, value[key], path.concat([key])))
                  ) {
                    success = false;
                  }
                }
                return;
              } else if (!(await validate(check, value, path))) {
                success = false;
              }
            }
          });
        }

        if (!success) {
          cancel();
          htmlForm.scrollToFirstError();
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
            options.clearOnSubmit == 'message') &&
          shouldSyncFlash(options)
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

      const data = {
        result,
        formEl,
        cancel: () => (cancelled = true)
      };

      for (const event of formEvents.onResult) {
        await event(data);
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
          if (options.onError !== 'apply') {
            // TODO: Omit 'apply' and undefined from the type
            // They are already filtered out, but type shouldn't be any.
            const data = { result, message };

            for (const event of formEvents.onError) {
              if (event !== 'apply') await event(data);
            }
          }
        }

        // Set flash message, which should be set in all cases, even
        // if we have redirected (which is the point of the flash message!)
        if (options.flashMessage) {
          if (result.type == 'error' && options.flashMessage.onError) {
            await options.flashMessage.onError({
              result,
              message: options.flashMessage.module.getFlash(page)
            });
          } else if (result.type != 'error') {
            await options.flashMessage.module.updateFlash(page);
          }
        }
      } else {
        // Cancelled
        if (options.flashMessage) cancelFlash(options);
      }

      htmlForm.completed(cancelled);
    };
  });
}
