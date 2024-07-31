import { RequestHandler } from 'express'

import { BaseMiddleware, CelosiaRequest, CelosiaResponse, EmptyObject } from '..'

/**
 * deferToNext in the expressMiddleware NextFunction is ignored
 */
const ConvertExpressMiddleware = (expressMiddleware: RequestHandler) => {
	return class extends BaseMiddleware {
		public override async index(
			_: EmptyObject,
			request: CelosiaRequest,
			response: CelosiaResponse<JSON>,
		): Promise<EmptyObject> {
			await new Promise<void>((resolve, reject) => {
				expressMiddleware(
					request.expressRequest,
					response.expressResponse,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(errorOrDeferToNext?: any) => {
						// If value is truthy
						if (!errorOrDeferToNext) {
							resolve()

							return
						}

						// Ignore defer to next
						if (errorOrDeferToNext === 'route' || errorOrDeferToNext === 'router') {
							resolve()

							return
						}

						// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
						reject(errorOrDeferToNext)
					},
				)
			})

			return {}
		}
	}
}

export default ConvertExpressMiddleware
