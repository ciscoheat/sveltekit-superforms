// Backwards compatibility, everything should be imported from top-level in v2.
// Duplicated in client/index.ts, because "server" path cannot be imported on client.

export { defaults } from '../defaults.js';
export { actionResult } from '../actionResult.js';
export { defaultValues } from '../jsonSchema/schemaDefaults.js';

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
