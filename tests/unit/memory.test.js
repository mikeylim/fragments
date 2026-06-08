const { readFragment, writeFragment, readFragmentData, writeFragmentData } = require('../../src/model/data/memory');

describe('memory data model', () => {
	test('writeFragment() and readFragment() store and load metadata', async () => {
		const fragment = {
			id: 'fragment-1',
			ownerId: 'user-1',
			type: 'text/plain',
			size: 5,
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		};

		await writeFragment(fragment);
		const result = await readFragment(fragment.ownerId, fragment.id);

		expect(result).toEqual(fragment);
	});

	test('readFragment() returns undefined for missing metadata', async () => {
		const result = await readFragment('missing-user', 'missing-id');
		expect(result).toBe(undefined);
	});

	test('writeFragmentData() and readFragmentData() store and load Buffer data', async () => {
		const data = Buffer.from('hello');

		await writeFragmentData('user-1', 'fragment-1', data);
		const result = await readFragmentData('user-1', 'fragment-1');

		expect(result).toEqual(data);
	});

	test('readFragmentData() returns undefined for missing data', async () => {
		const result = await readFragmentData('missing-user', 'missing-id');
		expect(result).toBe(undefined);
	});
});
