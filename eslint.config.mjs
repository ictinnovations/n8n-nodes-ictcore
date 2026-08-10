import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';
import n8nNodesBase from 'eslint-plugin-n8n-nodes-base';
import tseslint from 'typescript-eslint';

// Mirrors the config inside @n8n/scan-community-package so a local lint failure
// and a verification-scan failure are the same thing.
export default [
	{
		ignores: ['dist/**', 'node_modules/**', 'gulpfile.js', 'package-lock.json'],
	},
	n8nCommunityNodesPlugin.configs.recommended,
	{
		rules: { 'no-console': 'error' },
	},
	{ plugins: { 'n8n-nodes-base': n8nNodesBase } },
	{
		files: ['package.json'],
		rules: { ...n8nNodesBase.configs.community.rules },
	},
	{
		files: ['**/credentials/**/*.ts'],
		rules: {
			...n8nNodesBase.configs.credentials.rules,
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
			'n8n-nodes-base/cred-class-field-type-options-password-missing': 'off',
		},
	},
	{
		files: ['**/nodes/**/*.ts'],
		rules: {
			...n8nNodesBase.configs.nodes.rules,
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
			'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
			'n8n-nodes-base/node-param-type-options-max-value-present': 'off',
		},
	},
	{
		files: ['**/*.json', '**/*.ts'],
		languageOptions: { parser: tseslint.parser },
	},
];
