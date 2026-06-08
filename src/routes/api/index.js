const express = require('express');
const contentType = require('content-type');

const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');

const router = express.Router();

// Support sending raw fragment data up to 5MB.
// If the Content-Type is supported, req.body will be a Buffer.
// If unsupported, req.body will not be a Buffer and the route can return 415.
const rawBody = () =>
	express.raw({
		inflate: true,
		limit: '5mb',
		type: (req) => {
			try {
				const { type } = contentType.parse(req);
				return Fragment.isSupportedType(type);
			} catch (err) {
				logger.warn({ err, contentType: req.headers['content-type'] }, 'invalid Content-Type');
				return false;
			}
		},
	});

// GET /v1/fragments
router.get('/fragments', require('./get'));

// POST /v1/fragments
router.post('/fragments', rawBody(), require('./post'));

// GET /v1/fragments/:id
router.get('/fragments/:id', require('./get-by-id'));

module.exports = router;
