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
  type Validators,
  type FieldPath,
  type FormPath,
  type UnwrapEffects,
  type ZodValidation
} from '../index.js';
import type { z, AnyZodObject, ZodEffects } from 'zod';
import { stringify } from 'devalue';
import type { FormFields } from '../index.js';
import {
  mapErrors,
  traversePath,
  findErrors,
  traversePathsAsync,
  comparePaths,
  setPaths,
  pathExists
} from '../entity.js';
import { fieldProxy } from './proxies.js';
import { clone } from '../utils.js';
import type { Entity } from '$lib/server/entity.js';

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
  dateProxy,
  fieldProxy,
  formFieldProxy
} from './proxies.js';

export {
  superValidate,
  actionResult,
  message,
  setMessage,
  setError,
  defaultData
} from '../validate.js';

type FormUpdate = (
  result: Exclude<ActionResult, { type: 'error' }>,
  untaint?: boolean
) => Promise<void>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormOptions<T extends ZodValidation<AnyZodObject>, M> = Partial<{
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
  SPA: true | { failStatus?: number };

  onSubmit: (
    ...params: Parameters<SubmitFunction>
  ) => MaybePromise<unknown | void>;
  onResult: (event: {
    result: ActionResult;
    formEl: HTMLFormElement;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdate: (event: {
    form: Validation<UnwrapEffects<T>, M>;
    cancel: () => void;
  }) => MaybePromise<unknown | void>;
  onUpdated: (event: {
    form: Readonly<Validation<UnwrapEffects<T>, M>>;
  }) => MaybePromise<unknown | void>;
  onError:
    | 'apply'
    | ((event: {
        result: {
          type: 'error';
          status?: number;
          error: App.Error;
        };
        message: Writable<Validation<UnwrapEffects<T>, M>['message']>;
      }) => MaybePromise<unknown | void>);
  dataType: 'form' | 'json';
  validators:
    | false
    | Validators<UnwrapEffects<T>>
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
  onError: (event: { result: { error: unknown } }) => {
    console.warn(
      'Unhandled Superform error, use onError event to handle it:',
      event.result.error
    );
  },
  dataType: 'form',
  validators: undefined,
  defaultValidator: 'keep',
  clearOnSubmit: 'errors-and-message',
  delayMs: 500,
  timeoutMs: 8000,
  multipleSubmits: 'prevent',
  validation: undefined,
  SPA: undefined
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
export type SuperForm<T extends ZodValidation<AnyZodObject>, M = any> = {
  form: Writable<Validation<T, M>['data']>;
  formId: Writable<string | undefined>;
  errors: Writable<Validation<T, M>['errors']>;
  constraints: Writable<Validation<T, M>['constraints']>;
  message: Writable<Validation<T, M>['message']>;
  tainted: Writable<TaintedFields<UnwrapEffects<T>> | undefined>;
  meta: Readable<Validation<T, M>['meta']>;

  valid: Readable<boolean>;
  empty: Readable<boolean>;
  submitting: Readable<boolean>;
  delayed: Readable<boolean>;
  timeout: Readable<boolean>;

  fields: FormFields<UnwrapEffects<T>>;
  firstError: Readable<{ path: string[]; message: string } | null>;
  allErrors: Readable<{ path: string[]; message: string }[]>;

  options: FormOptions<T, M>;

  enhance: (
    el: HTMLFormElement,
    events?: SuperFormEvents<UnwrapEffects<T>, M>
  ) => ReturnType<typeof formEnhance>;
  update: FormUpdate;
  reset: (options?: { keepMessage: boolean }) => void;

  capture: () => SuperFormSnapshot<UnwrapEffects<T>, M>;
  restore: (snapshot: SuperFormSnapshot<UnwrapEffects<T>, M>) => void;

  validate: (
    path: keyof z.infer<T> | FieldPath<z.infer<T>>,
    opts?: {
      value?: FormPath<z.infer<T>, FieldPath<z.infer<T>>>;
      update?: boolean;
    }
  ) => Promise<string[] | undefined>;
};

/**
 * @deprecated Use SuperForm instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EnhancedForm<T extends AnyZodObject, M = any> = SuperForm<T, M>;

/**
 * Initializes a SvelteKit form, for convenient handling of values, errors and sumbitting data.
 * @param {Validation} form Usually data.form from PageData.
 * @param {FormOptions} options Configuration for the form.
 * @returns {SuperForm} An object with properties for the form.
 */
export function superForm<
  T extends ZodValidation<AnyZodObject> = ZodValidation<AnyZodObject>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
>(
  form:
    | z.infer<UnwrapEffects<T>>
    | Validation<UnwrapEffects<T>, M>
    | null
    | undefined
    | string,
  options: FormOptions<UnwrapEffects<T>, M> = {}
): SuperForm<UnwrapEffects<T>, M> {
  type T2 = UnwrapEffects<T>;

  options = { ...(defaultFormOptions as FormOptions<T2, M>), ...options };

  function emptyForm(data: Partial<z.infer<T>> = {}): Validation<T2, M> {
    return {
      valid: false,
      errors: {},
      data,
      empty: true,
      constraints: {} as Validation<T2, M>['constraints']
    };
  }

  function findForms(data: Record<string, unknown>) {
    return Object.values(data).filter(
      (v) => isValidationObject(v) !== false
    ) as Validation<AnyZodObject>[];
  }

  /**
   * Return false if object isn't a validation object, otherwise the form id,
   * which may be undefined, so a falsy check isn't enough.
   */
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
          form = superForm as Validation<T2, M>;
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

  // Normalize form argument to Validation<T, M>
  if (!form || typeof form === 'string') {
    form = emptyForm(); // Takes care of null | undefined | string
  } else if (isValidationObject(form) === false) {
    form = emptyForm(form); // Takes care of Partial<z.infer<T>>
  }

  const form2 = form as Validation<T2, M>;

  if (options.dataType !== 'json') {
    for (const [key, value] of Object.entries(form2.data)) {
      checkJson(key, value);
    }
  }

  // Need to clone the validation data, in case
  // it's used to populate multiple forms.
  const initialForm = clone(form2);
  const storeForm = clone(form2);

  // Stores for the properties of Validation<T, M>
  const Valid = writable(storeForm.valid);
  const Empty = writable(storeForm.empty);
  const Message = writable<M | undefined>(storeForm.message);
  const Errors = writable(storeForm.errors);
  const Data = writable(storeForm.data);
  const Constraints = writable(storeForm.constraints);
  const Meta = writable<Validation<T2, M>['meta'] | undefined>(
    storeForm.meta
  );

  const Tainted = writable<TaintedFields<T2> | undefined>();

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
      'A non-validation object was passed to superForm. ' +
        "Check what's passed to its first parameter (null/undefined is allowed)."
    );
  }

  if (options.SPA && options.validators === undefined) {
    console.warn(
      'No validators set for Superform in SPA mode. Add them to the validators option, or set it to false to disable this warning.'
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
    form: Validation<T2, M>,
    untaint: TaintedFields<T2> | boolean,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        flash.set(message as any);
      }
    }
  }

  async function _update(form: Validation<T2, M>, untaint: boolean) {
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
        newForm as Validation<T2, M>,
        untaint ?? (result.status >= 200 && result.status < 300)
      );
    }
  };

  const formEvents: SuperFormEventList<T2, M> = {
    onSubmit: options.onSubmit ? [options.onSubmit] : [],
    onResult: options.onResult ? [options.onResult] : [],
    onUpdate: options.onUpdate ? [options.onUpdate] : [],
    onUpdated: options.onUpdated ? [options.onUpdated] : [],
    onError: options.onError ? [options.onError] : []
  };

  const LastChanges = writable<string[][]>([]);

  function checkTainted(newObj: unknown, compareAgainst: unknown) {
    const paths = comparePaths(newObj, compareAgainst);

    LastChanges.set(paths);

    if (paths.length) {
      Tainted.update((tainted) => {
        //console.log('Update tainted:', paths, newObj, compareAgainst);
        if (!tainted) tainted = {};
        setPaths(tainted, paths, true);
        return tainted;
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
        if (!get(Submitting) && checkedTaintedFormState) {
          checkTainted(data, checkedTaintedFormState);
        }
        checkedTaintedFormState = clone(data);
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
              await _update(newForm as Validation<T2, M>, untaint);
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
              rebind(newForm as Validation<T2, M>, untaint);
            }
          }
        })
      );
    }
  }

  const Fields = Object.fromEntries(
    Object.keys(initialForm.data).map((key) => {
      return [key, Fields_create(key, initialForm)];
    })
  ) as unknown as FormFields<T2>;

  function Fields_create(
    key: keyof z.infer<T>,
    validation: Validation<T2, M>
  ) {
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

    options,

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

    restore: (snapshot: SuperFormSnapshot<T2, M>) => {
      rebind(snapshot, snapshot.tainted ?? true);
    },

    validate: (
      path: keyof z.infer<T> | FieldPath<z.infer<T>>,
      opts: {
        value?: FormPath<z.infer<T>, FieldPath<z.infer<T>>>;
        update?: boolean;
      } = {}
    ) => {
      return validateField(
        (Array.isArray(path) ? path : [path]) as string[],
        options.validators,
        get(Data),
        opts.update === false ? undefined : Errors,
        options.defaultValidator,
        opts.value
      );
    },
    enhance: (el: HTMLFormElement, events?: SuperFormEvents<T2, M>) => {
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
        formEvents,
        FormId,
        Meta,
        Constraints,
        Tainted,
        LastChanges
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

async function validateField<T extends AnyZodObject, M>(
  path: string[],
  validators: FormOptions<T, M>['validators'],
  data: z.infer<T>,
  errors: SuperForm<T, M>['errors'] | undefined,
  defaultValidator: FormOptions<T, M>['defaultValidator'],
  value?: unknown
): Promise<string[] | undefined> {
  function setError(errorMsgs: null | undefined | string | string[]) {
    if (typeof errorMsgs === 'string') errorMsgs = [errorMsgs];

    if (errors) {
      errors.update((errors) => {
        const error = traversePath(
          errors,
          path as FieldPath<typeof errors>,
          (data) => {
            if (data.value === undefined) {
              data.parent[data.key] = {};
              return data.parent[data.key];
            } else {
              return data.value;
            }
          }
        );

        if (!error)
          throw new SuperFormError(
            'Error path could not be created: ' + path
          );

        error.parent[error.key] = errorMsgs ?? undefined;
        return errors;
      });
    }
    return errorMsgs ?? undefined;
  }

  async function defaultValidate() {
    if (defaultValidator == 'clear') {
      setError(undefined);
    }
    return undefined;
  }

  if (value === undefined) {
    const dataToValidate = traversePath(
      data,
      path as FieldPath<typeof data>
    );

    if (!dataToValidate)
      throw new SuperFormError('Validation data not found: ' + path);
    else value = dataToValidate.value;
  }

  if (typeof validators !== 'object') {
    return defaultValidate();
  }

  // Remove array indices, they don't exist in validators.
  const validationPath = path.filter((p) => isNaN(parseInt(p)));

  function extractValidator(data: any, key: string) {
    const objectShape = data?._def?.schema?.shape;
    if (objectShape) return objectShape[key];

    const arrayShape = data?.element?.shape;
    if (arrayShape) return arrayShape[key];

    throw new SuperFormError(
      'Invalid Zod validator for ' + key + ': ' + data
    );
  }

  if ('safeParseAsync' in validators) {
    // Zod validator

    const validator = traversePath(
      validators as AnyZodObject,
      validationPath as FieldPath<AnyZodObject>,
      (data) => {
        return extractValidator(data.parent, data.key);
      }
    );

    if (!validator)
      throw new SuperFormError('No Zod validator found: ' + path);

    const result = await extractValidator(
      validator.parent,
      validator.key
    ).safeParseAsync(value);

    if (!result.success) {
      const msgs = mapErrors<T>(result.error.format());
      return setError(msgs._errors);
    } else {
      return setError(undefined);
    }
  } else {
    // SuperForms validator

    const validationPath = path.filter((p) => isNaN(parseInt(p)));

    const validator = traversePath(
      validators as Validators<UnwrapEffects<T>>,
      validationPath as FieldPath<typeof validators>
    );

    if (!validator) {
      // Path didn't exist
      throw new SuperFormError('No Superforms validator found: ' + path);
    } else if (validator.value === undefined) {
      // No validator, use default
      return defaultValidate();
    } else {
      const result = validator.value(value);
      return setError(result);
    }
  }
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
  formEvents: SuperFormEventList<T, M>,
  id: Readable<string | undefined>,
  meta: Readable<Entity<T>['meta'] | undefined>,
  constraints: Readable<Entity<T>['constraints']>,
  tainted: Writable<TaintedFields<T> | undefined>,
  lastChanges: Writable<string[][]>
) {
  // Now we know that we are upgraded, so we can enable the tainted form option.
  enableTaintedForm();

  // Using this type in the function argument causes a type recursion error.
  const errors = errs as Writable<ValidationErrors<T>>;

  function equal(one: string[][], other: string[][]) {
    return (
      one.map((v) => v.join()).join() == other.map((v) => v.join()).join()
    );
  }

  // Add blur event, to check tainted
  let lastBlur: string[][] = [];
  function checkBlur() {
    setTimeout(() => {
      const newChanges = get(lastChanges);
      if (equal(newChanges, lastBlur)) return;
      lastBlur = newChanges;

      for (const change of newChanges) {
        //console.log('🚀 ~ file: index.ts:905 ~ BLUR:', change);
        validateField(
          change,
          options.validators,
          get(data),
          errors,
          options.defaultValidator
        );
      }
    });
  }
  formEl.addEventListener('focusout', checkBlur);

  // Add input event, to check tainted
  function checkInput() {
    setTimeout(() => {
      for (const change of get(lastChanges)) {
        const taintedContent = get(tainted);
        const isTainted =
          taintedContent && pathExists(taintedContent, change, true);

        const errorContent = get(errors);
        const hasError = errorContent && pathExists(errorContent, change);

        if (isTainted && hasError) {
          //console.log('🚀 ~ file: index.ts:920 ~ INPUT with error:', change);
          validateField(
            change,
            options.validators,
            get(data),
            errors,
            options.defaultValidator
          );
        }
      }
    });
  }
  formEl.addEventListener('input', checkInput);

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
    formEl.removeEventListener('focusout', checkBlur);
    formEl.removeEventListener('input', checkInput);
  });

  type ValidationResponse<
    Success extends Record<string, unknown> | undefined = Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
    >,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Invalid extends Record<string, unknown> | undefined = Record<string, any>
  > = { result: ActionResult<Success, Invalid> };

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
          if (!cancelled) setTimeout(Form_scrollToFirstError);
        },

        scrollToFirstError: () => setTimeout(Form_scrollToFirstError),

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
        let valid: boolean;
        let clientErrors: ValidationErrors<T> = {};

        if ('safeParseAsync' in options.validators) {
          // Zod validator
          const validator = options.validators as AnyZodObject;
          const result = await validator.safeParseAsync(checkData);

          valid = result.success;

          if (!result.success) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clientErrors = mapErrors<T>(result.error.format()) as any;
          }
        } else {
          // SuperForms validator

          valid = true;

          const validator = options.validators as Validators<T>;
          const newErrors: {
            path: string[];
            errors: string[] | undefined;
          }[] = [];

          await traversePathsAsync(checkData, async ({ value, path }) => {
            // Filter out array indices, the validator structure doesn't contain these.
            const validationPath = path.filter((p) => isNaN(parseInt(p)));
            const maybeValidator = traversePath(
              validator,
              validationPath as FieldPath<typeof validator>
            );

            if (typeof maybeValidator?.value === 'function') {
              const check = maybeValidator.value as Validator<unknown>;

              if (Array.isArray(value)) {
                for (const key in value) {
                  const errors = await check(value[key]);
                  if (errors) {
                    valid = false;
                    newErrors.push({
                      path: path.concat([key]),
                      errors:
                        typeof errors === 'string'
                          ? [errors]
                          : errors ?? undefined
                    });
                  }
                }
              } else {
                const errors = await check(value);
                if (errors) {
                  valid = false;
                  newErrors.push({
                    path,
                    errors:
                      typeof errors === 'string'
                        ? [errors]
                        : errors ?? undefined
                  });
                }
              }
            }
          });

          for (const { path, errors } of newErrors) {
            const errorPath = traversePath(
              clientErrors,
              path as FieldPath<typeof clientErrors>,
              ({ parent, key, value }) => {
                if (value === undefined) parent[key] = {};
                return parent[key];
              }
            );

            if (errorPath) {
              const { parent, key } = errorPath;
              parent[key] = errors;
            }
          }
        }

        if (!valid) {
          cancel();

          const validationResult: Validation<T> = {
            valid,
            errors: clientErrors,
            data: checkData,
            empty: false,
            constraints: get(constraints),
            message: undefined,
            id: get(id),
            meta: get(meta)
          };

          const result = {
            type: 'failure' as const,
            status:
              (typeof options.SPA === 'boolean'
                ? undefined
                : options.SPA?.failStatus) ?? 400,
            data: { form: validationResult }
          };

          setTimeout(() => validationResponse({ result }), 0);
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

        // TODO: If SPA, cancel request here, factor out the result callback and call it directly.

        if (options.SPA) {
          cancel();

          const validationResult: Validation<T> = {
            valid: true,
            errors: {},
            data: get(data),
            empty: false,
            constraints: get(constraints),
            message: undefined,
            id: get(id),
            meta: get(meta)
          };

          const result = {
            type: 'success' as const,
            status: 200,
            data: { form: validationResult }
          };

          setTimeout(() => validationResponse({ result }), 0);
        } else if (options.dataType === 'json') {
          const postData = get(data);
          submit.data.set('__superform_json', stringify(postData));

          // Clear post data to reduce transfer size,
          // since $form should be serialized and sent as json.
          Object.keys(postData).forEach((key) => {
            // Files should be kept though, even if same key.
            if (typeof submit.data.get(key) === 'string') {
              submit.data.delete(key);
            }
          });
        }
      }
    }

    async function validationResponse(event: ValidationResponse) {
      const result = event.result;

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
    }

    return validationResponse;
  });
}
