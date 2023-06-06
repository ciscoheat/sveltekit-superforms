import {
  type SuperValidated,
  type ValidationErrors,
  type Validator,
  type Validators,
  type FieldPath,
  type ZodValidation,
  type FormPathLeaves,
  SuperFormError
} from '../index.js';
import type { z, AnyZodObject } from 'zod';
import { traversePath, traversePathsAsync } from '../traversal.js';
import type { FormOptions } from './index.js';
import { errorShape, mapErrors } from '../errors.js';
import type { ValidateOptions } from './validateField.js';
import type { FormPathType } from '$lib/stringPath.js';

export function validateForm<T extends AnyZodObject>(): Promise<
  SuperValidated<ZodValidation<T>>
>;

export function validateForm<T extends AnyZodObject>(
  path: FormPathLeaves<z.infer<T>>,
  opts?: ValidateOptions<
    FormPathType<z.infer<T>, FormPathLeaves<z.infer<T>>>
  >
): Promise<string[] | undefined>;

export function validateForm<T extends AnyZodObject>(
  path?: FormPathLeaves<z.infer<T>>,
  opts?: ValidateOptions<
    FormPathType<z.infer<T>, FormPathLeaves<z.infer<T>>>
  >
) {
  // See the validate function inside superForm for implementation.
  throw new SuperFormError(
    'validateForm can only be used as superForm.validate.'
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { path, opts } as any;
}

export async function clientValidation<T extends AnyZodObject, M = unknown>(
  options: FormOptions<T, M>,
  checkData: z.infer<T>,
  formId: string | undefined,
  constraints: SuperValidated<ZodValidation<T>>['constraints'],
  posted: boolean
) {
  return _clientValidation(
    options.validators,
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
  if (validators) {
    let valid: boolean;
    let clientErrors: ValidationErrors<T> = {};

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
      }
    } else {
      // SuperForms validator

      valid = true;

      const validator = validators as Validators<T>;
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
                  typeof errors === 'string' ? [errors] : errors ?? undefined
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
      return {
        valid: false,
        posted,
        errors: clientErrors,
        data: checkData,
        constraints,
        message: undefined,
        id: formId
      };
    }
  }

  return {
    valid: true,
    posted,
    errors: {},
    data: checkData,
    constraints,
    message: undefined,
    id: formId
  };
}
