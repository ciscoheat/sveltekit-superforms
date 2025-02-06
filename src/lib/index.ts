import SuperDebug from './client/SuperDebug.svelte';

export default SuperDebug;
export { SuperFormError, SchemaError } from './errors.js';

export type { InputConstraints, InputConstraint } from '$lib/jsonSchema/constraints.js';
export type { JSONSchema } from './jsonSchema/index.js';

// Everything from client/index.ts
export {
	superForm,
	intProxy,
	numberProxy,
	booleanProxy,
	dateProxy,
	fieldProxy,
	formFieldProxy,
	stringProxy,
	arrayProxy,
	fileProxy,
	fileFieldProxy,
	filesProxy,
	filesFieldProxy,
	defaults,
	defaultValues,
	schemaShape,
	actionResult,
	superValidate,
	message,
	setMessage,
	setError,
	withFiles,
	removeFiles,
	fail,
	type SuperValidated,
	type SuperValidateOptions,
	type TaintedFields,
	type ValidationErrors,
	type Infer,
	type InferIn,
	type Schema,
	type FormResult,
	type FormOptions,
	type SuperForm,
	type SuperFormEventList,
	type SuperFormEvents,
	type SuperFormSnapshot,
	type ValidateOptions,
	type TaintOption,
	type FormPath,
	type FormPathLeaves,
	type FormPathLeavesWithErrors,
	type FormPathArrays,
	type FormPathType,
	type ChangeEvent,
	type FieldProxy,
	type ArrayProxy,
	type FormFieldProxy
} from './client/index.js';

export { splitPath } from './stringPath.js';

export type { ErrorStatus, MergeUnion, MergeFormUnion } from './utils.js';
export { mergeFormUnion } from './utils.js';
