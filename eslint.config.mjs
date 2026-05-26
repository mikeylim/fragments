// eslint.config.mjs

import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
	{ files: ['**/*.js'], languageOptions: { sourceType: 'commonjs' } },
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest,
			},
		},
	},
	{
		rules: {
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		},
	},
	pluginJs.configs.recommended,
];
