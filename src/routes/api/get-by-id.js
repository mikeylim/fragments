const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');
const { convertFragment, supportsExtension, typeForExtension } = require('../../model/conversion');
const { createErrorResponse } = require('../../response');

/**
 * Get raw fragment data for the authenticated user.
 * An optional supported extension converts the response without changing the
 * original fragment stored in the data layer.
 */
module.exports = async (req, res) => {
	const dot = req.params.id.lastIndexOf('.');
	const id = dot > 0 ? req.params.id.slice(0, dot) : req.params.id;
	const extension = dot > 0 ? req.params.id.slice(dot + 1).toLowerCase() : undefined;

	let fragment;

	try {
		fragment = await Fragment.byId(req.user, id);
	} catch (err) {
		logger.warn({ err, id }, 'fragment not found');
		return res.status(404).json(createErrorResponse(404, 'fragment not found'));
	}

	const data = await fragment.getData();

	// Text responses without an explicit charset are UTF-8.
	const responseType =
		fragment.isText && !/;\s*charset=/i.test(fragment.type) ? `${fragment.type}; charset=utf-8` : fragment.type;

	if (!extension) {
		logger.debug({ id, ownerId: req.user }, 'returning fragment data');
		res.setHeader('Content-Type', responseType);
		return res.status(200).send(data);
	}

	// Validate against the source type's conversion matrix before checking the
	// target MIME type. For example, JSON supports .yml but YAML supports .yaml only.
	if (!supportsExtension(fragment.mimeType, extension)) {
		logger.warn({ id, extension, from: fragment.mimeType }, 'unsupported fragment conversion');
		return res.status(415).json(createErrorResponse(415, 'unsupported fragment conversion'));
	}

	try {
		const requestedType = typeForExtension(extension);
		const converted = await convertFragment(data, fragment.mimeType, extension);
		const outputType = requestedType === fragment.mimeType ? responseType : requestedType;

		logger.debug(
			{ id, extension, from: fragment.mimeType, to: outputType, ownerId: req.user },
			'returning converted fragment data'
		);
		res.setHeader('Content-Type', outputType);
		return res.status(200).send(converted);
	} catch (err) {
		logger.warn({ err, id, extension, from: fragment.mimeType }, 'fragment conversion failed');
		return res.status(415).json(createErrorResponse(415, 'fragment conversion failed'));
	}
};
