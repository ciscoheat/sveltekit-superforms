import { parse, stringify } from 'devalue';
import type { Writable } from 'svelte/store';
import type { AnyZodObject } from 'zod';
import type { ValidationErrors } from './index.js';
import { setPaths, traversePaths } from './traversal.js';

export function clone<T>(data: T): T {
  if ('structuredClone' in globalThis) {
    return structuredClone(data);
  }
  return parse(stringify(data));
}

export function clearErrors<T extends AnyZodObject>(
  Errors: Writable<ValidationErrors<T>>,
  options: {
    undefinePath: string[] | null;
    clearFormLevelErrors: boolean;
  }
) {
  Errors.update(($errors) => {
    traversePaths($errors, (pathData) => {
      if (
        pathData.path.length == 1 &&
        pathData.path[0] == '_errors' &&
        !options.clearFormLevelErrors
      ) {
        return;
      }
      if (Array.isArray(pathData.value)) {
        return pathData.set(undefined);
      }
    });

    if (options.undefinePath)
      setPaths($errors, [options.undefinePath], undefined);

    return $errors;
  });
}
