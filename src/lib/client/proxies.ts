import { derived, type Updater, type Writable } from 'svelte/store';
import {
  SuperFormError,
  type InputConstraint,
  type UnwrapEffects
} from '../index.js';
import { traversePath } from '../traversal.js';
import type { SuperForm } from './index.js';
import type { z, AnyZodObject } from 'zod';
import {
  splitPath,
  type FormPath,
  type FormPathLeaves,
  type FormPathType
} from '../stringPath.js';
import type { FormPathArrays, ZodValidation } from '../index.js';

type DefaultOptions = {
  trueStringValue: string;
  dateFormat:
    | 'date'
    | 'datetime'
    | 'time'
    | 'date-utc'
    | 'datetime-utc'
    | 'time-utc'
    | 'date-local'
    | 'datetime-local'
    | 'time-local'
    | 'iso';
  delimiter?: '.' | ',';
  empty?: 'null' | 'undefined';
  emptyIfZero?: boolean;
};

const defaultOptions: DefaultOptions = {
  trueStringValue: 'true',
  dateFormat: 'iso',
  emptyIfZero: true
};

///// Proxy functions ///////////////////////////////////////////////

export function booleanProxy<
  T extends Record<string, unknown>,
  Path extends FormPath<T>
>(
  form: Writable<T>,
  path: Path,
  options: Pick<DefaultOptions, 'trueStringValue'> = {
    trueStringValue: 'true'
  }
) {
  return _stringProxy(form, path, 'boolean', {
    ...defaultOptions,
    ...options
  }) as FormPathType<T, Path> extends boolean ? Writable<string> : never;
}

export function intProxy<
  T extends Record<string, unknown>,
  Path extends FormPath<T>
>(
  form: Writable<T>,
  path: Path,
  options: Pick<DefaultOptions, 'empty' | 'emptyIfZero'> = {}
) {
  return _stringProxy(form, path, 'int', {
    ...defaultOptions,
    ...options
  }) as FormPathType<T, Path> extends number ? Writable<string> : never;
}

export function numberProxy<
  T extends Record<string, unknown>,
  Path extends FormPath<T>
>(
  form: Writable<T>,
  path: Path,
  options: Pick<DefaultOptions, 'empty' | 'emptyIfZero' | 'delimiter'> = {}
) {
  return _stringProxy(form, path, 'number', {
    ...defaultOptions,
    ...options
  }) as FormPathType<T, Path> extends number ? Writable<string> : never;
}

export function dateProxy<
  T extends Record<string, unknown>,
  Path extends FormPath<T>
>(
  form: Writable<T>,
  path: Path,
  options: {
    format: DefaultOptions['dateFormat'];
    empty?: DefaultOptions['empty'];
  } = {
    format: 'iso'
  }
) {
  return _stringProxy(form, path, 'date', {
    ...defaultOptions,
    dateFormat: options.format,
    empty: options.empty
  }) as FormPathType<T, Path> extends Date ? Writable<string> : never;
}

export function stringProxy<
  T extends Record<string, unknown>,
  Path extends FormPath<T>
>(
  form: Writable<T>,
  path: Path,
  options: {
    empty: NonNullable<DefaultOptions['empty']>;
  }
): Writable<string> {
  return _stringProxy(form, path, 'string', {
    ...defaultOptions,
    empty: options.empty
  }) as FormPathType<T, Path> extends string ? Writable<string> : never;
}

///// Implementation ////////////////////////////////////////////////

/**
 * Creates a string store that will pass its value to a field in the form.
 * @param form The form
 * @param field Form field
 * @param type 'number' | 'int' | 'boolean'
 */
function _stringProxy<
  T extends Record<string, unknown>,
  Type extends 'number' | 'int' | 'boolean' | 'date' | 'string',
  Path extends FormPath<T>
>(
  form: Writable<T>,
  path: Path,
  type: Type,
  options: DefaultOptions
): Writable<string> {
  function toValue(value: unknown) {
    if (
      !value &&
      options.empty !== undefined &&
      (value !== 0 || options.emptyIfZero)
    ) {
      return options.empty === 'null' ? null : undefined;
    }

    if (typeof value === 'number') {
      value = value.toString();
    }

    if (typeof value !== 'string') {
      throw new SuperFormError('stringProxy received a non-string value.');
    }

    if (type == 'string') return value;
    else if (type == 'boolean') return !!value;
    else if (type == 'date') return new Date(value);

    const numberToConvert = options.delimiter
      ? (value as string).replace(options.delimiter, '.')
      : value;

    let num: number;
    if (type == 'number') num = parseFloat(numberToConvert);
    else num = parseInt(numberToConvert, 10);

    if (
      options.empty !== undefined &&
      ((num === 0 && options.emptyIfZero) || isNaN(num))
    ) {
      return options.empty == 'null' ? null : undefined;
    }

    return num;
  }

  const proxy2 = fieldProxy(form, path);

  const proxy = derived(proxy2, (value) => {
    if (value === undefined || value === null) return '';

    if (type == 'string') {
      return value as string;
    } else if (type == 'int' || type == 'number') {
      const num = value as number;
      return isNaN(num) ? '' : String(num);
    } else if (type == 'date') {
      const date = value as unknown as Date;
      if (isNaN(date as unknown as number)) return '';

      switch (options.dateFormat) {
        case 'iso':
          return date.toISOString();
        case 'date':
          return date.toISOString().slice(0, 10);
        case 'datetime':
          return date.toISOString().slice(0, 16);
        case 'time':
          return date.toISOString().slice(11, 16);
        case 'date-utc':
          return UTCDate(date);
        case 'datetime-utc':
          return UTCDate(date) + 'T' + UTCTime(date);
        case 'time-utc':
          return UTCTime(date);
        case 'date-local':
          return localDate(date);
        case 'datetime-local':
          return localDate(date) + 'T' + localTime(date);
        case 'time-local':
          return localTime(date);
      }
    } else {
      // boolean
      return value ? options.trueStringValue : '';
    }
  });

  return {
    subscribe: proxy.subscribe,
    set(val: string) {
      proxy2.set(toValue(val) as FormPathType<T, Path>);
    },
    update(updater) {
      proxy2.update(
        (f) => toValue(updater(String(f))) as FormPathType<T, Path>
      );
    }
  };
}

