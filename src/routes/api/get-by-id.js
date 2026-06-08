const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');

/**
 * Get raw fragment data for the authenticated user.
 * Assignment 1 only requires text/plain support.
 */
module.exports = async (req, res) => {
	try {
		// Basic optional .txt support: /v1/fragments/:id.txt
		const [id, extension] = req.params.id.split('.');

		if (extension && extension !== 'txt') {
			logger.warn({ id: req.params.id }, 'unsupported fragment extension');
			return res.status(415).json(createErrorResponse(415, 'unsupported fragment extension'));
		}

		const fragment = await Fragment.byId(req.user, id);
		const data = await fragment.getData();

		logger.debug({ id, ownerId: req.user }, 'returning fragment data');

		res.setHeader('Content-Type', fragment.type);
		return res.status(200).send(data);
	} catch (err) {
		logger.warn({ err, id: req.params.id }, 'fragment not found');
		return res.status(404).json(createErrorResponse(404, 'fragment not found'));
	}
};
