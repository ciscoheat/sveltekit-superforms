import {
  type SuperValidated,
  type ValidationErrors,
  type Validator,
  type Validators,
  type FieldPath,
  type ZodValidation,
  type FormPathLeaves,
  SuperFormError,
  type TaintedFields,
  type UnwrapEffects
} from '../index.js';
import type { z, AnyZodObject, ZodError, ZodTypeAny } from 'zod';
import {
  isInvalidPath,
  setPaths,
  traversePath,
  traversePaths,
  traversePathsAsync
} from '../traversal.js';
import type { FormOptions, SuperForm, TaintOption } from './index.js';
import { errorShape, mapErrors, clearErrors } from '../errors.js';
import type { FormPathType } from '../stringPath.js';
import { clone } from '../utils.js';
import { get } from 'svelte/store';

export type ValidateOptions<
  V,
  T extends AnyZodObject = AnyZodObject
> = Partial<{
  value: V;
  update: boolean | 'errors' | 'value';
  taint: TaintOption<T>;
  errors: string | string[];
}>;

/**
 * Validate current form data.
 */
export function validateForm<T extends AnyZodObject>(): Promise<
  SuperValidated<ZodValidation<T>>
>;

/**
 * Validate a specific field in the form.
 */
export function validateForm<T extends AnyZodObject>(
  path: FormPathLeaves<z.infer<T>>,
  opts?: ValidateOptions<
    FormPathType<z.infer<T>, FormPathLeaves<z.infer<T>>>,
    T
  >
): Promise<string[] | undefined>;

