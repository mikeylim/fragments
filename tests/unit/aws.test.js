const { Readable } = require('stream');

const mockS3Send = jest.fn();
const mockDdbSend = jest.fn();

jest.mock('../../src/model/data/aws/s3Client', () => ({
	send: mockS3Send,
}));

jest.mock('../../src/model/data/aws/ddbDocClient', () => ({
	send: mockDdbSend,
}));

const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { PutCommand, GetCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
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
	const originalTableName = process.env.AWS_DYNAMODB_TABLE_NAME;

	beforeEach(() => {
		process.env.AWS_S3_BUCKET_NAME = 'fragments';
		process.env.AWS_DYNAMODB_TABLE_NAME = 'fragments';
		mockS3Send.mockReset();
		mockDdbSend.mockReset();
	});

	afterAll(() => {
		if (originalBucketName === undefined) {
			delete process.env.AWS_S3_BUCKET_NAME;
		} else {
			process.env.AWS_S3_BUCKET_NAME = originalBucketName;
		}

		if (originalTableName === undefined) {
			delete process.env.AWS_DYNAMODB_TABLE_NAME;
		} else {
			process.env.AWS_DYNAMODB_TABLE_NAME = originalTableName;
		}
	});

	test('writes fragment metadata using PutCommand', async () => {
		const fragment = {
			id: 'metadata-fragment',
			ownerId: 'metadata-owner',
			type: 'text/plain',
			size: 5,
			created: new Date().toISOString(),
			updated: new Date().toISOString(),
		};
		mockDdbSend.mockResolvedValueOnce({});

		await writeFragment(fragment);

		const command = mockDdbSend.mock.calls[0][0];
		expect(command).toBeInstanceOf(PutCommand);
		expect(command.input).toEqual({ TableName: 'fragments', Item: fragment });
	});

	test('reads fragment metadata using GetCommand', async () => {
		const fragment = { id: 'fragment-1', ownerId: 'owner-1', type: 'text/plain', size: 5 };
		mockDdbSend.mockResolvedValueOnce({ Item: fragment });

		expect(await readFragment('owner-1', 'fragment-1')).toEqual(fragment);

		const command = mockDdbSend.mock.calls[0][0];
		expect(command).toBeInstanceOf(GetCommand);
		expect(command.input).toEqual({
			TableName: 'fragments',
			Key: { ownerId: 'owner-1', id: 'fragment-1' },
		});
	});

	test('returns undefined when DynamoDB has no matching fragment', async () => {
		mockDdbSend.mockResolvedValueOnce({});

		expect(await readFragment('owner-1', 'missing-fragment')).toBeUndefined();
	});

	test('lists fragment ids using QueryCommand and a projection', async () => {
		mockDdbSend.mockResolvedValueOnce({ Items: [{ id: 'fragment-1' }, { id: 'fragment-2' }] });

		expect(await listFragments('owner-1')).toEqual(['fragment-1', 'fragment-2']);

		const command = mockDdbSend.mock.calls[0][0];
		expect(command).toBeInstanceOf(QueryCommand);
		expect(command.input).toEqual({
			TableName: 'fragments',
			KeyConditionExpression: 'ownerId = :ownerId',
			ExpressionAttributeValues: { ':ownerId': 'owner-1' },
			ProjectionExpression: 'id',
		});
	});

	test('lists expanded fragment metadata without a projection', async () => {
		const fragments = [{ id: 'fragment-1', ownerId: 'owner-1', type: 'text/plain', size: 5 }];
		mockDdbSend.mockResolvedValueOnce({ Items: fragments });

		expect(await listFragments('owner-1', true)).toEqual(fragments);
		expect(mockDdbSend.mock.calls[0][0].input).not.toHaveProperty('ProjectionExpression');
	});

	test('returns an empty list when a query has no Items', async () => {
		mockDdbSend.mockResolvedValueOnce({});

		expect(await listFragments('owner-1')).toEqual([]);
	});

	test('writes fragment data using PutObjectCommand', async () => {
		mockS3Send.mockResolvedValueOnce({});

		const data = Buffer.from('Hello S3!');
		await writeFragmentData('owner-1', 'fragment-1', data);

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

	test('deletes fragment metadata from DynamoDB and data from S3', async () => {
		mockDdbSend.mockResolvedValueOnce({});
		mockS3Send.mockResolvedValueOnce({});

		await deleteFragment('owner-1', 'fragment-1');

		const ddbCommand = mockDdbSend.mock.calls[0][0];
		expect(ddbCommand).toBeInstanceOf(DeleteCommand);
		expect(ddbCommand.input).toEqual({
			TableName: 'fragments',
			Key: { ownerId: 'owner-1', id: 'fragment-1' },
		});

		const s3Command = mockS3Send.mock.calls[0][0];
		expect(s3Command).toBeInstanceOf(DeleteObjectCommand);
		expect(s3Command.input).toEqual({
			Bucket: 'fragments',
			Key: 'owner-1/fragment-1',
		});
	});

	test('propagates a DynamoDB write failure', async () => {
		mockDdbSend.mockRejectedValueOnce(new Error('DynamoDB unavailable'));

		await expect(writeFragment({ ownerId: 'owner-1', id: 'fragment-1' })).rejects.toThrow('DynamoDB unavailable');
	});

	test('propagates a DynamoDB read failure', async () => {
		mockDdbSend.mockRejectedValueOnce(new Error('DynamoDB unavailable'));

		await expect(readFragment('owner-1', 'fragment-1')).rejects.toThrow('DynamoDB unavailable');
	});

	test('propagates a DynamoDB query failure', async () => {
		mockDdbSend.mockRejectedValueOnce(new Error('DynamoDB unavailable'));

		await expect(listFragments('owner-1')).rejects.toThrow('DynamoDB unavailable');
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

	test('turns a delete failure into a useful error', async () => {
		mockDdbSend.mockRejectedValueOnce(new Error('DynamoDB unavailable'));
		mockS3Send.mockResolvedValueOnce({});

		await expect(deleteFragment('owner-1', 'fragment-1')).rejects.toThrow('unable to delete fragment');
	});
});
