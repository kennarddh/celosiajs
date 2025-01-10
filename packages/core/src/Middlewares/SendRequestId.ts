import { CelosiaRequest, CelosiaResponse, EmptyObject, INextFunction } from '..'

/**
 * BaseMiddleware import is not imported from root.
 * Because if it is imported from root it will cause cyclical import.
 * Which will make this class defined before BaseMiddleware is defined.
 * Leading to a runtime error.
 */
import BaseMiddleware from '../BaseMiddleware'

class SendRequestId extends BaseMiddleware {
	constructor() {
		super('SendRequestId')
	}

	public override index(
		_: EmptyObject,
		request: CelosiaRequest,
		response: CelosiaResponse,
		next: INextFunction,
	) {
		response.header('Request-Id', request.id)

		next()
	}
}

export default SendRequestId
