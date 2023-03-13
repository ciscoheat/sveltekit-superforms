import { derived, type Updater, type Writable } from 'svelte/store';
import { stringify, parse } from 'devalue';
import { SuperFormError } from '$lib';

type DefaultOptions = {
  trueStringValue: string;
  dateFormat: 'date-local' | 'datetime-local' | 'time-local' | 'iso';
};

const defaultOptions: DefaultOptions = {
  trueStringValue: 'true',
  dateFormat: 'iso'
};

export function intProxy<
  T extends Record<string, unknown>,
  K extends keyof T
>(form: Writable<T>, field: K) {
  return stringProxy(
    form,
    field,
    'int',
    defaultOptions
  ) as T[K] extends number ? Writable<string> : never;
}

export function booleanProxy<T extends Record<string, unknown>>(
  form: Writable<T>,
  field: keyof T,
  options: Pick<DefaultOptions, 'trueStringValue'> = {
    trueStringValue: 'true'
  }
): Writable<string> {
  return stringProxy(form, field, 'boolean', {
    ...defaultOptions,
    ...options
  });
}

export function numberProxy<T extends Record<string, unknown>>(
  form: Writable<T>,
  field: keyof T
): Writable<string> {
  return stringProxy(form, field, 'number', defaultOptions);
}

export function dateProxy<T extends Record<string, unknown>>(
  form: Writable<T>,
  field: keyof T,
  options: {
    format: 'date-local' | 'datetime-local' | 'time-local' | 'iso';
  } = {
    format: 'iso'
  }
): Writable<string> {
  return stringProxy(form, field, 'date', {
    ...defaultOptions,
    dateFormat: options.format
  });
}

/**
 * Creates a string store that will pass its value to a field in the form.
 * @param form The form
 * @param field Form field
 * @param type 'number' | 'int' | 'boolean'
 */
function stringProxy<
  T extends Record<string, unknown>,
  Type extends 'number' | 'int' | 'boolean' | 'date'
>(
  form: Writable<T>,
  field: keyof T,
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

  const proxy = derived(form, ($form) => {
    const value = $form[field];
    if (value === undefined || value === null) return '';

    if (type == 'int' || type == 'number') {
      const num = value as number;
      return isNaN(num) ? '' : String(num);
    } else if (type == 'date') {
      const date = value as unknown as Date;
      if (isNaN(date as unknown as number)) return '';
      if (options.dateFormat == 'date-local') {
        return localDate(date);
      } else if (options.dateFormat == 'datetime-local') {
        return localDate(date) + 'T' + localTime(date);
      } else if (options.dateFormat == 'time-local') {
        return localTime(date);
      } else {
        // iso
        return date.toISOString();
      }
    } else {
      // boolean
      return value ? options.trueStringValue : '';
    }
  });

  return {
    subscribe: proxy.subscribe,
    set(val: string) {
      form.update((f) => ({ ...f, [field]: toValue(val) }));
    },
    update(updater) {
      form.update((f) => ({
        ...f,
        [field]: toValue(updater(String(f[field])))
      }));
    }
  };
}

export function jsonProxy<
  K,
  T extends Record<string, unknown>,
  Field extends keyof T,
  S = T[Field] extends string ? T[Field] : never
>(
  form: Writable<T>,
  field: Field,
  initialValue?: K
): Writable<S extends never ? never : K> {
  function unserialize(val: string) {
    try {
      return parse(val);
    } catch {
      return undefined;
    }
  }

  if (initialValue !== undefined)
    form.update((f) => ({ ...f, [field]: initialValue }));

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
