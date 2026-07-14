describe('server', () => {
	const originalPort = process.env.PORT;

	afterEach(() => {
		jest.resetModules();
		jest.dontMock('stoppable');
		jest.dontMock('../../src/logger');
		jest.dontMock('../../src/app');

		if (originalPort === undefined) {
			delete process.env.PORT;
		} else {
			process.env.PORT = originalPort;
		}
	});

	function loadServer(port) {
		jest.resetModules();

		if (port === undefined) {
			delete process.env.PORT;
		} else {
			process.env.PORT = port;
		}

		const httpServer = { close: jest.fn() };
		const wrappedServer = { stop: jest.fn() };
		const logger = { info: jest.fn() };
		const app = {
			listen: jest.fn((listenPort, callback) => {
				callback();
				return httpServer;
			}),
		};
		const stoppable = jest.fn(() => wrappedServer);

		jest.doMock('stoppable', () => stoppable);
		jest.doMock('../../src/logger', () => logger);
		jest.doMock('../../src/app', () => app);

		let result;
		jest.isolateModules(() => {
			result = require('../../src/server');
		});

		return { app, httpServer, logger, result, stoppable, wrappedServer };
	}

	test('uses the configured port and exports a stoppable server', () => {
		const { app, httpServer, logger, result, stoppable, wrappedServer } = loadServer('9090');

		expect(app.listen).toHaveBeenCalledWith(9090, expect.any(Function));
		expect(stoppable).toHaveBeenCalledWith(httpServer);
		expect(result).toBe(wrappedServer);
		expect(logger.info).toHaveBeenCalledWith('Server started on port 9090');
	});

	test('defaults to port 8080', () => {
		const { app, logger } = loadServer();

		expect(app.listen).toHaveBeenCalledWith(8080, expect.any(Function));
		expect(logger.info).toHaveBeenCalledWith('Server started on port 8080');
	});
});
