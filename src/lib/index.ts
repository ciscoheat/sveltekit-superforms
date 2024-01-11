import SuperDebug from './client/SuperDebug.svelte';

export default SuperDebug;

export { SuperFormError, SchemaError } from './errors.js';

export type { InputConstraints, InputConstraint } from '$lib/jsonSchema/constraints.js';

export {
	type FormPath,
	type FormPathLeaves,
	type FormPathArrays,
	type FormPathType
} from './stringPath.js';

// Everything from server/index.ts
export {
	defaults,
	actionResult,
	defaultValues,
	superValidate,
	message,
	setMessage,
	setError,
	removeFiles,
	failAndRemoveFiles,
	type SuperValidated,
	type TaintedFields,
	type ValidationErrors,
	type Infer
} from './server/index.js';
