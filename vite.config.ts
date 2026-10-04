import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter()
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
