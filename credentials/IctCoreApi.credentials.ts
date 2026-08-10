import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class IctCoreApi implements ICredentialType {
	name = 'ictCoreApi';

	displayName = 'ICTCore API';

	documentationUrl = 'https://ictpbx.com/ictpbx-rest-api/';

	icon: Icon = { light: 'file:icons/ictcore.svg', dark: 'file:icons/ictcore.dark.svg' };

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://pbx.example.com',
			required: true,
			description:
				'Your server address without the /api suffix. The same credential works for ICTFax, ICTPBX and the open source ICTDialer, since all three run on ICTCore. For ICTDialer.com, use the ICTContact credential instead.',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Username and Password',
					value: 'basic',
				},
				{
					name: 'Bearer Token',
					value: 'apiToken',
				},
			],
			default: 'basic',
			description:
				'ICTCore accepts HTTP Basic on every endpoint. Pick Bearer Token if you already hold a JWT from POST /authenticate.',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			placeholder: 'admin@ictcore.org',
			displayOptions: {
				show: {
					authentication: ['basic'],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: ['basic'],
				},
			},
		},
		{
			displayName: 'Bearer Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authentication: ['apiToken'],
				},
			},
			description: 'The token returned by POST /authenticate',
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'ignoreSslIssues',
			type: 'boolean',
			default: false,
			description:
				'Whether to accept a self-signed certificate. Common on an on-premise PBX that was never given a public certificate.',
		},
	];

	/**
	 * ICTCore accepts Basic on every endpoint and a bearer JWT from
	 * POST /authenticate, so the credential offers both and picks one here rather
	 * than in every node.
	 */
	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.skipSslCertificateValidation = credentials.ignoreSslIssues as boolean;
		requestOptions.headers = { ...requestOptions.headers };

		if (credentials.authentication === 'apiToken') {
			requestOptions.headers.Authorization = `Bearer ${credentials.apiToken as string}`;
		} else {
			const pair = `${credentials.username as string}:${credentials.password as string}`;
			requestOptions.headers.Authorization = `Basic ${Buffer.from(pair).toString('base64')}`;
		}

		return requestOptions;
	}

	// Listing contacts is the lightest authenticated read ICTCore offers.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl.replace(/\\/+$/, "") }}/api',
			url: '/contacts',
			method: 'GET',
		},
	};
}
