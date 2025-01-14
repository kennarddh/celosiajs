/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler } from 'express'

import { CelosiaRequest, CelosiaResponse, EmptyObject, Middleware, NextFunction } from '..'

/**
 * A compatibility layer for using express' middleware.
 * deferToNext in the expressMiddleware NextFunction is ignored
 */
const ExpressMiddlewareCompat = <
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
	T extends Middleware<any, any, any, any> = Middleware<any, any, any, any>,
>(
	loggingSource: string,
	expressMiddleware: RequestHandler,
): new () => T => {
	return class extends Middleware {
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
