// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		interface PageData {
			flash?: any;
		}
		// interface Platform {}
		namespace Superforms {
			type Message = any;
		}
	}
}

export {};
