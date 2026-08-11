const contentType = require('content-type');

const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * Replace the data for one of the authenticated user's fragments.
 * A fragment's media type cannot be changed after it has been created.
 */
module.exports = async (req, res, next) => {
	const { id } = req.params;
	let fragment;

	try {
		fragment = await Fragment.byId(req.user, id);
	} catch (err) {
		if (err.message === `fragment not found: ${id}`) {
			logger.warn({ id, ownerId: req.user }, 'fragment not found');
			return res.status(404).json(createErrorResponse(404, 'fragment not found'));
		}

		logger.error({ err, id, ownerId: req.user }, 'failed to read fragment');
		return next(err);
	}

	let requestMimeType;

	try {
		requestMimeType = contentType.parse(req.headers['content-type']).type;
	} catch (err) {
		logger.warn({ err, id, ownerId: req.user }, 'missing or invalid Content-Type');
		return res.status(400).json(createErrorResponse(400, 'fragment Content-Type cannot be changed'));
	}

	if (requestMimeType !== fragment.mimeType) {
		logger.warn(
			{ id, ownerId: req.user, existingType: fragment.mimeType, requestType: requestMimeType },
			'fragment Content-Type does not match'
		);
		return res.status(400).json(createErrorResponse(400, 'fragment Content-Type cannot be changed'));
	}

	try {
		// express.raw() leaves the body undefined when a valid request has no data.
		// Treat that as an empty replacement instead of changing the fragment type.
		const data = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
		await fragment.setData(data);

		logger.info({ fragment }, 'updated fragment');

		return res.status(200).json(
			createSuccessResponse({
				fragment,
			})
		);
	} catch (err) {
		logger.error({ err, id, ownerId: req.user }, 'failed to update fragment');
		return next(err);
	}
};