export function arrayProxy<
  T extends ZodValidation<AnyZodObject>,
  Path extends FormPathArrays<z.infer<UnwrapEffects<T>>>
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  superForm: SuperForm<T, any>,
  path: Path
): {
  path: Path;
  values: Writable<FormPathType<z.infer<UnwrapEffects<T>>, Path>>;
  errors: Writable<string[] | undefined>;
} {
  return {
    path,
    values: fieldProxy(superForm.form, path),
    errors: fieldProxy(
      superForm.errors,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `${path}._errors` as any
    ) as Writable<string[] | undefined>
  };
}
export function formFieldProxy<
  T extends ZodValidation<AnyZodObject>,
  Path extends FormPathLeaves<z.infer<UnwrapEffects<T>>>
>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  superForm: SuperForm<T, any>,
  path: Path
): {
  path: Path;
  value: Writable<FormPathType<z.infer<UnwrapEffects<T>>, Path>>;
  errors: Writable<string[] | undefined>;
  constraints: Writable<InputConstraint | undefined>;
  tainted: Writable<boolean | undefined>;
} {
  const path2 = splitPath<z.infer<UnwrapEffects<T>>>(path);
  // Filter out array indices, the constraints structure doesn't contain these.
  const constraintsPath = (path2 as unknown[])
    .filter((p) => isNaN(parseInt(String(p))))
    .join('.');

  const taintedProxy = derived<
    typeof superForm.tainted,
    boolean | undefined
  >(superForm.tainted, ($tainted) => {
    if (!$tainted) return $tainted;
    const taintedPath = traversePath($tainted, path2);
    return taintedPath ? taintedPath.value : undefined;
  });

  const tainted = {
    subscribe: taintedProxy.subscribe,
    update(upd: Updater<boolean | undefined>) {
      superForm.tainted.update(($tainted) => {
        if (!$tainted) $tainted = {};
        const output = traversePath($tainted, path2, (path) => {
          if (!path.value) path.parent[path.key] = {};
          return path.parent[path.key];
        });
        if (output) output.parent[output.key] = upd(output.value);
        return $tainted;
      });
    },
    set(value: boolean | undefined) {
      superForm.tainted.update(($tainted) => {
        if (!$tainted) $tainted = {};
        const output = traversePath($tainted, path2, (path) => {
          if (!path.value) path.parent[path.key] = {};
          return path.parent[path.key];
        });
        if (output) output.parent[output.key] = value;
        return $tainted;
      });
    }
  };

  return {
    path,
    value: fieldProxy(superForm.form, path),
    errors: fieldProxy(superForm.errors, path) as unknown as Writable<
      string[] | undefined
    >,
    constraints: fieldProxy(
      superForm.constraints,
      constraintsPath as never
    ) as Writable<InputConstraint | undefined>,
    tainted
  };
}

export function fieldProxy<T extends object, Path extends FormPath<T>>(
  form: Writable<T>,
  path: Path
): Writable<FormPathType<T, Path>> {
  const path2 = splitPath<T>(path);

  const proxy = derived(form, ($form) => {
    const data = traversePath($form, path2);
    return data?.value;
  });

  return {
    subscribe(...params: Parameters<typeof proxy.subscribe>) {
      //console.log('~ fieldproxy ~ subscribe', path);
      const unsub = proxy.subscribe(...params);

      return () => {
        //console.log('~ fieldproxy ~ unsubscribe', field);
        unsub();
      };
    },
    //subscribe: proxy.subscribe,
    update(upd: Updater<FormPathType<T, Path>>) {
      //console.log('~ fieldStore ~ update value for', path);
      form.update((f) => {
        const output = traversePath(f, path2);
        if (output) output.parent[output.key] = upd(output.value);
        //else console.log('[update] Not found:', path, 'in', f);
        return f;
      });
    },
    set(value: FormPathType<T, Path>) {
      //console.log('~ fieldStore ~ set value for', path, value);
      form.update((f) => {
        const output = traversePath(f, path2);
        if (output) output.parent[output.key] = value;
        //else console.log('[set] Not found:', path, 'in', f);
        return f;
      });
    }
  };
}

function localDate(date: Date) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
}

function localTime(date: Date) {
  return (
    String(date.getHours()).padStart(2, '0') +
    ':' +
    String(date.getMinutes()).padStart(2, '0')
  );
}

function UTCDate(date: Date) {
  return (
    date.getUTCFullYear() +
    '-' +
    String(date.getUTCMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getUTCDate()).padStart(2, '0')
  );
}

function UTCTime(date: Date) {
  return (
    String(date.getUTCHours()).padStart(2, '0') +
    ':' +
    String(date.getUTCMinutes()).padStart(2, '0')
  );
}

/*
function dateToUTC(date: Date) {
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}
*/
