const environmentNames = [
	'AWS_REGION',
	'AWS_ACCESS_KEY_ID',
	'AWS_SECRET_ACCESS_KEY',
	'AWS_SESSION_TOKEN',
	'AWS_S3_ENDPOINT_URL',
];

const originalEnvironment = Object.fromEntries(environmentNames.map((name) => [name, process.env[name]]));

const clearEnvironment = () => {
	environmentNames.forEach((name) => delete process.env[name]);
};

const restoreEnvironment = () => {
	environmentNames.forEach((name) => {
		if (originalEnvironment[name] === undefined) {
			delete process.env[name];
		} else {
			process.env[name] = originalEnvironment[name];
		}
	});
};

const loadClient = () => {
	jest.resetModules();
	return require('../../src/model/data/aws/s3Client');
};

describe('S3 client configuration', () => {
	beforeEach(clearEnvironment);
	afterAll(restoreEnvironment);

	test('configures a region without requiring explicit credentials or endpoint', async () => {
		process.env.AWS_REGION = 'us-east-1';

		const client = loadClient();

		expect(await client.config.region()).toBe('us-east-1');
		expect(client.config.forcePathStyle).toBe(true);

		client.destroy();
	});

	test('uses explicit credentials without a session token', async () => {
		process.env.AWS_REGION = 'us-east-1';
		process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
		process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

		const client = loadClient();
		const credentials = await client.config.credentials();

		expect(credentials).toEqual(
			expect.objectContaining({
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
			})
		);
		expect(credentials.sessionToken).toBeUndefined();

		client.destroy();
	});

	test('uses temporary credentials and an alternate MiniStack endpoint', async () => {
		process.env.AWS_REGION = 'us-east-1';
		process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
		process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
		process.env.AWS_SESSION_TOKEN = 'test-session-token';
		process.env.AWS_S3_ENDPOINT_URL = 'http://localhost:4566';

		const client = loadClient();
		const credentials = await client.config.credentials();
		const endpoint = await client.config.endpoint();

		expect(credentials).toEqual(
			expect.objectContaining({
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
				sessionToken: 'test-session-token',
			})
		);
		expect(endpoint.protocol).toBe('http:');
		expect(endpoint.hostname).toBe('localhost');
		expect(String(endpoint.port)).toBe('4566');

		client.destroy();
	});
});
