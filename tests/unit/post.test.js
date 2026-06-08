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
		expect(res.headers.location).toMatch(/\/v1\/fragments\/.+/);

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

	test('unsupported fragment types return 415', async () => {
		const res = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'application/json')
			.send(JSON.stringify({ hello: 'world' }));

		expect(res.statusCode).toBe(415);
		expect(res.body.status).toBe('error');
		expect(res.body.error.code).toBe(415);
	});
});