export function validateForm<T extends AnyZodObject>(
  path?: FormPathLeaves<z.infer<T>>,
  opts?: ValidateOptions<
    FormPathType<z.infer<T>, FormPathLeaves<z.infer<T>>>,
    T
  >
) {
  // See the validate function inside superForm for implementation.
  throw new SuperFormError(
    'validateForm can only be used as superForm.validate.'
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { path, opts } as any;
}

/**
 * Validate form data.
 */
export async function clientValidation<T extends AnyZodObject, M = unknown>(
  validators: FormOptions<T, M>['validators'],
  checkData: z.infer<T>,
  formId: string | undefined,
  constraints: SuperValidated<ZodValidation<T>>['constraints'],
  posted: boolean
) {
  return _clientValidation(
    validators,
    checkData,
    formId,
    constraints,
    posted
  );
}

async function _clientValidation<T extends AnyZodObject, M = unknown>(
  validators: FormOptions<T, M>['validators'],
  checkData: z.infer<T>,
  formId: string | undefined,
  constraints: SuperValidated<ZodValidation<T>>['constraints'],
  posted: boolean
): Promise<SuperValidated<ZodValidation<T>>> {
  let valid = true;
  let clientErrors: ValidationErrors<T> = {};

  if (validators) {
    if ('safeParseAsync' in validators) {
      // Zod validator
      const validator = validators as AnyZodObject;
      const result = await validator.safeParseAsync(checkData);

      valid = result.success;

      if (!result.success) {
        clientErrors = mapErrors<T>(
          result.error.format(),
          errorShape(validator)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;
      } else {
        checkData = result.data;
      }
    } else {
      // SuperForms validator
      checkData = { ...checkData };
      // Add top-level validator fields to non-existing checkData fields
      // so they will be validated even if the field doesn't exist
      for (const [key, value] of Object.entries(validators)) {
        if (typeof value === 'function' && !(key in checkData)) {
          // @ts-expect-error Setting undefined fields so they will be validated based on field existance.
          checkData[key] = undefined;
        }
      }

      const validator = validators as Validators<T>;
      const newErrors: {
        path: string[];
        errors: string[] | undefined;
      }[] = [];

      await traversePathsAsync(checkData, async ({ value, path }) => {
        // Filter out array indices, the validator structure doesn't contain these.
        const validationPath = path.filter((p) => /\D/.test(String(p)));
        const maybeValidator = traversePath(
          validator,
          validationPath as FieldPath<typeof validator>
        );

        if (typeof maybeValidator?.value === 'function') {
          const check = maybeValidator.value as Validator<unknown>;

          let errors: string | string[] | null | undefined;

          if (Array.isArray(value)) {
            for (const key in value) {
              try {
                errors = await check(value[key]);
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
              } catch (e) {
                valid = false;
                console.error(
                  `Error in form validators for field "${path}":`,
                  e
                );
              }
            }
          } else {
            try {
              errors = await check(value);
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
            } catch (e) {
              valid = false;
              console.error(
                `Error in form validators for field "${path}":`,
                e
              );
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
  }

  return {
    valid,
    posted,
    errors: clientErrors,
    data: checkData,
    constraints,
    message: undefined,
    id: formId
  };
}

/**
 * Validate and set/clear object level errors.
 */
export async function validateObjectErrors<T extends AnyZodObject, M>(
  formOptions: FormOptions<T, M>,
  Form: SuperForm<T, M>['form'],
  Errors: SuperForm<T, M>['errors'],
  tainted: TaintedFields<UnwrapEffects<T>> | undefined
) {
  if (
    typeof formOptions.validators !== 'object' ||
    !('safeParseAsync' in formOptions.validators)
  ) {
    return;
  }

  const validators = formOptions.validators as AnyZodObject;
  const result = await validators.safeParseAsync(get(Form));

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
          // Check if the parent path (the actual array) is tainted
          // Form-level errors are always "tainted"
          const taintedPath =
            pathData.path.length == 1
              ? { value: true }
              : tainted &&
                traversePath(tainted, pathData.path.slice(0, -1) as any);

          if (taintedPath && taintedPath.value) {
            return setPaths(currentErrors, [pathData.path], pathData.value);
          }
        }
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

    // Disable if form values shouldn't be updated immediately:
    //if (result.data) Form.set(result.data);
  }
}

export type ValidationResult<T extends Record<string, unknown>> = {
  validated: boolean | 'all';
  errors: string[] | undefined;
  data: T | undefined;
};

/**
 * Validate a specific form field.
 * @DCI-context
 */
export async function validateField<
  T extends ZodValidation<AnyZodObject>,
  M
>(
  path: string[],
  formOptions: FormOptions<T, M>,
  data: SuperForm<T, M>['form'],
  Errors: SuperForm<T, M>['errors'],
  Tainted: SuperForm<T, M>['tainted'],
  options: ValidateOptions<unknown, UnwrapEffects<T>> = {}
): Promise<ValidationResult<z.infer<T>>> {
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

  const result = await _validateField(
    path,
    formOptions.validators,
    data,
    Errors,
    Tainted,
    options
  );

  if (result.validated) {
    if (result.validated === 'all' && !result.errors) {
      // We validated the whole data structure, so clear all errors on success after delayed validators.
      // it will also set the current path to undefined, so it can be used in
      // the tainted+error check in oninput.
      Errors_clear();
    } else {
      result.errors = Errors_update(result.errors);
    }
  } else if (
    result.validated === false &&
    formOptions.defaultValidator == 'clear'
  ) {
    result.errors = Errors_update(result.errors);
  }

  return result;
}

// @DCI-context
async function _validateField<T extends ZodValidation<AnyZodObject>, M>(
  path: string[],
  validators: FormOptions<T, M>['validators'],
  data: SuperForm<T, M>['form'],
  Errors: SuperForm<T, M>['errors'],
  Tainted: SuperForm<T, M>['tainted'],
  options: ValidateOptions<unknown, UnwrapEffects<T>> = {}
): Promise<ValidationResult<z.infer<T>>> {
  if (options.update === undefined) options.update = true;
  if (options.taint === undefined) options.taint = false;
  if (typeof options.errors == 'string') options.errors = [options.errors];

  const Context = {
    value: options.value,
    shouldUpdate: true,
    currentData: undefined as z.infer<T> | undefined,
    // Remove numeric indices, they're not used for validators.
    validationPath: path.filter((p) => /\D/.test(String(p)))
  };

  async function defaultValidate() {
    return { validated: false, errors: undefined, data: undefined } as const;
  }

  ///// Roles ///////////////////////////////////////////////////////

  function Tainted_isPathTainted(
    path: string[],
    tainted: TaintedFields<AnyZodObject> | undefined
  ) {
    if (tainted === undefined) return false;
    const leaf = traversePath(tainted, path as FieldPath<typeof tainted>);
    if (!leaf) return false;
    return leaf.value;
  }

  function Errors_update(updater: Parameters<typeof Errors.update>[0]) {
    Errors.update(updater);
  }

  function Errors_clearAll() {
    clearErrors(Errors, { undefinePath: null, clearFormLevelErrors: true });
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
            if (
              pathData.key == '_errors' &&
              (pathData.path.length == 1 ||
                Tainted_isPathTainted(
                  pathData.path.slice(0, -1),
                  taintedFields
                ))
            ) {
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
        errors: options.errors ?? current?.value,
        data: undefined
      };
    } else {
      Errors_clearAll();
      return {
        validated: true,
        errors: undefined,
        data: result.data // For a successful Zod result, return the possibly transformed data.
      };
    }
  } else {
    // SuperForms validator
    const validator = traversePath(
      validators,
      Context.validationPath as FieldPath<typeof validators>
    );

    if (!validator || validator.value === undefined) {
      // No validator, use default
      return defaultValidate();
    } else {
      const result = (await validator.value(Context.value)) as
        | string[]
        | undefined;

      return {
        validated: true,
        errors: result ? options.errors ?? result : result,
        data: undefined // No transformation for Superforms validators
      };
    }
  }
}
