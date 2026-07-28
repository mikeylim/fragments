const originalRegion = process.env.AWS_REGION;

const restoreRegion = () => {
	if (originalRegion === undefined) {
		delete process.env.AWS_REGION;
	} else {
		process.env.AWS_REGION = originalRegion;
	}
};

describe('data backend selector', () => {
	afterEach(() => {
		restoreRegion();
		jest.resetModules();
	});

	test('uses the memory backend without AWS_REGION', () => {
		delete process.env.AWS_REGION;
		jest.resetModules();

		const selectedBackend = require('../../src/model/data');
		const memoryBackend = require('../../src/model/data/memory');

		expect(selectedBackend.writeFragment).toBe(memoryBackend.writeFragment);
		expect(selectedBackend.writeFragmentData).toBe(memoryBackend.writeFragmentData);
	});

	test('uses the AWS backend when AWS_REGION is set', () => {
		process.env.AWS_REGION = 'us-east-1';
		jest.resetModules();

		const selectedBackend = require('../../src/model/data');
		const awsBackend = require('../../src/model/data/aws');

		expect(selectedBackend.writeFragment).toBe(awsBackend.writeFragment);
		expect(selectedBackend.writeFragmentData).toBe(awsBackend.writeFragmentData);
	});
});
