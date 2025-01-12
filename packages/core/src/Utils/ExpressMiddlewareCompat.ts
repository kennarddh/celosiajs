import { RequestHandler } from 'express'

import { BaseMiddleware, CelosiaRequest, CelosiaResponse, EmptyObject, NextFunction } from '..'

/**
 * A compatibility layer for using express' middleware.
 * deferToNext in the expressMiddleware NextFunction is ignored
 */
const ExpressMiddlewareCompat = <
	T extends BaseMiddleware<any, any, any, any> = BaseMiddleware<any, any, any, any>,
>(
	loggingSource: string,
	expressMiddleware: RequestHandler,
): new () => T => {
	return class extends BaseMiddleware {
		constructor() {
			super(loggingSource)
		}

		public override async index(
			_: EmptyObject,
			request: CelosiaRequest,
			response: CelosiaResponse,
			next: NextFunction,
		) {
			await expressMiddleware(
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
	} as new () => T
}

export default ExpressMiddlewareCompat
