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
	arrayProxy
} from './proxies.js';

/////////////////////////////////////////////////////////////////////
// Duplicated from server/index.ts,
// because "server" path cannot be imported on client.

export { defaults } from '../defaults.js';
export { actionResult } from '../actionResult.js';
export { defaultValues } from '../jsonSchema/schemaDefaults.js';
export { schemaShape } from '../jsonSchema/schemaShape.js';

export {
	superValidate,
	message,
	setMessage,
	setError,
	removeFiles,
	failAndRemoveFiles,
	type SuperValidated,
	type TaintedFields,
	type ValidationErrors
} from '../superValidate.js';

export type { Infer, InferIn } from '../adapters/adapters.js';

/////////////////////////////////////////////////////////////////////

export type {
	FormResult,
	FormOptions,
	SuperForm,
	SuperFormEventList,
	SuperFormEvents,
	SuperFormSnapshot,
	ValidateOptions,
	TaintOption
} from './superForm.js';

// Exporting from stringPath also, for convenience in components.
export {
	type FormPath,
	type FormPathLeaves,
	type FormPathArrays,
	type FormPathType
} from '../stringPath.js';
