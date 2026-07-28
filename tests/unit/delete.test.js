const request = require('supertest');

const app = require('../../src/app');

describe('DELETE /v1/fragments/:id', () => {
	test('unauthenticated requests are denied', () => request(app).delete('/v1/fragments/does-not-exist').expect(401));

	test('returns 404 for a missing fragment', async () => {
		const res = await request(app)
			.delete('/v1/fragments/does-not-exist')
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(res.statusCode).toBe(404);
		expect(res.body.status).toBe('error');
		expect(res.body.error.code).toBe(404);
	});

	test('an authenticated user can delete their fragment', async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain')
			.send(Buffer.from('delete me'));

		expect(postRes.statusCode).toBe(201);
		const { id } = postRes.body.fragment;

		const deleteRes = await request(app)
			.delete(`/v1/fragments/${id}`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(deleteRes.statusCode).toBe(200);
		expect(deleteRes.body).toEqual({ status: 'ok' });

		await request(app)
			.get(`/v1/fragments/${id}`)
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.expect(404);
	});

	test("a user cannot delete another user's fragment", async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain')
			.send(Buffer.from('private fragment'));

		const { id } = postRes.body.fragment;

		await request(app).delete(`/v1/fragments/${id}`).auth('test-user2@fragments-testing', 'test-password2').expect(404);

		await request(app)
			.get(`/v1/fragments/${id}`)
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.expect(200);
	});
});
