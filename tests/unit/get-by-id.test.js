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
			.send(Buffer.from(data));

		const id = postRes.body.fragment.id;

		const getRes = await request(app)
			.get(`/v1/fragments/${id}.txt`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.text).toBe(data);
	});

	test('authenticated user can get original JSON fragment data', async () => {
		const data = { assignment: 2, type: 'json' };
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'application/json')
			.send(JSON.stringify(data));

		const getRes = await request(app)
			.get(`/v1/fragments/${postRes.body.fragment.id}`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.headers['content-type']).toMatch(/^application\/json/);
		expect(getRes.body).toEqual(data);
	});

	test('authenticated user can get a JSON fragment with .json extension', async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'application/json')
			.send(JSON.stringify({ extension: true }));

		const getRes = await request(app)
			.get(`/v1/fragments/${postRes.body.fragment.id}.json`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.body).toEqual({ extension: true });
	});

	test('converts a Markdown fragment to HTML without changing stored data', async () => {
		const markdown = '# Assignment 2';
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/markdown')
			.send(Buffer.from(markdown));

		const id = postRes.body.fragment.id;
		const htmlRes = await request(app)
			.get(`/v1/fragments/${id}.html`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(htmlRes.statusCode).toBe(200);
		expect(htmlRes.headers['content-type']).toMatch(/^text\/html/);
		expect(htmlRes.text).toBe('<h1>Assignment 2</h1>\n');

		const originalRes = await request(app)
			.get(`/v1/fragments/${id}`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(originalRes.headers['content-type']).toMatch(/^text\/markdown/);
		expect(originalRes.text).toBe(markdown);
	});

	test('unsupported extensions and conversions return 415', async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain')
			.send(Buffer.from('plain text'));

		const id = postRes.body.fragment.id;
		await request(app)
			.get(`/v1/fragments/${id}.unknown`)
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.expect(415);

		await request(app)
			.get(`/v1/fragments/${id}.html`)
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.expect(415);
	});

	test("an authenticated user cannot get another user's fragment", async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain')
			.send(Buffer.from('private'));

		await request(app)
			.get(`/v1/fragments/${postRes.body.fragment.id}`)
			.auth('test-user2@fragments-testing', 'test-password2')
			.expect(404);
	});
});
