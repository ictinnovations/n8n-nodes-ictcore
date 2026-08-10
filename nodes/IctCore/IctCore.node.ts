import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	extractId,
	ictCoreApiRequest,
	toArray,
	waitForTransmission,
} from './GenericFunctions';

export class IctCore implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ICTCore',
		name: 'ictCore',
		icon: { light: 'file:ictcore.svg', dark: 'file:ictcore.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with ICTFax, ICTPBX and open source ICTDialer through the ICTCore REST API',
		defaults: {
			name: 'ICTCore',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'ictCoreApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Call', value: 'call' },
					{ name: 'Campaign', value: 'campaign' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Extension', value: 'extension' },
					{ name: 'Fax', value: 'fax' },
					{ name: 'Group', value: 'group' },
					{ name: 'Report', value: 'report' },
					{ name: 'Transmission', value: 'transmission' },
				],
				default: 'fax',
			},

			// Fax
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['fax'] } },
				options: [
					{
						name: 'Send',
						value: 'send',
						description:
							'Upload a document and fax it in one step. Runs the whole document, program, transmission and send sequence for you.',
						action: 'Send a fax',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List sent and received faxes',
						action: 'Get many faxes',
					},
					{
						name: 'Download',
						value: 'download',
						description: 'Download the PDF of a fax document',
						action: 'Download a fax',
					},
				],
				default: 'send',
			},
			{
				displayName: 'Send To',
				name: 'to',
				type: 'string',
				required: true,
				default: '',
				placeholder: '+14155550123',
				displayOptions: { show: { resource: ['fax'], operation: ['send'] } },
				description: 'Fax number of the recipient',
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: { show: { resource: ['fax'], operation: ['send'] } },
				description: 'Name of the binary field holding the PDF to fax',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add option',
				default: {},
				displayOptions: { show: { resource: ['fax'], operation: ['send'] } },
				options: [
					{
						displayName: 'Account ID',
						name: 'accountId',
						type: 'string',
						default: '',
						description: 'Sending account. Leave empty to use the account the credential belongs to.',
					},
					{
						displayName: 'Contact Name',
						name: 'contactName',
						type: 'string',
						default: '',
						description: 'Name to store against the recipient number',
					},
					{
						displayName: 'Document Name',
						name: 'documentName',
						type: 'string',
						default: '',
						description: 'Defaults to the file name of the binary field',
					},
					{
						displayName: 'Poll Interval (Seconds)',
						name: 'pollInterval',
						type: 'number',
						default: 5,
						description: 'How often to check the status while waiting',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						default: 300,
						description: 'How long to wait before giving up on the fax finishing',
					},
					{
						displayName: 'Wait Until Finished',
						name: 'waitUntilFinished',
						type: 'boolean',
						default: false,
						description:
							'Whether to poll until the fax completes or fails. ICTCore has no webhooks, so polling is the only way to find out how it ended.',
					},
				],
			},
			{
				displayName: 'Document ID',
				name: 'documentId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['fax'], operation: ['download'] } },
			},
			{
				displayName: 'Put Output File in Field',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: { show: { resource: ['fax'], operation: ['download'] } },
			},

			// Call
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['call'] } },
				options: [
					{
						name: 'Originate',
						value: 'originate',
						description: 'Ring one party and connect them to another. ICTPBX only.',
						action: 'Originate a call',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'List voice transmissions',
						action: 'Get many calls',
					},
				],
				default: 'originate',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				required: true,
				default: '',
				placeholder: '1001',
				displayOptions: { show: { resource: ['call'], operation: ['originate'] } },
				description: 'Extension to ring first',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				required: true,
				default: '',
				placeholder: '1002',
				displayOptions: { show: { resource: ['call'], operation: ['originate'] } },
				description: 'Number to connect once the first leg answers',
			},

			// Contact
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['contact'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a contact' },
					{ name: 'Delete', value: 'delete', action: 'Delete a contact' },
					{ name: 'Get', value: 'get', action: 'Get a contact' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many contacts' },
					{ name: 'Update', value: 'update', action: 'Update a contact' },
				],
				default: 'create',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['contact'], operation: ['get', 'update', 'delete'] },
				},
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'collection',
				placeholder: 'Add field',
				default: {},
				displayOptions: { show: { resource: ['contact'], operation: ['create', 'update'] } },
				options: [
					{ displayName: 'Address', name: 'address', type: 'string', default: '' },
					{ displayName: 'Custom 1', name: 'custom1', type: 'string', default: '' },
					{ displayName: 'Custom 2', name: 'custom2', type: 'string', default: '' },
					{ displayName: 'Custom 3', name: 'custom3', type: 'string', default: '' },
					{ displayName: 'Description', name: 'description', type: 'string', default: '' },
					{ displayName: 'Email', name: 'email', type: 'string', default: '' },
					{ displayName: 'First Name', name: 'first_name', type: 'string', default: '' },
					{ displayName: 'Last Name', name: 'last_name', type: 'string', default: '' },
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						displayOptions: { show: { '/operation': ['update'] } },
					},
				],
			},

			// Group
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['group'] } },
				options: [
					{ name: 'Add Contact', value: 'addContact', action: 'Add a contact to a group' },
					{ name: 'Create', value: 'create', action: 'Create a group' },
					{ name: 'Delete', value: 'delete', action: 'Delete a group' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many groups' },
					{
						name: 'Get Contacts',
						value: 'getContacts',
						action: 'Get the contacts in a group',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['group'], operation: ['create'] } },
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['group'],
						operation: ['delete', 'getContacts', 'addContact'],
					},
				},
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['group'], operation: ['addContact'] } },
			},

			// Campaign
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['campaign'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a campaign' },
					{ name: 'Delete', value: 'delete', action: 'Delete a campaign' },
					{ name: 'Get', value: 'get', action: 'Get a campaign' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many campaigns' },
					{ name: 'Start', value: 'start', action: 'Start a campaign' },
					{ name: 'Stop', value: 'stop', action: 'Stop a campaign' },
				],
				default: 'create',
			},
			{
				displayName: 'Program ID',
				name: 'programId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['campaign'], operation: ['create'] } },
				description: 'The program that says what each call, fax or message should do',
			},
			{
				displayName: 'Group ID',
				name: 'groupId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['campaign'], operation: ['create'] } },
				description: 'Contact group to dial',
			},
			{
				displayName: 'Calls Per Minute',
				name: 'cpm',
				type: 'number',
				required: true,
				default: 10,
				displayOptions: { show: { resource: ['campaign'], operation: ['create'] } },
			},
			{
				displayName: 'Campaign ID',
				name: 'campaignId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['campaign'],
						operation: ['get', 'start', 'stop', 'delete'],
					},
				},
			},

			// Transmission
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['transmission'] } },
				options: [
					{ name: 'Get', value: 'get', action: 'Get a transmission' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many transmissions' },
					{ name: 'Get Result', value: 'result', action: 'Get the result of a transmission' },
					{ name: 'Get Status', value: 'status', action: 'Get the status of a transmission' },
					{ name: 'Retry', value: 'retry', action: 'Retry a transmission' },
					{ name: 'Send', value: 'send', action: 'Send a transmission' },
				],
				default: 'status',
			},
			{
				displayName: 'Transmission ID',
				name: 'transmissionId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['transmission'] } },
			},

			// Extension
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['extension'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create an extension' },
					{ name: 'Delete', value: 'delete', action: 'Delete an extension' },
					{ name: 'Get Many', value: 'getAll', action: 'Get many extensions' },
					{
						name: 'Get Next Available',
						value: 'nextAvailable',
						action: 'Get the next free extension number',
					},
				],
				default: 'create',
			},
			{
				displayName: 'Extension',
				name: 'extension',
				type: 'string',
				required: true,
				default: '',
				placeholder: '1005',
				displayOptions: { show: { resource: ['extension'], operation: ['create'] } },
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				required: true,
				default: '',
				displayOptions: { show: { resource: ['extension'], operation: ['create'] } },
				description: 'SIP password for the device that will register',
			},
			{
				displayName: 'Display Name',
				name: 'displayName',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['extension'], operation: ['create'] } },
			},
			{
				displayName: 'Extension UUID',
				name: 'extensionUuid',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['extension'], operation: ['delete'] } },
			},

			// Report
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['report'] } },
				options: [
					{
						name: 'Get CDR',
						value: 'cdr',
						description: 'Call detail records',
						action: 'Get call detail records',
					},
					{
						name: 'Get Statistics',
						value: 'statistics',
						description: 'Totals for campaigns, contacts and transmissions',
						action: 'Get statistics',
					},
				],
				default: 'statistics',
			},

			// Shared list controls
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['getAll', 'getContacts', 'cdr'],
					},
				},
				description: 'Whether to return every result or only up to the limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				displayOptions: {
					show: {
						operation: ['getAll', 'getContacts', 'cdr'],
						returnAll: [false],
					},
				},
				description: 'Max number of results to return',
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add filter',
				default: {},
				displayOptions: {
					show: {
						operation: ['getAll', 'getContacts', 'cdr'],
					},
				},
				description: 'Query string filters passed straight through to ICTCore',
				options: [
					{
						displayName: 'Filter',
						name: 'filter',
						values: [
							{ displayName: 'Name', name: 'name', type: 'string', default: '' },
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: unknown;
				let binary: INodeExecutionData['binary'];

				const buildQs = (): IDataObject => {
					const qs: IDataObject = {};
					const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
					for (const entry of (filters.filter as IDataObject[]) ?? []) {
						if (entry.name) qs[entry.name as string] = entry.value;
					}
					return qs;
				};

				const listAndTrim = async (endpoint: string) => {
					const response = await ictCoreApiRequest.call(this, 'GET', endpoint, {}, buildQs());
					const rows = toArray(response);
					const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
					if (returnAll) return rows;
					return rows.slice(0, this.getNodeParameter('limit', i, 50) as number);
				};

				if (resource === 'fax') {
					if (operation === 'send') {
						const to = this.getNodeParameter('to', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const options = this.getNodeParameter('options', i, {}) as IDataObject;

						const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
						const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
						const documentName =
							(options.documentName as string) || binaryData.fileName || `fax-${Date.now()}`;

						const contact = await ictCoreApiRequest.call(this, 'POST', '/contacts', {
							phone: to,
							first_name: (options.contactName as string) || to,
						});
						const contactId = extractId(contact, 'contact_id', 'id');

						const document = await ictCoreApiRequest.call(this, 'POST', '/messages/documents', {
							name: documentName,
						});
						const documentId = extractId(document, 'document_id', 'id');

						await ictCoreApiRequest.call(
							this,
							'PUT',
							`/messages/documents/${documentId}/media`,
							buffer,
							{},
							{
								json: false,
								headers: {
									'Content-Type': binaryData.mimeType || 'application/pdf',
								},
							},
						);

						const programBody: IDataObject = {
							name: `n8n fax ${documentName}`,
							document_id: documentId,
						};
						if (options.accountId) programBody.account_id = options.accountId;
						const program = await ictCoreApiRequest.call(
							this,
							'POST',
							'/programs/sendfax',
							programBody,
						);
						const programId = extractId(program, 'program_id', 'id');

						const transmissionBody: IDataObject = {
							contact_id: contactId,
							program_id: programId,
						};
						if (options.accountId) transmissionBody.account_id = options.accountId;
						const transmission = await ictCoreApiRequest.call(
							this,
							'POST',
							'/transmissions',
							transmissionBody,
						);
						const transmissionId = extractId(transmission, 'transmission_id', 'id');

						const sendResult = await ictCoreApiRequest.call(
							this,
							'POST',
							`/transmissions/${transmissionId}/send`,
						);

						responseData = {
							transmission_id: transmissionId,
							document_id: documentId,
							program_id: programId,
							contact_id: contactId,
							to,
							send: sendResult,
						};

						if (options.waitUntilFinished) {
							const status = await waitForTransmission.call(
								this,
								transmissionId,
								(options.timeout as number) ?? 300,
								(options.pollInterval as number) ?? 5,
							);
							responseData = { ...(responseData as IDataObject), ...status };
						}
					} else if (operation === 'getAll') {
						responseData = await listAndTrim('/faxes');
					} else if (operation === 'download') {
						const documentId = this.getNodeParameter('documentId', i) as string;
						const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
						const buffer = (await ictCoreApiRequest.call(
							this,
							'GET',
							`/documents/${documentId}/media`,
							{},
							{},
							{ json: false, encoding: 'arraybuffer' },
						)) as Buffer;
						binary = {
							[binaryPropertyName]: await this.helpers.prepareBinaryData(
								Buffer.from(buffer),
								`document-${documentId}.pdf`,
								'application/pdf',
							),
						};
						responseData = { document_id: documentId };
					}
				} else if (resource === 'call') {
					if (operation === 'originate') {
						responseData = await ictCoreApiRequest.call(this, 'POST', '/call/originate', {
							from: this.getNodeParameter('from', i) as string,
							to: this.getNodeParameter('to', i) as string,
						});
					} else if (operation === 'getAll') {
						responseData = await listAndTrim('/calls');
					}
				} else if (resource === 'contact') {
					if (operation === 'create') {
						responseData = await ictCoreApiRequest.call(this, 'POST', '/contacts', {
							phone: this.getNodeParameter('phone', i) as string,
							...(this.getNodeParameter('fields', i, {}) as IDataObject),
						});
					} else if (operation === 'update') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await ictCoreApiRequest.call(
							this,
							'PUT',
							`/contacts/${contactId}`,
							this.getNodeParameter('fields', i, {}) as IDataObject,
						);
					} else if (operation === 'get') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await ictCoreApiRequest.call(this, 'GET', `/contacts/${contactId}`);
					} else if (operation === 'delete') {
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await ictCoreApiRequest.call(this, 'DELETE', `/contacts/${contactId}`);
					} else if (operation === 'getAll') {
						responseData = await listAndTrim('/contacts');
					}
				} else if (resource === 'group') {
					if (operation === 'create') {
						responseData = await ictCoreApiRequest.call(this, 'POST', '/groups', {
							name: this.getNodeParameter('name', i) as string,
						});
					} else if (operation === 'delete') {
						const groupId = this.getNodeParameter('groupId', i) as string;
						responseData = await ictCoreApiRequest.call(this, 'DELETE', `/groups/${groupId}`);
					} else if (operation === 'getAll') {
						responseData = await listAndTrim('/groups');
					} else if (operation === 'getContacts') {
						const groupId = this.getNodeParameter('groupId', i) as string;
						responseData = await listAndTrim(`/groups/${groupId}/contacts`);
					} else if (operation === 'addContact') {
						const groupId = this.getNodeParameter('groupId', i) as string;
						const contactId = this.getNodeParameter('contactId', i) as string;
						responseData = await ictCoreApiRequest.call(
							this,
							'PUT',
							`/contacts/${contactId}/link/${groupId}`,
						);
					}
				} else if (resource === 'campaign') {
					if (operation === 'create') {
						responseData = await ictCoreApiRequest.call(this, 'POST', '/campaigns', {
							program_id: this.getNodeParameter('programId', i) as string,
							group_id: this.getNodeParameter('groupId', i) as string,
							cpm: this.getNodeParameter('cpm', i) as number,
						});
					} else if (operation === 'getAll') {
						responseData = await listAndTrim('/campaigns');
					} else {
						const campaignId = this.getNodeParameter('campaignId', i) as string;
						if (operation === 'get') {
							responseData = await ictCoreApiRequest.call(this, 'GET', `/campaigns/${campaignId}`);
						} else if (operation === 'start') {
							responseData = await ictCoreApiRequest.call(
								this,
								'PUT',
								`/campaigns/${campaignId}/start`,
							);
						} else if (operation === 'stop') {
							responseData = await ictCoreApiRequest.call(
								this,
								'PUT',
								`/campaigns/${campaignId}/stop`,
							);
						} else if (operation === 'delete') {
							responseData = await ictCoreApiRequest.call(
								this,
								'DELETE',
								`/campaigns/${campaignId}`,
							);
						}
					}
				} else if (resource === 'transmission') {
					const transmissionId = this.getNodeParameter('transmissionId', i) as string;
					if (operation === 'get') {
						responseData = await ictCoreApiRequest.call(
							this,
							'GET',
							`/transmissions/${transmissionId}`,
						);
					} else if (operation === 'getAll') {
						responseData = await listAndTrim('/transmissions');
					} else if (operation === 'status') {
						responseData = await ictCoreApiRequest.call(
							this,
							'GET',
							`/transmissions/${transmissionId}/status`,
						);
					} else if (operation === 'result') {
						responseData = await ictCoreApiRequest.call(
							this,
							'GET',
							`/transmissions/${transmissionId}/result`,
						);
					} else if (operation === 'send') {
						responseData = await ictCoreApiRequest.call(
							this,
							'POST',
							`/transmissions/${transmissionId}/send`,
						);
					} else if (operation === 'retry') {
						responseData = await ictCoreApiRequest.call(
							this,
							'POST',
							`/transmissions/${transmissionId}/retry`,
						);
					}
				} else if (resource === 'extension') {
					if (operation === 'create') {
						responseData = await ictCoreApiRequest.call(this, 'POST', '/fpbx_extensions', {
							extension: this.getNodeParameter('extension', i) as string,
							password: this.getNodeParameter('password', i) as string,
							display_name: this.getNodeParameter('displayName', i, '') as string,
						});
					} else if (operation === 'getAll') {
						responseData = await listAndTrim('/fpbx_extensions');
					} else if (operation === 'nextAvailable') {
						responseData = await ictCoreApiRequest.call(
							this,
							'GET',
							'/fpbx_extensions/next_available',
						);
					} else if (operation === 'delete') {
						const extensionUuid = this.getNodeParameter('extensionUuid', i) as string;
						responseData = await ictCoreApiRequest.call(
							this,
							'DELETE',
							`/fpbx_extensions/${extensionUuid}`,
						);
					}
				} else if (resource === 'report') {
					if (operation === 'statistics') {
						responseData = await ictCoreApiRequest.call(this, 'GET', '/statistics');
					} else if (operation === 'cdr') {
						responseData = await listAndTrim('/cdr');
					}
				}

				if (responseData === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				const rows = Array.isArray(responseData)
					? (responseData as IDataObject[])
					: [responseData as IDataObject];

				for (const row of rows) {
					returnData.push({
						json: typeof row === 'object' && row !== null ? row : { result: row },
						binary,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				// Errors we raised ourselves already carry a useful message, so only
				// raw transport failures get wrapped.
				throw error instanceof NodeApiError || error instanceof NodeOperationError
					? error
					: new NodeApiError(this.getNode(), error as JsonObject);
			}
		}

		return [returnData];
	}
}
