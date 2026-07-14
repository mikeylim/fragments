describe('auth strategy selection', () => {
	const originalEnv = {
		AWS_COGNITO_POOL_ID: process.env.AWS_COGNITO_POOL_ID,
		AWS_COGNITO_CLIENT_ID: process.env.AWS_COGNITO_CLIENT_ID,
		HTPASSWD_FILE: process.env.HTPASSWD_FILE,
		NODE_ENV: process.env.NODE_ENV,
	};

	beforeEach(() => {
		jest.resetModules();
		delete process.env.AWS_COGNITO_POOL_ID;
		delete process.env.AWS_COGNITO_CLIENT_ID;
		delete process.env.HTPASSWD_FILE;
		process.env.NODE_ENV = 'test';
	});

	afterEach(() => {
		jest.resetModules();
		jest.dontMock('../../src/auth/cognito');
		jest.dontMock('../../src/auth/basic-auth');

		for (const [key, value] of Object.entries(originalEnv)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	});

	function loadAuth() {
		let auth;
		jest.isolateModules(() => {
			auth = require('../../src/auth');
		});
		return auth;
	}

	test('rejects simultaneous Cognito and Basic Auth configuration', () => {
		process.env.AWS_COGNITO_POOL_ID = 'pool';
		process.env.AWS_COGNITO_CLIENT_ID = 'client';
		process.env.HTPASSWD_FILE = 'tests/.htpasswd';

		expect(() => loadAuth()).toThrow(/both AWS Cognito and HTTP Basic Auth/);
	});

	test('selects Cognito when its environment is configured', () => {
		const cognito = { name: 'cognito' };
		process.env.AWS_COGNITO_POOL_ID = 'pool';
		process.env.AWS_COGNITO_CLIENT_ID = 'client';
		jest.doMock('../../src/auth/cognito', () => cognito);

		expect(loadAuth()).toBe(cognito);
	});

	test('selects Basic Auth outside production', () => {
		const basic = { name: 'basic' };
		process.env.HTPASSWD_FILE = 'tests/.htpasswd';
		jest.doMock('../../src/auth/basic-auth', () => basic);

		expect(loadAuth()).toBe(basic);
	});

	test('rejects Basic Auth in production', () => {
		process.env.HTPASSWD_FILE = 'tests/.htpasswd';
		process.env.NODE_ENV = 'production';

		expect(() => loadAuth()).toThrow(/no authorization configuration/);
	});

	test('rejects missing authorization configuration', () => {
		expect(() => loadAuth()).toThrow(/no authorization configuration/);
	});

	test('Basic Auth module requires HTPASSWD_FILE', () => {
		expect(() => require('../../src/auth/basic-auth')).toThrow(/HTPASSWD_FILE/);
	});
});
