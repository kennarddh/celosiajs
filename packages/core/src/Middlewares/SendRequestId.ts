import { CelosiaRequest, CelosiaResponse, EmptyObject, NextFunction } from '..'
/**
 * Middleware import is not imported from root.
 * Because if it is imported from root it will cause cyclical import.
 * Which will make this class defined before Middleware is defined.
 * Leading to a runtime error.
 */
import Middleware from '../Middleware'

/**
 * Add a `Request-Id` header to every response.
 */
class SendRequestId extends Middleware {
	constructor() {
		super('SendRequestId')
	}

	public override index(
		_: EmptyObject,
		request: CelosiaRequest,
		response: CelosiaResponse,
		next: NextFunction,
	) {
		response.header('Request-Id', request.id)

		next()
	}
}

export default SendRequestId
