const logger = require('../../logger');
const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const MarkdownIt = require('markdown-it');
const mime = require('mime-types');

const markdown = new MarkdownIt();

/**
 * Get raw fragment data for the authenticated user.
 * Assignment 1 only requires text/plain support.
 * Assignment 2 adds original text/JSON data and Markdown-to-HTML conversion.
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

	// Basic optional .txt support: /v1/fragments/:id.txt
	const requestedType = mime.lookup(extension);

	if (!requestedType) {
		logger.warn({ id, extension }, 'unsupported fragment extension');
		return res.status(415).json(createErrorResponse(415, 'unsupported fragment extension'));
	}

	// An extension matching the stored type returns the original bytes unchanged.
	if (requestedType === fragment.mimeType) {
		logger.debug({ id, extension, ownerId: req.user }, 'returning fragment data in original format');
		res.setHeader('Content-Type', responseType);
		return res.status(200).send(data);
	}

	if (fragment.mimeType === 'text/markdown' && requestedType === 'text/html') {
		const converted = Buffer.from(markdown.render(data.toString()));

		logger.debug({ id, ownerId: req.user }, 'converting Markdown fragment to HTML');
		res.setHeader('Content-Type', 'text/html');
		return res.status(200).send(converted);
	}

	logger.warn({ id, from: fragment.mimeType, to: requestedType }, 'unsupported fragment conversion');
	return res.status(415).json(createErrorResponse(415, 'unsupported fragment conversion'));
};
