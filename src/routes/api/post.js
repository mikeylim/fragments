const contentType = require('content-type');

const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * Create a new fragment for the authenticated user.
 * Assignment 1 only supports text/plain fragments.
 */
module.exports = async (req, res, next) => {
	try {
		// If the raw body parser did not parse this request, the type was unsupported.
		if (!Buffer.isBuffer(req.body)) {
			logger.warn({ contentType: req.headers['content-type'] }, 'unsupported fragment type');
			return res.status(415).json(createErrorResponse(415, 'unsupported fragment type'));
		}

		const { type } = contentType.parse(req.headers['content-type']);
        
		const fragment = new Fragment({
			ownerId: req.user,
			type,
			size: req.body.length,
		});

		await fragment.save();
		await fragment.setData(req.body);

		// API_URL is used when running on EC2. If missing, fall back to the current request host.
		const apiUrl = process.env.API_URL || `${req.protocol}://${req.headers.host}`;
		const location = new URL(`/v1/fragments/${fragment.id}`, apiUrl);

		logger.info({ fragment, location: location.toString() }, 'created fragment');

		res.setHeader('Location', location.toString());

		return res.status(201).json(
			createSuccessResponse({
				fragment,
			})
		);
	} catch (err) {
		logger.error({ err }, 'failed to create fragment');
		return next(err);
	}
};
