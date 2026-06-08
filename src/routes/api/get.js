const { Fragment } = require('../../model/fragment');
const { createSuccessResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Get a list of fragments for the authenticated user.
 * Supports:
 *   GET /v1/fragments
 *   GET /v1/fragments?expand=1
 */
module.exports = async (req, res, next) => {
	try {
		const expand = req.query.expand === '1';

		logger.debug({ ownerId: req.user, expand }, 'getting user fragments');

		const fragments = await Fragment.byUser(req.user, expand);

		res.status(200).json(
			createSuccessResponse({
				fragments,
			})
		);
	} catch (err) {
		logger.error({ err }, 'failed to get fragments');
		next(err);
	}
};
