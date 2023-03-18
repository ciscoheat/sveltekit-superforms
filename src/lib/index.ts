import type { z, AnyZodObject, ZodArray, ZodObject } from 'zod';
import type { Entity, UnwrappedEntity } from './server/entity';
import type { Writable } from 'svelte/store';

export class SuperFormError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, SuperFormError.prototype);
  }
}

export type RawShape<T> = T extends ZodObject<infer U> ? U : never;

export type SuperStruct<T extends AnyZodObject, Data, ArrayData = never> = {
  [Property in keyof RawShape<T>]?: UnwrappedEntity<
    RawShape<T>[Property]
  > extends AnyZodObject
    ? SuperStruct<UnwrappedEntity<RawShape<T>[Property]>, Data, ArrayData>
    : UnwrappedEntity<RawShape<T>[Property]> extends ZodArray<infer A>
    ? ArrayData &
        Record<
          number,
          UnwrappedEntity<A> extends AnyZodObject
            ? SuperStruct<UnwrappedEntity<A>, Data, ArrayData>
            : Data
        >
    : Data;
};

export type TaintedFields<T extends AnyZodObject> = SuperStruct<T, boolean>;

export type ValidationErrors<T extends AnyZodObject> = SuperStruct<
  T,
  string[],
  { _errors?: string[] }
>;

export type InputConstraint = Partial<{
  pattern: string; // RegExp
  min: number | string; // Date
  max: number | string; // Date
  required: boolean;
  step: number;
  minlength: number;
  maxlength: number;
}>;

export type InputConstraints<T extends AnyZodObject> = SuperStruct<
  T,
  InputConstraint
>;

export type Validation<
  T extends AnyZodObject,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
> = {
  valid: boolean;
  errors: ValidationErrors<T>;
  data: z.infer<T>;
  empty: boolean;
  constraints: Entity<T>['constraints'];
  message?: M;
  id?: string;
  meta?: Entity<T>['meta'];
};

export type FormField<
  T extends AnyZodObject,
  Property extends keyof z.infer<T>
> = {
  name: string;
  value: Writable<z.infer<T>[Property]>;
  errors?: ValidationErrors<T>[Property];
  constraints?: InputConstraints<T>[Property];
  type?: string;
};

export type FormFields<T extends AnyZodObject> = {
  [Property in keyof z.infer<T>]-?: FormField<T, Property>;
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
