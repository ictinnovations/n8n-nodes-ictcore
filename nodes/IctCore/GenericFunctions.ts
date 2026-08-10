import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

type Ctx = IExecuteFunctions | ILoadOptionsFunctions;

export async function ictCoreApiRequest(
	this: Ctx,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | Buffer = {},
	qs: IDataObject = {},
	overrides: Partial<IHttpRequestOptions> = {},
): Promise<any> {
	const credentials = await this.getCredentials('ictCoreApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		qs,
		url: `${baseUrl}/api${endpoint}`,
		json: true,
		headers: {
			Accept: 'application/json',
		},
		...overrides,
	};

	if (Buffer.isBuffer(body) || Object.keys(body).length > 0) {
		options.body = body;
	}

	return await this.helpers.httpRequestWithAuthentication.call(this, 'ictCoreApi', options);
}

/**
 * ICTCore returns either a bare array or an object keyed by ID depending on the
 * resource, so callers get one predictable shape.
 */
export function toArray(response: unknown): IDataObject[] {
	if (Array.isArray(response)) return response as IDataObject[];
	if (response && typeof response === 'object') {
		const values = Object.values(response as IDataObject);
		if (values.every((v) => v !== null && typeof v === 'object')) {
			return values as IDataObject[];
		}
		return [response as IDataObject];
	}
	return [];
}

export function extractId(response: unknown, ...keys: string[]): number | string {
	if (typeof response === 'number' || typeof response === 'string') return response;
	const record = (response ?? {}) as IDataObject;
	for (const key of keys) {
		if (record[key] !== undefined) return record[key] as number | string;
	}
	throw new Error(`Could not find any of ${keys.join(', ')} in the API response`);
}

/**
 * Poll a transmission until it leaves the pending or processing state.
 *
 * ICTCore has no webhook or event stream of any kind, so polling is the only
 * way a workflow can find out how a fax or call ended.
 */
export async function waitForTransmission(
	this: IExecuteFunctions,
	transmissionId: number | string,
	timeoutSeconds: number,
	intervalSeconds: number,
): Promise<IDataObject> {
	const deadline = Date.now() + timeoutSeconds * 1000;
	const interval = Math.max(intervalSeconds, 1) * 1000;

	let last: IDataObject = {};
	while (Date.now() < deadline) {
		const response = await ictCoreApiRequest.call(
			this,
			'GET',
			`/transmissions/${transmissionId}/status`,
		);
		last = typeof response === 'object' && response !== null ? response : { status: response };
		const status = String(last.status ?? response ?? '').toLowerCase();

		if (status && !['pending', 'processing', 'scheduled', 'ready'].includes(status)) {
			return last;
		}

		await sleep(interval);
	}

	throw new NodeOperationError(
		this.getNode(),
		`Transmission ${transmissionId} was still running after ${timeoutSeconds} seconds`,
		{
			description:
				'Raise the timeout, or turn off "Wait Until Finished" and check the status in a later step.',
		},
	);
}
