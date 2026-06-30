const request = require('supertest');

const app = require('../../src/app');

describe('GET /v1/fragments/:id/info', () => {
	test('unauthenticated requests are denied', () => request(app).get('/v1/fragments/123/info').expect(401));

	test('returns 404 for missing fragment metadata', async () => {
		const res = await request(app)
			.get('/v1/fragments/does-not-exist/info')
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(res.statusCode).toBe(404);
		expect(res.body.status).toBe('error');
		expect(res.body.error.code).toBe(404);
	});

	test('authenticated user can get fragment metadata by id', async () => {
		const data = 'metadata test fragment';

		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain')
			.send(Buffer.from(data));

		const id = postRes.body.fragment.id;

		const getRes = await request(app)
			.get(`/v1/fragments/${id}/info`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.body.status).toBe('ok');
		expect(getRes.body.fragment).toEqual(
			expect.objectContaining({
				id,
				type: 'text/plain',
				size: data.length,
			})
		);
	});
});
