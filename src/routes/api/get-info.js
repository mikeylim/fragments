const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');

/**
 * Get metadata for one of the authenticated user's fragments.
 * This route returns information such as id, type, size, created, and updated,
 * but it does not return the fragment's actual data.
 */
module.exports = async (req, res) => {
	try {
		const fragment = await Fragment.byId(req.user, req.params.id);

		logger.debug({ id: req.params.id, ownerId: req.user }, 'returning fragment metadata');

		return res.status(200).json(
			createSuccessResponse({
				fragment,
			})
		);
	} catch (err) {
		logger.warn({ err, id: req.params.id }, 'fragment metadata not found');

		return res.status(404).json(createErrorResponse(404, 'fragment not found'));
	}
};
