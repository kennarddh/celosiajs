/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-parameters */
import { CelosiaRequest, CelosiaResponse, EmptyObject, LoggerBase, NextFunction } from '.'

abstract class Middleware<
	Request extends CelosiaRequest<any, any, any, any> = CelosiaRequest<any, any, any, any>,
	Response extends CelosiaResponse<any> = CelosiaResponse<any>,
	Input extends Record<string, any> = EmptyObject,
	Output extends Record<string, any> | EmptyObject = EmptyObject,
> extends LoggerBase {
	public abstract index(
		data: Input,
		request: Request,
		response: Response,
		next: NextFunction<Output | undefined>,
	): any | Promise<any>
}

export default Middleware
