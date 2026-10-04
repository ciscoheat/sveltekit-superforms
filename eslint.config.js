import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
// @ts-expect-error eslint-plugin-dci-lint has no types included
import dciLint from 'eslint-plugin-dci-lint';
import { loadConfig } from '@sveltejs/load-config';

async function loadSvelteConfig() {
	const result = await loadConfig('vite.config.ts');
	if (result && 'config' in result) return result.config;
	throw new Error('Failed to find the Svelte config');
}

const svelteConfig = await loadSvelteConfig();

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	dciLint.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			'no-undef': 'off',
			'no-unassigned-vars': 'off',
			'no-useless-assignment': 'off',
			'svelte/require-each-key': 'off',
			'svelte/no-navigation-without-resolve': 'off',
			'dci-lint/literal-role-contracts': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},
	{
		files: ['src/lib/**'],

		rules: {
			'no-console': [
				'error',
				{
					allow: ['warn']
				}
			]
		}
	}
);
