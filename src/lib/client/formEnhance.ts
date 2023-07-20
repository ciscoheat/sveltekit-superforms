import { enhance, applyAction } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { page } from '$app/stores';
import type { ActionResult } from '@sveltejs/kit';
import { get, type Readable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
  SuperFormError,
  type TaintedFields,
  type SuperValidated
} from '../index.js';
import type { z, AnyZodObject } from 'zod';
import { stringify } from 'devalue';
import type { Entity } from '../schemaEntity.js';
import type { FormOptions, SuperForm } from './index.js';
import { clientValidation, validateField } from './clientValidation.js';
import { Form } from './form.js';
import { onDestroy } from 'svelte';

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

  async function validateChange(change: string[]) {
    await validateField(change, options, data, errors, tainted);
  }

  function timingIssue(el: EventTarget | null) {
    return (
      el &&
      (el instanceof HTMLSelectElement ||
        (el instanceof HTMLInputElement && el.type == 'radio'))
    );
  }

  // Add blur event, to check tainted
  async function checkBlur(e: Event) {
    if (
      options.validationMethod == 'oninput' ||
      options.validationMethod == 'submit-only'
    ) {
      return;
    }

    // Some form fields have some timing issue, need to wait
    if (timingIssue(e.target)) {
      await new Promise((r) => setTimeout(r, 0));
    }

    for (const change of get(lastChanges)) {
      //console.log('🚀 ~ file: index.ts:905 ~ BLUR:', change);
      validateChange(change);
    }
    // Clear last changes after blur (not after input)
    lastChanges.set([]);
  }
  formEl.addEventListener('focusout', checkBlur);

  const htmlForm = Form(formEl, { submitting, delayed, timeout }, options);

  onDestroy(() => {
    formEl.removeEventListener('focusout', checkBlur);
  });

  let currentRequest: AbortController | null;

  return enhance(formEl, async (submit) => {
    const submitCancel = submit.cancel;

    let cancelled = false;
    function cancel() {
      cancelled = true;
      return submitCancel();
    }
    submit.cancel = cancel;

    if (htmlForm.isSubmitting() && options.multipleSubmits == 'prevent') {
      cancel();
    } else {
      if (htmlForm.isSubmitting() && options.multipleSubmits == 'abort') {
        if (currentRequest) currentRequest.abort();
      }
      currentRequest = submit.controller;

      for (const event of formEvents.onSubmit) {
        await event(submit);
      }
    }

    if (cancelled) {
      if (options.flashMessage) cancelFlash(options);
    } else {
      // Client validation
      const validation = await clientValidation(
        options,
        get(data),
        get(formId),
        get(constraints),
        get(posted)
      );

      if (!validation.valid) {
        cancel();

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

        htmlForm.submitting();

        // Deprecation fix
        const submitData =
          'formData' in submit
            ? submit.formData
            : (submit as { data: FormData }).data;

        if (options.SPA) {
          cancel();

          const validationResult: SuperValidated<T> = {
            valid: true,
            posted: true,
            errors: {},
            data: get(data),
            constraints: get(constraints),
            message: undefined,
            id: get(formId)
          };

          const result = {
            type: 'success' as const,
            status: 200,
            data: { form: validationResult }
          };

          setTimeout(() => validationResponse({ result }), 0);
        } else if (options.dataType === 'json') {
          const postData = get(data);
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

              for (const event of formEvents.onError) {
                if (event !== 'apply') await event(data);
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

      // Redirect messages are handled in onDestroy and afterNavigate.
      if (cancelled || result.type != 'redirect') {
        htmlForm.completed(cancelled);
      }
    }

    return validationResponse;
  });
}
