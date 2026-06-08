const express = require('express');

const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');

const router = express.Router();

// Support sending raw fragment data up to 5MB.
// If the Content-Type is supported, req.body will be a Buffer.
// If unsupported, req.body will not be parsed and post.js will return 415.
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

			const isSupported = Fragment.isSupportedType(header);

			if (!isSupported) {
				logger.warn({ contentType: header }, 'unsupported Content-Type');
			}

			return isSupported;
		},
	});

// GET /v1/fragments
router.get('/fragments', require('./get'));

// POST /v1/fragments
router.post('/fragments', rawBody(), require('./post'));

// GET /v1/fragments/:id
router.get('/fragments/:id', require('./get-by-id'));

module.exports = router;
