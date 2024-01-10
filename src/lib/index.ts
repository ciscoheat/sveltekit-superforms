import type { Infer as InferSchema, Schema } from '@decs/typeschema';
import SuperDebug from './client/SuperDebug.svelte';

export default SuperDebug;

export { defaults } from './defaults.js';
export { actionResult } from './actionResult.js';
export { defaultValues } from './jsonSchema/defaultValues.js';

/*
export {
	superValidate,
	message,
	setMessage,
	setError,
	type SuperValidated,
	type TaintedFields,
	type ValidationErrors
} from './superValidate.js';
*/

export type MaybePromise<T> = T | Promise<T>;
export type Infer<T extends Schema> = NonNullable<InferSchema<T>>;
export type FieldPath<T extends object> = [keyof T, ...(string | number)[]];
export type { InputConstraints, InputConstraint } from '$lib/jsonSchema/constraints.js';

export { SuperFormError, SchemaError } from './errors.js';

export {
	type FormPath,
	type FormPathLeaves,
	type FormPathArrays,
	type FormPathType
} from './stringPath.js';
