const express = require('express');

const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');

const router = express.Router();

// Parse supported fragment bodies as raw binary data.
// Fragment data is always stored as a Buffer, including text and JSON.
const rawBody = () =>
	express.raw({
		inflate: true,
		limit: '5mb',
		type: (req) => {
			const header = req.headers['content-type'];

			if (!header) {
				logger.warn('missing Content-Type header');
				return false;
			}

			return Fragment.isSupportedType(header);
		},
	});

// GET /v1/fragments
router.get('/fragments', require('./get'));

// POST /v1/fragments
router.post('/fragments', rawBody(), require('./post'));

// PUT /v1/fragments/:id
router.put('/fragments/:id', rawBody(), require('./put'));

// GET /v1/fragments/:id/info
// Keep this route before /:id.
router.get('/fragments/:id/info', require('./get-info'));

// DELETE /v1/fragments/:id
router.delete('/fragments/:id', require('./delete'));

// GET /v1/fragments/:id
router.get('/fragments/:id', require('./get-by-id'));

module.exports = router;
