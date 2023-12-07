import type { Infer, Schema } from '@decs/typeschema';
import type { InputConstraints } from '$lib/jsonSchema/constraints.js';
import type { ObjectShape } from './jsonSchema/objectShape.js';

export type MaybePromise<T> = T | Promise<T>;
export type Inferred<T extends Schema> = NonNullable<Infer<T>>;
export type FieldPath<T extends object> = [keyof T, ...(string | number)[]];
export type { InputConstraints, InputConstraint } from '$lib/jsonSchema/constraints.js';

export class SuperFormError extends Error {
	constructor(message?: string) {
		super(message);
		Object.setPrototypeOf(this, SuperFormError.prototype);
	}
}

export class SchemaError extends SuperFormError {
	readonly path: string | undefined;
	constructor(message: string, path?: string | string[]) {
		super(
			(path && path.length ? `[${Array.isArray(path) ? path.join('.') : path}] ` : '') + message
		);
		this.path = Array.isArray(path) ? path.join('.') : path;
		Object.setPrototypeOf(this, SchemaError.prototype);
	}
}

export type SuperValidated<
	T extends object,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message,
	C extends 'with-constraints' | 'no-constraints' = 'with-constraints'
> = {
	valid: boolean;
	posted: boolean;
	errors: ValidationErrors<T>;
	data: T;
	constraints: C extends 'with-constraints' ? InputConstraints<T> : never;
	message?: M;
	id?: string;
};

type EntityRecord<T extends object, K> = Record<keyof T, K>;

export type Entity<T extends object> = {
	typeInfo: EntityRecord<T, ZodTypeInfo>;
	defaultEntity: T;
	constraints: InputConstraints<T>;
	keys: string[];
	hash: string;
	errorShape: ObjectShape;
};

export type ZodTypeInfo = {
	type: unknown;
	//zodType: unknown;
	//originalType: ZodTypeAny;
	isNullable: boolean;
	isOptional: boolean;
	hasDefault: boolean;
	//effects: ZodEffects<ZodTypeAny> | undefined;
	defaultValue: unknown;
};

export type ValidationErrors<T extends object> = {
	_errors?: string[];
} & SuperStructArray<T, string[], { _errors?: string[] }>;
