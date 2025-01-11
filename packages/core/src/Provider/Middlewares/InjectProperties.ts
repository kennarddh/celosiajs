import { NextFunction, Request, Response } from 'express'

import { CelosiaRequest, CelosiaResponse } from '../..'

const InjectProperties = (req: Request, res: Response, next: NextFunction) => {
	req.__CELOSIAJS__ = {
		postValidationQuery: {},
	}

	req.celosiaInstance = req.app.celosiaInstance
	res.celosiaInstance = req.app.celosiaInstance

	const request = new CelosiaRequest(req)
	const response = new CelosiaResponse(res)

	req.celosiaRequest = request
	req.celosiaResponse = response

	res.celosiaRequest = request
	res.celosiaResponse = response

	next()
}

export default InjectProperties
