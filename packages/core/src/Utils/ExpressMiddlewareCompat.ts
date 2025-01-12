/* eslint-disable @typescript-eslint/no-explicit-any */
import { RequestHandler } from 'express'

import { BaseMiddleware, CelosiaRequest, CelosiaResponse, EmptyObject, NextFunction } from '..'

/**
 * A compatibility layer for using express' middleware.
 * deferToNext in the expressMiddleware NextFunction is ignored
 */
const ExpressMiddlewareCompat = (
	loggingSource: string,
	expressMiddleware: RequestHandler,
): new () => BaseMiddleware<any, any, any, any> => {
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
	} as new () => BaseMiddleware<any, any, any, any>
}

export default ExpressMiddlewareCompat
