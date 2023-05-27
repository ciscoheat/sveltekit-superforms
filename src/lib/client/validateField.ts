import type { z, AnyZodObject, ZodTypeAny, ZodArray, ZodError } from 'zod';
import { get } from 'svelte/store';
import type { FormOptions, SuperForm, TaintOption } from './index.js';
import {
  SuperFormError,
  type FieldPath,
  type TaintedFields,
  type ValidationErrors,
  type UnwrapEffects,
  type Validators
} from '../index.js';
import {
  isInvalidPath,
  mapErrors,
  setPaths,
  traversePath,
  traversePaths,
  type ZodTypeInfo
} from '../traversal.js';
import { hasEffects } from '../schemaEntity.js';
import { unwrapZodType } from '../schemaEntity.js';
import type { StringPathLeaves } from '../stringPath.js';
import { clearErrors, clone } from '../utils.js';

type ValidateOptions<V> = Partial<{
  value: V;
  update: boolean | 'errors' | 'value';
  taint: TaintOption;
  errors: string | string[];
}>;

export type Validate<
  T extends AnyZodObject,
  P extends StringPathLeaves<z.infer<T>>
> = (
  path: P,
  opts?: ValidateOptions<unknown>
) => Promise<string[] | undefined>;

const effectMapCache = new WeakMap<object, boolean>();

function errorsExist<T extends ValidationErrors<AnyZodObject>>(errors: T) {
  return _errorsExist(errors);
}

function _errorsExist(errors: unknown) {
  if (errors && typeof errors === 'object') {
    for (const obj2 of Object.values(errors)) {
      if (_errorsExist(obj2)) return true;
    }
  }
  return errors !== undefined;
}

// @DCI-context
export async function validateField<T extends AnyZodObject, M>(
  path: string[],
  validators: FormOptions<T, M>['validators'],
  defaultValidator: FormOptions<T, M>['defaultValidator'],
  data: SuperForm<T, M>['form'],
  Errors: SuperForm<T, M>['errors'],
  Tainted: SuperForm<T, M>['tainted'],
  options: ValidateOptions<unknown> = {}
): Promise<string[] | undefined> {
  if (options.update === undefined) options.update = true;
  if (options.taint === undefined) options.taint = false;

  //let value = options.value;
  //let shouldUpdate = true;
  //let currentData: z.infer<T> | undefined = undefined;

  const Context = {
    value: options.value,
    shouldUpdate: true,
    currentData: undefined as z.infer<T> | undefined,
    // Remove numeric indices, they're not used for validators.
    validationPath: path.filter((p) => isNaN(parseInt(p)))
  };

  async function defaultValidate() {
    if (defaultValidator == 'clear') {
      Errors_update(undefined);
    }
    return undefined;
  }

  function extractValidator(
    data: ZodTypeInfo,
    key: string
  ): ZodTypeAny | undefined {
    if (data.effects) return undefined;

    // No effects, check if ZodObject or ZodArray, which are the
    // "allowed" objects in the path above the leaf.
    const type = data.zodType;

    if (type._def.typeName == 'ZodObject') {
      const nextType = (type as AnyZodObject)._def.shape()[key];
      const unwrapped = unwrapZodType(nextType);
      return unwrapped.effects ? undefined : unwrapped.zodType;
    } else if (type._def.typeName == 'ZodArray') {
      const array = type as ZodArray<ZodTypeAny>;
      const unwrapped = unwrapZodType(array.element);
      if (unwrapped.effects) return undefined;
      return extractValidator(unwrapped, key);
    } else {
      throw new SuperFormError('Invalid validator');
    }
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

  function Errors_get() {
    return get(Errors);
  }

  function Errors_clear(
    options: NonNullable<Parameters<typeof clearErrors>[1]>
  ) {
    return clearErrors(Errors, options);
  }

  function Errors_set(newErrors: ValidationErrors<UnwrapEffects<T>>) {
    Errors.set(newErrors);
  }

  function Errors_fromZod(errors: ZodError<unknown>) {
    return mapErrors(errors.format());
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
    // Check if any effects exist for the path, then parse the entire schema.
    if (!effectMapCache.has(validators)) {
      effectMapCache.set(validators, hasEffects(validators as ZodTypeAny));
    }

    const effects = effectMapCache.get(validators);

    const perFieldValidator = effects
      ? undefined
      : traversePath(
          validators,
          Context.validationPath as FieldPath<typeof validators>,
          (pathData) => {
            return extractValidator(
              unwrapZodType(pathData.parent),
              pathData.key
            );
          }
        );

    if (perFieldValidator) {
      const validator = extractValidator(
        unwrapZodType(perFieldValidator.parent),
        perFieldValidator.key
      );
      if (validator) {
        // Check if validator is ZodArray and the path is an array access
        // in that case validate the whole array.
        if (
          Context.currentData &&
          validator._def.typeName == 'ZodArray' &&
          !isNaN(parseInt(path[path.length - 1]))
        ) {
          const validateArray = traversePath(
            Context.currentData,
            path.slice(0, -1) as FieldPath<typeof Context.currentData>
          );
          Context.value = validateArray?.value;
        }

        //console.log('🚀 ~ file: index.ts:972 ~ no effects:', validator);
        const result = await validator.safeParseAsync(Context.value);
        if (!result.success) {
          const errors = result.error.format();
          return Errors_update(errors._errors);
        } else {
          return Errors_update(undefined);
        }
      }
    }

    //console.log('🚀 ~ file: index.ts:983 ~ Effects found, validating all');

    // Effects are found, validate entire data, unfortunately
    if (!Context.shouldUpdate) {
      // If value shouldn't update, clone and set the new value
      Context.currentData = clone(Context.currentData ?? get(data));
      setPaths(Context.currentData, [path], Context.value);
    }

    const result = await (validators as ZodTypeAny).safeParseAsync(
      Context.currentData
    );

    if (!result.success) {
      const newErrors = Errors_fromZod(result.error);

      if (options.update === true || options.update == 'errors') {
        // Set errors for other (tainted) fields, that may have been changed
        const taintedFields = get(Tainted);
        const currentErrors = Errors_get();
        let updated = false;

        // Special check for form level errors
        if (currentErrors._errors !== newErrors._errors) {
          if (
            !currentErrors._errors ||
            !newErrors._errors ||
            currentErrors._errors.join('') != newErrors._errors.join('')
          ) {
            currentErrors._errors = newErrors._errors;
            updated = true;
          }
        }

        traversePaths(newErrors, (pathData) => {
          if (!Array.isArray(pathData.value)) return;
          if (Tainted_isPathTainted(pathData.path, taintedFields)) {
            setPaths(currentErrors, [pathData.path], pathData.value);
            updated = true;
          }
          return 'skip';
        });

        if (updated) Errors_set(currentErrors);
      }

      // Finally, set errors for the specific field
      // it will be set to undefined if no errors, so the tainted+error check
      // in oninput can determine if errors should be displayed or not.
      const current = traversePath(
        newErrors,
        path as FieldPath<typeof newErrors>
      );

      return Errors_update(options.errors ?? current?.value);
    } else {
      // We validated the whole data structure, so clear all errors on success
      // but also set the current path to undefined, so it will be used in the tainted+error
      // check in oninput.
      Errors_clear({ undefinePath: path, clearFormLevelErrors: true });
      return undefined;
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
      const result = validator.value(Context.value);
      return Errors_update(result ? options.errors ?? result : result);
    }
  }
}
