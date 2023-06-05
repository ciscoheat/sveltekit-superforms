import type { z, AnyZodObject, ZodTypeAny, ZodError } from 'zod';
import { get } from 'svelte/store';
import type { FormOptions, SuperForm, TaintOption } from './index.js';
import {
  SuperFormError,
  type FieldPath,
  type TaintedFields,
  type UnwrapEffects,
  type Validators
} from '../index.js';
import {
  isInvalidPath,
  setPaths,
  traversePath,
  traversePaths
} from '../traversal.js';
import type { FormPathLeaves } from '../stringPath.js';
import { clearErrors, clone } from '../utils.js';
import { errorShape, mapErrors } from '../errors.js';

type ValidateOptions<V> = Partial<{
  value: V;
  update: boolean | 'errors' | 'value';
  taint: TaintOption;
  errors: string | string[];
}>;

export type Validate<
  T extends AnyZodObject,
  P extends FormPathLeaves<z.infer<T>>
> = (
  path: P,
  opts?: ValidateOptions<unknown>
) => Promise<string[] | undefined>;

export async function validateObjectErrors<T extends AnyZodObject, M>(
  formOptions: FormOptions<T, M>,
  data: z.infer<T>,
  Errors: SuperForm<T, M>['errors']
) {
  if (
    typeof formOptions.validators !== 'object' ||
    !('safeParseAsync' in formOptions.validators)
  ) {
    return;
  }

  const validators = formOptions.validators as AnyZodObject;
  const result = await validators.safeParseAsync(data);

  if (!result.success) {
    const newErrors = mapErrors(
      result.error.format(),
      errorShape(validators as AnyZodObject)
    );

    Errors.update((currentErrors) => {
      // Clear current object-level errors
      traversePaths(currentErrors, (pathData) => {
        if (pathData.key == '_errors') {
          return pathData.set(undefined);
        }
      });

      // Add new object-level errors and tainted field errors
      traversePaths(newErrors, (pathData) => {
        if (pathData.key == '_errors') {
          return setPaths(currentErrors, [pathData.path], pathData.value);
        }
        /*
            if (!Array.isArray(pathData.value)) return;
            if (Tainted_isPathTainted(pathData.path, taintedFields)) {
              setPaths(currentErrors, [pathData.path], pathData.value);
            }
            return 'skip';
            */
      });

      return currentErrors;
    });
  } else {
    Errors.update((currentErrors) => {
      // Clear current object-level errors
      traversePaths(currentErrors, (pathData) => {
        if (pathData.key == '_errors') {
          return pathData.set(undefined);
        }
      });
      return currentErrors;
    });
  }
}

