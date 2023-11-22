export type MaybePromise<T> = T | Promise<T>;

export type FieldPath<T extends object> = [keyof T, ...(string | number)[]];

export class SuperFormError extends Error {
	constructor(message?: string) {
		super(message);
		Object.setPrototypeOf(this, SuperFormError.prototype);
	}
}

export type SuperValidated<
	T extends object,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	M = App.Superforms.Message extends never ? any : App.Superforms.Message,
	C extends 'with-constraints' | 'no-constraints' = 'no-constraints'
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
	errorShape: ErrorShape;
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

export type InputConstraint = Partial<{
	pattern: string; // RegExp
	min: number | string; // Date
	max: number | string; // Date
	required: boolean;
	step: number | 'any';
	minlength: number;
	maxlength: number;
}>;

export type InputConstraints<T extends object> = SuperStruct<T, InputConstraint>;

export type ValidationErrors<T extends object> = {
	_errors?: string[];
} & SuperStructArray<T, string[], { _errors?: string[] }>;

/**
 * A tree structure where the existence of a node means that its not a leaf.
 * Used in error mapping to determine whether to add errors to an _error field
 * (as in arrays and objects), or directly on the field itself.
 */
export type ErrorShape = {
	[K in string]: ErrorShape;
};
