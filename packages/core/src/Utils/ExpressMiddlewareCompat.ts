import { RequestHandler } from 'express'

import { BaseMiddleware, CelosiaRequest, CelosiaResponse, EmptyObject, INextFunction } from '..'

/**
 * deferToNext in the expressMiddleware NextFunction is ignored
 */
const ExpressMiddlewareCompat = (expressMiddleware: RequestHandler): new () => BaseMiddleware => {
	return class extends BaseMiddleware {
		constructor() {
			super('ExpressMidlewareCompat')
		}

		public override async index(
			_: EmptyObject,
			request: CelosiaRequest,
			response: CelosiaResponse,
			next: INextFunction,
		) {
			expressMiddleware(
				request.expressRequest,
				response.expressResponse,
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(errorOrDeferToNext?: any) => {
					// If value is truthy
					if (!errorOrDeferToNext) return next()

					// Ignore defer to next
					if (errorOrDeferToNext === 'route' || errorOrDeferToNext === 'router')
						return next()

					throw errorOrDeferToNext
				},
			)
		}
	}
}

export default ExpressMiddlewareCompat
