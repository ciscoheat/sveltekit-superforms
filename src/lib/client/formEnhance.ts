import { enhance, applyAction } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { page } from '$app/stores';
import type { ActionResult } from '@sveltejs/kit';
import { get, type Readable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
  SuperFormError,
  type TaintedFields,
  type SuperValidated,
  type ZodValidation
} from '../index.js';
import type { z, AnyZodObject } from 'zod';
import { stringify } from 'devalue';
import type { Entity } from '../schemaEntity.js';
import {
  defaultOnError,
  type FormOptions,
  type SuperForm
} from './index.js';
import { clientValidation, validateField } from './clientValidation.js';
import { Form } from './form.js';
import { onDestroy } from 'svelte';
import { traversePath } from '$lib/traversal.js';
import { mergePath, splitPath } from '$lib/stringPath.js';

export type FormUpdate = (
  result: Exclude<ActionResult, { type: 'error' }>,
  untaint?: boolean
) => Promise<void>;

export type SuperFormEvents<T extends AnyZodObject, M> = Pick<
  FormOptions<T, M>,
  'onError' | 'onResult' | 'onSubmit' | 'onUpdate' | 'onUpdated'
>;

export type SuperFormEventList<T extends AnyZodObject, M> = {
  [Property in keyof SuperFormEvents<T, M>]-?: NonNullable<
    SuperFormEvents<T, M>[Property]
  >[];
};

type ValidationResponse<
  Success extends Record<string, unknown> | undefined = Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Invalid extends Record<string, unknown> | undefined = Record<string, any>
> = { result: ActionResult<Success, Invalid> };

export function cancelFlash<T extends AnyZodObject, M>(
  options: FormOptions<T, M>
) {
  if (!options.flashMessage || !browser) return;
  if (!shouldSyncFlash(options)) return;

  document.cookie = `flash=; Max-Age=0; Path=${
    options.flashMessage.cookiePath ?? '/'
  };`;
}

export function shouldSyncFlash<T extends AnyZodObject, M>(
  options: FormOptions<T, M>
) {
  if (!options.flashMessage || !browser) return false;
  return options.syncFlashMessage;
}

///// Custom validity /////

const noCustomValidityDataAttribute = 'noCustomValidity';

function setCustomValidity(
  el: HTMLInputElement,
  errors: string[] | undefined
) {
  const message = errors && errors.length ? errors.join('\n') : '';
  el.setCustomValidity(message);
  if (message) el.reportValidity();
}

function setCustomValidityForm<T extends AnyZodObject, M>(
  formEl: HTMLFormElement,
  errors: SuperValidated<ZodValidation<T>, M>['errors']
) {
  for (const el of formEl.querySelectorAll<
    HTMLInputElement &
      HTMLSelectElement &
      HTMLTextAreaElement &
      HTMLButtonElement
  >('input,select,textarea,button')) {
    if (noCustomValidityDataAttribute in el.dataset) {
      continue;
    }

    const error = traversePath(errors, splitPath(el.name));
    setCustomValidity(el, error?.value);
    if (error?.value) return;
  }
}

//////////////////////////////////

/**
 * Custom use:enhance version. Flash message support, friendly error messages, for usage with initializeForm.
 * @param formEl Form element from the use:formEnhance default parameter.
 */