// @DCI-context
export async function validateField<T extends AnyZodObject, M>(
  path: string[],
  formOptions: FormOptions<T, M>,
  data: SuperForm<T, M>['form'],
  Errors: SuperForm<T, M>['errors'],
  Tainted: SuperForm<T, M>['tainted'],
  options: ValidateOptions<unknown> = {}
): Promise<string[] | undefined> {
  function Errors_clear() {
    clearErrors(Errors, { undefinePath: path, clearFormLevelErrors: true });
  }

  function Errors_update(errorMsgs: null | undefined | string | string[]) {
    if (typeof errorMsgs === 'string') errorMsgs = [errorMsgs];

    if (options.update === true || options.update == 'errors') {
      Errors.update((errors) => {
        const error = traversePath(
          errors,
          path as FieldPath<typeof errors>,
          (node) => {
            if (isInvalidPath(path, node)) {
              throw new SuperFormError(
                'Errors can only be added to form fields, not to arrays or objects in the schema. Path: ' +
                  node.path.slice(0, -1)
              );
            } else if (node.value === undefined) {
              node.parent[node.key] = {};
              return node.parent[node.key];
            } else {
              return node.value;
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

  const errors = await _validateField(
    path,
    formOptions.validators,
    data,
    Errors,
    Tainted,
    options
  );

  if (errors.validated) {
    if (errors.validated === 'all' && !errors.errors) {
      // We validated the whole data structure, so clear all errors on success after delayed validators.
      // it will also set the current path to undefined, so it can be used in
      // the tainted+error check in oninput.
      Errors_clear();
    } else {
      return Errors_update(errors.errors);
    }
  } else if (
    errors.validated === false &&
    formOptions.defaultValidator == 'clear'
  ) {
    return Errors_update(undefined);
  }

  return errors.errors;
}

// @DCI-context
async function _validateField<T extends AnyZodObject, M>(
  path: string[],
  validators: FormOptions<T, M>['validators'],
  data: SuperForm<T, M>['form'],
  Errors: SuperForm<T, M>['errors'],
  Tainted: SuperForm<T, M>['tainted'],
  options: ValidateOptions<unknown> = {}
): Promise<{ validated: boolean | 'all'; errors: string[] | undefined }> {
  if (options.update === undefined) options.update = true;
  if (options.taint === undefined) options.taint = false;
  if (typeof options.errors == 'string') options.errors = [options.errors];

  const Context = {
    value: options.value,
    shouldUpdate: true,
    currentData: undefined as z.infer<T> | undefined,
    // Remove numeric indices, they're not used for validators.
    validationPath: path.filter((p) => isNaN(parseInt(p)))
  };

  async function defaultValidate() {
    return { validated: false, errors: undefined } as const;
  }

  ///// Roles ///////////////////////////////////////////////////////

  function Tainted_isPathTainted(
    path: string[],
    tainted: TaintedFields<AnyZodObject> | undefined
  ) {
    if (tainted === undefined) return false;
    const leaf = traversePath(tainted, path as FieldPath<typeof tainted>);
    if (!leaf) return false;
    return leaf.value === true;
  }

  function Errors_update(updater: Parameters<typeof Errors.update>[0]) {
    Errors.update(updater);
  }

  function Errors_clearFormLevelErrors() {
    Errors.update(($errors) => {
      $errors._errors = undefined;
      return $errors;
    });
  }

  function Errors_fromZod(
    errors: ZodError<unknown>,
    validator: AnyZodObject
  ) {
    return mapErrors(errors.format(), errorShape(validator));
  }

  ///////////////////////////////////////////////////////////////////

  if (!('value' in options)) {
    // Use value from data
    Context.currentData = get(data);

    const dataToValidate = traversePath(
      Context.currentData,
      path as FieldPath<typeof Context.currentData>
    );

    Context.value = dataToValidate?.value;
  } else if (options.update === true || options.update === 'value') {
    // Value should be updating the data
    data.update(
      ($data) => {
        setPaths($data, [path], Context.value);
        return (Context.currentData = $data);
      },
      { taint: options.taint }
    );
  } else {
    Context.shouldUpdate = false;
  }

  //console.log('🚀 ~ file: index.ts:871 ~ validate:', path, value);

  if (typeof validators !== 'object') {
    return defaultValidate();
  }

  if ('safeParseAsync' in validators) {
    // Zod validator
    if (!Context.shouldUpdate) {
      // If value shouldn't update, clone and set the new value
      Context.currentData = clone(Context.currentData ?? get(data));
      setPaths(Context.currentData, [path], Context.value);
    }

    const result = await (validators as ZodTypeAny).safeParseAsync(
      Context.currentData
    );

    if (!result.success) {
      const newErrors = Errors_fromZod(
        result.error,
        validators as AnyZodObject
      );

      if (options.update === true || options.update == 'errors') {
        // Set errors for other (tainted) fields, that may have been changed
        const taintedFields = get(Tainted);

        Errors_update((currentErrors) => {
          // Clear current object-level errors
          traversePaths(currentErrors, (pathData) => {
            if (pathData.key == '_errors') {
              return pathData.set(undefined);
            }
          });

          // Add new object-level errors and tainted field errors
          traversePaths(newErrors, (pathData) => {
            if (pathData.key == '_errors') {
              return setPaths(
                currentErrors,
                [pathData.path],
                pathData.value
              );
            }
            if (!Array.isArray(pathData.value)) return;
            if (Tainted_isPathTainted(pathData.path, taintedFields)) {
              setPaths(currentErrors, [pathData.path], pathData.value);
            }
            return 'skip';
          });

          return currentErrors;
        });
      }

      // Finally, set errors for the specific field
      // it will be set to undefined if no errors, so the tainted+error check
      // in oninput can determine if errors should be displayed or not.
      const current = traversePath(
        newErrors,
        path as FieldPath<typeof newErrors>
      );

      return {
        validated: true,
        errors: options.errors ?? current?.value
      };
    } else {
      // Clear form-level errors
      Errors_clearFormLevelErrors();
      return { validated: true, errors: undefined };
    }
  } else {
    // SuperForms validator

    const validator = traversePath(
      validators as Validators<UnwrapEffects<T>>,
      Context.validationPath as FieldPath<typeof validators>
    );

    if (!validator) {
      // Path didn't exist
      throw new SuperFormError('No Superforms validator found: ' + path);
    } else if (validator.value === undefined) {
      // No validator, use default
      return defaultValidate();
    } else {
      const result = (await validator.value(Context.value)) as
        | string[]
        | undefined;

      return {
        validated: true,
        errors: result ? options.errors ?? result : result
      };
    }
  }
}
