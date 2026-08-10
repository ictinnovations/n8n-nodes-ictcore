import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';
import tseslint from 'typescript-eslint';
import * as jsoncParser from 'jsonc-eslint-parser';

export default [
	{
		ignores: ['dist/**', 'node_modules/**', 'gulpfile.js', 'package-lock.json'],
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ['**/*.json'],
		languageOptions: { parser: jsoncParser },
	},
	n8nCommunityNodesPlugin.configs.recommended,
];
