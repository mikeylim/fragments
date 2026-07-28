const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * Delete a fragment owned by the authenticated user.
 */
module.exports = async (req, res, next) => {
	const { id } = req.params;

	// Check metadata first so a missing fragment returns 404.
	try {
		await Fragment.byId(req.user, id);
	} catch (err) {
		logger.warn({ err, id, ownerId: req.user }, 'fragment not found');
		return res.status(404).json(createErrorResponse(404, 'fragment not found'));
	}

	try {
		await Fragment.delete(req.user, id);
		logger.info({ id, ownerId: req.user }, 'deleted fragment');
		return res.status(200).json(createSuccessResponse());
	} catch (err) {
		// An unexpected S3/database failure is a server error, not a 404.
		logger.error({ err, id, ownerId: req.user }, 'failed to delete fragment');
		return next(err);
	}
};
