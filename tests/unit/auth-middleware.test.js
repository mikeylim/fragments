const hash = require('../../src/hash');

describe('auth middleware', () => {
	let authenticate;
	let authResult;

	beforeEach(() => {
		jest.resetModules();
		authResult = [null, false];

		jest.doMock('passport', () => ({
			authenticate: jest.fn((_strategy, _options, callback) => (req, res, next) => {
				callback(...authResult);
				void req;
				void res;
				void next;
			}),
		}));

		jest.isolateModules(() => {
			authenticate = require('../../src/auth/auth-middleware');
		});
	});

	afterEach(() => {
		jest.resetModules();
		jest.dontMock('passport');
	});

	function response() {
		const res = { json: jest.fn() };
		res.status = jest.fn(() => res);
		return res;
	}

	test('passes authentication errors to Express as status 500 errors', () => {
		const error = new Error('authentication failed');
		authResult = [error];
		const next = jest.fn();

		authenticate('http')({}, response(), next);

		expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Unable to authenticate user', status: 500 }));
	});

	test('returns 401 when no authenticated email is available', () => {
		const res = response();

		authenticate('http')({}, res, jest.fn());

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			status: 'error',
			error: { code: 401, message: 'Unauthorized' },
		});
	});

	test('hashes an authenticated email before continuing', () => {
		authResult = [null, 'user@example.com'];
		const req = {};
		const next = jest.fn();

		authenticate('http')(req, response(), next);

		expect(req.user).toBe(hash('user@example.com'));
		expect(next).toHaveBeenCalledWith();
	});
});
