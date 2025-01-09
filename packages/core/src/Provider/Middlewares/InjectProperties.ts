import { NextFunction, Request, Response } from 'express'

import { CelosiaRequest, CelosiaResponse } from '../..'

const InjectProperties = (req: Request, res: Response, next: NextFunction) => {
	const request = new CelosiaRequest(req)
	const response = new CelosiaResponse(res)

	req.celosiaInstance = req.app.celosiaInstance
	req.celosiaRequest = request
	req.celosiaResponse = response

	res.celosiaInstance = req.app.celosiaInstance
	res.celosiaRequest = request
	res.celosiaResponse = response

	next()
}

export default InjectProperties
