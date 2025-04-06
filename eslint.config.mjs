import { defineConfig } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default defineConfig([
	{ files: ['**/*.{js,mjs,cjs,ts}'] },
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		languageOptions: { globals: globals.node },
	},
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		plugins: { js },
		extends: ['js/recommended'],
	},
	tseslint.configs.recommended,
	{
		files: ['**/*.{ts,tsx}'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-implicit-any': 'off',
		},
	},
	{
		files: ['**/*.{test,spec}.{js,ts,tsx}'],
		languageOptions: {
			globals: {
				...globals.jest,
			},
		},
	},
])
