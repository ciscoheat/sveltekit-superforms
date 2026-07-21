import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// Since SvelteKit 3, svelte.config.js is no longer used;
	// configuration is passed directly to the sveltekit() plugin.
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter(),
			// SvelteKit 3 removed the built-in $lib alias (replaced by #lib imports),
			// but the library source and svelte-package still rely on $lib.
			alias: {
				$lib: 'src/lib',
				'$lib/*': 'src/lib/*'
			}
			//csrf: { checkOrigin: false } // for ngrok
		})
	],
	// Vite 8 transforms TS with oxc, which needs explicit opt-in for the
	// legacy decorators used in the class-validator tests.
	oxc: {
		decorator: {
			legacy: true,
			emitDecoratorMetadata: true
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	define: {
		SUPERFORMS_LEGACY: true
	}
});
