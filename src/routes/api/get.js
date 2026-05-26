const { createSuccessResponse } = require('../../response');

module.exports = (req, res) => {
	res.status(200).json(
		createSuccessResponse({
			fragments: [],
		})
	);
};
