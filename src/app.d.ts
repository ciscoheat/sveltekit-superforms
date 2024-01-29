// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			flash?: any;
		}
		// interface Platform {}
		namespace Superforms {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			type Message = any;
		}
	}
}

export {};
