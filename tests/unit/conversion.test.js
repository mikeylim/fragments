const sharp = require('sharp');
const yaml = require('js-yaml');

const { convertFragment, formatsForType, supportsExtension, typeForExtension } = require('../../src/model/conversion');

describe('fragment conversions', () => {
	describe('conversion metadata', () => {
		test.each([
			['txt', 'text/plain'],
			['md', 'text/markdown'],
			['html', 'text/html'],
			['csv', 'text/csv'],
			['json', 'application/json'],
			['yaml', 'application/yaml'],
			['yml', 'application/yaml'],
			['png', 'image/png'],
			['jpg', 'image/jpeg'],
			['webp', 'image/webp'],
			['gif', 'image/gif'],
			['avif', 'image/avif'],
		])('%s maps to %s', (extension, type) => {
			expect(typeForExtension(extension)).toBe(type);
			expect(typeForExtension(extension.toUpperCase())).toBe(type);
		});

		test('unknown extensions have no MIME type', () => {
			expect(typeForExtension('jpeg')).toBeUndefined();
			expect(typeForExtension('unknown')).toBeUndefined();
			expect(typeForExtension()).toBeUndefined();
		});

		test('source types only allow their specified extensions', () => {
			expect(supportsExtension('application/json', 'yml')).toBe(true);
			expect(supportsExtension('application/yaml', 'yaml')).toBe(true);
			expect(supportsExtension('application/yaml', 'yml')).toBe(false);
			expect(supportsExtension('image/png', 'jpg')).toBe(true);
			expect(supportsExtension('image/png', 'jpeg')).toBe(false);
			expect(supportsExtension('text/plain')).toBe(false);
			expect(supportsExtension('text/x-custom', 'txt')).toBe(false);
		});

		test('unknown text types retain their original MIME type only', () => {
			expect(formatsForType('text/x-custom')).toEqual(['text/x-custom']);
		});
	});

	describe('text conversions', () => {
		test('returns original bytes for a matching extension', async () => {
			const data = Buffer.from('plain text');
			expect(await convertFragment(data, 'text/plain', 'txt')).toBe(data);
		});

		test('converts Markdown to HTML and plain text', async () => {
			const data = Buffer.from('# Assignment 3\n\nThis is **important**.');

			expect((await convertFragment(data, 'text/markdown', 'html')).toString()).toBe(
				'<h1>Assignment 3</h1>\n<p>This is <strong>important</strong>.</p>\n'
			);
			expect((await convertFragment(data, 'text/markdown', 'txt')).toString()).toBe(
				'Assignment 3\n\nThis is important.'
			);
		});

		test('converts HTML to plain text', async () => {
			const data = Buffer.from('<h1>Assignment 3</h1><p>This is <strong>important</strong>.</p>');
			expect((await convertFragment(data, 'text/html', 'txt')).toString()).toBe('Assignment 3\n\nThis is important.');
		});

		test('converts CSV with a header row to JSON records', async () => {
			const data = Buffer.from('name,score\nMike,100\nAda,99\n');
			const converted = await convertFragment(data, 'text/csv', 'json');

			expect(JSON.parse(converted.toString())).toEqual([
				{ name: 'Mike', score: '100' },
				{ name: 'Ada', score: '99' },
			]);
		});

		test.each(['text/csv', 'application/json', 'application/yaml'])(
			'preserves readable %s bytes when converting to plain text',
			async (type) => {
				const data = Buffer.from('readable source');
				expect(await convertFragment(data, type, 'txt')).toBe(data);
			}
		);

		test.each(['yaml', 'yml'])('converts JSON to .%s YAML', async (extension) => {
			const data = Buffer.from(JSON.stringify({ course: 'CCP555', assignment: 3 }));
			const converted = await convertFragment(data, 'application/json', extension);

			expect(yaml.load(converted.toString())).toEqual({ course: 'CCP555', assignment: 3 });
		});

		test('rejects data that is not a Buffer', async () => {
			await expect(convertFragment('text', 'text/plain', 'txt')).rejects.toThrow('fragment data must be a Buffer');
		});

		test('rejects unsupported conversions', async () => {
			await expect(convertFragment(Buffer.from('text'), 'text/plain', 'html')).rejects.toThrow(
				'unsupported fragment conversion'
			);
		});
	});

	describe('image conversions', () => {
		const sourceTypes = [
			['image/png', 'png'],
			['image/jpeg', 'jpg'],
			['image/webp', 'webp'],
			['image/gif', 'gif'],
			['image/avif', 'avif'],
		];
		const outputFormats = {
			png: 'png',
			jpg: 'jpeg',
			webp: 'webp',
			gif: 'gif',
			avif: 'heif',
		};
		let png;
		const images = {};

		beforeAll(async () => {
			png = await sharp({
				create: {
					width: 2,
					height: 2,
					channels: 3,
					background: { r: 255, g: 0, b: 0 },
				},
			})
				.png()
				.toBuffer();

			images.png = png;
			images.jpg = await sharp(png).jpeg().toBuffer();
			images.webp = await sharp(png).webp().toBuffer();
			images.gif = await sharp(png).gif().toBuffer();
			images.avif = await sharp(png).avif().toBuffer();
		});

		test.each(sourceTypes)('%s converts to every supported image format', async (type, sourceExtension) => {
			for (const [extension, expectedFormat] of Object.entries(outputFormats)) {
				const converted = await convertFragment(images[sourceExtension], type, extension);
				const metadata = await sharp(converted).metadata();

				expect(metadata.format).toBe(expectedFormat);
				expect(metadata.width).toBe(2);
				expect(metadata.height).toBe(2);
			}
		});

		test('invalid image data cannot be converted', async () => {
			await expect(convertFragment(Buffer.from('not an image'), 'image/png', 'jpg')).rejects.toThrow();
		});
	});
});
