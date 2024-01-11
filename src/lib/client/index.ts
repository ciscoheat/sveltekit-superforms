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
	type ValidationErrors
} from '../server/index.js';

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