export function formEnhance<T extends AnyZodObject, M>(
  formEl: HTMLFormElement,
  submitting: Writable<boolean>,
  delayed: Writable<boolean>,
  timeout: Writable<boolean>,
  errs: Writable<unknown>,
  Form_updateFromActionResult: FormUpdate,
  options: FormOptions<T, M>,
  data: Writable<z.infer<T>>,
  message: Writable<M | undefined>,
  enableTaintedForm: () => void,
  formEvents: SuperFormEventList<T, M>,
  formId: Readable<string | undefined>,
  constraints: Readable<Entity<T>['constraints']>,
  tainted: Writable<TaintedFields<T> | undefined>,
  lastChanges: Writable<string[][]>,
  Context_findValidationForms: (
    data: Record<string, unknown>
  ) => SuperValidated<AnyZodObject>[],
  posted: Readable<boolean>
) {
  // Now we know that we are upgraded, so we can enable the tainted form option.
  enableTaintedForm();

  // Using this type in the function argument causes a type recursion error.
  const errors = errs as SuperForm<T, M>['errors'];

  async function updateCustomValidity(
    validityEl: HTMLElement,
    event: 'blur' | 'input',
    errors: string[] | undefined
  ) {
    if (!options.customValidity) return;
    if (options.validationMethod == 'submit-only') return;

    // Always reset validity, in case it has been validated on the server.
    if ('setCustomValidity' in validityEl) {
      (validityEl as HTMLInputElement).setCustomValidity('');
    }

    if (event == 'input' && options.validationMethod == 'onblur') return;

    // If event is input but element shouldn't use custom validity,
    // return immediately since validateField don't have to be called
    // in this case, validation is happening elsewhere.
    if (noCustomValidityDataAttribute in validityEl.dataset) return;

    setCustomValidity(validityEl as HTMLInputElement, errors);
  }

  // Called upon an event from a HTML element that affects the form.
  async function htmlInputChange(
    change: string[],
    event: 'blur' | 'input',
    target: HTMLElement | null
  ) {
    if (options.validationMethod == 'submit-only') return;

    //console.log('htmlInputChange', change, event, target);

    const result = await validateField(
      change,
      options,
      data,
      errors,
      tainted
    );

    // Update data if target exists (immediate is set, refactor please)
    if (result.data && target) data.set(result.data);

    if (options.customValidity) {
      const name = CSS.escape(mergePath(change));
      const el = formEl.querySelector<HTMLElement>(`[name="${name}"]`);
      if (el) updateCustomValidity(el, event, result.errors);
    }
  }

  const immediateInputTypes = ['checkbox', 'radio', 'range'];

  /**
   * Some input fields have timing issues with the stores, need to wait in that case.
   */
  function isImmediateInput(el: EventTarget | null) {
    return (
      el &&
      (el instanceof HTMLSelectElement ||
        (el instanceof HTMLInputElement &&
          immediateInputTypes.includes(el.type)))
    );
  }

  async function checkBlur(e: Event) {
    if (
      options.validationMethod == 'oninput' ||
      options.validationMethod == 'submit-only'
    ) {
      return;
    }

    // Wait for changes to update
    const immediateUpdate = isImmediateInput(e.target);
    if (immediateUpdate) await new Promise((r) => setTimeout(r, 0));

    const changes = get(lastChanges);
    if (!changes.length) return;

    const target = e.target instanceof HTMLElement ? e.target : null;

    for (const change of changes) {
      htmlInputChange(change, 'blur', immediateUpdate ? null : target);
    }

    // Clear last changes after blur (not after input)
    lastChanges.set([]);
  }

  async function checkInput(e: Event) {
    if (
      options.validationMethod == 'onblur' ||
      options.validationMethod == 'submit-only'
    ) {
      return;
    }

    // Wait for changes to update
    const immediateUpdate = isImmediateInput(e.target);
    if (immediateUpdate) await new Promise((r) => setTimeout(r, 0));

    const changes = get(lastChanges);
    if (!changes.length) return;

    const target = e.target instanceof HTMLElement ? e.target : null;

    for (const change of changes) {
      const hadErrors =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        immediateUpdate || traversePath(get(errors), change as any);
      if (
        immediateUpdate ||
        (typeof hadErrors == 'object' && hadErrors.key in hadErrors.parent)
      ) {
        // Problem - store hasn't updated here with new value yet.
        setTimeout(
          () =>
            htmlInputChange(
              change,
              'input',
              immediateUpdate ? target : null
            ),
          0
        );
      }
    }
  }

  formEl.addEventListener('focusout', checkBlur);
  formEl.addEventListener('input', checkInput);

  onDestroy(() => {
    formEl.removeEventListener('focusout', checkBlur);
    formEl.removeEventListener('input', checkInput);
  });

  ///// SvelteKit enhance function //////////////////////////////////

  const htmlForm = Form(formEl, { submitting, delayed, timeout }, options);

  let currentRequest: AbortController | null;

  return enhance(formEl, async (submit) => {
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
        (formEl.noValidate ||
          ((submit.submitter instanceof HTMLButtonElement ||
            submit.submitter instanceof HTMLInputElement) &&
            submit.submitter.formNoValidate));

      const validation = await clientValidation(
        noValidate ? undefined : options.validators,
        get(data),
        get(formId),
        get(constraints),
        get(posted)
      );

      if (!validation.valid) {
        cancel(false);

        const result = {
          type: 'failure' as const,
          status:
            (typeof options.SPA === 'boolean'
              ? undefined
              : options.SPA?.failStatus) ?? 400,
          data: { form: validation }
        };

        setTimeout(() => validationResponse({ result }), 0);
      }

      if (!cancelled) {
        switch (options.clearOnSubmit) {
          case 'errors-and-message':
            errors.clear();
            message.set(undefined);
            break;

          case 'errors':
            errors.clear();
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

        // Deprecation fix
        const submitData =
          'formData' in submit
            ? submit.formData
            : (submit as { data: FormData }).data;

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
          const chunks = chunkSubstr(
            stringify(postData),
            options.jsonChunkSize ?? 500000
          );

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
          const id = get(formId);
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
        formEl,
        cancel: () => (cancelled = true)
      };

      for (const event of formEvents.onResult) {
        await event(data);
      }

      if (!cancelled) {
        if (
          (result.type === 'success' || result.type == 'failure') &&
          result.data
        ) {
          const forms = Context_findValidationForms(result.data);
          if (!forms.length) {
            throw new SuperFormError(
              'No form data returned from ActionResult. Make sure you return { form } in the form actions.'
            );
          }

          for (const newForm of forms) {
            if (newForm.id !== get(formId)) continue;

            const data = {
              form: newForm as SuperValidated<T>,
              formEl,
              cancel: () => (cancelled = true)
            };

            for (const event of formEvents.onUpdate) {
              await event(data);
            }

            if (!cancelled && options.customValidity) {
              setCustomValidityForm(formEl, data.form.errors);
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
              const data = { result, message };

              for (const onErrorEvent of formEvents.onError) {
                if (
                  onErrorEvent !== 'apply' &&
                  (onErrorEvent != defaultOnError ||
                    !options.flashMessage?.onError)
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
          /^https?:\/\//.test(result.location)
            ? undefined
            : document.location.origin
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
