// Backwards compatibility, everything should be imported from top-level in v2.

export { superForm } from './superForm.js';

export {
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
	type FieldProxy,
	type ArrayProxy,
	type FormFieldProxy
} from './proxies.js';

/////////////////////////////////////////////////////////////////////
// Duplicated from server/index.ts,
// because "server" path cannot be imported on client.

export { defaults, defaultValues } from '../defaults.js';
export { actionResult } from '../actionResult.js';
export { schemaShape } from '../jsonSchema/schemaShape.js';

export {
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
	type ValidationErrors
} from '../superValidate.js';

export type { Infer, InferIn, Schema } from '../adapters/adapters.js';

/////////////////////////////////////////////////////////////////////

export type {
	FormResult,
	FormOptions,
	SuperForm,
	SuperFormData,
	SuperFormErrors,
	SuperFormEventList,
	SuperFormEvents,
	SuperFormSnapshot,
	ValidateOptions,
	TaintOption,
	ChangeEvent
} from './superForm.js';

// Exporting from stringPath also, for convenience in components.
export {
	type FormPath,
	type FormPathLeaves,
	type FormPathLeavesWithErrors,
	type FormPathArrays,
	type FormPathType
} from '../stringPath.js';
