const request = require('supertest');
const sharp = require('sharp');
const yaml = require('js-yaml');

const app = require('../../src/app');

// Keep binary responses as a Buffer so image and application/yaml data can be
// inspected without Superagent trying to decode them as JSON or plain text.
const bufferParser = (res, callback) => {
	const chunks = [];
	res.on('data', (chunk) => chunks.push(chunk));
	res.on('end', () => callback(null, Buffer.concat(chunks)));
};

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

	test('matching extension retains the complete stored Content-Type', async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/plain; charset=iso-8859-1')
			.send(Buffer.from('charset'));

		const getRes = await request(app)
			.get(`/v1/fragments/${postRes.body.fragment.id}.txt`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.headers['content-type']).toBe('text/plain; charset=iso-8859-1');
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

	test('converts Markdown and HTML fragments to plain text', async () => {
		const cases = [
			['text/markdown', '# Assignment 3\n\nThis is **important**.'],
			['text/html', '<h1>Assignment 3</h1><p>This is <strong>important</strong>.</p>'],
		];

		for (const [type, data] of cases) {
			const postRes = await request(app)
				.post('/v1/fragments')
				.auth('test-user1@fragments-testing.com', 'test-password1')
				.set('Content-Type', type)
				.send(Buffer.from(data));

			const getRes = await request(app)
				.get(`/v1/fragments/${postRes.body.fragment.id}.txt`)
				.auth('test-user1@fragments-testing.com', 'test-password1');

			expect(getRes.statusCode).toBe(200);
			expect(getRes.headers['content-type']).toBe('text/plain');
			expect(getRes.text).toBe('Assignment 3\n\nThis is important.');
		}
	});

	test('converts a CSV fragment to JSON records', async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'text/csv')
			.send(Buffer.from('name,score\nMike,100\nAda,99\n'));

		const getRes = await request(app)
			.get(`/v1/fragments/${postRes.body.fragment.id}.json`)
			.auth('test-user1@fragments-testing.com', 'test-password1');

		expect(getRes.statusCode).toBe(200);
		expect(getRes.headers['content-type']).toBe('application/json');
		expect(getRes.body).toEqual([
			{ name: 'Mike', score: '100' },
			{ name: 'Ada', score: '99' },
		]);
	});

	test.each(['yaml', 'yml'])('converts JSON to .%s YAML without changing stored JSON', async (extension) => {
		const data = JSON.stringify({ course: 'CCP555', assignment: 3 });
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'application/json')
			.send(data);

		const id = postRes.body.fragment.id;
		const yamlRes = await request(app)
			.get(`/v1/fragments/${id}.${extension}`)
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.buffer(true)
			.parse(bufferParser);

		expect(yamlRes.statusCode).toBe(200);
		expect(yamlRes.headers['content-type']).toBe('application/yaml');
		expect(yaml.load(yamlRes.body.toString())).toEqual({ course: 'CCP555', assignment: 3 });

		const originalRes = await request(app)
			.get(`/v1/fragments/${id}`)
			.auth('test-user1@fragments-testing.com', 'test-password1');
		expect(originalRes.body).toEqual({ course: 'CCP555', assignment: 3 });
	});

	test('serves YAML as .yaml and .txt but rejects the unspecified .yml extension', async () => {
		const data = 'course: CCP555\nassignment: 3\n';
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'application/yaml')
			.send(Buffer.from(data));

		for (const [extension, expectedType] of [
			['yaml', 'application/yaml'],
			['txt', 'text/plain'],
		]) {
			const getRes = await request(app)
				.get(`/v1/fragments/${postRes.body.fragment.id}.${extension}`)
				.auth('test-user1@fragments-testing.com', 'test-password1')
				.buffer(true)
				.parse(bufferParser);

			expect(getRes.statusCode).toBe(200);
			expect(getRes.headers['content-type']).toBe(expectedType);
			expect(getRes.body.toString()).toBe(data);
		}

		await request(app)
			.get(`/v1/fragments/${postRes.body.fragment.id}.yml`)
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.expect(415);
	});

	test('converts an image to every specified image extension without changing the original', async () => {
		const image = await sharp({
			create: {
				width: 2,
				height: 2,
				channels: 3,
				background: { r: 255, g: 0, b: 0 },
			},
		})
			.png()
			.toBuffer();
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'image/png')
			.send(image);
		const id = postRes.body.fragment.id;
		const outputs = {
			png: ['image/png', 'png'],
			jpg: ['image/jpeg', 'jpeg'],
			webp: ['image/webp', 'webp'],
			gif: ['image/gif', 'gif'],
			avif: ['image/avif', 'heif'],
		};

		for (const [extension, [expectedType, expectedFormat]] of Object.entries(outputs)) {
			const getRes = await request(app)
				.get(`/v1/fragments/${id}.${extension}`)
				.auth('test-user1@fragments-testing.com', 'test-password1')
				.buffer(true)
				.parse(bufferParser);

			expect(getRes.statusCode).toBe(200);
			expect(getRes.headers['content-type']).toBe(expectedType);
			expect((await sharp(getRes.body).metadata()).format).toBe(expectedFormat);
		}

		const originalRes = await request(app)
			.get(`/v1/fragments/${id}`)
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.buffer(true)
			.parse(bufferParser);
		expect(originalRes.body).toEqual(image);
	});

	test('returns 415 when source bytes cannot be converted as the declared image type', async () => {
		const postRes = await request(app)
			.post('/v1/fragments')
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.set('Content-Type', 'image/png')
			.send(Buffer.from('not an image'));

		await request(app)
			.get(`/v1/fragments/${postRes.body.fragment.id}.jpg`)
			.auth('test-user1@fragments-testing.com', 'test-password1')
			.expect(415);
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

		await request(app)
			.get(`/v1/fragments/${id}.jpeg`)
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
