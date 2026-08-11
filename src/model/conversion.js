const MarkdownIt = require('markdown-it');
const { convert: htmlToText } = require('html-to-text');
const { parse: parseCsv } = require('csv-parse/sync');
const yaml = require('js-yaml');
const sharp = require('sharp');

const markdown = new MarkdownIt();

// Extensions are deliberately explicit because the Fragments specification
// requires application/yaml and an exact source-to-extension matrix.
const extensionTypes = Object.freeze({
	txt: 'text/plain',
	md: 'text/markdown',
	html: 'text/html',
	csv: 'text/csv',
	json: 'application/json',
	yaml: 'application/yaml',
	yml: 'application/yaml',
	png: 'image/png',
	jpg: 'image/jpeg',
	webp: 'image/webp',
	gif: 'image/gif',
	avif: 'image/avif',
});

const imageExtensions = ['png', 'jpg', 'webp', 'gif', 'avif'];

const extensionsByType = Object.freeze({
	'text/plain': ['txt'],
	'text/markdown': ['md', 'html', 'txt'],
	'text/html': ['html', 'txt'],
	'text/csv': ['csv', 'txt', 'json'],
	'application/json': ['json', 'yaml', 'yml', 'txt'],
	'application/yaml': ['yaml', 'txt'],
	'image/png': imageExtensions,
	'image/jpeg': imageExtensions,
	'image/webp': imageExtensions,
	'image/gif': imageExtensions,
	'image/avif': imageExtensions,
});

/**
 * Return the MIME type represented by an Assignment 3 conversion extension.
 * @param {string} extension
 * @returns {string|undefined}
 */
function typeForExtension(extension) {
	return extensionTypes[extension?.toLowerCase()];
}

/**
 * Return whether a source MIME type supports the requested extension.
 * @param {string} mimeType
 * @param {string} extension
 * @returns {boolean}
 */
function supportsExtension(mimeType, extension) {
	return extensionsByType[mimeType]?.includes(extension?.toLowerCase()) ?? false;
}

/**
 * Return all MIME types to which a fragment may be converted.
 * Unknown text/* types remain supported, but have no additional conversions.
 * @param {string} mimeType
 * @returns {string[]}
 */
function formatsForType(mimeType) {
	const extensions = extensionsByType[mimeType];

	if (!extensions) {
		return [mimeType];
	}

	return [...new Set(extensions.map((extension) => extensionTypes[extension]))];
}

const htmlTextOptions = {
	wordwrap: false,
	selectors: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((selector) => ({
		selector,
		options: { uppercase: false },
	})),
};

/**
 * Convert fragment data to one of the extensions allowed for its source type.
 * Only the returned Buffer is converted; the stored original is never changed.
 * @param {Buffer} data
 * @param {string} mimeType source MIME type without charset parameters
 * @param {string} extension requested output extension
 * @returns {Promise<Buffer>}
 */
async function convertFragment(data, mimeType, extension) {
	if (!Buffer.isBuffer(data)) {
		throw new TypeError('fragment data must be a Buffer');
	}

	const normalizedExtension = extension?.toLowerCase();
	if (!supportsExtension(mimeType, normalizedExtension)) {
		throw new Error('unsupported fragment conversion');
	}

	const targetType = typeForExtension(normalizedExtension);
	if (targetType === mimeType) {
		return data;
	}

	const source = data.toString('utf8');

	if (mimeType === 'text/markdown') {
		const html = markdown.render(source);
		return Buffer.from(targetType === 'text/html' ? html : htmlToText(html, htmlTextOptions), 'utf8');
	}

	if (mimeType === 'text/html' && targetType === 'text/plain') {
		return Buffer.from(htmlToText(source, htmlTextOptions), 'utf8');
	}

	if (mimeType === 'text/csv' && targetType === 'application/json') {
		const records = parseCsv(source, {
			bom: true,
			columns: true,
			skip_empty_lines: true,
			trim: true,
		});
		return Buffer.from(JSON.stringify(records), 'utf8');
	}

	if (mimeType === 'application/json' && targetType === 'application/yaml') {
		return Buffer.from(yaml.dump(JSON.parse(source)), 'utf8');
	}

	// CSV, JSON, and YAML are already readable text, so their .txt conversion
	// preserves the original bytes and changes only the response Content-Type.
	if (targetType === 'text/plain') {
		return data;
	}

	if (mimeType.startsWith('image/')) {
		const image = sharp(data);

		switch (normalizedExtension) {
			case 'png':
				return image.png().toBuffer();
			case 'jpg':
				return image.jpeg().toBuffer();
			case 'webp':
				return image.webp().toBuffer();
			case 'gif':
				return image.gif().toBuffer();
			case 'avif':
				return image.avif().toBuffer();
		}
	}

	throw new Error('unsupported fragment conversion');
}

module.exports = {
	convertFragment,
	formatsForType,
	supportsExtension,
	typeForExtension,
};
