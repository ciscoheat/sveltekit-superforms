import type { z, AnyZodObject } from 'zod';
import type { Entity } from './server/entity';

//export * as client from './client';
//export * as server from './server';

export type ValidationErrors<T extends AnyZodObject> = Partial<
  Record<keyof z.infer<T>, string[] | undefined>
>;

export type InputConstraints = Partial<{
  pattern: string; // RegExp
  min: number | string; // | Date
  max: number | string; // | Date
  required: boolean;
  step: number;
  minlength: number;
  maxlength: number;
}>;

export type Validation<T extends AnyZodObject> = {
  valid: boolean;
  errors: ValidationErrors<T>;
  data: z.infer<T>;
  empty: boolean;
  message: string | null;
  constraints: Entity<T>['constraints'];
  id?: string;
  meta?: Entity<T>['meta'];
};

export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) {
    return true;
  } else if (obj1 === null || obj2 === null) {
    return false;
  } else if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    if (Object.keys(obj1).length !== Object.keys(obj2).length) {
      return false;
    }
    for (const prop in obj1) {
      if (
        !deepEqual(obj1[prop as keyof object], obj2[prop as keyof object])
      ) {
        return false;
      }
    }
    return true;
  } else {
    return false;
  }
}
