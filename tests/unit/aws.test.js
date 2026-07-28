const { Readable } = require('stream');

const mockS3Send = jest.fn();

jest.mock('../../src/model/data/aws/s3Client', () => ({
	send: mockS3Send,
}));

const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const {
	listFragments,
	writeFragment,
	readFragment,
	writeFragmentData,
	readFragmentData,
	deleteFragment,
} = require('../../src/model/data/aws');

describe('AWS data model', () => {
	const originalBucketName = process.env.AWS_S3_BUCKET_NAME;

	beforeEach(() => {
		process.env.AWS_S3_BUCKET_NAME = 'fragments';
		mockS3Send.mockReset();
	});

	afterAll(() => {
		if (originalBucketName === undefined) {
			delete process.env.AWS_S3_BUCKET_NAME;
		} else {
			process.env.AWS_S3_BUCKET_NAME = originalBucketName;
		}
	});

	test('stores and reads fragment metadata using the temporary MemoryDB', async () => {
		const fragment = {
			id: 'metadata-fragment',
			ownerId: 'metadata-owner',
			type: 'text/plain',
			size: 5,
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		};

		await writeFragment(fragment);

		expect(await readFragment(fragment.ownerId, fragment.id)).toEqual(fragment);
		expect(await listFragments(fragment.ownerId)).toEqual([fragment.id]);
		expect(await listFragments(fragment.ownerId, true)).toEqual([JSON.stringify(fragment)]);
	});

	test('writes fragment data using PutObjectCommand', async () => {
		mockS3Send.mockResolvedValueOnce({});

		const data = Buffer.from('Hello S3!');
		await writeFragmentData('owner-1', 'fragment-1', data);

		expect(mockS3Send).toHaveBeenCalledTimes(1);

		const command = mockS3Send.mock.calls[0][0];
		expect(command).toBeInstanceOf(PutObjectCommand);
		expect(command.input).toEqual({
			Bucket: 'fragments',
			Key: 'owner-1/fragment-1',
			Body: data,
		});
	});

	test('reads and combines streamed fragment data using GetObjectCommand', async () => {
		mockS3Send.mockResolvedValueOnce({
			Body: Readable.from([Buffer.from('Hello '), Buffer.from('S3!')]),
		});

		const result = await readFragmentData('owner-1', 'fragment-1');

		expect(result).toEqual(Buffer.from('Hello S3!'));

		const command = mockS3Send.mock.calls[0][0];
		expect(command).toBeInstanceOf(GetObjectCommand);
		expect(command.input).toEqual({
			Bucket: 'fragments',
			Key: 'owner-1/fragment-1',
		});
	});

	test('deletes fragment metadata and S3 data using DeleteObjectCommand', async () => {
		const fragment = {
			id: 'delete-fragment',
			ownerId: 'delete-owner',
			type: 'text/plain',
			size: 1,
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		};

		await writeFragment(fragment);
		mockS3Send.mockResolvedValueOnce({});

		await deleteFragment(fragment.ownerId, fragment.id);

		expect(await readFragment(fragment.ownerId, fragment.id)).toBeUndefined();

		const command = mockS3Send.mock.calls[0][0];
		expect(command).toBeInstanceOf(DeleteObjectCommand);
		expect(command.input).toEqual({
			Bucket: 'fragments',
			Key: 'delete-owner/delete-fragment',
		});
	});

	test('turns an S3 upload failure into a useful error', async () => {
		mockS3Send.mockRejectedValueOnce(new Error('S3 unavailable'));

		await expect(writeFragmentData('owner-1', 'fragment-1', Buffer.from('data'))).rejects.toThrow(
			'unable to upload fragment data'
		);
	});

	test('turns an S3 read failure into a useful error', async () => {
		mockS3Send.mockRejectedValueOnce(new Error('S3 unavailable'));

		await expect(readFragmentData('owner-1', 'fragment-1')).rejects.toThrow('unable to read fragment data');
	});

	test('rejects when the returned S3 stream fails', async () => {
		const stream = new Readable({
			read() {
				this.destroy(new Error('stream failed'));
			},
		});

		mockS3Send.mockResolvedValueOnce({ Body: stream });

		await expect(readFragmentData('owner-1', 'fragment-1')).rejects.toThrow('unable to read fragment data');
	});

	test('turns an S3 delete failure into a useful error', async () => {
		const fragment = {
			id: 'failed-delete-fragment',
			ownerId: 'failed-delete-owner',
			type: 'text/plain',
			size: 1,
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		};

		await writeFragment(fragment);
		mockS3Send.mockRejectedValueOnce(new Error('S3 unavailable'));

		await expect(deleteFragment(fragment.ownerId, fragment.id)).rejects.toThrow('unable to delete fragment data');
	});
});
