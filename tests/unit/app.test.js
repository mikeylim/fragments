const request = require('supertest');

describe('app error middleware', () => {
	let app;

	beforeAll(() => {
		jest.resetModules();
		jest.doMock('../../src/routes', () => {
			const express = require('express');
			const router = express.Router();

			router.get('/server-error', (_req, _res, next) => next(new Error('simulated failure')));
			router.get('/client-error', (_req, _res, next) => {
				const error = new Error('bad request');
				error.status = 400;
				next(error);
			});

			return router;
		});

		app = require('../../src/app');
	});

	afterAll(() => {
		jest.resetModules();
		jest.dontMock('../../src/routes');
	});

	test('returns the supplied status for handled client errors', async () => {
		const res = await request(app).get('/client-error');
		expect(res.statusCode).toBe(400);
		expect(res.body.error).toEqual({ code: 400, message: 'bad request' });
	});

	test('returns status 500 for unexpected errors', async () => {
		const res = await request(app).get('/server-error');
		expect(res.statusCode).toBe(500);
		expect(res.body.error).toEqual({ code: 500, message: 'simulated failure' });
	});
});
