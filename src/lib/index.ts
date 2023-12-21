import type { Infer, Schema } from '@decs/typeschema';
import type { InputConstraints } from '$lib/jsonSchema/constraints.js';
import type { SchemaShape } from './jsonSchema/schemaShape.js';

import SuperDebug from './client/SuperDebug.svelte';
export default SuperDebug;

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
	T extends Record<string, unknown>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message,
	C extends 'with-constraints' | 'no-constraints' = 'with-constraints'
> = {
	id: string;
	valid: boolean;
	posted: boolean;
	errors: ValidationErrors<T>;
	data: T;
	constraints: C extends 'with-constraints' ? InputConstraints<T> : never;
	shape: SchemaShape;
	message?: M;
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

export type ValidationErrors<T extends Record<string, unknown>> = {
	_errors?: string[];
} & SuperStructArray<T, string[], { _errors?: string[] }>;

export type TaintedFields<T extends Record<string, unknown>> = SuperStructArray<T, boolean>;

// Cannot be a SuperStruct due to Property having to be passed on.
// Deep recursive problem fixed thanks to https://www.angularfix.com/2022/01/why-am-i-getting-instantiation-is.html
export type Validators<T extends Record<string, unknown>> = Partial<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Property in keyof T]: T extends any
		? T[Property] extends Record<string, unknown>
			? Validators<T[Property]>
			: T[Property] extends (infer A)[]
				? A extends Record<string, unknown>
					? Validators<A>
					: Validator<T[Property] extends (infer A2)[] ? A2 : T[Property]>
				: Validator<T[Property]>
		: never;
}>;

export type Validator<V> = (value: V) => MaybePromise<string | string[] | null | undefined>;

type SuperStructArray<T extends Record<string, unknown>, Data, ArrayData = unknown> = {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Property in keyof T]?: T extends any
		? T[Property] extends Record<string, unknown>
			? SuperStructArray<T[Property], Data, ArrayData>
			: T[Property] extends (infer A)[]
				? ArrayData &
						Record<
							number,
							A extends Record<string, unknown> ? SuperStructArray<A, Data, ArrayData> : Data
						>
				: Data
		: never;
};

export type SuperStruct<T extends Record<string, unknown>, Data> = Partial<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	[Property in keyof T]: T extends any
		? T[Property] extends Record<string, unknown>
			? SuperStruct<T[Property], Data>
			: T[Property] extends (infer A)[]
				? A extends Record<string, unknown>
					? SuperStruct<A, Data>
					: Data
				: Data
		: never;
}>;
