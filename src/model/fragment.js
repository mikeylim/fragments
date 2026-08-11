// Use crypto.randomUUID() to create unique IDs, see:
// https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
const { randomUUID } = require('crypto');

// Use https://www.npmjs.com/package/content-type to create/parse Content-Type headers
const contentType = require('content-type');
const { formatsForType } = require('./conversion');

// Functions for working with fragment metadata/data using our DB
const {
	readFragment,
	writeFragment,
	readFragmentData,
	writeFragmentData,
	listFragments,
	deleteFragment,
} = require('./data');

class Fragment {
	constructor({ id, ownerId, created, updated, type, size = 0 }) {
		if (!ownerId || typeof ownerId !== 'string') {
			throw new Error('ownerId is required');
		}

		if (!type || typeof type !== 'string') {
			throw new Error('type is required');
		}

		if (!Fragment.isSupportedType(type)) {
			throw new Error(`unsupported fragment type: ${type}`);
		}

		if (typeof size !== 'number' || size < 0) {
			throw new Error('size must be a non-negative number');
		}

		const now = new Date().toISOString();

		this.id = id || randomUUID();
		this.ownerId = ownerId;
		this.created = created || now;
		this.updated = updated || now;
		this.type = type;
		this.size = size;
	}

	/**
	 * Get all fragments (id or full) for the given user
	 * @param {string} ownerId user's hashed email
	 * @param {boolean} expand whether to expand ids to full fragments
	 * @returns Promise<Array<string|Fragment>>
	 */
	static async byUser(ownerId, expand = false) {
		const fragments = await listFragments(ownerId, expand);

		if (!expand) {
			return fragments;
		}

		// The memory layer stores metadata as JSON strings, so rebuild Fragment objects.
		return fragments.map((fragment) => new Fragment(typeof fragment === 'string' ? JSON.parse(fragment) : fragment));
	}

	/**
	 * Gets a fragment for the user by the given id.
	 * @param {string} ownerId user's hashed email
	 * @param {string} id fragment's id
	 * @returns Promise<Fragment>
	 */
	static async byId(ownerId, id) {
		const fragment = await readFragment(ownerId, id);

		if (!fragment) {
			throw new Error(`fragment not found: ${id}`);
		}

		// Re-create a full Fragment instance after loading plain metadata from the db.
		return new Fragment(fragment);
	}

	/**
	 * Delete the user's fragment data and metadata for the given id
	 * @param {string} ownerId user's hashed email
	 * @param {string} id fragment's id
	 * @returns Promise<void>
	 */
	static delete(ownerId, id) {
		return deleteFragment(ownerId, id);
	}

	/**
	 * Saves the current fragment metadata to the database
	 * @returns Promise<void>
	 */
	save() {
		this.updated = new Date().toISOString();
		return writeFragment(this);
	}

	/**
	 * Gets the fragment's data from the database
	 * @returns Promise<Buffer>
	 */
	getData() {
		return readFragmentData(this.ownerId, this.id);
	}

	/**
	 * Sets the fragment's data in the database
	 * @param {Buffer} data
	 * @returns Promise<void>
	 */
	async setData(data) {
		if (!Buffer.isBuffer(data)) {
			throw new Error('data must be a Buffer');
		}

		// Keep metadata in sync with the binary data.
		this.size = data.length;
		this.updated = new Date().toISOString();

		await writeFragmentData(this.ownerId, this.id, data);
		await writeFragment(this);
	}

	/**
	 * Returns the mime type without encoding:
	 * "text/plain; charset=utf-8" -> "text/plain"
	 * @returns {string}
	 */
	get mimeType() {
		const { type } = contentType.parse(this.type);
		return type;
	}

	/**
	 * Returns true if this fragment is a text/* mime type
	 * @returns {boolean}
	 */
	get isText() {
		return this.mimeType.startsWith('text/');
	}

	/**
	 * Returns the MIME types that this fragment can be returned as.
	 * @returns {string[]}
	 */
	get formats() {
		return formatsForType(this.mimeType);
	}

	/**
	 * Returns true if the given Content-Type is supported.
	 *
	 * @param {string} value a Content-Type value
	 * @returns {boolean}
	 */
	static isSupportedType(value) {
		try {
			const { type } = contentType.parse(value);

			return (
				type.startsWith('text/') ||
				[
					'application/json',
					'application/yaml',
					'image/png',
					'image/jpeg',
					'image/webp',
					'image/gif',
					'image/avif',
				].includes(type)
			);
		} catch {
			return false;
		}
	}
}

module.exports.Fragment = Fragment;
