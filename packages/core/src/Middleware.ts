/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-explicit-any */
import { Logger } from 'winston'

import { CelosiaRequest, CelosiaResponse, EmptyObject, LoggerBase, NextFunction } from '.'

abstract class Middleware<
	Request extends CelosiaRequest<any, any, any, any> = CelosiaRequest<any, any, any, any>,
	Response extends CelosiaResponse<any> = CelosiaResponse<any>,
	Input extends Record<string, any> = EmptyObject,
	Output extends Record<string, any> | EmptyObject = EmptyObject,
> extends LoggerBase {
	declare protected logger: Logger

	// eslint-disable-next-line @typescript-eslint/no-useless-constructor
	constructor(loggingSource: string) {
		super(loggingSource)
	}

	public abstract index(
		data: Input,
		request: Request,
		response: Response,
		next: NextFunction<Output | undefined>,
	): any | Promise<any>
}

export default Middleware
