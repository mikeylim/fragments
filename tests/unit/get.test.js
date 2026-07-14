const request = require('supertest');

const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

describe('GET /v1/fragments', () => {
	test('unauthenticated requests are denied', () => request(app).get('/v1/fragments').expect(401));

	test('authenticated user with no fragments gets empty array', async () => {
		const res = await request(app).get('/v1/fragments').auth('test-user1@fragments-testing.com', 'test-password1');

		expect(res.statusCode).toBe(200);
		expect(res.body.status).toBe('ok');
		expect(res.body.fragments).toEqual([]);
	});

	test('authenticated user gets their fragment ids', async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain')
			.send(Buffer.from('hello'));

		const id = postRes.body.fragment.id;

		const getRes = await request(app).get('/v1/fragments').auth('test-user1@fragments-testing.com', 'test-password1');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.body.fragments).toContain(id);
	});

	test('authenticated user can get expanded fragment metadata', async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user2@fragments-testing', 'test-password2')
			.set('Content-Type', 'text/plain')
			.send(Buffer.from('expanded fragment'));

		const getRes = await request(app)
			.get('/v1/fragments?expand=1')
			.auth('test-user2@fragments-testing', 'test-password2');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.body.status).toBe('ok');
		expect(getRes.body.fragments).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: postRes.body.fragment.id,
					type: 'text/plain',
					size: 'expanded fragment'.length,
				}),
			])
		);
	});

	test('unexpected data errors are passed to the error handler', async () => {
		const error = new Error('database unavailable');
		const byUser = jest.spyOn(Fragment, 'byUser').mockRejectedValueOnce(error);

		const res = await request(app).get('/v1/fragments').auth('test-user1@fragments-testing.com', 'test-password1');

		expect(res.statusCode).toBe(500);
		expect(res.body.error).toEqual({ code: 500, message: 'database unavailable' });
		byUser.mockRestore();
	});
});
