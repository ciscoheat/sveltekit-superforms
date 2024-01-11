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
} from '../server/index.js';

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
