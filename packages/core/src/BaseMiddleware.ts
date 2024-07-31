/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CelosiaRequest, CelosiaResponse, EmptyObject, type StopHere } from '.'

abstract class BaseMiddleware<
	Request extends CelosiaRequest<any, any, any, any> = CelosiaRequest<any, any, any, any>,
	Response extends CelosiaResponse<any> = CelosiaResponse<any>,
	Input extends Record<string, any> = EmptyObject,
	Output extends Record<string, any> | EmptyObject = EmptyObject,
> {
	public abstract index(
		data: Input,
		request: Request,
		response: Response,
	): Promise<Output | typeof StopHere | undefined> | Promise<void>
}

export default BaseMiddleware
