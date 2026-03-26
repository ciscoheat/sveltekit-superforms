// Backwards compatibility, everything should be imported from top-level in v2.
// Duplicated in client/index.ts, because "server" path cannot be imported on client.

export { defaults, defaultValues } from '../defaults.js';
export { actionResult } from '../actionResult.js';

export {
	superValidate,
	message,
	setMessage,
	setError,
	withFiles,
	removeFiles,
	type SuperValidated,
	type TaintedFields,
	type ValidationErrors
} from '../superValidate.js';

export type { Infer, InferIn, Schema } from '../adapters/adapters.js';
