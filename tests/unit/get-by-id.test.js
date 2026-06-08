const request = require('supertest');

const app = require('../../src/app');

describe('GET /v1/fragments/:id', () => {
	test('unauthenticated requests are denied', () => request(app).get('/v1/fragments/123').expect(401));

	test('returns 404 for missing fragment', async () => {
		const res = await request(app)
			.get('/v1/fragments/does-not-exist')
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(res.statusCode).toBe(404);
		expect(res.body.status).toBe('error');
		expect(res.body.error.code).toBe(404);
	});

	test('authenticated user can get their text fragment data', async () => {
		const data = 'hello from assignment 1';

		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain')
			.send(data);

		const id = postRes.body.fragment.id;

		const getRes = await request(app)
			.get(`/v1/fragments/${id}`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.headers['content-type']).toMatch(/^text\/plain/);
		expect(getRes.text).toBe(data);
	});

	test('authenticated user can get their text fragment data with .txt extension', async () => {
		const data = 'hello txt extension';

		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain')
			.send(data);

		const id = postRes.body.fragment.id;

		const getRes = await request(app)
			.get(`/v1/fragments/${id}.txt`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.text).toBe(data);
	});
});
