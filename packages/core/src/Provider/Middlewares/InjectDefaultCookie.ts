import { NextFunction, Request, Response } from 'express'

const InjectDefaultCookie = (req: Request, _: Response, next: NextFunction) => {
	req.signedCookies = {}
	req.cookies = {}

	next()
}

export default InjectDefaultCookie
