describe('process entry point', () => {
	let processOn;
	let handlers;
	let logger;

	beforeEach(() => {
		jest.resetModules();
		handlers = {};
		logger = { fatal: jest.fn() };

		processOn = jest.spyOn(process, 'on').mockImplementation((event, handler) => {
			handlers[event] = handler;
			return process;
		});

		jest.doMock('../../src/logger', () => logger);
		jest.doMock('../../src/server', () => ({ running: true }));
	});

	afterEach(() => {
		processOn.mockRestore();
		jest.resetModules();
		jest.dontMock('../../src/logger');
		jest.dontMock('../../src/server');
	});

	test('registers fatal process handlers and starts the server', () => {
		expect(() => require('../../src/index')).not.toThrow();
		expect(handlers.uncaughtException).toEqual(expect.any(Function));
		expect(handlers.unhandledRejection).toEqual(expect.any(Function));

		const exception = new Error('uncaught');
		expect(() => handlers.uncaughtException(exception, 'test origin')).toThrow(exception);
		expect(logger.fatal).toHaveBeenCalledWith({ err: exception, origin: 'test origin' }, 'uncaughtException');

		const rejection = new Error('rejected');
		const promise = Promise.resolve();
		expect(() => handlers.unhandledRejection(rejection, promise)).toThrow(rejection);
		expect(logger.fatal).toHaveBeenCalledWith({ reason: rejection, promise }, 'unhandledRejection');
	});
});
