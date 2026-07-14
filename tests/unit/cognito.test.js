describe('Cognito auth', () => {
	const originalPoolId = process.env.AWS_COGNITO_POOL_ID;
	const originalClientId = process.env.AWS_COGNITO_CLIENT_ID;
	let authorize;
	let BearerStrategy;
	let logger;
	let verifier;
	let CognitoJwtVerifier;

	beforeEach(() => {
		jest.resetModules();
		process.env.AWS_COGNITO_POOL_ID = 'test-pool';
		process.env.AWS_COGNITO_CLIENT_ID = 'test-client';

		authorize = jest.fn((name) => ({ strategyName: name }));
		BearerStrategy = jest.fn(function (verify) {
			this.verify = verify;
		});
		logger = {
			debug: jest.fn(),
			error: jest.fn(),
			info: jest.fn(),
		};
		verifier = {
			hydrate: jest.fn().mockResolvedValue(),
			verify: jest.fn(),
		};
		CognitoJwtVerifier = {
			create: jest.fn(() => verifier),
		};

		jest.doMock('passport-http-bearer', () => ({ Strategy: BearerStrategy }));
		jest.doMock('aws-jwt-verify', () => ({ CognitoJwtVerifier }));
		jest.doMock('../../src/auth/auth-middleware', () => authorize);
		jest.doMock('../../src/logger', () => logger);
	});

	afterEach(() => {
		jest.resetModules();
		jest.dontMock('passport-http-bearer');
		jest.dontMock('aws-jwt-verify');
		jest.dontMock('../../src/auth/auth-middleware');
		jest.dontMock('../../src/logger');

		if (originalPoolId === undefined) delete process.env.AWS_COGNITO_POOL_ID;
		else process.env.AWS_COGNITO_POOL_ID = originalPoolId;

		if (originalClientId === undefined) delete process.env.AWS_COGNITO_CLIENT_ID;
		else process.env.AWS_COGNITO_CLIENT_ID = originalClientId;
	});

	function loadCognito() {
		let auth;
		jest.isolateModules(() => {
			auth = require('../../src/auth/cognito');
		});
		return auth;
	}

	test('requires both Cognito environment variables', () => {
		delete process.env.AWS_COGNITO_CLIENT_ID;
		expect(() => loadCognito()).toThrow(/AWS_COGNITO_POOL_ID, AWS_COGNITO_CLIENT_ID/);
	});

	test('hydrates keys, verifies ID tokens, and delegates authorization', async () => {
		verifier.verify.mockResolvedValue({ email: 'authenticated@example.com' });
		const auth = loadCognito();
		await Promise.resolve();

		expect(CognitoJwtVerifier.create).toHaveBeenCalledWith({
			userPoolId: 'test-pool',
			clientId: 'test-client',
			tokenUse: 'id',
		});
		expect(verifier.hydrate).toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith('Cognito JWKS cached');

		const strategy = auth.strategy();
		const done = jest.fn();
		await strategy.verify('test-token', done);

		expect(verifier.verify).toHaveBeenCalledWith('test-token');
		expect(done).toHaveBeenCalledWith(null, 'authenticated@example.com');
		expect(auth.authenticate()).toEqual({ strategyName: 'bearer' });
		expect(authorize).toHaveBeenCalledWith('bearer');
	});

	test('rejects invalid tokens without logging the token', async () => {
		const error = new Error('invalid token');
		verifier.verify.mockRejectedValue(error);
		const auth = loadCognito();
		const strategy = auth.strategy();
		const done = jest.fn();

		await strategy.verify('do-not-log-this-token', done);

		expect(done).toHaveBeenCalledWith(null, false);
		expect(logger.error).toHaveBeenCalledWith({ err: error }, 'could not verify token');
		expect(JSON.stringify(logger.error.mock.calls)).not.toContain('do-not-log-this-token');
	});

	test('logs a JWKS hydration failure', async () => {
		const error = new Error('network unavailable');
		verifier.hydrate.mockRejectedValue(error);
		loadCognito();
		await Promise.resolve();
		await Promise.resolve();

		expect(logger.error).toHaveBeenCalledWith({ err: error }, 'Unable to cache Cognito JWKS');
	});
});
