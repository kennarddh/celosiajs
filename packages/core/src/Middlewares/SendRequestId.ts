import { BaseMiddleware, CelosiaRequest, CelosiaResponse, EmptyObject, INextFunction } from '..'

class SendRequestId extends BaseMiddleware {
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
