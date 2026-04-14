import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	{
		ignores: ['.svelte-kit/**', '.output/**', 'build/**', 'node_modules/**', 'data/**'],
	},
	{
		files: ['**/*.ts', '**/*.js', '**/*.cjs', '**/*.mjs'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
			},
			globals: {
				...globals.browser,
			},
		},
		rules: {
			// SvelteKit apps commonly use normal <a href="/path"> links
			'svelte/no-navigation-without-resolve': 'off',
			// Not worth fighting during early iterations
			'svelte/prefer-writable-derived': 'off',
		},
	},
	{
		files: ['prettier.config.cjs'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		rules: {
			// Allow 'any' where it helps move faster; tighten later if desired
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
];
