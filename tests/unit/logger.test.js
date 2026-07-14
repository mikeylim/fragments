describe('logger', () => {
	const originalLevel = process.env.FRAGMENTS_LOG_LEVEL;

	afterEach(() => {
		jest.resetModules();
		jest.dontMock('pino');

		if (originalLevel === undefined) {
			delete process.env.FRAGMENTS_LOG_LEVEL;
		} else {
			process.env.FRAGMENTS_LOG_LEVEL = originalLevel;
		}
	});

	function loadLogger(level) {
		jest.resetModules();

		if (level === undefined) {
			delete process.env.FRAGMENTS_LOG_LEVEL;
		} else {
			process.env.FRAGMENTS_LOG_LEVEL = level;
		}

		const logger = { level };
		const pino = jest.fn(() => logger);
		jest.doMock('pino', () => pino);

		let result;
		jest.isolateModules(() => {
			result = require('../../src/logger');
		});

		return { logger, pino, result };
	}

	test('defaults to info logging', () => {
		const { logger, pino, result } = loadLogger();

		expect(result).toBe(logger);
		expect(pino).toHaveBeenCalledWith({ level: 'info' });
	});

	test('uses pino-pretty transport for debug logging', () => {
		const { pino } = loadLogger('debug');

		expect(pino).toHaveBeenCalledWith({
			level: 'debug',
			transport: {
				target: 'pino-pretty',
				options: { colorize: true },
			},
		});
	});
});
