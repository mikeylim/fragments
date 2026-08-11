const request = require('supertest');

const app = require('../../src/app');
const hash = require('../../src/hash');

describe('POST /v1/fragments', () => {
	test('unauthenticated requests are denied', () =>
		request(app).post('/v1/fragments').set('Content-Type', 'text/plain').send('hello').expect(401));

	test('authenticated users can create a text/plain fragment', async () => {
		const data = 'This is a fragment';

		const res = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain')
			.send(Buffer.from(data));

		expect(res.statusCode).toBe(201);
		expect(res.headers.location).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/v1\/fragments\/.+/);

		expect(res.body.status).toBe('ok');
		expect(res.body.fragment).toEqual(
			expect.objectContaining({
				ownerId: hash('test-user1@fragments-testing.com'),
				type: 'text/plain',
				size: data.length,
			})
		);

		expect(res.body.fragment.id).toBeDefined();
		expect(Date.parse(res.body.fragment.created)).not.toBeNaN();
		expect(Date.parse(res.body.fragment.updated)).not.toBeNaN();
	});

	test.each(['text/markdown', 'text/html', 'text/csv', 'text/x-custom'])(
		'authenticated users can create a %s fragment',
		async (type) => {
			const data = Buffer.from('Assignment 2 text fragment');
			const res = await request(app)
				.post('/v1/fragments')
				.auth('test-user1@fragments-testing.com', 'test-password1')
				.set('Content-Type', type)
				.send(data);

			expect(res.statusCode).toBe(201);
			expect(res.body.fragment.type).toBe(type);
			expect(res.body.fragment.size).toBe(data.length);
		}
	);

	test.each(['application/yaml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'])(
		'authenticated users can create a %s fragment',
		async (type) => {
			const data = Buffer.from([0, 1, 2, 3]);
			const res = await request(app)
				.post('/v1/fragments')
				.auth('test-user1@fragments-testing.com', 'test-password1')
				.set('Content-Type', type)
				.send(data);

			expect(res.statusCode).toBe(201);
			expect(res.body.fragment.type).toBe(type);
			expect(res.body.fragment.size).toBe(data.length);
		}
	);

	test('authenticated users can create an application/json fragment', async () => {
		const data = JSON.stringify({ assignment: 2 });
		const res = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'application/json')
			.send(data);

		expect(res.statusCode).toBe(201);
		expect(res.body.fragment.type).toBe('application/json');
		expect(res.body.fragment.size).toBe(Buffer.byteLength(data));
	});

	test('stores the complete Content-Type including charset', async () => {
		const res = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain; charset=iso-8859-1')
			.send(Buffer.from('charset'));

		expect(res.statusCode).toBe(201);
		expect(res.body.fragment.type).toBe('text/plain; charset=iso-8859-1');
	});

	test('unsupported fragment types return 415', async () => {
		const res = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'application/pdf')
			.send(Buffer.from('not supported'));

		expect(res.statusCode).toBe(415);
		expect(res.body.status).toBe('error');
		expect(res.body.error.code).toBe(415);
	});

	test('missing Content-Type returns 415', async () => {
		const res = await request(app).post('/v1/fragments').auth('test-user1@fragments-testing.com', 'test-password1');

		expect(res.statusCode).toBe(415);
		expect(res.body.error.code).toBe(415);
	});

	test('unexpected creation errors are passed to the error handler', async () => {
		const originalApiUrl = process.env.API_URL;
		process.env.API_URL = 'not a valid URL';

		try {
			const res = await request(app)
				.post('/v1/fragments')
				.auth('test-user1@fragments-testing.com', 'test-password1')
				.set('Content-Type', 'text/plain')
				.send(Buffer.from('location failure'));

			expect(res.statusCode).toBe(500);
			expect(res.body.error.code).toBe(500);
		} finally {
			if (originalApiUrl === undefined) {
				delete process.env.API_URL;
			} else {
				process.env.API_URL = originalApiUrl;
			}
		}
	});
});
