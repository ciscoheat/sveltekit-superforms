import { derived, type Updater, type Writable } from 'svelte/store';
import { stringify, parse } from 'devalue';
import { SuperFormError, type FormPath, type FieldPath } from '../index.js';
import { traversePath } from '../entity.js';
import type { SuperForm } from './index.js';
import type { z, AnyZodObject } from 'zod';

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
};

const defaultOptions: DefaultOptions = {
  trueStringValue: 'true',
  dateFormat: 'iso'
};

type NormalizeFormPath<T, Path> = Path extends keyof T
  ? FormPath<T, [Path]>
  : FormPath<T, Path>;

export function intProxy<
  T extends Record<string, unknown>,
  Path extends keyof T | FieldPath<T>
>(form: Writable<T>, path: Path) {
  return stringProxy(form, path, 'int', defaultOptions) as NormalizeFormPath<
    T,
    Path
  > extends number
    ? Writable<string>
    : never;
}

export function booleanProxy<
  T extends Record<string, unknown>,
  Path extends keyof T | FieldPath<T>
>(
  form: Writable<T>,
  path: Path,
  options: Pick<DefaultOptions, 'trueStringValue'> = {
    trueStringValue: 'true'
  }
): Writable<string> {
  return stringProxy(form, path, 'boolean', {
    ...defaultOptions,
    ...options
  }) as NormalizeFormPath<T, Path> extends boolean
    ? Writable<string>
    : never;
}

export function numberProxy<
  T extends Record<string, unknown>,
  Path extends keyof T | FieldPath<T>
>(form: Writable<T>, path: Path): Writable<string> {
  return stringProxy(
    form,
    path,
    'number',
    defaultOptions
  ) as NormalizeFormPath<T, Path> extends number ? Writable<string> : never;
}

export function dateProxy<
  T extends Record<string, unknown>,
  Path extends keyof T | FieldPath<T>
>(
  form: Writable<T>,
  path: Path,
  options: {
    format: DefaultOptions['dateFormat'];
  } = {
    format: 'iso'
  }
): Writable<string> {
  return stringProxy(form, path, 'date', {
    ...defaultOptions,
    dateFormat: options.format
  }) as NormalizeFormPath<T, Path> extends Date ? Writable<string> : never;
}

function normalizePath<T extends object>(path: keyof T | FieldPath<T>) {
  return (typeof path === 'string' ? [path] : path) as FieldPath<T>;
}

/**
 * Creates a string store that will pass its value to a field in the form.
 * @param form The form
 * @param field Form field
 * @param type 'number' | 'int' | 'boolean'
 */
function stringProxy<
  T extends Record<string, unknown>,
  Type extends 'number' | 'int' | 'boolean' | 'date',
  Path extends FieldPath<T>
>(
  form: Writable<T>,
  path: keyof T | Path,
  type: Type,
  options: DefaultOptions
): Writable<string> {
  function toValue(val: unknown) {
    if (typeof val !== 'string')
      throw new SuperFormError('stringProxy received a non-string value.');

    if (type == 'number') return parseFloat(val);
    if (type == 'int') return parseInt(val, 10);
    if (type == 'boolean') return !!val;
    else {
      // date
      return new Date(val);
    }
  }

  const proxy2 = fieldProxy(form, path);

  const proxy = derived(proxy2, (value) => {
    if (value === undefined || value === null) return '';

    if (type == 'int' || type == 'number') {
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
      proxy2.set(toValue(val) as FormPath<T, Path>);
      //form.update((f) => ({ ...f, [field as any]: toValue(val) }));
    },
    update(updater) {
      proxy2.update((f) => toValue(updater(String(f))) as FormPath<T, Path>);
      /*
      form.update((f) => ({
        ...f,
        [field as any]: toValue(updater(String(f[field as any])))
      }));
      */
    }
  };
}

export function jsonProxy<
  K,
  T extends Record<string, unknown>,
  Field extends keyof T,
  S = T[Field] extends string ? T[Field] : never
>(form: Writable<T>, field: Field): Writable<S extends never ? never : K> {
  function unserialize(val: string) {
    try {
      return parse(val);
    } catch {
      return undefined;
    }
  }

  const proxy = derived(form, ($form) =>
    unserialize($form[field] as string)
  );

  function update(updater: Updater<S extends never ? never : K>) {
    form.update((f) => {
      return {
        ...f,
        [field]: stringify(updater(unserialize(f[field] as string)))
      };
    });
  }

  return {
    subscribe: proxy.subscribe,
    update,
    set(val: S extends never ? never : K) {
      form.update((f) => ({ ...f, [field]: stringify(val) }));
    }
  };
}

export function formFieldProxy<T extends AnyZodObject, M>(
  form: SuperForm<T, M>,
  path: keyof z.infer<T> | FieldPath<z.infer<T>>
) {
  const path2 = normalizePath(path);
  return {
    path: path2,
    value: fieldProxy(form.form, path2),
    errors: fieldProxy(form.errors, path2),
    constraints: fieldProxy(form.constraints, path2)
  };
}

export function fieldProxy<
  T extends Record<string, unknown>,
  Path extends FieldPath<T>
>(form: Writable<T>, path: keyof T | Path): Writable<FormPath<T, Path>> {
  const path2 = normalizePath(path);

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
    update(upd: Updater<FormPath<T, Path>>) {
      //console.log('~ fieldStore ~ update value for', path);
      form.update((f) => {
        const output = traversePath(f, path2);
        if (output) output.parent[output.key] = upd(output.value);
        //else console.log('[update] Not found:', path, 'in', f);
        return f;
      });
    },
    set(value: FormPath<T, Path>) {
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
