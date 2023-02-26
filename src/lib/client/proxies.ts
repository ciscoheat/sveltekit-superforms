import { derived, type Updater, type Writable } from 'svelte/store';
import { stringify, parse } from 'devalue';

export function intProxy<
  T extends Record<string, unknown>,
  K extends keyof T
>(form: Writable<T>, field: K) {
  return stringProxy(form, field, 'int') as T[K] extends number
    ? Writable<string>
    : never;
}

export function booleanProxy<T extends Record<string, unknown>>(
  form: Writable<T>,
  field: keyof T
): Writable<string> {
  return stringProxy(form, field, 'boolean');
}

export function numberProxy<T extends Record<string, unknown>>(
  form: Writable<T>,
  field: keyof T
): Writable<string> {
  return stringProxy(form, field, 'number');
}

export function dateProxy<T extends Record<string, unknown>>(
  form: Writable<T>,
  field: keyof T
): Writable<string> {
  return stringProxy(form, field, 'date');
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
>(form: Writable<T>, field: keyof T, type: Type): Writable<string> {
  function toValue(val: unknown) {
    if (typeof val === 'string') {
      if (type == 'number') return parseFloat(val);
      if (type == 'int') return parseInt(val, 10);
      if (type == 'boolean') return !!val;
      if (type == 'date') return new Date(val);
    }
    throw new Error('stringProxy received a non-string value.');
  }

  const proxy = derived(form, ($form) => {
    if (type == 'int' || type == 'number') {
      const num = $form[field] as number;
      return isNaN(num) ? '' : String(num);
    } else {
      return $form[field] ? 'true' : '';
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
