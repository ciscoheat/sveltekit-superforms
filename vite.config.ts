import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import UnpluginTypia from '@ryoppippi/unplugin-typia/vite';

export default defineConfig({
	plugins: [UnpluginTypia(), sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	define: {
		SUPERFORMS_LEGACY: true
	}
});
