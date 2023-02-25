import { derived, get, type Updater, type Writable } from 'svelte/store';
import { stringify, parse } from 'devalue';

/**
 * Creates a string store that will pass its value to a primitive value in the form.
 * @param form The form
 * @param field Form field
 * @param type 'int' | 'boolean'
 */
export function stringProxy<
  T extends Record<string, unknown>,
  Type extends 'int' | 'boolean'
>(form: Writable<T>, field: keyof T, type: Type): Writable<string> {
  function toValue(val: unknown) {
    if (typeof val === 'string') {
      if (type == 'int') return parseInt(val, 10);
      if (type == 'boolean') return !!val;
    }
    throw new Error('stringProxy received a non-string value.');
  }

  const proxy = derived(form, ($form) => {
    if (type == 'int') {
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

export function fieldProxy<
  T extends Record<string, unknown>,
  K extends keyof T,
  S = T[K]
>(form: Writable<T>, field: K): Writable<S> {
  function unserialize(val: string) {
    try {
      return parse(val);
    } catch {
      return undefined;
    }
  }

  const initialValue = stringify(get(form)[field]);
  form.update((f) => ({ ...f, [field]: initialValue }));

  const proxy = derived(
    form,
    ($form) => {
      return unserialize($form[field] as string);
    },
    initialValue
  );

  function update(updater: Updater<S>) {
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
    set(val: S) {
      form.update((f) => ({ ...f, [field]: stringify(val) }));
    }
  };
}

/*
export interface ArrayProxy<S> extends Writable<S[]> {
  toggle(id: S): void;
  add(id: S): void;
  remove(id: S): void;
  length: number;
}
*/

export function arrayProxy<
  T extends Record<string, unknown>,
  K extends keyof T,
  S = T[K] extends (infer A)[] ? A : never
>(form: Writable<T>, field: K) {
  const proxy = fieldProxy<T, K, S[]>(form, field as K);

  return {
    ...proxy,
    toggle(id: S) {
      proxy.update((r) => {
        return r.includes(id) ? r.filter((i) => i !== id) : [...r, id];
      });
    },
    add(id: S) {
      proxy.update((r) => [...r, id]);
    },
    remove(id: S) {
      proxy.update((r) => r.filter((i) => i !== id));
    },
    get length() {
      return get(proxy).length;
    }
  };
}
