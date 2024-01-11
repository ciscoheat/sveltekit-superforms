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

export { superValidate, message, setMessage, setError } from '../superValidate.js';
export { defaults } from '../defaults.js';
export { actionResult } from '../actionResult.js';
export { defaultValues } from '../jsonSchema/schemaDefaults.js';

export { superForm } from './superForm.js';

export type {
	FormOptions,
	SuperForm,
	SuperFormEventList,
	SuperFormEvents,
	SuperFormSnapshot,
	ValidateOptions,
	TaintOption
} from './superForm.js';

// Exporting from here also, for convenience in components.
export {
	type FormPath,
	type FormPathLeaves,
	type FormPathArrays,
	type FormPathType
} from '../stringPath.js';
