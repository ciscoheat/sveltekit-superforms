import type { z, AnyZodObject, ZodArray, ZodObject, ZodRawShape } from 'zod';
import type { Entity, UnwrappedEntity } from './server/entity';

export class SuperFormError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, SuperFormError.prototype);
  }
}

export type RawShape<T> = T extends ZodObject<infer U> ? U : T;

export type ValidationErrors<S extends ZodRawShape> = Partial<{
  [Property in keyof S]: UnwrappedEntity<S[Property]> extends ZodObject<
    infer P extends ZodRawShape
  >
    ? ValidationErrors<RawShape<UnwrappedEntity<P>>>
    : UnwrappedEntity<S[Property]> extends ZodArray<infer A>
    ? { _errors?: string[] } & Record<
        string,
        UnwrappedEntity<A> extends ZodObject<infer V extends ZodRawShape>
          ? ValidationErrors<V>
          : string[]
      >
    : string[];
}>;

export type InputConstraint = Partial<{
  pattern: string; // RegExp
  min: number | string; // Date
  max: number | string; // Date
  required: boolean;
  step: number;
  minlength: number;
  maxlength: number;
}>;

export type InputConstraints<S extends ZodRawShape> = Partial<{
  [Property in keyof S]: UnwrappedEntity<S[Property]> extends ZodObject<
    infer P extends ZodRawShape
  >
    ? InputConstraints<RawShape<UnwrappedEntity<P>>>
    : UnwrappedEntity<S[Property]> extends ZodArray<infer A>
    ? {
        _constraints?: InputConstraint;
      } & (UnwrappedEntity<A> extends ZodObject<infer V extends ZodRawShape>
        ? InputConstraints<RawShape<UnwrappedEntity<V>>>
        : unknown)
    : InputConstraint;
}>;

export type Validation<
  T extends AnyZodObject,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M = any
> = {
  valid: boolean;
  errors: ValidationErrors<RawShape<T>>;
  data: z.infer<T>;
  empty: boolean;
  constraints: Entity<T>['constraints'];
  message?: M;
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
