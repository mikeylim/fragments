const environmentNames = [
	'AWS_REGION',
	'AWS_ACCESS_KEY_ID',
	'AWS_SECRET_ACCESS_KEY',
	'AWS_SESSION_TOKEN',
	'AWS_DYNAMODB_ENDPOINT_URL',
];

const originalEnvironment = Object.fromEntries(environmentNames.map((name) => [name, process.env[name]]));

const mockDynamoDBClient = jest.fn();
const mockDocumentClient = { send: jest.fn() };
const mockFrom = jest.fn(() => mockDocumentClient);

jest.mock('@aws-sdk/client-dynamodb', () => ({
	DynamoDBClient: mockDynamoDBClient,
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
	DynamoDBDocumentClient: { from: mockFrom },
}));

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
	return require('../../src/model/data/aws/ddbDocClient');
};

describe('DynamoDB document client configuration', () => {
	beforeEach(() => {
		clearEnvironment();
		mockDynamoDBClient.mockClear();
		mockFrom.mockClear();
	});

	afterAll(restoreEnvironment);

	test('configures a region without explicit credentials or endpoint', () => {
		process.env.AWS_REGION = 'us-east-1';

		const client = loadClient();

		expect(mockDynamoDBClient).toHaveBeenCalledWith({
			region: 'us-east-1',
			endpoint: undefined,
			credentials: undefined,
		});
		expect(mockFrom).toHaveBeenCalledWith(
			mockDynamoDBClient.mock.instances[0],
			expect.objectContaining({
				marshallOptions: expect.objectContaining({ convertClassInstanceToMap: true }),
				unmarshallOptions: { wrapNumbers: false },
			})
		);
		expect(client).toBe(mockDocumentClient);
	});

	test('uses explicit credentials and an alternate local endpoint', () => {
		process.env.AWS_REGION = 'us-east-1';
		process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
		process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
		process.env.AWS_DYNAMODB_ENDPOINT_URL = 'http://localhost:8000';

		loadClient();

		expect(mockDynamoDBClient).toHaveBeenCalledWith({
			region: 'us-east-1',
			endpoint: 'http://localhost:8000',
			credentials: {
				accessKeyId: 'test-access-key',
				secretAccessKey: 'test-secret-key',
			},
		});
	});

	test('includes the session token for temporary credentials', () => {
		process.env.AWS_REGION = 'us-east-2';
		process.env.AWS_ACCESS_KEY_ID = 'temporary-access-key';
		process.env.AWS_SECRET_ACCESS_KEY = 'temporary-secret-key';
		process.env.AWS_SESSION_TOKEN = 'temporary-session-token';

		loadClient();

		expect(mockDynamoDBClient).toHaveBeenCalledWith({
			region: 'us-east-2',
			endpoint: undefined,
			credentials: {
				accessKeyId: 'temporary-access-key',
				secretAccessKey: 'temporary-secret-key',
				sessionToken: 'temporary-session-token',
			},
		});
	});
});
