const request = require('supertest');

const app = require('../../src/app');
const hash = require('../../src/hash');
const { Fragment } = require('../../src/model/fragment');

const user1 = 'test-user1@fragments-testing.com';
const password1 = 'test-password1';
const user2 = 'test-user2@fragments-testing';
const password2 = 'test-password2';

const wait = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));

async function createFragment(data = 'original data', type = 'text/plain') {
	return request(app).post('/v1/fragments').auth(user1, password1).set('Content-Type', type).send(Buffer.from(data));
}

describe('PUT /v1/fragments/:id', () => {
	test('unauthenticated requests are denied', () =>
		request(app).put('/v1/fragments/does-not-exist').set('Content-Type', 'text/plain').send('updated').expect(401));

	test('returns 404 for a missing fragment', async () => {
		const res = await request(app)
			.put('/v1/fragments/does-not-exist')
			.auth(user1, password1)
			.set('Content-Type', 'text/plain')
			.send(Buffer.from('updated'));

		expect(res.statusCode).toBe(404);
		expect(res.body).toEqual({
			status: 'error',
			error: { code: 404, message: 'fragment not found' },
		});
	});

	test("a user cannot update another user's fragment", async () => {
		const createRes = await createFragment();

		await request(app)
			.put(`/v1/fragments/${createRes.body.fragment.id}`)
			.auth(user2, password2)
			.set('Content-Type', 'text/plain')
			.send(Buffer.from('not allowed'))
			.expect(404);
	});

	test('replaces the data and returns updated metadata', async () => {
		const createRes = await createFragment('short');
		const original = createRes.body.fragment;
		const data = Buffer.from('updated fragment data');
		await wait();

		const putRes = await request(app)
			.put(`/v1/fragments/${original.id}`)
			.auth(user1, password1)
			.set('Content-Type', 'text/plain; charset=utf-8')
			.send(data);

		expect(putRes.statusCode).toBe(200);
		expect(putRes.body.status).toBe('ok');
		expect(putRes.body.fragment).toEqual(
			expect.objectContaining({
				id: original.id,
				ownerId: hash(user1),
				created: original.created,
				type: original.type,
				size: data.length,
			})
		);
		expect(Date.parse(putRes.body.fragment.updated)).toBeGreaterThan(Date.parse(original.updated));

		const getRes = await request(app).get(`/v1/fragments/${original.id}`).auth(user1, password1);
		expect(getRes.statusCode).toBe(200);
		expect(getRes.text).toBe(data.toString());
	});

	test('replaces binary image data without changing its type', async () => {
		const originalData = Buffer.from([0, 1, 2]);
		const createRes = await request(app)
			.post('/v1/fragments')
			.auth(user1, password1)
			.set('Content-Type', 'image/png')
			.send(originalData);
		const data = Buffer.from([3, 4, 5, 6]);

		const putRes = await request(app)
			.put(`/v1/fragments/${createRes.body.fragment.id}`)
			.auth(user1, password1)
			.set('Content-Type', 'image/png')
			.send(data);

		expect(putRes.statusCode).toBe(200);
		expect(putRes.body.fragment.type).toBe('image/png');
		expect(putRes.body.fragment.size).toBe(data.length);

		const fragment = await Fragment.byId(hash(user1), createRes.body.fragment.id);
		expect(await fragment.getData()).toEqual(data);
	});

	test('allows a fragment to be replaced with empty data', async () => {
		const createRes = await createFragment();

		const putRes = await request(app)
			.put(`/v1/fragments/${createRes.body.fragment.id}`)
			.auth(user1, password1)
			.set('Content-Type', 'text/plain')
			.send(Buffer.alloc(0));

		expect(putRes.statusCode).toBe(200);
		expect(putRes.body.fragment.size).toBe(0);
	});

	test('rejects a different Content-Type', async () => {
		const createRes = await createFragment();

		const putRes = await request(app)
			.put(`/v1/fragments/${createRes.body.fragment.id}`)
			.auth(user1, password1)
			.set('Content-Type', 'application/json')
			.send(JSON.stringify({ changed: true }));

		expect(putRes.statusCode).toBe(400);
		expect(putRes.body.error).toEqual({ code: 400, message: 'fragment Content-Type cannot be changed' });
	});

	test.each([undefined, 'application/pdf', 'not-a-content-type'])(
		'rejects a missing or unsupported Content-Type (%s)',
		async (type) => {
			const createRes = await createFragment();
			let putRequest = request(app).put(`/v1/fragments/${createRes.body.fragment.id}`).auth(user1, password1);

			if (type) {
				putRequest = putRequest.set('Content-Type', type).send(Buffer.from('unsupported'));
			}

			const putRes = await putRequest;
			expect(putRes.statusCode).toBe(400);
			expect(putRes.body.error.code).toBe(400);
		}
	);

	test('passes unexpected lookup errors to the error handler', async () => {
		const lookup = jest.spyOn(Fragment, 'byId').mockRejectedValueOnce(new Error('database unavailable'));

		try {
			const res = await request(app)
				.put('/v1/fragments/lookup-error')
				.auth(user1, password1)
				.set('Content-Type', 'text/plain')
				.send(Buffer.from('updated'));

			expect(res.statusCode).toBe(500);
			expect(res.body.error).toEqual({ code: 500, message: 'database unavailable' });
		} finally {
			lookup.mockRestore();
		}
	});

	test('passes unexpected write errors to the error handler', async () => {
		const createRes = await createFragment();
		const write = jest.spyOn(Fragment.prototype, 'setData').mockRejectedValueOnce(new Error('storage unavailable'));

		try {
			const res = await request(app)
				.put(`/v1/fragments/${createRes.body.fragment.id}`)
				.auth(user1, password1)
				.set('Content-Type', 'text/plain')
				.send(Buffer.from('updated'));

			expect(res.statusCode).toBe(500);
			expect(res.body.error).toEqual({ code: 500, message: 'storage unavailable' });
		} finally {
			write.mockRestore();
		}
	});
});
